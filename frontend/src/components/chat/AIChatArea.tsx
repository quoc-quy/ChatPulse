import { useState, useRef, useEffect } from 'react'
import { ChatHeader } from './ChatHeader'
import type { ChatItem } from '@/context/app.context'
import { Send, Bot, Loader2 } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { aiApi } from '@/apis/ai.api'

interface AIChatAreaProps {
  chat: ChatItem
}

interface AIMessage {
  id: string
  role: 'user' | 'model'
  text: string
  timestamp: Date
}

export function AIChatArea({ chat }: AIChatAreaProps) {
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: 'welcome-msg',
      role: 'model',
      text: 'Xin chào! Tôi là ChatPulse AI. Tôi có thể giúp gì cho bạn hôm nay?',
      timestamp: new Date()
    }
  ])
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

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

    try {
      // Build context (Lấy 10 tin nhắn gần nhất làm ngữ cảnh)
      const chatContext = messages.slice(-10).map((msg) => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      }))

      const response = await aiApi.askChatPulseAI(chatContext, userMessage.text)
      const aiResponseText = response.data?.result || response.data?.data || 'Xin lỗi, tôi không thể trả lời lúc này.'

      const aiMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: aiResponseText,
        timestamp: new Date()
      }

      setMessages((prev) => [...prev, aiMessage])
    } catch (error) {
      console.error('Lỗi khi gọi AI:', error)
      const errorMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: 'Đã có lỗi xảy ra kết nối với máy chủ AI. Vui lòng thử lại sau.',
        timestamp: new Date()
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className='flex h-screen w-full overflow-hidden flex-col bg-background'>
      {/* Tái sử dụng ChatHeader, truyền dummy props cho InfoPanel vì AI ko dùng */}
      <ChatHeader chat={chat} onToggleInfoPanel={() => {}} isInfoPanelOpen={false} />

      <div className='flex-1 overflow-y-auto p-4 scroll-smooth bg-muted/10' ref={containerRef}>
        <div className='flex flex-col gap-4'>
          {messages.map((msg) => {
            const isUser = msg.role === 'user'
            return (
              <div key={msg.id} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                {!isUser && (
                  <Avatar className='h-8 w-8 bg-gradient-to-br from-purple-500 to-indigo-500 border border-border shadow-sm'>
                    <Bot className='w-5 h-5 m-auto text-white' />
                  </Avatar>
                )}

                <div
                  className={`max-w-[75%] px-4 py-2.5 rounded-2xl shadow-sm ${isUser ? 'bg-gradient-to-r from-[#6b45e9] to-[#a139e4] text-white rounded-tr-sm' : 'bg-background border border-border text-foreground rounded-tl-sm'}`}
                >
                  <p className='text-[15px] leading-relaxed whitespace-pre-wrap'>{msg.text}</p>
                  <span
                    className={`text-[10px] mt-1 block ${isUser ? 'text-white/70 text-right' : 'text-muted-foreground text-left'}`}
                  >
                    {msg.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            )
          })}

          {isTyping && (
            <div className='flex gap-3 justify-start items-center'>
              <Avatar className='h-8 w-8 bg-gradient-to-br from-purple-500 to-indigo-500 border border-border shadow-sm'>
                <Bot className='w-5 h-5 m-auto text-white' />
              </Avatar>
              <div className='bg-background border border-border px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2'>
                <span className='w-2 h-2 bg-purple-500 rounded-full animate-bounce'></span>
                <span className='w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-75'></span>
                <span className='w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-150'></span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AIChat Footer */}
      <div className='p-4 bg-background flex items-center gap-2 border-t border-border/40 shadow-sm'>
        <div className='relative flex-1 flex items-center'>
          <input
            type='text'
            placeholder='Hỏi ChatPulse AI điều gì đó...'
            className='w-full bg-muted text-foreground rounded-full px-5 py-2.5 outline-none focus:ring-2 focus:ring-purple-500 transition-all'
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isTyping}
          />
        </div>
        <button
          onClick={handleSend}
          disabled={!inputText.trim() || isTyping}
          className='w-11 h-11 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-md'
        >
          {isTyping ? <Loader2 className='w-5 h-5 animate-spin' /> : <Send className='w-5 h-5 ml-1' />}
        </button>
      </div>
    </div>
  )
}
