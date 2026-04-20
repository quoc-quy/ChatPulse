/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { Pin, ChevronDown, ChevronUp, MoreVertical } from 'lucide-react'

interface PinnedBannerProps {
  pinnedMessages: any[]
  onUnpin: (messageId: string) => void
  onJumpToMessage: (messageId: string) => void
}

export default function PinnedBanner({ pinnedMessages, onUnpin, onJumpToMessage }: PinnedBannerProps) {
  const [expanded, setExpanded] = useState(false)

  if (!pinnedMessages || pinnedMessages.length === 0) return null

  const displayList = expanded ? pinnedMessages : [pinnedMessages[pinnedMessages.length - 1]] // Hiển thị tin mới nhất nếu thu gọn

  const renderPreview = (msg: any) => {
    if (msg.type === 'media') return '[Hình ảnh/Video]'
    if (msg.type === 'file') return '[Tập tin]'
    return msg.content
  }

  return (
    <div className='bg-background border-b border-border px-4 py-2 flex flex-col gap-1 shadow-sm transition-all z-10 relative'>
      <div className='flex items-start gap-3 w-full'>
        <div className='mt-1 flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'>
          <Pin className='w-3.5 h-3.5' />
        </div>

        <div className='flex-1 overflow-hidden'>
          {displayList.map((pin) => (
            <div
              key={pin.messageId}
              className='flex items-center justify-between group cursor-pointer py-1'
              onClick={() => onJumpToMessage(pin.messageId)}
            >
              <div className='flex flex-col truncate pr-2'>
                <span className='text-sm font-semibold text-foreground'>Tin nhắn ghim</span>
                <span className='text-xs text-muted-foreground truncate'>
                  {pin.message.senderName}: {renderPreview(pin.message)}
                </span>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onUnpin(pin.messageId)
                }}
                className='opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:bg-muted rounded transition-opacity'
                title='Bỏ ghim'
              >
                <MoreVertical className='w-4 h-4' />
              </button>
            </div>
          ))}
        </div>

        {pinnedMessages.length > 1 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className='p-1.5 hover:bg-muted rounded-full text-muted-foreground transition-colors'
          >
            {expanded ? <ChevronUp className='w-4 h-4' /> : <ChevronDown className='w-4 h-4' />}
          </button>
        )}
      </div>
    </div>
  )
}
