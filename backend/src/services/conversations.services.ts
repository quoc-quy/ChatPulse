import { ObjectId } from 'mongodb'
import httpStatus from '~/constants/httpStatus'
import { ErrorWithStatus } from '~/models/errors'
import Conversation from '~/models/schemas/conversation.schema'
import databaseService from '~/services/database.services'
import socketService from './socket.services'
import { ContextManager } from './ai/context.manager'
import aiService from './ai/ai.service'
import messageService from './message.services'

class ChatService {
  async getConversations(userId: string, limit: number | string = 20, page: number | string = 1) {
    const userObjectId = new ObjectId(userId)

    // ✅ FIX 1: Ép kiểu an toàn tránh lỗi string truyền vào $limit
    const numLimit = Number(limit) || 20
    const numPage = Number(page) || 1
    const skip = (numPage - 1) * numLimit

    const conversations = await databaseService.conversations
      .aggregate([
        { $match: { participants: userObjectId } },
        { $sort: { updated_at: -1 } },
        { $skip: skip },
        { $limit: numLimit }, // Sử dụng biến đã ép kiểu
        {
          $lookup: {
            from: 'users',
            localField: 'participants',
            foreignField: '_id',
            as: 'participants_info'
          }
        },
        {
          $lookup: {
            from: 'messages',
            let: { convId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$conversationId', '$$convId'] },
                  deletedByUsers: { $ne: userObjectId }
                }
              },
              { $sort: { createdAt: -1 } },
              { $limit: 1 }
            ],
            as: 'last_message_info'
          }
        },
        { $unwind: { path: '$last_message_info', preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            currentUserMemberInfo: {
              $arrayElemAt: [
                {
                  $filter: {
                    input: { $ifNull: ['$members', []] },
                    as: 'member',
                    cond: { $eq: [{ $toString: '$$member.userId' }, { $toString: userObjectId }] }
                  }
                },
                0
              ]
            }
          }
        },
        {
          $lookup: {
            from: 'messages',
            let: {
              convId: '$_id',
              lastViewedId: '$currentUserMemberInfo.lastViewedMessageId'
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: [{ $toString: '$conversationId' }, { $toString: '$$convId' }] },
                      // ✅ FIX 2: Ép về chuỗi để so sánh thời gian của ObjectId một cách tuyệt đối an toàn
                      {
                        $gt: [
                          { $toString: '$_id' },
                          { $toString: { $ifNull: ['$$lastViewedId', new ObjectId('000000000000000000000000')] } }
                        ]
                      },
                      { $ne: [{ $toString: '$senderId' }, { $toString: userObjectId }] }
                    ]
                  }
                }
              },
              { $count: 'unread_count' }
            ],
            as: 'unread_info'
          }
        },
        {
          $addFields: {
            unread_count: { $ifNull: [{ $arrayElemAt: ['$unread_info.unread_count', 0] }, 0] }
          }
        },
        {
          $project: {
            _id: 1,
            type: 1,
            name: 1,
            updated_at: 1,
            last_message_id: 1,
            members: 1,
            admin_id: 1,
            unread_count: 1,
            avatarUrl: { $ifNull: ['$avatarUrl', ''] },
            lastMessage: {
              content: '$last_message_info.content',
              type: '$last_message_info.type',
              created_at: '$last_message_info.createdAt',
              sender_id: '$last_message_info.senderId'
            },
            participants: {
              $map: {
                input: '$participants_info',
                as: 'participant',
                in: {
                  _id: '$$participant._id',
                  userName: '$$participant.userName',
                  fullName: '$$participant.fullName',
                  avatar: '$$participant.avatar',
                  email: '$$participant.email'
                }
              }
            }
          }
        }
      ])
      .toArray()

    const finalConversations = await Promise.all(
      conversations.map(async (conv) => {
        if (conv.participants && Array.isArray(conv.participants)) {
          conv.participants = conv.participants.map((p: any) => ({
            ...p,
            isOnline: socketService.usersOnline.has(p._id.toString())
          }))
        }

        if (conv.type === 'direct') {
          const otherUser = conv.participants.find((p: any) => p._id.toString() !== userObjectId.toString())

          // ✅ FIX 3: Kiểm tra chắc chắn otherUser._id hợp lệ trước khi bọc vào ObjectId
          if (otherUser && otherUser._id && ObjectId.isValid(otherUser._id)) {
            const isFriendDoc = await databaseService.friends.findOne({
              $or: [
                { user_id: userObjectId, friend_id: new ObjectId(otherUser._id) },
                { user_id: new ObjectId(otherUser._id), friend_id: userObjectId }
              ]
            })
            conv.isFriend = isFriendDoc !== null
          } else {
            conv.isFriend = false // Nếu không có user hợp lệ thì không phải bạn bè
          }
        } else {
          conv.isFriend = true // Mặc định group chat là true để không bị chặn
        }

        return conv
      })
    )

    return finalConversations
  }

  async createConversation(userId: string, type: 'direct' | 'group', members: string[], name?: string) {
    const userObjectId = new ObjectId(userId)
    const memberObjectIds = members.map((id) => new ObjectId(id))
    const participants = [userObjectId, ...memberObjectIds]

    if (type === 'direct') {
      const receiverId = memberObjectIds[0]
      const existingConversation = await databaseService.conversations.findOne({
        type: 'direct',
        participants: { $all: [userObjectId, receiverId], $size: 2 }
      })
      if (existingConversation) return existingConversation

      const newConversation = new Conversation({
        participants: [userObjectId, receiverId],
        type: 'direct',
        updated_at: new Date(),
        created_at: new Date()
      })
      const result = await databaseService.conversations.insertOne(newConversation)
      return { ...newConversation, _id: result.insertedId }
    } else {
      const newConversation = new Conversation({
        participants,
        type: 'group',
        name,
        admin_id: userObjectId,
        updated_at: new Date(),
        created_at: new Date()
      })
      const result = await databaseService.conversations.insertOne(newConversation)

      await messageService.sendMessage(
        userId,
        result.insertedId.toString(),
        'system',
        `Nhóm "${name || 'Chưa đặt tên'}" đã được tạo. Chào mừng tất cả thành viên!`
      )

      return { ...newConversation, _id: result.insertedId }
    }
  }

  async getConversationById(conversationId: string, userId: string) {
    const convObjectId = new ObjectId(conversationId)
    const userObjectId = new ObjectId(userId)
    const conversations = await databaseService.conversations
      .aggregate([
        { $match: { _id: convObjectId } },
        {
          $lookup: {
            from: 'users',
            localField: 'participants',
            foreignField: '_id',
            as: 'participants_info'
          }
        },
        {
          $project: {
            _id: 1,
            type: 1,
            name: 1,
            avatarUrl: 1,
            admin_id: 1,
            updated_at: 1,
            created_at: 1,
            last_message_id: 1,
            participants: 1,
            members: 1,
            participants_info: {
              $map: {
                input: '$participants_info',
                as: 'p',
                in: {
                  _id: '$$p._id',
                  userName: '$$p.userName',
                  fullName: '$$p.fullName',
                  phone: '$$p.phone',
                  avatar: '$$p.avatar',
                  email: '$$p.email'
                }
              }
            }
          }
        }
      ])
      .toArray()

    if (!conversations || conversations.length === 0)
      throw new ErrorWithStatus({ message: 'Không tìm thấy', status: httpStatus.NOT_FOUND })
    const conversationDetail = conversations[0]
    const isMember = conversationDetail.participants.some((p: ObjectId) => p.toString() === userId)
    if (!isMember) throw new ErrorWithStatus({ message: 'Không có quyền', status: httpStatus.FORBIDDEN })
    return conversationDetail
  }

  async updateGroup(conversationId: string, userId: string, payload: { name?: string; avatarUrl?: string }) {
    const convObjectId = new ObjectId(conversationId)
    const conversation = await databaseService.conversations.findOne({ _id: convObjectId })
    if (!conversation) throw new ErrorWithStatus({ message: 'Không tìm thấy', status: httpStatus.NOT_FOUND })
    if (conversation.type !== 'group')
      throw new ErrorWithStatus({ message: 'Chỉ nhóm', status: httpStatus.BAD_REQUEST })
    const isMember = conversation.participants.some((p: ObjectId) => p.toString() === userId)
    if (!isMember) throw new ErrorWithStatus({ message: 'Không có quyền', status: httpStatus.FORBIDDEN })

    const updateData: any = { updated_at: new Date() }
    if (payload.name !== undefined) updateData.name = payload.name
    if (payload.avatarUrl !== undefined) updateData.avatarUrl = payload.avatarUrl

    const result = await databaseService.conversations.findOneAndUpdate(
      { _id: convObjectId },
      { $set: updateData },
      { returnDocument: 'after' }
    )
    return result
  }

  async markAsSeen(conversationId: string, userId: string) {
    const convObjectId = new ObjectId(conversationId)
    const userObjectId = new ObjectId(userId)

    const conversation = await databaseService.conversations.findOne({ _id: convObjectId })
    if (!conversation) {
      throw new ErrorWithStatus({
        message: 'Không tìm thấy cuộc hội thoại',
        status: httpStatus.NOT_FOUND
      })
    }

    const isParticipant = conversation.participants.some(
      (participantId: ObjectId) => participantId.toString() === userId
    )
    if (!isParticipant) {
      throw new ErrorWithStatus({
        message: 'Bạn không phải là thành viên của cuộc hội thoại này',
        status: httpStatus.FORBIDDEN
      })
    }

    const latestMessage = await databaseService.messages.findOne(
      { conversationId: convObjectId },
      { sort: { createdAt: -1 } }
    )

    if (!latestMessage) {
      return { success: true }
    }

    const latestMessageId = latestMessage._id

    const memberExists = conversation.members?.some(
      (m: any) => m.userId?.toString() === userId || m.user_id?.toString() === userId
    )

    if (memberExists) {
      await databaseService.conversations.updateOne(
        { _id: convObjectId, 'members.userId': userObjectId },
        { $set: { 'members.$.lastViewedMessageId': latestMessageId } }
      )
    } else {
      await databaseService.conversations.updateOne(
        { _id: convObjectId },
        {
          $push: {
            members: {
              userId: userObjectId,
              role: conversation.admin_id && conversation.admin_id.toString() === userId ? 'admin' : 'member',
              lastViewedMessageId: latestMessageId
            } as any
          }
        }
      )
    }

    return { success: true }
  }

  async askChatPulseAI(userId: string, chatContext: any[], question: string) {
    if (!question || question.trim() === '') {
      throw new ErrorWithStatus({ message: 'Vui lòng nhập câu hỏi', status: httpStatus.BAD_REQUEST })
    }

    const userObjId = new ObjectId(userId)

    const [globalRawData, profile, friends, receivedReqs, sentReqs, blocks] = await Promise.all([
      messageService.getGlobalRecentMessagesForUser(userId, 10),
      databaseService.users.findOne({ _id: userObjId }),
      databaseService.friends
        .find({
          $or: [{ user_id: userObjId }, { userId: userObjId }, { friend_id: userObjId }, { friendId: userObjId }]
        })
        .toArray(),
      databaseService.friendRequests
        .find({
          $or: [{ receiver_id: userObjId }, { receiverId: userObjId }]
        })
        .toArray(),
      databaseService.friendRequests
        .find({
          $or: [{ sender_id: userObjId }, { senderId: userObjId }]
        })
        .toArray(),
      databaseService.user_blocks
        .find({
          $or: [{ blocker_id: userObjId }, { blockerId: userObjId }]
        })
        .toArray()
    ])

    const globalContextStr = ContextManager.formatGlobalChatLog(globalRawData)
    const userMetadataStr = ContextManager.formatUserMetadata(profile, friends, receivedReqs, sentReqs, blocks)

    const answer = await aiService.answerQuestion(globalContextStr, userMetadataStr, chatContext, question)

    return answer
  }

  async deleteConversation(userId: string, conversationId: string) {
    const userObjId = new ObjectId(userId)
    const convObjId = new ObjectId(conversationId)

    const result = await databaseService.conversations.findOneAndUpdate(
      { _id: convObjId },
      { $addToSet: { deletedByUsers: userObjId } as any },
      { returnDocument: 'after' }
    )

    await databaseService.messages.updateMany(
      { conversationId: convObjId },
      { $addToSet: { deletedByUsers: userObjId } as any }
    )

    return result
  }
}

const chatService = new ChatService()
export default chatService
