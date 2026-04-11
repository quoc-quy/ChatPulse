import { ObjectId } from 'mongodb'
import databaseService from '~/services/database.services'
import socketService from './socket.services'
import messageService from './message.services'

class GroupService {
  async addMembers(conversationId: string, memberIds: string[], inviterId: string) {
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

    // Gửi thông báo có thành viên mới
    const addedUsers = await databaseService.users.find({ _id: { $in: objectMemberIds } }).toArray()
    const addedNames = addedUsers.map((u) => u.userName || 'Thành viên mới').join(', ')

    if (addedNames) {
      await messageService.sendMessage(
        inviterId, 
        conversationId,
        'system',
        `${addedNames} đã được thêm vào nhóm.`
      )
    }

    return result
  }

  async joinGroupViaLink(conversationId: string, userId: string) {
    const conversationObjectId = new ObjectId(conversationId);
    const userObjectId = new ObjectId(userId);

    const conversation = await databaseService.conversations.findOne({ _id: conversationObjectId });

    if (!conversation || conversation.type !== 'group') {
      return null; // Không tìm thấy nhóm
    }

    // Kiểm tra xem đã là thành viên chưa
    const isMember = (conversation.participants || []).some((p: ObjectId) => p.toString() === userId);
    if (isMember) {
      return conversation; // Đã là thành viên, trả về luôn nhóm
    }

    const newMember = {
      userId: userObjectId,
      role: 'member' as const,
      joinedAt: new Date()
    };

    const result = await databaseService.conversations.findOneAndUpdate(
      { _id: conversationObjectId },
      {
        $addToSet: { participants: userObjectId },
        $push: { members: newMember }
      },
      { returnDocument: 'after' }
    );

    // Lấy thông tin user để gửi thông báo hệ thống
    const user = await databaseService.users.findOne({ _id: userObjectId });
    if (user) {
      await messageService.sendMessage(
        userId,
        conversationId,
        'system',
        `${user.userName || 'Một người dùng'} đã tham gia nhóm qua liên kết.`
      );
    }

    return result;
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
    const userObjectId = new ObjectId(userId)

    const conversation = await databaseService.conversations.findOne({ _id: conversationObjectId })
    if (!conversation) return null

    const memberExists = (conversation.members || []).some((m: any) => m.userId?.toString() === userId)

    if (memberExists) {
      await databaseService.conversations.updateOne(
        { _id: conversationObjectId, 'members.userId': userObjectId },
        { $set: { 'members.$.isPinned': isPin } }
      )
    } else {
      await databaseService.conversations.updateOne(
        { _id: conversationObjectId },
        {
          $push: {
            members: {
              userId: userObjectId,
              role: conversation.admin_id?.toString() === userId ? 'admin' : 'member',
              isPinned: isPin
            } as any
          }
        }
      )
    }

    return { isPinned: isPin }
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

    const conversation = await databaseService.conversations.findOne({
      _id: conversationObjectId
    })
    if (!conversation) return null

    const oldAdminId = conversation.admin_id

    const result = await databaseService.conversations.findOneAndUpdate(
      { _id: conversationObjectId },
      { $set: { admin_id: targetMemberObjectId } },
      { returnDocument: 'after' }
    )

    if (oldAdminId) {
      try {
        await databaseService.conversations.updateOne(
          { _id: conversationObjectId, 'members.userId': oldAdminId },
          { $set: { 'members.$.role': 'member' } }
        )
      } catch {}
    }

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

    await databaseService.conversations.updateOne(
      { _id: conversationObjectId },
      {
        $pull: {
          participants: userObjectId,
          members: { userId: userObjectId }
        }
      }
    )

    const isAdmin = conversation.admin_id && conversation.admin_id.toString() === userId

    if (isAdmin) {
      const remainingParticipants = (conversation.participants || []).filter((p: ObjectId) => p.toString() !== userId)

      if (remainingParticipants.length > 0) {
        const nextAdminId = remainingParticipants[0]

        await databaseService.conversations.updateOne(
          { _id: conversationObjectId },
          {
            $set: { admin_id: nextAdminId }
          }
        )
      }
    }

    const updatedConversation = await databaseService.conversations.findOne({
      _id: conversationObjectId
    })

    return updatedConversation
  }

