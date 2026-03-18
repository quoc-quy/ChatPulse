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

export interface Message {
  _id: string
  conversationId: string
  type: 'text' | 'media' | 'sticker' | 'system' | 'call' | 'revoked'
  content: string
  replyToId?: string
  reactions?: Reaction[]
  callInfo?: {
    status: 'completed' | 'missed' | 'rejected' | 'cancelled'
    duration?: number
    type: 'video' | 'audio'
  }

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
