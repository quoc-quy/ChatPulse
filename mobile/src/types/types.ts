export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  Chat: undefined;
};

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