import { ObjectId } from 'mongodb'
import databaseService from '~/services/database.services'
import socketService from './socket.services'

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
  // ── Tắt/bật thông báo ────────────────────────────────────────────────────────
  async muteNotification(conversationId: string, userId: string, mute: boolean) {
    const conversationObjectId = new ObjectId(conversationId)
    const userObjectId = new ObjectId(userId)

    // Kiểm tra member đã tồn tại trong mảng members chưa
    const conversation = await databaseService.conversations.findOne({ _id: conversationObjectId })
    if (!conversation) return null

    const memberExists = (conversation.members || []).some((m: any) => m.userId?.toString() === userId)

    if (memberExists) {
      await databaseService.conversations.updateOne(
        { _id: conversationObjectId, 'members.userId': userObjectId },
        { $set: { 'members.$.hasMuted': mute } }
      )
    } else {
      // Fallback: push member mới nếu chưa tồn tại (data cũ)
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

    // Kiểm tra quyền truy cập
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
            type: { $in: ['image', 'video', 'file'] },
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

    // Regex tìm URL trong nội dung tin nhắn text
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

    // 1. Cập nhật tên nhóm trong Database
    const updatedConversation = await databaseService.conversations.findOneAndUpdate(
      { _id: conversationObjectId },
      { $set: { name: newName, updated_at: new Date() } },
      { returnDocument: 'after' }
    )

    if (!updatedConversation) throw new Error('Không tìm thấy cuộc hội thoại')

    // 2. Lấy thông tin user để tạo câu thông báo
    const user = await databaseService.users.findOne({ _id: userObjectId })
    const userName = user?.userName || 'Một thành viên'

    // 3. Tạo tin nhắn hệ thống (System Message)
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

    // Cập nhật last_message_id cho hội thoại
    await databaseService.conversations.updateOne(
      { _id: conversationObjectId },
      { $set: { last_message_id: systemMessageId } }
    )

    // 4. Bắn Socket cho mọi người
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
      // Gửi tin nhắn hệ thống
      socketService.emitToUser(id, 'receive_message', populatedMessage)
      // Gửi lệnh cập nhật tên UI
      socketService.emitToUser(id, 'conversation_updated', { conversationId, name: newName })
    })

    return updatedConversation
  }
}

export const groupService = new GroupService()
