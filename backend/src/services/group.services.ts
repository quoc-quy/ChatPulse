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
      await messageService.sendMessage(inviterId, conversationId, 'system', `${addedNames} đã được thêm vào nhóm.`)
    }

    return result
  }

  async joinGroupViaLink(conversationId: string, userId: string) {
    const conversationObjectId = new ObjectId(conversationId)
    const userObjectId = new ObjectId(userId)

    const conversation = await databaseService.conversations.findOne({ _id: conversationObjectId })

    if (!conversation || conversation.type !== 'group') {
      return null // Không tìm thấy nhóm
    }

    // Kiểm tra xem đã là thành viên chưa
    const isMember = (conversation.participants || []).some((p: ObjectId) => p.toString() === userId)
    if (isMember) {
      return conversation // Đã là thành viên, trả về luôn nhóm
    }

    const newMember = {
      userId: userObjectId,
      role: 'member' as const,
      joinedAt: new Date()
    }

    const result = await databaseService.conversations.findOneAndUpdate(
      { _id: conversationObjectId },
      {
        $addToSet: { participants: userObjectId },
        $push: { members: newMember }
      },
      { returnDocument: 'after' }
    )

    // Lấy thông tin user để gửi thông báo hệ thống
    const user = await databaseService.users.findOne({ _id: userObjectId })
    if (user) {
      await messageService.sendMessage(
        userId,
        conversationId,
        'system',
        `${user.userName || 'Một người dùng'} đã tham gia nhóm qua liên kết.`
      )
    }

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

    const user = await databaseService.users.findOne({ _id: userObjectId })
    const userName = user?.userName || 'Một thành viên'

    // Tính số thành viên còn lại TRƯỚC khi pull (không tính chính người rời)
    const remainingParticipants = (conversation.participants || []).filter((p: ObjectId) => p.toString() !== userId)

    // Nếu không còn ai -> xóa hẳn nhóm + toàn bộ tin nhắn
    if (remainingParticipants.length === 0) {
      await databaseService.messages.deleteMany({ conversationId: conversationObjectId })
      await databaseService.conversations.deleteOne({ _id: conversationObjectId })
      return { deleted: true, conversationId }
    }

    // Còn ít nhất 1 người -> pull người rời ra
    await databaseService.conversations.updateOne(
      { _id: conversationObjectId },
      {
        $pull: {
          participants: userObjectId,
          members: { userId: userObjectId }
        }
      }
    )

    // Nếu người rời là admin -> tự động chuyển quyền cho người đầu tiên còn lại
    const isAdmin = conversation.admin_id && conversation.admin_id.toString() === userId
    if (isAdmin) {
      await databaseService.conversations.updateOne(
        { _id: conversationObjectId },
        { $set: { admin_id: remainingParticipants[0] } }
      )
    }

    // ✅ Gửi system message "X đã rời khỏi nhóm"
    const systemMessageId = new ObjectId()
    const systemMessage = {
      _id: systemMessageId,
      conversationId: conversationObjectId,
      senderId: userObjectId,
      type: 'system',
      content: `${userName} đã rời khỏi nhóm`,
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
      { $set: { last_message_id: systemMessageId, updated_at: new Date() } }
    )

    // Emit socket cho các thành viên còn lại
    const updatedConversation = await databaseService.conversations.findOne({ _id: conversationObjectId })

    const populatedMessage = {
      ...systemMessage,
      sender: { _id: user?._id?.toString(), userName, avatar: user?.avatar }
    }
    ;(updatedConversation?.participants || []).forEach((p: ObjectId) => {
      socketService.emitToUser(p.toString(), 'receive_message', populatedMessage)
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
    return (conversation.participants || []).some((p: ObjectId) => p.toString() === userId)
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
  async createGroup(creatorId: string, memberIds: string[], groupName: string, avatarUrl?: string) {
    const creatorObjectId = new ObjectId(creatorId)

    // Lọc trùng và loại bỏ chính creator nếu có trong list
    const uniqueMemberIds = [...new Set(memberIds.filter((id) => id !== creatorId))]
    const memberObjectIds = uniqueMemberIds.map((id) => new ObjectId(id))

    // Tất cả participants = creator + members
    const allParticipants = [creatorObjectId, ...memberObjectIds]

    const members = [
      { userId: creatorObjectId, role: 'admin' as const, joinedAt: new Date() },
      ...memberObjectIds.map((id) => ({
        userId: id,
        role: 'member' as const,
        joinedAt: new Date()
      }))
    ]

    const newConversation = {
      _id: new ObjectId(),
      name: groupName.trim(),
      type: 'group' as const,
      admin_id: creatorObjectId,
      participants: allParticipants,
      members,
      avatarUrl: avatarUrl || null,
      created_at: new Date(),
      updated_at: new Date(),
      last_message_id: null
    }

    await databaseService.conversations.insertOne(newConversation as any)

    // Gửi system message chào mừng
    const creator = await databaseService.users.findOne({ _id: creatorObjectId })
    const creatorName = creator?.userName || 'Admin'

    const systemMessageId = new ObjectId()
    const systemMessage = {
      _id: systemMessageId,
      conversationId: newConversation._id,
      senderId: creatorObjectId,
      type: 'system',
      content: `${creatorName} đã tạo nhóm "${groupName.trim()}"`,
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
      { _id: newConversation._id },
      { $set: { last_message_id: systemMessageId } }
    )

    // Emit socket cho tất cả thành viên
    const populatedMessage = {
      ...systemMessage,
      sender: {
        _id: creator?._id?.toString(),
        userName: creatorName,
        avatar: creator?.avatar
      }
    }

    allParticipants.forEach((p) => {
      socketService.emitToUser(p.toString(), 'new_conversation', {
        ...newConversation,
        _id: newConversation._id.toString()
      })
      socketService.emitToUser(p.toString(), 'receive_message', populatedMessage)
    })

    return newConversation
  }
  async disbandGroup(conversationId: string, userId: string) {
    const conversationObjectId = new ObjectId(conversationId)

    const conversation = await databaseService.conversations.findOne({
      _id: conversationObjectId
    })
    if (!conversation) return null
    if (!conversation.admin_id || conversation.admin_id.toString() !== userId) {
      throw new Error('FORBIDDEN')
    }

    const user = await databaseService.users.findOne({ _id: new ObjectId(userId) })
    const userName = user?.userName || 'Nhóm trưởng'
    const disbandContent = `${userName} đã giải tán nhóm`

    // ✅ Chỉ đánh dấu is_disbanded, KHÔNG xóa conversation hay messages
    const systemMessageId = new ObjectId()
    const systemMessage = {
      _id: systemMessageId,
      conversationId: conversationObjectId,
      senderId: new ObjectId(userId),
      type: 'system',
      content: disbandContent,
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
      {
        $set: {
          is_disbanded: true,
          disbanded_at: new Date(),
          disbanded_by: new ObjectId(userId),
          last_message_id: systemMessageId,
          updated_at: new Date()
        }
      }
    )

    const participantIds = (conversation.participants || []).map((p: ObjectId) => p.toString())

    const populatedMessage = {
      ...systemMessage,
      sender: { _id: user?._id?.toString(), userName, avatar: user?.avatar }
    }

    // Emit socket cho tất cả thành viên
    participantIds.forEach((id: string) => {
      socketService.emitToUser(id, 'receive_message', populatedMessage)
      socketService.emitToUser(id, 'group_disbanded', {
        conversationId,
        message: disbandContent
      })
    })

    return { conversationId, disbandedBy: userId, message: disbandContent }
  }
}

export const groupService = new GroupService()
