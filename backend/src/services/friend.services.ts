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
    // 1. Cập nhật trạng thái lời mời thành Accepted trong bảng friend_requests
    const result = await databaseService.friendRequests.findOneAndUpdate(
      {
        sender_id: new ObjectId(sender_id),
        receiver_id: new ObjectId(user_id),
        status: FriendStatus.Pending
      },
      {
        $set: {
          status: FriendStatus.Accepted,
          updated_at: new Date()
        }
      },
      { returnDocument: 'after' }
    )

    if (!result) {
      throw new ErrorWithStatus({
        message: 'Lời mời kết bạn không tồn tại hoặc đã được xử lý trước đó',
        status: httpStatus.NOT_FOUND
      })
    }

    // 2. KAN-42: Tạo quan hệ bạn bè 2 chiều trong collection friends riêng biệt
    await databaseService.friends.insertMany([
      new Friend({ user_id: new ObjectId(user_id), friend_id: new ObjectId(sender_id) }),
      new Friend({ user_id: new ObjectId(sender_id), friend_id: new ObjectId(user_id) })
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
}

export const friendService = new FriendService()
