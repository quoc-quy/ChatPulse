import { ObjectId } from 'mongodb'
import databaseService from '~/services/database.services'

class GroupService {
  async addMembers(conversationId: string, memberIds: string[]) {
    const conversationObjectId = new ObjectId(conversationId)
    const objectMemberIds = memberIds.map((id) => new ObjectId(id))

    const newMembers = objectMemberIds.map((id) => ({
      userId: id,
      role: 'member' as const,
      joinedAt: new Date()
    }))

    const result = await databaseService.conversations.findOneAndUpdate(
      { _id: conversationObjectId },
      {
        $addToSet: { participants: { $each: objectMemberIds } },
        $push: { members: { $each: newMembers } }
      },
      {
        returnDocument: 'after'
      }
    )

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

    const result = await databaseService.conversations.findOneAndUpdate(
      { _id: conversationObjectId },
      {
        $set: { is_pin: isPin }
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
        $pull: {
          participants: memberObjectId,
          members: { userId: memberObjectId }
        }
      },
      {
        returnDocument: 'after'
      }
    )

    return result
  }

  async promoteToAdmin(conversationId: string, targetMemberId: string) {
    const conversationObjectId = new ObjectId(conversationId)
    const targetMemberObjectId = new ObjectId(targetMemberId)

    // 1. Lấy conversation để biết admin_id hiện tại
    const conversation = await databaseService.conversations.findOne({
      _id: conversationObjectId
    })
    if (!conversation) return null

    const oldAdminId = conversation.admin_id

    // 2. Cập nhật admin_id sang người mới
    const result = await databaseService.conversations.findOneAndUpdate(
      { _id: conversationObjectId },
      { $set: { admin_id: targetMemberObjectId } },
      { returnDocument: 'after' }
    )

    // 3. ✅ Reset role admin cũ → member (tránh 2 admin)
    if (oldAdminId) {
      try {
        await databaseService.conversations.updateOne(
          { _id: conversationObjectId, 'members.userId': oldAdminId },
          { $set: { 'members.$.role': 'member' } }
        )
      } catch {}
    }

    // 4. ✅ Set role admin cho người mới
    try {
      await databaseService.conversations.updateOne(
        { _id: conversationObjectId, 'members.userId': targetMemberObjectId },
        { $set: { 'members.$.role': 'admin' } }
      )
    } catch {}

    return result
  }

  async leaveGroup(conversationId: string, userId: string) {
    const conversationObjectId = new ObjectId(conversationId)
    const userObjectId = new ObjectId(userId)

    const conversation = await databaseService.conversations.findOne({
      _id: conversationObjectId
    })

    if (!conversation) return null

    // 1. Xóa user hiện tại khỏi mảng participants và members (dùng pull rất an toàn, không sợ lỗi)
    await databaseService.conversations.updateOne(
      { _id: conversationObjectId },
      {
        $pull: {
          participants: userObjectId,
          members: { userId: userObjectId }
        }
      }
    )

    // 2. Kiểm tra xem người rời đi có phải là admin không (dựa vào admin_id thay vì chọc vào mảng members)
    const isAdmin = conversation.admin_id && conversation.admin_id.toString() === userId

    if (isAdmin) {
      // Lấy danh sách participants còn lại
      const remainingParticipants = (conversation.participants || []).filter((p: ObjectId) => p.toString() !== userId)

      if (remainingParticipants.length > 0) {
        const nextAdminId = remainingParticipants[0]

        // Gán admin_id mới cho người đầu tiên
        await databaseService.conversations.updateOne(
          { _id: conversationObjectId },
          {
            $set: { admin_id: nextAdminId }
          }
        )
      }
    }

    // 3. Lấy lại thông tin document mới nhất từ DB trả về
    const updatedConversation = await databaseService.conversations.findOne({
      _id: conversationObjectId
    })

    return updatedConversation
  }
}

export const groupService = new GroupService()
