import { ObjectId } from 'mongodb'
import httpStatus from '~/constants/httpStatus'
import { ErrorWithStatus } from '~/models/errors'
import Conversation from '~/models/schemas/conversation.schema'
import databaseService from '~/services/database.services'
import socketService from './socket.services'

class ChatService {
  async getConversations(userId: string, limit: number = 20, page: number = 1) {
    const userObjectId = new ObjectId(userId)
    const skip = (page - 1) * limit

    const conversations = await databaseService.conversations
      .aggregate([
        { $match: { participants: userObjectId } },
        { $sort: { updated_at: -1 } },
        { $skip: skip },
        { $limit: limit },
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
            localField: 'last_message_id',
            foreignField: '_id',
            as: 'last_message_info'
          }
        },
        { $unwind: { path: '$last_message_info', preserveNullAndEmptyArrays: true } },

        // --- FIX LỖI ĐẾM TIN NHẮN CHƯA ĐỌC ---
        // Ép kiểu toString để đảm bảo match chính xác user hiện tại
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
                      // Ép kiểu convId để tránh lỗi MongoDB không nhận diện
                      { $eq: [{ $toString: '$conversationId' }, { $toString: '$$convId' }] },
                      {
                        $gt: ['$_id', { $ifNull: ['$$lastViewedId', new ObjectId('000000000000000000000000')] }]
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
        // -------------------------------------

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

    // Bắt trạng thái online từ Socket mới nhất
    return conversations.map((conv) => {
      if (conv.participants && Array.isArray(conv.participants)) {
        conv.participants = conv.participants.map((p: any) => ({
          ...p,
          isOnline: socketService.usersOnline.has(p._id.toString())
        }))
      }
      return conv
    })
  }

  async createConversation(userId: string, type: 'direct' | 'group', members: string[], name?: string) {
    // ... Giữ nguyên như cũ của bạn ...
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
      return { ...newConversation, _id: result.insertedId }
    }
  }

  async getConversationById(conversationId: string, userId: string) {
    // ... Giữ nguyên như cũ ...
    const convObjectId = new ObjectId(conversationId)
    const userObjectId = new ObjectId(userId)
    const conversations = await databaseService.conversations
      .aggregate([
        { $match: { _id: convObjectId } },
        { $lookup: { from: 'users', localField: 'participants', foreignField: '_id', as: 'participants_info' } },
        {
          $project: {
            _id: 1,
            type: 1,
            name: 1,
            admin_id: 1,
            updated_at: 1,
            created_at: 1,
            last_message_id: 1,
            participants: 1,
            members: 1,
            participants_info: {
              $map: {
                input: '$participants_info',
                as: 'participant',
                in: {
                  _id: '$$participant._id',
                  username: '$$participant.username',
                  avatar: '$$participant.avatar',
                  email: '$$participant.email'
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
    // ... Giữ nguyên như cũ ...
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

    if (!conversation.last_message_id) {
      return { success: true }
    }

    // KIỂM TRA MẢNG MEMBERS ĐÃ CÓ USER NÀY CHƯA (Fix lỗi cho data cũ)
    const memberExists = conversation.members?.some(
      (m: any) => m.userId?.toString() === userId || m.user_id?.toString() === userId
    )

    if (memberExists) {
      // Nếu đã có trong mảng members -> Cập nhật bình thường
      await databaseService.conversations.updateOne(
        { _id: convObjectId, 'members.userId': userObjectId },
        { $set: { 'members.$.lastViewedMessageId': conversation.last_message_id } }
      )
    } else {
      // Nếu CHƯA CÓ (hội thoại được tạo từ code cũ) -> Push mới user này vào mảng members
      await databaseService.conversations.updateOne(
        { _id: convObjectId },
        {
          $push: {
            members: {
              userId: userObjectId,
              role: conversation.admin_id && conversation.admin_id.toString() === userId ? 'admin' : 'member',
              lastViewedMessageId: conversation.last_message_id
            } as any
          }
        }
      )
    }

    return { success: true }
  }
}

const chatService = new ChatService()
export default chatService
