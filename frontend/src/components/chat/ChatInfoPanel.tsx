import { useState, useContext } from 'react'
import { AppContext } from '@/context/app.context'
import type { ChatItem } from '@/context/app.context'

import { InfoPanelMain } from './info-panel/InfoPanelMain'
import { InfoPanelMembers } from './info-panel/InfoPanelMembers'

interface ChatInfoPanelProps {
  chat: ChatItem
  onClose: () => void
}

export function ChatInfoPanel({ chat, onClose }: ChatInfoPanelProps) {
  const { profile } = useContext(AppContext)
  const currentUserId = profile?._id

  // STATE: Điều hướng giữa trang chính và trang xem danh sách thành viên
  const [currentView, setCurrentView] = useState<'main' | 'members'>('main')

  if (currentView === 'members') {
    return <InfoPanelMembers chat={chat} currentUserId={currentUserId} onBack={() => setCurrentView('main')} />
  }

  return <InfoPanelMain chat={chat} onClose={onClose} onViewMembers={() => setCurrentView('members')} />
}
