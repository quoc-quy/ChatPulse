import React, { useState, useEffect, useContext, useRef } from 'react'
import { AppContext } from '@/context/app.context'
import { useSocket } from '@/context/socket.context'
import { VideoCallRoom } from './VideoCallRoom'
import { Phone, PhoneOff, Video, Maximize2 } from 'lucide-react'
import { toast } from 'sonner'

export function GlobalCallUI() {
  const { activeCall, setActiveCall, profile } = useContext(AppContext)
  const { socket } = useSocket()
  const [isMinimized, setIsMinimized] = useState(false)

  // FIX BUG MẤT KẾT NỐI: Sử dụng useRef để lưu activeCall mới nhất
  // Tránh việc đưa activeCall vào mảng dependency của useEffect bên dưới làm đứt kết nối socket
  const activeCallRef = useRef(activeCall)
  useEffect(() => {
    activeCallRef.current = activeCall
  }, [activeCall])

  useEffect(() => {
    if (!socket) return

    const handleIncoming = (data: any) => {
      // Nếu đang trong cuộc gọi khác thì tự động từ chối
      if (activeCallRef.current) {
        socket.emit('call:reject', { callId: data.callId, conversationId: data.conversationId })
        return
      }
      setActiveCall({ ...data, isReceiving: true })
      setIsMinimized(false)
    }

    const handleEnded = () => {
      setActiveCall(null)
      setIsMinimized(false)
    }

    const handleRejected = () => {
      toast.error('Người dùng đang bận hoặc đã từ chối cuộc gọi.')
      setActiveCall(null)
      setIsMinimized(false)
    }

    // Đăng ký lắng nghe
    socket.on('call:incoming', handleIncoming)
    socket.on('call:ended', handleEnded)
    socket.on('call:rejected', handleRejected)

    // Dọn dẹp
    return () => {
      socket.off('call:incoming', handleIncoming)
      socket.off('call:ended', handleEnded)
      socket.off('call:rejected', handleRejected)
    }
  }, [socket, setActiveCall]) // Loại bỏ activeCall ra khỏi mảng này

  if (!activeCall) return null

  const handleAcceptCall = () => setActiveCall({ ...activeCall, isReceiving: false })

  const handleRejectCall = () => {
    if (socket) socket.emit('call:reject', { callId: activeCall.callId, conversationId: activeCall.conversationId })
    setActiveCall(null)
  }

  // 1. MÀN HÌNH ĐANG ĐỔ CHUÔNG
  if (activeCall.isReceiving) {
    return (
      <div className='fixed inset-0 bg-background/80 backdrop-blur-sm z-[9999] flex items-center justify-center pointer-events-auto'>
        <div className='bg-card border shadow-2xl rounded-3xl p-8 w-[340px] text-center animate-in fade-in zoom-in duration-300'>
          <div className='w-24 h-24 bg-muted rounded-full mx-auto mb-4 animate-pulse flex items-center justify-center border-4 border-primary overflow-hidden shadow-lg'>
            {activeCall.callerAvatar ? (
              <img src={activeCall.callerAvatar} alt='avatar' className='w-full h-full object-cover' />
            ) : activeCall.type === 'video' ? (
              <Video size={40} className='text-primary' />
            ) : (
              <Phone size={40} className='text-primary' />
            )}
          </div>
          <h3 className='text-2xl font-bold mb-1'>{activeCall.callerName || 'Ai đó'}</h3>
          <p className='text-muted-foreground mb-8 text-sm font-medium'>
            Đang gọi {activeCall.type === 'video' ? 'Video' : 'Thoại'}...
          </p>
          <div className='flex justify-center gap-8'>
            <button
              onClick={handleRejectCall}
              className='bg-destructive text-white p-4 rounded-full shadow-lg hover:scale-110 transition'
            >
              <PhoneOff size={28} />
            </button>
            <button
              onClick={handleAcceptCall}
              className='bg-green-500 text-white p-4 rounded-full shadow-lg hover:scale-110 transition'
            >
              {activeCall.type === 'video' ? (
                <Video size={28} className='animate-bounce' />
              ) : (
                <Phone size={28} className='animate-bounce' />
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 2. MÀN HÌNH BONG BÓNG THU NHỎ
  if (isMinimized) {
    return (
      <div
        onClick={() => setIsMinimized(false)}
        className='fixed bottom-8 right-8 bg-green-500 text-white p-4 rounded-full shadow-2xl cursor-pointer z-[9999] flex items-center gap-3 hover:scale-105 transition-all animate-pulse pointer-events-auto'
      >
        {activeCall.type === 'video' ? <Video size={24} /> : <Phone size={24} />}
        <span className='font-semibold hidden sm:inline pr-2'>Đang gọi...</span>
        <Maximize2 size={20} className='border-l border-white/30 pl-2' />
      </div>
    )
  }

  // 3. MÀN HÌNH PHÒNG GỌI CHÍNH
  return (
    <div className='fixed inset-0 z-[9998] pointer-events-none'>
      <div className='absolute inset-0 bg-background/95 pointer-events-auto flex flex-col'>
        <VideoCallRoom
          socket={socket}
          callId={activeCall.callId}
          conversationId={activeCall.conversationId}
          currentUserId={profile?._id || ''}
          isVideoCall={activeCall.type === 'video'}
          onEndCall={() => setActiveCall(null)}
          onMinimize={() => setIsMinimized(true)}
        />
      </div>
    </div>
  )
}
