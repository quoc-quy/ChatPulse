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
  ChevronRight
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useState } from 'react'
import type { ChatItem } from '@/context/app.context'

// Component tùy chỉnh cho Dropdown dạng Zalo
function MediaCollapsible({ title, icon: Icon, emptyText, defaultOpen = true }: any) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className='w-full'>
      <CollapsibleTrigger className='flex items-center justify-between px-4 py-3 hover:bg-muted transition-colors w-full group outline-none'>
        <div className='flex items-center gap-3'>
          <Icon className='w-5 h-5 text-foreground' />
          <span className='text-[15px] font-semibold text-foreground'>{title}</span>
        </div>
        <ChevronRight
          className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
        />
      </CollapsibleTrigger>

      <CollapsibleContent className='px-4 pb-4 animate-in slide-in-from-top-2 fade-in'>
        <div className='flex flex-col items-center justify-center py-6 text-center gap-3 bg-muted/40 rounded-lg border border-dashed border-border/60'>
          <div className='p-3 bg-background rounded-full shadow-sm'>
            <Icon className='w-6 h-6 text-muted-foreground/50' />
          </div>
          <p className='text-[13px] text-muted-foreground px-4 leading-relaxed'>{emptyText}</p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

interface ChatInfoPanelProps {
  chat: ChatItem
  onClose: () => void
}

export function ChatInfoPanel({ chat, onClose }: ChatInfoPanelProps) {
  const isGroup = chat.type === 'group'

  const getInitials = (name: string) => {
    if (!name) return 'U'
    return name.charAt(0).toUpperCase()
  }

  return (
    <div className='w-[340px] flex-shrink-0 border-l border-border/40 bg-background flex flex-col h-screen overflow-hidden animate-in slide-in-from-right-2 duration-300'>
      {/* Header Panel */}
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
        {/* Phần Avatar & Tên chung */}
        <div className='flex flex-col items-center p-6 pb-4'>
          <Avatar className='h-[88px] w-[88px] border border-border mb-3'>
            <AvatarImage src={chat.avatar} alt={chat.name} />
            <AvatarFallback className='text-3xl font-bold bg-blue-100 text-blue-600'>
              {getInitials(chat.name)}
            </AvatarFallback>
          </Avatar>
          <h3 className='text-lg font-semibold text-center leading-tight'>{chat.name}</h3>
          {!isGroup && (
            <span className={`text-sm mt-1 ${chat.isOnline ? 'text-green-500 font-medium' : 'text-muted-foreground'}`}>
              {chat.isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}
            </span>
          )}
        </div>

        {/* Cụm nút hành động nhanh */}
        <div className='flex justify-center gap-6 px-4 mb-6'>
          <div className='flex flex-col items-center gap-1.5 cursor-pointer group'>
            <div className='p-3 rounded-full bg-muted group-hover:bg-muted-foreground/20 transition-colors'>
              <Search className='w-5 h-5 text-foreground' />
            </div>
            <span className='text-[12px] text-foreground font-medium'>Tìm tin nhắn</span>
          </div>
          {isGroup && (
            <div className='flex flex-col items-center gap-1.5 cursor-pointer group'>
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

        {/* Các mục quản lý chi tiết dạng Dropdown */}
        <div className='flex flex-col py-1'>
          {isGroup && (
            <MediaCollapsible
              title='Thành viên nhóm'
              icon={Users}
              emptyText='Chưa có thành viên nào khác trong nhóm này'
              defaultOpen={false}
            />
          )}
          <MediaCollapsible
            title='Ảnh/Video'
            icon={ImageIcon}
            emptyText='Chưa có ảnh/video được chia sẻ trong cuộc hội thoại này'
          />
          <MediaCollapsible
            title='File'
            icon={FileText}
            emptyText='Chưa có file được chia sẻ trong cuộc hội thoại này'
          />
          <MediaCollapsible title='Link' icon={Link2} emptyText='Chưa có link được chia sẻ trong cuộc hội thoại này' />
        </div>

        <Separator className='bg-border/60 h-1.5' />

        {/* Phần Danger Zone */}
        <div className='flex flex-col py-2 mt-1'>
          {isGroup ? (
            <button className='flex items-center gap-3 px-4 py-3 hover:bg-red-50 text-red-500 transition-colors text-left w-full'>
              <LogOut className='w-5 h-5' />
              <span className='text-[15px] font-medium'>Rời nhóm</span>
            </button>
          ) : (
            <button className='flex items-center gap-3 px-4 py-3 hover:bg-red-50 text-red-500 transition-colors text-left w-full'>
              <Trash2 className='w-5 h-5' />
              <span className='text-[15px] font-medium'>Xóa lịch sử trò chuyện</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
