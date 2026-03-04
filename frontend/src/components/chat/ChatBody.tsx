// frontend-demo/src/components/chat/ChatBody.tsx
import { useEffect, useState, useRef, useCallback, useContext } from 'react'
import { io, Socket } from 'socket.io-client' // Add this import
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { messagesApi } from '@/apis/messages.api'
import type { Message } from '@/types/message.type'
import { AppContext } from '@/context/app.context'
// Import getProfileFromLS or get the user ID from context to pass to the socket connection

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

  const containerRef = useRef<HTMLDivElement>(null)
  const previousScrollHeightRef = useRef<number>(0)
  const socketRef = useRef<Socket | null>(null) // Keep a reference to the socket

  const fetchMessages = useCallback(
    async (isInitial = false) => {
      // ... (Your existing fetchMessages logic remains exactly the same)
      if (!convId || convId.length !== 24) return

      if (isLoading || (!hasMore && !isInitial)) return

      try {
        setIsLoading(true)
        if (containerRef.current) {
          previousScrollHeightRef.current = containerRef.current.scrollHeight
        }

        const response = await messagesApi.getMessages({
          convId,
          cursor: isInitial ? undefined : nextCursor,
          limit: 20
        })

        const resData = (response as any).data !== undefined ? (response as any).data : response
        const newMessages: Message[] = resData.result || []

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
      fetchMessages(true)
    }
  }, [convId])

  // --- NEW: Socket Connection and Listener ---
  useEffect(() => {
    if (!currentUserId || !convId) return

    // Connect to the socket server
    // Replace URL with your actual backend URL if different
    const socket = io('http://localhost:4001', {
      auth: {
        user_id: currentUserId // Required by your backend SocketService
      }
    })

    socketRef.current = socket

    socket.on('connect', () => {
      console.log('Connected to socket server')
    })

    // Listen for incoming messages
    socket.on('receive_message', (newMessage: Message) => {
      // Only append if the message belongs to the currently open conversation
      if (newMessage.conversationId === convId) {
        setMessages((prevMessages) => [...prevMessages, newMessage])

        // Auto-scroll to bottom
        setTimeout(() => {
          if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight
          }
        }, 50)
      }
    })

    // Cleanup on unmount or when dependencies change
    return () => {
      socket.off('receive_message')
      socket.disconnect()
    }
  }, [currentUserId, convId])
  // -------------------------------------------

  const handleScroll = () => {
    // ... (Your existing handleScroll logic)
  }

  useEffect(() => {
    // ... (Your existing scroll position logic for pagination)
  }, [messages, isLoading])

  useEffect(() => {
    if (!nextCursor && containerRef.current && messages.length > 0) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [messages])

  const getInitials = (name?: string) => {
    if (!name || name.trim() === '') return 'U'
    return name.trim().charAt(0).toUpperCase()
  }

  return (
    <div className='flex-1 overflow-y-auto bg-muted/20 p-4' ref={containerRef} onScroll={handleScroll}>
      <div className='flex flex-col gap-4'>
        {/* ... (Your existing rendering logic remains exactly the same) */}
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

        {!hasMore && messages.length > 0 && (
          <div className='text-center text-xs text-muted-foreground py-4'>Bắt đầu cuộc trò chuyện</div>
        )}
      </div>
    </div>
  )
}
