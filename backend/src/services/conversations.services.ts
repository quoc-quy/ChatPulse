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
            let: { convId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$conversationId', '$$convId'] },
                  deletedByUsers: { $ne: userObjectId } // QUAN TRỌNG: Bỏ qua các tin nhắn user ĐÃ XÓA
                }
              },
              { $sort: { createdAt: -1 } }, // Sắp xếp mới nhất lên đầu
              { $limit: 1 } // Chỉ lấy 1 tin nhắn làm preview
            ],
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

      // ==========================================================
      // BẮT ĐẦU THÊM: Gửi tin nhắn hệ thống thông báo tạo nhóm
      // ==========================================================
      await messageService.sendMessage(
        userId,
        result.insertedId.toString(),
        'system',
        `Nhóm "${name || 'Chưa đặt tên'}" đã được tạo. Chào mừng tất cả thành viên!`
      )
      // ==========================================================

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
            // ✅ FIX: map đúng field + thêm userName, phone
            participants_info: {
              $map: {
                input: '$participants_info',
                as: 'p',
                in: {
                  _id: '$$p._id',
                  userName: '$$p.userName', // ✅ chữ N hoa, đúng schema
                  fullName: '$$p.fullName', // ✅ thêm fullName
                  phone: '$$p.phone', // ✅ thêm phone để hiện sub text
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

    // ✅ FIX: Lấy tin nhắn MỚI NHẤT thật sự từ messages collection
    // Không dùng conversation.last_message_id vì field này thường không được
    // update khi có tin nhắn mới → lastViewedMessageId bị set vào ID cũ
    // → getConversations vẫn đếm được unread_count > 0 sau khi login lại
    const latestMessage = await databaseService.messages.findOne(
      { conversationId: convObjectId },
      { sort: { createdAt: -1 } }
    )

    // Nếu không có tin nhắn nào thì không cần làm gì
    if (!latestMessage) {
      return { success: true }
    }

    const latestMessageId = latestMessage._id

    // KIỂM TRA MẢNG MEMBERS ĐÃ CÓ USER NÀY CHƯA (Fix lỗi cho data cũ)
    const memberExists = conversation.members?.some(
      (m: any) => m.userId?.toString() === userId || m.user_id?.toString() === userId
    )

    if (memberExists) {
      // Nếu đã có trong mảng members -> Cập nhật bình thường
      await databaseService.conversations.updateOne(
        { _id: convObjectId, 'members.userId': userObjectId },
        { $set: { 'members.$.lastViewedMessageId': latestMessageId } } // ✅ dùng latestMessageId
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
              lastViewedMessageId: latestMessageId // ✅ dùng latestMessageId
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

    // 1. QUERIES SONG SONG ĐỂ LẤY TOÀN BỘ SIÊU DỮ LIỆU (Tối ưu tốc độ)
    const [globalRawData, profile, friends, receivedReqs, sentReqs, blocks] = await Promise.all([
      messageService.getGlobalRecentMessagesForUser(userId, 10), // Lấy tin nhắn
      databaseService.users.findOne({ _id: userObjId }), // Lấy Profile
      // Tìm danh sách bạn bè (bao quát cả 2 trường hợp user_id hoặc friend_id)
      databaseService.friends
        .find({
          $or: [{ user_id: userObjId }, { userId: userObjId }, { friend_id: userObjId }, { friendId: userObjId }]
        })
        .toArray(),
      // Lời mời kết bạn được nhận
      databaseService.friendRequests
        .find({
          $or: [{ receiver_id: userObjId }, { receiverId: userObjId }]
        })
        .toArray(),
      // Lời mời kết bạn đã gửi
      databaseService.friendRequests
        .find({
          $or: [{ sender_id: userObjId }, { senderId: userObjId }]
        })
        .toArray(),
      // Danh sách chặn
      databaseService.user_blocks
        .find({
          $or: [{ blocker_id: userObjId }, { blockerId: userObjId }]
        })
        .toArray()
    ])

    // 2. Định dạng dữ liệu thành chữ để nạp vào não AI
    const globalContextStr = ContextManager.formatGlobalChatLog(globalRawData)
    const userMetadataStr = ContextManager.formatUserMetadata(profile, friends, receivedReqs, sentReqs, blocks)

    // 3. Gọi AI và truyền đầy đủ bộ não
    const answer = await aiService.answerQuestion(globalContextStr, userMetadataStr, chatContext, question)

    return answer
  }
}

const chatService = new ChatService()
export default chatService
