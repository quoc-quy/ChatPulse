// frontend-demo/src/apis/messages.api.ts
import http from '@/utils/http'
import type { GetMessagesResponse } from '@/types/message.type'

interface GetMessagesParams {
  convId: string
  cursor?: string
  limit?: number
}

export const messagesApi = {
  getMessages: ({ convId, cursor, limit = 20 }: GetMessagesParams) => {
    return http.get<GetMessagesResponse>(`/messages/${convId}`, {
      params: {
        cursor,
        limit
      }
    })
  }
}
