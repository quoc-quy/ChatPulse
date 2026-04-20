export type RootStackParamList = {
  Login: undefined
  SignUp: undefined
  Chat: undefined
  Main: undefined
  FriendRequests: undefined
  ForgotPassword: undefined
  ResetPassword: { email: string }
  SentRequest: undefined
  ChatDetails: { conversationId: string; chatName: string; isGroup: boolean }
  ForwardMessageScreen: { messageId: string }
}

export interface Conversation {
  _id: string
  name: string
  avatarUrl?: string
  lastMessage?: {
    content: string
    created_at: string
  }
  unreadCount: number
  type: 'private' | 'group'
}
