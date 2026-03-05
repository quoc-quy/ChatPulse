import { useContext } from 'react'
import { AppContext } from '@/context/app.context'
import { ChatWelcomeScreen } from '@/components/chat/ChatWelcomScreen'
import { ChatArea } from '@/components/chat/ChatArea'

export default function ChatAppPage() {
  const { activeChat } = useContext(AppContext)

  if (!activeChat) {
    return (
      <div className='flex h-screen w-full flex-col'>
        <ChatWelcomeScreen />
      </div>
    )
  }

  return <ChatArea chat={activeChat} />
}
