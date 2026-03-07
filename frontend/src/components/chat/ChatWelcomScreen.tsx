import { useContext } from 'react'
import { AppContext } from '@/context/app.context'
import { SidebarTrigger } from '@/components/ui/sidebar'

export function ChatWelcomeScreen() {
  const { profile } = useContext(AppContext)
  const displayName = profile?.userName || 'bạn'

  return (
    <div className='relative flex flex-1 flex-col items-center justify-center bg-muted/10 p-4 text-center h-full'>
      {/* NÚT MENU DÀNH RIÊNG CHO MOBILE */}
      <div className='absolute top-4 left-4 md:hidden'>
        <SidebarTrigger className='bg-background shadow-md border' />
      </div>

      <div className='mb-6 flex h-20 w-20 items-center justify-center rounded-full'>
        <img src='/logo-chatpulse-icon.png' alt='ChatPulse' />
      </div>
      <h2 className='mb-2 text-2xl font-semibold text-foreground'>Chào mừng {displayName} đến với ChatPulse!</h2>
      <p className='max-w-md text-muted-foreground'>
        Bắt đầu trò chuyện bằng cách chọn một tin nhắn ở menu bên trái hoặc tìm kiếm bạn bè để tạo cuộc trò chuyện mới.
      </p>

      {/* Hướng dẫn nhấp nháy trên Mobile */}
      <p className='md:hidden mt-4 text-sm font-medium text-primary animate-pulse'>
        👈 Bấm vào biểu tượng Menu ở góc trên để xem tin nhắn
      </p>
    </div>
  )
}
