/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChatHeader } from './ChatHeader'
import { ChatBody } from './ChatBody'
import { ChatFooter } from './ChatFooter'
import { ChatInfoPanel } from './ChatInfoPanel'
import type { ChatItem } from '@/context/app.context'
import { useContext, useEffect, useState } from 'react'
import { AppContext } from '@/context/app.context'
import { useSocket } from '@/context/socket.context'
import { messagesApi, type ConversationSummary } from '@/apis/messages.api'
import { conversationsApi } from '@/apis/conversations.api'
import { AIChatArea } from './AIChatArea'
import { AddMemberModal } from './info-panel/AddMemberModal'
import { toast } from 'sonner'
import PinnedBanner from './PinnedBanner'

interface ChatAreaProps {
  chat: ChatItem
}

export function ChatArea({ chat }: ChatAreaProps) {
  const { socket } = useSocket()
  const { setActiveCall, setActiveChat } = useContext(AppContext)
  const [pinnedMessages, setPinnedMessages] = useState<any[]>([])

  const [isSummarizing, setIsSummarizing] = useState(false)
  const [summaryData, setSummaryData] = useState<ConversationSummary | null>(null)
  const [initialUnread, setInitialUnread] = useState(0)
  const isDisbanded = chat.isDisbanded === true
  const [forwardModalOpen, setForwardModalOpen] = useState(false)
  const [forwardMsgId, setForwardMsgId] = useState<string>('')
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(true)

  const handleLeaveSuccess = () => {
    setActiveChat(null) // Đóng màn hình chat hiện tại
    window.dispatchEvent(new Event('refresh_chat_list')) // Gọi Sidebar tải lại danh sách
  }

  useEffect(() => {
    setInitialUnread(chat.unreadCount || 0)
  }, [chat.id])

  useEffect(() => {
    setSummaryData(null)
    setIsSummarizing(false)
    setIsInfoPanelOpen(true)
  }, [chat.id])

  useEffect(() => {
    const handleOpenForward = (e: any) => {
      setForwardMsgId(e.detail.messageId)
      setForwardModalOpen(true)
    }
    window.addEventListener('open_forward_modal', handleOpenForward)
    return () => window.removeEventListener('open_forward_modal', handleOpenForward)
  }, [])

  useEffect(() => {
    const handlePinnedUpdate = (data: any) => {
      if (data.conversationId === chat?.id) {
        setPinnedMessages(data.pinnedMessages)
      }
    }
    socket?.on('pinned_messages_updated', handlePinnedUpdate)
    return () => {
      socket?.off('pinned_messages_updated', handlePinnedUpdate)
    }
  }, [socket, chat])

  const handlePinMessage = async (messageId: string, action: 'pin' | 'unpin') => {
    try {
      await messagesApi.pinMessage(messageId, action)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra')
    }
  }

  // HÀM MỚI: Tự động fetch lại thông tin chi tiết của đoạn chat hiện tại để cập nhật Participants
  const handleMemberUpdate = async () => {
    try {
      // Giả sử backend trả về danh sách các conversation, ta lấy lại cái hiện tại
      const res = await conversationsApi.getConversations()
      const rawData = res.data?.result || res.data?.data || res.data
      if (Array.isArray(rawData)) {
        const updatedConversation = rawData.find((c: any) => c._id === chat.id)
        if (updatedConversation) {
          setActiveChat((prev) => {
            if (!prev) return prev
            return {
              ...prev,
              participants: updatedConversation.participants,
              name: updatedConversation.name,
              isDisbanded: updatedConversation.is_disbanded
            }
          })
        }
      }
    } catch (error) {
      console.error('Lỗi khi fetch lại conversation:', error)
    }
  }

  const handleSummarize = async () => {
    try {
      setIsSummarizing(true)
      const unreadCount = initialUnread > 0 ? initialUnread : 0

      if (unreadCount === 0) {
        setSummaryData({
          topic: 'Không có tin nhắn mới nào cần tóm tắt',
          decisions: [],
          openQuestions: [],
          actionItems: []
        })
        return
      }

      const limitToFetch = unreadCount
      const res = await messagesApi.summarizeConversation(chat.id, limitToFetch, unreadCount)
      setSummaryData(res.data.result)
    } catch (error) {
      console.error(error)
    } finally {
      setIsSummarizing(false)
    }
  }

  const jumpToMessage = (messageId: string) => {
    const el = document.getElementById(`message-${messageId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('bg-yellow-100/50')
      setTimeout(() => el.classList.remove('bg-yellow-100/50'), 2000)
    }
  }

  const handleStartCall = (type: 'video' | 'audio') => {
    if (!socket) {
      alert('Chưa kết nối đến máy chủ Chat!')
      return
    }

    const timeout = setTimeout(() => {
      alert('Máy chủ không phản hồi. Vui lòng thử lại.')
    }, 5000)

    socket.emit('call:initiate', { conversationId: chat.id, type }, (response: { callId: string }) => {
      clearTimeout(timeout)
      if (response && response.callId) {
        setActiveCall({
          callId: response.callId,
          conversationId: chat.id,
          type,
          isReceiving: false
        })
      }
    })
  }

  if (chat.type === 'ai') {
    return <AIChatArea chat={chat} />
  }

  return (
    <div className='flex h-screen w-full overflow-hidden'>
      <div className='flex-1 flex flex-col relative min-w-0 bg-background'>
        <ChatHeader
          chat={chat}
          onStartCall={handleStartCall}
          onSummarize={handleSummarize}
          onToggleInfoPanel={() => setIsInfoPanelOpen(!isInfoPanelOpen)}
          isInfoPanelOpen={isInfoPanelOpen}
        />

        <PinnedBanner
          pinnedMessages={pinnedMessages}
          onUnpin={(id) => handlePinMessage(id, 'unpin')}
          onJumpToMessage={jumpToMessage}
        />

        {isSummarizing && (
          <div className='absolute top-20 right-4 z-50 bg-white p-4 shadow-lg rounded animate-pulse'>
            Đang phân tích bằng AI...
          </div>
        )}
        {summaryData && (
          <div className='absolute top-20 right-4 z-50 w-96 bg-card border text-foreground shadow-xl rounded-xl p-4 overflow-y-auto max-h-[80vh]'>
            <h3 className='font-bold text-lg mb-2'>⚡ Tóm tắt: {summaryData.topic}</h3>
            <h4 className='font-semibold mt-3 text-blue-600'>Quyết định quan trọng:</h4>
            <ul className='list-disc pl-5 text-sm'>
              {summaryData.decisions.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
            <h4 className='font-semibold mt-3 text-red-500'>Hành động cần làm:</h4>
            <ul className='space-y-2 text-sm mt-1'>
              {summaryData.actionItems.map((task, i) => (
                <li key={i} className='bg-muted p-2 rounded'>
                  <span className='font-semibold'>@{task.assignee}</span>: {task.task}
                  {task.messageId && (
                    <button
                      onClick={() => jumpToMessage(task.messageId)}
                      className='ml-2 text-xs text-blue-500 hover:underline'
                    >
                      (Xem gốc)
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <button onClick={() => setSummaryData(null)} className='mt-4 w-full bg-secondary p-2 rounded'>
              Đóng
            </button>
          </div>
        )}

        <div className='relative z-0 flex-1 flex flex-col overflow-hidden'>
          {isDisbanded ? (
            // Giao diện khi nhóm bị giải tán
            <div className='flex-1 flex items-center justify-center bg-muted/20 p-4'>
              <div className='bg-background border border-border p-6 rounded-lg text-center shadow-sm max-w-md'>
                <div className='text-red-500 font-semibold mb-2'>⚠️ Nhóm đã bị giải tán</div>
                <p className='text-sm text-muted-foreground'>
                  Nhóm trưởng đã giải tán nhóm này. Bạn không thể xem lịch sử trò chuyện hay gửi tin nhắn mới.
                </p>
              </div>
            </div>
          ) : (
            <>
              <ChatBody convId={chat.id} pinnedMessages={pinnedMessages} onPinMessage={handlePinMessage} />
              {/* Nếu giải tán thì chỉ ẩn/thay thế phần Footer nhập tin nhắn */}
              {isDisbanded ? (
                <div className='p-4 bg-muted/20 border-t border-border flex items-center justify-center min-h-[72px]'>
                  <p className='text-sm text-red-500 font-medium text-center'>
                    ⚠️ Nhóm trưởng đã giải tán nhóm này. Bạn không thể gửi tin nhắn mới.
                  </p>
                </div>
              ) : (
                <ChatFooter convId={chat.id} />
              )}
            </>
          )}
        </div>
      </div>

      {isInfoPanelOpen && !isDisbanded && (
        <ChatInfoPanel
          chat={chat}
          onClose={() => setIsInfoPanelOpen(false)}
          onMemberUpdate={handleMemberUpdate}
          onLeaveSuccess={handleLeaveSuccess}
        />
      )}

      <AddMemberModal
        isOpen={forwardModalOpen}
        onClose={() => setForwardModalOpen(false)}
        mode='forward'
        messageIdToForward={forwardMsgId}
      />
    </div>
  )
}
