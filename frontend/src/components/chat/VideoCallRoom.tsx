import React, { useEffect, useRef, useState } from 'react'
import { useWebRTC } from '../../hooks/useWebRTC'
import { Socket } from 'socket.io-client'
import { PhoneOff, Minimize2 } from 'lucide-react'

interface VideoCallRoomProps {
  socket: Socket | null
  callId: string
  conversationId: string
  currentUserId: string
  isVideoCall: boolean
  onEndCall: () => void
  onMinimize: () => void
}

export const VideoCallRoom: React.FC<VideoCallRoomProps> = ({
  socket,
  callId,
  conversationId,
  currentUserId,
  isVideoCall,
  onEndCall,
  onMinimize
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const { localStreamRef, remoteStreams } = useWebRTC(socket, conversationId, currentUserId)
  const [deviceError, setDeviceError] = useState<string | null>(null)

  useEffect(() => {
    const initMedia = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setDeviceError('Trình duyệt không hỗ trợ hoặc cần chạy HTTPS/localhost.')
        socket?.emit('call:join', { callId, conversationId })
        return
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: isVideoCall, audio: true })
        localStreamRef.current = stream
        if (localVideoRef.current && isVideoCall) localVideoRef.current.srcObject = stream
      } catch (err: any) {
        if (err.name === 'NotReadableError' || err.name === 'TrackStartError')
          setDeviceError('Camera/Micro đang bị ứng dụng khác chiếm dụng.')
        else if (isVideoCall) {
          try {
            const audioStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true })
            localStreamRef.current = audioStream
            setDeviceError('Không tìm thấy Camera, đang gọi bằng Micro.')
          } catch (audioErr) {
            setDeviceError('Không thể truy cập Camera và Micro.')
          }
        } else {
          setDeviceError('Vui lòng cấp quyền Micro để trò chuyện.')
        }
      } finally {
        socket?.emit('call:join', { callId, conversationId })
      }
    }

    initMedia()

    // FIX LỖI: Bắt sự kiện khi người dùng tắt hẳn tab trình duyệt thì mới rời phòng
    const handleBeforeUnload = () => {
      socket?.emit('call:leave', { callId, conversationId })
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      // FIX LỖI STRICT MODE: Đã xóa lệnh socket.emit('call:leave') ở đây
      // Chỉ dừng camera/micro chứ không báo server là đã rời cuộc gọi
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach((track) => track.stop())
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isVideoCall, callId, conversationId, socket])

  const handleEndCall = () => {
    if (localStreamRef.current) localStreamRef.current.getTracks().forEach((track) => track.stop())
    socket?.emit('call:leave', { callId, conversationId })
    onEndCall()
  }

  return (
    <div className='flex-1 flex flex-col p-4 animate-in slide-in-from-bottom'>
      <div className='flex-1 flex flex-wrap gap-4 items-center justify-center p-4 relative'>
        {deviceError && (
          <div className='absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-500/90 text-white px-4 py-2 rounded-lg text-sm z-50 shadow-lg text-center'>
            {deviceError}
          </div>
        )}

        {isVideoCall && !deviceError ? (
          <div className='relative w-full max-w-[300px] aspect-video bg-black rounded-xl overflow-hidden border-2 border-blue-500 shadow-lg'>
            <video ref={localVideoRef} autoPlay muted playsInline className='w-full h-full object-cover scale-x-[-1]' />
            <span className='absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded'>Bạn</span>
          </div>
        ) : (
          <div className='relative w-full max-w-[300px] h-32 bg-muted rounded-xl border border-gray-600 flex items-center justify-center'>
            <div className='w-12 h-12 bg-gray-500 rounded-full flex items-center justify-center animate-pulse mb-2'>
              <span className='text-white font-bold'>You</span>
            </div>
          </div>
        )}

        {Object.entries(remoteStreams).map(([socketId, stream]) => (
          <RemoteMedia key={socketId} stream={stream} isVideoCall={isVideoCall} />
        ))}
      </div>

      <div className='h-24 flex items-center justify-center gap-8'>
        <button
          onClick={onMinimize}
          className='bg-secondary text-foreground hover:bg-secondary/80 rounded-full p-4 shadow-lg transition-transform hover:scale-105'
          title='Thu nhỏ'
        >
          <Minimize2 className='w-6 h-6' />
        </button>
        <button
          onClick={handleEndCall}
          className='bg-destructive text-white hover:bg-destructive/90 rounded-full p-5 shadow-2xl transition-transform hover:scale-105'
          title='Kết thúc'
        >
          <PhoneOff className='w-8 h-8' />
        </button>
      </div>
    </div>
  )
}

const RemoteMedia = ({ stream, isVideoCall }: { stream: MediaStream; isVideoCall: boolean }) => {
  const mediaRef = useRef<HTMLVideoElement & HTMLAudioElement>(null)

  useEffect(() => {
    if (mediaRef.current && stream) {
      mediaRef.current.srcObject = stream
      mediaRef.current.play().catch(() => null)
    }
  }, [stream])

  const hasVideoTrack = stream.getVideoTracks().length > 0

  if (!isVideoCall || !hasVideoTrack) {
    return (
      <div className='relative w-full max-w-[300px] h-32 bg-muted rounded-xl border flex items-center justify-center shadow-lg'>
        <audio ref={mediaRef} autoPlay playsInline />
        <div className='flex flex-col items-center'>
          <div className='w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center animate-pulse mb-2'>
            <span className='text-white font-bold'>B</span>
          </div>
          <p className='text-foreground font-semibold'>Đối tác (Đang nói)</p>
        </div>
      </div>
    )
  }

  return (
    <div className='relative w-full max-w-[300px] aspect-video bg-black rounded-xl overflow-hidden shadow-lg border'>
      <video ref={mediaRef} autoPlay playsInline className='w-full h-full object-cover' />
      <span className='absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded'>Đối tác</span>
    </div>
  )
}
