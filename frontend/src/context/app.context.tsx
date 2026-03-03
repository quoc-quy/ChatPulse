import type { User } from '@/types/user.type'
import { getAccessTokenFromLS, getProfileFromLS } from '@/utils/auth'
import React, { createContext, useState } from 'react'

export interface ChatItem {
  id: string
  name: string
  avatar?: string
  isOnline?: boolean
}

interface AppContextInterface {
  isAuthenticated: boolean
  setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>
  profile: User | null
  setProfile: React.Dispatch<React.SetStateAction<User | null>>
  activeChat: ChatItem | null
  setActiveChat: React.Dispatch<React.SetStateAction<ChatItem | null>>
}

const initialAppContext: AppContextInterface = {
  isAuthenticated: Boolean(getAccessTokenFromLS()),
  setIsAuthenticated: () => null,
  profile: getProfileFromLS(),
  setProfile: () => null,
  activeChat: null,
  setActiveChat: () => null
}

// eslint-disable-next-line react-refresh/only-export-components
export const AppContext = createContext<AppContextInterface>(initialAppContext)

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(initialAppContext.isAuthenticated)
  const [profile, setProfile] = useState<User | null>(initialAppContext.profile)
  const [activeChat, setActiveChat] = useState<ChatItem | null>(initialAppContext.activeChat)

  return (
    <AppContext.Provider
      value={{
        isAuthenticated,
        setIsAuthenticated,
        profile,
        setProfile,
        activeChat,
        setActiveChat
      }}
    >
      {children}
    </AppContext.Provider>
  )
}
