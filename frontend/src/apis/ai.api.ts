import http from '@/utils/http'

export const aiApi = {
  askChatPulseAI: (chatContext: any[], prompt: string) => {
    return http.post('/conversations/ask-ai', {
      context: chatContext,
      question: prompt
    })
  }
}
