import { ObjectId } from 'mongodb'

interface MessageType {
  _id?: ObjectId
  conversationId: ObjectId
  senderId: ObjectId
  type: 'text' | 'media' | 'sticker' | 'system' | 'call' | 'revoked'
  content: string
  replyToId?: ObjectId
  reactions?: any[]
  deletedByUsers?: ObjectId[]
  isEdited?: boolean
  isDeleted?: boolean
  callInfo?: any
  // THÊM TRẠNG THÁI TIN NHẮN
  status?: 'SENDING' | 'SENT' | 'DELIVERED' | 'SEEN' | 'FAILED'
  deliveredTo?: ObjectId[]
  seenBy?: ObjectId[]
  createdAt?: Date
  updatedAt?: Date

  isE2E?: boolean
  encryptedKeys?: Record<string, string> // Lưu format: { "userId": "AES_Key_đã_mã_hóa_bằng_RSA_Public_Key" }
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
  isEdited?: boolean
  isDeleted?: boolean
  callInfo?: any

  status: string
  deliveredTo: ObjectId[]
  seenBy: ObjectId[]

  isE2E: boolean
  encryptedKeys: Record<string, string>

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
    this.isEdited = message.isEdited || false
    this.isDeleted = message.isDeleted || false
    this.callInfo = message.callInfo

    // Khởi tạo trạng thái mặc định
    this.status = message.status || 'SENT'
    this.deliveredTo = message.deliveredTo || []
    this.seenBy = message.seenBy || []

    this.isE2E = message.isE2E || false
    this.encryptedKeys = message.encryptedKeys || {}

    this.createdAt = message.createdAt || new Date()
    this.updatedAt = message.updatedAt || new Date()
  }
}
