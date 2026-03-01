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
  }
}
