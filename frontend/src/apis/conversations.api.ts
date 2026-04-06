import http from '@/utils/http'

export const conversationsApi = {
  createConversation: (data: { type: 'direct' | 'group'; members: string[]; name?: string }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return http.post<{ message: string; result: any }>('/conversations', data)
  },

  getConversations: () => {
    return http.get('/conversations')
  },

  markAsSeen: (conversationId: string) => {
    return http.patch(`/conversations/${conversationId}/seen`, {})
  }
}
