import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { Message } from '@/types/message.type'
import { CallMessage } from '../chat/CallMessage'
import { AppContext } from '@/context/app.context'
import { useContext, useState } from 'react'
import { ReactionModal } from './ReactionModal'
import { ReactionBadge } from './ReactionBadge'
import { MessageActions } from './MessageActions'

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

  const isCall = message.type === 'call'
  const isRevoked = message.type === 'revoked'
  const reactions = message.reactions || []
  const hasReactions = reactions.length > 0 && !isRevoked

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
            {/* COMPONENT: Thanh công cụ xử lý tương tác */}
            <MessageActions message={message} isMe={isMe} currentUserId={currentUserId} onDeleteForMe={onDeleteForMe} />

            {/* BONG BÓNG TIN NHẮN */}
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
              <div
                className={`flex flex-col px-4 py-2.5 rounded-2xl shadow-sm ${isMe ? 'bg-gradient-to-r from-[#6b45e9] to-[#a139e4] text-white rounded-tr-sm' : 'bg-background border border-border text-foreground rounded-tl-sm'}`}
              >
                {!isMe && isFirstInGroup && (
                  <span className='text-xs font-semibold text-muted-foreground mb-1'>{senderName}</span>
                )}
                <p className='text-[15px] leading-relaxed break-words whitespace-pre-wrap'>{message.content}</p>
                {isLastInGroup && (
                  <span
                    className={`text-[10px] mt-1 opacity-70 ${isMe ? 'text-white/80 self-end' : 'text-muted-foreground self-start'}`}
                  >
                    {displayTime}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* COMPONENT: Hiển thị Thẻ cảm xúc */}
          {hasReactions && <ReactionBadge reactions={reactions} isMe={isMe} onClick={() => setIsModalOpen(true)} />}
        </div>
      </div>

      {/* COMPONENT: Modal xem ai thả cảm xúc */}
      <ReactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} reactions={reactions} />
    </div>
  )
}
