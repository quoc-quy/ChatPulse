import { useState, useRef, useEffect, useContext } from 'react'
import { Smile, Send, Paperclip, ImageIcon, Mic } from 'lucide-react'
import EmojiPicker, { Theme } from 'emoji-picker-react'
import { messagesApi } from '@/apis/messages.api'
import { AppContext } from '@/context/app.context'

interface ChatFooterProps {
  convId: string
}

export function ChatFooter({ convId }: ChatFooterProps) {
  const { profile } = useContext(AppContext)
  const [content, setContent] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [emojiTheme, setEmojiTheme] = useState<Theme>(Theme.LIGHT)

  const inputRef = useRef<HTMLInputElement>(null)
  const emojiRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const checkTheme = () =>
      setEmojiTheme(document.documentElement.classList.contains('dark') ? Theme.DARK : Theme.LIGHT)
    checkTheme()
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setShowEmoji(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSendText = async () => {
    if (!content.trim() || !convId || isSending) return

    const messageContent = content.trim()
    setContent('')
    setShowEmoji(false)
    triggerOptimisticAndSend('text', messageContent, async () => {
      return await messagesApi.sendMessage({ convId, type: 'text', content: messageContent })
    })
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !convId || isSending) return
    event.target.value = '' // Reset input

    // Tạo nội dung nháp hiển thị tạm thời
    const tempContent = URL.createObjectURL(file)

    triggerOptimisticAndSend('media', tempContent, async () => {
      return await messagesApi.sendMediaMessage(convId, file)
    })
  }

  const triggerOptimisticAndSend = async (type: string, msgContent: string, apiCall: () => Promise<any>) => {
    const tempId = `temp-${Date.now()}`
    const tempMessage = {
      _id: tempId,
      conversationId: convId,
      type,
      content: msgContent,
      status: 'SENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sender: { _id: profile?._id || '', userName: profile?.userName || '', avatar: profile?.avatar || '' },
      deliveredTo: [],
      seenBy: []
    }
    window.dispatchEvent(new CustomEvent('optimistic_send', { detail: tempMessage }))

    try {
      setIsSending(true)
      const response = await apiCall()
      window.dispatchEvent(
        new CustomEvent('optimistic_success', { detail: { tempId, realMessage: response.data.result } })
      )
    } catch (error) {
      console.error('Lỗi khi gửi:', error)
      window.dispatchEvent(new CustomEvent('optimistic_fail', { detail: { tempId } }))
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendText()
    }
  }

  const onEmojiClick = (emojiObject: any) => {
    const cursor = inputRef.current?.selectionStart || content.length
    setContent(content.slice(0, cursor) + emojiObject.emoji + content.slice(cursor))
    setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.setSelectionRange(cursor + emojiObject.emoji.length, cursor + emojiObject.emoji.length)
    }, 10)
  }

  return (
    <div className='p-4 bg-background flex items-center gap-2 relative border-t border-border/40 px-4 shadow-sm'>
      {/* File Inputs (Hidden) */}
      <input type='file' ref={fileInputRef} className='hidden' onChange={handleFileUpload} />
      <input
        type='file'
        ref={mediaInputRef}
        accept='image/*,video/*,audio/*'
        className='hidden'
        onChange={handleFileUpload}
      />

      <button
        onClick={() => fileInputRef.current?.click()}
        className='p-2 text-muted-foreground hover:text-foreground transition-colors'
      >
        <Paperclip className='w-5 h-5' />
      </button>
      <button
        onClick={() => mediaInputRef.current?.click()}
        className='p-2 text-muted-foreground hover:text-foreground transition-colors'
      >
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
          <EmojiPicker onEmojiClick={onEmojiClick} theme={emojiTheme} searchPlaceHolder='Tìm kiếm cảm xúc...' />
        </div>
      )}

      <button
        onClick={handleSendText}
        disabled={!content.trim() && !isSending}
        className='p-2 bg-gradient-to-r from-[#6b45e9] to-[#a139e4] text-white rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center w-10 h-10'
      >
        <Send className='w-5 h-5 ml-1' />
      </button>
    </div>
  )
}
