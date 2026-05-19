import Groq from 'groq-sdk'
import { PromptBuilder } from './prompt.builder'
import { ErrorWithStatus } from '~/models/errors'
import httpStatus from '~/constants/httpStatus'

class AiService {
  private groq: Groq
  private modelName: string

  constructor() {
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY as string })
    this.modelName = process.env.GROQ_MODEL || 'llama-3.1-8b-instant'
  }

  // ──────────────────────────────────────────────────────────────
  // HÀM TIỆN ÍCH: Gọi AI và parse kết quả JSON
  // Dùng chung cho tất cả các summarize prompts
  // ──────────────────────────────────────────────────────────────
  async callWithJsonResponse(prompt: string, temperature = 0.2): Promise<Record<string, any>> {
    try {
      const completion = await this.groq.chat.completions.create({
        model: this.modelName,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature
      })

      const resultText = completion.choices[0]?.message?.content || '{}'
      return JSON.parse(resultText)
    } catch (error) {
      console.error('Lỗi AiService.callWithJsonResponse:', error)
      throw new ErrorWithStatus({ message: 'Lỗi server khi phân tích AI', status: 500 })
    }
  }

  // ──────────────────────────────────────────────────────────────
  // TÓM TẮT CUỘC HỘI THOẠI (chat log)
  // ──────────────────────────────────────────────────────────────
  async summarizeChat(formattedChatLog: string) {
    try {
      const prompt = PromptBuilder.buildSummaryPrompt(formattedChatLog)
      return await this.callWithJsonResponse(prompt)
    } catch (error) {
      console.error('Lỗi AiService.summarizeChat:', error)
      throw new ErrorWithStatus({ message: 'Lỗi server khi phân tích AI', status: 500 })
    }
  }

  // ──────────────────────────────────────────────────────────────
  // TRẢ LỜI CÂU HỎI (AI Chat Assistant)
  // ──────────────────────────────────────────────────────────────
  async answerQuestion(globalContextString: string, userMetadataString: string, chatHistory: any[], question: string) {
    try {
      const systemInstruction = PromptBuilder.buildSystemInstruction(globalContextString, userMetadataString)

      const formattedHistory = (chatHistory || [])
        .map((item: any) => {
          let contentString = ''
          if (Array.isArray(item.parts)) {
            contentString = item.parts.map((p: any) => p.text || '').join('\n')
          } else if (typeof item.parts === 'string') {
            contentString = item.parts
          } else {
            contentString = String(item.content || item.parts || '')
          }
          return {
            role: item.role === 'model' ? 'assistant' : 'user',
            content: contentString
          }
        })
        .filter((msg: any) => msg.content.trim() !== '')

      const messages: any[] = [
        { role: 'system', content: systemInstruction },
        ...formattedHistory,
        { role: 'user', content: question }
      ]

      const completion = await this.groq.chat.completions.create({
        model: this.modelName,
        messages: messages,
        temperature: 0.7
      })

      return completion.choices[0]?.message?.content || ''
    } catch (error: any) {
      console.error('Lỗi AiService.answerQuestion:', error)

      if (error?.status === 429 || error?.error?.error?.code === 'rate_limit_exceeded') {
        throw new ErrorWithStatus({
          message: 'Hệ thống AI đang quá tải. Vui lòng đợi 30 giây rồi thử lại.',
          status: 429
        })
      }

      throw new ErrorWithStatus({
        message: 'AI hiện không thể trả lời. Vui lòng thử lại.',
        status: httpStatus.INTERNAL_SERVER_ERROR
      })
    }
  }
}

export default new AiService()
