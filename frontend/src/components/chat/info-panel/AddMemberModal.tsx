import { X, Search, Check, Loader2, Users } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import type { ChatItem } from '@/context/app.context'
import http from '@/utils/http'
import { groupApi } from '@/apis/group.api'
import { toast } from 'sonner'

interface AddMemberModalProps {
  isOpen: boolean
  onClose: () => void
  chat: ChatItem
  onMemberUpdate?: () => void
}

export function AddMemberModal({ isOpen, onClose, chat, onMemberUpdate }: AddMemberModalProps) {
  const [friends, setFriends] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<any[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Gọi API lấy danh sách bạn bè khi Modal được mở
  useEffect(() => {
    if (isOpen) {
      fetchFriends()
      setSearchQuery('')
      setSelectedUsers([])
    }
  }, [isOpen])

  const fetchFriends = async () => {
    setIsLoading(true)
    try {
      const res = await http.get('/friends/list')
      const data = res.data?.result || res.data?.data || res.data || []
      setFriends(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Lỗi khi lấy danh sách bạn bè:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Lọc theo từ khóa tìm kiếm (nhập tới đâu lọc tới đó ngay lập tức)
  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friends // Mặc định hiển thị TẤT CẢ bạn bè
    const lowerQuery = searchQuery.toLowerCase()
    return friends.filter((f) => {
      const name = f.userName || f.fullName || ''
      return name.toLowerCase().includes(lowerQuery)
    })
  }, [friends, searchQuery])

  // Chọn hoặc bỏ chọn một thành viên
  const toggleUser = (user: any) => {
    const isSelected = selectedUsers.some((u) => String(u._id || u.user_id) === String(user._id || user.user_id))
    if (isSelected) {
      setSelectedUsers((prev) => prev.filter((u) => String(u._id || u.user_id) !== String(user._id || user.user_id)))
    } else {
      setSelectedUsers((prev) => [...prev, user])
    }
  }

  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) return
    setIsSubmitting(true)
    try {
      const userIds = selectedUsers.map((u) => String(u._id || u.user_id))
      await groupApi.addMembers(chat.id, userIds)

      // HIỂN THỊ TOAST VÀ CẬP NHẬT DATA
      toast.success('Đã thêm thành viên vào nhóm thành công!')
      if (onMemberUpdate) onMemberUpdate()

      onClose()
    } catch (error) {
      console.error('Lỗi khi thêm thành viên:', error)
      toast.error('Thêm thành viên thất bại. Vui lòng thử lại.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getInitials = (name: string) => {
    if (!name) return 'U'
    return name.charAt(0).toUpperCase()
  }

  if (!isOpen) return null

  return createPortal(
    <div
      className='fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 animate-in fade-in duration-200'
      onClick={onClose}
    >
      {/* Container của Modal - Cố định height 80vh */}
      <div
        className='bg-background w-full max-w-[420px] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200'
        style={{ height: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className='flex h-14 items-center px-4 border-b border-border/40 relative shrink-0'>
          <h2 className='text-[17px] font-semibold flex-1 text-center'>Thêm thành viên</h2>
          <button
            onClick={onClose}
            className='absolute right-3 p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        {/* SEARCH INPUT */}
        <div className='px-4 py-3 border-b border-border/40 shrink-0'>
          <div className='relative flex items-center'>
            <Search className='absolute left-3 w-4 h-4 text-muted-foreground' />
            <input
              type='text'
              placeholder='Tìm kiếm bạn bè theo tên...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='w-full bg-muted/60 border border-transparent focus:border-primary/50 focus:bg-background rounded-full pl-9 pr-4 py-2 text-[14px] outline-none transition-all'
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

        {/* FRIEND LIST CONTENT */}
        <div className='flex-1 overflow-y-auto p-2 scroll-smooth'>
          {isLoading ? (
            <div className='flex flex-col items-center justify-center h-full gap-2 text-muted-foreground'>
              <Loader2 className='w-6 h-6 animate-spin text-primary' />
              <span className='text-[14px]'>Đang tải...</span>
            </div>
          ) : friends.length === 0 ? (
            <div className='flex flex-col items-center justify-center h-full text-center px-6'>
              <div className='w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4'>
                <Users className='w-8 h-8 text-muted-foreground/50' />
              </div>
              <p className='text-[15px] font-medium text-foreground mb-1'>Chưa có bạn bè nào</p>
              <p className='text-[13px] text-muted-foreground'>Bạn cần kết bạn trước khi có thể thêm họ vào nhóm.</p>
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className='text-center py-10 text-muted-foreground text-[14px]'>
              Không tìm thấy kết quả phù hợp cho "{searchQuery}".
            </div>
          ) : (
            // Danh sách bạn bè
            <div className='flex flex-col gap-1'>
              {filteredFriends.map((friend) => {
                const friendId = String(friend._id || friend.user_id)

                // Kiểm tra xem người này đã có trong nhóm chưa
                const isAlreadyMember = chat.participants?.some((p: any) => String(p._id || p.user_id) === friendId)
                const isSelected = selectedUsers.some((u) => String(u._id || u.user_id) === friendId)

                return (
                  <div
                    key={friendId}
                    onClick={() => {
                      if (!isAlreadyMember) toggleUser(friend)
                    }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isAlreadyMember ? 'opacity-60 cursor-not-allowed' : 'hover:bg-muted/80 cursor-pointer'}`}
                  >
                    {/* Checkbox tròn (Disable nếu đã tham gia) */}
                    <div
                      className={`w-[22px] h-[22px] rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                        isAlreadyMember
                          ? 'bg-muted-foreground/20 border-muted-foreground/30' // Màu xám cho người đã trong nhóm
                          : isSelected
                            ? 'bg-primary border-primary'
                            : 'border-muted-foreground/40 bg-background'
                      }`}
                    >
                      {(isSelected || isAlreadyMember) && (
                        <Check
                          className={`w-3.5 h-3.5 ${isAlreadyMember ? 'text-muted-foreground' : 'text-white'}`}
                          strokeWidth={3}
                        />
                      )}
                    </div>

                    <Avatar className='h-10 w-10 border border-border'>
                      <AvatarImage src={friend.avatar} />
                      <AvatarFallback className='text-xs bg-blue-100 text-blue-600'>
                        {getInitials(friend.userName || friend.fullName)}
                      </AvatarFallback>
                    </Avatar>

                    <div className='flex flex-col flex-1 truncate'>
                      <span className='text-[14px] text-foreground font-medium truncate'>
                        {friend.userName || friend.fullName}
                      </span>
                      {isAlreadyMember && <span className='text-[12px] text-muted-foreground mt-0.5'>Đã tham gia</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* SELECTED USERS & FOOTER ACTIONS */}
        <div className='border-t border-border/40 shrink-0 bg-background flex flex-col'>
          {selectedUsers.length > 0 && (
            <div className='flex items-center gap-2 overflow-x-auto px-4 py-3 border-b border-border/40 scrollbar-hide'>
              {selectedUsers.map((u) => (
                <div key={u._id || u.user_id} className='relative shrink-0' onClick={() => toggleUser(u)}>
                  <Avatar className='h-10 w-10 border border-border cursor-pointer'>
                    <AvatarImage src={u.avatar} />
                    <AvatarFallback className='text-xs bg-blue-100 text-blue-600'>
                      {getInitials(u.userName || u.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className='absolute -top-1 -right-1 w-4 h-4 bg-muted border border-border rounded-full flex items-center justify-center cursor-pointer hover:bg-destructive hover:text-white transition-colors'>
                    <X className='w-3 h-3' />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className='flex items-center justify-end gap-3 px-4 py-3'>
            <button
              onClick={onClose}
              className='px-4 py-2 rounded-md text-[14px] font-medium text-muted-foreground hover:bg-muted transition-colors'
            >
              Hủy
            </button>
            <button
              onClick={handleAddMembers}
              disabled={selectedUsers.length === 0 || isSubmitting}
              className={`flex items-center justify-center gap-2 px-6 py-2 rounded-md text-[14px] font-medium text-white transition-all ${selectedUsers.length > 0 && !isSubmitting ? 'bg-primary hover:bg-primary/90 shadow-sm' : 'bg-primary/50 cursor-not-allowed'}`}
            >
              {isSubmitting && <Loader2 className='w-4 h-4 animate-spin' />}
              Xác nhận
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
