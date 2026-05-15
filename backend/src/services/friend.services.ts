import { ObjectId } from 'mongodb'
import databaseService from './database.services'
import FriendRequest from '~/models/schemas/friendRequest.schema'
import Friend from '~/models/schemas/friend.schema'
import UserBlocks from '~/models/schemas/userBlocks.schema'
import { FriendStatus } from '~/constants/friendStatus'
import { ErrorWithStatus } from '~/models/errors'
import httpStatus from '~/constants/httpStatus'
import messageService from './message.services'
import socketService from './socket.services'

class FriendService {
  async createFriendRequest(sender_id: string, receiver_id: string) {
    const isFriend = await databaseService.friends.findOne({
      user_id: new ObjectId(sender_id),
      friend_id: new ObjectId(receiver_id)
    })
    if (isFriend) {
      throw new ErrorWithStatus({ message: 'Hai người đã là bạn bè', status: httpStatus.BAD_REQUEST })
    }
    const existedRequest = await databaseService.friendRequests.findOne({
      sender_id: new ObjectId(sender_id),
      receiver_id: new ObjectId(receiver_id)
    })
    if (existedRequest) {
      throw new ErrorWithStatus({
        message: 'Lời mời kết bạn đã tồn tại hoặc bạn đã là bạn bè với người này',
        status: httpStatus.CONFLICT
      })
    }
    const reverseRequest = await databaseService.friendRequests.findOne({
      sender_id: new ObjectId(receiver_id),
      receiver_id: new ObjectId(sender_id)
    })
    if (reverseRequest) {
      throw new ErrorWithStatus({
        message: 'Người này đã gửi lời mời kết bạn cho bạn trước đó, vui lòng kiểm tra danh sách lời mời',
        status: httpStatus.CONFLICT
      })
    }
    await databaseService.friendRequests.insertOne(
      new FriendRequest({
        sender_id: new ObjectId(sender_id),
        receiver_id: new ObjectId(receiver_id),
        status: FriendStatus.Pending
      })
    )
    return { message: 'Gửi lời mời kết bạn thành công' }
  }

  async acceptFriendRequest(user_id: string, request_id: string) {
    const friendRequest = await databaseService.friendRequests.findOne({
      _id: new ObjectId(request_id),
      receiver_id: new ObjectId(user_id),
      status: FriendStatus.Pending
    })

    if (!friendRequest) {
      throw new ErrorWithStatus({
        message: 'Lời mời kết bạn không tồn tại hoặc bạn không có quyền...',
        status: httpStatus.NOT_FOUND
      })
    }

    const { sender_id } = friendRequest

    // 1. Cập nhật trạng thái và thêm vào bảng friends
    await Promise.all([
      databaseService.friendRequests.updateOne(
        { _id: friendRequest._id },
        { $set: { status: FriendStatus.Accepted, updated_at: new Date() } }
      ),
      databaseService.friends.insertMany([
        new Friend({ user_id: new ObjectId(user_id), friend_id: new ObjectId(sender_id) }),
        new Friend({ user_id: new ObjectId(sender_id), friend_id: new ObjectId(user_id) })
      ])
    ])

    const userObjId = new ObjectId(user_id)
    const senderObjId = new ObjectId(sender_id)

    // 2. Tìm cuộc hội thoại 1-1 cũ
    let conversation = await databaseService.conversations.findOne({
      type: 'direct',
      participants: { $all: [userObjId, senderObjId] }
    })

    // 3. Xử lý tạo mới hoặc khôi phục hội thoại
    if (!conversation) {
      // Trường hợp 1: TẠO MỚI (chưa từng chat)
      const newConv = {
        type: 'direct',
        participants: [userObjId, senderObjId],
        members: [
          { userId: userObjId, role: 'member', joinedAt: new Date() },
          { userId: senderObjId, role: 'member', joinedAt: new Date() }
        ],
        created_at: new Date(),
        updated_at: new Date()
      }
      const insertResult = await databaseService.conversations.insertOne(newConv as any)
      conversation = { _id: insertResult.insertedId, ...newConv } as any
    } else {
      // Trường hợp 2: KHÔI PHỤC HỘI THOẠI CŨ
      // Xóa cả 2 user khỏi mảng deletedByUsers để hội thoại hiển thị lại trong danh sách
      await databaseService.conversations.updateOne(
        { _id: conversation._id },
        {
          $pull: { deletedByUsers: { $in: [userObjId, senderObjId] } } as any,
          $set: { updated_at: new Date() } // Đẩy hội thoại lên đầu danh sách
        }
      )

      const payload = {
        conversationId: conversation._id.toString(),
        friendId1: user_id.toString(),
        friendId2: sender_id.toString()
      }

      // Bắn socket báo cho Frontend mở khóa UI ChatFooter & gỡ mờ SidebarPanel2
      socketService.emitToUser(user_id.toString(), 'friend_added', payload)
      socketService.emitToUser(sender_id.toString(), 'friend_added', payload)

      // Bắn socket 'new_conversation' để người đã xóa lịch sử tự động lấy lại box chat
      socketService.emitToUser(user_id.toString(), 'new_conversation', {
        ...conversation,
        _id: conversation._id.toString()
      })
      socketService.emitToUser(sender_id.toString(), 'new_conversation', {
        ...conversation,
        _id: conversation._id.toString()
      })
    }

    // 4. Gửi tin nhắn chào mừng hệ thống
    // messageService sẽ tự động cập nhật last_message_id và bắn Socket 'receive_message'
    await messageService.sendMessage(
      user_id,
      conversation!._id.toString(),
      'system',
      conversation
        ? 'Hai bạn đã trở thành bạn bè trở lại. Hãy gửi lời chào cho nhau nhé!'
        : 'Hai bạn đã trở thành bạn bè. Hãy gửi lời chào cho nhau nhé!'
    )
    return { message: 'Đã trở thành bạn bè' }
  }

