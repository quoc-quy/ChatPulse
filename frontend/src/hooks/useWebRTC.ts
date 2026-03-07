import { useEffect, useRef, useState } from 'react'
import { Socket } from 'socket.io-client'

export const useWebRTC = (socket: Socket | null, conversationId: string, currentUserId: string) => {
  const [peers, setPeers] = useState<{ [socketId: string]: RTCPeerConnection }>({})
  const [remoteStreams, setRemoteStreams] = useState<{ [socketId: string]: MediaStream }>({})
  const localStreamRef = useRef<MediaStream | null>(null)

  // Dùng Ref để lưu trữ state mới nhất, tránh vòng lặp re-render làm đứt kết nối
  const peersRef = useRef<{ [socketId: string]: RTCPeerConnection }>({})

  // HÀNG ĐỢI ICE CANDIDATE: Khắc phục lỗi "remote description was null"
  const pendingCandidates = useRef<{ [socketId: string]: RTCIceCandidateInit[] }>({})

  const iceServers = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }]
  }

  const createPeer = (targetSocketId: string, stream: MediaStream | null) => {
    const peer = new RTCPeerConnection(iceServers)

    // Thêm luồng hình ảnh/âm thanh của mình vào Peer để gửi đi
    if (stream) {
      stream.getTracks().forEach((track) => peer.addTrack(track, stream))
    }

    // Lắng nghe luồng dữ liệu (track) từ người kia gửi tới
    peer.ontrack = (event) => {
      setRemoteStreams((prev) => {
        const newStream = event.streams[0] || new MediaStream([event.track])
        return { ...prev, [targetSocketId]: newStream }
      })
    }

    // Gửi thông tin mạng (ICE) của mình cho đối tác
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

    // 1. Khi có người mới vào phòng -> Mình tạo Offer gửi cho họ
    const handleUserJoined = async ({ socketId }: { socketId: string }) => {
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

    // 2. Nhận tín hiệu (Offer, Answer, ICE) từ người kia
    const handleSignal = async ({ callerSocketId, signal }: any) => {
      let peer = peersRef.current[callerSocketId]

      if (!peer) {
        peer = createPeer(callerSocketId, localStreamRef.current)
        setPeers((prev) => ({ ...prev, [callerSocketId]: peer }))
      }

      try {
        if (signal.type === 'offer') {
          // Nhận Offer -> Set Remote -> Tạo Answer -> Set Local -> Gửi Answer
          await peer.setRemoteDescription(new RTCSessionDescription(signal))
          const answer = await peer.createAnswer()
          await peer.setLocalDescription(answer)
          socket.emit('call:signal', { targetSocketId: callerSocketId, signal: answer })

          // Sau khi setRemote xong, lôi các ICE trong hàng đợi ra xử lý
          if (pendingCandidates.current[callerSocketId]) {
            for (const candidate of pendingCandidates.current[callerSocketId]) {
              await peer.addIceCandidate(new RTCIceCandidate(candidate))
            }
            pendingCandidates.current[callerSocketId] = []
          }
        } else if (signal.type === 'answer') {
          // Nhận Answer -> Set Remote
          await peer.setRemoteDescription(new RTCSessionDescription(signal))

          // Xử lý ICE trong hàng đợi
          if (pendingCandidates.current[callerSocketId]) {
            for (const candidate of pendingCandidates.current[callerSocketId]) {
              await peer.addIceCandidate(new RTCIceCandidate(candidate))
            }
            pendingCandidates.current[callerSocketId] = []
          }
        } else if (signal.type === 'ice-candidate') {
          // Nhận ICE: Kiểm tra xem đã có Remote Description chưa
          if (peer.remoteDescription && peer.remoteDescription.type) {
            await peer.addIceCandidate(new RTCIceCandidate(signal.candidate))
          } else {
            // Nếu chưa có, đẩy vào hàng đợi
            if (!pendingCandidates.current[callerSocketId]) {
              pendingCandidates.current[callerSocketId] = []
            }
            pendingCandidates.current[callerSocketId].push(signal.candidate)
          }
        }
      } catch (err) {
        console.error('Lỗi xử lý Signal WebRTC:', err)
      }
    }

    // 3. Khi người kia thoát
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
      }
    }

    socket.on('call:user-joined', handleUserJoined)
    socket.on('call:signal', handleSignal)
    socket.on('call:user-left', handleUserLeft)

    return () => {
      socket.off('call:user-joined', handleUserJoined)
      socket.off('call:signal', handleSignal)
      socket.off('call:user-left', handleUserLeft)
    }
  }, [socket])

  return { localStreamRef, remoteStreams }
}
