import { useState, useContext } from 'react'
import { AppContext } from '@/context/app.context'
import type { ChatItem } from '@/context/app.context'

// Import các sub-components đã tách
import { InfoPanelMain } from './info-panel/InfoPanelMain'
import { InfoPanelMembers } from './info-panel/InfoPanelMembers'
import { AddMemberModal } from './info-panel/AddMemberModal'
import { LeaveGroupModal } from './info-panel/LeaveGroupModal'

interface ChatInfoPanelProps {
  chat: ChatItem
  onClose: () => void
  onMemberUpdate?: () => void
  onLeaveSuccess?: () => void
}

export function ChatInfoPanel({ chat, onClose, onMemberUpdate, onLeaveSuccess }: ChatInfoPanelProps) {
  const { profile } = useContext(AppContext)
  const currentUserId = profile?._id

  // STATE Điều khiển View
  const [currentView, setCurrentView] = useState<'main' | 'members'>('main')

  // STATES Điều khiển Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false)
  const [isDisbandModalOpen, setIsDisbandModalOpen] = useState(false)

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
          onLeaveGroup={() => setIsLeaveModalOpen(true)}
          onDisbandGroup={() => setIsDisbandModalOpen(true)}
        />
      )}

      <AddMemberModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        chat={chat}
        onMemberUpdate={onMemberUpdate}
      />

      {/* Modal Rời nhóm */}
      <LeaveGroupModal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        chat={chat}
        currentUserId={currentUserId!}
        onLeaveSuccess={onLeaveSuccess!}
        mode='leave_group'
      />

      {/* Modal Giải tán nhóm - tái sử dụng LeaveGroupModal với mode='disband' */}
      <LeaveGroupModal
        isOpen={isDisbandModalOpen}
        onClose={() => setIsDisbandModalOpen(false)}
        chat={chat}
        currentUserId={currentUserId!}
        onLeaveSuccess={() => {
          onClose()
          window.dispatchEvent(new Event('refresh_chat_list'))
        }}
        mode='disband'
      />
    </>
  )
}
