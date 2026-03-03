import { Paperclip, Smile, SendHorizontal, Image as ImageIcon, Mic } from 'lucide-react'
import { useState } from 'react'

export function ChatFooter() {
  const [message, setMessage] = useState('')

  const handleSend = () => {
    if (!message.trim()) return
    console.log('Sending:', message)
    // TODO: Call API gửi tin nhắn ở đây
    setMessage('')
  }

  return (
    <footer className='border-t border-border/40 bg-background p-3 sm:p-4'>
      <div className='flex items-end gap-2'>
        {/* Nhóm chức năng đính kèm */}
        <div className='flex pb-1 gap-1 text-muted-foreground shrink-0'>
          <button className='p-2 hover:bg-muted hover:text-blue-500 rounded-full transition-colors'>
            <Paperclip className='h-5 w-5' />
          </button>
          <button className='p-2 hover:bg-muted hover:text-blue-500 rounded-full transition-colors hidden sm:block'>
            <ImageIcon className='h-5 w-5' />
          </button>
        </div>

        {/* Khung nhập text */}
        <div className='flex-1 flex items-center bg-muted/50 border border-border rounded-3xl px-4 py-2 focus-within:ring-1 focus-within:ring-blue-500 transition-all'>
          <input
            type='text'
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder='Nhập tin nhắn...'
            className='flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground'
          />
          <button className='p-1.5 text-muted-foreground hover:text-blue-500 transition-colors shrink-0'>
            <Smile className='h-5 w-5' />
          </button>
        </div>

        {/* Nút gửi hoặc Ghi âm */}
        <button
          onClick={handleSend}
          className={`shrink-0 p-3 rounded-full transition-all flex items-center justify-center ${
            message.trim()
              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
              : 'bg-muted text-muted-foreground hover:text-foreground'
          }`}
        >
          {message.trim() ? <SendHorizontal className='h-5 w-5' /> : <Mic className='h-5 w-5' />}
        </button>
      </div>
    </footer>
  )
}
