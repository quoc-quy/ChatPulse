import { api } from './api'

export const getLiveKitToken = async (roomName: string, userName: string) => {
  try {
    const response = await api.get('/call/token', {
      params: { roomName, userName }
    })
    return response.data.result.token
  } catch (error) {
    console.error('Lỗi khi lấy token LiveKit:', error)
    throw error
  }
}
