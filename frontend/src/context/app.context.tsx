import { createContext, useState, type ReactNode, type Dispatch, type SetStateAction } from 'react'
import type { User } from '@/types/user.type'
import { getProfileFromLS } from '@/utils/auth'

export interface ActiveCall {
  callId: string
  conversationId: string
  type: 'video' | 'audio'
  isReceiving: boolean
  callerName?: string
  callerAvatar?: string
}

export interface ChatItem {
  id: string
  name: string
  avatar?: string
  isOnline?: boolean
  lastActiveAt?: string
  type: string
  unreadCount?: number
}

interface AppContextInterface {
  isAuthenticated: boolean
  setIsAuthenticated: Dispatch<SetStateAction<boolean>>
  profile: User | null
  setProfile: Dispatch<SetStateAction<User | null>>
  activeChat: ChatItem | null
  setActiveChat: Dispatch<SetStateAction<ChatItem | null>>
  activeCall: ActiveCall | null
  setActiveCall: Dispatch<SetStateAction<ActiveCall | null>>
}

const initialAppContext: AppContextInterface = {
  isAuthenticated: Boolean(getProfileFromLS()),
  setIsAuthenticated: () => null,
  profile: getProfileFromLS(),
  setProfile: () => null,
  activeChat: null,
  setActiveChat: () => null,
  activeCall: null,
  setActiveCall: () => null
}

// eslint-disable-next-line react-refresh/only-export-components
export const AppContext = createContext<AppContextInterface>(initialAppContext)

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(initialAppContext.isAuthenticated)
  const [profile, setProfile] = useState<User | null>(initialAppContext.profile)
  const [activeChat, setActiveChat] = useState<ChatItem | null>(null)
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null)

  return (
    <AppContext.Provider
      value={{
        isAuthenticated,
        setIsAuthenticated,
        profile,
        setProfile,
        activeChat,
        setActiveChat,
        activeCall,
        setActiveCall
      }}
    >
      {children}
    </AppContext.Provider>
  )
}
