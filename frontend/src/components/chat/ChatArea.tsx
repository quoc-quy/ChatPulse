import { ChatHeader } from './ChatHeader'
import { ChatBody } from './ChatBody'
import { ChatFooter } from './ChatFooter'
import type { ChatItem } from '@/context/app.context'

interface ChatAreaProps {
  chat: ChatItem
}

export function ChatArea({ chat }: ChatAreaProps) {
  return (
    <div className='flex h-screen flex-col bg-background w-full'>
      <ChatHeader chat={chat} />
      <ChatBody />
      <ChatFooter />
    </div>
  )
}
