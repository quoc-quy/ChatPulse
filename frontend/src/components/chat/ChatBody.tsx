import { Avatar, AvatarFallback } from '@/components/ui/avatar'

// Mock data tin nhắn
const mockMessages = [
  { id: 1, text: 'Chào bạn, dự án ChatPulse đến đâu rồi?', senderId: 'friend_1', time: '09:00' },
  { id: 2, text: 'Mình đang làm phần frontend, chia component cho Chat Area.', senderId: 'me', time: '09:05' },
  { id: 3, text: 'Tuyệt vời, nhớ thiết kế theo tone màu chủ đạo nhé.', senderId: 'friend_1', time: '09:06' },
  {
    id: 4,
    text: 'Oke, mình đang dùng class Tailwind để tự động đổi màu theo Theme sáng/tối đây.',
    senderId: 'me',
    time: '09:10'
  }
]

export function ChatBody() {
  const currentUserId = 'me' // Sau này lấy từ profile._id trong AppContext

  return (
    <div className='flex-1 overflow-y-auto bg-muted/20 p-4'>
      <div className='flex flex-col gap-4'>
        {mockMessages.map((msg) => {
          const isMe = msg.senderId === currentUserId
          return (
            <div key={msg.id} className={`flex gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
              {!isMe && (
                <Avatar className='h-8 w-8 shrink-0 mt-1'>
                  <AvatarFallback className='text-xs'>FR</AvatarFallback>
                </Avatar>
              )}

              <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[70%]`}>
                <div
                  className={`px-4 py-2 rounded-2xl ${
                    isMe
                      ? 'bg-gradient-to-r from-[#6b45e9] to-[#a139e4] text-white rounded-tr-sm' // Tin nhắn của mình: Nền xanh chủ đạo
                      : 'bg-background border border-border text-foreground rounded-tl-sm' // Tin nhắn người khác: Nền xám/trắng
                  }`}
                >
                  <p className='text-sm leading-relaxed'>{msg.text}</p>
                </div>
                <span className='text-[11px] text-muted-foreground mt-1 px-1'>{msg.time}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
