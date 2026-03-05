import { useState, useRef, useEffect } from 'react'
import { Smile, Send, Paperclip, ImageIcon } from 'lucide-react'
import EmojiPicker, { Theme } from 'emoji-picker-react'
import { messagesApi } from '@/apis/messages.api'

interface ChatFooterProps {
  convId: string
}

export function ChatFooter({ convId }: ChatFooterProps) {
  const [content, setContent] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [emojiTheme, setEmojiTheme] = useState<Theme>(Theme.LIGHT)

  const inputRef = useRef<HTMLInputElement>(null)
  const emojiRef = useRef<HTMLDivElement>(null)

  // ĐỒNG BỘ THEME TỪ TAILWIND (Không phụ thuộc vào React Context)
  useEffect(() => {
    const checkTheme = () => {
      const isDark = document.documentElement.classList.contains('dark')
      setEmojiTheme(isDark ? Theme.DARK : Theme.LIGHT)
    }

    // Kiểm tra theme ngay lần đầu render
    checkTheme()

    // Lắng nghe sự thay đổi class 'dark' trên thẻ HTML (khi user switch mode)
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    return () => observer.disconnect()
  }, [])

  // Xử lý click ra ngoài để đóng popup Emoji
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(event.target as Node)) {
        setShowEmoji(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSend = async () => {
    if (!content.trim() || !convId || isSending) return

    try {
      setIsSending(true)
      await messagesApi.sendMessage({
        convId,
        type: 'text',
        content: content.trim()
      })
      setContent('')
      setShowEmoji(false)
    } catch (error) {
      console.error('Lỗi khi gửi tin nhắn:', error)
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const onEmojiClick = (emojiObject: any) => {
    const cursor = inputRef.current?.selectionStart || content.length
    const textBefore = content.slice(0, cursor)
    const textAfter = content.slice(cursor)

    setContent(textBefore + emojiObject.emoji + textAfter)

    setTimeout(() => {
      inputRef.current?.focus()
      const newCursorPos = cursor + emojiObject.emoji.length
      inputRef.current?.setSelectionRange(newCursorPos, newCursorPos)
    }, 10)
  }

  return (
    <div className='p-4 bg-background  flex items-center gap-2 relative border-t border-border/40  px-4 shadow-sm'>
      <button className='p-2 text-muted-foreground hover:text-foreground transition-colors'>
        <Paperclip className='w-5 h-5' />
      </button>
      <button className='p-2 text-muted-foreground hover:text-foreground transition-colors'>
        <ImageIcon className='w-5 h-5' />
      </button>

      <div className='relative flex-1 flex items-center'>
        <input
          ref={inputRef}
          type='text'
          placeholder='Nhập tin nhắn...'
          className='w-full bg-muted text-foreground rounded-full px-4 py-2 pr-10 outline-none focus:ring-2 focus:ring-blue-500'
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        <button
          onClick={() => setShowEmoji(!showEmoji)}
          className={`absolute right-3 p-1 transition-colors ${showEmoji ? 'text-blue-500' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Smile className='w-5 h-5' />
        </button>
      </div>

      {showEmoji && (
        <div ref={emojiRef} className='absolute bottom-full right-16 mb-2 z-50 shadow-xl rounded-lg'>
          <EmojiPicker
            onEmojiClick={onEmojiClick}
            theme={emojiTheme} // Truyền Theme đã tự động detect vào đây
            searchPlaceHolder='Tìm kiếm cảm xúc...'
          />
        </div>
      )}

      <button
        onClick={handleSend}
        disabled={!content.trim() || isSending}
        className='p-2 bg-gradient-to-r from-[#6b45e9] to-[#a139e4] text-white rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center w-10 h-10'
      >
        <Send className='w-5 h-5 ml-1' />
      </button>
    </div>
  )
}
