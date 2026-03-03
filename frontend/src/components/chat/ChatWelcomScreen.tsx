import { useContext } from 'react'
import { AppContext } from '@/context/app.context'
import { MessageSquare } from 'lucide-react'

export function ChatWelcomeScreen() {
  // Lấy thông tin người dùng từ Global Context
  const { profile } = useContext(AppContext)

  // Xác định tên hiển thị, ưu tiên userName, nếu không có thì dùng fullName hoặc mặc định
  const displayName = profile?.userName || 'bạn'

  return (
    <div className='flex flex-1 flex-col items-center justify-center bg-muted/10 p-4 text-center'>
      <div className='mb-6 flex h-20 w-20 items-center justify-center rounded-full'>
        <img src='/logo-chatpulse-icon.png' alt='ChatPulse' />
      </div>
      <h2 className='mb-2 text-2xl font-semibold text-foreground'>Chào mừng {displayName} đến với ChatPulse!</h2>
      <p className='max-w-md text-muted-foreground'>
        Bắt đầu trò chuyện bằng cách chọn một tin nhắn ở menu bên trái hoặc tìm kiếm bạn bè để tạo cuộc trò chuyện mới.
      </p>
    </div>
  )
}
