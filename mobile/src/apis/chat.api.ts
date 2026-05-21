import { api } from './api'

export interface CreateGroupParams {
  name: string
  member_ids: string[] // Khớp với req.body.member_ids ở Backend
  avatarUrl?: string
}

export const getConversations = (page: number | string = 1, limit: number | string = 20) => {
  return api.get(`/conversations`, {
    params: { page, limit }
  })
}

export const getMessages = (conversationId: string, cursor: string | null = null, limit = 20) => {
  const params: any = { limit }
  if (cursor) {
    params.cursor = cursor
  }
  return api.get(`/messages/${conversationId}`, { params })
}

export const sendMessage = (conversationId: string, content: string, type = 'text') => {
  return api.post(`/messages`, {
    convId: conversationId,
    content: content,
    type: type
  })
}

export const sendMediaMessage = (
  conversationId: string,
  files: any[],
  type: 'media' | 'file' = 'media'
) => {
  const formData = new FormData()
  formData.append('convId', conversationId)
  formData.append('type', type)

  files.forEach((fileAsset) => {
    formData.append('files', {
      uri: fileAsset.uri,
      name: fileAsset.name || fileAsset.fileName || `file_${Date.now()}`,
      type: fileAsset.mimeType || fileAsset.type || 'application/octet-stream'
    } as any)
  })

  return api.post(`/messages/media`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

export const reactMessage = (messageId: string, emoji: string) => {
  return api.post(`/messages/${messageId}/react`, { emoji })
}

export const recallMessage = (messageId: string) => {
  return api.post(`/messages/${messageId}/revoke`)
}

export const deleteMessageForMe = (messageId: string) => {
  return api.delete(`/messages/${messageId}/delete-for-me`)
}

export const getConversationDetail = (conversationId: string) => {
  return api.get(`/conversations/${conversationId}`)
}

export const updateGroup = (
  conversationId: string,
  data: { name?: string; avatarUrl?: string }
) => {
  return api.patch(`/conversations/${conversationId}`, data)
}

export const addMembers = (conversationId: string, members: string[]) => {
  return api.post(`/conversations/${conversationId}/members`, {
    member_ids: members
  })
}

export const kickMember = (conversationId: string, memberId: string) => {
  return api.delete(`/conversations/${conversationId}/members`, {
    data: { memberId }
  })
}

export const leaveGroup = (conversationId: string) => {
  return api.delete(`/conversations/${conversationId}/leave`)
}

export const promoteAdmin = (conversationId: string, memberId: string) => {
  return api.patch(`/conversations/${conversationId}/admin`, { memberId })
}

export const markConversationAsSeen = (conversationId: string) => {
  return api.patch(`/conversations/${conversationId}/seen`)
}

/**
 * [FIX] Tóm tắt cuộc trò chuyện bằng AI
 * Gọi đúng endpoint: GET /messages/:convId/summary
 * Khớp với messagesApi.summarizeConversation ở frontend web
 */
export const summarizeChatApi = (convId: string, limit: number = 30, unreadCount: number = 0) => {
  return api.get(`/messages/${convId}/summary`, {
    params: { limit, unreadCount }
  })
}

/**
 * [MỚI] Tóm tắt nội dung một tin nhắn cụ thể (file, ảnh, text)
 * Khớp với messagesApi.summarizeMessage ở frontend web
 * POST /messages/:messageId/summarize
 */
export const summarizeMessageApi = (messageId: string) => {
  return api.post(`/messages/${messageId}/summarize`)
}

export const askChatPulseAIApi = (context: any[], question: string) => {
  return api.post('/conversations/ask-ai', {
    context: context,
    question: question
  })
}

export const createDirectConversation = (userId: string) => {
  return api.post('/conversations', {
    type: 'direct',
    members: [userId]
  })
}

export const muteConversation = (conversationId: string, mute: boolean) =>
  api.patch(`/groups/${conversationId}/mute`, { mute })

export const getMediaFiles = (conversationId: string, page: number = 1, limit: number = 20) =>
  api.get(`/groups/${conversationId}/media`, { params: { page, limit } })

export const getSharedLinks = (conversationId: string, page: number = 1, limit: number = 20) =>
  api.get(`/groups/${conversationId}/links`, { params: { page, limit } })

export const renameGroup = (conversationId: string, name: string) =>
  api.patch(`/groups/${conversationId}/name`, { name })

export const searchMessages = (
  conversationId: string,
  keyword: string,
  page: number = 1,
  limit: number = 20
) =>
  api.get(`/messages/${conversationId}/search`, {
    params: { q: keyword, page, limit }
  })

export const suggestReplyApi = (messages: any[]) => {
  return api.post('/conversations/suggest-reply', { messages })
}

export const pinMessageApi = (messageId: string, action: 'pin' | 'unpin') => {
  return api.post(`/messages/${messageId}/pin`, { action })
}

export const pinConversation = (conversationId: string, is_pin: boolean) =>
  api.patch(`/conversations/${conversationId}/pin`, { is_pin })

export const joinGroupByLink = (conversationId: string) => {
  return api.post('/groups/join', { conversationId })
}

export const updateGroupAvatar = (conversationId: string, avatarUrl: string) => {
  return api.patch(`/groups/${conversationId}/avatar`, { avatarUrl })
}

export const uploadGroupAvatarApi = (conversationId: string, uri: string) => {
  const filename = uri.split('/').pop() || 'avatar.jpg'
  const match = /\.(\w+)$/.exec(filename)
  const type = match ? `image/${match[1]}` : 'image/jpeg'

  const formData = new FormData()
  formData.append('file', { uri, name: filename, type } as any)

  return api.post(`/groups/${conversationId}/avatar/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export const createGroup = (data: CreateGroupParams) => {
  return api.post('/groups', data)
}

export const disbandGroup = (conversationId: string) => {
  return api.delete(`/groups/${conversationId}/disband`)
}

export const deleteConversationForMe = (conversationId: string) =>
  api.delete(`/conversations/${conversationId}`)

export const forwardMessage = async (
  messageId: string,
  targetUserIds: string[],
  targetGroupIds: string[]
) => {
  return await api.post(`/messages/${messageId}/forward`, {
    targetUserIds,
    targetGroupIds
  })
}
