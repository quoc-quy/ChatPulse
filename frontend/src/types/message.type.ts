export interface SenderInfo {
  _id: string
  username: string
  avatar?: string
}

export interface Message {
  _id: string
  conversationId: string
  type: 'text' | 'media' | 'sticker' | 'system' | 'call' | 'revoked'
  content: string
  replyToId?: string
  reactions?: any[]
  callInfo?: any
  createdAt: string
  updatedAt: string
  sender: SenderInfo
}

export interface GetMessagesResponse {
  message: string
  result: Message[]
}
