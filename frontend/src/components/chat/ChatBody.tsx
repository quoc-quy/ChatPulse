import { useEffect, useState, useRef, useCallback, useContext, useLayoutEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { messagesApi } from '@/apis/messages.api'
import type { Message } from '@/types/message.type'
import { AppContext } from '@/context/app.context'

interface ChatBodyProps {
  convId: string
}

export function ChatBody({ convId }: ChatBodyProps) {
  const { profile } = useContext(AppContext)
  const currentUserId = profile?._id || ''

  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined)

  // THÊM MỚI: Cờ báo hiệu đang tải tin nhắn cũ & cờ lần đầu load
  const [isFetchingOlder, setIsFetchingOlder] = useState(false)
  const isInitialLoad = useRef(true)

  const containerRef = useRef<HTMLDivElement>(null)
  const previousScrollHeightRef = useRef<number>(0)
  const socketRef = useRef<Socket | null>(null)

  const fetchMessages = useCallback(
    async (isInitial = false) => {
      if (!convId || convId.length !== 24) return

      if (isLoading || (!hasMore && !isInitial)) return

      try {
        setIsLoading(true)

        // THÊM MỚI: Lưu lại chiều cao hiện tại trước khi gọi API để tính bù trừ
        if (!isInitial && containerRef.current) {
          setIsFetchingOlder(true)
          previousScrollHeightRef.current = containerRef.current.scrollHeight
        }

        const response = await messagesApi.getMessages({
          convId,
          cursor: isInitial ? undefined : nextCursor,
          limit: 20
        })

        // Xử lý lấy data an toàn từ Axios
        const resData = (response as any).data?.result || (response as any).result || (response as any).data || []
        const newMessages: Message[] = Array.isArray(resData) ? resData : []

        if (newMessages.length < 20) {
          setHasMore(false)
        }

        if (newMessages.length > 0) {
          const oldestMessageInBatch = newMessages[newMessages.length - 1]
          setNextCursor(oldestMessageInBatch._id)
        }

        if (isInitial) {
          setMessages([...newMessages].reverse())
        } else {
          setMessages((prev) => [...[...newMessages].reverse(), ...prev])
        }
      } catch (error) {
        console.error('Lỗi khi tải lịch sử tin nhắn:', error)
      } finally {
        setIsLoading(false)
      }
    },
    [convId, nextCursor, isLoading, hasMore]
  )

  useEffect(() => {
    if (convId) {
      setMessages([])
      setNextCursor(undefined)
      setHasMore(true)
      isInitialLoad.current = true // Reset cờ lần đầu khi chuyển hội thoại
      fetchMessages(true)
    }
  }, [convId])

  // THÊM MỚI: Xử lý giữ vị trí cuộn mượt mà
  useLayoutEffect(() => {
    if (containerRef.current) {
      if (isInitialLoad.current && messages.length > 0) {
        // Lần đầu load -> tự động cuộn xuống đáy ngay lập tức
        containerRef.current.scrollTop = containerRef.current.scrollHeight
        isInitialLoad.current = false
      } else if (isFetchingOlder) {
        // Khi load thêm tin nhắn cũ -> Tính chiều cao mới trừ chiều cao cũ để giữ nguyên khung nhìn
        const newScrollHeight = containerRef.current.scrollHeight
        containerRef.current.scrollTop = newScrollHeight - previousScrollHeightRef.current
        setIsFetchingOlder(false)
      }
    }
  }, [messages, isFetchingOlder])

  // --- Socket Connection ---
  useEffect(() => {
    if (!currentUserId || !convId) return

    // Chú ý: Đổi lại port 4000 cho khớp với toàn dự án
    const socket = io('http://localhost:4001', {
      auth: {
        user_id: currentUserId
      }
    })

    socketRef.current = socket

    socket.on('receive_message', (newMessage: Message) => {
      if (newMessage.conversationId === convId) {
        setMessages((prevMessages) => [...prevMessages, newMessage])

        // Auto-scroll to bottom khi có tin mới
        setTimeout(() => {
          if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight
          }
        }, 50)
      }
    })

    return () => {
      socket.off('receive_message')
      socket.disconnect()
    }
  }, [currentUserId, convId])

  // THÊM MỚI: Hàm xử lý khi người dùng lăn chuột
  const handleScroll = () => {
    if (containerRef.current) {
      // Bắt sự kiện người dùng cuộn kịch trần (khoảng cách < 5px cho mượt)
      if (containerRef.current.scrollTop <= 5 && !isLoading && hasMore) {
        fetchMessages(false)
      }
    }
  }

  const getInitials = (name?: string) => {
    if (!name || name.trim() === '') return 'U'
    return name.trim().charAt(0).toUpperCase()
  }

  return (
    <div className='flex-1 overflow-y-auto bg-muted/20 p-4' ref={containerRef} onScroll={handleScroll}>
      <div className='flex flex-col gap-4'>
        {/* Loader khi scroll lên */}
        {isLoading && hasMore && (
          <div className='text-center text-xs text-muted-foreground py-2'>Đang tải tin nhắn cũ...</div>
        )}

        {messages.map((msg) => {
          const isMe = msg.sender?._id === currentUserId
          const senderName = msg.sender?.userName || 'User'

          const time = new Date(msg.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })

          return (
            <div key={msg._id} className={`flex gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
              {!isMe && (
                <Avatar className='h-8 w-8 shrink-0 mt-1'>
                  <AvatarImage src={msg.sender?.avatar} alt={senderName} />
                  <AvatarFallback className='text-xs font-semibold bg-blue-100 text-blue-600'>
                    {getInitials(senderName)}
                  </AvatarFallback>
                </Avatar>
              )}

              <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[70%]`}>
                <div
                  className={`px-4 py-2 rounded-2xl ${
                    isMe
                      ? 'bg-gradient-to-r from-[#6b45e9] to-[#a139e4] text-white rounded-tr-sm'
                      : 'bg-background border border-border text-foreground rounded-tl-sm'
                  }`}
                >
                  <p className='text-sm leading-relaxed'>{msg.content}</p>
                </div>
                <span className='text-[11px] text-muted-foreground mt-1 px-1'>{time}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
