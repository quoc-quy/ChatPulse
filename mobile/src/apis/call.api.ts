import { api } from './api'

export const getLiveKitToken = async (roomName: string, userName: string) => {
  try {
    const response = await api.get('/calls/token', {
      params: { roomName, userName }
    })
    return response.data.result.token
  } catch (error) {
    console.error('Lỗi khi lấy token LiveKit:', error)
    throw error
  }
}

export const getActiveCall = async (conversationId: string) => {
  try {
    const response = await api.get(`/calls/active/${conversationId}`)
    return response.data.result
  } catch (error) {
    console.error('Lỗi khi lấy active call:', error)
    throw error
  }
}
