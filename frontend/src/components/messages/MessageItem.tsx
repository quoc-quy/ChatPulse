/* eslint-disable @typescript-eslint/no-explicit-any */
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { Message } from '@/types/message.type'
import { CallMessage } from '../chat/CallMessage'
import { AppContext } from '@/context/app.context'
import { useContext, useState } from 'react'
import { createPortal } from 'react-dom'
import { ReactionModal } from './ReactionModal'
import { ReactionBadge } from './ReactionBadge'
import { MessageActions } from './MessageActions'
import { Check, CheckCheck, Clock, File as FileIcon, Download, X, RefreshCcw } from 'lucide-react'
import { E2E } from '@/utils/e2e.utils'

interface MessageItemProps {
  message: Message
  isMe: boolean
  senderName: string
  displayTime: string
  showTimeDivider: boolean
  dividerTimeStr: string
  isFirstInGroup?: boolean
  isLastInGroup?: boolean
  onDeleteForMe?: (messageId: string) => void
}

export function MessageItem({
  message,
  isMe,
  senderName,
  displayTime,
  showTimeDivider,
  dividerTimeStr,
  isFirstInGroup = true,
  isLastInGroup = true,
  onDeleteForMe
}: MessageItemProps) {
  const { profile } = useContext(AppContext)
  const currentUserId = profile?._id || ''

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedMediaUrl, setSelectedMediaUrl] = useState<string | null>(null)

  const isCall = message.type === 'call'
  const isRevoked = message.type === 'revoked'
  const reactions = message.reactions || []
  const hasReactions = reactions.length > 0 && !isRevoked

  const isMedia = message.type === 'media' || message.type === 'image' || message.type === 'video'

  let mediaUrls: string[] = []
  if (isMedia) {
    try {
      const parsed = JSON.parse(message.content)
      mediaUrls = Array.isArray(parsed) ? parsed : [message.content]
    } catch {
      mediaUrls = [message.content]
    }
  }

  const firstUrl = mediaUrls[0] || ''
  const cleanUrl = firstUrl.split('?')[0].split('#')[0]
  const ext = cleanUrl.split('.').pop()?.toLowerCase() || ''

  const isImage =
    isMedia &&
    (message.type === 'image' ||
      ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'bmp', 'svg'].includes(ext) ||
      firstUrl.startsWith('blob:') ||
      firstUrl.startsWith('data:image/') ||
      firstUrl.includes('/image/upload/'))
  const isVideo = isMedia && (message.type === 'video' || ['mp4', 'webm', 'ogg'].includes(ext))
  const isAudio = isMedia && ['mp3', 'wav', 'm4a', 'ogg'].includes(ext)
  const isFile = isMedia && !isImage && !isVideo && !isAudio

  let rowMarginClass = 'mb-[2px]'
  if (isLastInGroup) {
    rowMarginClass = hasReactions ? 'mb-8' : 'mb-4'
  } else {
    rowMarginClass = hasReactions ? 'mb-5' : 'mb-[2px]'
  }

  // ✅ Hàm helper giải mã nội dung bất kỳ (dùng cho cả body lẫn reply)
  const decryptContent = (content: string, encryptedKeys?: Record<string, string>): string => {
    if (!encryptedKeys || !currentUserId) return content

    const privateKey = localStorage.getItem(`rsa_private_key_${currentUserId}`)
    if (!privateKey) return '🔒 Tin nhắn đã mã hóa (Khóa không khả dụng trên thiết bị này)'

    const encryptedAesKey = encryptedKeys[currentUserId]
    if (!encryptedAesKey) return '🔒 Lỗi trao đổi khóa (Không tìm thấy khóa cho user này).'

    const aesKey = E2E.decryptAESKeyWithRSA(encryptedAesKey, privateKey)
    if (!aesKey) return '🔒 Không thể giải mã khóa phiên (Private Key không khớp).'

    return E2E.decryptMessageAES(content, aesKey)
  }

  const getDecryptedContent = () => {
    if (!message.isE2E) return message.content
    return decryptContent(message.content, message.encryptedKeys)
  }

  // ✅ FIX: Giải mã nội dung reply nếu reply đó cũng là tin nhắn E2E
  // (Backend trả về isE2E của replyToMessage để biết có cần giải mã không)
  const getDecryptedReplyContent = (): string => {
    if (!message.replyToMessage) return ''
    const reply = message.replyToMessage

    if (reply.type !== 'text') return '[Đa phương tiện]'

    // Nếu reply là E2E nhưng không có encryptedKeys của reply đó (backend chưa join),
    // hiển thị placeholder thay vì ciphertext
    if (reply.isE2E) {
      return '🔒 [Tin nhắn đã mã hóa]'
    }

    return reply.content
  }

  const displayContent = getDecryptedContent()

  const getInitials = (name?: string) => {
    if (!name || name.trim() === '') return 'U'
    return name.trim().charAt(0).toUpperCase()
  }

  const renderMessageStatus = () => {
    if (!isMe || isCall || isRevoked) return null
    const status = message.status || 'SENT'

    if (status === 'FAILED') {
      return (
        <button
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent('retry_send', { detail: { tempId: message._id, apiCall: (message as any)._apiCall } })
            )
          }
          className='flex items-center gap-1 ml-2 text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded text-[10px] hover:bg-red-500/20 transition'
          title='Nhấn để thử gửi lại'
        >
          <RefreshCcw className='w-3 h-3' /> Thử lại
        </button>
      )
    }
    return (
      <div className='flex items-center ml-1 opacity-70'>
        {status === 'SENDING' && <Clock className='w-[10px] h-[10px]' />}
        {status === 'SENT' && <Check className='w-[14px] h-[14px]' />}
        {status === 'DELIVERED' && <CheckCheck className='w-[14px] h-[14px] text-gray-400' />}
        {status === 'SEEN' && <CheckCheck className='w-[14px] h-[14px] text-blue-400' />}
      </div>
    )
  }

  const renderMessageContent = () => {
    if (isMedia) {
      if (isImage || isVideo) {
        return (
          <>
            {mediaUrls.length === 1 ? (
              isVideo ? (
                <video
                  src={mediaUrls[0]}
                  controls
                  className='max-w-[260px] max-h-[320px] rounded-xl bg-black shadow-sm'
                />
              ) : (
                <img
                  src={mediaUrls[0]}
                  alt='media'
                  onClick={() => setSelectedMediaUrl(mediaUrls[0])}
                  className='max-w-[260px] max-h-[320px] object-cover rounded-xl cursor-pointer hover:opacity-90 transition shadow-sm border border-border/20'
                />
              )
            ) : (
              <div
                className={`grid gap-1 max-w-[280px] rounded-xl overflow-hidden shadow-sm border border-border/20 ${mediaUrls.length >= 2 ? 'grid-cols-2' : ''}`}
              >
                {mediaUrls.slice(0, 4).map((url, index) => {
                  const isLastItem = index === 3 && mediaUrls.length > 4
                  const isItemVideo = ['mp4', 'webm', 'ogg'].includes(
                    url.split('?')[0].split('.').pop()?.toLowerCase() || ''
                  )
                  const itemClass = mediaUrls.length === 3 && index === 0 ? 'col-span-2 aspect-video' : 'aspect-square'

                  return (
                    <div
                      key={index}
                      className={`relative w-full bg-muted cursor-pointer hover:opacity-90 transition ${itemClass}`}
                      onClick={() => setSelectedMediaUrl(url)}
                    >
                      {isItemVideo ? (
                        <video src={url} className='w-full h-full object-cover' />
                      ) : (
                        <img src={url} alt='media' className='w-full h-full object-cover' />
                      )}
                      {isLastItem && (
                        <div className='absolute inset-0 bg-black/60 flex items-center justify-center text-white font-medium text-xl backdrop-blur-[2px]'>
                          +{mediaUrls.length - 4}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {selectedMediaUrl &&
              createPortal(
                <div
                  className='fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm'
                  onClick={() => setSelectedMediaUrl(null)}
                >
                  <div className='relative max-w-[90vw] max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 flex items-center justify-center'>
                    <button
                      className='absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors bg-white/10 rounded-full z-50'
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedMediaUrl(null)
                      }}
                    >
                      <X className='w-6 h-6' />
                    </button>
                    {['mp4', 'webm', 'ogg'].includes(
                      selectedMediaUrl.split('?')[0].split('.').pop()?.toLowerCase() || ''
                    ) ? (
                      <video
                        src={selectedMediaUrl}
                        controls
                        autoPlay
                        className='max-w-full max-h-[85vh] rounded-md shadow-2xl'
                      />
                    ) : (
                      <img
                        src={selectedMediaUrl}
                        alt='Zoomed media'
                        className='max-w-full max-h-[85vh] object-contain rounded-md shadow-2xl'
                      />
                    )}
                  </div>
                </div>,
                document.body
              )}
          </>
        )
      } else if (isAudio) {
        return <audio src={message.content} controls className='max-w-[240px]' />
      } else if (isFile) {
        const fileName = message.content.split('/').pop()?.split('?')[0] || 'Tài liệu không tên'
        return (
          <div
            className={`flex items-center gap-3 w-[250px] sm:w-[300px] p-2.5 rounded-xl border shadow-sm ${isMe ? 'bg-white/10 border-white/20' : 'bg-background border-border'}`}
          >
            <div className='w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0'>
              <FileIcon className='w-6 h-6 text-blue-500' />
            </div>
            <div className='flex-1 min-w-0'>
              <p className='text-[14px] font-medium truncate' title={fileName}>
                {fileName}
              </p>
              <p className='text-[12px] opacity-70 mt-0.5 uppercase'>{ext || 'FILE'}</p>
            </div>
            <a
              href={message.content}
              target='_blank'
              rel='noreferrer'
              className={`p-2 rounded-full transition-colors shrink-0 ${isMe ? 'hover:bg-white/20' : 'hover:bg-muted'}`}
              title='Tải xuống'
            >
              <Download className='w-5 h-5' />
            </a>
          </div>
        )
      }
    }

    return (
      <p className='text-[15px] leading-relaxed whitespace-pre-wrap break-words [word-break:break-word] [overflow-wrap:anywhere]'>
        {displayContent}
      </p>
    )
  }

  if (message.type === 'system') {
    const isWarning = (message as any).isWarning

    return (
      <div id={`message-${message._id}`} className='flex flex-col w-full my-3'>
        {showTimeDivider && (
          <div className='flex justify-center mb-3'>
            <span className='px-3 py-1 bg-muted/60 text-muted-foreground text-[11px] rounded-full font-medium'>
              {dividerTimeStr}
            </span>
          </div>
        )}
        <div className='flex justify-center w-full animate-in fade-in zoom-in-95 duration-300'>
          <span
            className={`px-4 py-1.5 text-[12px] font-medium rounded-full shadow-sm text-center max-w-[85%] break-words ${
              isWarning ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-muted/60 text-muted-foreground'
            }`}
          >
            {message.content}
          </span>
        </div>
      </div>
    )
  }

  const getBubbleStyles = () => {
    if (isImage || isMedia) return 'bg-transparent'
    if (isMe) return 'bg-gradient-to-r from-[#6b45e9] to-[#a139e4] text-white rounded-tr-sm px-4 py-2.5 shadow-sm'
    return 'bg-background border border-border text-foreground rounded-tl-sm px-4 py-2.5 shadow-sm'
  }

  return (
    <div id={`message-${message._id}`} className='flex flex-col'>
      {showTimeDivider && (
        <div className='flex justify-center my-6'>
          <span className='px-3 py-1 bg-muted/60 text-muted-foreground text-[11px] rounded-full font-medium'>
            {dividerTimeStr}
          </span>
        </div>
      )}

      <div className={`flex gap-2 ${rowMarginClass} ${isMe ? 'justify-end' : 'justify-start'} group`}>
        {!isMe && (
          <div className='w-8 shrink-0'>
            {isFirstInGroup ? (
              <Avatar className='h-8 w-8 mt-1'>
                <AvatarImage src={message.sender?.avatar} alt={senderName} />
                <AvatarFallback className='text-xs font-semibold bg-blue-100 text-blue-600'>
                  {getInitials(senderName)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className='h-8 w-8' />
            )}
          </div>
        )}

        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>
          <div className='flex items-center gap-2 group/bubble relative'>
            <MessageActions
              message={message}
              isMe={isMe}
              currentUserId={currentUserId}
              onDeleteForMe={onDeleteForMe}
              decryptedContent={displayContent}
            />

            {isRevoked ? (
              <div
                className={`flex flex-col px-4 py-2.5 rounded-2xl border border-border/60 bg-muted/30 text-muted-foreground/80 ${isMe ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
              >
                <p className='text-[15px] italic select-none'>Tin nhắn đã được thu hồi</p>
              </div>
            ) : isCall ? (
              <CallMessage message={message} isMe={isMe} />
            ) : (
              <div className={`flex flex-col rounded-2xl relative ${getBubbleStyles()}`}>
                {!isMe && isFirstInGroup && !isImage && (
                  <span className='text-xs font-semibold text-muted-foreground mb-1'>{senderName}</span>
                )}

                {message.replyToMessage && (
                  <div
                    className={`mb-2 p-2 rounded-lg border-l-4 border-white/50 bg-black/10 flex flex-col text-sm cursor-pointer opacity-80 hover:opacity-100 transition`}
                    onClick={() => {
                      const el = document.getElementById(`message-${message.replyToMessage?._id}`)
                      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      el?.classList.add('bg-muted/50', 'transition-colors', 'duration-500')
                      setTimeout(() => el?.classList.remove('bg-muted/50'), 1500)
                    }}
                  >
                    <span className='font-semibold text-xs'>{message.replyToMessage.senderName}</span>
                    {/* ✅ FIX: Dùng getDecryptedReplyContent() thay vì render trực tiếp content */}
                    <span className='truncate text-xs opacity-90 max-w-[200px]'>{getDecryptedReplyContent()}</span>
                  </div>
                )}

                {renderMessageContent()}

                {hasReactions && (
                  <div
                    className={`absolute -bottom-3.5 ${isMe ? 'right-2' : 'left-2'} z-10 cursor-pointer drop-shadow-sm`}
                    onClick={() => setIsModalOpen(true)}
                  >
                    <ReactionBadge reactions={reactions} isMe={isMe} onClick={() => setIsModalOpen(true)} />
                  </div>
                )}

                {isLastInGroup && (
                  <div
                    className={`flex items-center mt-1 ${isImage ? (isMe ? 'self-end mr-1' : 'self-start ml-1') : isMe ? 'self-end text-white/80' : 'self-start text-muted-foreground'}`}
                  >
                    <span className='text-[10px]'>{displayTime}</span>
                    {/* ✅ Icon khóa cho tin nhắn E2E */}
                    {message.isE2E && (
                      <span className='ml-1 text-[9px] opacity-60' title='Tin nhắn đã mã hóa đầu cuối'>
                        🔒
                      </span>
                    )}
                    {renderMessageStatus()}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <ReactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} reactions={reactions} />
    </div>
  )
}
