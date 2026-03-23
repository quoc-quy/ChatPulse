import { ObjectId } from 'mongodb'
import databaseService from '~/services/database.services'
import { ErrorWithStatus } from '~/models/errors'
import httpStatus from '~/constants/httpStatus'
import Message from '~/models/schemas/message.schema'
import socketService from './socket.services'
// IMPORT CÁC MODULE AI MỚI TẠO
import aiService from './ai/ai.service'
import { ContextManager } from './ai/context.manager'

class MessageService {
  async getMessages(conversationId: string, userId: string, cursor?: string, limit: number = 20) {
    const convObjectId = new ObjectId(conversationId)
    const userObjectId = new ObjectId(userId)

    const conversation = await databaseService.conversations.findOne({ _id: convObjectId })
    if (!conversation)
      throw new ErrorWithStatus({ message: 'Không tìm thấy cuộc hội thoại', status: httpStatus.NOT_FOUND })

    let userMember = conversation.members?.find(
      (member: any) => member.userId?.toString() === userId || member.user_id?.toString() === userId
    )
    if (!userMember && conversation.participants) {
      if (conversation.participants.some((p: ObjectId) => p.toString() === userId)) {
        userMember = { userId: new ObjectId(userId), role: 'member' }
      }
    }
    if (!userMember) throw new ErrorWithStatus({ message: 'Bạn không có quyền', status: httpStatus.FORBIDDEN })

    const matchCondition: any = {
      conversationId: convObjectId,
      $and: [{ deletedByUsers: { $ne: userObjectId } }, { deleted_by_users: { $ne: userObjectId } }]
    }
    if (userMember.clearedHistoryAt) matchCondition.createdAt = { $gt: userMember.clearedHistoryAt }
    if (cursor) matchCondition._id = { $lt: new ObjectId(cursor) }

    const messages = await databaseService.messages
      .aggregate([
        { $match: matchCondition },
        { $sort: { createdAt: -1 } },
        { $limit: limit },
        { $lookup: { from: 'users', localField: 'senderId', foreignField: '_id', as: 'senderInfo' } },
        { $unwind: '$senderInfo' },
        {
          $project: {
            _id: 1,
            conversationId: 1,
            type: 1,
            content: 1,
            isEdited: 1,
            isDeleted: 1,
            replyToId: 1,
            reactions: 1,
            callInfo: 1,
            createdAt: 1,
            updatedAt: 1,
            status: 1,
            deliveredTo: 1,
            seenBy: 1,
            sender: { _id: '$senderInfo._id', userName: '$senderInfo.userName', avatar: '$senderInfo.avatar' }
          }
        }
      ])
      .toArray()
    return messages
  }

  async sendMessage(
    userId: string,
    convId: string,
    type: 'text' | 'sticker' | 'system',
    content: string,
    replyToId?: string
  ) {
    const userObjectId = new ObjectId(userId)
    const convObjectId = new ObjectId(convId)

    const conversation = await databaseService.conversations.findOne({ _id: convObjectId })
    if (!conversation) throw new ErrorWithStatus({ message: 'Không tìm thấy', status: httpStatus.NOT_FOUND })

    const newMessage = new Message({
      conversationId: convObjectId,
      senderId: userObjectId,
      type,
      content,
      replyToId: replyToId ? new ObjectId(replyToId) : undefined,
      status: 'SENT'
    })

    const insertResult = await databaseService.messages.insertOne(newMessage)
    const messageId = insertResult.insertedId

    await databaseService.conversations.updateOne(
      { _id: convObjectId },
      { $set: { last_message_id: messageId, updated_at: new Date() } }
    )
    await databaseService.conversations.updateOne(
      { _id: convObjectId, 'members.userId': userObjectId },
      { $set: { 'members.$.lastViewedMessageId': messageId } }
    )

    const messages = await databaseService.messages
      .aggregate([
        { $match: { _id: messageId } },
        { $lookup: { from: 'users', localField: 'senderId', foreignField: '_id', as: 'senderInfo' } },
        { $unwind: '$senderInfo' },
        {
          $project: {
            _id: 1,
            conversationId: 1,
            type: 1,
            content: 1,
            replyToId: 1,
            reactions: 1,
            createdAt: 1,
            updatedAt: 1,
            status: 1,
            deliveredTo: 1,
            seenBy: 1,
            sender: { _id: '$senderInfo._id', userName: '$senderInfo.userName', avatar: '$senderInfo.avatar' }
          }
        }
      ])
      .toArray()

    const populatedMessage = messages[0]

    const targetUserIds = new Set<string>()
    if (conversation.participants) conversation.participants.forEach((p: ObjectId) => targetUserIds.add(p.toString()))
    if (conversation.members)
      conversation.members.forEach((m: any) => {
        const mId = m.userId?.toString() || m.user_id?.toString()
        if (mId) targetUserIds.add(mId)
      })

    targetUserIds.forEach((id) => {
      socketService.emitToUser(id, 'receive_message', populatedMessage)
    })

    return populatedMessage
  }

