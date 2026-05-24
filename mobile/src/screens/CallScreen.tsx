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
  Image
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { getLiveKitToken } from '../apis/call.api'
import { useChatContext } from '../contexts/ChatContext'
import Constants from 'expo-constants'

const LIVEKIT_URL = process.env.EXPO_PUBLIC_LIVEKIT_URL || 'wss://your-project-url.livekit.cloud'

// ✅ Detect Expo Go để ngăn chặn việc import native dependencies trực tiếp gây crash
const isExpoGo = Constants.appOwnership === 'expo'

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
  } catch (error) {
    console.error('Failed to load LiveKit libraries:', error)
  }
}

// Xin quyền camera và micro trên Android
async function requestAndroidPermissions(isVideoCall: boolean): Promise<boolean> {
  if (Platform.OS !== 'android') return true
  try {
    const perms: string[] = [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO]
    if (isVideoCall) perms.push(PermissionsAndroid.PERMISSIONS.CAMERA)
    const results = await PermissionsAndroid.requestMultiple(perms as any)
    return perms.every(
      (p) => results[p as keyof typeof results] === PermissionsAndroid.RESULTS.GRANTED
    )
  } catch {
    return false
  }
}

export default function CallScreen({ route, navigation }: any) {
  const { roomName, userName, isVideoCall, callId, conversationId, callerName, callerAvatar } =
    route.params as any

  const { socket } = useChatContext() as any

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

  const toggleMic = () => {
    setIsMicOn(!isMicOn)
  }

  const toggleVideo = () => {
    setIsVideoOn(!isVideoOn)
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

        {/* Khung camera nhỏ của chính mình (chỉ hiện khi bật camera) */}
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
          onPress={toggleMic}
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
          onPress={toggleVideo}
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

  // Bật/tắt AudioSession
  useEffect(() => {
    AudioSession?.startAudioSession()
    return () => {
      AudioSession?.stopAudioSession()
    }
  }, [])

  // Xin quyền hệ thống
  useEffect(() => {
    const setup = async () => {
      const granted = await requestAndroidPermissions(isVideoCall)
      if (!granted) {
        setError(
          'Ứng dụng cần quyền Camera/Microphone.\nVào Cài đặt → Ứng dụng → ChatPulse → Quyền để cấp quyền.'
        )
        return
      }
      setPermissionsGranted(true)
    }
    setup()
  }, [isVideoCall])

  // Lấy LiveKit Token từ Backend
  useEffect(() => {
    if (!permissionsGranted) return
    const fetchToken = async () => {
      try {
        const fetchedToken = await getLiveKitToken(roomName, userName)
        setToken(fetchedToken)
        if (socket && callId && conversationId) {
          socket.emit('call:join', { callId, conversationId })
        }
      } catch (err) {
        console.error('Lỗi lấy token:', err)
        setError('Không thể kết nối cuộc gọi. Vui lòng thử lại.')
      }
    }
    fetchToken()
  }, [permissionsGranted, roomName, userName, callId, conversationId, socket])

  // Lắng nghe sự kiện ngắt kết nối từ đối phương
  useEffect(() => {
    if (!socket) return
    const goBack = () =>
      navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Main')
    socket.on('call:ended', goBack)
    socket.on('call:rejected', goBack)
    return () => {
      socket.off('call:ended', goBack)
      socket.off('call:rejected', goBack)
    }
  }, [socket, navigation])

  const handleLeave = useCallback(() => {
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

  const cameraTracks = useTracks([Track.Source.Camera])

  const isTrackRef = (t: any): boolean =>
    t && 'publication' in t && t.publication !== undefined

  const localVideoTrack = cameraTracks.find(
    (t: any): boolean => t.participant.isLocal && isTrackRef(t)
  )
  const remoteVideoTracks = cameraTracks.filter(
    (t: any): boolean => !t.participant.isLocal && isTrackRef(t)
  )

  const remoteParticipants = Array.from(room.remoteParticipants.values())
  const isWaiting = remoteParticipants.length === 0
  const displayName = callerName || (remoteParticipants[0] as any)?.name || 'Người dùng'

  const toggleMic = async () => {
    if (room?.localParticipant) {
      await room.localParticipant.setMicrophoneEnabled(!isMicOn)
      setIsMicOn(!isMicOn)
    }
  }

  const toggleVideo = async () => {
    if (room?.localParticipant) {
      await room.localParticipant.setCameraEnabled(!isVideoOn)
      setIsVideoOn(!isVideoOn)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.videoArea}>
        {isWaiting ? (
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
          <VideoTrack trackRef={remoteVideoTracks[0]} style={styles.fullScreenVideo} />
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
            <Text style={styles.waitingText}>
              {isVideoCall ? 'Camera đang tắt' : 'Cuộc gọi thoại đang diễn ra'}
            </Text>
          </View>
        )}

        {isVideoOn && localVideoTrack && (
          <View style={styles.localContainer}>
            <VideoTrack trackRef={localVideoTrack} style={styles.localVideo} />
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
  }
})
