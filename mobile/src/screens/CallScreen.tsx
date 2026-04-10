import React, { useEffect, useState } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  SafeAreaView,
  ActivityIndicator
} from 'react-native'
import {
  LiveKitRoom,
  useRoomContext,
  useTracks,
  VideoTrack,
  TrackReference,
  TrackReferenceOrPlaceholder
} from '@livekit/react-native'
import { Track } from 'livekit-client'
import { Ionicons } from '@expo/vector-icons'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParamList } from '../types/types'
import { getLiveKitToken } from '../apis/call.api'

// Thay URL này bằng WebSocket URL từ LiveKit Dashboard của bạn
const LIVEKIT_URL = process.env.EXPO_PUBLIC_LIVEKIT_URL || 'wss://your-project-url.livekit.cloud'

type Props = NativeStackScreenProps<RootStackParamList, 'Call'>

export default function CallScreen({ route, navigation }: Props) {
  const { roomName, userName, isVideoCall } = route.params
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const fetchedToken = await getLiveKitToken(roomName, userName)
        setToken(fetchedToken)
      } catch (error) {
        console.error('Lỗi lấy token:', error)
      }
    }
    fetchToken()
  }, [roomName, userName])

  if (!token) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#C084FC" />
        <Text style={styles.loadingText}>Đang thiết lập kết nối mã hóa...</Text>
      </View>
    )
  }

  return (
    <LiveKitRoom
      serverUrl={LIVEKIT_URL}
      token={token}
      connect={true}
      audio={true}
      video={isVideoCall}
    >
      <RoomView navigation={navigation} />
    </LiveKitRoom>
  )
}

function RoomView({ navigation }: { navigation: any }) {
  const room = useRoomContext()
  const [isMicOn, setIsMicOn] = useState(true)
  const [isVideoOn, setIsVideoOn] = useState(true)

  // Lấy danh sách các luồng camera
  const tracks = useTracks([Track.Source.Camera])

  const isTrackReference = (track: TrackReferenceOrPlaceholder): track is TrackReference =>
    track.publication !== undefined

  const localTrack = tracks.find(
    (t): t is TrackReference => t.participant.isLocal && isTrackReference(t)
  )
  const remoteTrack = tracks.find(
    (t): t is TrackReference => !t.participant.isLocal && isTrackReference(t)
  )

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

  const endCall = () => {
    if (room) {
      room.disconnect()
    }
    if (navigation.canGoBack()) {
      navigation.goBack()
    } else {
      navigation.navigate('Main')
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.remoteContainer}>
        {remoteTrack ? (
          <VideoTrack trackRef={remoteTrack} style={styles.fullScreenVideo} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person-circle-outline" size={120} color="#333" />
            <Text style={styles.waitingText}>Đang chờ đối phương bắt máy...</Text>
          </View>
        )}
      </View>

      {isVideoOn && localTrack && (
        <View style={styles.localContainer}>
          <VideoTrack trackRef={localTrack} style={styles.localVideo} />
        </View>
      )}

      <View style={styles.controlsContainer}>
        <TouchableOpacity style={styles.controlButton} onPress={toggleMic}>
          <Ionicons name={isMicOn ? 'mic' : 'mic-off'} size={28} color="white" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.endCallButton} onPress={endCall}>
          <Ionicons
            name="call"
            size={32}
            color="white"
            style={{ transform: [{ rotate: '135deg' }] }}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton} onPress={toggleVideo}>
          <Ionicons name={isVideoOn ? 'videocam' : 'videocam-off'} size={28} color="white" />
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
    alignItems: 'center'
  },
  loadingText: { color: '#E5E7EB', marginTop: 12, fontSize: 16 },
  container: { flex: 1, backgroundColor: '#111111' },
  remoteContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center'
  },
  fullScreenVideo: { width: '100%', height: '100%' },
  avatarPlaceholder: { alignItems: 'center' },
  waitingText: { color: '#9CA3AF', marginTop: 10, fontSize: 16 },
  localContainer: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 110,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#333',
    borderWidth: 1.5,
    borderColor: '#555',
    elevation: 5
  },
  localVideo: { flex: 1 },
  controlsContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: 30
  },
  controlButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center'
  },
  endCallButton: {
    backgroundColor: '#FF3B30',
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center'
  }
})
