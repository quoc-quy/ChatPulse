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
  useEffect(() => {
    activeCallRef.current = activeCall
  }, [activeCall])

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
    if (!socket) return

    const handleIncoming = (data: any) => {
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
    // FIX: Nhận sự kiện hết 60s không trả lời
    const handleMissed = () => {
      toast.info('Người nhận không trả lời.')
      setActiveCall(null)
      setIsMinimized(false)
    }

    socket.on('call:incoming', handleIncoming)
    socket.on('call:ended', handleEnded)
    socket.on('call:rejected', handleRejected)
    socket.on('call:missed', handleMissed)

    return () => {
      socket.off('call:incoming', handleIncoming)
      socket.off('call:ended', handleEnded)
      socket.off('call:rejected', handleRejected)
      socket.off('call:missed', handleMissed)
    }
  }, [socket, setActiveCall])

  if (!activeCall) return null

  const handleAcceptCall = () => setActiveCall({ ...activeCall, isReceiving: false })
  const handleRejectCall = () => {
    if (socket) socket.emit('call:reject', { callId: activeCall.callId, conversationId: activeCall.conversationId })
    setActiveCall(null)
  }

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
          isVideoCall={activeCall.type === 'video'}
          onEndCall={() => setActiveCall(null)}
          onMinimize={() => setIsMinimized(true)}
          isMinimized={isMinimized}
        />
      </div>
    </div>
  )
}
