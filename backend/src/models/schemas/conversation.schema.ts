import { ObjectId } from 'mongodb'

// Định nghĩa các thuộc tính của từng thành viên trong nhóm
interface MemberType {
  userId: ObjectId
  role?: 'admin' | 'member'
  lastViewedMessageId?: ObjectId // High Water Mark dùng để tính unread_count
  clearedHistoryAt?: Date
  hasMuted?: boolean
}

interface ConversationType {
  _id?: ObjectId
  participants: ObjectId[] // Vẫn giữ lại mảng ObjectId thuần để query $match cực nhanh
  members?: MemberType[] // Mảng chứa thông tin chi tiết của user trong hội thoại
  last_message_id?: ObjectId
  type: 'direct' | 'group'
  name?: string
  avatarUrl?: string
  admin_id?: ObjectId
  updated_at?: Date
  created_at?: Date
}

export default class Conversation {
  _id?: ObjectId
  participants: ObjectId[]
  members: MemberType[]
  last_message_id?: ObjectId
  type: 'direct' | 'group'
  name?: string
  avatarUrl?: string
  admin_id?: ObjectId
  updated_at: Date
  created_at: Date

  constructor(conversation: ConversationType) {
    this._id = conversation._id || new ObjectId()
    this.participants = conversation.participants

    // Tự động khởi tạo mảng members nếu lúc tạo mới hội thoại chưa truyền vào
    this.members =
      conversation.members ||
      conversation.participants.map((userId) => ({
        userId: userId,
        role: conversation.admin_id && userId.toString() === conversation.admin_id.toString() ? 'admin' : 'member'
      }))

    this.last_message_id = conversation.last_message_id
    this.type = conversation.type || 'direct'
    this.name = conversation.name
    this.avatarUrl = conversation.avatarUrl
    this.admin_id = conversation.admin_id
    this.updated_at = conversation.updated_at || new Date()
    this.created_at = conversation.created_at || new Date()
  }
}
