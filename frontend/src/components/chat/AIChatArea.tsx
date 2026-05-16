/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useRef, useEffect } from 'react'
import { ChatHeader } from './ChatHeader'
import type { ChatItem } from '@/context/app.context'
import { Send, Bot, CarFront, Loader2 } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { aiApi } from '@/apis/ai.api'
import { trafficApi } from '@/apis/traffic.api'

interface AIChatAreaProps {
  chat: ChatItem
  onToggleInfoPanel?: () => void
  isInfoPanelOpen?: boolean
}

interface AIMessage {
  id: string
  role: 'user' | 'model'
  text: string
  timestamp: Date
}

export function AIChatArea({ chat, onToggleInfoPanel = () => {}, isInfoPanelOpen = false }: AIChatAreaProps) {
  const isTraffic = chat.type === 'traffic-ai'
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Cấu hình giao diện và nội dung động cho từng loại AI
  const config = {
    welcomeText: isTraffic
      ? 'Chào bạn! Tôi là chuyên gia Luật Giao Thông của ChatPulse. Tôi sử dụng hệ thống RAG để tra cứu hàng ngàn điều luật cực kỳ chính xác. Bạn muốn tra cứu vấn đề gì?'
      : 'Xin chào! Tôi là ChatPulse AI. Tôi có thể giúp gì cho bạn hôm nay?',
    placeholder: isTraffic ? 'Tra cứu luật giao thông, mức phạt, vỉa hè...' : 'Hỏi ChatPulse AI điều gì đó...',
    themeGradient: isTraffic ? 'from-orange-500 to-red-600' : 'from-purple-600 to-indigo-600',
    avatarGradient: isTraffic ? 'from-orange-400 to-red-500' : 'from-purple-500 to-indigo-600',
    ringColor: isTraffic ? 'focus:ring-orange-500' : 'focus:ring-purple-500',
    typingDot: isTraffic ? 'bg-orange-500' : 'bg-purple-500',
    Icon: isTraffic ? CarFront : Bot
  }

  const [messages, setMessages] = useState<AIMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  // Tự động reset và thiết lập lời chào khi chuyển đổi giữa các Chatbot
  useEffect(() => {
    setMessages([
      {
        id: 'welcome-msg',
        role: 'model',
        text: config.welcomeText,
        timestamp: new Date()
      }
    ])
    setInputText('')
    setIsTyping(false)
  }, [chat.id, chat.type, config.welcomeText])

  // Tự động cuộn mượt mà xuống tin nhắn mới nhất
  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = '44px' // Chiều cao cơ bản ban đầu
      const scrollHeight = inputRef.current.scrollHeight
      if (scrollHeight > 130) {
        inputRef.current.style.height = '130px'
        inputRef.current.style.overflowY = 'auto'
      } else {
        inputRef.current.style.height = `${scrollHeight}px`
        inputRef.current.style.overflowY = 'hidden'
      }
    }
  }, [inputText])

  const handleSend = async () => {
    if (!inputText.trim() || isTyping) return

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: inputText.trim(),
      timestamp: new Date()
    }

    setMessages((prev) => [...prev, userMessage])
    setInputText('')
    setIsTyping(true)

    if (inputRef.current) inputRef.current.style.height = '44px'

    try {
      let aiResponseText = ''

      if (isTraffic) {
        // Gọi API hệ thống RAG Luật Giao Thông
        const response = await trafficApi.askTrafficAI(userMessage.text)
        aiResponseText = response.data?.data || 'Xin lỗi, hệ thống không thể xử lý câu hỏi lúc này.'
      } else {
        // Gọi API ChatPulse AI thông thường kèm theo ngữ cảnh lịch sử
        const chatContext = messages
          .filter((m) => m.id !== 'welcome-msg')
          .map((m) => ({ role: m.role, content: m.text }))

        const response = await aiApi.askChatPulseAI(chatContext, userMessage.text)
        aiResponseText =
          response.data?.data ||
          (response.data as any)?.text ||
          (response.data as any)?.message ||
          'Xin lỗi, tôi gặp chút trục trặc.'
      }

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'model',
          text: aiResponseText,
          timestamp: new Date()
        }
      ])
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'model',
          text: 'Mất kết nối với máy chủ AI. Vui lòng thử lại!',
          timestamp: new Date()
        }
      ])
    } finally {
      setIsTyping(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    // THAY THÀNH h-screen ĐỂ KHÓA CHẶT CHIỀU CAO THEO VIEWPORT, CHỐNG TRÔI CỦA HEADER/FOOTER
    <div className='flex flex-col h-screen w-full overflow-hidden bg-background'>
      {/* Header cố định hoàn toàn */}
      <div className='shrink-0 bg-background z-20 border-b border-border/40'>
        <ChatHeader chat={chat} onToggleInfoPanel={onToggleInfoPanel} isInfoPanelOpen={isInfoPanelOpen} />
      </div>

      {/* Vùng chứa tin nhắn chịu trách nhiệm scroll độc lập */}
      <div ref={containerRef} className='flex-1 overflow-y-auto p-4 scroll-smooth bg-muted/10'>
        <div className='flex flex-col gap-4 min-h-full'>
          {messages.map((msg) => {
            const isUser = msg.role === 'user'
            return (
              <div key={msg.id} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                {!isUser && (
                  <Avatar
                    className={`h-8 w-8 bg-gradient-to-br ${config.avatarGradient} border border-border shadow-sm flex items-center justify-center shrink-0`}
                  >
                    <config.Icon className='w-4 h-4 text-white' />
                  </Avatar>
                )}

                <div
                  className={`max-w-[75%] px-4 py-2.5 rounded-2xl shadow-sm ${
                    isUser
                      ? `bg-gradient-to-r ${config.themeGradient} text-white rounded-tr-sm`
                      : 'bg-background border border-border text-foreground rounded-tl-sm'
                  }`}
                >
                  <p className='text-[15px] leading-relaxed whitespace-pre-wrap'>{msg.text}</p>
                  <span
                    className={`text-[10px] mt-1 block ${
                      isUser ? 'text-white/70 text-right' : 'text-muted-foreground text-left'
                    }`}
                  >
                    {msg.timestamp.toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            )
          })}

          {isTyping && (
            <div className='flex gap-3 justify-start items-center'>
              <Avatar
                className={`h-8 w-8 bg-gradient-to-br ${config.avatarGradient} border border-border shadow-sm flex items-center justify-center shrink-0`}
              >
                <config.Icon className='w-4 h-4 text-white' />
              </Avatar>

              <div className='bg-background border border-border px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1.5'>
                <span className={`w-2 h-2 ${config.typingDot} rounded-full animate-bounce`} />
                <span
                  className={`w-2 h-2 ${config.typingDot} rounded-full animate-bounce`}
                  style={{ animationDelay: '0.15s' }}
                />
                <span
                  className={`w-2 h-2 ${config.typingDot} rounded-full animate-bounce`}
                  style={{ animationDelay: '0.3s' }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer cố định hoàn toàn ở dưới đáy */}
      <div className='shrink-0 border-t border-border/40 bg-background p-4 shadow-sm z-20 flex items-end gap-2'>
        <div
          className={`relative flex-1 flex items-end bg-muted rounded-[24px] outline-none ring-0 transition-all focus-within:ring-2 ${config.ringColor}`}
        >
          <textarea
            ref={inputRef}
            placeholder={config.placeholder}
            className='w-full bg-transparent text-foreground px-5 py-[10px] outline-none resize-none leading-relaxed'
            style={{ minHeight: '44px', height: '44px', maxHeight: '130px' }}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isTyping}
            rows={1}
          />
        </div>

        <div className='pb-[2px]'>
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isTyping}
            className={`w-10 h-10 bg-gradient-to-r ${config.themeGradient} text-white rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-md shrink-0`}
          >
            {isTyping ? <Loader2 className='w-5 h-5 animate-spin' /> : <Send className='w-5 h-5 ml-1' />}
          </button>
        </div>
      </div>
    </div>
  )
}
