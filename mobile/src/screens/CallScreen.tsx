import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  SafeAreaView,
  ActivityIndicator,
  StatusBar,
  Platform,
  PermissionsAndroid,
  Image,
  ScrollView,
  Dimensions
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { getLiveKitToken } from '../apis/call.api'
import { useChatContext } from '../contexts/ChatContext'
import Constants from 'expo-constants'

// FIX: Đọc từ Constants.expoConfig.extra trước (luôn có trong APK bundle),
// fallback về process.env (hoạt động khi dev local)
const LIVEKIT_URL =
  (Constants.expoConfig?.extra?.EXPO_PUBLIC_LIVEKIT_URL as string) ||
  process.env.EXPO_PUBLIC_LIVEKIT_URL ||
  'wss://chatpulse-oxy534tp.livekit.cloud'

// ✅ Detect Expo Go để ngăn chặn việc import native dependencies trực tiếp gây crash
const isExpoGo = Constants.appOwnership === 'expo'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

// Khai báo các biến lazy load động cho LiveKit
let LiveKitRoom: any = null
let useRoomContext: any = null
let useTracks: any = null
let VideoTrack: any = null
let Track: any = null
let AudioSession: any = null

if (!isExpoGo) {
  try {
    // Chỉ nạp thư viện native khi chạy trên Standalone APK hoặc Development Client
    const lkRN = require('@livekit/react-native')
    const lkClient = require('livekit-client')
    LiveKitRoom = lkRN.LiveKitRoom
    useRoomContext = lkRN.useRoomContext
    useTracks = lkRN.useTracks
    VideoTrack = lkRN.VideoTrack
    AudioSession = lkRN.AudioSession
    Track = lkClient.Track
    console.log('[CallScreen] LiveKit libraries loaded successfully')
  } catch (error) {
    console.error('[CallScreen] Failed to load LiveKit libraries:', error)
  }
}

// Xin quyền camera và micro trên Android
async function requestAndroidPermissions(isVideoCall: boolean): Promise<boolean> {
  if (Platform.OS !== 'android') return true
  try {
    const perms: string[] = [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO]
    if (isVideoCall) perms.push(PermissionsAndroid.PERMISSIONS.CAMERA)
    console.log('[CallScreen] Requesting permissions:', perms)
    const results = await PermissionsAndroid.requestMultiple(perms as any)
    const granted = perms.every(
      (p) => results[p as keyof typeof results] === PermissionsAndroid.RESULTS.GRANTED
    )
    console.log('[CallScreen] Permissions granted:', granted, results)
    return granted
  } catch (e) {
    console.error('[CallScreen] Permission request error:', e)
    return false
  }
}

export default function CallScreen({ route, navigation }: any) {
  const { roomName, userName, isVideoCall, callId, conversationId, callerName, callerAvatar } =
    route.params as any

  const { socket } = useChatContext() as any

  console.log(
    '[CallScreen] Mounted — isExpoGo:',
    isExpoGo,
    '| roomName:',
    roomName,
    '| callId:',
    callId
  )

  // Nếu đang chạy Expo Go -> sử dụng UI Mock cuộc gọi để tránh crash native WebRTC
  if (isExpoGo) {
    return (
      <MockCallScreen
        navigation={navigation}
        socket={socket}
        callId={callId}
        conversationId={conversationId}
        isVideoCall={isVideoCall}
        callerName={callerName || roomName}
        callerAvatar={callerAvatar}
      />
    )
  }

  // Nếu là APK / Dev Client -> Chạy cuộc gọi thực sự qua LiveKit
  return (
    <RealCallScreen
      navigation={navigation}
      socket={socket}
      roomName={roomName}
      userName={userName}
      isVideoCall={isVideoCall}
      callId={callId}
      conversationId={conversationId}
      callerName={callerName}
      callerAvatar={callerAvatar}
    />
  )
}

