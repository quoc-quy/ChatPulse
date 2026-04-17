import React, { useEffect, useState } from 'react'
import { Modal, View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useChatContext } from '../../contexts/ChatContext'
import { useNavigation } from '@react-navigation/native'

export function GlobalCallUI() {
  const { socket } = useChatContext() as any
  const navigation = useNavigation<any>()
  const [activeCall, setActiveCall] = useState<any>(null)

  useEffect(() => {
    if (!socket) return

    const handleIncoming = (data: any) => {
      // Nếu đang trong cuộc gọi khác, tự động từ chối
      if (activeCall) {
        socket.emit('call:reject', { callId: data.callId, conversationId: data.conversationId })
        return
      }
      setActiveCall({ ...data, isReceiving: true })
    }

    const handleEnded = () => setActiveCall(null)
    const handleRejected = () => setActiveCall(null)
    const handleMissed = () => setActiveCall(null)

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
  }, [socket, activeCall])

  if (!activeCall) return null

  const acceptCall = () => {
    setActiveCall(null)
    navigation.navigate('Call', {
      roomName: activeCall.conversationId,
      userName: 'Mobile User',
      isVideoCall: activeCall.type === 'video',
      callId: activeCall.callId
    })
  }

  const rejectCall = () => {
    socket?.emit('call:reject', {
      callId: activeCall.callId,
      conversationId: activeCall.conversationId
    })
    setActiveCall(null)
  }

  return (
    <Modal visible={!!activeCall} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.avatarContainer}>
            {activeCall.callerAvatar ? (
              <Image source={{ uri: activeCall.callerAvatar }} style={styles.avatar} />
            ) : (
              <Ionicons name="person" size={50} color="#fff" />
            )}
          </View>
          <Text style={styles.callerName}>{activeCall.callerName || 'Ai đó'}</Text>
          <Text style={styles.callType}>
            Đang gọi {activeCall.type === 'video' ? 'Video' : 'Thoại'}...
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.btn, styles.btnReject]} onPress={rejectCall}>
              <Ionicons
                name="call"
                size={28}
                color="#fff"
                style={{ transform: [{ rotate: '135deg' }] }}
              />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnAccept]} onPress={acceptCall}>
              <Ionicons
                name={activeCall.type === 'video' ? 'videocam' : 'call'}
                size={28}
                color="#fff"
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  card: {
    width: '80%',
    backgroundColor: '#1E1E1E',
    borderRadius: 24,
    padding: 30,
    alignItems: 'center'
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20
  },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  callerName: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  callType: { fontSize: 16, color: '#9CA3AF', marginBottom: 30 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20
  },
  btn: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  btnReject: { backgroundColor: '#EF4444' },
  btnAccept: { backgroundColor: '#22C55E' }
})
