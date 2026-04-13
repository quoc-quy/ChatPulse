/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useEffect, useContext } from 'react'
import { Smile, Send, Paperclip, ImageIcon, X, Reply } from 'lucide-react'
import EmojiPicker, { Theme } from 'emoji-picker-react'
import { messagesApi } from '@/apis/messages.api'
import { AppContext } from '@/context/app.context'
import type { Message, ReplyInfo } from '@/types/message.type'
import { toast } from 'sonner'
import { E2E } from '@/utils/e2e.utils'

interface ChatFooterProps {
  convId: string
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const BLOCKED_EXTENSIONS = ['exe', 'bat', 'cmd', 'msi', 'scr', 'vbs', 'sh', 'ps1', 'jar', 'sys', 'dll']

export function ChatFooter({ convId }: ChatFooterProps) {
  const { profile, activeChat } = useContext(AppContext)
  const [content, setContent] = useState('')
  const [prevConvId, setPrevConvId] = useState(convId)
  const [showEmoji, setShowEmoji] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [emojiTheme, setEmojiTheme] = useState<Theme>(Theme.LIGHT)
  const [replyingTo, setReplyingTo] = useState<ReplyInfo | null>(null)

  const MAX_TEXT_LENGTH = 2000

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const emojiRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaInputRef = useRef<HTMLInputElement>(null)

  // Ép đồng bộ state nháp ngay tức thì khi đổi tab chat
  if (convId !== prevConvId) {
    setPrevConvId(convId)
    const savedDraft = localStorage.getItem(`draft_${convId}`)
    setContent(savedDraft || '')
    setReplyingTo(null)
  }

  // ✅ FIX: Chỉ khai báo 1 lần (bản gốc bị duplicate 2 lần giống hệt nhau)
  useEffect(() => {
    if (content.trim()) {
      localStorage.setItem(`draft_${convId}`, content)
    } else {
      localStorage.removeItem(`draft_${convId}`)
    }
    window.dispatchEvent(new CustomEvent('draft_updated', { detail: { convId, content: content.trim() } }))
  }, [content, convId])

  useEffect(() => {
    const handleSetReply = (e: CustomEvent<ReplyInfo>) => {
      setReplyingTo(e.detail)
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

  const handleEncryption = (text: string) => {
    // ✅ FIX 2: Lấy khóa từ Context HOẶC LocalStorage để tránh bị Stale Data (Dữ liệu cũ chưa update kịp)
    // ✅ FIX 3: Hỗ trợ cả 2 chuẩn naming (publicKey và public_key)
    const myPublicKey =
      profile?.public_key ||
      (profile as any)?.publicKey ||
      localStorage.getItem('rsa_public_key') ||
      localStorage.getItem(`rsa_public_key_${profile?._id}`)

    if (!myPublicKey) {
      toast.error('Lỗi mã hóa', { description: 'Thiết bị của bạn chưa thiết lập khóa bảo mật.' })
      return { finalContent: text, isE2E: false, encryptedKeys: {} as Record<string, string> }
    }

    const participants = activeChat?.participants || []

    // ✅ FIX 3: Check cả public_key và publicKey cho chắc chắn
    const missingKeyUsers = participants.filter((p: any) => !(p.public_key || p.publicKey))

    if (missingKeyUsers.length > 0) {
      const isGroup = activeChat?.type === 'group'
      const msg = isGroup
        ? `Không thể mã hóa E2E. ${missingKeyUsers.length} thành viên chưa cập nhật khóa bảo mật.`
        : `Không thể mã hóa E2E. Người dùng này chưa cập nhật khóa bảo mật.`

      toast.error('Cảnh báo bảo mật', { description: msg })
      return { finalContent: text, isE2E: false, encryptedKeys: {} as Record<string, string> }
    }

    const aesKey = E2E.generateRandomAESKey()
    const encryptedContent = E2E.encryptMessageAES(text, aesKey)
    const encryptedKeysObj: Record<string, string> = {}

    // Tiến hành mã hóa cho tất cả thành viên
    participants.forEach((p: any) => {
      const targetPubKey = p.public_key || p.publicKey
      if (targetPubKey) {
        encryptedKeysObj[String(p._id)] = E2E.encryptAESKeyWithRSA(aesKey, targetPubKey)
      }
    })

    // Đảm bảo mã hóa cho chính mình để tự đọc lại được
    if (!encryptedKeysObj[String(profile?._id)]) {
      encryptedKeysObj[String(profile?._id)] = E2E.encryptAESKeyWithRSA(aesKey, myPublicKey)
    }

    return {
      finalContent: encryptedContent,
      isE2E: true,
      encryptedKeys: encryptedKeysObj
    }
  }

  const handleSendText = async () => {
    if (!content.trim() || !convId || isSending) return

    const messageContent = content.trim()
    const replyId = replyingTo?._id
    const currentReplyInfo = replyingTo

    setContent('')
    setReplyingTo(null)
    setShowEmoji(false)
    localStorage.removeItem(`draft_${convId}`)
    window.dispatchEvent(new CustomEvent('draft_updated', { detail: { convId, content: '' } }))

    if (inputRef.current) inputRef.current.style.height = '40px'

    const chunks: string[] = []
    let remainingText = messageContent

    while (remainingText.length > 0) {
      if (remainingText.length <= MAX_TEXT_LENGTH) {
        chunks.push(remainingText)
        break
      }

      const windowText = remainingText.slice(0, MAX_TEXT_LENGTH)
      const lastSpaceIndex = windowText.lastIndexOf(' ')
      const lastNewlineIndex = windowText.lastIndexOf('\n')
      const safeBreakPoint = Math.max(lastSpaceIndex, lastNewlineIndex)

      let splitIndex

      if (safeBreakPoint > 0) {
        splitIndex = safeBreakPoint
        chunks.push(remainingText.slice(0, splitIndex))
        remainingText = remainingText.slice(splitIndex + 1)
      } else {
        splitIndex = MAX_TEXT_LENGTH
        chunks.push(remainingText.slice(0, splitIndex))
        remainingText = remainingText.slice(splitIndex)
      }
    }

    for (let i = 0; i < chunks.length; i++) {
      const chunkContent = chunks[i]
      const targetReplyId = i === 0 ? replyId : undefined
      const targetReplyInfo = i === 0 ? currentReplyInfo : null

      // THỰC HIỆN MÃ HÓA TRƯỚC KHI GỬI
      const { finalContent, isE2E, encryptedKeys } = handleEncryption(chunkContent)

      triggerOptimisticAndSend(
        'text',
        chunkContent, // TRUYỀN BẢN RÕ (Plaintext) cho UI vẽ bong bóng chat đọc được ngay
        targetReplyId,
        async () => {
          // ✅ FIX: Truyền encryptedKeys dưới dạng object thay vì Object.values() (array)
          // để backend map được đúng userId → encryptedAesKey
          return await messagesApi.sendMessage({
            convId,
            type: 'text',
            content: finalContent, // Bản mã (ciphertext) gửi lên server
            isE2E: isE2E,
            encryptedKeys: encryptedKeys // Object { userId: key } — KHÔNG dùng Object.values()
          })
        },
        targetReplyInfo
      )

      if (chunks.length > 1 && i < chunks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (!files.length || !convId) return
    event.target.value = ''

    const currentReplyId = replyingTo?._id
    const currentReplyInfo = replyingTo
    setReplyingTo(null)

    const validFiles: File[] = []

    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase() || ''

      if (BLOCKED_EXTENSIONS.includes(ext)) {
        toast.error(`File "${file.name}" không được hỗ trợ.`, {
          description: 'Vì lý do bảo mật, hệ thống không cho phép gửi file thực thi hoặc script.'
        })
      } else if (file.size > MAX_FILE_SIZE) {
        toast.error(`File "${file.name}" vượt quá dung lượng cho phép (10MB).`, {
          description: 'Vui lòng chọn file nhỏ hơn để tiết kiệm không gian lưu trữ.'
        })
      } else {
        validFiles.push(file)
      }
    }

    if (validFiles.length === 0) return

    const localUrls = validFiles.map((file) => URL.createObjectURL(file))
    const tempContent = JSON.stringify(localUrls)

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
    const replyToMessage = replyInfo !== undefined ? replyInfo : replyingTo

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // 1. TẠO MESSAGE ẢO (Hiển thị ngay cho người dùng)
    const tempMessage: Message = {
      _id: tempId,
      conversationId: convId,
      type: type as any,
      content: msgContent, // Hiển thị chữ thật, không hiển thị chuỗi mã hóa
      status: 'SENDING',
      replyToId: replyToId,
      replyToMessage: replyToMessage || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sender: { _id: profile?._id || '', userName: profile?.userName || '', avatar: profile?.avatar || '' },
      deliveredTo: [],
      seenBy: []
    }

    window.dispatchEvent(new CustomEvent('optimistic_send', { detail: tempMessage }))

    if (!apiCall) return

    setIsSending(true)
    setTimeout(() => setIsSending(false), 300)

    // GỌI API VỚI CƠ CHẾ AUTO-RETRY & BẮT BLOCK
    const MAX_RETRIES = 3
    const BASE_DELAY = 1000
    let attempt = 0
    let success = false

    while (attempt <= MAX_RETRIES && !success) {
      try {
        const response = await apiCall()

        window.dispatchEvent(
          new CustomEvent('optimistic_success', { detail: { tempId, realMessage: response.data.result } })
        )
        success = true
      } catch (error: any) {
        const status = error.response?.status || error.status
        const errorMessage = error.response?.data?.message || error.message || ''

        const isBlockError =
          status === 403 || errorMessage.includes('chặn') || errorMessage.includes('không muốn nhận tin nhắn')

        if (isBlockError) {
          console.warn('[Message] Bị chặn. Chuyển bong bóng chat thành tin nhắn hệ thống cảnh báo.')
          window.dispatchEvent(new CustomEvent('optimistic_blocked', { detail: { tempId, errorMessage } }))
          break
        }

        attempt++
        console.warn(`[Auto-Retry] Lỗi gửi tin nhắn. Đang thử lại lần ${attempt}/${MAX_RETRIES}...`, error)

        if (attempt <= MAX_RETRIES) {
          const delay = BASE_DELAY * Math.pow(2, attempt - 1)
          await new Promise((resolve) => setTimeout(resolve, delay))
        } else {
          console.error('[Auto-Retry] Gửi thất bại hoàn toàn. Chuyển sang chờ người dùng gửi lại thủ công.')
          window.dispatchEvent(new CustomEvent('optimistic_fail', { detail: { tempId, apiCall } }))
        }
      }
    }
  }

  useEffect(() => {
    const handleRetry = async (e: any) => {
      const { tempId, apiCall } = e.detail
      if (!apiCall) return
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

  // KIỂM TRA TRẠNG THÁI BẠN BÈ
  const isUnfriended = activeChat && activeChat.isFriend === false

  if (isUnfriended) {
    return (
      <div className='p-4 bg-muted/40 border-t border-border flex items-center justify-center min-h-[72px]'>
        <p className='text-[13px] text-muted-foreground font-medium text-center'>
          Bạn không thể tiếp tục trò chuyện do hai người không còn là bạn bè.
        </p>
      </div>
    )
  }

  return (
    <div className='p-4 bg-background flex flex-col gap-2 relative border-t border-border/40 px-4 shadow-sm'>
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
