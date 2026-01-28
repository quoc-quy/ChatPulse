// src/models/schemas/FriendRequest.schema.ts
import { ObjectId } from 'mongodb'
import { FriendStatus } from '~/constants/friendStatus'

interface FriendRequestType {
  _id?: ObjectId
  sender_id: ObjectId
  receiver_id: ObjectId
  status?: FriendStatus
  created_at?: Date
  updated_at?: Date
}

export default class FriendRequest {
  _id?: ObjectId
  sender_id: ObjectId
  receiver_id: ObjectId
  status: FriendStatus
  created_at: Date
  updated_at: Date

  constructor({ _id, sender_id, receiver_id, status, created_at, updated_at }: FriendRequestType) {
    const date = new Date()
    this._id = _id
    this.sender_id = sender_id
    this.receiver_id = receiver_id
    this.status = status ?? FriendStatus.Pending
    this.created_at = created_at || date
    this.updated_at = updated_at || date
  }
}
