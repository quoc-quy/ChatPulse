import * as React from 'react'
import { Loader2, UserPlus } from 'lucide-react'
import { Sidebar, SidebarHeader, SidebarInput, SidebarContent } from '@/components/ui/sidebar'
import { ChatAvatar } from '../chat-avatar'
import PhoneBook from '../phonebook/PhoneBook'
import { conversationsApi } from '@/apis/conversations.api'
import { useNavigate, useLocation } from 'react-router-dom'
import { useSidebar } from '@/components/ui/sidebar'
import AddFriendModal from '@/pages/AddFriendModal'

interface SidebarPanel2Props {
  activeItem: any
  isLoading: boolean
  chatList: any[]
  activeChat: any
  setActiveChat: (chat: any) => void
  setChatList: React.Dispatch<React.SetStateAction<any[]>>
  profileId: string
}

export function SidebarPanel2({
  activeItem,
  isLoading,
  chatList,
  activeChat,
  setActiveChat,
  setChatList,
  profileId
}: SidebarPanel2Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = React.useState(false)
  const { setOpenMobile, isMobile } = useSidebar()

  const handleChatSelect = async (chatId: string) => {
    const targetChat = chatList.find((c) => String(c.id) === String(chatId))
    if (!targetChat) return

    let displayAvatar = targetChat.avatarUrl
    let actualIsOnline = targetChat.isOnline
    let actualLastActiveAt = targetChat.lastActiveAt

    if (targetChat.type === 'direct') {
      const otherUser = targetChat.participants?.find((p: any) => String(p._id) !== String(profileId))
      if (otherUser) {
        displayAvatar = displayAvatar || otherUser.avatar
        actualIsOnline = otherUser.isOnline === true
        actualLastActiveAt = otherUser.last_active_at || otherUser.lastActiveAt
      }
    }

    setActiveChat({
      id: targetChat.id,
      name: targetChat.name,
      avatar: displayAvatar,
      isOnline: actualIsOnline,
      type: targetChat.type,
      lastActiveAt: actualLastActiveAt,
      unreadCount: targetChat.unreadCount
    })

    setChatList((currentChatList) =>
      currentChatList.map((c) => (String(c.id) === String(chatId) ? { ...c, unreadCount: 0 } : c))
    )

    if (isMobile) setOpenMobile(false)
    if (location.pathname !== '/') navigate('/')

    try {
      await conversationsApi.markAsSeen(chatId)
    } catch (error) {
      console.error('Lỗi khi đánh dấu xem:', error)
    }
  }

  return (
    <Sidebar collapsible='none' className='flex flex-1 overflow-hidden bg-background'>
      <SidebarHeader className='gap-3.5 border-b border-sidebar-border/40 p-4 shadow-sm'>
        <div className='flex w-full items-center justify-between'>
          <div className='text-base font-medium text-foreground'>{activeItem.title}</div>
          <button
            onClick={() => setOpen(true)}
            className='flex h-6 w-6 items-center justify-center rounded-md bg-muted text-muted-foreground hover:bg-muted-foreground/20 transition-colors'
          >
            <UserPlus className='h-4 w-4 cursor-pointer' />
          </button>
        </div>
        <AddFriendModal open={open} onOpenChange={setOpen} />

        <SidebarInput placeholder='Tìm kiếm...' />
      </SidebarHeader>

      <SidebarContent className='overflow-hidden'>
        <div className='flex flex-col gap-0 p-2 w-full overflow-hidden'>
          {activeItem.title === 'Tin nhắn' && (
            <>
              {isLoading ? (
                <div className='flex justify-center items-center py-6'>
                  <Loader2 className='h-6 w-6 animate-spin text-blue-500' />
                </div>
              ) : chatList.length === 0 ? (
                <div className='text-center py-6 text-sm text-muted-foreground'>Không có cuộc trò chuyện nào</div>
              ) : (
                chatList.map((chat) => {
                  const displayUnread = chat.unreadCount > 99 ? '99+' : chat.unreadCount
                  const isActive = String(activeChat?.id) === String(chat.id)
                  return (
                    <div
                      key={chat.id}
                      onClick={() => handleChatSelect(chat.id)}
                      className={`flex items-center gap-3 rounded-lg p-2 cursor-pointer transition-colors w-full overflow-hidden ${
                        isActive ? 'bg-muted/80' : 'hover:bg-muted/50'
                      }`}
                    >
                      <div className='shrink-0'>
                        <ChatAvatar chat={chat} currentUserId={profileId} />
                      </div>
                      <div className='flex-1 overflow-hidden'>
                        <div className='flex justify-between items-center mb-0.5 gap-2'>
                          <div
                            className={`font-semibold text-sm truncate ${chat.unreadCount > 0 && !isActive ? 'text-foreground font-bold' : ''}`}
                          >
                            {chat.name}
                          </div>
                          <div
                            className={`text-xs shrink-0 ${chat.unreadCount > 0 && !isActive ? 'text-blue-500 font-bold' : 'text-muted-foreground'}`}
                          >
                            {chat.time}
                          </div>
                        </div>
                        <div className='flex justify-between items-center gap-2'>
                          <div
                            className={`text-sm truncate flex-1 ${chat.unreadCount > 0 && !isActive ? 'text-foreground font-medium' : 'text-muted-foreground'} ${chat.message === 'Tin nhắn đã được thu hồi' ? 'italic opacity-80' : ''}`}
                          >
                            {chat.message}
                          </div>
                          {chat.unreadCount > 0 && !isActive && (
                            <div className='flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gradient-to-r from-[#6b45e9] to-[#a139e4] px-1.5 text-[10px] font-bold text-white shrink-0'>
                              {displayUnread}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </>
          )}
          {activeItem.title === 'Danh bạ' && <PhoneBook />}
          {activeItem.title !== 'Tin nhắn' && activeItem.title !== 'Danh bạ' && (
            <div className='text-center py-6 text-sm text-muted-foreground'>Tính năng đang phát triển...</div>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  )
}
