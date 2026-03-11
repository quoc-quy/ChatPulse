import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useState, useMemo } from 'react'
import type { Reaction } from '@/types/message.type'

interface ReactionModalProps {
  isOpen: boolean
  onClose: () => void
  reactions: Reaction[]
}

export function ReactionModal({ isOpen, onClose, reactions }: ReactionModalProps) {
  const [activeTab, setActiveTab] = useState('ALL')

  // Tính toán số lượng từng loại emoji
  const reactionCounts = useMemo(() => {
    return reactions.reduce((acc: Record<string, number>, r) => {
      acc[r.emoji] = (acc[r.emoji] || 0) + 1
      return acc
    }, {})
  }, [reactions])

  // Lọc và gom nhóm người dùng
  const groupedReactions = useMemo(() => {
    const usersToShow = activeTab === 'ALL' ? reactions : reactions.filter((r) => r.emoji === activeTab)

    return Object.values(
      usersToShow.reduce((acc: Record<string, any>, reaction) => {
        if (!acc[reaction.userId]) {
          acc[reaction.userId] = { userId: reaction.userId, user: reaction.user, emojis: [] }
        }
        acc[reaction.userId].emojis.push(reaction.emoji)
        return acc
      }, {})
    )
  }, [reactions, activeTab])

  if (!isOpen) return null

  const getInitials = (name?: string) => {
    if (!name || name.trim() === '') return 'U'
    return name.trim().charAt(0).toUpperCase()
  }

  return createPortal(
    <div className='fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center' onClick={onClose}>
      <div
        className='bg-background w-full max-w-md rounded-xl shadow-2xl flex overflow-hidden max-h-[60vh]'
        onClick={(e) => e.stopPropagation()}
      >
        {/* CỘT 1: Danh sách Emoji tổng hợp */}
        <div className='w-1/3 bg-muted/30 border-r border-border p-2 flex flex-col gap-1 overflow-y-auto'>
          <button
            onClick={() => setActiveTab('ALL')}
            className={`flex justify-between items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'ALL' ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'}`}
          >
            <span>Tất cả</span>
            <span>{reactions.length}</span>
          </button>
          {Object.entries(reactionCounts).map(([emoji, count]) => (
            <button
              key={emoji}
              onClick={() => setActiveTab(emoji)}
              className={`flex justify-between items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === emoji ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'}`}
            >
              <span className='text-lg'>{emoji}</span>
              <span>{count as React.ReactNode}</span>
            </button>
          ))}
        </div>

        {/* CỘT 2: Danh sách User theo nhóm */}
        <div className='w-2/3 p-4 overflow-y-auto'>
          <div className='flex justify-between items-center mb-4'>
            <h3 className='font-semibold text-foreground'>Biểu tượng cảm xúc</h3>
            <button onClick={onClose} className='p-1 rounded-full hover:bg-muted'>
              <X className='w-5 h-5' />
            </button>
          </div>
          <div className='flex flex-col gap-4'>
            {groupedReactions.map((group: any) => (
              <div key={group.userId} className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <Avatar className='w-10 h-10 border border-border'>
                    <AvatarImage src={group.user?.avatar} />
                    <AvatarFallback>{getInitials(group.user?.userName)}</AvatarFallback>
                  </Avatar>
                  <span className='font-medium text-sm'>{group.user?.userName || 'Người dùng'}</span>
                </div>
                <div className='flex items-center gap-1'>
                  {group.emojis.map((emj: string, idx: number) => (
                    <span key={idx} className='text-xl'>
                      {emj}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
