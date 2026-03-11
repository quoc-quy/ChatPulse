import { ChatHeader } from './ChatHeader'
import { ChatBody } from './ChatBody'
import { ChatFooter } from './ChatFooter'
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

  useEffect(() => {
    // Chỉ cập nhật khi đổi sang nhóm chat khác
    setInitialUnread(chat.unreadCount || 0)
  }, [chat.id]) // Dependency là chat.id

  const handleSummarize = async () => {
    try {
      setIsSummarizing(true)

      const unreadCount = initialUnread > 0 ? initialUnread : 0

      // KIỂM TRA NGAY TẠI FRONTEND:
      // Nếu không có tin nhắn mới -> Báo luôn, KHÔNG GỌI API (Tiết kiệm thời gian & tiền bạc)
      if (unreadCount === 0) {
        setSummaryData({
          topic: 'Không có tin nhắn mới nào cần tóm tắt',
          decisions: [],
          openQuestions: [],
          actionItems: []
        })
        return
      }

      // CHỈ lấy đúng số lượng tin nhắn chưa đọc, không lấy dư tin nhắn cũ nữa
      const limitToFetch = unreadCount

      const res = await messagesApi.summarizeConversation(chat.id, limitToFetch, unreadCount)
      setSummaryData(res.data.result)
    } catch (error) {
      console.error(error)
    } finally {
      setIsSummarizing(false)
    }
  }

  // Hàm điều hướng đến tin nhắn gốc
  const jumpToMessage = (messageId: string) => {
    const el = document.getElementById(`message-${messageId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('bg-yellow-100/50') // Highlight tạm thời
      setTimeout(() => el.classList.remove('bg-yellow-100/50'), 2000)
    }
  }

  // Phát tín hiệu gọi
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
        // Cập nhật State toàn cục
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
    <div className='relative flex h-screen flex-col bg-background w-full overflow-hidden'>
      <ChatHeader chat={chat} onStartCall={handleStartCall} onSummarize={handleSummarize} />

      {/* Cửa sổ hiển thị tóm tắt (có thể dùng dialog/sheet của shadcn) */}
      {isSummarizing && (
        <div className='absolute top-16 right-4 z-200 bg-white p-4 shadow-lg rounded'>Đang phân tích bằng AI...</div>
      )}
      {summaryData && (
        <div className='absolute top-16 right-4 z-10 w-96 bg-card border text-foreground shadow-xl rounded-xl p-4 overflow-y-auto max-h-[80vh]'>
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
  )
}
