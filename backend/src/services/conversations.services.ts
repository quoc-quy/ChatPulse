import { ObjectId } from 'mongodb'
import httpStatus from '~/constants/httpStatus'
import { ErrorWithStatus } from '~/models/errors'
import Conversation from '~/models/schemas/conversation.schema'
import databaseService from '~/services/database.services'

class ChatService {
  async getConversations(userId: string, limit: number = 20, page: number = 1) {
    const userObjectId = new ObjectId(userId)
    const skip = (page - 1) * limit

    const conversations = await databaseService.conversations
      .aggregate([
        // 1. Tìm các cuộc hội thoại mà user tham gia
        {
          $match: {
            participants: userObjectId
          }
        },
        // 2. Sắp xếp theo thời gian cập nhật (tin nhắn mới nhất lên đầu)
        {
          $sort: {
            updated_at: -1
          }
        },
        // 3. Phân trang
        {
          $skip: skip
        },
        {
          $limit: limit
        },
        // 4. Lookup thông tin các thành viên (participants)
        {
          $lookup: {
            from: 'users',
            localField: 'participants',
            foreignField: '_id',
            as: 'participants_info'
          }
        },
        // 5. Project để format lại dữ liệu trả về (ẩn password, giữ lại avatar, name)
        {
          $project: {
            _id: 1,
            type: 1,
            updated_at: 1,
            last_message_id: 1,
            // Lọc bỏ user hiện tại khỏi list participants để FE dễ hiển thị tên người kia (đối với chat 1-1)
            participants: {
              $map: {
                input: '$participants_info',
                as: 'participant',
                in: {
                  _id: '$$participant._id',
                  userName: '$$participant.userName',
                  avatar: '$$participant.avatar',
                  email: '$$participant.email'
                }
              }
            }
          }
        }
      ])
      .toArray()

    return conversations
  }

  async createConversation(userId: string, type: 'direct' | 'group', members: string[], name?: string) {
    const userObjectId = new ObjectId(userId)
    const memberObjectIds = members.map((id) => new ObjectId(id))

    // Đảm bảo người tạo luôn nằm trong danh sách participants
    const participants = [userObjectId, ...memberObjectIds]

    if (type === 'direct') {
      const receiverId = memberObjectIds[0]

      // Kiểm tra xem hội thoại direct giữa 2 người đã tồn tại chưa
      const existingConversation = await databaseService.conversations.findOne({
        type: 'direct',
        participants: { $all: [userObjectId, receiverId], $size: 2 }
      })

      if (existingConversation) {
        return existingConversation
      }

      // Nếu chưa có thì tạo mới
      const newConversation = new Conversation({
        participants: [userObjectId, receiverId],
        type: 'direct',
        updated_at: new Date(), // Thêm dòng này
        created_at: new Date()
      })
      const result = await databaseService.conversations.insertOne(newConversation)
      return { ...newConversation, _id: result.insertedId }
    } else {
      // Logic cho Group chat
      const newConversation = new Conversation({
        participants,
        type: 'group',
        name,
        admin_id: userObjectId, // Gán quyền admin cho người tạo nhóm
        updated_at: new Date(),
        created_at: new Date()
      })
      const result = await databaseService.conversations.insertOne(newConversation)
      return { ...newConversation, _id: result.insertedId }
    }
  }

  async getConversationById(conversationId: string, userId: string) {
    const convObjectId = new ObjectId(conversationId)
    const userObjectId = new ObjectId(userId)

    const conversations = await databaseService.conversations
      .aggregate([
        {
          $match: {
            _id: convObjectId
          }
        },
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
            admin_id: 1,
            updated_at: 1,
            created_at: 1,
            last_message_id: 1,
            participants: 1,
            // Ẩn các thông tin nhạy cảm của user, chỉ lấy ra những thông tin public
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

    if (!conversations || conversations.length === 0) {
      throw new ErrorWithStatus({
        message: 'Không tìm thấy cuộc hội thoại',
        status: httpStatus.NOT_FOUND
      })
    }

    const conversationDetail = conversations[0]

    // Kiểm tra xem user đang gọi API có nằm trong danh sách participants không (Lỗi 403)
    const isMember = conversationDetail.participants.some(
      (participantId: ObjectId) => participantId.toString() === userId
    )

    if (!isMember) {
      throw new ErrorWithStatus({
        message: 'Bạn không có quyền xem cuộc hội thoại này do không phải là thành viên',
        status: httpStatus.FORBIDDEN
      })
    }

    return conversationDetail
  }

  async updateGroup(conversationId: string, userId: string, payload: { name?: string; avatarUrl?: string }) {
    const convObjectId = new ObjectId(conversationId)

    // 1. Tìm cuộc hội thoại
    const conversation = await databaseService.conversations.findOne({ _id: convObjectId })

    if (!conversation) {
      throw new ErrorWithStatus({
        message: 'Không tìm thấy cuộc hội thoại',
        status: httpStatus.NOT_FOUND
      })
    }

    // 2. Kiểm tra loại hội thoại
    if (conversation.type !== 'group') {
      throw new ErrorWithStatus({
        message: 'Chỉ có thể cập nhật thông tin cho nhóm chat',
        status: httpStatus.BAD_REQUEST
      })
    }

    // 3. Kiểm tra quyền: Bất kỳ thành viên nào cũng có quyền cập nhật
    const isMember = conversation.participants.some((participantId: ObjectId) => participantId.toString() === userId)

    if (!isMember) {
      throw new ErrorWithStatus({
        message: 'Bạn không có quyền cập nhật do không phải là thành viên của nhóm này',
        status: httpStatus.FORBIDDEN
      })
    }

    // 4. Chuẩn bị dữ liệu cập nhật
    const updateData: any = { updated_at: new Date() }
    if (payload.name !== undefined) updateData.name = payload.name
    if (payload.avatarUrl !== undefined) updateData.avatarUrl = payload.avatarUrl

    // 5. Cập nhật vào DB và trả về document mới
    const result = await databaseService.conversations.findOneAndUpdate(
      { _id: convObjectId },
      { $set: updateData },
      { returnDocument: 'after' } // Trả về dữ liệu sau khi đã update
    )

    return result
  }

  async markAsSeen(conversationId: string, userId: string) {
    const convObjectId = new ObjectId(conversationId)
    const userObjectId = new ObjectId(userId)

    // 1. Kiểm tra hội thoại có tồn tại không
    const conversation = await databaseService.conversations.findOne({ _id: convObjectId })
    if (!conversation) {
      throw new ErrorWithStatus({
        message: 'Không tìm thấy cuộc hội thoại',
        status: httpStatus.NOT_FOUND
      })
    }

    // 2. Kiểm tra xem user có phải thành viên không
    const isParticipant = conversation.participants.some(
      (participantId: ObjectId) => participantId.toString() === userId
    )
    if (!isParticipant) {
      throw new ErrorWithStatus({
        message: 'Bạn không phải là thành viên của cuộc hội thoại này',
        status: httpStatus.FORBIDDEN
      })
    }

    // Nếu hội thoại mới tạo, chưa có tin nhắn nào (last_message_id rỗng) thì không cần đánh dấu
    if (!conversation.last_message_id) {
      return { success: true }
    }

    // 3. Reset unread_count bằng cách đẩy lastViewedMessageId = last_message_id của hội thoại
    await databaseService.conversations.updateOne(
      {
        _id: convObjectId,
        'members.userId': userObjectId
      },
      {
        $set: {
          'members.$.lastViewedMessageId': conversation.last_message_id
        }
      }
    )

    return { success: true }
  }
}

const chatService = new ChatService()
export default chatService
