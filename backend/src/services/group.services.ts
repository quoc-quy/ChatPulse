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

    return databaseService.conversations.updateOne(
      { _id: conversationObjectId },
      {
        $addToSet: { participants: { $each: objectMemberIds } },
        $push: { members: { $each: newMembers } }
      }
    )
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
    const userObjectId = new ObjectId(userId)
    const conversationObjectId = new ObjectId(conversationId)

    return databaseService.users.updateOne(
      { _id: userObjectId },
      isPin
        ? { $addToSet: { pinned_conversations: conversationObjectId } }
        : { $pull: { pinned_conversations: conversationObjectId } }
    )
  }

  async kickMember(conversationId: string, memberId: string) {
    const conversationObjectId = new ObjectId(conversationId)
    const memberObjectId = new ObjectId(memberId)

    return databaseService.conversations.updateOne(
      { _id: conversationObjectId },
      {
        $pull: {
          members: { userId: memberObjectId },
          participants: memberObjectId
        }
      }
    )
  }

  async promoteToAdmin(conversationId: string, userId: string) {
    return databaseService.conversations.updateOne(
      {
        _id: new ObjectId(conversationId),
        'members.userId': new ObjectId(userId)
      },
      {
        $set: { 'members.$.role': 'admin' }
      }
    )
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

    // Xóa user khỏi nhóm
    await databaseService.conversations.updateOne(
      { _id: conversationObjectId },
      {
        $pull: {
          members: { userId: userObjectId },
          participants: userObjectId
        }
      }
    )

    // Nếu admin rời đi → tìm member khác để thăng cấp
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

    return true
  }
}

export const groupService = new GroupService()