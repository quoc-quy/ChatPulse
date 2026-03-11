import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { Message } from '@/types/message.type'
import { CallMessage } from './CallMessage'
import { messagesApi } from '@/apis/messages.api'
import { AppContext } from '@/context/app.context'
import { useContext, useState } from 'react'
import { ThumbsUp, X, MoreHorizontal, RotateCcw } from 'lucide-react'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'

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
  const isRevoked = message.type === 'revoked'

  const handleReact = async (emoji: string) => {
    try {
      await messagesApi.reactMessage(message._id, emoji)
    } catch (error) {
      console.error('Lỗi khi thả cảm xúc:', error)
    }
  }

  const handleRevokeAll = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await messagesApi.reactMessage(message._id, 'REMOVE_ALL')
    } catch (error) {
      console.error('Lỗi khi thu hồi cảm xúc:', error)
    }
  }

  // GỌI API THU HỒI TIN NHẮN
  const handleRevokeMessage = async () => {
    try {
      await messagesApi.revokeMessage(message._id)
    } catch (error) {
      console.error('Lỗi khi thu hồi tin nhắn:', error)
    }
  }

  const reactions = message.reactions || []
  const hasReactions = reactions.length > 0 && !isRevoked

  const myReactions = reactions.filter((r) => r.userId === currentUserId)
  const hasMyReaction = myReactions.length > 0
  const myRecentEmoji = hasMyReaction ? myReactions[myReactions.length - 1].emoji : null

  const reactionCounts = reactions.reduce((acc: Record<string, number>, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1
    return acc
  }, {})

  const usersToShow = activeTab === 'ALL' ? reactions : reactions.filter((r) => r.emoji === activeTab)

  const groupedReactions = Object.values(
    usersToShow.reduce((acc: Record<string, any>, reaction) => {
      if (!acc[reaction.userId]) {
        acc[reaction.userId] = { userId: reaction.userId, user: reaction.user, emojis: [] }
      }
      acc[reaction.userId].emojis.push(reaction.emoji)
      return acc
    }, {})
  )

  let rowMarginClass = 'mb-[2px]'
  if (isLastInGroup) {
    rowMarginClass = hasReactions ? 'mb-8' : 'mb-4'
  } else {
    rowMarginClass = hasReactions ? 'mb-5' : 'mb-[2px]'
  }

  // KHỐI RENDER ACTIONS: Gồm Nút Like và Menu 3 chấm
  const renderMessageActions = () => {
    if (isRevoked || isCall) return null // Tin đã thu hồi hoặc Cuộc gọi thì ko hiển thị Menu

    return (
      <div
        className={`absolute top-1/2 -translate-y-1/2 ${isMe ? 'right-full mr-2 flex-row-reverse' : 'left-full ml-2 flex-row'} z-20 flex items-center gap-1`}
      >
        {/* NÚT THẢ CẢM XÚC */}
        <div
          className={`relative group/picker transition-opacity duration-200 ${hasReactions ? 'opacity-100' : 'opacity-0 group-hover/bubble:opacity-100'}`}
        >
          <button className='flex items-center justify-center w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-sm hover:bg-muted text-muted-foreground transition-all z-20'>
            {myRecentEmoji ? (
              <span className='text-[14px]'>{myRecentEmoji}</span>
            ) : (
              <ThumbsUp className='w-3.5 h-3.5' />
            )}
          </button>

          <div
            className={`absolute bottom-full ${isMe ? 'right-0' : 'left-0'} pb-3 hidden group-hover/picker:block z-50`}
          >
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

        {/* NÚT 3 CHẤM (MENU THU HỒI) - Chỉ hiện khi hover và là tin nhắn của mình */}
        {isMe && (
          <div className='opacity-0 group-hover/bubble:opacity-100 transition-opacity duration-200'>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className='flex items-center justify-center w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-sm hover:bg-muted text-muted-foreground transition-all outline-none'>
                  <MoreHorizontal className='w-4 h-4' />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isMe ? 'end' : 'start'} sideOffset={6} className='min-w-[150px]'>
                <DropdownMenuItem
                  onClick={handleRevokeMessage}
                  className='text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer font-medium py-2'
                >
                  <RotateCcw className='w-4 h-4 mr-2' />
                  Thu hồi tin nhắn
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    )
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
            {/* Thanh công cụ 3 chấm và Reaction */}
            {renderMessageActions()}

            {/* NỘI DUNG TIN NHẮN */}
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

          {/* HIỂN THỊ KẾT QUẢ CẢM XÚC */}
          {hasReactions && (
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
        </div>
      </div>

      {/* MODAL (Giữ nguyên như cũ) */}
      {isModalOpen && (
        <div
          className='fixed inset-0 z-[9999] bg-black/50 text-foreground flex items-center justify-center'
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className='bg-background w-full max-w-md rounded-xl shadow-2xl flex overflow-hidden max-h-[60vh]'
            onClick={(e) => e.stopPropagation()}
          >
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
                      <span className='font-medium text-foreground text-sm'>
                        {group.user?.userName || 'Người dùng'}
                      </span>
                    </div>
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
