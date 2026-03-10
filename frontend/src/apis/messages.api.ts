import http from '@/utils/http'
import type { GetMessagesResponse, Message } from '@/types/message.type'

export interface ConversationSummary {
  topic: string
  decisions: string[]
  openQuestions: string[]
  actionItems: { task: string; assignee: string; messageId: string }[]
}

interface GetMessagesParams {
  convId: string
  cursor?: string
  limit?: number
}

// Payload cho API gửi tin nhắn Text/Sticker
interface SendMessagePayload {
  convId: string
  type: 'text' | 'sticker' | 'system'
  content: string
  replyToId?: string
}

// Thêm Interface cho kết quả tóm tắt AI
export interface ConversationSummary {
  topic: string
  decisions: string[]
  openQuestions: string[]
  actionItems: { task: string; assignee: string; messageId: string }[]
}

export const messagesApi = {
  getMessages: ({ convId, cursor, limit = 20 }: GetMessagesParams) => {
    return http.get<GetMessagesResponse>(`/messages/${convId}`, {
      params: {
        cursor,
        limit
      }
    })
  },

  sendMessage: (payload: SendMessagePayload) => {
    // Giả sử backend trả về data chứa đối tượng Message
    return http.post<{ message: string; result: Message }>('/messages/', payload)
  },

  reactMessage: (messageId: string, emoji: string) => {
    return http.post<{ message: string; result: any }>(`/messages/${messageId}/react`, { emoji })
  },

  summarizeConversation: (convId: string, limit?: number, unreadCount?: number) => {
    return http.get<{ message: string; result: ConversationSummary }>(`/messages/${convId}/summary`, {
      params: { limit, unreadCount }, // Truyền thêm unreadCount
      timeout: 60000
    })
  }
}
