/* eslint-disable @typescript-eslint/no-explicit-any */
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
    return http.post<{ message: string; result: Message }>('/messages/', payload)
  },

  reactMessage: (messageId: string, emoji: string) => {
    return http.post<{ message: string; result: any }>(`/messages/${messageId}/react`, { emoji })
  },

  revokeMessage: (messageId: string) => {
    return http.post<{ message: string; result: any }>(`/messages/${messageId}/revoke`, {})
  },

  deleteMessageForMe: (messageId: string) => {
    return http.delete<{ message: string; result: any }>(`/messages/${messageId}`)
  },

  summarizeConversation: (convId: string, limit?: number, unreadCount?: number) => {
    return http.get<{ message: string; result: ConversationSummary }>(`/messages/${convId}/summary`, {
      params: { limit, unreadCount },
      timeout: 60000
    })
  },

  sendMediaMessage: (convId: string, files: File[], replyToId?: string) => {
    const formData = new FormData()
    formData.append('convId', convId)

    files.forEach((file) => {
      formData.append('files', file)
    })

    if (replyToId) formData.append('replyToId', replyToId)

    return http.post<{ message: string; result: Message }>('/messages/media', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  }
}
