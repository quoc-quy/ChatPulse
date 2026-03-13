import { ObjectId } from 'mongodb'
import databaseService from './database.services'

class SearchService {
  async search({ user_id, userName, phone }: { user_id: string; userName: string; phone: string }) {
    const $match: any = {}

    if (phone) {
      $match.phone = phone
    }

    if (userName) {
      const followed_user_id = await databaseService.friends
        .find(
          {
            user_id: new ObjectId(user_id)
          },
          {
            projection: {
              friend_id: 1
            }
          }
        )
        .toArray()

      const idfriendIds = followed_user_id.map((follower) => follower.friend_id)

      $match._id = {
        $in: idfriendIds
      }
      $match.userName = {
        $regex: userName,
        $options: 'i' //Khong phan biet hoa thuong
      }
    }

    const [users, total] = await Promise.all([
      databaseService.users
        .aggregate([
          {
            $match
          },
          {
            $lookup: {
              from: 'user_blocks',
              let: { target_id: '$_id' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ['$user_id', new ObjectId(user_id)] }, { $eq: ['$blocked_user_id', '$$target_id'] }]
                    }
                  }
                }
              ],
              as: 'blockInfo'
            }
          },
          {
            $lookup: {
              from: 'friends',
              let: { target_id: '$_id' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ['$user_id', new ObjectId(user_id)] },
                        { $eq: ['$friend_id', '$$target_id'] },
                        { $eq: ['$status', 'accepted'] }
                      ]
                    }
                  }
                }
              ],
              as: 'friendInfo'
            }
          },
          {
            $addFields: {
              isBlocked: { $gt: [{ $size: '$blockInfo' }, 0] },
              isFriend: { $gt: [{ $size: '$friendInfo' }, 0] }
            }
          },
          {
            $project: {
              password: 0,
              created_at: 0,
              updated_at: 0
            }
          }
        ])
        .toArray(),
      databaseService.users
        .aggregate([
          {
            $match
          },
          {
            $count: 'total'
          }
        ])
        .toArray()
    ])

    return {
      users,
      total: total[0]?.total || 0
    }
  }
}

const searchService = new SearchService()
export default searchService