  async getFriendList(user_id: string) {
    return await databaseService.friends
      .aggregate([
        { $match: { user_id: new ObjectId(user_id) } },
        { $lookup: { from: 'users', localField: 'friend_id', foreignField: '_id', as: 'friend_info' } },
        { $unwind: '$friend_info' },
        {
          $project: {
            _id: '$friend_info._id',
            userName: '$friend_info.userName',
            avatar: '$friend_info.avatar',
            email: '$friend_info.email',
            date_of_birth: '$friend_info.date_of_birth',
            bio: '$friend_info.bio',
            phone: '$friend_info.phone',
            gender: '$friend_info.gender',
            public_key: '$friend_info.public_key'
          }
        }
      ])
      .toArray()
  }

  async getReceivedFriendRequests(user_id: string) {
    return await databaseService.friendRequests
      .aggregate([
        { $match: { receiver_id: new ObjectId(user_id), status: FriendStatus.Pending } },
        { $lookup: { from: 'users', localField: 'sender_id', foreignField: '_id', as: 'sender_info' } },
        { $unwind: '$sender_info' },
        {
          $project: {
            _id: 1,
            sender_id: 1,
            created_at: 1,
            sender_info: {
              userName: '$sender_info.userName',
              avatar: '$sender_info.avatar',
              email: '$sender_info.email'
            }
          }
        }
      ])
      .toArray()
  }

  async unfriend(user_id: string, friend_id: string) {
    const [friendsDeleted] = await Promise.all([
      databaseService.friends.deleteMany({
        $or: [
          { user_id: new ObjectId(user_id), friend_id: new ObjectId(friend_id) },
          { user_id: new ObjectId(friend_id), friend_id: new ObjectId(user_id) }
        ]
      }),
      databaseService.friendRequests.deleteOne({
        $or: [
          { sender_id: new ObjectId(user_id), receiver_id: new ObjectId(friend_id) },
          { sender_id: new ObjectId(friend_id), receiver_id: new ObjectId(user_id) }
        ]
      })
    ])

    // Tìm đoạn chat direct chung giữa 2 người
    const conversation = await databaseService.conversations.findOne({
      type: 'direct',
      participants: { $all: [new ObjectId(user_id), new ObjectId(friend_id)] }
    })

    if (conversation) {
      // Bắn sự kiện realtime cho CẢ HAI ĐỂ UI KHÓA CHAT NGAY LẬP TỨC
      const payload = {
        conversationId: conversation._id.toString(),
        unfrienderId: user_id.toString()
      }
      socketService.emitToUser(friend_id.toString(), 'unfriended', payload)
      socketService.emitToUser(user_id.toString(), 'unfriended', payload)
    }

    if (friendsDeleted.deletedCount === 0) {
      throw new ErrorWithStatus({
        message: 'Hai người hiện không phải là bạn bè hoặc đã hủy kết bạn trước đó',
        status: httpStatus.NOT_FOUND
      })
    }
    return { message: 'Đã hủy kết bạn thành công' }
  }

