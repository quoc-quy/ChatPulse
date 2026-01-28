// src/services/friend.services.ts
import { ObjectId } from 'mongodb'
import databaseService from './database.services'
import FriendRequest from '~/models/schemas/friendRequest.schema'
import { FriendStatus } from '~/constants/friendStatus'
import { ErrorWithStatus } from '~/models/errors'
import httpStatus from '~/constants/httpStatus'

class FriendService {
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

    // 2. Kiểm tra ngược lại: Nếu đối phương đã gửi lời mời cho bạn rồi, hãy báo lỗi
    // (hoặc bạn có thể tự động accept tùy logic dự án)
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

  async acceptFriendRequest(user_id: string, sender_id: string) {
    // Kiểm tra lời mời có tồn tại ở trạng thái Pending không trước khi update
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

    return { message: 'Đã trở thành bạn bè' }
  }

  async getFriendList(user_id: string) {
    return await databaseService.friendRequests
      .aggregate([
        {
          $match: {
            $or: [
              { sender_id: new ObjectId(user_id), status: FriendStatus.Accepted },
              { receiver_id: new ObjectId(user_id), status: FriendStatus.Accepted }
            ]
          }
        },
        {
          $project: {
            friend_id: {
              $cond: {
                if: { $eq: ['$sender_id', new ObjectId(user_id)] },
                then: '$receiver_id',
                else: '$sender_id'
              }
            }
          }
        },
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
}

export const friendService = new FriendService()
