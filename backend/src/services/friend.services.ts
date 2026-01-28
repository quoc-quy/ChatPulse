// src/services/friend.services.ts
import { ObjectId } from 'mongodb'
import databaseService from './database.services'
import FriendRequest from '~/models/schemas/friendRequest.schema'
import { FriendStatus } from '~/constants/friendStatus'

class FriendService {
  async createFriendRequest(sender_id: string, receiver_id: string) {
    await databaseService.friendRequests.insertOne(
      new FriendRequest({
        sender_id: new ObjectId(sender_id),
        receiver_id: new ObjectId(receiver_id)
      })
    )
    return { message: 'Gửi lời mời kết bạn thành công' }
  }

  async acceptFriendRequest(user_id: string, sender_id: string) {
    await databaseService.friendRequests.updateOne(
      {
        sender_id: new ObjectId(sender_id),
        receiver_id: new ObjectId(user_id),
        status: FriendStatus.Pending
      },
      {
        $set: { status: FriendStatus.Accepted, updated_at: new Date() }
      }
    )
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
            avatar: '$friend_info.avatar'
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