  async muteNotification(conversationId: string, userId: string, mute: boolean) {
    const conversationObjectId = new ObjectId(conversationId)
    const userObjectId = new ObjectId(userId)

    const conversation = await databaseService.conversations.findOne({ _id: conversationObjectId })
    if (!conversation) return null

    const memberExists = (conversation.members || []).some((m: any) => m.userId?.toString() === userId)

    if (memberExists) {
      await databaseService.conversations.updateOne(
        { _id: conversationObjectId, 'members.userId': userObjectId },
        { $set: { 'members.$.hasMuted': mute } }
      )
    } else {
      await databaseService.conversations.updateOne(
        { _id: conversationObjectId },
        {
          $push: {
            members: {
              userId: userObjectId,
              role: conversation.admin_id?.toString() === userId ? 'admin' : 'member',
              hasMuted: mute
            } as any
          }
        }
      )
    }

    return { muted: mute }
  }

  // ── Lấy ảnh/video/file đã gửi ────────────────────────────────────────────────
  async getMediaFiles(conversationId: string, userId: string, page: number = 1, limit: number = 20) {
    const conversationObjectId = new ObjectId(conversationId)
    const userObjectId = new ObjectId(userId)

    const conversation = await databaseService.conversations.findOne({ _id: conversationObjectId })
    if (!conversation) return []
    const isMember = (conversation.participants || []).some((p: ObjectId) => p.toString() === userId)
    if (!isMember) return []

    const skip = (page - 1) * limit

    return databaseService.messages
      .aggregate([
        {
          $match: {
            conversationId: conversationObjectId,
            // ĐÃ FIX: Thêm 'media' vào type để tìm cả hình ảnh & video mới
            type: { $in: ['media', 'image', 'video', 'file'] },
            deletedByUsers: { $ne: userObjectId }
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
            as: 'sender_info'
          }
        },
        { $unwind: { path: '$sender_info', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            type: 1,
            content: 1,
            fileUrl: 1,
            fileName: 1,
            fileSize: 1,
            createdAt: 1,
            sender: {
              _id: '$sender_info._id',
              userName: '$sender_info.userName',
              avatar: '$sender_info.avatar'
            }
          }
        }
      ])
      .toArray()
  }

  // ── Lấy link đã chia sẻ ──────────────────────────────────────────────────────
  async getSharedLinks(conversationId: string, userId: string, page: number = 1, limit: number = 20) {
    const conversationObjectId = new ObjectId(conversationId)
    const userObjectId = new ObjectId(userId)

    const conversation = await databaseService.conversations.findOne({ _id: conversationObjectId })
    if (!conversation) return []
    const isMember = (conversation.participants || []).some((p: ObjectId) => p.toString() === userId)
    if (!isMember) return []

    const skip = (page - 1) * limit

    const urlRegex = /https?:\/\/[^\s]+/

    return databaseService.messages
      .aggregate([
        {
          $match: {
            conversationId: conversationObjectId,
            type: 'text',
            content: { $regex: urlRegex },
            deletedByUsers: { $ne: userObjectId }
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
            as: 'sender_info'
          }
        },
        { $unwind: { path: '$sender_info', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            content: 1,
            createdAt: 1,
            sender: {
              _id: '$sender_info._id',
              userName: '$sender_info.userName',
              avatar: '$sender_info.avatar'
            }
          }
        }
      ])
      .toArray()
  }

