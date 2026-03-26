import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { Message } from '@/types/message.type'
import { CallMessage } from '../chat/CallMessage'
import { AppContext } from '@/context/app.context'
import { useContext, useState } from 'react'
import { ReactionModal } from './ReactionModal'
import { ReactionBadge } from './ReactionBadge'
import { MessageActions } from './MessageActions'
import { Check, CheckCheck, Clock, AlertCircle, File as FileIcon, Download, X } from 'lucide-react'

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
  const [isImageModalOpen, setIsImageModalOpen] = useState(false) // State cho Modal phóng to ảnh

  const isCall = message.type === 'call'
  const isRevoked = message.type === 'revoked'
  const reactions = message.reactions || []
  const hasReactions = reactions.length > 0 && !isRevoked

  // Phân tích loại Media
  const isMedia = message.type === 'media'
  const ext = isMedia ? message.content.split('.').pop()?.toLowerCase() : ''
  const isImage =
    isMedia &&
    (['jpg', 'jpeg', 'png', 'gif', 'webp', 'blob'].includes(ext || '') || message.content.startsWith('blob:'))
  const isVideo = isMedia && ['mp4', 'webm', 'ogg'].includes(ext || '')
  const isAudio = isMedia && ['mp3', 'wav', 'm4a', 'ogg'].includes(ext || '')
  const isFile = isMedia && !isImage && !isVideo && !isAudio

  let rowMarginClass = 'mb-[2px]'
  if (isLastInGroup) {
    rowMarginClass = hasReactions ? 'mb-8' : 'mb-4'
  } else {
    rowMarginClass = hasReactions ? 'mb-5' : 'mb-[2px]'
  }

  const getInitials = (name?: string) => {
    if (!name || name.trim() === '') return 'U'
    return name.trim().charAt(0).toUpperCase()
  }

  // Render trạng thái tin nhắn
  const renderMessageStatus = () => {
    if (!isMe || isCall || isRevoked) return null
    const status = message.status || 'SENT'

    return (
      <div className='flex items-center ml-1 opacity-70'>
        {status === 'SENDING' && <Clock className='w-[10px] h-[10px]' />}
        {status === 'SENT' && <Check className='w-[14px] h-[14px]' />}
        {status === 'DELIVERED' && <CheckCheck className='w-[14px] h-[14px] text-gray-400' />}
        {status === 'SEEN' && <CheckCheck className='w-[14px] h-[14px] text-blue-400' />}
        {status === 'FAILED' && <AlertCircle className='w-[12px] h-[12px] text-red-500' title='Gửi thất bại' />}
      </div>
    )
  }

  // Render nội dung tin nhắn đa phương tiện hoặc text
  const renderMessageContent = () => {
    if (isMedia) {
      if (isImage) {
        return (
          <>
            <img
              src={message.content}
              alt='media'
              onClick={() => setIsImageModalOpen(true)}
              className='max-w-[260px] max-h-[320px] object-cover rounded-xl cursor-pointer hover:opacity-90 transition shadow-sm border border-border/20'
            />
            {/* Modal Phóng To Ảnh */}
            {isImageModalOpen && (
              <div
                className='fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm'
                onClick={() => setIsImageModalOpen(false)}
              >
                <div className='relative max-w-[90vw] max-h-[90vh] animate-in fade-in zoom-in-95 duration-200'>
                  <button
                    className='absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors bg-white/10 rounded-full'
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsImageModalOpen(false)
                    }}
                  >
                    <X className='w-6 h-6' />
                  </button>
                  <img
                    src={message.content}
                    alt='Zoomed media'
                    className='max-w-full max-h-[85vh] object-contain rounded-md'
                  />
                </div>
              </div>
            )}
          </>
        )
      } else if (isVideo) {
        return (
          <video src={message.content} controls className='max-w-[260px] max-h-[320px] rounded-xl bg-black shadow-sm' />
        )
      } else if (isAudio) {
        return <audio src={message.content} controls className='max-w-[240px]' />
      } else if (isFile) {
        // Giao diện File giống Zalo
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
              {/* Do DB hiện tại không lưu size, tạm để text Đính kèm */}
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

    return <p className='text-[15px] leading-relaxed break-words whitespace-pre-wrap'>{message.content}</p>
  }

  if (message.type === 'system') {
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
          <span className='px-4 py-1.5 bg-muted/60 text-muted-foreground text-[12px] font-medium rounded-full shadow-sm text-center max-w-[85%] break-words'>
            {message.content}
          </span>
        </div>
      </div>
    )
  }

  // Logic css background cho bong bóng chat (Nếu là ảnh thì xoá background/padding)
  const getBubbleStyles = () => {
    if (isImage || isMedia) return 'bg-transparent' // Không dùng nền nếu là ảnh
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
            <MessageActions message={message} isMe={isMe} currentUserId={currentUserId} onDeleteForMe={onDeleteForMe} />

            {isRevoked ? (
              <div
                className={`flex flex-col px-4 py-2.5 rounded-2xl border border-border/60 bg-muted/30 text-muted-foreground/80 ${isMe ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
              >
                <p className='text-[15px] italic select-none'>Tin nhắn đã được thu hồi</p>
                {isLastInGroup && (
                  <span className={`text-[10px] mt-1 opacity-60 ${isMe ? 'self-end' : 'self-start'}`}>
                    {displayTime}
                  </span>
                )}
              </div>
            ) : isCall ? (
              <CallMessage message={message} isMe={isMe} />
            ) : (
              <div className={`flex flex-col rounded-2xl ${getBubbleStyles()}`}>
                {!isMe && isFirstInGroup && !isImage && (
                  <span className='text-xs font-semibold text-muted-foreground mb-1'>{senderName}</span>
                )}

                {renderMessageContent()}

                {/* THỜI GIAN KÈM TRẠNG THÁI */}
                {isLastInGroup && (
                  <div
                    className={`flex items-center mt-1 ${
                      isImage
                        ? isMe
                          ? 'self-end text-muted-foreground mr-1'
                          : 'self-start text-muted-foreground ml-1'
                        : isMe
                          ? 'self-end text-white/80'
                          : 'self-start text-muted-foreground'
                    }`}
                  >
                    <span className='text-[10px]'>{displayTime}</span>
                    {renderMessageStatus()}
                  </div>
                )}
              </div>
            )}
          </div>

          {hasReactions && <ReactionBadge reactions={reactions} isMe={isMe} onClick={() => setIsModalOpen(true)} />}
        </div>
      </div>

      <ReactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} reactions={reactions} />
    </div>
  )
}
