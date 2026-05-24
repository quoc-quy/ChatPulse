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
  Call: {
    roomName: string
    userName: string
    isVideoCall: boolean
    callId: string
    conversationId: string
    callerName?: string // Tên thật người gọi — để hiển thị đúng trong CallScreen
    callerAvatar?: string // Avatar URL người gọi
  }
  ConversationDetail: {
    id: string
    name: string
    isGroup: boolean
  }
  UserProfile: {
    userId: string
  }
  MembersScreen: {
    conversationId: string
    conversationName: string
    isAdmin: boolean
  }
  AddMemberScreen: {
    conversationId: string
  }
  MessageScreen: {
    id: string
    name: string
    isGroup: boolean
    targetUserId?: string
    unreadCount?: number
    isMuted?: boolean
  }
  MessageSearchScreen: {
    conversationId: string
    conversationName: string
  }
  BlockedUsers: undefined
  CreateGroupScreen: undefined
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
