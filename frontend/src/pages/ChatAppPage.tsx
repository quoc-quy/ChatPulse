import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'

export default function ChatAppPage() {
  return (
    <div className='flex h-screen flex-col bg-background'>
      {/* Header của khu vực chat */}
      <header className='flex h-14 shrink-0 items-center gap-2 border-b border-border/40 px-4'>
        {/* Nút Hamburger để mở/đóng Sidebar trên Mobile hoặc khi đóng panel phụ */}
        <SidebarTrigger className='-ml-1' />
        <Separator orientation='vertical' className='mr-2 h-4' />
        <div className='font-medium'>Nhóm Chat Web</div>
      </header>

      {/* Nội dung tin nhắn */}
      <div className='flex flex-1 items-center justify-center bg-muted/10'>
        <p className='text-muted-foreground'>Khung chat sẽ nằm ở đây...</p>
      </div>
    </div>
  )
}
