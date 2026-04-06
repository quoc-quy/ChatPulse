import { X, Search, Check, Loader2, Users } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import type { ChatItem } from '@/context/app.context'
import http from '@/utils/http'
import { groupApi } from '@/apis/group.api'
import { conversationsApi } from '@/apis/conversations.api'
import { toast } from 'sonner'

interface AddMemberModalProps {
  isOpen: boolean
  onClose: () => void
  chat?: ChatItem // Đổi thành optional để hỗ trợ lúc tạo nhóm (chưa có chat)
  onMemberUpdate?: () => void
  mode?: 'add' | 'create' // THÊM prop mode
}

// Hàm lấy chữ cái đầu (helper)
const getInitials = (name?: string) => {
  if (!name) return 'U'
  return name.charAt(0).toUpperCase()
}

export function AddMemberModal({ isOpen, onClose, chat, onMemberUpdate, mode = 'add' }: AddMemberModalProps) {
  const [friends, setFriends] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<any[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [groupName, setGroupName] = useState('') // Thêm state quản lý tên nhóm

  // Gọi API lấy danh sách bạn bè khi Modal được mở
  useEffect(() => {
    if (isOpen) {
      fetchFriends()
      setSearchQuery('')
      setSelectedUsers([])
      setGroupName('')
    }
  }, [isOpen])

  const fetchFriends = async () => {
    setIsLoading(true)
    try {
      const res = await http.get('/friends/list')
      const data = res.data?.result || res.data || []
      setFriends(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Lỗi khi tải danh sách bạn bè:', error)
      toast.error('Không thể tải danh sách bạn bè')
    } finally {
      setIsLoading(false)
    }
  }

  // Lọc danh sách bạn bè hiển thị
  const displayFriends = useMemo(() => {
    return friends.filter((friend) => {
      const matchesSearch =
        friend.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        friend.fullName?.toLowerCase().includes(searchQuery.toLowerCase())

      // Nếu đang ở chế độ thêm thành viên, ẩn những người đã có trong nhóm
      if (mode === 'add' && chat?.participants) {
        const isMember = chat.participants.some((p: any) => String(p.userId || p._id) === String(friend._id))
        return matchesSearch && !isMember
      }

      return matchesSearch
    })
  }, [friends, searchQuery, chat, mode])

  const handleToggleUser = (user: any) => {
    setSelectedUsers((prev) => {
      const isSelected = prev.some((u) => u._id === user._id)
      if (isSelected) {
        return prev.filter((u) => u._id !== user._id)
      }
      return [...prev, user]
    })
  }

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u._id !== userId))
  }

  // HÀM XỬ LÝ CHUNG CHO CẢ TẠO NHÓM VÀ THÊM THÀNH VIÊN
  const handleConfirmAction = async () => {
    const memberIds = selectedUsers.map((u) => u._id)

    if (mode === 'create') {
      if (!groupName.trim()) {
        return toast.error('Vui lòng nhập tên nhóm')
      }
      if (memberIds.length < 2) {
        return toast.error('Nhóm cần ít nhất 3 thành viên (bao gồm bạn, hãy chọn thêm 2 người)')
      }

      setIsSubmitting(true)
      try {
        await conversationsApi.createConversation({
          type: 'group',
          name: groupName.trim(),
          members: memberIds
        })
        toast.success('Tạo nhóm thành công')
        onClose()
        window.dispatchEvent(new Event('refresh_chat_list')) // Trigger tải lại danh sách
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi tạo nhóm')
      } finally {
        setIsSubmitting(false)
      }
    } else {
      if (memberIds.length === 0) return
      if (!chat) return

      setIsSubmitting(true)
      try {
        await groupApi.addMembers(chat.id, memberIds)
        toast.success('Đã thêm thành viên')
        if (onMemberUpdate) onMemberUpdate()
        onClose()
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Lỗi khi thêm thành viên')
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  if (!isOpen) return null

  return createPortal(
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
      <div className='w-full max-w-md bg-background rounded-lg shadow-lg overflow-hidden flex flex-col'>
        <div className='flex justify-between items-center px-4 py-3 border-b border-border'>
          <h3 className='text-base font-semibold text-foreground'>
            {mode === 'create' ? 'Tạo nhóm trò chuyện' : 'Thêm thành viên'}
          </h3>
          <button onClick={onClose} className='p-1 rounded-full hover:bg-muted text-muted-foreground transition-colors'>
            <X className='w-5 h-5' />
          </button>
        </div>

        <div className='p-4 flex flex-col gap-4'>
          {/* INPUT NHẬP TÊN NHÓM DÀNH CHO MODE CREATE */}
          {mode === 'create' && (
            <div className='relative'>
              <input
                type='text'
                placeholder='Nhập tên nhóm...'
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className='w-full border border-border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50'
              />
            </div>
          )}

          <div className='relative'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
            <input
              type='text'
              placeholder='Tìm kiếm bạn bè...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='w-full bg-muted/50 border border-border rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow'
            />
          </div>

          <div className='flex-1 min-h-[250px] max-h-[300px] overflow-y-auto pr-2'>
            {isLoading ? (
              <div className='flex items-center justify-center h-full'>
                <Loader2 className='w-6 h-6 animate-spin text-primary/60' />
              </div>
            ) : displayFriends.length === 0 ? (
              <div className='flex flex-col items-center justify-center h-full text-muted-foreground gap-2'>
                <Users className='w-10 h-10 opacity-20' />
                <span className='text-sm'>Không tìm thấy người dùng</span>
              </div>
            ) : (
              <div className='flex flex-col gap-1'>
                {displayFriends.map((friend) => {
                  const isSelected = selectedUsers.some((u) => u._id === friend._id)
                  return (
                    <div
                      key={friend._id}
                      onClick={() => handleToggleUser(friend)}
                      className='flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer transition-colors group'
                    >
                      <Avatar className='w-10 h-10 border border-border'>
                        <AvatarImage src={friend.avatar} alt={friend.userName} />
                        <AvatarFallback className='bg-primary/10 text-primary text-sm font-medium'>
                          {getInitials(friend.userName || friend.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className='flex-1 min-w-0'>
                        <p className='text-sm font-medium text-foreground truncate'>
                          {friend.userName || friend.fullName}
                        </p>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-primary border-primary'
                            : 'border-muted-foreground/30 group-hover:border-primary/50'
                        }`}
                      >
                        {isSelected && <Check className='w-3 h-3 text-primary-foreground' />}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {selectedUsers.length > 0 && (
            <div className='flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent'>
              {selectedUsers.map((u) => (
                <div key={u._id} className='relative flex-shrink-0 group'>
                  <Avatar className='w-10 h-10 border border-border'>
                    <AvatarImage src={u.avatar} />
                    <AvatarFallback className='text-xs bg-blue-100 text-blue-600'>
                      {getInitials(u.userName || u.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    onClick={() => handleRemoveUser(u._id)}
                    className='absolute -top-1 -right-1 w-4 h-4 bg-muted border border-border rounded-full flex items-center justify-center cursor-pointer hover:bg-destructive hover:text-white transition-colors'
                  >
                    <X className='w-3 h-3' />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className='flex items-center justify-end gap-3 px-4 py-3 border-t border-border'>
            <button
              onClick={onClose}
              className='px-4 py-2 rounded-md text-[14px] font-medium text-muted-foreground hover:bg-muted transition-colors'
            >
              Hủy
            </button>
            <button
              onClick={handleConfirmAction}
              disabled={selectedUsers.length === 0 || isSubmitting}
              className={`flex items-center justify-center gap-2 px-6 py-2 rounded-md text-[14px] font-medium text-white transition-all ${
                selectedUsers.length > 0 && !isSubmitting
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-sm'
                  : 'bg-blue-600/50 cursor-not-allowed'
              }`}
            >
              {isSubmitting && <Loader2 className='w-4 h-4 animate-spin' />}
              {mode === 'create' ? 'Tạo nhóm' : 'Xác nhận'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