  async renameGroup(conversationId: string, userId: string, newName: string) {
    const conversationObjectId = new ObjectId(conversationId)
    const userObjectId = new ObjectId(userId)

    const updatedConversation = await databaseService.conversations.findOneAndUpdate(
      { _id: conversationObjectId },
      { $set: { name: newName, updated_at: new Date() } },
      { returnDocument: 'after' }
    )

    if (!updatedConversation) throw new Error('Không tìm thấy cuộc hội thoại')

    const user = await databaseService.users.findOne({ _id: userObjectId })
    const userName = user?.userName || 'Một thành viên'

    const systemMessageId = new ObjectId()
    const systemMessage = {
      _id: systemMessageId,
      conversationId: conversationObjectId,
      senderId: userObjectId,
      type: 'system',
      content: `${userName} đã đổi tên nhóm thành "${newName}"`,
      reactions: [],
      deletedByUsers: [],
      status: 'SENT',
      deliveredTo: [],
      seenBy: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await databaseService.messages.insertOne(systemMessage as any)

    await databaseService.conversations.updateOne(
      { _id: conversationObjectId },
      { $set: { last_message_id: systemMessageId } }
    )

    const populatedMessage = {
      ...systemMessage,
      sender: {
        _id: user?._id?.toString(),
        userName: userName,
        avatar: user?.avatar
      }
    }

    const targetUserIds = new Set<string>()

    if (updatedConversation.participants) {
      updatedConversation.participants.forEach((p: ObjectId) => targetUserIds.add(p.toString()))
    }
    if (updatedConversation.members) {
      updatedConversation.members.forEach((m: any) => {
        const mId = m.userId?.toString() || m.user_id?.toString()
        if (mId) targetUserIds.add(mId)
      })
    }

    targetUserIds.forEach((id) => {
      socketService.emitToUser(id, 'receive_message', populatedMessage)
      socketService.emitToUser(id, 'conversation_updated', { conversationId, name: newName })
    })

    return updatedConversation
  }
  // ── Kiểm tra user có là thành viên nhóm không ────────────────────────────────
  async isGroupMember(conversationId: string, userId: string): Promise<boolean> {
    const conversation = await databaseService.conversations.findOne({
      _id: new ObjectId(conversationId)
    })
    if (!conversation) return false
    return (conversation.participants || []).some(
      (p: ObjectId) => p.toString() === userId
    )
  }
 
  // ── Cập nhật avatar nhóm (tất cả thành viên đều được phép) ──────────────────
  async updateGroupAvatar(conversationId: string, userId: string, avatarUrl: string) {
    const conversationObjectId = new ObjectId(conversationId)
    const userObjectId = new ObjectId(userId)
 
    const updatedConversation = await databaseService.conversations.findOneAndUpdate(
      { _id: conversationObjectId },
      { $set: { avatarUrl, updated_at: new Date() } },
      { returnDocument: 'after' }
    )
 
    if (!updatedConversation) throw new Error('Không tìm thấy cuộc hội thoại')
 
    const user = await databaseService.users.findOne({ _id: userObjectId })
    const userName = user?.userName || 'Một thành viên'
 
    const systemMessageId = new ObjectId()
    const systemMessage = {
      _id: systemMessageId,
      conversationId: conversationObjectId,
      senderId: userObjectId,
      type: 'system',
      content: `${userName} đã thay đổi ảnh nhóm`,
      reactions: [],
      deletedByUsers: [],
      status: 'SENT',
      deliveredTo: [],
      seenBy: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }
 
    await databaseService.messages.insertOne(systemMessage as any)
 
    await databaseService.conversations.updateOne(
      { _id: conversationObjectId },
      { $set: { last_message_id: systemMessageId } }
    )
 
    const targetUserIds = new Set<string>()
    if (updatedConversation.participants) {
      updatedConversation.participants.forEach((p: ObjectId) => targetUserIds.add(p.toString()))
    }
 
    const populatedMessage = {
      ...systemMessage,
      sender: {
        _id: user?._id?.toString(),
        userName,
        avatar: user?.avatar
      }
    }
 
    targetUserIds.forEach((id) => {
      socketService.emitToUser(id, 'receive_message', populatedMessage)
      socketService.emitToUser(id, 'conversation_updated', { conversationId, avatarUrl })
    })
 
    return updatedConversation
  }
}


export const groupService = new GroupService()