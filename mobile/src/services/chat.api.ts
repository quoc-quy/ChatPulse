import { api } from './api'

export const getConversations = (page = 1, limit = 20) => {
  return api.get('/conversations', {
    params: { page, limit }
  })
}