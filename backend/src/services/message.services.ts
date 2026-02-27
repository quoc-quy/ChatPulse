import { ObjectId } from 'mongodb'
import databaseService from '~/services/database.services'
import { ErrorWithStatus } from '~/models/errors'
import httpStatus from '~/constants/httpStatus'

class MessageService {
  async getMessages(conversationId: string, userId: string, cursor?: string, limit: number = 20) {
    const convObjectId = new ObjectId(conversationId)
    const userObjectId = new ObjectId(userId)

    // 1. Kiểm tra tồn tại và quyền truy cập
    const conversation = await databaseService.conversations.findOne({ _id: convObjectId })
    if (!conversation) {
      throw new ErrorWithStatus({
        message: 'Không tìm thấy cuộc hội thoại',
        status: httpStatus.NOT_FOUND
      })
    }

    // TÌM KIẾM TRONG MẢNG MEMBERS (Thêm dấu ? sau userId phòng trường hợp field bị sai tên)
    let userMember = conversation.members?.find(
      (member: any) => member.userId?.toString() === userId || member.user_id?.toString() === userId
    )

    // FIX LỖI: FALLBACK TƯƠNG THÍCH NGƯỢC VỚI DỮ LIỆU CŨ
    // Nếu mảng members không có, nhưng user vẫn nằm trong participants cũ
    if (!userMember && conversation.participants) {
      const isOldParticipant = conversation.participants.some((p: ObjectId) => p.toString() === userId)

      if (isOldParticipant) {
        // Tạo một object member "ảo" để code đi tiếp xuống dưới mà không bị crash
        userMember = {
          userId: new ObjectId(userId),
          role: 'member'
        }
      }
    }

    // Nếu qua cả 2 vòng check trên mà vẫn không có thì mới văng lỗi 403
    if (!userMember) {
      throw new ErrorWithStatus({
        message: 'Bạn không có quyền xem tin nhắn của hội thoại này',
        status: httpStatus.FORBIDDEN
      })
    }

    // 2. Xây dựng điều kiện truy vấn ($match)
    const matchCondition: any = {
      conversationId: convObjectId,
      // Tính năng Soft Delete: Bỏ qua tin nhắn user đã xóa
      deletedByUsers: { $ne: userObjectId }
    }

    // Tính năng Clear History: Chỉ lấy tin nhắn sau thời điểm dọn lịch sử
    if (userMember.clearedHistoryAt) {
      matchCondition.createdAt = { $gt: userMember.clearedHistoryAt }
    }

    // Phân trang bằng Cursor: Chỉ lấy tin nhắn cũ hơn cursor hiện tại
    if (cursor) {
      matchCondition._id = { $lt: new ObjectId(cursor) }
    }

    // 3. Thực thi truy vấn
    const messages = await databaseService.messages
      .aggregate([
        { $match: matchCondition },
        { $sort: { createdAt: -1 } }, // Sắp xếp giảm dần (mới nhất lên đầu)
        { $limit: limit },
        {
          $lookup: {
            from: 'users',
            localField: 'senderId',
            foreignField: '_id',
            as: 'senderInfo'
          }
        },
        { $unwind: '$senderInfo' },
        {
          $project: {
            _id: 1,
            conversationId: 1,
            type: 1,
            content: 1,
            replyToId: 1,
            reactions: 1,
            callInfo: 1,
            createdAt: 1,
            updatedAt: 1,
            sender: {
              _id: '$senderInfo._id',
              username: '$senderInfo.username',
              avatar: '$senderInfo.avatar'
            }
          }
        }
      ])
      .toArray()

    return messages
  }
}

const messageService = new MessageService()
export default messageService
