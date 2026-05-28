import React, { createContext, useState, useContext, useCallback, useEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { jwtDecode } from 'jwt-decode'
import { getMeApi } from '../apis/user.api'


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
  currentUserId: string
  currentUserName: string
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
  disconnectSocket: () => {},
  currentUserId: '',
  currentUserName: ''
})

export const useChatContext = () => useContext(ChatContext)

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const [totalUnreadCount, setTotalUnreadCount] = useState(0)
  const [localUnreadMap, setLocalUnreadMap] = useState<Record<string, number>>({})
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [socket, setSocket] = useState<Socket | null>(null)
  const [currentUserId, setCurrentUserId] = useState('')
  const [currentUserName, setCurrentUserName] = useState('')

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
      socket.removeAllListeners()
      socket.disconnect()
      setSocket(null)
      console.log('Đã ngắt kết nối Socket')
    }
  }, [socket])

  const connectSocket = useCallback(async () => {
    // ✅ FIX 1: Chỉ skip nếu đang connected thật sự — cho phép reconnect sau khi đổi IP
    if (socket?.connected) return

    try {
      const token = await AsyncStorage.getItem('access_token')
      if (!token) return

      let decodedUserId = ''
      let decodedUserName = ''
      try {
        const decoded: any = jwtDecode(token)
        decodedUserId = decoded.user_id || decoded._id || decoded.id || ''
        decodedUserName = decoded.userName || decoded.name || decoded.username || 'User'
      } catch (decodeError) {
        console.error('Lỗi giải mã token trong ChatContext:', decodeError)
        return
      }

      setCurrentUserId(decodedUserId)
      setCurrentUserName(decodedUserName)

      // Fetch user profile to get the actual username
      getMeApi()
        .then((res) => {
          const user = res.data?.user
          if (user?.userName) {
            setCurrentUserName(user.userName)
          }
        })
        .catch((err) => {
          console.warn('[ChatContext] Error fetching profile:', err)
        })

      // ✅ FIX 2: Đọc custom_ip để kết nối đúng server khi dev/test local
      const customIp = await AsyncStorage.getItem('custom_ip')
      const SOCKET_URL =
        customIp && customIp.trim().length > 0
          ? `http://${customIp.trim()}:4001`
          : `${process.env.EXPO_PUBLIC_API_URL}:4001`

      const newSocket = io(SOCKET_URL, {
        auth: {
          token: `Bearer ${token}`,
          user_id: decodedUserId
        },
        transports: ['websocket']
      })

      newSocket.on('connect', () => {
        console.log('Đã kết nối Socket thành công với ID:', newSocket.id)
      })

      newSocket.on('connect_error', (err) => {
        if (newSocket.active) {
          console.error('Lỗi kết nối Socket:', err.message)
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
    setCurrentUserId('')
    setCurrentUserName('')
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
        disconnectSocket,
        currentUserId,
        currentUserName
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}
