import { ChatHeader } from './ChatHeader'
import { ChatBody } from './ChatBody'
import { ChatFooter } from './ChatFooter'
import type { ChatItem } from '@/context/app.context'
import { useContext } from 'react'
import { AppContext } from '@/context/app.context'
import { useSocket } from '@/context/socket.context'

interface ChatAreaProps {
  chat: ChatItem
}

export function ChatArea({ chat }: ChatAreaProps) {
  const { socket } = useSocket()
  const { setActiveCall } = useContext(AppContext)

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
      <ChatHeader chat={chat} onStartCall={handleStartCall} />
      <ChatBody convId={chat.id} />
      <ChatFooter convId={chat.id} />
    </div>
  )
}
