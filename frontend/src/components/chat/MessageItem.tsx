import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { Message } from '@/types/message.type'
import { CallMessage } from './CallMessage'

interface MessageItemProps {
  message: Message
  isMe: boolean
  senderName: string
  displayTime: string
  showTimeDivider: boolean
  dividerTimeStr: string
  isFirstInGroup?: boolean
  isLastInGroup?: boolean
}

export function MessageItem({
  message,
  isMe,
  senderName,
  displayTime,
  showTimeDivider,
  dividerTimeStr,
  isFirstInGroup = true,
  isLastInGroup = true
}: MessageItemProps) {
  const getInitials = (name?: string) => {
    if (!name || name.trim() === '') return 'U'
    return name.trim().charAt(0).toUpperCase()
  }

  // Xác định xem đây có phải là tin nhắn hệ thống thông báo Cuộc gọi không
  const isCall = message.type === 'call'

  return (
    <div className='flex flex-col'>
      {showTimeDivider && (
        <div className='flex justify-center my-6'>
          <span className='px-3 py-1 bg-muted/60 text-muted-foreground text-[11px] rounded-full font-medium'>
            {dividerTimeStr}
          </span>
        </div>
      )}

      <div className={`flex gap-2 ${isLastInGroup ? 'mb-4' : 'mb-[2px]'} ${isMe ? 'justify-end' : 'justify-start'}`}>
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

        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[70%] group relative`}>
          {/* NẾU LÀ CUỘC GỌI -> RENDER THẺ GỌI | NẾU LÀ TEXT -> RENDER BONG BÓNG */}
          {isCall ? (
            <CallMessage message={message} isMe={isMe} />
          ) : (
            <div
              className={`px-4 py-2.5 rounded-2xl shadow-sm ${
                isMe
                  ? 'bg-gradient-to-r from-[#6b45e9] to-[#a139e4] text-white rounded-tr-sm'
                  : 'bg-background border border-border text-foreground rounded-tl-sm'
              }`}
            >
              <p className='text-[15px] leading-relaxed break-words whitespace-pre-wrap'>{message.content}</p>
            </div>
          )}

          {isLastInGroup && (
            <span
              className={`text-[11px] text-muted-foreground mt-1 px-1 transition-opacity opacity-70 group-hover:opacity-100 ${isMe ? 'text-right' : 'text-left'}`}
            >
              {displayTime}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
