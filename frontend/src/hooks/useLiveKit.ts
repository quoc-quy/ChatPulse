import { useEffect, useRef, useState } from 'react'
import { Socket } from 'socket.io-client'
import { Room, RoomEvent, RemoteParticipant, RemoteTrack, Track } from 'livekit-client'
import { callApi } from '@/apis/call.api'

export const useLiveKit = (
  socket: Socket | null,
  conversationId: string,
  currentUserId: string,
  currentUserName: string = 'User'
) => {
  const [remoteTracks, setRemoteTracks] = useState<{ [socketId: string]: RemoteTrack[] }>({})
  const [peersInfo, setPeersInfo] = useState<{
    [socketId: string]: { userName: string; isMicOn?: boolean; isCameraOn?: boolean }
  }>({})

  const localStreamRef = useRef<MediaStream | null>(null)
  const roomRef = useRef<Room | null>(null)

  const connectLockRef = useRef(false)

  useEffect(() => {
    if (!conversationId || !currentUserId) return
    let isMounted = true

    const connectLiveKit = async () => {
      // Nếu đang kết nối hoặc đã có room rồi thì bỏ qua (Chống gọi đúp)
      if (connectLockRef.current || roomRef.current) return
      connectLockRef.current = true

      try {
        const res = await callApi.getLiveKitToken(conversationId, currentUserName)
        if (!isMounted) return

        const token = res.data.result.token
        const liveKitUrl = import.meta.env.VITE_LIVEKIT_URL

        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
          publishDefaults: {
            videoEncoding: { maxBitrate: 1_500_000, maxFramerate: 30 }
          }
        })
        roomRef.current = room

        room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication, participant: RemoteParticipant) => {
          setRemoteTracks((prev) => {
            const tracks = prev[participant.identity] || []
            if (!tracks.find((t) => t.sid === track.sid)) {
              return { ...prev, [participant.identity]: [...tracks, track] }
            }
            return prev
          })
          updatePeerInfo(participant)
        })

        room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, publication, participant: RemoteParticipant) => {
          setRemoteTracks((prev) => {
            const tracks = prev[participant.identity] || []
            return { ...prev, [participant.identity]: tracks.filter((t) => t.sid !== track.sid) }
          })
          updatePeerInfo(participant)
        })

        room.on(RoomEvent.ParticipantConnected, (p) => updatePeerInfo(p))
        room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
          setRemoteTracks((prev) => {
            const next = { ...prev }
            delete next[participant.identity]
            return next
          })
          setPeersInfo((prev) => {
            const next = { ...prev }
            delete next[participant.identity]
            return next
          })
        })

        room.on(RoomEvent.TrackMuted, () => updateAllPeers(room))
        room.on(RoomEvent.TrackUnmuted, () => updateAllPeers(room))

        await room.connect(liveKitUrl, token)

        // Nếu Component bị unmount trong lúc đang chờ await connect
        if (!isMounted) {
          room.disconnect()
          roomRef.current = null
          return
        }

        if (localStreamRef.current) {
          const tracks = localStreamRef.current.getTracks()
          for (const track of tracks) {
            const source = track.kind === 'video' ? Track.Source.Camera : Track.Source.Microphone
            const isPublished = Array.from(room.localParticipant.trackPublications.values()).some(
              (pub) => pub.track?.mediaStreamTrack === track
            )
            if (!isPublished) {
              await room.localParticipant.publishTrack(track, { source })
              if (!track.enabled) {
                const pub = Array.from(room.localParticipant.trackPublications.values()).find(
                  (p) => p.track?.mediaStreamTrack === track
                )
                if (pub && pub.track) await pub.track.mute()
              }
            }
          }
        }
      } catch (error) {
        console.error('Lỗi khi kết nối LiveKit:', error)
      } finally {
        connectLockRef.current = false
      }
    }

    const updatePeerInfo = (participant: RemoteParticipant) => {
      setPeersInfo((prev) => ({
        ...prev,
        [participant.identity]: {
          userName: participant.name || 'User',
          isMicOn: participant.isMicrophoneEnabled,
          isCameraOn: participant.isCameraEnabled
        }
      }))
    }

    const updateAllPeers = (r: Room) => r.remoteParticipants.forEach(updatePeerInfo)

    connectLiveKit()

    // Hàm Dọn Dẹp sạch sẽ khi ngắt cuộc gọi
    return () => {
      isMounted = false
      if (roomRef.current) {
        roomRef.current.disconnect()
        roomRef.current = null
      }
      connectLockRef.current = false
    }
  }, [conversationId, currentUserId, currentUserName])

  const publishLocalStream = async (stream: MediaStream) => {
    localStreamRef.current = stream
    // [FIX LỖI 1]: Bỏ điều kiện room.state === 'connected'. LiveKit sẽ tự đưa vào hàng đợi nếu đang connect.
    if (roomRef.current) {
      const tracks = stream.getTracks()
      for (const track of tracks) {
        const isPublished = Array.from(roomRef.current.localParticipant.trackPublications.values()).some(
          (pub) => pub.track?.mediaStreamTrack === track
        )

        if (!isPublished) {
          const source = track.kind === 'video' ? Track.Source.Camera : Track.Source.Microphone
          await roomRef.current.localParticipant.publishTrack(track, { source })

          if (!track.enabled) {
            const pub = Array.from(roomRef.current.localParticipant.trackPublications.values()).find(
              (p) => p.track?.mediaStreamTrack === track
            )
            if (pub && pub.track) await pub.track.mute()
          }
        }
      }
    }
  }

  const toggleLocalMic = async (enabled: boolean) => {
    if (roomRef.current) {
      const pub = Array.from(roomRef.current.localParticipant.trackPublications.values()).find(
        (p) => p.source === Track.Source.Microphone
      )
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      if (pub && pub.track) enabled ? await pub.track.unmute() : await pub.track.mute()
    }
  }

  const toggleLocalCamera = async (enabled: boolean) => {
    if (roomRef.current) {
      const pub = Array.from(roomRef.current.localParticipant.trackPublications.values()).find(
        (p) => p.source === Track.Source.Camera
      )
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      if (pub && pub.track) enabled ? await pub.track.unmute() : await pub.track.mute()
    }
  }

  return { localStreamRef, remoteTracks, peersInfo, publishLocalStream, toggleLocalMic, toggleLocalCamera }
}
