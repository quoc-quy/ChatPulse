/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useEffect, useContext } from 'react'
import { Smile, Send, Paperclip, ImageIcon, X, Reply } from 'lucide-react'
import EmojiPicker, { Theme } from 'emoji-picker-react'
import { messagesApi } from '@/apis/messages.api'
import { AppContext } from '@/context/app.context'
import type { Message, ReplyInfo } from '@/types/message.type'

interface ChatFooterProps {
  convId: string
}

const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB

export function ChatFooter({ convId }: ChatFooterProps) {
  const { profile } = useContext(AppContext)
  const [content, setContent] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [emojiTheme, setEmojiTheme] = useState<Theme>(Theme.LIGHT)
  const [replyingTo, setReplyingTo] = useState<ReplyInfo | null>(null)

  const MAX_TEXT_LENGTH = 2000

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const emojiRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaInputRef = useRef<HTMLInputElement>(null)

  // 1. TỰ ĐỘNG LƯU NHÁP VÀ LẤY NHÁP TỪ LOCALSTORAGE
  useEffect(() => {
    const savedDraft = localStorage.getItem(`draft_${convId}`)
    if (savedDraft) setContent(savedDraft)
    else setContent('')
    setReplyingTo(null) // Reset reply khi đổi đoạn chat
  }, [convId])

  useEffect(() => {
    if (content.trim()) {
      localStorage.setItem(`draft_${convId}`, content)
    } else {
      localStorage.removeItem(`draft_${convId}`)
    }
  }, [content, convId])

  // Lắng nghe sự kiện bấm Reply từ MessageItem
  useEffect(() => {
    const handleSetReply = (e: CustomEvent<ReplyInfo>) => {
      setReplyingTo(e.detail)
      // BUG FIX 3: setReplyingTo là bất đồng bộ — React chưa re-render xong nên
      // gọi focus() ngay lập tức không có tác dụng (nhất là trên mobile).
      // Dùng setTimeout để đảm bảo focus sau khi component đã re-render
      // và animation slide-in-from-bottom-2 của khung trích dẫn đã bắt đầu.
      setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
    }
    window.addEventListener('set_reply', handleSetReply as EventListener)
    return () => window.removeEventListener('set_reply', handleSetReply as EventListener)
  }, [])

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

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = '40px'
      const scrollHeight = inputRef.current.scrollHeight
      if (scrollHeight > 130) {
        inputRef.current.style.height = '130px'
        inputRef.current.style.overflowY = 'auto'
      } else {
        inputRef.current.style.height = `${scrollHeight}px`
        inputRef.current.style.overflowY = 'hidden'
      }
    }
  }, [content])

  const handleSendText = async () => {
    if (!content.trim() || !convId || isSending) return

    const messageContent = content.trim()
    const replyId = replyingTo?._id

    // Lưu lại thông tin reply vào biến tạm trước khi clear state
    const currentReplyInfo = replyingTo

    setContent('')
    setReplyingTo(null)
    setShowEmoji(false)
    localStorage.removeItem(`draft_${convId}`)

    if (inputRef.current) inputRef.current.style.height = '40px'

    // 1. TÁCH TIN NHẮN DÀI BẢO TOÀN TỪ VỰNG (Word Boundary Split)
    const chunks: string[] = []
    let remainingText = messageContent

    while (remainingText.length > 0) {
      // Nếu phần còn lại ngắn hơn giới hạn, đưa vào mảng và kết thúc
      if (remainingText.length <= MAX_TEXT_LENGTH) {
        chunks.push(remainingText)
        break
      }

      // Cắt thử một đoạn tối đa
      const windowText = remainingText.slice(0, MAX_TEXT_LENGTH)

      // Tìm vị trí khoảng trắng hoặc xuống dòng cuối cùng trong đoạn cắt thử
      const lastSpaceIndex = windowText.lastIndexOf(' ')
      const lastNewlineIndex = windowText.lastIndexOf('\n')
      const safeBreakPoint = Math.max(lastSpaceIndex, lastNewlineIndex)

      let splitIndex

      if (safeBreakPoint > 0) {
        // Nếu tìm thấy ranh giới từ (khoảng trắng/xuống dòng), cắt ngay tại đó
        splitIndex = safeBreakPoint
        chunks.push(remainingText.slice(0, splitIndex))
        // Cập nhật phần còn lại, cộng 1 để bỏ qua ký tự khoảng trắng/xuống dòng đã dùng để cắt
        remainingText = remainingText.slice(splitIndex + 1)
      } else {
        // Trường hợp hiếm: 1 chuỗi ký tự dính liền không khoảng trắng dài hơn MAX_TEXT_LENGTH
        // -> Đành phải cắt cứng tại MAX_TEXT_LENGTH
        splitIndex = MAX_TEXT_LENGTH
        chunks.push(remainingText.slice(0, splitIndex))
        remainingText = remainingText.slice(splitIndex)
      }
    }

    // 2. GỬI LẦN LƯỢT TỪNG PHẦN
    for (let i = 0; i < chunks.length; i++) {
      const chunkContent = chunks[i]

      const targetReplyId = i === 0 ? replyId : undefined
      const targetReplyInfo = i === 0 ? currentReplyInfo : null

      triggerOptimisticAndSend(
        'text',
        chunkContent,
        targetReplyId,
        async () => {
          return await messagesApi.sendMessage({
            convId,
            type: 'text',
            content: chunkContent,
            replyToId: targetReplyId
          })
        },
        targetReplyInfo
      )

      if (chunks.length > 1 && i < chunks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }
  }

  // 2. XỬ LÝ CHỌN NHIỀU FILE VÀ VALIDATE DUNG LƯỢNG
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (!files.length || !convId) return
    event.target.value = ''

    const currentReplyId = replyingTo?._id
    const currentReplyInfo = replyingTo
    setReplyingTo(null)

    const validFiles: File[] = []

    // Lọc ra các file hợp lệ
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        alert(`File "${file.name}" vượt quá dung lượng cho phép (25MB).`)
      } else {
        validFiles.push(file)
      }
    }

    if (validFiles.length === 0) return

    // TẠO ALBUM: Gom các local Blob URL thành 1 mảng và chuyển thành chuỗi JSON
    // Để Optimistic UI có thể đọc và render ra Grid layout ngay lập tức
    const localUrls = validFiles.map((file) => URL.createObjectURL(file))
    const tempContent = JSON.stringify(localUrls)

    // Chỉ gọi trigger 1 lần cho cả cụm file
    await triggerOptimisticAndSend(
      'media',
      tempContent,
      currentReplyId,
      async () => {
        return await messagesApi.sendMediaMessage(convId, validFiles, currentReplyId)
      },
      currentReplyInfo
    )
  }

  const triggerOptimisticAndSend = async (
    type: string,
    msgContent: string,
    replyToId?: string,
    apiCall?: () => Promise<any>,
    replyInfo?: ReplyInfo | null
  ) => {
    // Ưu tiên replyInfo được truyền vào (dành cho media), fallback về replyingTo state (cho text)
    const replyToMessage = replyInfo !== undefined ? replyInfo : replyingTo

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const tempMessage: Message = {
      _id: tempId,
      conversationId: convId,
      type: type as any,
      content: msgContent,
      status: 'SENDING', // Hiển thị UI đang gửi
      replyToId: replyToId,
      replyToMessage: replyToMessage || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sender: { _id: profile?._id || '', userName: profile?.userName || '', avatar: profile?.avatar || '' },
      deliveredTo: [],
      seenBy: []
    }

    // Đẩy UI lên màn hình ngay lập tức (Optimistic UI)
    window.dispatchEvent(new CustomEvent('optimistic_send', { detail: tempMessage }))

    if (!apiCall) return

    // Không block state `isSending` trong suốt quá trình auto-retry.
    // Chỉ dùng để khóa spam click trong thời gian ngắn (300ms) để user vẫn có thể gõ/gửi tin nhắn khác.
    setIsSending(true)
    setTimeout(() => setIsSending(false), 300)

    // CẤU HÌNH AUTO-RETRY VỚI EXPONENTIAL BACKOFF
    const MAX_RETRIES = 3
    const BASE_DELAY = 1000 // Thời gian chờ cơ bản: 1000ms (1 giây)
    let attempt = 0
    let success = false

    while (attempt <= MAX_RETRIES && !success) {
      try {
        const response = await apiCall()
        window.dispatchEvent(
          new CustomEvent('optimistic_success', { detail: { tempId, realMessage: response.data.result } })
        )
        success = true
      } catch (error) {
        attempt++
        console.warn(`[Auto-Retry] Lỗi gửi tin nhắn. Đang thử lại lần ${attempt}/${MAX_RETRIES}...`, error)

        if (attempt <= MAX_RETRIES) {
          // Tính toán thời gian chờ: 1s, 2s, 4s...
          const delay = BASE_DELAY * Math.pow(2, attempt - 1)
          await new Promise((resolve) => setTimeout(resolve, delay))
        } else {
          // Khi đã hết số lần thử lại tự động mà vẫn thất bại -> Chuyển sang UI FAILED
          console.error('[Auto-Retry] Gửi thất bại hoàn toàn. Chuyển sang manual retry.')
          window.dispatchEvent(new CustomEvent('optimistic_fail', { detail: { tempId, apiCall } }))
        }
      }
    }
  }

  // Lắng nghe sự kiện Retry từ MessageItem
  useEffect(() => {
    const handleRetry = async (e: any) => {
      const { tempId, apiCall } = e.detail
      if (!apiCall) return
      // Đổi trạng thái lại thành SENDING
      window.dispatchEvent(new CustomEvent('optimistic_retry_start', { detail: { tempId } }))
      try {
        const response = await apiCall()
        window.dispatchEvent(
          new CustomEvent('optimistic_success', { detail: { tempId, realMessage: response.data.result } })
        )
      } catch (error) {
        window.dispatchEvent(new CustomEvent('optimistic_fail', { detail: { tempId, apiCall } }))
      }
    }
    window.addEventListener('retry_send', handleRetry)
    return () => window.removeEventListener('retry_send', handleRetry)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
    <div className='p-4 bg-background flex flex-col gap-2 relative border-t border-border/40 px-4 shadow-sm'>
      {/* Khung hiển thị Trích dẫn */}
      {replyingTo && (
        <div className='flex items-center justify-between bg-muted/50 p-2 rounded-lg border-l-4 border-[#6b45e9] mx-10 animate-in slide-in-from-bottom-2'>
          <div className='flex items-center gap-2 overflow-hidden'>
            <Reply className='w-4 h-4 text-muted-foreground shrink-0' />
            <div className='flex flex-col overflow-hidden'>
              <span className='text-xs font-semibold text-foreground'>Trả lời {replyingTo.senderName}</span>
              <span className='text-xs text-muted-foreground truncate max-w-[200px] sm:max-w-[400px]'>
                {replyingTo.type === 'text' ? replyingTo.content : '[Đa phương tiện]'}
              </span>
            </div>
          </div>
          <button onClick={() => setReplyingTo(null)} className='p-1 hover:bg-muted rounded-full text-muted-foreground'>
            <X className='w-4 h-4' />
          </button>
        </div>
      )}

      <div className='flex items-end gap-2'>
        <input type='file' multiple ref={fileInputRef} className='hidden' onChange={handleFileUpload} />
        <input
          type='file'
          multiple
          ref={mediaInputRef}
          accept='image/*,video/*'
          className='hidden'
          onChange={handleFileUpload}
        />

        <div className='flex items-center pb-2'>
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
        </div>

        <div className='relative flex-1 flex items-end bg-muted rounded-3xl pb-0.5 border border-transparent focus-within:border-blue-500 transition-all'>
          <textarea
            ref={inputRef}
            placeholder='Nhập tin nhắn...'
            className='w-full bg-transparent text-foreground px-4 py-[10px] pr-10 outline-none resize-none leading-relaxed'
            style={{ minHeight: '40px', height: '40px', maxHeight: '130px' }}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button
            onClick={() => setShowEmoji(!showEmoji)}
            className={`absolute right-3 bottom-[8px] p-1 transition-colors ${showEmoji ? 'text-blue-500' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Smile className='w-5 h-5' />
          </button>
        </div>

        {showEmoji && (
          <div ref={emojiRef} className='absolute bottom-full right-16 mb-2 z-50 shadow-xl rounded-lg'>
            <EmojiPicker onEmojiClick={onEmojiClick} theme={emojiTheme} searchPlaceHolder='Tìm kiếm cảm xúc...' />
          </div>
        )}

        <div className='pb-[2px]'>
          <button
            onClick={handleSendText}
            disabled={!content.trim() && !isSending && !replyingTo}
            className='p-2 bg-gradient-to-r from-[#6b45e9] to-[#a139e4] text-white rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center w-10 h-10'
          >
            <Send className='w-5 h-5 ml-1' />
          </button>
        </div>
      </div>
    </div>
  )
}