  async editMessage(messageId: string, userId: string, newContent: string) {
    const result = await databaseService.messages.findOneAndUpdate(
      {
        _id: new ObjectId(messageId),
        senderId: new ObjectId(userId)
      },
      {
        $set: {
          content: newContent,
          isEdited: true,
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    )
    return result
  }

  async recallMessage(messageId: string, userId: string) {
    const result = await databaseService.messages.findOneAndUpdate(
      {
        _id: new ObjectId(messageId),
        senderId: new ObjectId(userId)
      },
      {
        $set: {
          isDeleted: true,
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    )
    return result
  }

  async reactMessage(messageId: string, userId: string, emoji: string) {
    const messageObjId = new ObjectId(messageId)
    const userObjId = new ObjectId(userId)

    const [message, user] = await Promise.all([
      databaseService.messages.findOne({ _id: messageObjId }),
      databaseService.users.findOne({ _id: userObjId })
    ])

    if (!message) throw new ErrorWithStatus({ message: 'Tin nhắn không tồn tại', status: 404 })
    if (!user) throw new ErrorWithStatus({ message: 'User không tồn tại', status: 404 })

    let updateQuery: any = {}

    if (emoji === 'REMOVE_ALL') {
      updateQuery = {
        $pull: {
          reactions: {
            $or: [{ user_id: { $in: [userObjId, userId] } }, { userId: { $in: [userObjId, userId] } }]
          }
        }
      }
    } else {
      updateQuery = {
        $push: {
          reactions: {
            user_id: userObjId,
            emoji: emoji,
            user: {
              _id: user._id,
              userName: user.userName,
              avatar: user.avatar
            },
            createdAt: new Date()
          }
        }
      }
    }

    const result = await databaseService.messages.findOneAndUpdate({ _id: messageObjId }, updateQuery, {
      returnDocument: 'after'
    })
    const updatedReactions = result?.reactions || result?.value?.reactions || []

    const conversation = await databaseService.conversations.findOne({ _id: message.conversationId })
    if (conversation) {
      const targetUserIds = new Set<string>()

      if (conversation.participants) {
        conversation.participants.forEach((p: ObjectId) => targetUserIds.add(p.toString()))
      }
      if (conversation.members) {
        conversation.members.forEach((m: any) => {
          const mId = m.userId?.toString() || m.user_id?.toString()
          if (mId) targetUserIds.add(mId)
        })
      }

      targetUserIds.forEach((id) => {
        socketService.emitToUser(id, 'message_reacted', {
          messageId: messageId,
          reactions: updatedReactions
        })
      })
    }

    return result
  }

  async revokeMessage(messageId: string, userId: string) {
    const messageObjId = new ObjectId(messageId)

    const result = await databaseService.messages.findOneAndUpdate(
      {
        _id: messageObjId,
        senderId: new ObjectId(userId)
      },
      {
        $set: {
          content: '',
          type: 'revoked',
          reactions: [],
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    )

    if (!result) {
      throw new ErrorWithStatus({ message: 'Không thể thu hồi tin nhắn này', status: 403 })
    }

    const updatedMessage = result.value || result

    const conversation = await databaseService.conversations.findOne({ _id: updatedMessage.conversationId })
    if (conversation) {
      const targetUserIds = new Set<string>()
      if (conversation.participants) {
        conversation.participants.forEach((p: ObjectId) => targetUserIds.add(p.toString()))
      }
      if (conversation.members) {
        conversation.members.forEach((m: any) => {
          const mId = m.userId?.toString() || m.user_id?.toString()
          if (mId) targetUserIds.add(mId)
        })
      }

      targetUserIds.forEach((id) => {
        socketService.emitToUser(id, 'message_revoked', {
          messageId: messageId,
          conversationId: updatedMessage.conversationId.toString()
        })
      })
    }

    return result
  }

  async deleteMessage(messageId: string, userId: string) {
    const result = await databaseService.messages.findOneAndUpdate(
      { _id: new ObjectId(messageId) },
      {
        $addToSet: {
          deleted_by_users: new ObjectId(userId)
        }
      },
      { returnDocument: 'after' }
    )
    if (!result) throw new Error('Không tìm thấy tin nhắn')
    return result
  }

  async deleteMessageForMe(messageId: string, userId: string) {
    const messageObjId = new ObjectId(messageId)
    const userObjId = new ObjectId(userId)

    const result = await databaseService.messages.findOneAndUpdate(
      { _id: messageObjId },
      {
        $addToSet: {
          deletedByUsers: userObjId,
          deleted_by_users: userObjId
        }
      },
      { returnDocument: 'after' }
    )

    if (!result) {
      throw new ErrorWithStatus({ message: 'Không tìm thấy tin nhắn', status: 404 })
    }

    return result
  }

  // ==========================================================
  // HÀM HELPER: CHỈ TRUY VẤN DB (Decoupled Layer)
  // ==========================================================
  async getRecentMessagesForContext(convId: string, userId: string, limit: number) {
    const convObjectId = new ObjectId(convId)
    const userObjectId = new ObjectId(userId)

    const matchCondition: any = {
      conversationId: convObjectId,
      deletedByUsers: { $ne: userObjectId },
      isDeleted: { $ne: true } // Không lấy tin nhắn đã thu hồi
    }

    return await databaseService.messages
      .aggregate([
        { $match: matchCondition },
        { $sort: { createdAt: -1 } },
        { $limit: limit },
        {
          $lookup: {
            from: 'users',
            localField: 'senderId',
            foreignField: '_id',
            as: 'senderInfo'
          }
        },
        { $unwind: '$senderInfo' }
      ])
      .toArray()
  }

  // ==========================================================
  // HÀM SUMMARIZE ĐÃ ĐƯỢC REFACTOR
  // ==========================================================
  async summarizeConversation(convId: string, userId: string, limit: number = 30, unreadCount: number = 0) {
    // 1. Bảo vệ ở Backend: Nếu không có tin mới thì trả về rỗng ngay
    if (unreadCount === 0 || limit === 0) {
      return {
        topic: 'Không có tin nhắn mới nào cần tóm tắt',
        decisions: [],
        openQuestions: [],
        actionItems: []
      }
    }

    const conversation = await databaseService.conversations.findOne({ _id: new ObjectId(convId) })
    if (!conversation) throw new ErrorWithStatus({ message: 'Không tìm thấy', status: 404 })

    // 2. Gọi hàm Helper để lấy data
    const recentMessages = await this.getRecentMessagesForContext(convId, userId, limit)

    if (recentMessages.length === 0) {
      return { topic: 'Không có tin nhắn mới nào cần tóm tắt', decisions: [], openQuestions: [], actionItems: [] }
    }

    // 3. Biến đổi dữ liệu thông qua Context Manager (Không dính dáng DB logic)
    const chatLog = ContextManager.formatChatLog(recentMessages)

    // 4. Gọi Service AI xử lý chuỗi cuối cùng
    return await aiService.summarizeChat(chatLog)
  }

  // ── Tìm kiếm tin nhắn trong hội thoại ──────────────────────────────────────
  async searchMessages(conversationId: string, userId: string, keyword: string, page: number = 1, limit: number = 20) {
    const convObjectId = new ObjectId(conversationId)
    const userObjectId = new ObjectId(userId)

    const conversation = await databaseService.conversations.findOne({ _id: convObjectId })
    if (!conversation) {
      throw new ErrorWithStatus({ message: 'Không tìm thấy hội thoại', status: httpStatus.NOT_FOUND })
    }
    const isMember = (conversation.participants || []).some((p: ObjectId) => p.toString() === userId)
    if (!isMember) {
      throw new ErrorWithStatus({ message: 'Bạn không có quyền truy cập', status: httpStatus.FORBIDDEN })
    }

    const skip = (page - 1) * limit

    const results = await databaseService.messages
      .aggregate([
        {
          $match: {
            conversationId: convObjectId,
            type: 'text',
            content: { $regex: keyword, $options: 'i' },
            deletedByUsers: { $ne: userObjectId },
            deleted_by_users: { $ne: userObjectId },
            isDeleted: { $ne: true }
          }
        },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: 'users',
            localField: 'senderId',
            foreignField: '_id',
            as: 'senderInfo'
          }
        },
        { $unwind: { path: '$senderInfo', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            content: 1,
            createdAt: 1,
            type: 1,
            sender: {
              _id: '$senderInfo._id',
              userName: '$senderInfo.userName',
              avatar: '$senderInfo.avatar'
            }
          }
        }
      ])
      .toArray()

    const totalCount = await databaseService.messages.countDocuments({
      conversationId: convObjectId,
      type: 'text',
      content: { $regex: keyword, $options: 'i' },
      deletedByUsers: { $ne: userObjectId },
      deleted_by_users: { $ne: userObjectId },
      isDeleted: { $ne: true }
    })

    return {
      results,
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit)
    }
  }

  async markMessageDelivered(messageId: string, userId: string) {
    const result = await databaseService.messages.findOneAndUpdate(
      { _id: new ObjectId(messageId) },
      {
        $addToSet: { deliveredTo: new ObjectId(userId) },
        $set: { status: 'DELIVERED' }
      },
      { returnDocument: 'after' }
    )
    return result
  }

  async markMessageSeen(messageId: string, userId: string) {
    const result = await databaseService.messages.findOneAndUpdate(
      { _id: new ObjectId(messageId) },
      {
        $addToSet: { seenBy: new ObjectId(userId) },
        $set: { status: 'SEEN' }
      },
      { returnDocument: 'after' }
    )
    return result
  }

  // ==========================================================
  // LẤY LỊCH SỬ CHAT TOÀN CỤC CỦA 1 USER (DÀNH CHO AI)
  // ==========================================================
  async getGlobalRecentMessagesForUser(userId: string, limitPerConv: number = 10) {
    const userObjId = new ObjectId(userId)

    // 1. Tìm tất cả các nhóm/chat 1-1 mà user này là thành viên
    const conversations = await databaseService.conversations
      .find({
        $or: [{ participants: userObjId }, { 'members.userId': userObjId }, { 'members.user_id': userObjId }]
      })
      .toArray()

    if (!conversations.length) return []

    // Lấy top 10 hội thoại có tương tác gần đây nhất để tối ưu RAM và Token của AI
    const recentConvs = conversations
      .sort((a, b) => {
        const tA = a.updated_at ? new Date(a.updated_at).getTime() : 0
        const tB = b.updated_at ? new Date(b.updated_at).getTime() : 0
        return tB - tA
      })
      .slice(0, 10)

    // 2. Query lấy tin nhắn của từng hội thoại
    const globalContext = await Promise.all(
      recentConvs.map(async (conv) => {
        const msgs = await databaseService.messages
          .aggregate([
            {
              $match: {
                conversationId: conv._id,
                deletedByUsers: { $ne: userObjId },
                deleted_by_users: { $ne: userObjId },
                isDeleted: { $ne: true },
                type: 'text' // Chỉ lấy text cho AI đọc, bỏ qua sticker/image
              }
            },
            { $sort: { createdAt: -1 } },
            { $limit: limitPerConv },
            { $lookup: { from: 'users', localField: 'senderId', foreignField: '_id', as: 'senderInfo' } },
            { $unwind: { path: '$senderInfo', preserveNullAndEmptyArrays: true } }
          ])
          .toArray()

        return {
          conversationName: conv.name || (conv.type === 'group' ? 'Group Chat' : 'Chat 1-1'),
          conversationId: conv._id.toString(),
          messages: msgs.reverse() // Sắp xếp cũ -> mới
        }
      })
    )

    return globalContext.filter((c) => c.messages.length > 0)
  }
}

const messageService = new MessageService()
export default messageService
