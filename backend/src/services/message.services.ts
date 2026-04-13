import { ObjectId } from 'mongodb'
import databaseService from '~/services/database.services'
import { ErrorWithStatus } from '~/models/errors'
import httpStatus from '~/constants/httpStatus'
import Message from '~/models/schemas/message.schema'
import socketService from './socket.services'
import aiService from './ai/ai.service'
import { ContextManager } from './ai/context.manager'

const replyToLookupStages = [
  {
    $lookup: {
      from: 'messages',
      localField: 'replyToId',
      foreignField: '_id',
      as: 'replyToMessageInfo'
    }
  },
  {
    $lookup: {
      from: 'users',
      localField: 'replyToMessageInfo.senderId',
      foreignField: '_id',
      as: 'replyToSenderInfo'
    }
  }
]

// Field replyToMessage trong $project
const replyToMessageProjection = {
  $cond: {
    if: { $gt: [{ $size: '$replyToMessageInfo' }, 0] },
    then: {
      _id: { $toString: { $arrayElemAt: ['$replyToMessageInfo._id', 0] } },
      // ✅ FIX: Nếu là tin nhắn E2E, content trong reply sẽ là ciphertext,
      // giữ nguyên để frontend tự giải mã hoặc hiển thị placeholder
      content: { $arrayElemAt: ['$replyToMessageInfo.content', 0] },
      type: { $arrayElemAt: ['$replyToMessageInfo.type', 0] },
      isE2E: { $arrayElemAt: ['$replyToMessageInfo.isE2E', 0] },
      senderName: {
        $ifNull: [{ $arrayElemAt: ['$replyToSenderInfo.userName', 0] }, 'Người dùng']
      }
    },
    else: '$$REMOVE'
  }
}

