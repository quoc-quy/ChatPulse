// src/services/friend.services.ts
import { ObjectId } from 'mongodb'
import databaseService from './database.services'
import FriendRequest from '~/models/schemas/friendRequest.schema'
import Friend from '~/models/schemas/friend.schema' // Import schema mới cho KAN-42
import { FriendStatus } from '~/constants/friendStatus'
import { ErrorWithStatus } from '~/models/errors'
import httpStatus from '~/constants/httpStatus'

class FriendService {
  /**
   * Gửi lời mời kết bạn
   */
  async createFriendRequest(sender_id: string, receiver_id: string) {
    const isFriend = await databaseService.friends.findOne({
      user_id: new ObjectId(sender_id),
      friend_id: new ObjectId(receiver_id)
    })

    if (isFriend) {
      throw new ErrorWithStatus({
        message: 'Hai người đã là bạn bè',
        status: httpStatus.BAD_REQUEST // 400 theo DoD
      })
    }
    // 1. Kiểm tra xem bạn đã gửi lời mời cho người này chưa (hoặc đã là bạn bè chưa)
    const existedRequest = await databaseService.friendRequests.findOne({
      sender_id: new ObjectId(sender_id),
      receiver_id: new ObjectId(receiver_id)
    })

    if (existedRequest) {
      throw new ErrorWithStatus({
        message: 'Lời mời kết bạn đã tồn tại hoặc bạn đã là bạn bè với người này',
        status: httpStatus.UNPROCESSABLE_ENTITY
      })
    }

    // 2. Kiểm tra ngược lại: Nếu đối phương đã gửi lời mời cho bạn rồi, yêu cầu người dùng kiểm tra danh sách lời mời
    const reverseRequest = await databaseService.friendRequests.findOne({
      sender_id: new ObjectId(receiver_id),
      receiver_id: new ObjectId(sender_id)
    })

    if (reverseRequest) {
      throw new ErrorWithStatus({
        message: 'Người này đã gửi lời mời kết bạn cho bạn trước đó, vui lòng kiểm tra danh sách lời mời',
        status: httpStatus.UNPROCESSABLE_ENTITY
      })
    }

    // 3. Tiến hành gửi lời mời
    await databaseService.friendRequests.insertOne(
      new FriendRequest({
        sender_id: new ObjectId(sender_id),
        receiver_id: new ObjectId(receiver_id),
        status: FriendStatus.Pending
      })
    )

    return { message: 'Gửi lời mời kết bạn thành công' }
  }

  /**
   * Chấp nhận kết bạn (Cập nhật cho KAN-42: Tách bảng bạn bè riêng)
   */
  async acceptFriendRequest(user_id: string, sender_id: string) {
    // 1. Tìm lời mời và kiểm tra Security Check:
    const friendRequest = await databaseService.friendRequests.findOne({
      sender_id: new ObjectId(sender_id),
      receiver_id: new ObjectId(user_id),
      status: FriendStatus.Pending
    })

    // Nếu không tìm thấy hoặc người đang đăng nhập không phải receiver_id
    if (!friendRequest) {
      throw new ErrorWithStatus({
        message: 'Lời mời kết bạn không tồn tại hoặc bạn không có quyền chấp nhận lời mời này',
        status: httpStatus.NOT_FOUND // Security: Tránh User C chấp nhận lời mời của người khác
      })
    }

    // 2. Atomic Update: Thực hiện cập nhật trạng thái và tạo quan hệ bạn bè
    await Promise.all([
      // Cập nhật trạng thái lời mời thành Accepted
      databaseService.friendRequests.updateOne(
        { _id: friendRequest._id },
        {
          $set: {
            status: FriendStatus.Accepted,
            updated_at: new Date()
          }
        }
      ),
      // Tạo quan hệ 2 chiều trong bảng friends
      databaseService.friends.insertMany([
        new Friend({ user_id: new ObjectId(user_id), friend_id: new ObjectId(sender_id) }),
        new Friend({ user_id: new ObjectId(sender_id), friend_id: new ObjectId(user_id) })
      ])
    ])

    return { message: 'Đã trở thành bạn bè' }
  }

  /**
   * Lấy danh sách bạn bè chính thức (Truy vấn từ collection friends)
   */
  async getFriendList(user_id: string) {
    return await databaseService.friends
      .aggregate([
        { $match: { user_id: new ObjectId(user_id) } }, // Tìm tất cả quan hệ của người dùng này
        {
          $lookup: {
            from: 'users',
            localField: 'friend_id',
            foreignField: '_id',
            as: 'friend_info'
          }
        },
        { $unwind: '$friend_info' },
        {
          $project: {
            _id: '$friend_info._id',
            userName: '$friend_info.userName',
            avatar: '$friend_info.avatar',
            email: '$friend_info.email'
          }
        }
      ])
      .toArray()
  }

  /**
   * Lấy danh sách lời mời kết bạn đang chờ xử lý
   */
  async getReceivedFriendRequests(user_id: string) {
    return await databaseService.friendRequests
      .aggregate([
        {
          $match: {
            receiver_id: new ObjectId(user_id),
            status: FriendStatus.Pending
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'sender_id',
            foreignField: '_id',
            as: 'sender_info'
          }
        },
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

  /**
   * Hủy kết bạn (Xóa dữ liệu ở cả 2 bảng friends và friend_requests)
   */
  async unfriend(user_id: string, friend_id: string) {
    await Promise.all([
      // Xóa quan hệ 2 chiều trong bảng friends
      databaseService.friends.deleteMany({
        $or: [
          { user_id: new ObjectId(user_id), friend_id: new ObjectId(friend_id) },
          { user_id: new ObjectId(friend_id), friend_id: new ObjectId(user_id) }
        ]
      }),
      // Xóa trong bảng friend_requests để có thể gửi lại lời mời từ đầu sau này
      databaseService.friendRequests.deleteOne({
        $or: [
          { sender_id: new ObjectId(user_id), receiver_id: new ObjectId(friend_id) },
          { sender_id: new ObjectId(friend_id), receiver_id: new ObjectId(user_id) }
        ]
      })
    ])
    return { message: 'Đã hủy kết bạn thành công' }
  }
  // 1. Từ chối lời mời (Dành cho người nhận)
  async declineFriendRequest(user_id: string, request_id: string) {
    const result = await databaseService.friendRequests.deleteOne({
      _id: new ObjectId(request_id),
      receiver_id: new ObjectId(user_id), // Chỉ người nhận mới có quyền từ chối
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
  // 2. Hủy lời mời đã gửi (Dành cho người gửi)
  async cancelFriendRequest(user_id: string, request_id: string) {
    const result = await databaseService.friendRequests.deleteOne({
      _id: new ObjectId(request_id),
      sender_id: new ObjectId(user_id), // Chỉ người gửi mới có quyền hủy
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
}

export const friendService = new FriendService()
