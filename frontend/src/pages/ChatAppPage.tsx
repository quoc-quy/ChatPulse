import { useContext } from 'react'
import { AppContext } from '@/context/app.context'
import { ChatWelcomeScreen } from '@/components/chat/ChatWelcomScreen'
import { ChatArea } from '@/components/chat/ChatArea'

export default function ChatAppPage() {
  // Lấy trạng thái chat đang chọn từ Global Context
  const { activeChat } = useContext(AppContext)

  // Nếu chưa chọn ai -> Hiện màn hình chào mừng
  if (!activeChat) {
    return (
      <div className='flex h-screen w-full flex-col'>
        <ChatWelcomeScreen />
      </div>
    )
  }

  // Nếu đã chọn chat -> Hiện giao diện nhắn tin
  return <ChatArea chat={activeChat} />
}
