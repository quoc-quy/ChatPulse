import { ChevronLeft, Search, X, PlusCircle, MoreHorizontal, UserMinus, Loader2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import type { ChatItem } from '@/context/app.context'
import { groupApi } from '@/apis/group.api'
import { toast } from 'sonner'

interface InfoPanelMembersProps {
  chat: ChatItem
  currentUserId?: string
  onBack: () => void
  onOpenAddMember: () => void
  onMemberUpdate?: () => void
}

export function InfoPanelMembers({
  chat,
  currentUserId,
  onBack,
  onOpenAddMember,
  onMemberUpdate
}: InfoPanelMembersProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const adminId = chat.admin_id

  const isCurrentUserAdmin = String(currentUserId) === String(adminId)

  // State quản lý việc xóa thành viên
  const [memberToRemove, setMemberToRemove] = useState<any | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)

  const getInitials = (name: string) => {
    if (!name) return 'U'
    return name.charAt(0).toUpperCase()
  }

  const filteredMembers = useMemo(() => {
    if (!chat.participants) return []
    if (!searchQuery.trim()) return chat.participants

    const lowerQuery = searchQuery.toLowerCase()
    return chat.participants.filter((member: any) => {
      const name = member.userName || member.fullName || ''
      return name.toLowerCase().includes(lowerQuery)
    })
  }, [chat.participants, searchQuery])

  // Hàm xử lý gọi API xóa
  const handleRemoveMember = async () => {
    if (!memberToRemove) return
    setIsRemoving(true)
    try {
      const targetId = String(memberToRemove._id || memberToRemove.user_id)
      await groupApi.kickMember(chat.id, targetId)

      // HIỂN THỊ TOAST VÀ CẬP NHẬT DATA
      toast.success(`Đã xóa ${memberToRemove.userName || memberToRemove.fullName} khỏi nhóm!`)
      if (onMemberUpdate) onMemberUpdate()

      setMemberToRemove(null)
    } catch (error) {
      console.error('Lỗi khi xóa thành viên:', error)
      toast.error('Không thể xóa thành viên lúc này.')
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <>
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

              // Điều kiện để được phép kick: Current User là Admin VÀ người bị kick không phải là Admin, không phải chính mình
              const canBeKicked = isCurrentUserAdmin && !isAdmin && !isMe

              return (
                <div
                  key={memberId}
                  className='flex items-center justify-between px-3 py-2.5 hover:bg-muted/80 rounded-md cursor-pointer transition-colors group/item'
                >
                  <div className='flex items-center gap-3'>
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

                  {/* NÚT 3 CHẤM (Chỉ Admin mới thấy và chỉ hiển thị khi hover) */}
                  {canBeKicked && (
                    <div className='opacity-0 group-hover/item:opacity-100 transition-opacity'>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className='p-1.5 rounded-full hover:bg-muted-foreground/20 text-muted-foreground outline-none'>
                            <MoreHorizontal className='w-4 h-4' />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end' className='w-[180px]'>
                          <DropdownMenuItem
                            onClick={() => setMemberToRemove(member)}
                            className='text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer font-medium py-2.5'
                          >
                            <UserMinus className='w-4 h-4 mr-2' />
                            Xóa thành viên
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
              )
            })
          ) : (
            <div className='text-center py-10 text-muted-foreground text-[14px]'>Không tìm thấy thành viên nào.</div>
          )}
        </div>
      </div>

      {/* MODAL XÁC NHẬN XÓA THÀNH VIÊN */}
      {memberToRemove &&
        createPortal(
          <div
            className='fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 animate-in fade-in duration-200'
            onClick={() => !isRemoving && setMemberToRemove(null)}
          >
            <div
              className='bg-background w-full max-w-[400px] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 p-6'
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className='text-lg font-bold mb-2'>Xóa thành viên</h3>
              <p className='text-[15px] text-muted-foreground mb-6 leading-relaxed'>
                Bạn có chắc chắn muốn xóa{' '}
                <span className='font-semibold text-foreground'>
                  {memberToRemove.userName || memberToRemove.fullName}
                </span>{' '}
                khỏi nhóm này không?
              </p>

              <div className='flex items-center justify-end gap-3'>
                <button
                  onClick={() => setMemberToRemove(null)}
                  disabled={isRemoving}
                  className='px-4 py-2 rounded-md text-[14px] font-medium text-muted-foreground hover:bg-muted transition-colors'
                >
                  Hủy
                </button>
                <button
                  onClick={handleRemoveMember}
                  disabled={isRemoving}
                  className='flex items-center justify-center gap-2 px-6 py-2 rounded-md text-[14px] font-medium text-white bg-destructive hover:bg-destructive/90 transition-all'
                >
                  {isRemoving && <Loader2 className='w-4 h-4 animate-spin' />}
                  Xóa
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
