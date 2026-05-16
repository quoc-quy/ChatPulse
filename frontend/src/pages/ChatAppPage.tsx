import { useContext } from 'react'
import { AppContext } from '@/context/app.context'
import { ChatWelcomeScreen } from '@/components/chat/ChatWelcomScreen'
import { ChatArea } from '@/components/chat/ChatArea'

// 1. THÊM IMPORT 2 COMPONENT AI TẠI ĐÂY
import { AIChatArea } from '@/components/chat/AIChatArea'

export default function ChatAppPage() {
  const { activeChat } = useContext(AppContext)

  if (!activeChat) {
    return (
      <div className='flex h-screen w-full flex-col'>
        <ChatWelcomeScreen />
      </div>
    )
  }

  // 2. THÊM ĐIỀU KIỆN RENDER CHO CHATPULSE AI (AI cũ)
  if (activeChat.type === 'ai' || activeChat.type === 'traffic-ai') {
    return <AIChatArea chat={activeChat} />
  }

  // Nếu không phải là AI (tức là user, group), hệ thống sẽ chạy xuống dòng này
  // để render màn hình nhắn tin bình thường
  return <ChatArea chat={activeChat} />
}
