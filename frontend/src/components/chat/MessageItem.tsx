import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { Message } from '@/types/message.type'
import { CallMessage } from './CallMessage'
import { messagesApi } from '@/apis/messages.api'
import { AppContext } from '@/context/app.context'
import { useContext, useState } from 'react'
import { ThumbsUp, X } from 'lucide-react'

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
  const { profile } = useContext(AppContext)
  const currentUserId = profile?._id || ''

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('ALL')

  const getInitials = (name?: string) => {
    if (!name || name.trim() === '') return 'U'
    return name.trim().charAt(0).toUpperCase()
  }

  const isCall = message.type === 'call'

  // Gọi API thả cảm xúc
  const handleReact = async (emoji: string) => {
    try {
      await messagesApi.reactMessage(message._id, emoji)
    } catch (error) {
      console.error('Lỗi khi thả cảm xúc:', error)
    }
  }

  // Gọi API thu hồi tất cả cảm xúc
  const handleRevokeAll = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await messagesApi.reactMessage(message._id, 'REMOVE_ALL')
    } catch (error) {
      console.error('Lỗi khi thu hồi cảm xúc:', error)
    }
  }

  // Phân tích dữ liệu reactions cơ bản
  const reactions = message.reactions || []
  const hasReactions = reactions.length > 0

  const myReactions = reactions.filter((r) => r.userId === currentUserId)
  const hasMyReaction = myReactions.length > 0
  const myRecentEmoji = hasMyReaction ? myReactions[myReactions.length - 1].emoji : null

  // Đếm tổng hợp các loại Emoji cho Sidebar của Modal
  const reactionCounts = reactions.reduce((acc: Record<string, number>, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1
    return acc
  }, {})

  // Lọc list reaction theo Tab đang chọn
  const usersToShow = activeTab === 'ALL' ? reactions : reactions.filter((r) => r.emoji === activeTab)

  // LOGIC MỚI: Gom nhóm (Group by) các emoji theo userId để hiển thị trên 1 hàng
  const groupedReactions = Object.values(
    usersToShow.reduce((acc: Record<string, any>, reaction) => {
      // Nếu user này chưa có trong object tích lũy, tạo mới
      if (!acc[reaction.userId]) {
        acc[reaction.userId] = {
          userId: reaction.userId,
          user: reaction.user,
          emojis: []
        }
      }
      // Đẩy emoji vào mảng của user đó
      acc[reaction.userId].emojis.push(reaction.emoji)
      return acc
    }, {})
  )

  // Khoảng cách động cho Row
  let rowMarginClass = 'mb-[2px]'
  if (isLastInGroup) {
    rowMarginClass = hasReactions ? 'mb-8' : 'mb-4'
  } else {
    rowMarginClass = hasReactions ? 'mb-5' : 'mb-[2px]'
  }

  // Render Nút Like + Bảng Emoji
  const renderLikeButton = () => (
    <div
      className={`relative group/picker transition-opacity duration-200 ${hasReactions ? 'opacity-100' : 'opacity-0 group-hover/bubble:opacity-100'}`}
    >
      <button className='flex items-center justify-center w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-sm hover:bg-muted text-muted-foreground transition-all z-20'>
        {myRecentEmoji ? <span className='text-[14px]'>{myRecentEmoji}</span> : <ThumbsUp className='w-3.5 h-3.5' />}
      </button>

      <div className={`absolute bottom-full ${isMe ? 'right-0' : 'left-0'} pb-3 hidden group-hover/picker:block z-50`}>
        <div className='flex items-center w-max bg-background border border-border shadow-xl rounded-full px-2 py-1.5 gap-1.5 animate-in slide-in-from-bottom-2 fade-in'>
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleReact(emoji)}
              className='text-xl hover:scale-125 hover:-translate-y-1 transition-all duration-200 px-1'
            >
              {emoji}
            </button>
          ))}
          {hasMyReaction && (
            <>
              <div className='w-[1px] h-5 bg-border mx-1'></div>
              <button
                onClick={handleRevokeAll}
                title='Thu hồi cảm xúc'
                className='p-1 rounded-full hover:bg-destructive/10 text-destructive transition-colors'
              >
                <X className='w-4 h-4' />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )

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
          <div className='flex items-center gap-2 group/bubble'>
            {isMe && !isCall && renderLikeButton()}

            {isCall ? (
              <CallMessage message={message} isMe={isMe} />
            ) : (
              <div
                className={`px-4 py-2.5 rounded-2xl shadow-sm ${isMe ? 'bg-gradient-to-r from-[#6b45e9] to-[#a139e4] text-white rounded-tr-sm' : 'bg-background border border-border text-foreground rounded-tl-sm'}`}
              >
                <p className='text-[15px] leading-relaxed break-words whitespace-pre-wrap'>{message.content}</p>
              </div>
            )}

            {!isMe && !isCall && renderLikeButton()}
          </div>

          {hasReactions && !isCall && (
            <div
              onClick={() => setIsModalOpen(true)}
              className={`relative z-10 flex items-center gap-1 bg-background border border-border shadow-sm rounded-full px-1.5 py-0.5 cursor-pointer hover:bg-muted transition-colors -mt-3 ${isMe ? 'mr-4' : 'ml-4'}`}
            >
              <div className='flex -space-x-1'>
                {Object.keys(reactionCounts)
                  .slice(0, 3)
                  .map((emoji) => (
                    <span key={emoji} className='text-[12px] bg-background rounded-full border border-background'>
                      {emoji}
                    </span>
                  ))}
              </div>
              <span className='text-[11px] text-muted-foreground font-medium ml-0.5'>{reactions.length}</span>
            </div>
          )}

          {isLastInGroup && (
            <span
              className={`text-[11px] text-muted-foreground px-1 transition-opacity opacity-70 group-hover:opacity-100 ${isMe ? 'text-right' : 'text-left'} ${hasReactions ? 'mt-1' : 'mt-1'}`}
            >
              {displayTime}
            </span>
          )}
        </div>
      </div>

      {/* MODAL CHI TIẾT REACTION */}
      {isModalOpen && (
        <div
          className='fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center'
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className='bg-background w-full max-w-md rounded-xl shadow-2xl flex overflow-hidden max-h-[60vh]'
            onClick={(e) => e.stopPropagation()}
          >
            {/* CỘT 1: Danh sách Emoji tổng hợp */}
            <div className='w-1/3 bg-muted/30 border-r border-border p-2 flex flex-col gap-1 overflow-y-auto'>
              <button
                onClick={() => setActiveTab('ALL')}
                className={`flex justify-between items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'ALL' ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'}`}
              >
                <span>Tất cả</span>
                <span>{reactions.length}</span>
              </button>
              {Object.entries(reactionCounts).map(([emoji, count]) => (
                <button
                  key={emoji}
                  onClick={() => setActiveTab(emoji)}
                  className={`flex justify-between items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === emoji ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'}`}
                >
                  <span className='text-lg'>{emoji}</span>
                  <span>{count as React.ReactNode}</span>
                </button>
              ))}
            </div>

            {/* CỘT 2: Cập nhật render theo Mảng đã gom nhóm (Grouped Reactions) */}
            <div className='w-2/3 p-4 overflow-y-auto'>
              <div className='flex justify-between items-center mb-4'>
                <h3 className='font-semibold text-foreground'>Biểu tượng cảm xúc</h3>
                <button onClick={() => setIsModalOpen(false)} className='p-1 rounded-full hover:bg-muted'>
                  <X className='w-5 h-5' />
                </button>
              </div>
              <div className='flex flex-col gap-4'>
                {groupedReactions.map((group) => (
                  <div key={group.userId} className='flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                      <Avatar className='w-10 h-10 border border-border'>
                        <AvatarImage src={group.user?.avatar} />
                        <AvatarFallback>{getInitials(group.user?.userName || 'U')}</AvatarFallback>
                      </Avatar>
                      <span className='font-medium text-sm'>{group.user?.userName || 'Người dùng'}</span>
                    </div>
                    {/* Render toàn bộ emoji của user này trên cùng 1 hàng */}
                    <div className='flex items-center gap-1'>
                      {group.emojis.map((emj: string, idx: number) => (
                        <span key={idx} className='text-xl'>
                          {emj}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
