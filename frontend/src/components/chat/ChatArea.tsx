// frontend-demo/src/components/chat/ChatArea.tsx
import { ChatHeader } from './ChatHeader'
import { ChatBody } from './ChatBody'
import { ChatFooter } from './ChatFooter'
import type { ChatItem } from '@/context/app.context'
import { useState, useEffect, useContext } from 'react'
import { AppContext } from '@/context/app.context'
import { useSocket } from '@/context/socket.context'
import { VideoCallRoom } from './VideoCallRoom'
import { Phone, PhoneOff, Video } from 'lucide-react'

interface ChatAreaProps {
  chat: ChatItem
}

export function ChatArea({ chat }: ChatAreaProps) {
  const { profile } = useContext(AppContext)
  const { socket } = useSocket()

  // State quản lý luồng gọi
  const [activeCall, setActiveCall] = useState<{
    callId: string
    conversationId: string
    type: 'video' | 'audio'
    isReceiving: boolean
  } | null>(null)

  // 1. Lắng nghe người khác gọi mình
  useEffect(() => {
    if (!socket) return

    // Server báo có người gọi vào nhóm (hoặc cá nhân) này
    socket.on('call:incoming', (data: { callId: string; conversationId: string; type: 'video' | 'audio' }) => {
      // Chỉ nhận thông báo gọi nếu đang nằm đúng chat area này
      if (data.conversationId === chat.id) {
        setActiveCall({
          callId: data.callId,
          conversationId: data.conversationId,
          type: data.type,
          isReceiving: true
        })
      }
    })

    return () => {
      socket.off('call:incoming')
    }
  }, [socket, chat.id])

  // 2. Mình chủ động nhấn nút Gọi
  const handleStartCall = (type: 'video' | 'audio') => {
    if (!socket) {
      alert('Chưa kết nối đến máy chủ Chat (Socket null)!')
      return
    }

    console.log(`[Call] Đang gửi yêu cầu gọi ${type} lên server...`)

    // Cài timeout 5 giây: Nếu server không trả callback sẽ báo lỗi
    const timeout = setTimeout(() => {
      alert(
        'Máy chủ không phản hồi. Vui lòng kiểm tra lại Backend (socket.services.ts) xem đã gọi hàm callback trả về callId chưa!'
      )
    }, 5000)

    // Gửi sự kiện kèm Callback để nhận callId thật từ Backend
    socket.emit('call:initiate', { conversationId: chat.id, type }, (response: { callId: string }) => {
      clearTimeout(timeout) // Nhận được phản hồi thì hủy timeout
      console.log('[Call] Server trả về callId:', response)

      if (response && response.callId) {
        setActiveCall({
          callId: response.callId,
          conversationId: chat.id,
          type,
          isReceiving: false
        })
      } else {
        alert('Lỗi: Server không trả về callId!')
      }
    })
  }

  return (
    <div className='relative flex h-screen flex-col bg-background w-full overflow-hidden'>
      {/* HEADER (Truyền onStartCall xuống) */}
      <ChatHeader chat={chat} onStartCall={handleStartCall} />

      <ChatBody convId={chat.id} />
      <ChatFooter convId={chat.id} />

      {/* MODAL: AI ĐÓ ĐANG GỌI ĐẾN */}
      {activeCall?.isReceiving && (
        <div className='absolute inset-0 bg-background/80 backdrop-blur-sm z-40 flex items-center justify-center'>
          <div className='bg-card border shadow-xl rounded-2xl p-8 w-[320px] text-center animate-in fade-in zoom-in duration-300'>
            <div className='w-20 h-20 bg-muted rounded-full mx-auto mb-4 animate-pulse flex items-center justify-center border-2 border-primary'>
              {activeCall.type === 'video' ? (
                <Video size={32} className='text-primary' />
              ) : (
                <Phone size={32} className='text-primary' />
              )}
            </div>
            <h3 className='text-xl font-bold mb-2'>Cuộc gọi {activeCall.type === 'video' ? 'Video' : 'Thoại'}</h3>
            <p className='text-muted-foreground mb-8'>Ai đó trong nhóm đang gọi...</p>

            <div className='flex justify-center gap-6'>
              <button
                onClick={() => setActiveCall(null)}
                className='bg-destructive text-destructive-foreground p-4 rounded-full shadow-lg hover:scale-105 transition'
              >
                <PhoneOff size={24} />
              </button>
              <button
                onClick={() => setActiveCall({ ...activeCall, isReceiving: false })}
                className='bg-green-500 text-white p-4 rounded-full shadow-lg hover:scale-105 transition'
              >
                <Phone size={24} className='animate-bounce' />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UI PHÒNG GỌI WEBRTC */}
      {activeCall && !activeCall.isReceiving && (
        <VideoCallRoom
          socket={socket}
          callId={activeCall.callId}
          conversationId={activeCall.conversationId}
          currentUserId={profile?._id || ''}
          isVideoCall={activeCall.type === 'video'}
          onEndCall={() => setActiveCall(null)}
        />
      )}
    </div>
  )
}
