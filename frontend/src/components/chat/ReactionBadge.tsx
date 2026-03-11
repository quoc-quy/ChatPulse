import type { Reaction } from '@/types/message.type'
import { useMemo } from 'react'

interface ReactionBadgeProps {
  reactions: Reaction[]
  isMe: boolean
  onClick: () => void
}

export function ReactionBadge({ reactions, isMe, onClick }: ReactionBadgeProps) {
  if (!reactions || reactions.length === 0) return null

  // Chỉ lấy top 3 emoji khác nhau để hiển thị trên icon nhỏ
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const topEmojis = useMemo(() => {
    const counts = reactions.reduce((acc: Record<string, number>, r) => {
      acc[r.emoji] = (acc[r.emoji] || 0) + 1
      return acc
    }, {})
    return Object.keys(counts).slice(0, 3)
  }, [reactions])

  return (
    <div
      onClick={onClick}
      className={`relative z-10 flex items-center gap-1 bg-background border border-border shadow-sm rounded-full px-1.5 py-0.5 cursor-pointer hover:bg-muted transition-colors -mt-3 ${isMe ? 'mr-4' : 'ml-4'}`}
    >
      <div className='flex -space-x-1'>
        {topEmojis.map((emoji) => (
          <span key={emoji} className='text-[12px] bg-background rounded-full border border-background'>
            {emoji}
          </span>
        ))}
      </div>
      <span className='text-[11px] text-muted-foreground font-medium ml-0.5'>{reactions.length}</span>
    </div>
  )
}
