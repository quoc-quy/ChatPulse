import React, { useEffect, useRef, useState } from 'react'
import { useWebRTC } from '../../hooks/useWebRTC'
import { Socket } from 'socket.io-client'
import { PhoneOff } from 'lucide-react'

interface VideoCallRoomProps {
  socket: Socket | null
  callId: string
  conversationId: string
  currentUserId: string
  isVideoCall: boolean
  onEndCall: () => void
}

export const VideoCallRoom: React.FC<VideoCallRoomProps> = ({
  socket,
  callId,
  conversationId,
  currentUserId,
  isVideoCall,
  onEndCall
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const { localStreamRef, remoteStreams } = useWebRTC(socket, conversationId, currentUserId)
  const [deviceError, setDeviceError] = useState<string | null>(null)

  useEffect(() => {
    const initMedia = async () => {
      // 1. Kiểm tra môi trường an toàn
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setDeviceError('Trình duyệt không hỗ trợ hoặc cần chạy HTTPS/localhost.')
        socket?.emit('call:join', { callId, conversationId })
        return
      }

      try {
        // 2. Lấy quyền Camera & Micro
        const stream = await navigator.mediaDevices.getUserMedia({ video: isVideoCall, audio: true })
        localStreamRef.current = stream
        if (localVideoRef.current && isVideoCall) {
          localVideoRef.current.srcObject = stream
        }
      } catch (err: any) {
        console.error('Lỗi truy cập thiết bị chính:', err)

        if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          setDeviceError('Camera/Micro đang bị ứng dụng khác chiếm dụng.')
        } else if (isVideoCall) {
          // Thử lấy Micro nếu không có Camera
          try {
            const audioStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true })
            localStreamRef.current = audioStream
            setDeviceError('Không tìm thấy Camera, đang gọi bằng Micro.')
          } catch (audioErr: any) {
            setDeviceError('Không thể truy cập Camera và Micro.')
          }
        } else {
          setDeviceError('Vui lòng cấp quyền Micro để trò chuyện.')
        }
      } finally {
        // Luôn báo lên server để đối tác biết mình đã vào phòng
        socket?.emit('call:join', { callId, conversationId })
      }
    }

    initMedia()

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop())
      }
      socket?.emit('call:leave', { callId, conversationId })
    }
  }, [isVideoCall, callId, conversationId])

  const handleEndCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
    }
    socket?.emit('call:leave', { callId, conversationId })
    onEndCall()
  }

  return (
    <div className='absolute inset-0 bg-background/95 z-50 flex flex-col p-4 animate-in slide-in-from-bottom'>
      <div className='flex-1 flex flex-wrap gap-4 items-center justify-center p-4 relative'>
        {deviceError && (
          <div className='absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-500/90 text-white px-4 py-2 rounded-lg text-sm z-50 shadow-lg text-center w-max max-w-[90%]'>
            {deviceError}
          </div>
        )}

        {/* Video Bản thân */}
        {isVideoCall && !deviceError ? (
          <div className='relative w-full max-w-[300px] aspect-video bg-black rounded-xl overflow-hidden border-2 border-blue-500 shadow-lg'>
            <video ref={localVideoRef} autoPlay muted playsInline className='w-full h-full object-cover scale-x-[-1]' />
            <span className='absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded'>Bạn</span>
          </div>
        ) : (
          <div className='relative w-full max-w-[300px] h-32 bg-muted rounded-xl border border-gray-600 flex items-center justify-center'>
            <div className='flex flex-col items-center'>
              <div className='w-12 h-12 bg-gray-500 rounded-full flex items-center justify-center animate-pulse mb-2'>
                <span className='text-white font-bold'>You</span>
              </div>
              <p className='text-muted-foreground font-semibold text-sm'>
                {deviceError ? 'Chỉ xem (Không thiết bị)' : 'Đang gọi thoại...'}
              </p>
            </div>
          </div>
        )}

        {/* Video Đối tác */}
        {Object.entries(remoteStreams).map(([socketId, stream]) => (
          <RemoteMedia key={socketId} stream={stream} isVideoCall={isVideoCall} />
        ))}
      </div>

      <div className='h-20 flex items-center justify-center gap-6'>
        <button
          onClick={handleEndCall}
          className='bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full p-5 shadow-lg transition-transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-red-500/50'
        >
          <PhoneOff className='w-6 h-6' />
        </button>
      </div>
    </div>
  )
}

// Sub-Component: Đảm nhiệm render và phát tiếng của người kia
const RemoteMedia = ({ stream, isVideoCall }: { stream: MediaStream; isVideoCall: boolean }) => {
  const mediaRef = useRef<HTMLVideoElement & HTMLAudioElement>(null)

  useEffect(() => {
    if (mediaRef.current && stream) {
      mediaRef.current.srcObject = stream

      // ÉP TRÌNH DUYỆT PHÁT HÌNH & TIẾNG BẰNG HÀM PLAY()
      // Fix lỗi tự động mute của iOS Safari và Chrome Android
      mediaRef.current.play().catch((error) => {
        console.log('Cần tương tác chạm để phát tiếng (Mobile Policy):', error)
      })
    }
  }, [stream])

  const hasVideoTrack = stream.getVideoTracks().length > 0

  if (!isVideoCall || !hasVideoTrack) {
    return (
      <div className='relative w-full max-w-[300px] h-32 bg-muted rounded-xl border flex items-center justify-center shadow-lg'>
        {/* Thẻ audio phải có autoPlay và playsInline */}
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
      {/* Thẻ video tuyệt đối không được dùng thuộc tính muted ở đây */}
      <video ref={mediaRef} autoPlay playsInline className='w-full h-full object-cover' />
      <span className='absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded'>Đối tác</span>
    </div>
  )
}
