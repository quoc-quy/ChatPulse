/* eslint-disable react-hooks/refs */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect, useContext, useRef } from 'react'
import { AppContext } from '@/context/app.context'
import { useSocket } from '@/context/socket.context'
import { VideoCallRoom } from './VideoCallRoom'
import { Phone, PhoneOff, Video, Maximize2, X } from 'lucide-react'
import { toast } from 'sonner'

export function GlobalCallUI() {
  const { activeCall, setActiveCall, profile } = useContext(AppContext)
  const { socket } = useSocket()

  const [isMinimized, setIsMinimized] = useState(false)
  const [position, setPosition] = useState({ x: 20, y: 20 })
  const [isDragging, setIsDragging] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })

  const activeCallRef = useRef(activeCall)
  activeCallRef.current = activeCall

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPosition({ x: window.innerWidth - 340, y: window.innerHeight - 300 })
    }
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) setPosition({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y })
    }
    const handleMouseUp = () => setIsDragging(false)

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  const startDrag = (e: React.MouseEvent) => {
    setIsDragging(true)
    dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y }
  }

  useEffect(() => {
    console.log(
      '>>> [GlobalCallUI] Socket listener useEffect triggered. socket exists:',
      !!socket,
      'socket connected:',
      socket?.connected
    )
    if (!socket) return

    const handleIncoming = (data: any) => {
      console.log('>>> [GlobalCallUI] Received call:incoming:', data)
      console.log('>>> [GlobalCallUI] activeCallRef.current:', activeCallRef.current)
      if (activeCallRef.current) {
        console.log('>>> [GlobalCallUI] Already in active call, rejecting new incoming call')
        socket.emit('call:reject', { callId: data.callId, conversationId: data.conversationId })
        return
      }
      setActiveCall({ ...data, isReceiving: true })
      setIsMinimized(false)
    }

    const handleEnded = () => {
      console.log('>>> [GlobalCallUI] Received call:ended')
      setActiveCall(null)
      setIsMinimized(false)
    }
    const handleRejected = () => {
      console.log('>>> [GlobalCallUI] Received call:rejected')
      toast.error('Người dùng đang bận hoặc đã từ chối cuộc gọi.')
      setActiveCall(null)
      setIsMinimized(false)
    }
    // FIX: Nhận sự kiện hết 60s không trả lời
    const handleMissed = () => {
      console.log('>>> [GlobalCallUI] Received call:missed')
      toast.info('Người nhận không trả lời.')
      setActiveCall(null)
      setIsMinimized(false)
    }
    // FIX: Khi mobile/web callee chấp nhận cuộc gọi → web caller tự động chuyển sang VideoCallRoom
    // và emit call:join để server ghi nhận caller đã vào phòng
    const handleAccepted = (data: any) => {
      console.log('>>> [GlobalCallUI] Received call:accepted event from server:', data)
      console.log('>>> [GlobalCallUI] activeCallRef.current:', activeCallRef.current)
      if (!activeCallRef.current) {
        console.log('>>> [GlobalCallUI] activeCallRef.current is null, ignoring accept')
        return
      }
      console.log('>>> [GlobalCallUI] activeCallRef.current.isCalling:', activeCallRef.current.isCalling)
      // Nếu web đang là caller ở trạng thái isCalling → chuyển sang VideoCallRoom
      if (activeCallRef.current.isCalling) {
        console.log('>>> [GlobalCallUI] Caller is active and waiting. Emitting call:join and transitioning to room.')
        // Emit call:join để server ghi nhận caller join (nếu chưa emit)
        socket?.emit('call:join', {
          callId: activeCallRef.current.callId,
          conversationId: activeCallRef.current.conversationId
        })
        setActiveCall({ ...activeCallRef.current, isCalling: false, isReceiving: false })
      } else {
        console.log('>>> [GlobalCallUI] activeCall.isCalling is not true, no transition needed')
      }
    }

    socket.on('call:incoming', handleIncoming)
    socket.on('call:ended', handleEnded)
    socket.on('call:rejected', handleRejected)
    socket.on('call:missed', handleMissed)
    socket.on('call:accepted', handleAccepted)

    return () => {
      console.log('>>> [GlobalCallUI] Cleaning up socket listeners')
      socket.off('call:incoming', handleIncoming)
      socket.off('call:ended', handleEnded)
      socket.off('call:rejected', handleRejected)
      socket.off('call:missed', handleMissed)
      socket.off('call:accepted', handleAccepted)
    }
  }, [socket, setActiveCall])

  if (!activeCall) return null

  const handleAcceptCall = () => {
    // ✅ FIX: Emit call:accepted để server relay cho caller biết callee đã nghe
    // Thiếu bước này → caller không nhận event → mãi ở màn hình "Đang gọi..."
    // → status DB vẫn INITIATED → khi leave tạo CANCELLED thay vì completed message
    if (socket) {
      socket.emit('call:accepted', {
        callId: activeCall.callId,
        conversationId: activeCall.conversationId
      })
      // Emit call:join để server cập nhật status sang ONGOING và thêm callee vào participants
      socket.emit('call:join', {
        callId: activeCall.callId,
        conversationId: activeCall.conversationId
      })
    }
    setActiveCall({ ...activeCall, isReceiving: false })
  }
  const handleRejectCall = () => {
    if (socket) socket.emit('call:reject', { callId: activeCall.callId, conversationId: activeCall.conversationId })
    setActiveCall(null)
  }
  const handleCancelCall = () => {
    if (socket) socket.emit('call:leave', { callId: activeCall.callId, conversationId: activeCall.conversationId })
    setActiveCall(null)
  }

  // Web là caller đang chờ callee chấp nhận
  if (activeCall.isCalling) {
    return (
      <div className='fixed inset-0 bg-background/80 backdrop-blur-sm z-[9999] flex items-center justify-center pointer-events-auto'>
        <div className='bg-card border shadow-2xl rounded-3xl p-8 w-[340px] text-center animate-in fade-in zoom-in duration-300'>
          <div className='w-24 h-24 bg-muted rounded-full mx-auto mb-4 animate-pulse flex items-center justify-center border-4 border-primary overflow-hidden shadow-lg'>
            <Phone size={40} className='text-primary' />
          </div>
          <h3 className='text-2xl font-bold mb-1 text-foreground'>Đang gọi...</h3>
          <p className='text-muted-foreground mb-8 text-sm font-medium'>
            Đang chờ người nhận bắt máy {activeCall.type === 'video' ? '(Video)' : '(Thoại)'}
          </p>
          <div className='flex justify-center'>
            <button
              onClick={handleCancelCall}
              className='bg-destructive text-white p-4 rounded-full shadow-lg hover:scale-110 transition'
              title='Hủy cuộc gọi'
            >
              <PhoneOff size={28} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Web là callee đang nhận cuộc gọi đến
  if (activeCall.isReceiving) {
    return (
      <div className='fixed inset-0 bg-background/80 backdrop-blur-sm z-[9999] flex items-center justify-center pointer-events-auto'>
        <div className='bg-card border shadow-2xl rounded-3xl p-8 w-[340px] text-center animate-in fade-in zoom-in duration-300'>
          <div className='w-24 h-24 bg-muted rounded-full mx-auto mb-4 animate-pulse flex items-center justify-center border-4 border-primary overflow-hidden shadow-lg'>
            {activeCall.callerAvatar ? (
              <img src={activeCall.callerAvatar} alt='avatar' className='w-full h-full object-cover' />
            ) : (
              <span className='text-4xl font-bold text-primary uppercase'>
                {activeCall.callerName ? activeCall.callerName.charAt(0) : 'U'}
              </span>
            )}
          </div>
          <h3 className='text-2xl font-bold mb-1 text-foreground'>{activeCall.callerName || 'Ai đó'}</h3>
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

  return (
    <div
      className={
        isMinimized
          ? 'fixed z-[9999] shadow-[0_10px_40px_rgba(0,0,0,0.4)] rounded-xl overflow-hidden bg-background border border-border transition-shadow flex flex-col'
          : 'fixed inset-0 z-[9998] pointer-events-none'
      }
      style={isMinimized ? { left: position.x, top: position.y, width: 320, height: 240 } : {}}
    >
      {isMinimized && (
        <div
          className='bg-secondary text-secondary-foreground flex justify-between items-center px-3 py-2 cursor-move border-b border-border/50 shrink-0 pointer-events-auto'
          onMouseDown={startDrag}
        >
          <span className='font-semibold text-xs truncate mr-2 select-none'>Đang gọi...</span>
          <div className='flex gap-3 shrink-0'>
            <button
              onClick={() => setIsMinimized(false)}
              className='hover:text-primary transition-colors'
              title='Phóng to'
            >
              <Maximize2 size={14} />
            </button>
            <button
              onClick={() => {
                socket?.emit('call:leave', { callId: activeCall.callId, conversationId: activeCall.conversationId })
                setActiveCall(null)
                setIsMinimized(false)
              }}
              className='text-destructive hover:text-red-600 transition-colors'
              title='Kết thúc'
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <div
        className={
          isMinimized
            ? 'flex-1 relative w-full pointer-events-auto'
            : 'absolute inset-0 pointer-events-auto flex flex-col'
        }
      >
        <VideoCallRoom
          socket={socket}
          callId={activeCall.callId}
          conversationId={activeCall.conversationId}
          currentUserId={profile?._id || ''}
          currentUserName={profile?.userName || 'User'}
          isVideoCall={activeCall.type === 'video'}
          onEndCall={() => setActiveCall(null)}
          onMinimize={() => setIsMinimized(true)}
          isMinimized={isMinimized}
        />
      </div>
    </div>
  )
}
