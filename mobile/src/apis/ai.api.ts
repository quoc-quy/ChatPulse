import { api } from './api'

export const aiApi = {
  // Tóm tắt toàn bộ cuộc hội thoại
  summarizeConversation: (conversationId: string, limit: number = 30, unreadCount: number = 0) => {
    return api.get(`/messages/${conversationId}/summary`, {
      params: { limit, unreadCount }
    })
  },
  // Tóm tắt nội dung một tin nhắn cụ thể (text thuần, ảnh OCR, pdf, doc,...)
  summarizeMessage: (messageId: string) => {
    return api.post(`/messages/${messageId}/summarize`)
  }
}