// ─── MÀN HÌNH GIẢ LẬP (Dùng cho Expo Go) ───────────────────────────────────────
function MockCallScreen({
  navigation,
  socket,
  callId,
  conversationId,
  isVideoCall,
  callerName,
  callerAvatar
}: any) {
  const [isMicOn, setIsMicOn] = useState(true)
  const [isVideoOn, setIsVideoOn] = useState(isVideoCall)
  const [isConnecting, setIsConnecting] = useState(true)

  useEffect(() => {
    if (socket && callId && conversationId) {
      socket.emit('call:join', { callId, conversationId })
    }

    const goBack = () =>
      navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Main')

    socket?.on('call:ended', goBack)
    socket?.on('call:rejected', goBack)

    // Giả lập trạng thái kết nối thành công sau 2 giây
    const timer = setTimeout(() => {
      setIsConnecting(false)
    }, 2000)

    return () => {
      clearTimeout(timer)
      socket?.off('call:ended', goBack)
      socket?.off('call:rejected', goBack)
    }
  }, [socket, callId, conversationId, navigation])

  const handleLeave = () => {
    if (socket && callId && conversationId) {
      socket.emit('call:leave', { callId, conversationId })
    }
    navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Main')
  }

  const displayName = callerName || 'Người dùng'

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#111111" />
      <View style={styles.videoArea}>
        {isConnecting ? (
          <View style={styles.waitingContainer}>
            {callerAvatar ? (
              <Image source={{ uri: callerAvatar }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <Text style={styles.callerNameText}>{displayName}</Text>
            <Text style={styles.waitingText}>Đang thiết lập (Chế độ mô phỏng)...</Text>
            <ActivityIndicator color="#C084FC" style={{ marginTop: 12 }} />
          </View>
        ) : (
          <View style={styles.waitingContainer}>
            {callerAvatar ? (
              <Image source={{ uri: callerAvatar }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <Text style={styles.callerNameText}>{displayName}</Text>
            <View style={styles.mockCallBadge}>
              <Ionicons name="wifi" size={14} color="#10B981" />
              <Text style={styles.mockCallBadgeText}>
                {isVideoOn ? 'Cuộc gọi Video (Expo Go Mock)' : 'Cuộc gọi Thoại (Expo Go Mock)'}
              </Text>
            </View>
            <Text style={styles.waitingText}>
              {isVideoOn ? 'Camera đang hoạt động (Mock)' : 'Đang đàm thoại...'}
            </Text>
          </View>
        )}

        {isVideoOn && !isConnecting && (
          <View style={styles.localContainer}>
            <View style={styles.localMockCamera}>
              <Ionicons name="person" size={24} color="#666" />
              <Text style={styles.localMockText}>Bạn</Text>
            </View>
          </View>
        )}

        {!isMicOn && (
          <View style={styles.micOffBadge}>
            <Ionicons name="mic-off" size={16} color="#fff" />
          </View>
        )}
      </View>

      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={[styles.controlButton, !isMicOn && styles.controlButtonOff]}
          onPress={() => setIsMicOn(!isMicOn)}
        >
          <Ionicons name={isMicOn ? 'mic' : 'mic-off'} size={26} color="#fff" />
          <Text style={styles.controlLabel}>{isMicOn ? 'Micro' : 'Tắt mic'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.endCallButton} onPress={handleLeave}>
          <Ionicons
            name="call"
            size={30}
            color="#fff"
            style={{ transform: [{ rotate: '135deg' }] }}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, !isVideoOn && styles.controlButtonOff]}
          onPress={() => setIsVideoOn(!isVideoOn)}
        >
          <Ionicons name={isVideoOn ? 'videocam' : 'videocam-off'} size={26} color="#fff" />
          <Text style={styles.controlLabel}>{isVideoOn ? 'Camera' : 'Tắt cam'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

// ─── MÀN HÌNH CUỘC GỌI THỰC TẾ (Dùng cho Standalone APK / Dev Client) ──────────
function RealCallScreen({
  navigation,
  socket,
  roomName,
  userName,
  isVideoCall,
  callId,
  conversationId,
  callerName,
  callerAvatar
}: any) {
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [permissionsGranted, setPermissionsGranted] = useState(false)

  // Bật AudioSession ngay khi vào màn hình cuộc gọi
  useEffect(() => {
    console.log('[RealCallScreen] Mounted — starting AudioSession')
    AudioSession?.startAudioSession()
    return () => {
      console.log('[RealCallScreen] Unmounted — stopping AudioSession')
      AudioSession?.stopAudioSession()
    }
  }, [])

  // Xin quyền hệ thống
  useEffect(() => {
    const setup = async () => {
      console.log('[RealCallScreen] Requesting Android permissions, isVideoCall:', isVideoCall)
      const granted = await requestAndroidPermissions(isVideoCall)
      if (!granted) {
        console.warn('[RealCallScreen] Permissions DENIED')
        setError(
          'Ứng dụng cần quyền Camera/Microphone.\nVào Cài đặt → Ứng dụng → ChatPulse → Quyền để cấp quyền.'
        )
        return
      }
      console.log('[RealCallScreen] Permissions GRANTED')
      setPermissionsGranted(true)
    }
    setup()
  }, [isVideoCall])

  // FIX: Emit call:join TRƯỚC khi fetch token để server notify cho caller/web
  // biết mobile đã sẵn sàng join LiveKit Room, tránh timing race condition.
  // Sau đó mới fetch token và connect LiveKit.
  useEffect(() => {
    if (!permissionsGranted) return

    const fetchToken = async () => {
      try {
        // Bước 1: Báo server biết mobile đã vào phòng (TRƯỚC khi connect LiveKit)
        if (socket && callId && conversationId) {
          console.log('[CallScreen] Emitting call:join', { callId, conversationId })
          socket.emit('call:join', { callId, conversationId })
        } else {
          console.warn('[RealCallScreen] socket/callId/conversationId missing:', {
            socket: !!socket,
            callId,
            conversationId
          })
        }

        // Bước 2: Lấy token LiveKit từ backend
        console.log(
          '[RealCallScreen] Fetching LiveKit token — roomName:',
          roomName,
          'userName:',
          userName
        )
        const fetchedToken = await getLiveKitToken(roomName, userName)
        console.log('[CallScreen] Token fetched successfully')
        setToken(fetchedToken)
      } catch (err) {
        console.error('[CallScreen] Token fetch error:', err)
        setError('Không thể kết nối cuộc gọi. Vui lòng thử lại.')
      }
    }

    fetchToken()
  }, [permissionsGranted, roomName, userName, callId, conversationId, socket])

  // Lắng nghe sự kiện ngắt kết nối từ đối phương
  useEffect(() => {
    if (!socket) return
    const goBack = () => {
      console.log('[RealCallScreen] call:ended or call:rejected — navigating back')
      navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Main')
    }
    socket.on('call:ended', goBack)
    socket.on('call:rejected', goBack)
    return () => {
      socket.off('call:ended', goBack)
      socket.off('call:rejected', goBack)
    }
  }, [socket, navigation])

  const handleLeave = useCallback(() => {
    console.log('[RealCallScreen] User leaving call', { callId, conversationId })
    if (socket && callId && conversationId) {
      socket.emit('call:leave', { callId, conversationId })
    }
    navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Main')
  }, [socket, callId, conversationId, navigation])

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={[styles.loadingText, { color: '#EF4444', marginTop: 12 }]}>{error}</Text>
        <TouchableOpacity
          style={[styles.endCallButton, { marginTop: 24, width: 120 }]}
          onPress={handleLeave}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (!token) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#C084FC" />
        <Text style={styles.loadingText}>Đang thiết lập kết nối...</Text>
      </View>
    )
  }

  console.log('[RealCallScreen] Rendering LiveKitRoom — serverUrl:', LIVEKIT_URL)

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#111111" />
      <LiveKitRoom
        serverUrl={LIVEKIT_URL}
        token={token}
        connect={true}
        audio={true}
        video={isVideoCall}
        onDisconnected={handleLeave}
      >
        <RoomView
          isVideoCall={isVideoCall}
          onLeave={handleLeave}
          userName={userName}
          callerName={callerName}
          callerAvatar={callerAvatar}
        />
      </LiveKitRoom>
    </>
  )
}

// ─── PHÒNG LIVEKIT ROOM VIEW (Chỉ chạy trên native build) ──────────────────────
interface RoomViewProps {
  isVideoCall: boolean
  onLeave: () => void
  userName: string
  callerName?: string
  callerAvatar?: string
}

function RoomView({ isVideoCall, onLeave, userName, callerName, callerAvatar }: RoomViewProps) {
  const room = useRoomContext()
  const [isMicOn, setIsMicOn] = useState(true)
  const [isVideoOn, setIsVideoOn] = useState(isVideoCall)
  // FIX: Dùng state để force re-render khi remote participant thay đổi
  const [remoteCount, setRemoteCount] = useState(0)

  // FIX #3: Subscribe cả Camera + Microphone để detect audio-only call và avoid missing tracks
  const allTracks = useTracks([Track.Source.Camera, Track.Source.Microphone])

  const isTrackRef = (t: any): boolean => t && 'publication' in t && t.publication !== undefined

  // FIX #3: Lọc theo source tránh nhầm audio track với video track
  const localVideoTrack = allTracks.find(
    (t: any): boolean =>
      t.participant?.isLocal &&
      isTrackRef(t) &&
      t.publication?.source === Track.Source.Camera
  )
  const remoteVideoTracks = allTracks.filter(
    (t: any): boolean =>
      !t.participant?.isLocal &&
      isTrackRef(t) &&
      t.publication?.source === Track.Source.Camera
  )

  const remoteParticipants = Array.from(room.remoteParticipants.values())
  const isWaiting = remoteParticipants.length === 0 && remoteCount === 0
  const displayName = callerName || (remoteParticipants[0] as any)?.name || 'Người dùng'

  // ✅ BƯỚC THÊM: Kích hoạt camera và micro thủ công khi phòng đã kết nối
  // Đảm bảo thiết bị di động publish camera track của mình lên LiveKit Room
  useEffect(() => {
    if (!room || !room.localParticipant) return

    const initLocalTracks = async () => {
      try {
        console.log('[RoomView] Auto-enabling local tracks. Mic:', isMicOn, 'Camera:', isVideoCall)
        await room.localParticipant.setMicrophoneEnabled(isMicOn)
        await room.localParticipant.setCameraEnabled(isVideoCall)
      } catch (err) {
        console.error('[RoomView] Error auto-enabling local tracks:', err)
      }
    }

    if (room.state === 'connected') {
      initLocalTracks()
    } else {
      const onStateChanged = (state: string) => {
        if (state === 'connected') {
          initLocalTracks()
        }
      }
      room.on('stateChanged', onStateChanged)
      return () => {
        room.off('stateChanged', onStateChanged)
      }
    }
  }, [room, isVideoCall])

  // FIX #2: Lắng nghe sự kiện LiveKit để cập nhật remoteCount
  // BUG TRƯỚC: Nếu web đã join LiveKit Room TRƯỚC khi mobile mount RoomView,
  // event 'participantConnected' đã fire trước khi listener được đăng ký
  // → remoteCount mãi = 0 → isWaiting = true mãi → màn hình "Đang chờ kết nối" không tắt
  // FIX: Thêm listener 'connected' (RoomEvent.Connected) để check lại ngay sau khi room connect xong
  useEffect(() => {
    if (!room) return

    // Hàm chung để cập nhật số lượng remote participants
    const updateRemoteCount = () => {
      const count = room.remoteParticipants.size
      console.log(
        '[RoomView] updateRemoteCount — room.state:',
        room.state,
        '| remoteParticipants:',
        count
      )
      setRemoteCount(count)
    }

    // Lắng nghe khi có người join/leave
    room.on('participantConnected', updateRemoteCount)
    room.on('participantDisconnected', updateRemoteCount)

    // FIX RACE CONDITION: Khi LiveKit Room connect thành công, check ngay participants
    // Bắt trường hợp web đã join TRƯỚC khi mobile mount RoomView (và event đã fire rồi)
    room.on('connected', updateRemoteCount)

    // Kiểm tra ngay khi mount (nếu room đã connected sẵn và web đã trong phòng)
    console.log(
      '[RoomView] Mounted — room.state:',
      room.state,
      '| initial remoteParticipants:',
      room.remoteParticipants.size
    )
    updateRemoteCount()

    return () => {
      room.off('participantConnected', updateRemoteCount)
      room.off('participantDisconnected', updateRemoteCount)
      room.off('connected', updateRemoteCount)
    }
  }, [room])

  // Log khi track thay đổi để debug
  useEffect(() => {
    console.log(
      '[RoomView] allTracks changed — local video:',
      !!localVideoTrack,
      '| remote video count:',
      remoteVideoTracks.length,
      '| total tracks:',
      allTracks.length
    )
  }, [allTracks.length])

  const toggleMic = async () => {
    if (room?.localParticipant) {
      const newState = !isMicOn
      console.log('[RoomView] Toggle mic:', newState)
      await room.localParticipant.setMicrophoneEnabled(newState)
      setIsMicOn(newState)
    }
  }

  const toggleVideo = async () => {
    if (room?.localParticipant) {
      const newState = !isVideoOn
      console.log('[RoomView] Toggle camera:', newState)
      await room.localParticipant.setCameraEnabled(newState)
      setIsVideoOn(newState)
    }
  }

  console.log(
    '[RoomView] Render — isWaiting:',
    isWaiting,
    '| remoteCount:',
    remoteCount,
    '| remoteVideoTracks:',
    remoteVideoTracks.length
  )

  const isGroupCall = remoteCount > 1
  const gridParticipants = [room.localParticipant, ...Array.from(room.remoteParticipants.values())].filter(Boolean)
  const totalParticipants = gridParticipants.length

  // Calculate card dimensions dynamically based on participant count to utilize screen height.
  const availableHeight = SCREEN_HEIGHT - 200
  let cardWidth = (SCREEN_WIDTH - 24) / 2
  let cardHeight = 180

  if (totalParticipants <= 2) {
    cardHeight = Math.max(220, availableHeight - 16)
    cardWidth = SCREEN_WIDTH - 16
  } else if (totalParticipants === 3 || totalParticipants === 4) {
    // 3 or 4 participants: divide the vertical space into 2 rows
    cardHeight = Math.max(180, (availableHeight - 16) / 2)
  } else {
    // 5+ participants: show 3 rows on screen (scrollable)
    cardHeight = Math.max(160, (availableHeight - 24) / 3)
  }

  const getParticipantTrack = (identity: string) => {
    return allTracks.find(
      (t: any) =>
        t.participant?.identity === identity &&
        isTrackRef(t) &&
        t.publication?.source === Track.Source.Camera
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.videoArea}>
        {isGroupCall ? (
          <ScrollView contentContainerStyle={styles.gridContainer} style={{ width: '100%', height: '100%' }}>
            {gridParticipants.map((participant, index) => {
              const trackRef = getParticipantTrack(participant.identity)
              const hasVideo = participant.isCameraEnabled && trackRef

              // If number of participants is odd and this is the last participant, take full width
              const isLastOdd = (totalParticipants % 2 !== 0) && (index === totalParticipants - 1)
              const itemWidth = isLastOdd ? (SCREEN_WIDTH - 16) : cardWidth

              return (
                <View key={participant.identity} style={[styles.gridCard, { width: itemWidth, height: cardHeight }]}>
                  {hasVideo ? (
                    <VideoTrack trackRef={trackRef} style={styles.gridVideo} />
                  ) : (
                    <View style={styles.gridAvatarContainer}>
                      <View style={styles.gridAvatarCircle}>
                        <Text style={styles.gridAvatarText}>
                          {(participant.name || 'User').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.gridCameraOffText}>Camera đang tắt</Text>
                    </View>
                  )}

                  {/* Tên người tham gia */}
                  <View style={styles.gridNameTag}>
                    <Text style={styles.gridNameText} numberOfLines={1}>
                      {participant.isLocal ? 'Bạn' : (participant.name || 'User')}
                    </Text>
                  </View>

                  {/* Badge tắt micro */}
                  {!participant.isMicrophoneEnabled && (
                    <View style={styles.gridMicOffBadge}>
                      <Ionicons name="mic-off" size={12} color="#fff" />
                    </View>
                  )}
                </View>
              )
            })}
          </ScrollView>
        ) : (
          <>
            {isWaiting ? (
              // Chưa có ai join vào LiveKit Room
              <View style={styles.waitingContainer}>
                {callerAvatar ? (
                  <Image source={{ uri: callerAvatar }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <Text style={styles.callerNameText}>{displayName}</Text>
                <Text style={styles.waitingText}>Đang chờ kết nối...</Text>
                <ActivityIndicator color="#C084FC" style={{ marginTop: 12 }} />
              </View>
            ) : remoteVideoTracks.length > 0 ? (
              // Hiển thị video của đối phương
              <VideoTrack trackRef={remoteVideoTracks[0]} style={styles.fullScreenVideo} />
            ) : (
              // Đã kết nối nhưng đối phương tắt camera (audio-only hoặc camera off)
              <View style={styles.waitingContainer}>
                {callerAvatar ? (
                  <Image source={{ uri: callerAvatar }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <Text style={styles.callerNameText}>{displayName}</Text>
                <Text style={styles.waitingText}>
                  {isVideoCall ? 'Camera đang tắt' : 'Cuộc gọi thoại đang diễn ra'}
                </Text>
              </View>
            )}

            {/* Camera nhỏ của chính mình (góc trên phải) */}
            {isVideoOn && localVideoTrack && (
              <View style={styles.localContainer}>
                <VideoTrack trackRef={localVideoTrack} style={styles.localVideo} />
              </View>
            )}

            {/* Badge tắt mic */}
            {!isMicOn && (
              <View style={styles.micOffBadge}>
                <Ionicons name="mic-off" size={16} color="#fff" />
              </View>
            )}
          </>
        )}
      </View>

      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={[styles.controlButton, !isMicOn && styles.controlButtonOff]}
          onPress={toggleMic}
        >
          <Ionicons name={isMicOn ? 'mic' : 'mic-off'} size={26} color="#fff" />
          <Text style={styles.controlLabel}>{isMicOn ? 'Micro' : 'Tắt mic'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.endCallButton} onPress={onLeave}>
          <Ionicons
            name="call"
            size={30}
            color="#fff"
            style={{ transform: [{ rotate: '135deg' }] }}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, !isVideoOn && styles.controlButtonOff]}
          onPress={toggleVideo}
        >
          <Ionicons name={isVideoOn ? 'videocam' : 'videocam-off'} size={26} color="#fff" />
          <Text style={styles.controlLabel}>{isVideoOn ? 'Camera' : 'Tắt cam'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  loadingText: {
    color: '#E5E7EB',
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center'
  },
  container: {
    flex: 1,
    backgroundColor: '#111111'
  },
  videoArea: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center'
  },
  fullScreenVideo: {
    width: '100%',
    height: '100%'
  },
  waitingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 6,
    borderWidth: 2,
    borderColor: '#7C3AED'
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6
  },
  avatarText: {
    color: '#fff',
    fontSize: 40,
    fontWeight: 'bold'
  },
  callerNameText: {
    color: '#F9FAFB',
    fontSize: 20,
    fontWeight: '600'
  },
  waitingText: {
    color: '#9CA3AF',
    fontSize: 15,
    textAlign: 'center'
  },
  localContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 16 : 24,
    right: 16,
    width: 100,
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#333',
    borderWidth: 1.5,
    borderColor: '#555',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4
  },
  localVideo: {
    flex: 1
  },
  localMockCamera: {
    flex: 1,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4
  },
  localMockText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '500'
  },
  micOffBadge: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: 'rgba(239,68,68,0.9)',
    borderRadius: 12,
    padding: 6
  },
  controlsContainer: {
    height: 110,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 30,
    paddingBottom: Platform.OS === 'ios' ? 8 : 0
  },
  controlButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4
  },
  controlButtonOff: {
    backgroundColor: 'rgba(239,68,68,0.3)'
  },
  controlLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10
  },
  endCallButton: {
    backgroundColor: '#EF4444',
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4
  },
  mockCallBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 4,
    marginBottom: 4
  },
  mockCallBadgeText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '500'
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    gap: 8
  },
  gridCard: {
    height: 180,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#333'
  },
  gridVideo: {
    width: '100%',
    height: '100%'
  },
  gridAvatarContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#151515',
    gap: 8
  },
  gridAvatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center'
  },
  gridAvatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold'
  },
  gridCameraOffText: {
    color: '#9CA3AF',
    fontSize: 12
  },
  gridNameTag: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    maxWidth: '80%'
  },
  gridNameText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500'
  },
  gridMicOffBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    borderRadius: 10,
    padding: 4
  }
})