const messageProjection = {
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
  isE2E: 1,
  encryptedKeys: 1,
  sender: { _id: '$senderInfo._id', userName: '$senderInfo.userName', avatar: '$senderInfo.avatar' },
  replyToMessage: replyToMessageProjection
}

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
        ...replyToLookupStages,
        { $project: messageProjection } // ✅ Dùng projection dùng chung có isE2E + encryptedKeys
      ])
      .toArray()
    return messages
  }

  async sendMessage(
    userId: string,
    convId: string,
    type: 'text' | 'sticker' | 'system' | 'media',
    content: string,
    replyToId?: string,
    isE2E?: boolean,
    encryptedKeys?: Record<string, string> | string[]
  ) {
    const userObjectId = new ObjectId(userId)
    const convObjectId = new ObjectId(convId)

    const conversation = await databaseService.conversations.findOne({ _id: convObjectId })
    if (!conversation) throw new ErrorWithStatus({ message: 'Không tìm thấy', status: httpStatus.NOT_FOUND })
    console.log('user_blocks', databaseService.user_blocks)

    if (conversation.type === 'direct' && conversation.participants) {
      const otherUserId = conversation.participants.find((p: ObjectId) => p.toString() !== userId)

      if (otherUserId) {
        const isBlockedByReceiver = await databaseService.user_blocks.findOne({
          user_id: new ObjectId(otherUserId),
          blocked_user_id: userObjectId
        })

        const isFriend = await databaseService.friends.findOne({
          $or: [
            { user_id: userObjectId, friend_id: new ObjectId(otherUserId) },
            { user_id: new ObjectId(otherUserId), friend_id: userObjectId }
          ]
        })

        if (!isFriend) {
          throw new ErrorWithStatus({
            message: 'Không thể thực hiện. Hai bạn hiện không còn là bạn bè.',
            status: httpStatus.FORBIDDEN
          })
        }

        if (isBlockedByReceiver) {
          throw new ErrorWithStatus({
            message: 'Xin lỗi! Hiện tại tôi không muốn nhận tin nhắn.',
            status: httpStatus.FORBIDDEN
          })
        }

        const isBlockedBySender = await databaseService.user_blocks.findOne({
          user_id: userObjectId,
          blocked_user_id: new ObjectId(otherUserId)
        })

        if (isBlockedBySender) {
          throw new ErrorWithStatus({
            message: 'Tin nhắn chưa được gửi. Bạn cần bỏ chặn người này để tiếp tục trò chuyện.',
            status: httpStatus.FORBIDDEN
          })
        }
      }
    }

    // Frontend gửi: encryptedKeys = Object.values({ userId1: key1, userId2: key2 }) → ["key1","key2"]
    // Backend cần: { userId1: key1, userId2: key2 }
    // Nhưng để đơn giản và không mất thông tin userId, ta ưu tiên nhận object.
    // Nếu là array → lưu dưới dạng object với index key (xem FIX ở ChatFooter để gửi object thay vì array)
    let normalizedEncryptedKeys: Record<string, string> = {}
    if (isE2E && encryptedKeys) {
      if (Array.isArray(encryptedKeys)) {
        // Fallback: nếu frontend vẫn gửi array, tạm lưu với key là index — KHÔNG DÙNG ĐỂ GIẢI MÃ
        // Đây chỉ là safety net, xem fix ở ChatFooter.tsx để gửi đúng format object
        encryptedKeys.forEach((val, idx) => {
          normalizedEncryptedKeys[`key_${idx}`] = val
        })
      } else {
        normalizedEncryptedKeys = encryptedKeys as Record<string, string>
      }
    }

    const newMessage = new Message({
      conversationId: convObjectId,
      senderId: userObjectId,
      type,
      content,
      replyToId: replyToId ? new ObjectId(replyToId) : undefined,
      status: 'SENT',
      isE2E: isE2E || false,
      encryptedKeys: normalizedEncryptedKeys
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
        ...replyToLookupStages,
        { $project: messageProjection }
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

  async getRecentMessagesForContext(convId: string, userId: string, limit: number) {
    const convObjectId = new ObjectId(convId)
    const userObjectId = new ObjectId(userId)

    const matchCondition: any = {
      conversationId: convObjectId,
      deletedByUsers: { $ne: userObjectId },
      isDeleted: { $ne: true }
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

  async summarizeConversation(convId: string, userId: string, limit: number = 30, unreadCount: number = 0) {
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

    const recentMessages = await this.getRecentMessagesForContext(convId, userId, limit)

    if (recentMessages.length === 0) {
      return { topic: 'Không có tin nhắn mới nào cần tóm tắt', decisions: [], openQuestions: [], actionItems: [] }
    }

    const chatLog = ContextManager.formatChatLog(recentMessages)

    return await aiService.summarizeChat(chatLog)
  }

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

    // ✅ NOTE: Chỉ tìm kiếm trong tin nhắn KHÔNG mã hóa (isE2E != true)
    // Tin nhắn E2E lưu ciphertext → không thể search full-text phía server
    const results = await databaseService.messages
      .aggregate([
        {
          $match: {
            conversationId: convObjectId,
            type: 'text',
            isE2E: { $ne: true }, // ✅ Bỏ qua tin nhắn E2E
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
      isE2E: { $ne: true },
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

  async getGlobalRecentMessagesForUser(userId: string, limitPerConv: number = 10) {
    const userObjId = new ObjectId(userId)

    const conversations = await databaseService.conversations
      .find({
        $or: [{ participants: userObjId }, { 'members.userId': userObjId }, { 'members.user_id': userObjId }]
      })
      .toArray()

    if (!conversations.length) return []

    const recentConvs = conversations
      .sort((a, b) => {
        const tA = a.updated_at ? new Date(a.updated_at).getTime() : 0
        const tB = b.updated_at ? new Date(b.updated_at).getTime() : 0
        return tB - tA
      })
      .slice(0, 10)

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
                isE2E: { $ne: true },
                type: 'text'
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
          messages: msgs.reverse()
        }
      })
    )

    return globalContext.filter((c) => c.messages.length > 0)
  }
}

const messageService = new MessageService()
export default messageService
