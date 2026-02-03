import { ObjectId } from 'mongodb'
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
}

const chatService = new ChatService()
export default chatService
