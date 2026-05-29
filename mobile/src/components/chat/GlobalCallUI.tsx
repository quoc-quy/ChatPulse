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
  Platform,
  PanResponder,
  Dimensions,
  SafeAreaView
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useChatContext } from '../../contexts/ChatContext'
import CallScreen from '../../screens/CallScreen'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

export function GlobalCallUI() {
  const { activeCall, setActiveCall, socket, currentUserId, currentUserName } = useChatContext() as any

  const pulseAnim = useRef(new Animated.Value(1)).current
  const activeCallRef = useRef(activeCall)

  useEffect(() => {
    activeCallRef.current = activeCall
  }, [activeCall])

  useEffect(() => {
    if (!activeCall || !activeCall.isReceiving) return
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
  }, [activeCall?.isReceiving, activeCall?.callId])

  useEffect(() => {
    if (!socket) return

    const handleIncoming = (data: any) => {
      console.log('>>> [Mobile GlobalCallUI] call:incoming received:', data)
      if (activeCallRef.current) {
        console.log('>>> [Mobile GlobalCallUI] Already in call, rejecting')
        socket.emit('call:reject', {
          callId: data.callId,
          conversationId: data.conversationId
        })
        return
      }
      setActiveCall({ ...data, isReceiving: true, isMinimized: false })
    }

    const handleEnded = () => {
      console.log('>>> [Mobile GlobalCallUI] call:ended received')
      setActiveCall(null)
      Vibration.cancel()
    }

    const handleRejected = () => {
      console.log('>>> [Mobile GlobalCallUI] call:rejected received')
      setActiveCall(null)
      Vibration.cancel()
    }

    const handleMissed = () => {
      console.log('>>> [Mobile GlobalCallUI] call:missed received')
      setActiveCall(null)
      Vibration.cancel()
    }

    const handleAccepted = (data: any) => {
      console.log('>>> [Mobile GlobalCallUI] call:accepted received:', data)
      if (activeCallRef.current && activeCallRef.current.isCalling) {
        socket.emit('call:join', {
          callId: activeCallRef.current.callId,
          conversationId: activeCallRef.current.conversationId
        })
        setActiveCall({ ...activeCallRef.current, isCalling: false, isReceiving: false, isMinimized: false })
      }
    }

    socket.on('call:incoming', handleIncoming)
    socket.on('call:ended', handleEnded)
    socket.on('call:rejected', handleRejected)
    socket.on('call:missed', handleMissed)
    socket.on('call:accepted', handleAccepted)

    return () => {
      socket.off('call:incoming', handleIncoming)
      socket.off('call:ended', handleEnded)
      socket.off('call:rejected', handleRejected)
      socket.off('call:missed', handleMissed)
      socket.off('call:accepted', handleAccepted)
    }
  }, [socket])

  const acceptCall = () => {
    if (!activeCall) return
    Vibration.cancel()

    socket?.emit('call:accepted', {
      callId: activeCall.callId,
      conversationId: activeCall.conversationId
    })

    setActiveCall({
      ...activeCall,
      isReceiving: false,
      isMinimized: false,
      userName: currentUserName || 'User',
      roomName: activeCall.conversationId,
      isVideoCall: activeCall.type === 'video'
    })
  }

  const rejectCall = () => {
    if (!activeCall) return
    socket?.emit('call:reject', {
      callId: activeCall.callId,
      conversationId: activeCall.conversationId
    })
    setActiveCall(null)
    Vibration.cancel()
  }

  const cancelCall = () => {
    if (!activeCall) return
    socket?.emit('call:leave', {
      callId: activeCall.callId,
      conversationId: activeCall.conversationId
    })
    setActiveCall(null)
  }

  // PanResponder for Draggable floating widget
  const pan = useRef(new Animated.ValueXY({ x: SCREEN_WIDTH - 80, y: SCREEN_HEIGHT - 180 })).current
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value
        })
        pan.setValue({ x: 0, y: 0 })
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false
      }),
      onPanResponderRelease: (e, gestureState) => {
        pan.flattenOffset()
        // Check if it's a click/tap
        if (Math.abs(gestureState.dx) < 8 && Math.abs(gestureState.dy) < 8) {
          setActiveCall((prev: any) => ({ ...prev, isMinimized: false }))
        } else {
          // Keep on screen bounds
          let finalX = (pan.x as any)._value
          let finalY = (pan.y as any)._value

          if (finalX < 10) finalX = 10
          if (finalX > SCREEN_WIDTH - 70) finalX = SCREEN_WIDTH - 70
          if (finalY < 40) finalY = 40
          if (finalY > SCREEN_HEIGHT - 120) finalY = SCREEN_HEIGHT - 120

          Animated.spring(pan, {
            toValue: { x: finalX, y: finalY },
            useNativeDriver: false
          }).start()
        }
      }
    })
  ).current

  if (!activeCall) return null

  // Outgoing waiting call
  if (activeCall.isCalling) {
    return (
      <View style={styles.overlayContainer}>
        <SafeAreaView style={styles.overlay}>
          <View style={styles.card}>
            <View style={styles.avatarWrapper}>
              {activeCall.callerAvatar ? (
                <Image source={{ uri: activeCall.callerAvatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarText}>
                    {(activeCall.callerName || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <Animated.View
                style={[styles.avatarPulseRing, { transform: [{ scale: pulseAnim }] }]}
              />
            </View>
            <Text style={styles.callerName}>{activeCall.callerName || 'Đang gọi...'}</Text>
            <Text style={styles.callType}>
              Đang kết nối {activeCall.type === 'video' ? 'Video' : 'Thoại'}...
            </Text>
            <TouchableOpacity style={[styles.btn, styles.btnReject, { marginTop: 20 }]} onPress={cancelCall}>
              <Ionicons name="close" size={30} color="#fff" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    )
  }

  // Incoming ring call
  if (activeCall.isReceiving) {
    return (
      <Modal visible={true} transparent animationType="slide" statusBarTranslucent>
        <View style={styles.overlay}>
          <View style={styles.card}>
            <View style={styles.avatarWrapper}>
              {activeCall.callerAvatar ? (
                <Image source={{ uri: activeCall.callerAvatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarText}>
                    {(activeCall.callerName || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <Animated.View
                style={[styles.avatarPulseRing, { transform: [{ scale: pulseAnim }] }]}
              />
            </View>

            <Text style={styles.callerName}>{activeCall.callerName || 'Ai đó'}</Text>
            <Text style={styles.callType}>
              Đang gọi {activeCall.type === 'video' ? 'Video' : 'Thoại'}...
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
                      name={activeCall.type === 'video' ? 'videocam' : 'call'}
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

  // Minimized call widget
  if (activeCall.isMinimized) {
    return (
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.floatingWidget,
          {
            transform: pan.getTranslateTransform()
          }
        ]}
      >
        <TouchableOpacity style={styles.floatingButton} activeOpacity={0.8}>
          <Ionicons name="call" size={24} color="#fff" />
          <View style={styles.floatingPulse} />
        </TouchableOpacity>
      </Animated.View>
    )
  }

  // Full screen active call room
  return (
    <View style={styles.overlayContainer}>
      <CallScreen
        {...activeCall}
        onMinimize={() => {
          console.log('[GlobalCallUI] Minimizing call screen')
          setActiveCall({ ...activeCall, isMinimized: true })
        }}
        onLeave={() => {
          console.log('[GlobalCallUI] Leaving call screen')
          setActiveCall(null)
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#111111',
    zIndex: 99999
  },
  floatingWidget: {
    position: 'absolute',
    width: 60,
    height: 60,
    zIndex: 100000,
    elevation: 10
  },
  floatingButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6
  },
  floatingPulse: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(34,197,94,0.5)',
    transform: [{ scale: 1.1 }]
  },
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
