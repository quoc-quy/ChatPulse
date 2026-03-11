import { useEffect, useState, useRef, useCallback, useContext, useLayoutEffect } from 'react'
import { useSocket } from '@/context/socket.context'
import { messagesApi } from '@/apis/messages.api'
import type { Message } from '@/types/message.type'
import { AppContext } from '@/context/app.context'
import { MessageItem } from '../messages/MessageItem'
import { formatZaloMessageTime, shouldShowTimeDivider } from '@/utils/time'
import { ChevronDown } from 'lucide-react' // FIX 3: Import icon nút Scroll

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

  // FIX 3: State quản lý hiển thị nút Scroll to Bottom
  const [showScrollButton, setShowScrollButton] = useState(false)

  const isInitialLoad = useRef(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const previousScrollHeightRef = useRef<number>(0)
  const { socket } = useSocket()

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
        if (newMessages.length < 20) setHasMore(false)
        if (newMessages.length > 0) {
          const oldestMessageInBatch = newMessages[newMessages.length - 1]
          setNextCursor(oldestMessageInBatch._id)
        }
        if (isInitial) {
          setMessages([...newMessages].reverse())
        } else {
          setMessages((prev) => {
            const combined = [...[...newMessages].reverse(), ...prev]
            const uniqueMessages = Array.from(new Map(combined.map((msg) => [msg._id, msg])).values())
            return uniqueMessages
          })
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
        setTimeout(() => {
          if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight
            isInitialLoad.current = false
          }
        }, 100)
      } else if (isFetchingOlder) {
        const newScrollHeight = containerRef.current.scrollHeight
        containerRef.current.scrollTop = newScrollHeight - previousScrollHeightRef.current
        setIsFetchingOlder(false)
      }
    }
  }, [messages, isFetchingOlder])

  useEffect(() => {
    if (!currentUserId || !convId || !socket) return
    const handleReceiveMessage = (newMessage: Message) => {
      if (newMessage.conversationId === convId) {
        setMessages((prevMessages) => {
          if (prevMessages.some((msg) => msg._id === newMessage._id)) return prevMessages
          return [...prevMessages, newMessage]
        })
        setTimeout(() => {
          if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight
          }
        }, 50)
      }
    }

    const handleMessageReacted = ({ messageId, reactions }: { messageId: string; reactions: any[] }) => {
      setMessages((prevMessages) => prevMessages.map((msg) => (msg._id === messageId ? { ...msg, reactions } : msg)))
    }

    const handleMessageRevoked = ({ messageId, conversationId }: { messageId: string; conversationId: string }) => {
      if (conversationId === convId) {
        setMessages((prevMessages) =>
          prevMessages.map((msg) => (msg._id === messageId ? { ...msg, type: 'revoked', content: '' } : msg))
        )
      }
    }

    socket.on('receive_message', handleReceiveMessage)
    socket.on('message_reacted', handleMessageReacted)
    socket.on('message_revoked', handleMessageRevoked)
    return () => {
      socket.off('receive_message', handleReceiveMessage)
      socket.off('message_reacted', handleMessageReacted)
      socket.off('message_revoked', handleMessageRevoked)
    }
  }, [currentUserId, convId, socket])

  const handleScroll = () => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current

      // Load thêm lịch sử cũ
      if (scrollTop <= 5 && !isLoading && hasMore) {
        fetchMessages(false)
      }

      // Hiện nút nếu cách đáy hơn 150px
      const distanceToBottom = scrollHeight - scrollTop - clientHeight
      setShowScrollButton(distanceToBottom > 150)
    }
  }

  const handleDeleteForMe = async (messageId: string) => {
    try {
      // 1. Xác định xem đây có phải là tin nhắn cuối cùng (mới nhất) không
      const isLastMessage = messages.length > 0 && messages[messages.length - 1]._id === messageId
      let previousMessage = null

      // Nếu là tin cuối, lấy tin nhắn áp chót (kế cuối) để gửi ra Sidebar
      if (isLastMessage && messages.length > 1) {
        previousMessage = messages[messages.length - 2]
      }

      // 2. Cập nhật UI ngay lập tức
      setMessages((prev) => prev.filter((msg) => msg._id !== messageId))

      // 3. Gọi API
      await messagesApi.deleteMessageForMe(messageId)

      // 4. Phát sự kiện ra cho Sidebar cập nhật (Nếu vừa xóa tin cuối cùng)
      if (isLastMessage) {
        window.dispatchEvent(
          new CustomEvent('local_message_deleted', {
            detail: {
              conversationId: convId,
              newLastMessage: previousMessage
            }
          })
        )
      }
    } catch (error) {
      console.error('Lỗi khi xóa tin nhắn ở phía tôi:', error)
    }
  }

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth'
      })
    }
  }

  return (
    // Sử dụng Relative làm Wrapper chứa nút Floating
    <div className='relative flex-1 flex flex-col overflow-hidden bg-muted/10'>
      <div className='flex-1 overflow-y-auto p-4 scroll-smooth' ref={containerRef} onScroll={handleScroll}>
        <div className='flex flex-col'>
          {isLoading && hasMore && (
            <div className='flex justify-center py-4'>
              <span className='px-4 py-1 bg-muted rounded-full text-[12px] text-muted-foreground animate-pulse'>
                Đang tải tin nhắn...
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

            let isFirstInGroup = true
            if (previousMsg && !showTimeDivider) {
              const isSameSender = previousMsg.sender?._id === msg.sender?._id
              const diffInMinutes =
                (new Date(msg.createdAt).getTime() - new Date(previousMsg.createdAt).getTime()) / (1000 * 60)
              if (isSameSender && diffInMinutes < 5) isFirstInGroup = false
            }

            let isLastInGroup = true
            if (nextMsg) {
              const nextMsgShowDivider = shouldShowTimeDivider(nextMsg.createdAt, msg.createdAt)
              if (!nextMsgShowDivider) {
                const isSameSender = nextMsg.sender?._id === msg.sender?._id
                const diffInMinutes =
                  (new Date(nextMsg.createdAt).getTime() - new Date(msg.createdAt).getTime()) / (1000 * 60)
                if (isSameSender && diffInMinutes < 5) isLastInGroup = false
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
                isFirstInGroup={isFirstInGroup}
                isLastInGroup={isLastInGroup}
                onDeleteForMe={handleDeleteForMe}
              />
            )
          })}
        </div>
      </div>

      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className='absolute bottom-6 right-6 p-2.5 bg-background border border-border shadow-xl rounded-full text-primary hover:bg-primary/10 hover:scale-110 transition-all z-50 animate-in fade-in zoom-in'
        >
          <ChevronDown className='w-6 h-6' />
        </button>
      )}
    </div>
  )
}