  async declineFriendRequest(user_id: string, request_id: string) {
    const result = await databaseService.friendRequests.deleteOne({
      _id: new ObjectId(request_id),
      receiver_id: new ObjectId(user_id),
      status: FriendStatus.Pending
    })
    if (result.deletedCount === 0) {
      throw new ErrorWithStatus({
        message: 'Lời mời không tồn tại hoặc bạn không có quyền từ chối',
        status: httpStatus.NOT_FOUND
      })
    }
    return { message: 'Đã từ chối lời mời kết bạn' }
  }

  async cancelFriendRequest(user_id: string, request_id: string) {
    const result = await databaseService.friendRequests.deleteOne({
      _id: new ObjectId(request_id),
      sender_id: new ObjectId(user_id),
      status: FriendStatus.Pending
    })
    if (result.deletedCount === 0) {
      throw new ErrorWithStatus({
        message: 'Lời mời không tồn tại hoặc bạn không có quyền hủy',
        status: httpStatus.NOT_FOUND
      })
    }
    return { message: 'Đã hủy lời mời kết bạn' }
  }

  async getSentFriendRequests(user_id: string) {
    return await databaseService.friendRequests
      .aggregate([
        { $match: { sender_id: new ObjectId(user_id), status: FriendStatus.Pending } },
        { $lookup: { from: 'users', localField: 'receiver_id', foreignField: '_id', as: 'receiver_info' } },
        { $unwind: '$receiver_info' },
        {
          $project: {
            _id: 1,
            receiver_id: 1,
            created_at: 1,
            receiver_info: {
              userName: '$receiver_info.userName',
              avatar: '$receiver_info.avatar',
              email: '$receiver_info.email'
            }
          }
        }
      ])
      .toArray()
  }

  // ── Block / Unblock ─────────────────────────────────────────────────────────

  async blockUser(user_id: string, blocked_id: string) {
    const userObjectId = new ObjectId(user_id)
    const blockedObjectId = new ObjectId(blocked_id)

    if (user_id === blocked_id) {
      throw new ErrorWithStatus({ message: 'Không thể tự chặn chính mình', status: httpStatus.BAD_REQUEST })
    }

    const alreadyBlocked = await databaseService.user_blocks.findOne({
      user_id: userObjectId,
      blocked_user_id: blockedObjectId
    })
    if (alreadyBlocked) {
      throw new ErrorWithStatus({ message: 'Bạn đã chặn người dùng này rồi', status: httpStatus.BAD_REQUEST })
    }

    await Promise.all([
      databaseService.user_blocks.insertOne(
        new UserBlocks({ user_id: userObjectId, blocked_user_id: blockedObjectId })
      ),
      databaseService.friends.deleteMany({
        $or: [
          { user_id: userObjectId, friend_id: blockedObjectId },
          { user_id: blockedObjectId, friend_id: userObjectId }
        ]
      }),
      databaseService.friendRequests.deleteMany({
        $or: [
          { sender_id: userObjectId, receiver_id: blockedObjectId },
          { sender_id: blockedObjectId, receiver_id: userObjectId }
        ]
      })
    ])

    return { message: 'Đã chặn người dùng thành công' }
  }

  async unblockUser(user_id: string, blocked_id: string) {
    const result = await databaseService.user_blocks.deleteOne({
      user_id: new ObjectId(user_id),
      blocked_user_id: new ObjectId(blocked_id)
    })
    if (result.deletedCount === 0) {
      throw new ErrorWithStatus({ message: 'Bạn chưa chặn người dùng này', status: httpStatus.NOT_FOUND })
    }
    return { message: 'Đã bỏ chặn người dùng thành công' }
  }

  async getBlockedUsers(user_id: string) {
    return await databaseService.user_blocks
      .aggregate([
        { $match: { user_id: new ObjectId(user_id) } },
        { $lookup: { from: 'users', localField: 'blocked_user_id', foreignField: '_id', as: 'blocked_info' } },
        { $unwind: '$blocked_info' },
        {
          $project: {
            _id: '$blocked_info._id',
            userName: '$blocked_info.userName',
            fullName: '$blocked_info.fullName',
            phone: '$blocked_info.phone',
            avatar: '$blocked_info.avatar',
            blocked_at: '$created_at'
          }
        },
        { $sort: { blocked_at: -1 } }
      ])
      .toArray()
  }
}

export const friendService = new FriendService()
