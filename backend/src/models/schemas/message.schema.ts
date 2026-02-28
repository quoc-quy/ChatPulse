import { ObjectId } from 'mongodb'

interface MessageType {
  _id?: ObjectId
  conversationId: ObjectId
  senderId: ObjectId
  type: 'text' | 'media' | 'sticker' | 'system' | 'call' | 'revoked'
  content: string
  replyToId?: ObjectId
  reactions?: any[]
  deletedByUsers?: ObjectId[] // Xóa tin nhắn 1 chiều
  callInfo?: any // Lưu thông tin nếu là cuộc gọi
  createdAt?: Date
  updatedAt?: Date
}

export default class Message {
  _id?: ObjectId
  conversationId: ObjectId
  senderId: ObjectId
  type: string
  content: string
  replyToId?: ObjectId
  reactions: any[]
  deletedByUsers: ObjectId[]
  callInfo?: any
  createdAt: Date
  updatedAt: Date

  constructor(message: MessageType) {
    this._id = message._id || new ObjectId()
    this.conversationId = message.conversationId
    this.senderId = message.senderId
    this.type = message.type || 'text'
    this.content = message.content
    this.replyToId = message.replyToId
    this.reactions = message.reactions || []
    this.deletedByUsers = message.deletedByUsers || []
    this.callInfo = message.callInfo
    this.createdAt = message.createdAt || new Date()
    this.updatedAt = message.updatedAt || new Date()
  }
}
