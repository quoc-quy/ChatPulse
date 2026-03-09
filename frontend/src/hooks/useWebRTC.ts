import { useEffect, useRef, useState } from 'react'
import { Socket } from 'socket.io-client'

export const useWebRTC = (socket: Socket | null, conversationId: string, currentUserId: string) => {
  const [peers, setPeers] = useState<{ [socketId: string]: RTCPeerConnection }>({})
  const [remoteStreams, setRemoteStreams] = useState<{ [socketId: string]: MediaStream }>({})

  // STATE LƯU THÔNG TIN: Tên, Trạng thái Mic, Trạng thái Camera
  const [peersInfo, setPeersInfo] = useState<{
    [socketId: string]: { userName: string; isMicOn?: boolean; isCameraOn?: boolean }
  }>({})

  const localStreamRef = useRef<MediaStream | null>(null)
  const peersRef = useRef<{ [socketId: string]: RTCPeerConnection }>({})
  const pendingCandidates = useRef<{ [socketId: string]: RTCIceCandidateInit[] }>({})

  const iceServers = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }]
  }

  const createPeer = (targetSocketId: string, stream: MediaStream | null) => {
    const peer = new RTCPeerConnection(iceServers)

    if (stream) {
      stream.getTracks().forEach((track) => peer.addTrack(track, stream))
    }

    peer.ontrack = (event) => {
      setRemoteStreams((prev) => {
        const newStream = event.streams[0] || new MediaStream([event.track])
        return { ...prev, [targetSocketId]: newStream }
      })
    }

    peer.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('call:signal', { targetSocketId, signal: { type: 'ice-candidate', candidate: event.candidate } })
      }
    }

    peersRef.current[targetSocketId] = peer
    return peer
  }

  useEffect(() => {
    if (!socket) return

    const handleUserJoined = async ({ socketId, userName }: any) => {
      if (userName) setPeersInfo((prev) => ({ ...prev, [socketId]: { ...(prev[socketId] || {}), userName } }))
      const peer = createPeer(socketId, localStreamRef.current)
      setPeers((prev) => ({ ...prev, [socketId]: peer }))

      try {
        const offer = await peer.createOffer()
        await peer.setLocalDescription(offer)
        socket.emit('call:signal', { targetSocketId: socketId, signal: offer })
      } catch (err) {
        console.error('Lỗi tạo Offer:', err)
      }
    }

    const processPendingCandidates = async (socketId: string, peer: RTCPeerConnection) => {
      if (pendingCandidates.current[socketId]) {
        for (const candidate of pendingCandidates.current[socketId]) {
          try {
            await peer.addIceCandidate(new RTCIceCandidate(candidate))
          } catch (e) {
            console.error('Lỗi thêm ICE Candidate:', e)
          }
        }
        pendingCandidates.current[socketId] = []
      }
    }

    const handleSignal = async ({ callerSocketId, userName, signal }: any) => {
      if (userName)
        setPeersInfo((prev) => ({ ...prev, [callerSocketId]: { ...(prev[callerSocketId] || {}), userName } }))

      let peer = peersRef.current[callerSocketId]

      if (!peer) {
        peer = createPeer(callerSocketId, localStreamRef.current)
        setPeers((prev) => ({ ...prev, [callerSocketId]: peer }))
      }

      try {
        if (signal.type === 'offer') {
          const polite = socket.id.localeCompare(callerSocketId) > 0
          const offerCollision = peer.signalingState !== 'stable'
          if (offerCollision && !polite) return
          if (offerCollision) await peer.setLocalDescription({ type: 'rollback' })

          await peer.setRemoteDescription(new RTCSessionDescription(signal))
          const answer = await peer.createAnswer()
          await peer.setLocalDescription(answer)
          socket.emit('call:signal', { targetSocketId: callerSocketId, signal: answer })
          await processPendingCandidates(callerSocketId, peer)
        } else if (signal.type === 'answer') {
          if (peer.signalingState === 'have-local-offer') {
            await peer.setRemoteDescription(new RTCSessionDescription(signal))
            await processPendingCandidates(callerSocketId, peer)
          }
        } else if (signal.type === 'ice-candidate') {
          if (peer.remoteDescription && peer.remoteDescription.type) {
            await peer.addIceCandidate(new RTCIceCandidate(signal.candidate))
          } else {
            if (!pendingCandidates.current[callerSocketId]) pendingCandidates.current[callerSocketId] = []
            pendingCandidates.current[callerSocketId].push(signal.candidate)
          }
        }
      } catch (err) {
        console.error('Lỗi xử lý Signal:', err)
      }
    }

    const handleUserLeft = ({ socketId }: { socketId: string }) => {
      if (peersRef.current[socketId]) {
        peersRef.current[socketId].close()
        delete peersRef.current[socketId]
        delete pendingCandidates.current[socketId]

        setPeers((prev) => {
          const n = { ...prev }
          delete n[socketId]
          return n
        })
        setRemoteStreams((prev) => {
          const n = { ...prev }
          delete n[socketId]
          return n
        })
        setPeersInfo((prev) => {
          const n = { ...prev }
          delete n[socketId]
          return n
        })
      }
    }

    // SỰ KIỆN NHẬN TRẠNG THÁI MIC/CAM CỦA ĐỐI TÁC
    const handleMediaToggled = ({ socketId, isMicOn, isCameraOn }: any) => {
      setPeersInfo((prev) => ({
        ...prev,
        [socketId]: {
          ...(prev[socketId] || { userName: '' }),
          isMicOn,
          isCameraOn
        }
      }))
    }

    socket.on('call:user-joined', handleUserJoined)
    socket.on('call:signal', handleSignal)
    socket.on('call:user-left', handleUserLeft)
    socket.on('call:media-toggled', handleMediaToggled)

    return () => {
      socket.off('call:user-joined', handleUserJoined)
      socket.off('call:signal', handleSignal)
      socket.off('call:user-left', handleUserLeft)
      socket.off('call:media-toggled', handleMediaToggled)
    }
  }, [socket])

  return { localStreamRef, remoteStreams, peersInfo }
}
