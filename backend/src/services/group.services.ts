import { ObjectId } from 'mongodb'
import databaseService from '~/services/database.services'

class GroupService {

  async addMembers(conversationId: string, memberIds: string[]) {
    const conversationObjectId = new ObjectId(conversationId)
    const objectMemberIds = memberIds.map(id => new ObjectId(id))

    const newMembers = objectMemberIds.map(id => ({
      userId: id,
      role: 'member' as const,
      joinedAt: new Date()
    }))

    // Thay đổi ở đây: Dùng findOneAndUpdate thay vì updateOne
    const result = await databaseService.conversations.findOneAndUpdate(
      { _id: conversationObjectId },
      {
        $addToSet: { participants: { $each: objectMemberIds } },
        $push: { members: { $each: newMembers } }
      },
      {
        returnDocument: 'after' // Trả về document SAU khi đã update
      }
    )

    // Tùy thuộc vào version của thư viện mongodb bạn đang dùng:
    // Bản mới (v6 trở lên) thì result chính là document.
    // Bản cũ (v5 trở xuống) thì document nằm trong result.value.
    return result
  }

  async markAsRead(conversationId: string, userId: string, lastMessageId: string) {
    return databaseService.conversations.updateOne(
      {
        _id: new ObjectId(conversationId),
        'members.userId': new ObjectId(userId)
      },
      {
        $set: { 'members.$.lastViewedMessageId': new ObjectId(lastMessageId) }
      }
    )
  }

  async togglePin(userId: string, conversationId: string, isPin: boolean) {
    const conversationObjectId = new ObjectId(conversationId)

    // Đổi updateOne thành findOneAndUpdate
    const result = await databaseService.conversations.findOneAndUpdate(
      { _id: conversationObjectId },
      {
        $set: { is_pin: isPin } // ✅ ĐÚNG: Phải có $set
      },
      { returnDocument: 'after' }
    )

    return result
  }

  async kickMember(conversationId: string, memberId: string) {
    const conversationObjectId = new ObjectId(conversationId)
    const memberObjectId = new ObjectId(memberId)

    const result = await databaseService.conversations.findOneAndUpdate(
      { _id: conversationObjectId },
      {
        // Dùng $pull để xóa user khỏi mảng participants và mảng members
        $pull: {
          participants: memberObjectId,
          members: { userId: memberObjectId }
        }
      },
      {
        returnDocument: 'after' // Trả về document sau khi đã xóa member
      }
    )

    return result
  }

  async promoteToAdmin(conversationId: string, targetMemberId: string) {
    const conversationObjectId = new ObjectId(conversationId)
    const targetMemberObjectId = new ObjectId(targetMemberId)

    // BƯỚC 1: "Reset" toàn bộ nhóm. Đưa TẤT CẢ mọi người về quyền 'member'
    await databaseService.conversations.updateOne(
      { _id: conversationObjectId },
      {
        $set: { 'members.$[].role': 'member' } // Toán tử $[] giúp update toàn bộ mảng
      }
    )

    // BƯỚC 2: Thăng cấp duy nhất người được chọn lên làm 'admin'
    const result = await databaseService.conversations.findOneAndUpdate(
      {
        _id: conversationObjectId,
        'members.userId': targetMemberObjectId
      },
      {
        $set: { 'members.$.role': 'admin' } // Toán tử $ chỉ update đúng ông được tìm thấy
      },
      {
        returnDocument: 'after'
      }
    )

    return result
  }

  async leaveGroup(conversationId: string, userId: string) {
    const conversationObjectId = new ObjectId(conversationId)
    const userObjectId = new ObjectId(userId)

    const conversation = await databaseService.conversations.findOne({
      _id: conversationObjectId
    })

    if (!conversation) return null

    const leavingMember = conversation.members.find(
      m => m.userId.toString() === userId
    )

    const isAdmin = leavingMember?.role === 'admin'

    // 1. Bước 1: Xóa user hiện tại khỏi nhóm
    await databaseService.conversations.updateOne(
      { _id: conversationObjectId },
      {
        $pull: {
          members: { userId: userObjectId },
          participants: userObjectId
        }
      }
    )

    // 2. Bước 2: Nếu người rời là admin → tìm member khác để thăng cấp
    if (isAdmin) {
      const remainingMembers = conversation.members.filter(
        m => m.userId.toString() !== userId
      )

      if (remainingMembers.length > 0) {
        const nextAdminId = remainingMembers[0].userId

        await databaseService.conversations.updateOne(
          {
            _id: conversationObjectId,
            'members.userId': nextAdminId
          },
          {
            $set: { 'members.$.role': 'admin' }
          }
        )
      }
    }

    // 3. BƯỚC QUAN TRỌNG NHẤT: Lấy lại thông tin document mới nhất từ DB
    const updatedConversation = await databaseService.conversations.findOne({
      _id: conversationObjectId
    })

    // Trả về dữ liệu này để Controller show ra Postman
    return updatedConversation
  }
}

export const groupService = new GroupService()