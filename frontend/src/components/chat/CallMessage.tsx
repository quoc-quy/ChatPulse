import { PhoneIncoming, PhoneOutgoing, PhoneMissed, PhoneOff, Video } from 'lucide-react'
import type { Message } from '@/types/message.type'

interface CallMessageProps {
  message: Message
  isMe: boolean // isMe: true nghĩa là người đang xem màn hình LÀ NGƯỜI GỌI
}

export function CallMessage({ message, isMe }: CallMessageProps) {
  const callInfo = message.callInfo
  if (!callInfo) return null

  const isVideo = callInfo.type === 'video'
  let text = ''
  let icon = null
  let subText = ''

  // Chuyển đổi giây thành Giờ, Phút, Giây
  const formatDuration = (seconds: number) => {
    if (!seconds) return '0 giây'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h} giờ ${m} phút`
    if (m > 0) return `${m} phút ${s} giây`
    return `${s} giây`
  }

  // Logic map text theo tài liệu mô tả Zalo của bạn
  switch (callInfo.status) {
    case 'completed': // Cuộc gọi hoàn tất
      text = isMe ? 'Cuộc gọi đi' : 'Cuộc gọi đến'
      icon = isMe ? (
        <PhoneOutgoing className='w-5 h-5 text-blue-500' />
      ) : (
        <PhoneIncoming className='w-5 h-5 text-green-500' />
      )
      if (isVideo) icon = <Video className={`w-5 h-5 ${isMe ? 'text-blue-500' : 'text-green-500'}`} />
      subText = formatDuration(callInfo.duration || 0)
      break

    case 'rejected': // Người nhận bấm từ chối
      text = isMe ? 'Người nhận từ chối' : 'Bạn đã hủy'
      icon = <PhoneOff className='w-5 h-5 text-red-500' />
      subText = isVideo ? 'Cuộc gọi Video' : 'Cuộc gọi thoại'
      break

    case 'cancelled': // Người gọi tự hủy trước khi bắt máy
      text = isMe ? 'Bạn đã hủy' : 'Bạn bị nhỡ'
      icon = isMe ? (
        <PhoneOff className='w-5 h-5 text-muted-foreground' />
      ) : (
        <PhoneMissed className='w-5 h-5 text-red-500' />
      )
      subText = isVideo ? 'Cuộc gọi Video' : 'Cuộc gọi thoại'
      break

    case 'missed': // Nhỡ do không trả lời
      text = isMe ? 'Người nhận bận' : 'Bạn bị nhỡ'
      icon = <PhoneMissed className='w-5 h-5 text-red-500' />
      subText = isVideo ? 'Cuộc gọi Video' : 'Cuộc gọi thoại'
      break

    default:
      text = 'Cuộc gọi'
  }

  return (
    <div
      className={`flex items-center gap-3 p-3.5 rounded-2xl border w-64 shadow-sm ${
        isMe
          ? 'bg-primary/5 border-primary/20 rounded-tr-sm' // Nền nhạt cho người gửi
          : 'bg-background border-border rounded-tl-sm' // Nền mặc định cho người nhận
      }`}
    >
      <div className={`p-3 rounded-full flex-shrink-0 ${isMe ? 'bg-primary/10' : 'bg-muted'}`}>{icon}</div>
      <div className='flex flex-col overflow-hidden'>
        <span className='font-semibold text-[15px] text-foreground truncate'>{text}</span>
        <span className='text-[12px] text-muted-foreground truncate mt-0.5'>{subText}</span>
      </div>
    </div>
  )
}
