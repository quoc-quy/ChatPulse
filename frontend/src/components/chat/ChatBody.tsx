/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useRef, useCallback, useContext, useLayoutEffect } from 'react'
import { useSocket } from '@/context/socket.context'
import { messagesApi } from '@/apis/messages.api'
import type { Message } from '@/types/message.type'
import { AppContext } from '@/context/app.context'
import { MessageItem } from '../messages/MessageItem'
import { formatZaloMessageTime, shouldShowTimeDivider } from '@/utils/time'
import { ChevronDown } from 'lucide-react'

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

        // AUTO BÁO ĐÃ XEM KHI LOAD TIN NHẮN
        if (socket) {
          newMessages.forEach((msg) => {
            if (msg.sender._id !== currentUserId && (!msg.seenBy || !msg.seenBy.includes(currentUserId))) {
              socket.emit('message_seen', { messageId: msg._id, conversationId: convId })
            }
          })
        }

        if (isInitial) {
          setMessages([...newMessages].reverse())
        } else {
          setMessages((prev) => {
            const combined = [...[...newMessages].reverse(), ...prev]
            return Array.from(new Map(combined.map((msg) => [msg._id, msg])).values())
          })
        }
      } catch (error) {
        console.error('Lỗi khi tải lịch sử:', error)
      } finally {
        setIsLoading(false)
      }
    },
    [convId, nextCursor, isLoading, hasMore, socket, currentUserId]
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

    // 1. NHẬN TIN NHẮN TỪ SOCKET
    const handleReceiveMessage = (newMessage: Message) => {
      if (newMessage.conversationId === convId) {
        setMessages((prev) => {
          // Bỏ qua nếu tin nhắn thực sự đã tồn tại
          if (prev.some((msg) => msg._id === newMessage._id)) return prev

          if (newMessage.replyToId && !newMessage.replyToMessage) {
            const repliedMsg = prev.find((m) => m._id === newMessage.replyToId)
            if (repliedMsg) {
              newMessage.replyToMessage = {
                _id: repliedMsg._id,
                content: repliedMsg.content,
                type: repliedMsg.type,
                senderName: repliedMsg.sender?.userName || 'Người dùng'
              }
            }
          }

          // FIX 2: Xử lý nhân đôi tin nhắn cho Media (vì lúc tạm content là blob:..., lúc thật là http...)
          const isMe = newMessage.sender._id === currentUserId
          if (isMe) {
            const tempIndex = prev.findIndex(
              (msg) =>
                msg.status === 'SENDING' &&
                // Kiểm tra text trùng nhau, HOẶC cả 2 đều là media
                (msg.content === newMessage.content || (msg.type === 'media' && newMessage.type === 'media'))
            )

            if (tempIndex !== -1) {
              const newArr = [...prev]
              // Giữ lại Reply UI nếu socket chưa gắn kèm
              if (!newMessage.replyToMessage && newArr[tempIndex].replyToMessage) {
                newMessage.replyToMessage = newArr[tempIndex].replyToMessage
              }
              newArr[tempIndex] = newMessage // Chuyển từ ảo thành thật
              return newArr
            }
          }

          return [...prev, newMessage]
        })

        setTimeout(() => {
          if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight
        }, 50)

        if (newMessage.sender._id !== currentUserId) {
          socket.emit('message_seen', { messageId: newMessage._id, conversationId: convId })
        }
      }
    }

    const handleMessageStatusUpdate = ({ messageId, status, userId }: any) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg._id === messageId) {
            const updatedMsg = { ...msg }
            if (status === 'DELIVERED') {
              updatedMsg.status = msg.status !== 'SEEN' ? 'DELIVERED' : 'SEEN'
              if (!updatedMsg.deliveredTo) updatedMsg.deliveredTo = []
              if (!updatedMsg.deliveredTo.includes(userId)) updatedMsg.deliveredTo.push(userId)
            }
            if (status === 'SEEN') {
              updatedMsg.status = 'SEEN'
              if (!updatedMsg.seenBy) updatedMsg.seenBy = []
              if (!updatedMsg.seenBy.includes(userId)) updatedMsg.seenBy.push(userId)
            }
            return updatedMsg
          }
          return msg
        })
      )
    }

    const handleMessageReacted = ({ messageId, reactions }: any) => {
      setMessages((prev) => prev.map((msg) => (msg._id === messageId ? { ...msg, reactions } : msg)))
    }

    const handleMessageRevoked = ({ messageId, conversationId }: any) => {
      if (conversationId === convId) {
        setMessages((prev) =>
          prev.map((msg) => (msg._id === messageId ? { ...msg, type: 'revoked', content: '' } : msg))
        )
      }
    }

    const handleOptimisticBlocked = (e: any) => {
      const { tempId, errorMessage } = e.detail
      setMessages((prev: any[]) =>
        prev.map((msg) =>
          msg._id === tempId
            ? { ...msg, type: 'system', content: errorMessage, isWarning: true } // Đổi type thành system, gắn cờ isWarning
            : msg
        )
      )
    }

    socket.on('receive_message', handleReceiveMessage)
    socket.on('message_status_update', handleMessageStatusUpdate)
    socket.on('message_reacted', handleMessageReacted)
    socket.on('message_revoked', handleMessageRevoked)

    // ===============================================
    // LẮNG NGHE OPTIMISTIC UI TỪ CHATFOOTER
    // ===============================================
    const handleOptSend = (e: any) => {
      setMessages((prev) => [...prev, e.detail])
      setTimeout(() => {
        if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight
      }, 10)
    }

    const handleOptSuccess = (e: any) => {
      const { tempId, realMessage } = e.detail
      setMessages((prev) => {
        // GIỮ LẠI TRÍCH DẪN TỪ UI NẾU API THIẾU
        const tempMsg = prev.find((m) => m._id === tempId)
        if (tempMsg?.replyToMessage && !realMessage.replyToMessage) {
          realMessage.replyToMessage = tempMsg.replyToMessage
        }

        const isRealExist = prev.some((msg) => msg._id === realMessage._id)
        if (isRealExist) {
          return prev.filter((msg) => msg._id !== tempId)
        }
        return prev.map((msg) => (msg._id === tempId ? realMessage : msg))
      })
    }

    // 3. XỬ LÝ LỖI (OFFLINE QUEUE HIỂN THỊ)
    const handleOptFail = (e: any) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === e.detail.tempId
            ? { ...msg, status: 'FAILED', _apiCall: e.detail.apiCall } // Lưu lại apiCall để Retry
            : msg
        )
      )
    }

    const handleOptRetryStart = (e: any) => {
      setMessages((prev) => prev.map((msg) => (msg._id === e.detail.tempId ? { ...msg, status: 'SENDING' } : msg)))
    }

    window.addEventListener('optimistic_send', handleOptSend)
    window.addEventListener('optimistic_success', handleOptSuccess)
    window.addEventListener('optimistic_fail', handleOptFail)
    window.addEventListener('optimistic_retry_start', handleOptRetryStart)
    window.addEventListener('optimistic_blocked', handleOptimisticBlocked)

    return () => {
      socket.off('receive_message', handleReceiveMessage)
      socket.off('message_status_update', handleMessageStatusUpdate)
      socket.off('message_reacted', handleMessageReacted)
      socket.off('message_revoked', handleMessageRevoked)

      window.removeEventListener('optimistic_send', handleOptSend)
      window.removeEventListener('optimistic_success', handleOptSuccess)
      window.removeEventListener('optimistic_fail', handleOptFail)
      window.removeEventListener('optimistic_retry_start', handleOptRetryStart)
      window.removeEventListener('optimistic_blocked', handleOptimisticBlocked)
    }
  }, [currentUserId, convId, socket])

  const handleScroll = () => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current
      if (scrollTop <= 5 && !isLoading && hasMore) {
        fetchMessages(false)
      }
      const distanceToBottom = scrollHeight - scrollTop - clientHeight
      setShowScrollButton(distanceToBottom > 150)
    }
  }

  const handleDeleteForMe = async (messageId: string) => {
    try {
      const isLastMessage = messages.length > 0 && messages[messages.length - 1]._id === messageId
      let previousMessage = null
      if (isLastMessage && messages.length > 1) {
        previousMessage = messages[messages.length - 2]
      }
      setMessages((prev) => prev.filter((msg) => msg._id !== messageId))
      await messagesApi.deleteMessageForMe(messageId)
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
      console.error('Lỗi khi xóa tin nhắn:', error)
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
