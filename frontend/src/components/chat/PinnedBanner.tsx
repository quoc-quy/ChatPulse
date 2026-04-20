/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { Pin, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { LeaveGroupModal } from './info-panel/LeaveGroupModal'

interface PinnedBannerProps {
  pinnedMessages: any[]
  onUnpin: (messageId: string) => void
  onJumpToMessage: (messageId: string) => void
}

export default function PinnedBanner({ pinnedMessages, onUnpin, onJumpToMessage }: PinnedBannerProps) {
  const [expanded, setExpanded] = useState(false)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [selectedMsgId, setSelectedMsgId] = useState<string | null>(null)

  if (!pinnedMessages || pinnedMessages.length === 0) return null

  // Khi chưa xổ xuống (collapsed), lấy tin nhắn mới nhất
  const latestPin = pinnedMessages[pinnedMessages.length - 1]
  const displayList = expanded ? pinnedMessages : [latestPin]

  const renderPreview = (msg: any) => {
    if (msg.type === 'media') return '[Hình ảnh/Video]'
    if (msg.type === 'file') return '[Tập tin]'
    return msg.content
  }

  const handleOpenConfirm = (e: React.MouseEvent, messageId: string) => {
    e.stopPropagation() // Ngăn việc nhảy đến tin nhắn khi nhấn nút xóa
    setSelectedMsgId(messageId)
    setIsConfirmModalOpen(true)
  }

  const handleConfirmUnpin = () => {
    if (selectedMsgId) {
      onUnpin(selectedMsgId)
      setIsConfirmModalOpen(false)
      setSelectedMsgId(null)
    }
  }

  return (
    <>
      <div className='bg-background border-b border-border px-4 py-2 flex flex-col gap-1 shadow-sm transition-all z-10 relative'>
        <div className='flex items-start gap-3 w-full'>
          <div className='mt-1 flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'>
            <Pin className='w-3.5 h-3.5' />
          </div>

          <div className='flex-1 overflow-hidden'>
            {displayList.map((pin) => (
              <div
                key={pin.messageId}
                className='flex items-center justify-between group cursor-pointer p-1 hover:bg-muted rounded-sm'
                onClick={() => onJumpToMessage(pin.messageId)}
              >
                <div className='flex flex-col truncate pr-2'>
                  <span className='text-sm font-semibold text-foreground flex items-center gap-2'>
                    Tin nhắn ghim
                    {!expanded && pinnedMessages.length > 1 && (
                      <span className='text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground font-normal'>
                        {pinnedMessages.length} tin nhắn
                      </span>
                    )}
                  </span>
                  <span className='text-xs text-muted-foreground truncate'>
                    {pin.message.senderName}: {renderPreview(pin.message)}
                  </span>
                </div>

                <button
                  onClick={(e) => handleOpenConfirm(e, pin.messageId)}
                  className='opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-all'
                  title='Bỏ ghim'
                >
                  <Trash2 className='w-4 h-4' />
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

      {/* Tận dụng LeaveGroupModal để xác nhận bỏ ghim */}
      <LeaveGroupModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title='Bỏ ghim tin nhắn?'
        description='Bạn có chắc chắn muốn bỏ ghim tin nhắn này không? Hành động này sẽ áp dụng với tất cả thành viên.'
        confirmText='Bỏ ghim'
        onConfirm={handleConfirmUnpin}
        mode='unfriend' // Dùng mode unfriend để giao diện đơn giản (không có logic chuyển admin)
      />
    </>
  )
}
