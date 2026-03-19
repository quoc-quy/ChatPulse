import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Phone, Video, Search, Sparkles, PanelLeft, PanelRight, User, Bot } from 'lucide-react'
import { AppContext, type ChatItem } from '@/context/app.context'
import { ChatAvatar } from '../chat-avatar'
import { useContext } from 'react'

interface ChatHeaderProps {
  chat: ChatItem
  onStartCall?: (type: 'video' | 'audio') => void
  onSummarize?: () => void
  onToggleInfoPanel: () => void
  isInfoPanelOpen: boolean
}

export function ChatHeader({ chat, onStartCall, onSummarize, onToggleInfoPanel, isInfoPanelOpen }: ChatHeaderProps) {
  const { toggleSidebar } = useSidebar()
  const { profile } = useContext(AppContext)

  const isAI = chat.type === 'ai'

  const formatLastActive = (dateString?: string) => {
    if (!dateString) return 'Truy cập gần đây'

    const lastActive = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - lastActive.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Vừa mới truy cập'
    if (diffMins < 60) return `Truy cập ${diffMins} phút trước`
    if (diffHours < 24) return `Truy cập ${diffHours} giờ trước`
    if (diffDays === 1) return 'Truy cập hôm qua'
    return `Truy cập ${diffDays} ngày trước`
  }

  return (
    <header className='flex h-16 shrink-0 items-center justify-between border-b border-border/40 bg-background px-4 shadow-sm relative z-10'>
      <div className='flex items-center gap-3'>
        <button
          onClick={toggleSidebar}
          className='p-2 -ml-2 rounded-md hover:bg-muted text-muted-foreground transition-colors outline-none'
          title='Đóng/Mở danh sách hội thoại'
        >
          <PanelLeft className='w-5 h-5' />
        </button>

        <SidebarTrigger className='md:hidden -ml-2 text-foreground' />
        <Separator orientation='vertical' className='md:hidden mr-2 h-4' />

        {isAI ? (
          <div className='flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 shadow-sm border border-border shrink-0'>
            <Bot className='h-5 w-5 text-white' />
          </div>
        ) : (
          <div className='relative scale-90 -mr-1'>
            <ChatAvatar chat={chat} currentUserId={profile?._id || ''} />
          </div>
        )}

        <div className='flex flex-col'>
          <span className='font-semibold text-foreground leading-tight'>{chat.name}</span>
          {chat.type === 'group' ? (
            <div className='flex items-center gap-1.5 text-[13px] text-muted-foreground mt-0.5'>
              <User className='w-3.5 h-3.5' />
              <span>{chat.participants?.length || 0} thành viên</span>
            </div>
          ) : (
            <span
              className={`text-xs mt-0.5 ${chat.isOnline ? 'text-green-500 font-medium' : 'text-muted-foreground'}`}
            >
              {chat.isOnline ? 'Đang hoạt động' : formatLastActive(chat.lastActiveAt)}
            </span>
          )}
        </div>
      </div>

      {!isAI && (
        <div className='flex items-center gap-2 text-muted-foreground'>
          {chat.type === 'group' && (
            <button
              onClick={onSummarize}
              title='Tóm tắt nhóm bằng AI'
              className='p-2 hover:bg-muted hover:text-foreground hover:text-purple-500 rounded-full transition-colors'
            >
              <Sparkles className='h-5 w-5' />
            </button>
          )}
          <button
            onClick={() => onStartCall && onStartCall('audio')}
            className='p-2 hover:bg-muted hover:text-foreground hover:text-green-500 rounded-full transition-colors'
          >
            <Phone className='h-5 w-5' />
          </button>
          <button
            onClick={() => onStartCall && onStartCall('video')}
            className='p-2 hover:bg-muted hover:text-foreground hover:text-blue-500 rounded-full transition-colors'
          >
            <Video className='h-5 w-5' />
          </button>
          <Separator orientation='vertical' className='h-5 mx-1 hidden sm:block' />
          <button className='p-2 hover:bg-muted hover:text-foreground rounded-full transition-colors hidden sm:block'>
            <Search className='h-5 w-5' />
          </button>

          <button
            onClick={onToggleInfoPanel}
            className={`p-2 rounded-full transition-colors ${isInfoPanelOpen ? 'bg-muted text-foreground' : 'hover:bg-muted hover:text-foreground'}`}
            title='Thông tin hội thoại'
          >
            <PanelRight className='h-5 w-5' />
          </button>
        </div>
      )}
    </header>
  )
}
