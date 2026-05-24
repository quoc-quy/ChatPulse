import React, { useEffect, useRef, useState } from 'react'
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Vibration,
  Platform
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useChatContext } from '../../contexts/ChatContext'
import { useNavigation } from '@react-navigation/native'

interface IncomingCall {
  callId: string
  conversationId: string
  callerId: string
  callerName: string
  callerAvatar?: string
  type: 'audio' | 'video'
}

export function GlobalCallUI() {
  const { socket, currentUserName } = useChatContext() as any
  const navigation = useNavigation<any>()
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null)

  // ✅ FIX 4: Dùng ref để tránh stale closure trong socket event handler
  // Nếu chỉ dùng state, handleIncoming sẽ "thấy" giá trị cũ của incomingCall
  const incomingCallRef = useRef<IncomingCall | null>(null)
  useEffect(() => {
    incomingCallRef.current = incomingCall
  }, [incomingCall])

  const pulseAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (!incomingCall) return
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true })
      ])
    )
    pulse.start()

    const vibrationPattern = Platform.OS === 'android' ? [0, 800, 400, 800, 400, 800] : [0, 800]
    Vibration.vibrate(vibrationPattern, true)

    return () => {
      pulse.stop()
      Vibration.cancel()
    }
  }, [incomingCall])

  useEffect(() => {
    if (!socket) return

    const handleIncoming = (data: IncomingCall) => {
      // ✅ FIX 4: Đọc từ ref (luôn là giá trị mới nhất) thay vì state (có thể stale)
      if (incomingCallRef.current) {
        socket.emit('call:reject', {
          callId: data.callId,
          conversationId: data.conversationId
        })
        return
      }
      setIncomingCall(data)
    }

    const handleEnded = () => {
      setIncomingCall(null)
      Vibration.cancel()
    }

    const handleRejected = () => {
      setIncomingCall(null)
      Vibration.cancel()
    }

    const handleMissed = () => {
      setIncomingCall(null)
      Vibration.cancel()
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
    // ✅ FIX 4: Bỏ incomingCall khỏi deps — dùng ref thay thế để tránh re-register listener liên tục
  }, [socket])

  const acceptCall = () => {
    if (!incomingCall) return
    const call = incomingCall
    setIncomingCall(null)
    Vibration.cancel()

    // ✅ FIX 5: Emit call:accepted để server/web biết mobile đã chấp nhận và join LiveKit
    // Thiếu event này → web không biết → hai bên chờ nhau mãi
    socket?.emit('call:accepted', {
      callId: call.callId,
      conversationId: call.conversationId
    })

    const myName = currentUserName || 'User'

    navigation.navigate('Call', {
      roomName: call.conversationId,
      userName: myName,
      isVideoCall: call.type === 'video',
      callId: call.callId,
      conversationId: call.conversationId,
      // Truyền thêm để CallScreen hiển thị đúng tên/avatar người gọi
      callerName: call.callerName,
      callerAvatar: call.callerAvatar ?? null
    })
  }

  const rejectCall = () => {
    if (!incomingCall) return
    socket?.emit('call:reject', {
      callId: incomingCall.callId,
      conversationId: incomingCall.conversationId
    })
    setIncomingCall(null)
    Vibration.cancel()
  }

  if (!incomingCall) return null

  return (
    <Modal visible={true} transparent animationType="slide" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.avatarWrapper}>
            {incomingCall.callerAvatar ? (
              <Image source={{ uri: incomingCall.callerAvatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarText}>
                  {(incomingCall.callerName || 'U').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <Animated.View
              style={[styles.avatarPulseRing, { transform: [{ scale: pulseAnim }] }]}
            />
          </View>

          <Text style={styles.callerName}>{incomingCall.callerName || 'Ai đó'}</Text>
          <Text style={styles.callType}>
            Đang gọi {incomingCall.type === 'video' ? 'Video' : 'Thoại'}...
          </Text>

          <View style={styles.actions}>
            <View style={styles.actionItem}>
              <TouchableOpacity style={[styles.btn, styles.btnReject]} onPress={rejectCall}>
                <Ionicons
                  name="call"
                  size={30}
                  color="#fff"
                  style={{ transform: [{ rotate: '135deg' }] }}
                />
              </TouchableOpacity>
              <Text style={styles.actionLabel}>Từ chối</Text>
            </View>

            <View style={styles.actionItem}>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <TouchableOpacity style={[styles.btn, styles.btnAccept]} onPress={acceptCall}>
                  <Ionicons
                    name={incomingCall.type === 'video' ? 'videocam' : 'call'}
                    size={30}
                    color="#fff"
                  />
                </TouchableOpacity>
              </Animated.View>
              <Text style={styles.actionLabel}>Nghe máy</Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  card: {
    width: '82%',
    backgroundColor: '#1C1C1E',
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 16
  },
  avatarWrapper: {
    position: 'relative',
    width: 110,
    height: 110,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    zIndex: 1
  },
  avatarFallback: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1
  },
  avatarText: {
    fontSize: 40,
    color: '#fff',
    fontWeight: 'bold'
  },
  avatarPulseRing: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    borderColor: 'rgba(124,58,237,0.5)',
    zIndex: 0
  },
  callerName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center'
  },
  callType: {
    fontSize: 15,
    color: '#9CA3AF',
    marginBottom: 36
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 10
  },
  actionItem: {
    alignItems: 'center',
    gap: 10
  },
  btn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4
  },
  btnReject: {
    backgroundColor: '#EF4444'
  },
  btnAccept: {
    backgroundColor: '#22C55E'
  },
  actionLabel: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 6
  }
})
