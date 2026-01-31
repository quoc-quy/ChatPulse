import { ObjectId } from 'mongodb'
import databaseService from './database.services'

class SearchService {
  async search({
    user_id,
    userName,
    phone,
    limit,
    page
  }: {
    user_id: string
    userName: string
    phone: string
    limit: number
    page: number
  }) {
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

    const result = await databaseService.users
      .aggregate([
        {
          $match
        },
        {
          $project: {
            password: 0,
            created_at: 0,
            updated_at: 0
          }
        },
        {
          $skip: limit * (page - 1)
        },
        {
          $limit: limit
        }
      ])
      .toArray()

    return result
  }
}

const searchService = new SearchService()
export default searchService
