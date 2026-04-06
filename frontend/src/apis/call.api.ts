import http from '@/utils/http'

export const callApi = {
  getLiveKitToken: (roomName: string, userName: string) => {
    return http.get<{ message: string; result: { token: string } }>('/calls/token', {
      params: { roomName, userName }
    })
  }
}
