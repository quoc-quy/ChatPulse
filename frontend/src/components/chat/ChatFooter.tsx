// frontend-demo/src/components/chat/ChatFooter.tsx
import { useState } from 'react'
import { SendHorizontal, Paperclip, Smile } from 'lucide-react'
import { messagesApi } from '@/apis/messages.api'

interface ChatFooterProps {
  convId: string
}

export function ChatFooter({ convId }: ChatFooterProps) {
  const [content, setContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSend = async () => {
    if (!content.trim() || !convId || isLoading) return

    try {
      setIsLoading(true)
      // Gọi API: Backend lưu DB và sẽ lo nhiệm vụ bắn Socket tới những người trong nhóm
      await messagesApi.sendMessage({
        convId,
        type: 'text',
        content: content.trim()
      })
      setContent('') // Gửi xong thì xóa trắng ô input
    } catch (error) {
      console.error('Lỗi khi gửi tin nhắn:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Nhấn Enter (không đè Shift) thì gửi
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className='flex items-center gap-2 border-t border-border/40 bg-background p-4'>
      <button className='p-2 text-muted-foreground hover:text-foreground transition-colors '>
        <Paperclip className='h-5 w-5' />
      </button>

      <div className='flex-1 relative'>
        <input
          type='text'
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='Nhập tin nhắn...'
          disabled={isLoading}
          className='w-full rounded-full border border-border text-foreground bg-muted/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50'
        />
        <button className='absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground transition-colors'>
          <Smile className='h-5 w-5' />
        </button>
      </div>

      <button
        onClick={handleSend}
        disabled={!content.trim() || isLoading}
        className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#6b45e9] text-white disabled:opacity-50 transition-colors hover:bg-[#a139e4]'
      >
        <SendHorizontal className='h-5 w-5 ml-0.5' />
      </button>
    </div>
  )
}
