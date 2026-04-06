/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef, useState } from 'react'
import { useLiveKit } from '../../hooks/useLiveKit'
import { Socket } from 'socket.io-client'
import { PhoneOff, Minimize2, Mic, MicOff, Video, VideoOff } from 'lucide-react'
import { RemoteTrack } from 'livekit-client'
import { toast } from 'sonner'

interface VideoCallRoomProps {
  socket: Socket | null
  callId: string
  conversationId: string
  currentUserId: string
  currentUserName: string
  isVideoCall: boolean
  onEndCall: () => void
  onMinimize: () => void
  isMinimized?: boolean
}

export const VideoCallRoom: React.FC<VideoCallRoomProps> = ({
  socket,
  callId,
  conversationId,
  currentUserId,
  currentUserName,
  isVideoCall,
  onEndCall,
  onMinimize,
  isMinimized = false
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null)

  const { localStreamRef, remoteTracks, peersInfo, publishLocalStream, toggleLocalMic, toggleLocalCamera } = useLiveKit(
    socket,
    conversationId,
    currentUserId,
    currentUserName
  )

  const [deviceError, setDeviceError] = useState<string | null>(null)
  const [isMicOn, setIsMicOn] = useState(true)
  const [isCameraOn, setIsCameraOn] = useState(isVideoCall)

  useEffect(() => {
    const initMedia = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setDeviceError('Trình duyệt không hỗ trợ')
        socket?.emit('call:join', { callId, conversationId })
        return
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })

        if (!isVideoCall) {
          stream.getVideoTracks().forEach((track) => (track.enabled = false))
          setIsCameraOn(false)
        }

        await publishLocalStream(stream)

        if (localVideoRef.current && isCameraOn) {
          localVideoRef.current.srcObject = stream
        }
      } catch (err: any) {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true })
          await publishLocalStream(audioStream)
          setIsCameraOn(false)
          if (isVideoCall) setDeviceError('Không tìm thấy Camera, đang dùng Micro.')
        } catch (audioErr) {
          setDeviceError('Không thể truy cập Camera và Micro.')
          setIsMicOn(false)
          setIsCameraOn(false)
        }
      } finally {
        socket?.emit('call:join', { callId, conversationId })
      }
    }

    initMedia()

    const handleBeforeUnload = () => socket?.emit('call:leave', { callId, conversationId })
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach((track) => track.stop())
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVideoCall, callId, conversationId])

  useEffect(() => {
    if (!socket || !callId || !conversationId) return
    socket.emit('call:toggle-media', { callId, conversationId, isMicOn, isCameraOn })
  }, [isMicOn, isCameraOn, socket, callId, conversationId, Object.keys(remoteTracks).length])

  useEffect(() => {
    if (isCameraOn && localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current
    }
  }, [isCameraOn, isMinimized, isMicOn, deviceError])

  const handleEndCall = () => {
    if (localStreamRef.current) localStreamRef.current.getTracks().forEach((track) => track.stop())
    socket?.emit('call:leave', { callId, conversationId })
    onEndCall()
  }

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        const newState = !audioTrack.enabled
        audioTrack.enabled = newState
        setIsMicOn(newState)
        toggleLocalMic(newState)
      }
    }
  }

  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        const newState = !videoTrack.enabled
        videoTrack.enabled = newState
        setIsCameraOn(newState)
        toggleLocalCamera(newState)
      } else {
        toast.error('Thiết bị của bạn không có Camera hoặc bị từ chối quyền.')
      }
    }
  }

  return (
    <div
      className={`flex flex-col bg-background/95 h-full w-full ${isMinimized ? '' : 'p-4 animate-in slide-in-from-bottom'}`}
    >
      <div
        className={`flex-1 flex flex-wrap items-center justify-center relative ${isMinimized ? 'bg-black' : 'gap-4 p-4'}`}
      >
        {deviceError && !isMinimized && (
          <div className='absolute top-2 left-1/2 transform -translate-x-1/2 bg-red-500/90 text-white px-2 py-1 rounded text-xs z-50'>
            {deviceError}
          </div>
        )}

        {isCameraOn && !deviceError ? (
          <div
            className={`${isMinimized ? 'absolute bottom-2 right-2 w-20 z-10 shadow-[0_0_10px_rgba(0,0,0,0.8)] border border-white/20' : 'relative w-full max-w-[300px] border-2 border-blue-500'} aspect-video bg-black rounded-xl overflow-hidden`}
          >
            {/* [FIX LỖI 2]: Thêm min-w-[1px] min-h-[1px] để tránh lỗi dimension của Livekit */}
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className='w-full h-full object-cover scale-x-[-1] min-w-[1px] min-h-[1px]'
            />
            {!isMicOn && (
              <div className='absolute top-2 right-2 bg-red-500/90 text-white rounded-full p-1.5 shadow-md'>
                <MicOff className='w-4 h-4' />
              </div>
            )}
            {!isMinimized && (
              <span className='absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded'>Bạn</span>
            )}
          </div>
        ) : (
          !isMinimized && (
            <div className='relative w-full max-w-[300px] h-32 bg-muted rounded-xl border border-gray-600 flex items-center justify-center'>
              <div className='w-12 h-12 bg-gray-500 rounded-full flex items-center justify-center animate-pulse mb-2'>
                <span className='text-white font-bold'>You</span>
              </div>
              {!isMicOn && (
                <div className='absolute top-2 right-2 bg-red-500/90 text-white rounded-full p-1.5 shadow-md'>
                  <MicOff className='w-4 h-4' />
                </div>
              )}
            </div>
          )
        )}

        {Object.entries(remoteTracks).map(([socketId, tracks]) => (
          <RemoteMedia
            key={socketId}
            tracks={tracks}
            isVideoCall={isVideoCall}
            userName={peersInfo[socketId]?.userName}
            isMinimized={isMinimized}
            isRemoteMicOn={peersInfo[socketId]?.isMicOn ?? true}
            isRemoteCameraOn={peersInfo[socketId]?.isCameraOn ?? true}
          />
        ))}
      </div>

      {!isMinimized && (
        <div className='h-24 flex items-center justify-center gap-4 sm:gap-6 shrink-0'>
          <button
            onClick={toggleMic}
            className={`${isMicOn ? 'bg-secondary text-foreground' : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'} hover:bg-secondary/80 rounded-full p-4 shadow-lg transition-transform hover:scale-105`}
            title={isMicOn ? 'Tắt Micro' : 'Bật Micro'}
          >
            {isMicOn ? <Mic className='w-6 h-6' /> : <MicOff className='w-6 h-6' />}
          </button>
          <button
            onClick={toggleCamera}
            className={`${isCameraOn ? 'bg-secondary text-foreground' : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'} hover:bg-secondary/80 rounded-full p-4 shadow-lg transition-transform hover:scale-105`}
            title={isCameraOn ? 'Tắt Camera' : 'Bật Camera'}
          >
            {isCameraOn ? <Video className='w-6 h-6' /> : <VideoOff className='w-6 h-6' />}
          </button>
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
      )}
    </div>
  )
}

