import http from '@/utils/http'

export const conversationsApi = {
  getConversations: () => {
    // Lấy thủ công token
    const token = localStorage.getItem('access_token')

    return http.get('/conversations', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
  },

  // THÊM MỚI: API đánh dấu đã đọc
  markAsSeen: (conversationId: string) => {
    const token = localStorage.getItem('access_token')

    return http.patch(
      `/conversations/${conversationId}/seen`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )
  }
}
