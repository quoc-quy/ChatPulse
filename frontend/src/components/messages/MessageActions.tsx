import { ThumbsUp, X, MoreHorizontal, RotateCcw, Trash2 } from 'lucide-react'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { messagesApi } from '@/apis/messages.api'
import type { Message } from '@/types/message.type'

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡']

interface MessageActionsProps {
  message: Message
  isMe: boolean
  currentUserId: string
  onDeleteForMe?: (messageId: string) => void
}

export function MessageActions({ message, isMe, currentUserId, onDeleteForMe }: MessageActionsProps) {
  const isCall = message.type === 'call'
  const isRevoked = message.type === 'revoked'

  if (isCall) return null

  const reactions = message.reactions || []
  const hasReactions = reactions.length > 0 && !isRevoked

  const myReactions = reactions.filter((r) => r.userId === currentUserId)
  const hasMyReaction = myReactions.length > 0
  const myRecentEmoji = hasMyReaction ? myReactions[myReactions.length - 1].emoji : null

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

  const handleRevokeMessage = async () => {
    try {
      await messagesApi.revokeMessage(message._id)
    } catch (error) {
      console.error('Lỗi khi thu hồi tin nhắn:', error)
    }
  }

  return (
    <div
      className={`absolute top-1/2 -translate-y-1/2 ${isMe ? 'right-full mr-2 flex-row-reverse' : 'left-full ml-2 flex-row'} z-20 flex items-center gap-1`}
    >
      {/* KHỐI THẢ CẢM XÚC */}
      {!isRevoked && (
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
      )}

      {/* KHỐI NÚT 3 CHẤM */}
      <div className='opacity-0 group-hover/bubble:opacity-100 transition-opacity duration-200'>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className='flex items-center justify-center w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-sm hover:bg-muted text-muted-foreground transition-all outline-none'>
              <MoreHorizontal className='w-4 h-4' />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={isMe ? 'end' : 'start'} sideOffset={6} className='min-w-[170px]'>
            {isMe && !isRevoked && (
              <DropdownMenuItem
                onClick={handleRevokeMessage}
                className='text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer font-medium py-2'
              >
                <RotateCcw className='w-4 h-4 mr-2' />
                Thu hồi tin nhắn
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => onDeleteForMe && onDeleteForMe(message._id)}
              className='cursor-pointer font-medium py-2 text-muted-foreground focus:bg-muted'
            >
              <Trash2 className='w-4 h-4 mr-2' />
              Xóa ở phía tôi
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
