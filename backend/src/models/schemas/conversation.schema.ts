import { ObjectId } from 'mongodb'

interface ConversationType {
  _id?: ObjectId
  participants: ObjectId[] // Danh sách ID của user tham gia
  last_message_id?: ObjectId // ID tin nhắn cuối cùng để hiển thị preview
  type: 'direct' | 'group' // Chat 1-1 hoặc chat nhóm
  name?: string // Tên nhóm (dành cho group chat)
  avatarUrl?: string
  admin_id?: ObjectId // ID của admin nhóm (người tạo)
  updated_at?: Date
  created_at?: Date
}

export default class Conversation {
  _id?: ObjectId
  participants: ObjectId[]
  last_message_id?: ObjectId
  type: 'direct' | 'group'
  name?: string
  avatarUrl?: string
  admin_id?: ObjectId
  updated_at: Date
  created_at: Date

  constructor(conversation: ConversationType) {
    this._id = conversation._id
    this.participants = conversation.participants
    this.last_message_id = conversation.last_message_id
    this.type = conversation.type || 'direct'
    this.name = conversation.name
    this.avatarUrl = conversation.avatarUrl
    this.admin_id = conversation.admin_id
    this.updated_at = conversation.updated_at || new Date()
    this.created_at = conversation.created_at || new Date()
  }
}
