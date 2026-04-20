/* eslint-disable @typescript-eslint/no-explicit-any */
import { X, Search, Check, Loader2, Users, MessageCircle, Forward } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import type { ChatItem } from '@/context/app.context'
import http from '@/utils/http'
import { groupApi } from '@/apis/group.api'
import { conversationsApi } from '@/apis/conversations.api'
import { messagesApi } from '@/apis/messages.api'
import { toast } from 'sonner'

// Định nghĩa interface cho mục tiêu (người dùng hoặc nhóm)
interface ForwardTarget {
  _id: string
  name: string
  avatar?: string
  targetType: 'user' | 'group'
}

interface AddMemberModalProps {
  isOpen: boolean
  onClose: () => void
  chat?: ChatItem // Thông tin chat hiện tại (dùng cho mode 'add')
  onMemberUpdate?: () => void
  mode?: 'add' | 'create' | 'forward' // Thêm mode 'forward'
  messageIdToForward?: string // ID tin nhắn cần chuyển tiếp
}

const getInitials = (name?: string) => {
  if (!name) return 'U'
  return name.charAt(0).toUpperCase()
}

export function AddMemberModal({
  isOpen,
  onClose,
  chat,
  onMemberUpdate,
  mode = 'add',
  messageIdToForward
}: AddMemberModalProps) {
  const [friends, setFriends] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([]) // Danh sách nhóm tham gia
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTargets, setSelectedTargets] = useState<ForwardTarget[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [groupName, setGroupName] = useState('')

  // Tải dữ liệu tùy theo chế độ
  useEffect(() => {
    if (isOpen) {
      fetchInitialData()
      setSearchQuery('')
      setSelectedTargets([])
      setGroupName('')
    }
  }, [isOpen, mode])

  const fetchInitialData = async () => {
    setIsLoading(true)
    try {
      // Luôn lấy danh sách bạn bè
      const friendsPromise = http.get('/friends/list')

      // Nếu là mode forward, lấy thêm danh sách các cuộc hội thoại (để lọc ra group)
      const requests = [friendsPromise]
      if (mode === 'forward') {
        requests.push(conversationsApi.getConversations())
      }

      const [friendsRes, convsRes] = await Promise.all(requests)

      const friendsData = friendsRes.data?.result || friendsRes.data || []
      setFriends(Array.isArray(friendsData) ? friendsData : [])

      if (mode === 'forward' && convsRes) {
        const convsData = convsRes.data?.result || []
        // Chỉ lấy các cuộc hội thoại là group
        const groupList = convsData.filter((c: any) => c.type === 'group')
        setGroups(groupList)
      }
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu:', error)
      toast.error('Không thể tải danh sách dữ liệu')
    } finally {
      setIsLoading(false)
    }
  }

  // Logic lọc danh sách hiển thị
  const displayList = useMemo(() => {
    const query = searchQuery.toLowerCase()

    // 1. Xử lý danh sách bạn bè
    const filteredFriends = friends
      .filter((f) => {
        const name = (f.userName || f.fullName || '').toLowerCase()
        const matchesSearch = name.includes(query)

        // Nếu là mode 'add', ẩn những người đã là thành viên trong nhóm
        if (mode === 'add' && chat?.participants) {
          const isMember = chat.participants.some((p: any) => String(p.userId || p._id) === String(f._id))
          return matchesSearch && !isMember
        }
        return matchesSearch
      })
      .map((f) => ({
        _id: f._id,
        name: f.userName || f.fullName,
        avatar: f.avatar,
        targetType: 'user' as const
      }))

    // 2. Xử lý danh sách nhóm (chỉ dành cho mode forward)
    let filteredGroups: ForwardTarget[] = []
    if (mode === 'forward') {
      filteredGroups = groups
        .filter((g) => (g.name || '').toLowerCase().includes(query))
        .map((g) => ({
          _id: g._id,
          name: g.name,
          avatar: g.avatar,
          targetType: 'group' as const
        }))
    }

    return [...filteredGroups, ...filteredFriends]
  }, [friends, groups, searchQuery, chat, mode])

  const handleToggleTarget = (target: ForwardTarget) => {
    setSelectedTargets((prev) => {
      const isSelected = prev.some((t) => t._id === target._id)
      if (isSelected) {
        return prev.filter((t) => t._id !== target._id)
      }
      return [...prev, target]
    })
  }

  const handleConfirmAction = async () => {
    if (selectedTargets.length === 0) return

    setIsSubmitting(true)
    try {
      if (mode === 'create') {
        if (!groupName.trim()) return toast.error('Vui lòng nhập tên nhóm')
        const memberIds = selectedTargets.map((t) => t._id)
        if (memberIds.length < 2) return toast.error('Nhóm cần ít nhất 3 thành viên')

        await conversationsApi.createConversation({
          type: 'group',
          name: groupName.trim(),
          members: memberIds
        })
        toast.success('Tạo nhóm thành công')
        window.dispatchEvent(new Event('refresh_chat_list'))
        onClose()
      } else if (mode === 'forward') {
        if (!messageIdToForward) return

        const targetUserIds = selectedTargets.filter((t) => t.targetType === 'user').map((t) => t._id)
        const targetGroupIds = selectedTargets.filter((t) => t.targetType === 'group').map((t) => t._id)

        // API này cần được thêm vào messages.api.ts như hướng dẫn trước đó
        await messagesApi.forwardMessage(messageIdToForward, targetUserIds, targetGroupIds)

        toast.success('Đã chuyển tiếp tin nhắn')
        onClose()
      } else {
        // Mode 'add' (Thêm thành viên)
        if (!chat) return
        const memberIds = selectedTargets.map((t) => t._id)
        await groupApi.addMembers(chat.id, memberIds)
        toast.success('Đã thêm thành viên')
        if (onMemberUpdate) onMemberUpdate()
        onClose()
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const getTitle = () => {
    if (mode === 'create') return 'Tạo nhóm trò chuyện'
    if (mode === 'forward') return 'Chuyển tiếp tin nhắn'
    return 'Thêm thành viên'
  }

  return createPortal(
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm'>
      <div className='w-full max-w-md bg-background rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200'>
        {/* Header */}
        <div className='flex justify-between items-center px-5 py-4 border-b border-border bg-muted/30'>
          <h3 className='text-lg font-bold text-foreground flex items-center gap-2'>
            {mode === 'forward' && <Forward className='w-5 h-5 text-blue-500' />}
            {getTitle()}
          </h3>
          <button
            onClick={onClose}
            className='p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        <div className='p-5 flex flex-col gap-4'>
          {/* Tên nhóm (Chỉ mode Create) */}
          {mode === 'create' && (
            <input
              type='text'
              placeholder='Nhập tên nhóm...'
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className='w-full border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-background'
            />
          )}

          {/* Ô tìm kiếm */}
          <div className='relative'>
            <Search className='absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
            <input
              type='text'
              placeholder={mode === 'forward' ? 'Tìm bạn bè hoặc nhóm...' : 'Tìm kiếm bạn bè...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='w-full bg-muted/50 border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all'
            />
          </div>

          {/* Danh sách kết quả */}
          <div className='flex-1 min-h-[300px] max-h-[350px] overflow-y-auto pr-1 custom-scrollbar'>
            {isLoading ? (
              <div className='flex flex-col items-center justify-center h-full gap-2 text-muted-foreground'>
                <Loader2 className='w-8 h-8 animate-spin text-primary' />
                <span className='text-xs'>Đang tải...</span>
              </div>
            ) : displayList.length === 0 ? (
              <div className='flex flex-col items-center justify-center h-full text-muted-foreground gap-3 opacity-60'>
                <Users className='w-12 h-12' />
                <span className='text-sm font-medium'>Không tìm thấy kết quả</span>
              </div>
            ) : (
              <div className='flex flex-col gap-1'>
                {displayList.map((item) => {
                  const isSelected = selectedTargets.some((t) => t._id === item._id)
                  return (
                    <div
                      key={item._id}
                      onClick={() => handleToggleTarget(item)}
                      className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all group ${
                        isSelected ? 'bg-primary/5' : 'hover:bg-muted'
                      }`}
                    >
                      <div className='relative'>
                        <Avatar className='w-11 h-11 border border-border'>
                          <AvatarImage src={item.avatar} alt={item.name} />
                          <AvatarFallback
                            className={`${item.targetType === 'group' ? 'bg-orange-100 text-orange-600' : 'bg-primary/10 text-primary'} text-sm font-bold`}
                          >
                            {getInitials(item.name)}
                          </AvatarFallback>
                        </Avatar>
                        {item.targetType === 'group' && (
                          <div className='absolute -bottom-1 -right-1 bg-background rounded-full p-0.5 border border-border'>
                            <MessageCircle className='w-3 h-3 text-orange-500' />
                          </div>
                        )}
                      </div>

                      <div className='flex-1 min-w-0'>
                        <p className='text-sm font-semibold text-foreground truncate'>{item.name}</p>
                        <p className='text-[11px] text-muted-foreground'>
                          {item.targetType === 'group' ? 'Nhóm' : 'Bạn bè'}
                        </p>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-primary border-primary'
                            : 'border-muted-foreground/30 group-hover:border-primary/50'
                        }`}
                      >
                        {isSelected && <Check className='w-3 h-3 text-white stroke-[3px]' />}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Danh sách đã chọn (Avatar nhỏ) */}
          {selectedTargets.length > 0 && (
            <div className='flex items-center gap-2.5 overflow-x-auto py-2 border-t border-border mt-1'>
              {selectedTargets.map((t) => (
                <div key={t._id} className='relative flex-shrink-0 animate-in slide-in-from-left-2'>
                  <Avatar className='w-9 h-9 border-2 border-background ring-1 ring-border'>
                    <AvatarImage src={t.avatar} />
                    <AvatarFallback className='text-[10px] font-bold'>{getInitials(t.name)}</AvatarFallback>
                  </Avatar>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleToggleTarget(t)
                    }}
                    className='absolute -top-1 -right-1 bg-muted border border-border rounded-full p-0.5 hover:bg-destructive hover:text-white transition-colors shadow-sm'
                  >
                    <X className='w-2.5 h-2.5' />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Footer Buttons */}
          <div className='flex items-center justify-end gap-3 pt-4 border-t border-border'>
            <button
              onClick={onClose}
              className='px-5 py-2 rounded-lg text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors'
            >
              Hủy
            </button>
            <button
              onClick={handleConfirmAction}
              disabled={selectedTargets.length === 0 || isSubmitting}
              className={`flex items-center justify-center gap-2 px-8 py-2 rounded-lg text-sm font-bold text-white transition-all shadow-lg ${
                selectedTargets.length > 0 && !isSubmitting
                  ? 'bg-blue-600 hover:bg-blue-700 active:scale-95'
                  : 'bg-blue-400 cursor-not-allowed opacity-70'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className='w-4 h-4 animate-spin' />
                  Đang xử lý...
                </>
              ) : mode === 'forward' ? (
                'Gửi ngay'
              ) : mode === 'create' ? (
                'Tạo nhóm'
              ) : (
                'Xác nhận'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
