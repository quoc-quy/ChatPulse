import { useState, useContext } from 'react'
import { AppContext } from '@/context/app.context'
import type { ChatItem } from '@/context/app.context'

// Import các sub-components đã tách
import { InfoPanelMain } from './info-panel/InfoPanelMain'
import { InfoPanelMembers } from './info-panel/InfoPanelMembers'
import { AddMemberModal } from './info-panel/AddMemberModal'

interface ChatInfoPanelProps {
  chat: ChatItem
  onClose: () => void
  onMemberUpdate?: () => void // THÊM PROP MỚI
}

export function ChatInfoPanel({ chat, onClose, onMemberUpdate }: ChatInfoPanelProps) {
  const { profile } = useContext(AppContext)
  const currentUserId = profile?._id

  // STATE: Điều hướng giữa trang chính và trang xem danh sách thành viên
  const [currentView, setCurrentView] = useState<'main' | 'members'>('main')

  // STATE: Quản lý hiển thị AddMemberModal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  return (
    <>
      {currentView === 'members' ? (
        <InfoPanelMembers
          chat={chat}
          currentUserId={currentUserId}
          onBack={() => setCurrentView('main')}
          onOpenAddMember={() => setIsAddModalOpen(true)}
          onMemberUpdate={onMemberUpdate}
        />
      ) : (
        <InfoPanelMain
          chat={chat}
          onClose={onClose}
          onViewMembers={() => setCurrentView('members')}
          onOpenAddMember={() => setIsAddModalOpen(true)}
        />
      )}

      {/* RENDER MODAL */}
      <AddMemberModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        chat={chat}
        onMemberUpdate={onMemberUpdate}
      />
    </>
  )
}
