import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { ChatWelcomeScreen } from '@/components/chat/ChatWelcomScreen'

export default function ChatAppPage() {
  return (
    <div className='flex h-screen flex-col bg-background'>
      <header className='flex h-14 shrink-0 items-center gap-2 border-b border-border/40 px-4'>
        {/* Nút Hamburger để mở/đóng Sidebar */}
        <SidebarTrigger className='-ml-1 text-foreground' />
        <Separator orientation='vertical' className='mr-2 h-4' />

        {/* Tên ứng dụng hoặc Tiêu đề Header */}
        <div className='flex-1 font-medium text-foreground'>ChatPulse</div>
      </header>

      {/* Hiển thị component màn hình chào mừng */}
      <ChatWelcomeScreen />
    </div>
  )
}
