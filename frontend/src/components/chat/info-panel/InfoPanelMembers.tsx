import { ChevronLeft, Search, X, PlusCircle } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { useState, useMemo } from 'react'
import type { ChatItem } from '@/context/app.context'

interface InfoPanelMembersProps {
  chat: ChatItem
  currentUserId?: string
  onBack: () => void
  onOpenAddMember: () => void
}

export function InfoPanelMembers({ chat, currentUserId, onBack, onOpenAddMember }: InfoPanelMembersProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const adminId = chat.admin_id

  const getInitials = (name: string) => {
    if (!name) return 'U'
    return name.charAt(0).toUpperCase()
  }

  // Lọc danh sách realtime
  const filteredMembers = useMemo(() => {
    if (!chat.participants) return []
    if (!searchQuery.trim()) return chat.participants

    const lowerQuery = searchQuery.toLowerCase()
    return chat.participants.filter((member: any) => {
      const name = member.userName || member.fullName || ''
      return name.toLowerCase().includes(lowerQuery)
    })
  }, [chat.participants, searchQuery])

  return (
    <div className='w-[340px] flex-shrink-0 border-l border-border/40 bg-background flex flex-col h-screen overflow-hidden animate-in slide-in-from-right-2 duration-300'>
      <div className='flex h-16 items-center px-4 border-b border-border/40 relative shrink-0 gap-3'>
        <button
          onClick={onBack}
          className='p-1.5 -ml-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors'
        >
          <ChevronLeft className='w-6 h-6' />
        </button>
        <h2 className='text-[17px] font-semibold'>Thành viên ({chat.participants?.length || 0})</h2>
      </div>

      <div className='px-4 py-3 border-b border-border/40 shrink-0'>
        <div className='relative flex items-center'>
          <Search className='absolute left-3 w-4 h-4 text-muted-foreground' />
          <input
            type='text'
            placeholder='Tìm thành viên...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='w-full bg-muted/60 border border-transparent focus:border-primary/50 focus:bg-background rounded-full pl-9 pr-4 py-1.5 text-[14px] outline-none transition-all'
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className='absolute right-3 text-muted-foreground hover:text-foreground'
            >
              <X className='w-4 h-4' />
            </button>
          )}
        </div>
      </div>

      <div className='flex-1 overflow-y-auto scroll-smooth p-2'>
        {!searchQuery && (
          <>
            <div
              onClick={onOpenAddMember}
              className='flex items-center gap-3 px-3 py-3 hover:bg-muted/80 rounded-md cursor-pointer transition-colors'
            >
              <div className='w-10 h-10 rounded-full bg-muted flex items-center justify-center border border-border/50'>
                <PlusCircle className='w-5 h-5 text-muted-foreground' />
              </div>
              <span className='text-[14px] font-medium text-foreground'>Thêm thành viên</span>
            </div>
            <Separator className='my-1 bg-border/40 mx-2' />
          </>
        )}

        {filteredMembers.length > 0 ? (
          filteredMembers.map((member: any) => {
            const memberId = String(member._id || member.user_id)
            const isMe = memberId === String(currentUserId)
            const isAdmin = memberId === String(adminId)

            return (
              <div
                key={memberId}
                className='flex items-center gap-3 px-3 py-2.5 hover:bg-muted/80 rounded-md cursor-pointer transition-colors'
              >
                <Avatar className='h-10 w-10 border border-border'>
                  <AvatarImage src={member.avatar} />
                  <AvatarFallback className='text-xs bg-blue-100 text-blue-600'>
                    {getInitials(member.userName || member.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div className='flex flex-col'>
                  <span className='text-[14px] text-foreground font-medium flex items-center gap-1.5'>
                    {member.userName || member.fullName}
                    {isMe && <span className='text-muted-foreground font-normal text-[13px]'>(Bạn)</span>}
                  </span>
                  {isAdmin && <span className='text-[12px] text-blue-500 font-medium'>Trưởng nhóm</span>}
                </div>
              </div>
            )
          })
        ) : (
          <div className='text-center py-10 text-muted-foreground text-[14px]'>Không tìm thấy thành viên nào.</div>
        )}
      </div>
    </div>
  )
}
