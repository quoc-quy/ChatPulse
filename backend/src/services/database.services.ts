import { Collection, Db, MongoClient, ServerApiVersion } from 'mongodb'
import { config } from 'dotenv'
import User from '~/models/schemas/user.schema'
import { RefreshToken } from '~/models/schemas/refreshToken_schema'
import FriendRequest from '~/models/schemas/friendRequest.schema'
import Friend from '~/models/schemas/friend.schema'
config()

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.ptzh2gl.mongodb.net/?appName=Cluster0`

class DatabaseService {
  private client: MongoClient
  private db: Db
  constructor() {
    this.client = new MongoClient(uri)
    this.db = this.client.db(process.env.DB_NAME)
  }

  async connect() {
    try {
      await this.db.command({ ping: 1 })
      console.log('Pinged your deployment. You successfully connected to MongoDB!')
    } catch (error) {
      // await this.client.close()
      throw error
    }
  }

  get users(): Collection<User> {
    return this.db.collection('users')
  }

  get refreshTokens(): Collection<RefreshToken> {
    return this.db.collection('refresh_tokens')
  }
  get friendRequests(): Collection<FriendRequest> {
    return this.db.collection('friend_requests')
  }
  get friends(): Collection<Friend> {
    return this.db.collection('friends')
  }
  async indexFriendRequests() {
    await this.friendRequests.createIndex({ sender_id: 1, receiver_id: 1 }, { unique: true })
  }
  async indexFriends() {
    // Tạo index kép để đảm bảo không kết bạn trùng lặp và tìm kiếm nhanh
    await this.friends.createIndex({ user_id: 1, friend_id: 1 }, { unique: true })
  }
}

const databaseService = new DatabaseService()
export default databaseService
