import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { io, type Socket } from 'socket.io-client'
import { AppContext } from './app.context'
import { getAccessTokenFromLS } from '@/utils/auth'

interface SocketContextType {
  socket: Socket | null
}

const SocketContext = createContext<SocketContextType>({ socket: null })

export const useSocket = () => useContext(SocketContext)

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null)
  const { isAuthenticated, profile } = useContext(AppContext)

  useEffect(() => {
    // Chỉ khởi tạo socket khi đã đăng nhập
    if (isAuthenticated && profile) {
      const accessToken = getAccessTokenFromLS()

      const host = window.location.hostname
      const newSocket = io(`http://${host}:4001`, {
        auth: {
          token: accessToken,
          user_id: profile._id
        }
      })

      setSocket(newSocket)

      return () => {
        newSocket.disconnect()
      }
    }
  }, [isAuthenticated, profile])

  return <SocketContext.Provider value={{ socket }}>{children}</SocketContext.Provider>
}