const RemoteMedia = ({
  tracks,
  userName,
  isMinimized,
  isRemoteMicOn,
  isRemoteCameraOn
}: {
  tracks: RemoteTrack[]
  isVideoCall: boolean
  userName?: string
  isMinimized: boolean
  isRemoteMicOn: boolean
  isRemoteCameraOn: boolean
}) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const videoEl = videoRef.current
    const audioEl = audioRef.current

    tracks.forEach((track) => {
      if (track.kind === 'video' && videoEl) track.attach(videoEl)
      if (track.kind === 'audio' && audioEl) track.attach(audioEl)
    })

    return () => {
      tracks.forEach((track) => {
        if (track.kind === 'video' && videoEl) track.detach(videoEl)
        if (track.kind === 'audio' && audioEl) track.detach(audioEl)
      })
    }
  }, [tracks, isRemoteCameraOn, isMinimized])

  if (!isRemoteCameraOn) {
    return (
      <div
        className={`relative ${isMinimized ? 'w-full h-full' : 'w-full max-w-[300px] h-32'} bg-muted flex items-center justify-center ${!isMinimized ? 'rounded-xl border shadow-lg' : ''}`}
      >
        <audio ref={audioRef} autoPlay playsInline />
        <div className='flex flex-col items-center'>
          <div
            className={`${isMinimized ? 'w-16 h-16 text-xl' : 'w-12 h-12'} bg-blue-500 rounded-full flex items-center justify-center animate-pulse mb-2`}
          >
            <span className='text-white font-bold'>{userName ? userName.charAt(0).toUpperCase() : 'U'}</span>
          </div>
          <p className='text-foreground font-semibold'>{userName || 'Đang kết nối...'}</p>
        </div>

        {!isRemoteMicOn && (
          <div className='absolute top-2 right-2 bg-red-500/90 text-white rounded-full p-1.5 shadow-md'>
            <MicOff className='w-4 h-4' />
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={`relative ${isMinimized ? 'w-full h-full' : 'w-full max-w-[300px] aspect-video rounded-xl shadow-lg border'} bg-black overflow-hidden`}
    >
      {/* [FIX LỖI 2]: Thêm min-w-[1px] min-h-[1px] */}
      <video ref={videoRef} autoPlay playsInline className='w-full h-full object-cover min-w-[1px] min-h-[1px]' />
      <audio ref={audioRef} autoPlay playsInline />

      <span
        className={`absolute bottom-2 left-2 bg-black/60 text-white px-2 py-1 rounded ${isMinimized ? 'text-[10px]' : 'text-xs'}`}
      >
        {userName || 'Đang kết nối...'}
      </span>

      {!isRemoteMicOn && (
        <div className='absolute top-2 right-2 bg-red-500/90 text-white rounded-full p-1.5 shadow-md z-10'>
          <MicOff className='w-4 h-4' />
        </div>
      )}
    </div>
  )
}
