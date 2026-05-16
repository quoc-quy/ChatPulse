import http from '@/utils/http'

export const trafficApi = {
  askTrafficAI: (question: string) => {
    return http.post<{ message: string; data: string }>('/traffic-ai/ask', { question })
  }
}
