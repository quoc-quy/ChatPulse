/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  X,
  Bell,
  Search,
  Users,
  Image as ImageIcon,
  FileText,
  Link2,
  Trash2,
  LogOut,
  UserPlus,
  ChevronRight,
  Loader2,
  Check,
  Pencil,
  Ban
} from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { AppContext, type ChatItem } from '@/context/app.context'
import { MediaCollapsible } from './MediaCollapsible'
import { useContext, useState, useEffect } from 'react'
import { groupApi } from '@/apis/group.api'
import { messagesApi } from '@/apis/messages.api'
import { toast } from 'sonner'
import { ChatAvatar } from '@/components/chat-avatar'
import { useSocket } from '@/context/socket.context'

interface InfoPanelMainProps {
  chat: ChatItem
  onClose: () => void
  onViewMembers: () => void
  onOpenAddMember: () => void
  onLeaveGroup: () => void
  onDisbandGroup?: () => void
}

export function InfoPanelMain({
  chat,
  onClose,
  onViewMembers,
  onOpenAddMember,
  onLeaveGroup,
  onDisbandGroup
}: InfoPanelMainProps) {
  const isGroup = chat.type === 'group'
  const [isEditingName, setIsEditingName] = useState(false)
  const [tempName, setTempName] = useState(chat.name || '')
  const [isSavingName, setIsSavingName] = useState(false)
  const { profile } = useContext(AppContext)
  const { socket } = useSocket()
  const isAdmin = profile?._id === chat.admin_id

  // State duy nhất lưu toàn bộ messages cho Panel (Phục vụ Media/File/Link)
  const [panelMessages, setPanelMessages] = useState<any[]>([])

  // FETCH TIN NHẮN BAN ĐẦU
  useEffect(() => {
    if (!chat.id) return
    const fetchSharedData = async () => {
      try {
        const res = await messagesApi.getMessages({
          convId: chat.id,
          limit: 100
        })
        const messages = res.data.result || res.data || []
        setPanelMessages(messages)
      } catch (error) {
        console.error('Lỗi khi tải dữ liệu info panel:', error)
      }
    }
    fetchSharedData()
  }, [chat.id])

  // LẮNG NGHE REALTIME SOCKET
  useEffect(() => {
    if (!socket || !profile || !chat.id) return

    const handleReceiveMessage = (newMessage: any) => {
      if (String(newMessage.conversationId) === String(chat.id)) {
        setPanelMessages((prev) => [newMessage, ...prev])
      }
    }

    const handleMessageRevoked = ({ messageId, conversationId }: any) => {
      if (String(conversationId) === String(chat.id)) {
        setPanelMessages((prev) =>
          prev.map((msg) => (String(msg._id) === String(messageId) ? { ...msg, type: 'revoked', content: '' } : msg))
        )
      }
    }

    const handleLocalDelete = (e: any) => {
      const { conversationId, deletedMessageId } = e.detail
      if (String(conversationId) === String(chat.id)) {
        setPanelMessages((prev) => prev.filter((msg) => String(msg._id) !== String(deletedMessageId)))
      }
    }

    socket.on('receive_message', handleReceiveMessage)
    socket.on('message_revoked', handleMessageRevoked)
    window.addEventListener('local_message_deleted', handleLocalDelete)

    return () => {
      socket.off('receive_message', handleReceiveMessage)
      socket.off('message_revoked', handleMessageRevoked)
      window.removeEventListener('local_message_deleted', handleLocalDelete)
    }
  }, [socket, profile, chat.id])

  const handleSaveName = async () => {
    if (!tempName.trim() || tempName.trim() === chat.name) {
      setIsEditingName(false)
      setTempName(chat.name)
      return
    }
    setIsSavingName(true)
    try {
      await groupApi.renameGroup(chat.id, tempName.trim())
      toast.success('Đổi tên nhóm thành công')
      setIsEditingName(false)
    } catch (error) {
      console.error(error)
      toast.error('Lỗi khi đổi tên nhóm')
    } finally {
      setIsSavingName(false)
    }
  }

  const handleDisbandGroup = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn giải tán nhóm này? Toàn bộ tin nhắn sẽ bị xóa đối với mọi người.'))
      return

    try {
      await groupApi.disbandGroup(chat.id)
      toast.success('Giải tán nhóm thành công')
      onClose()
      // Có thể dispatch một event để refresh Sidebar
      window.dispatchEvent(new Event('refresh_chat_list'))
    } catch (error) {
      console.error(error)
      toast.error('Lỗi khi giải tán nhóm')
    }
  }

  return (
    <div className='w-[340px] flex-shrink-0 border-l border-border/40 bg-background flex flex-col h-screen overflow-hidden animate-in slide-in-from-right-2 duration-300'>
      <div className='flex h-16 items-center justify-center px-4 border-b border-border/40 relative shrink-0'>
        <h2 className='text-[17px] font-semibold'>Thông tin hội thoại</h2>
        <button
          onClick={onClose}
          className='absolute right-4 p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors'
        >
          <X className='w-5 h-5' />
        </button>
      </div>

      <div className='flex-1 overflow-y-auto scroll-smooth'>
        <div className='flex flex-col items-center p-6 pb-4'>
          <div className='transform scale-[1.75] mb-8 mt-2'>
            <ChatAvatar chat={chat} currentUserId={profile?._id || ''} />
          </div>
          {isGroup && isEditingName ? (
            <div className='flex items-center justify-center gap-2 mt-1 w-full animate-in fade-in'>
              <input
                autoFocus
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                className='text-[17px] font-semibold text-center border-b-2 border-primary focus:outline-none bg-transparent w-full max-w-[200px] px-1 py-0.5'
              />
              <button
                onClick={handleSaveName}
                disabled={isSavingName}
                className='p-1.5 rounded-full bg-green-50 text-green-600 hover:bg-green-100 transition-colors'
              >
                {isSavingName ? <Loader2 className='w-4 h-4 animate-spin' /> : <Check className='w-4 h-4' />}
              </button>
              <button
                onClick={() => {
                  setIsEditingName(false)
                  setTempName(chat.name)
                }}
                disabled={isSavingName}
                className='p-1.5 rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition-colors'
              >
                <X className='w-4 h-4' />
              </button>
            </div>
          ) : (
            <div className='flex items-center gap-2 justify-center group/name mt-1 relative w-full px-6'>
              <h3 className='text-lg font-semibold text-center leading-tight truncate'>{chat.name}</h3>
              {isGroup && (
                <button
                  onClick={() => {
                    setIsEditingName(true)
                    setTempName(chat.name)
                  }}
                  className='absolute right-0 opacity-0 group-hover/name:opacity-100 p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-all'
                  title='Đổi tên nhóm'
                >
                  <Pencil className='w-4 h-4' />
                </button>
              )}
            </div>
          )}
          {!isGroup && (
            <span className={`text-sm mt-1 ${chat.isOnline ? 'text-green-500 font-medium' : 'text-muted-foreground'}`}>
              {chat.isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}
            </span>
          )}
        </div>

        <div className='flex justify-center gap-6 px-4 mb-6'>
          <div className='flex flex-col items-center gap-1.5 cursor-pointer group'>
            <div className='p-3 rounded-full bg-muted group-hover:bg-muted-foreground/20 transition-colors'>
              <Search className='w-5 h-5 text-foreground' />
            </div>
            <span className='text-[12px] text-foreground font-medium'>Tìm tin nhắn</span>
          </div>
          {isGroup && (
            <div onClick={onOpenAddMember} className='flex flex-col items-center gap-1.5 cursor-pointer group'>
              <div className='p-3 rounded-full bg-muted group-hover:bg-muted-foreground/20 transition-colors'>
                <UserPlus className='w-5 h-5 text-foreground' />
              </div>
              <span className='text-[12px] text-foreground font-medium'>Thêm thành viên</span>
            </div>
          )}
          <div className='flex flex-col items-center gap-1.5 cursor-pointer group'>
            <div className='p-3 rounded-full bg-muted group-hover:bg-muted-foreground/20 transition-colors'>
              <Bell className='w-5 h-5 text-foreground' />
            </div>
            <span className='text-[12px] text-foreground font-medium'>Tắt thông báo</span>
          </div>
        </div>

        <Separator className='bg-border/60 h-1.5' />

        <div className='flex flex-col'>
          {isGroup && (
            <div
              onClick={onViewMembers}
              className='flex items-center justify-between px-4 py-3.5 hover:bg-muted transition-colors w-full cursor-pointer group border-b border-border/40'
            >
              <div className='flex items-center gap-3'>
                <Users className='w-5 h-5 text-foreground' />
                <span className='text-[15px] font-semibold text-foreground'>
                  Thành viên nhóm ({chat.participants?.length || 0})
                </span>
              </div>
              <ChevronRight className='w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform' />
            </div>
          )}

          <div className='flex flex-col mt-2'>
            {/* TRUYỀN PANEL MESSAGES VÀO MEDIA COLLAPSIBLE */}
            <MediaCollapsible
              title='Ảnh/Video'
              icon={ImageIcon}
              emptyText='Chưa có ảnh/video được chia sẻ'
              defaultOpen={!isGroup}
              type='media'
              messages={panelMessages}
            />
            <MediaCollapsible
              title='File'
              icon={FileText}
              emptyText='Chưa có file được chia sẻ'
              defaultOpen={false}
              type='file'
              messages={panelMessages}
            />
            <MediaCollapsible
              title='Link'
              icon={Link2}
              emptyText='Chưa có link được chia sẻ'
              defaultOpen={false}
              type='link'
              messages={panelMessages}
            />
          </div>
        </div>

        <Separator className='bg-border/60 h-1.5' />

        <div className='flex flex-col py-2 mt-1'>
          {isGroup ? (
            <>
              <button
                onClick={onLeaveGroup}
                className='flex items-center gap-3 px-4 py-3 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 transition-colors text-left w-full'
              >
                <LogOut className='w-5 h-5' />
                <span className='text-[15px] font-medium'>Rời nhóm</span>
              </button>

              {isAdmin && (
                <button
                  onClick={handleDisbandGroup}
                  className='flex items-center gap-3 px-4 py-3 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 font-bold transition-colors text-left w-full border-t border-border/40'
                >
                  <Ban className='w-5 h-5' />
                  <span className='text-[15px] font-medium'>Giải tán nhóm</span>
                </button>
              )}
            </>
          ) : (
            <button className='flex items-center gap-3 px-4 py-3 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 transition-colors text-left w-full'>
              <Trash2 className='w-5 h-5' />
              <span className='text-[15px] font-medium'>Xóa lịch sử trò chuyện</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
