import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Phone, Video, Search, MoreHorizontal } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { ChatItem } from '@/context/app.context'

interface ChatHeaderProps {
  chat: ChatItem
}

export function ChatHeader({ chat }: ChatHeaderProps) {
  return (
    <header className='flex h-16 shrink-0 items-center justify-between border-b border-border/40 bg-background px-4 shadow-sm'>
      <div className='flex items-center gap-3'>
        <SidebarTrigger className='md:hidden -ml-2 text-foreground' />
        <Separator orientation='vertical' className='md:hidden mr-2 h-4' />

        <Avatar className='h-10 w-10 border border-border'>
          <AvatarImage src={chat.avatar} alt={chat.name} />
          <AvatarFallback className='bg-blue-100 text-blue-600'>{chat.name.charAt(0)}</AvatarFallback>
        </Avatar>

        <div className='flex flex-col'>
          <span className='font-semibold text-foreground leading-tight'>{chat.name}</span>
          <span className='text-xs text-muted-foreground'>{chat.isOnline ? 'Đang hoạt động' : 'Đang ngoại tuyến'}</span>
        </div>
      </div>

      <div className='flex items-center gap-2 text-muted-foreground'>
        <button className='p-2 hover:bg-muted hover:text-foreground rounded-full transition-colors'>
          <Phone className='h-5 w-5' />
        </button>
        <button className='p-2 hover:bg-muted hover:text-foreground rounded-full transition-colors'>
          <Video className='h-5 w-5' />
        </button>
        <Separator orientation='vertical' className='h-5 mx-1 hidden sm:block' />
        <button className='p-2 hover:bg-muted hover:text-foreground rounded-full transition-colors hidden sm:block'>
          <Search className='h-5 w-5' />
        </button>
        <button className='p-2 hover:bg-muted hover:text-foreground rounded-full transition-colors'>
          <MoreHorizontal className='h-5 w-5' />
        </button>
      </div>
    </header>
  )
}
