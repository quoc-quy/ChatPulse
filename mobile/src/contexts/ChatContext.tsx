import React, { createContext, useState, useContext, useCallback, useEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { jwtDecode } from 'jwt-decode'

interface ChatContextType {
  totalUnreadCount: number
  setTotalUnreadCount: (count: number) => void
  localUnreadMap: Record<string, number>
  setLocalUnread: (conversationId: string, count: number) => void
  clearLocalUnread: (conversationId: string) => void
  getLocalUnread: (conversationId: string) => number
  resetChatContext: () => void
  drafts: Record<string, string>
  updateDraft: (conversationId: string, text: string) => void
  socket: Socket | null
  connectSocket: () => void
  disconnectSocket: () => void
}

const ChatContext = createContext<ChatContextType>({
  totalUnreadCount: 0,
  setTotalUnreadCount: () => {},
  localUnreadMap: {},
  setLocalUnread: () => {},
  clearLocalUnread: () => {},
  getLocalUnread: () => 0,
  resetChatContext: () => {},
  drafts: {},
  updateDraft: () => {},
  socket: null,
  connectSocket: () => {},
  disconnectSocket: () => {}
})

export const useChatContext = () => useContext(ChatContext)

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const [totalUnreadCount, setTotalUnreadCount] = useState(0)
  const [localUnreadMap, setLocalUnreadMap] = useState<Record<string, number>>({})
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [socket, setSocket] = useState<Socket | null>(null)

  const setLocalUnread = useCallback((conversationId: string, count: number) => {
    setLocalUnreadMap((prev) => ({ ...prev, [conversationId]: count }))
  }, [])

  const clearLocalUnread = useCallback((conversationId: string) => {
    setLocalUnreadMap((prev) => ({ ...prev, [conversationId]: 0 }))
  }, [])

  const getLocalUnread = useCallback(
    (conversationId: string) => localUnreadMap[conversationId] ?? 0,
    [localUnreadMap]
  )

  const updateDraft = useCallback((conversationId: string, text: string) => {
    setDrafts((prev) => ({ ...prev, [conversationId]: text }))
  }, [])

  const disconnectSocket = useCallback(() => {
    if (socket) {
      socket.removeAllListeners() // 🔥 Tránh văng lỗi log đỏ khi ngắt
      socket.disconnect()
      setSocket(null)
      console.log('❌ Đã ngắt kết nối Socket')
    }
  }, [socket])

  const connectSocket = useCallback(async () => {
    if (socket) return // Nếu đã có kết nối rồi thì không tạo mới

    try {
      const token = await AsyncStorage.getItem('access_token')
      if (!token) return

      // Giải mã token để lấy user_id
      let decodedUserId = ''
      try {
        const decoded: any = jwtDecode(token)
        decodedUserId = decoded.user_id || decoded._id || decoded.id
      } catch (decodeError) {
        console.error('Lỗi giải mã token trong ChatContext:', decodeError)
        return
      }

      // ⚠️ CHÚ Ý: Đổi dòng dưới đây thành Địa chỉ IP/Domain Backend của bạn (VD: http://192.168.1.5:4000)
      const SOCKET_URL = `${process.env.EXPO_PUBLIC_API_URL}:4001`

      const newSocket = io(SOCKET_URL, {
        auth: {
          token: `Bearer ${token}`,
          user_id: decodedUserId // 🔥 THÊM DÒNG NÀY: Gửi kèm user_id cho Backend
        },
        transports: ['websocket']
      })

      newSocket.on('connect', () => {
        console.log('✅ Đã kết nối Socket thành công với ID:', newSocket.id)
      })

      newSocket.on('connect_error', (err) => {
        if (newSocket.active) {
          console.error('⚠️ Lỗi kết nối Socket:', err.message)
        }
      })

      setSocket(newSocket)
    } catch (error) {
      console.error('Lỗi khi khởi tạo socket:', error)
    }
  }, [socket])

  const resetChatContext = useCallback(() => {
    setTotalUnreadCount(0)
    setLocalUnreadMap({})
    setDrafts({})
    disconnectSocket()
  }, [disconnectSocket])

  useEffect(() => {
    connectSocket()
    return () => {
      if (socket) socket.disconnect()
    }
  }, [])

  return (
    <ChatContext.Provider
      value={{
        totalUnreadCount,
        setTotalUnreadCount,
        localUnreadMap,
        setLocalUnread,
        clearLocalUnread,
        getLocalUnread,
        resetChatContext,
        drafts,
        updateDraft,
        socket,
        connectSocket,
        disconnectSocket
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}
