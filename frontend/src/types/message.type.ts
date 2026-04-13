export interface SenderInfo {
  _id: string
  userName: string
  avatar?: string
}

export interface Reaction {
  userId: string
  emoji: string
  createdAt: string
  user?: {
    _id: string
    userName: string
    avatar: string
  }
}

// Interface cho tin nhắn được trích dẫn (Reply)
export interface ReplyInfo {
  _id: string
  content: string
  type: 'text' | 'media' | 'sticker' | 'system' | 'call' | 'revoked'
  senderName: string
  isE2E?: boolean
}

export interface Message {
  _id: string
  conversationId: string
  type: 'text' | 'media' | 'sticker' | 'system' | 'call' | 'revoked' | 'image' | 'video'
  content: string
  replyToId?: string
  replyToMessage?: ReplyInfo
  reactions?: Reaction[]
  callInfo?: {
    status: 'completed' | 'missed' | 'rejected' | 'cancelled'
    duration?: number
    type: 'video' | 'audio'
  }

  isE2E?: boolean
  encryptedKeys?: Record<string, string> // { userId: encryptedAesKey }

  status?: 'SENDING' | 'SENT' | 'DELIVERED' | 'SEEN' | 'FAILED'
  deliveredTo?: string[]
  seenBy?: string[]

  createdAt: string
  updatedAt: string
  sender: SenderInfo
}

export interface GetMessagesResponse {
  message: string
  result: Message[]
}
