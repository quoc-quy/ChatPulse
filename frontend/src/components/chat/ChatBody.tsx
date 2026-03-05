// frontend-demo/src/components/chat/ChatBody.tsx
import { useEffect, useState, useRef, useCallback, useContext, useLayoutEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import { messagesApi } from '@/apis/messages.api'
import type { Message } from '@/types/message.type'
import { AppContext } from '@/context/app.context'
import { MessageItem } from './MessageItem'
import { formatZaloMessageTime, shouldShowTimeDivider } from '@/utils/time'

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

        if (!isInitial && containerRef.current) {
          setIsFetchingOlder(true)
          previousScrollHeightRef.current = containerRef.current.scrollHeight
        }

        const response = await messagesApi.getMessages({
          convId,
          cursor: isInitial ? undefined : nextCursor,
          limit: 20
        })

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
      isInitialLoad.current = true
      fetchMessages(true)
    }
  }, [convId])

  useLayoutEffect(() => {
    if (containerRef.current) {
      if (isInitialLoad.current && messages.length > 0) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight
        isInitialLoad.current = false
      } else if (isFetchingOlder) {
        const newScrollHeight = containerRef.current.scrollHeight
        containerRef.current.scrollTop = newScrollHeight - previousScrollHeightRef.current
        setIsFetchingOlder(false)
      }
    }
  }, [messages, isFetchingOlder])

  useEffect(() => {
    if (!currentUserId || !convId) return

    const socket = io('http://localhost:4001', {
      auth: {
        user_id: currentUserId
      }
    })

    socketRef.current = socket

    socket.on('receive_message', (newMessage: Message) => {
      if (newMessage.conversationId === convId) {
        setMessages((prevMessages) => [...prevMessages, newMessage])

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

  const handleScroll = () => {
    if (containerRef.current) {
      if (containerRef.current.scrollTop <= 5 && !isLoading && hasMore) {
        fetchMessages(false)
      }
    }
  }

  return (
    <div className='flex-1 overflow-y-auto bg-muted/10 p-4 scroll-smooth' ref={containerRef} onScroll={handleScroll}>
      <div className='flex flex-col'>
        {isLoading && hasMore && (
          <div className='flex justify-center py-4'>
            <span className='px-4 py-1 bg-muted rounded-full text-[12px] text-muted-foreground animate-pulse'>
              Đang tải tin nhắn cũ...
            </span>
          </div>
        )}

        {messages.map((msg, index) => {
          const isMe = msg.sender?._id === currentUserId
          const senderName = msg.sender?.userName || 'User'

          const displayTime = new Date(msg.createdAt).toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit'
          })

          const previousMsg = index > 0 ? messages[index - 1] : undefined
          const nextMsg = index < messages.length - 1 ? messages[index + 1] : undefined

          const showTimeDivider = shouldShowTimeDivider(msg.createdAt, previousMsg?.createdAt)
          const dividerTimeStr = showTimeDivider ? formatZaloMessageTime(msg.createdAt) : ''

          // 1. Tính toán xem có phải tin nhắn ĐẦU TIÊN của một nhóm không (để hiện Avatar)
          let isFirstInGroup = true
          if (previousMsg && !showTimeDivider) {
            const isSameSender = previousMsg.sender?._id === msg.sender?._id
            const diffInMinutes =
              (new Date(msg.createdAt).getTime() - new Date(previousMsg.createdAt).getTime()) / (1000 * 60)

            if (isSameSender && diffInMinutes < 5) {
              isFirstInGroup = false // Thuộc cùng nhóm và gửi liên tiếp -> Ẩn Avatar đi
            }
          }

          // 2. Tính toán xem có phải tin nhắn CUỐI CÙNG của một nhóm không (để hiện Thời Gian)
          let isLastInGroup = true
          if (nextMsg) {
            // Xem tin tiếp theo có bị ngăn cách bởi mốc thời gian không
            const nextMsgShowDivider = shouldShowTimeDivider(nextMsg.createdAt, msg.createdAt)
            if (!nextMsgShowDivider) {
              const isSameSender = nextMsg.sender?._id === msg.sender?._id
              const diffInMinutes =
                (new Date(nextMsg.createdAt).getTime() - new Date(msg.createdAt).getTime()) / (1000 * 60)

              if (isSameSender && diffInMinutes < 5) {
                isLastInGroup = false // Có tin nhắn mới hơn phía dưới -> Ẩn thời gian đi
              }
            }
          }

          return (
            <MessageItem
              key={msg._id}
              message={msg}
              isMe={isMe}
              senderName={senderName}
              displayTime={displayTime}
              showTimeDivider={showTimeDivider}
              dividerTimeStr={dividerTimeStr}
              isFirstInGroup={isFirstInGroup} // Truyền cờ nhóm xuống Component
              isLastInGroup={isLastInGroup}
            />
          )
        })}
      </div>
    </div>
  )
}
