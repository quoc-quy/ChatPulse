import http from '@/utils/http'

export const conversationsApi = {
  getConversations: () => {
    return http.get('/conversations')
  },

  markAsSeen: (conversationId: string) => {
    return http.patch(`/conversations/${conversationId}/seen`, {})
  }
}
