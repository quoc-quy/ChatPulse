import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

// Định nghĩa kiểu dữ liệu cho props để TypeScript không báo lỗi
interface ChatAvatarProps {
  chat: any
  currentUserId: string
}

export function ChatAvatar({ chat, currentUserId }: ChatAvatarProps) {
  const getInitials = (name: string) => (name ? name.charAt(0).toUpperCase() : 'U')

  if (chat.type === 'direct' || chat.avatarUrl) {
    let displayAvatar = chat.avatarUrl
    let displayName = chat.name

    if (chat.type === 'direct' && !chat.avatarUrl) {
      const otherUser = chat.participants?.find((p: any) => p._id !== currentUserId)
      if (otherUser) {
        displayAvatar = otherUser.avatar
        displayName = otherUser.userName || otherUser.fullName || chat.name
      }
    }

    return (
      <Avatar className='h-12 w-12 shrink-0 rounded-full border border-sidebar-border/40'>
        <AvatarImage src={displayAvatar} className='object-cover' />
        <AvatarFallback className='bg-blue-100 text-blue-600 font-bold text-lg'>
          {getInitials(displayName)}
        </AvatarFallback>
      </Avatar>
    )
  }

  const sortedParticipants = [...(chat.participants || [])].sort((a: any, b: any) => {
    if (a._id === chat.admin_id) return -1
    if (b._id === chat.admin_id) return 1
    return 0
  })

  const count = sortedParticipants.length

  if (count <= 2) {
    return (
      <Avatar className='h-12 w-12 shrink-0 rounded-full border border-sidebar-border/40'>
        <AvatarFallback className='bg-blue-100 text-blue-600 font-bold text-lg'>
          {getInitials(chat.name)}
        </AvatarFallback>
      </Avatar>
    )
  }

  const renderMiniAvatar = (user: any, className: string) => (
    <Avatar key={user._id} className={`absolute shrink-0 rounded-full border-2 border-background ${className}`}>
      <AvatarImage src={user.avatar} className='object-cover' />
      <AvatarFallback className='bg-blue-100 text-blue-600 text-[10px] font-semibold'>
        {getInitials(user.userName || user.fullName)}
      </AvatarFallback>
    </Avatar>
  )

  if (count === 3) {
    return (
      <div className='relative h-12 w-12 shrink-0'>
        {renderMiniAvatar(sortedParticipants[0], 'top-0 left-0 h-7 w-7 z-30')}
        {renderMiniAvatar(sortedParticipants[1], 'bottom-0 left-1 h-6 w-6 z-20')}
        {renderMiniAvatar(sortedParticipants[2], 'top-1/2 -translate-y-1/2 right-0 h-7 w-7 z-10')}
      </div>
    )
  }

  const showCount = count >= 5
  const displayCountText = count > 99 ? '99+' : count.toString()

  return (
    <div className='relative h-12 w-12 shrink-0'>
      {renderMiniAvatar(sortedParticipants[0], 'top-0 left-0 h-6 w-6 z-30')}
      {renderMiniAvatar(sortedParticipants[1], 'top-0 right-0 h-6 w-6 z-20')}
      {renderMiniAvatar(sortedParticipants[2], 'bottom-0 left-0 h-6 w-6 z-20')}

      {showCount ? (
        <div className='absolute bottom-0 right-0 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted'>
          <span className='text-[9px] font-bold text-muted-foreground'>{displayCountText}</span>
        </div>
      ) : (
        renderMiniAvatar(sortedParticipants[3], 'bottom-0 right-0 h-6 w-6 z-10')
      )}
    </div>
  )
}
