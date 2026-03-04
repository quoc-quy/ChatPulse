import http from '@/utils/http'
import type { GetMessagesResponse, Message } from '@/types/message.type'

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
  }
}
