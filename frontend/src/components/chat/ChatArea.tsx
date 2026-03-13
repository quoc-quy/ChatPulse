import { ChatHeader } from './ChatHeader'
import { ChatBody } from './ChatBody'
import { ChatFooter } from './ChatFooter'
import { ChatInfoPanel } from './ChatInfoPanel'
import type { ChatItem } from '@/context/app.context'
import { useContext, useEffect, useState } from 'react'
import { AppContext } from '@/context/app.context'
import { useSocket } from '@/context/socket.context'
import { messagesApi, type ConversationSummary } from '@/apis/messages.api'

interface ChatAreaProps {
  chat: ChatItem
}

export function ChatArea({ chat }: ChatAreaProps) {
  const { socket } = useSocket()
  const { setActiveCall } = useContext(AppContext)

  const [isSummarizing, setIsSummarizing] = useState(false)
  const [summaryData, setSummaryData] = useState<ConversationSummary | null>(null)
  const [initialUnread, setInitialUnread] = useState(0)

  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(true)

  useEffect(() => {
    setInitialUnread(chat.unreadCount || 0)
  }, [chat.id])

  useEffect(() => {
    setSummaryData(null)
    setIsSummarizing(false)
    setIsInfoPanelOpen(true)
  }, [chat.id])

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
          <ChatBody convId={chat.id} />
          <ChatFooter convId={chat.id} />
        </div>
      </div>

      {isInfoPanelOpen && <ChatInfoPanel chat={chat} onClose={() => setIsInfoPanelOpen(false)} />}
    </div>
  )
}
