import { useState, useCallback, useRef } from 'react'
import { TrafficMessageType } from '../components/traffic/TrafficMessage'
import { api } from '../apis/api'

// Helper tạo message ID
const uid = () => `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

export function useTrafficBot() {
  const [messages, setMessages] = useState<TrafficMessageType[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const isFetchingRef = useRef(false)

  const sendMessage = useCallback(async (question: string) => {
    if (isFetchingRef.current) return

    // 1. Thêm tin nhắn của user ngay lập tức
    const userMsg: TrafficMessageType = {
      id: uid(),
      role: 'user',
      content: question,
      timestamp: new Date()
    }
    setMessages((prev) => [...prev, userMsg])

    // 2. Gọi API
    setIsLoading(true)
    isFetchingRef.current = true

    try {
      // Backend trả về: { message: "Success", data: { card: { ... }, rawText: "..." } }
      const response = await api.post('/traffic-ai/ask', { question })
      const json = response.data
      const trafficData = json.data

      // Xử lý dữ liệu trả về từ backend
      // Nếu có card, chúng ta lưu lại vào object message để component render card
      const botMsg: TrafficMessageType = {
        id: uid(),
        role: 'bot',
        content:
          trafficData?.card?.userFriendlyExplanation ||
          trafficData?.card?.summary ||
          trafficData?.rawText ||
          'Xin lỗi, tôi không tìm thấy thông tin phù hợp.',
        timestamp: new Date(),
        // Truyền thêm dữ liệu card để UI Component có thể hiển thị dạng thẻ
        cardData: trafficData?.card || null
      }

      setMessages((prev) => [...prev, botMsg])
    } catch (error: any) {
      const errDetail = error?.response?.data?.message || error?.message || 'Lỗi kết nối'

      const errMsg: TrafficMessageType = {
        id: uid(),
        role: 'bot',
        content: `⚠️ Không thể kết nối đến hệ thống tư vấn luật.\n\n(${errDetail})`,
        timestamp: new Date(),
        isError: true
      }
      setMessages((prev) => [...prev, errMsg])
    } finally {
      setIsLoading(false)
      isFetchingRef.current = false
    }
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  return { messages, isLoading, sendMessage, clearMessages }
}
