// src/models/schemas/friend.schema.ts
import { ObjectId } from 'mongodb'

interface FriendType {
  _id?: ObjectId
  user_id: ObjectId // ID người dùng hiện tại
  friend_id: ObjectId // ID người bạn
  created_at?: Date
}

export default class Friend {
  _id?: ObjectId
  user_id: ObjectId
  friend_id: ObjectId
  created_at: Date

  constructor({ _id, user_id, friend_id, created_at }: FriendType) {
    this._id = _id
    this.user_id = user_id
    this.friend_id = friend_id
    this.created_at = created_at || new Date()
  }
}
