import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { Message } from '@/types/message.type'
import { CallMessage } from './CallMessage'
import { messagesApi } from '@/apis/messages.api'

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

// Danh sách các cảm xúc mặc định
const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡']

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

  // Xử lý gọi API thả/hủy cảm xúc
  const handleReact = async (emoji: string) => {
    try {
      await messagesApi.reactMessage(message._id, emoji)
    } catch (error) {
      console.error('Lỗi khi thả cảm xúc:', error)
    }
  }

  // Nhóm các emoji giống nhau để hiển thị (VD: 2 ❤️, 1 👍)
  const reactionCounts = message.reactions?.reduce((acc: any, reaction) => {
    acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1
    return acc
  }, {})

  return (
    <div id={`message-${message._id}`} className='flex flex-col group'>
      {showTimeDivider && (
        <div className='flex justify-center my-6'>
          <span className='px-3 py-1 bg-muted/60 text-muted-foreground text-[11px] rounded-full font-medium'>
            {dividerTimeStr}
          </span>
        </div>
      )}

      {/* THÊM relative VÀ group ĐỂ XỬ LÝ HOVER */}
      <div
        className={`flex gap-2 ${isLastInGroup ? 'mb-4' : 'mb-[2px]'} ${isMe ? 'justify-end' : 'justify-start'} relative`}
      >
        {/* THANH CHỌN CẢM XÚC: Ẩn mặc định, chỉ hiện khi hover chuột vào dòng tin nhắn */}
        {!isCall && (
          <div
            className={`hidden group-hover:flex absolute -top-10 ${isMe ? 'right-0' : 'left-8'} z-20 bg-background border border-border shadow-lg rounded-full px-2 py-1 items-center gap-1 transition-all`}
          >
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                className='hover:scale-125 hover:-translate-y-1 transition-all duration-200 text-lg p-1'
                title='Thả cảm xúc'
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

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

        {/* THÊM relative CHO BONG BÓNG TIN NHẮN */}
        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[70%] relative`}>
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

          {/* HIỂN THỊ KẾT QUẢ CẢM XÚC (Nếu có người thả) */}
          {message.reactions && message.reactions.length > 0 && !isCall && (
            <div
              className={`absolute -bottom-3 ${isMe ? 'right-2' : 'left-2'} flex items-center gap-1 bg-background border border-border shadow-sm rounded-full px-1.5 py-0.5 text-xs z-10 cursor-pointer`}
            >
              <div className='flex -space-x-1'>
                {Object.keys(reactionCounts || {}).map((emoji) => (
                  <span key={emoji} className='text-[12px]'>
                    {emoji}
                  </span>
                ))}
              </div>
              <span className='text-[10px] text-muted-foreground font-medium ml-0.5'>{message.reactions.length}</span>
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
