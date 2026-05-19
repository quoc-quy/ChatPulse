/* eslint-disable @typescript-eslint/no-explicit-any */
import http from '@/utils/http'
import type { GetMessagesResponse, Message } from '@/types/message.type'

export interface ConversationSummary {
  topic: string
  decisions: string[]
  openQuestions: string[]
  actionItems: { task: string; assignee: string; messageId: string }[]
}

export interface SummarizeResult {
  summary: string
  sourceType: 'text' | 'image' | 'document' | 'spreadsheet' | 'chat' | 'unsupported'
  keyPoints?: string[]
  extra?: any
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
    return http.post<{ message: string; result: Message }>(`/messages/${messageId}/react`, { emoji })
  },

  revokeMessage: (messageId: string) => {
    return http.post<{ message: string; result: Message }>(`/messages/${messageId}/revoke`)
  },

  deleteMessage: (messageId: string) => {
    return http.delete<{ message: string; result: any }>(`/messages/${messageId}`)
  },

  summarizeConversation: (convId: string, limit: number = 30, unreadCount: number = 0) => {
    return http.get<{ message: string; result: ConversationSummary }>(`/messages/${convId}/summary`, {
      params: { limit, unreadCount }
    })
  },

  deleteMessageForMe: (messageId: string) => {
    return http.delete<{ message: string; result: any }>(`/messages/${messageId}/delete-for-me`)
  },

  searchMessages: (convId: string, keyword: string, page: number = 1, limit: number = 20) => {
    return http.get<{ message: string; result: any }>(`/messages/${convId}/search`, {
      params: {
        q: keyword,
        page,
        limit
      }
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
  },

  forwardMessage: (messageId: string, targetUserIds: string[], targetGroupIds: string[]) => {
    return http.post<{ message: string; result: any }>(`/messages/${messageId}/forward`, {
      targetUserIds,
      targetGroupIds
    })
  },

  pinMessage: (messageId: string, action: 'pin' | 'unpin') => {
    return http.post<{ message: string; result: any }>(`/messages/${messageId}/pin`, { action })
  },

  /**
   * Tóm tắt nội dung một tin nhắn cụ thể
   * Hỗ trợ: text thuần, ảnh (OCR), pdf, docx, doc, txt, xlsx
   */
  summarizeMessage: (messageId: string) => {
    return http.post<{
      message: string
      result: SummarizeResult
    }>(`/messages/${messageId}/summarize`)
  }
}
