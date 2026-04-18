/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import { Loader2, UserPlus, Bot, Users, MoreHorizontal, Trash2 } from 'lucide-react'
import { Sidebar, SidebarHeader, SidebarInput, SidebarContent } from '@/components/ui/sidebar'
import { ChatAvatar } from '../chat-avatar'
import PhoneBook from '../phonebook/PhoneBook'
import { conversationsApi } from '@/apis/conversations.api'
import { useNavigate, useLocation } from 'react-router-dom'
import { useSidebar } from '@/components/ui/sidebar'
import AddFriendModal from '@/pages/AddFriendModal'
import { AddMemberModal } from '../chat/info-panel/AddMemberModal'
import Settings from '../settings/Setting'
import { useMutation } from '@tanstack/react-query'
import searchApi from '@/apis/search.api'
import { AppContext } from '@/context/app.context'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

interface SidebarPanel2Props {
  activeItem: any
  isLoading: boolean
  chatList: any[]
  setActiveChat: (chat: any) => void
  setChatList: React.Dispatch<React.SetStateAction<any[]>>
  profileId: string
  onSwitchToChat: () => void
}

export function SidebarPanel2({
  activeItem,
  isLoading,
  chatList,
  setActiveChat,
  setChatList,
  profileId,
  onSwitchToChat
}: SidebarPanel2Props) {
  const navigate = useNavigate()
  const location = useLocation()

  const { activeChat } = React.useContext(AppContext)

  const [open, setOpen] = React.useState(false)
  const [openCreateGroup, setOpenCreateGroup] = React.useState(false)

  const { setOpenMobile, isMobile } = useSidebar()
  const [keyword, setKeyword] = React.useState('')
  const [searchResults, setSearchResults] = React.useState<any[]>([])

  const chatListRef = React.useRef(chatList)
  React.useEffect(() => {
    chatListRef.current = chatList
  }, [chatList])

  React.useEffect(() => {
    if (activeChat?.id && !keyword && activeItem.title === 'Tin nhắn') {
      const timer = setTimeout(() => {
        const element = document.getElementById(`chat-item-${activeChat.id}`)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [activeChat?.id, activeItem.title, keyword])

  const handleChatSelect = async (chatId: string) => {
    if (chatId === 'ai-chatbot') {
      setActiveChat({
        id: 'ai-chatbot',
        name: 'ChatPulse AI',
        avatar: '',
        isOnline: true,
        type: 'ai',
        unreadCount: 0
      })
      if (isMobile) setOpenMobile(false)
      if (location.pathname !== '/') navigate('/')
      return
    }

    const targetChat = chatListRef.current.find((c) => String(c.id) === String(chatId))
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
      unreadCount: targetChat.unreadCount,
      participants: targetChat.participants,
      admin_id: targetChat.admin_id,
      isFriend: targetChat.isFriend,
      isDisbanded: targetChat.is_disbanded
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

  const handleSelectSearchResult = (searchedUser: any) => {
    const existingChat = chatListRef.current.find(
      (c) => c.type === 'direct' && c.participants?.some((p: any) => String(p._id) === String(searchedUser._id))
    )

    if (existingChat) {
      handleChatSelect(existingChat.id)
    } else {
      setActiveChat({
        id: `temp_${searchedUser._id}`,
        name: searchedUser.userName,
        avatar: searchedUser.avatar,
        isOnline: searchedUser.isOnline === true,
        type: 'direct',
        unreadCount: 0,
        participants: [searchedUser]
      })

      if (isMobile) setOpenMobile(false)
      if (location.pathname !== '/') navigate('/')
    }

    setKeyword('')
    setSearchResults([])
  }

  React.useEffect(() => {
    const handleStartChatEvent = (e: Event) => {
      const customEvent = e as CustomEvent
      const friend = customEvent.detail

      if (onSwitchToChat) onSwitchToChat()

      const existingChat = chatListRef.current.find(
        (c) => c.type === 'direct' && c.participants?.some((p: any) => String(p._id) === String(friend._id))
      )

      if (existingChat) {
        handleChatSelect(existingChat.id)
      } else {
        setActiveChat({
          id: `temp_${friend._id}`,
          name: friend.userName || friend.fullName || 'Người dùng',
          avatar: friend.avatar,
          isOnline: friend.isOnline === true,
          type: 'direct',
          unreadCount: 0,
          participants: [friend]
        })

        if (isMobile) setOpenMobile(false)
      }
    }

    window.addEventListener('start_chat_with_friend', handleStartChatEvent)
    return () => window.removeEventListener('start_chat_with_friend', handleStartChatEvent)
  }, [onSwitchToChat, isMobile])

  const searchUserMutation = useMutation({
    mutationFn: (userName: string) => searchApi.advancedSearch({ userName })
  })

  return (
    <Sidebar collapsible='none' className='flex flex-1 overflow-hidden bg-background relative'>
      <SidebarHeader className='gap-3.5 border-b border-sidebar-border/40 p-4 shadow-sm'>
        <div className='flex w-full items-center justify-between'>
          <div className='text-base font-medium text-foreground'>{activeItem.title}</div>

          <div className='flex items-center gap-1.5'>
            <button
              onClick={() => setOpenCreateGroup(true)}
              className='flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground transition-colors'
              title='Tạo nhóm trò chuyện'
            >
              <Users className='h-4 w-4 cursor-pointer' />
            </button>
            <button
              onClick={() => setOpen(true)}
              className='flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground transition-colors'
              title='Thêm bạn bè'
            >
              <UserPlus className='h-4 w-4 cursor-pointer' />
            </button>
          </div>
        </div>

        <AddFriendModal open={open} onOpenChange={setOpen} />
        <AddMemberModal isOpen={openCreateGroup} onClose={() => setOpenCreateGroup(false)} mode='create' />

        <SidebarInput
          placeholder='Tìm kiếm...'
          value={keyword}
          onChange={(e) => {
            const value = e.target.value
            setKeyword(value)

            if (!value.trim()) {
              setSearchResults([])
              return
            }

            searchUserMutation.mutate(value, {
              onSuccess: (res) => {
                setSearchResults(res.data.result.users || [])
              }
            })
          }}
        />
      </SidebarHeader>

      {keyword && (
        <div className='absolute top-[125px] left-0 w-full h-[calc(100%-80px)] dark:bg-background z-50 overflow-y-auto'>
          {searchUserMutation.isPending ? (
            <div className='flex justify-center items-center py-6'>
              <Loader2 className='animate-spin' />
            </div>
          ) : searchResults.length === 0 ? (
            <div className='text-center py-6 text-sm text-muted-foreground'>Không tìm thấy người dùng</div>
          ) : (
            searchResults.map((user: any) => (
              <div
                key={user._id}
                onClick={() => handleSelectSearchResult(user)}
                className='flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-sidebar-accent cursor-pointer'
              >
                <div className='h-10 w-10 rounded-full overflow-hidden'>
                  {user.avatar ? (
                    <img src={user.avatar} className='h-full w-full object-cover' />
                  ) : (
                    <div className='flex items-center justify-center h-full w-full bg-blue-100 text-blue-600 font-semibold'>
                      {user.userName?.charAt(0)}
                    </div>
                  )}
                </div>
                <div className='flex-1'>
                  <div className='font-medium'>{user.userName}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <SidebarContent className='overflow-hidden relative'>
        <div className='flex flex-col gap-1 w-full overflow-auto'>
          {!keyword && activeItem.title === 'Tin nhắn' && (
            <>
              <div
                id='chat-item-ai-chatbot'
                onClick={() => handleChatSelect('ai-chatbot')}
                className={`flex items-center gap-3 min-h-16 rounded-lg p-2 cursor-pointer transition-colors w-full overflow-hidden mb-1 ${
                  activeChat?.id === 'ai-chatbot' ? 'bg-muted/80' : 'hover:bg-muted/30'
                }`}
              >
                <div className='shrink-0'>
                  <div className='flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 shadow-sm border border-border'>
                    <Bot className='h-6 w-6 text-white' />
                  </div>
                </div>
                <div className='flex-1 overflow-hidden'>
                  <div className='flex justify-between items-center mb-0.5 gap-2'>
                    <div className='font-bold text-sm truncate text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-indigo-600'>
                      ChatPulse AI
                    </div>
                  </div>
                  <div className='text-sm truncate text-muted-foreground'>Trợ lý ảo thông minh</div>
                </div>
              </div>

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
                  const isUnfriended = chat.isFriend === false
                  const isDisbanded = chat.is_disbanded === true || chat.isDisbanded === true // Lấy từ API
                  const isInactiveState = isUnfriended || isDisbanded // Gộp chung trạng thái

                  return (
                    <div
                      key={chat.id}
                      id={`chat-item-${chat.id}`}
                      onClick={() => handleChatSelect(chat.id)}
                      className={`group/chat relative flex items-center gap-3 rounded-lg min-h-16 p-2 cursor-pointer transition-all duration-200 w-full overflow-hidden ${
                        isActive ? 'bg-[#e5efff] dark:bg-muted' : 'hover:bg-muted/50'
                      } ${isInactiveState ? 'opacity-70 bg-muted/40 border border-border/50' : ''}`} // Áp dụng style làm mờ
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
                            <span className='text-xs text-muted-foreground'>
                              {chat.draftContent && String(chat.id) !== String(activeChat?.id) ? (
                                <span className='text-red-500 font-medium'>Chưa gửi</span>
                              ) : (
                                chat.time
                              )}
                            </span>
                          </div>
                        </div>
                        <div className='flex justify-between items-center gap-2'>
                          <p className='text-sm text-muted-foreground truncate'>
                            {(() => {
                              if (chat.draftContent && String(chat.id) !== String(activeChat?.id)) {
                                return (
                                  <>
                                    <span className='text-red-500 font-medium'>[Bản nháp]</span> {chat.draftContent}
                                  </>
                                )
                              }
                              return `${chat.senderPrefix || ''}${chat.message}`
                            })()}
                          </p>
                          {chat.unreadCount > 0 && !isActive && (
                            <div className='flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gradient-to-r from-[#6b45e9] to-[#a139e4] px-1.5 text-[10px] font-bold text-white shrink-0'>
                              {displayUnread}
                            </div>
                          )}
                        </div>
                      </div>

                      {isInactiveState && (
                        <div className='absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/chat:opacity-100 transition-opacity z-50'>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <button className='p-1.5 bg-background border border-border shadow-md rounded-full text-foreground hover:bg-muted'>
                                <MoreHorizontal className='w-4 h-4' />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align='end' className='w-48 z-[99]'>
                              <DropdownMenuItem
                                className='text-red-500 font-medium cursor-pointer'
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  try {
                                    await conversationsApi.deleteConversation(chat.id)
                                    setChatList((prev) => prev.filter((c) => String(c.id) !== String(chat.id)))
                                    if (activeChat?.id === chat.id) setActiveChat(null)
                                  } catch (error) {
                                    console.error('Lỗi khi xóa cuộc trò chuyện:', error)
                                  }
                                }}
                              >
                                <Trash2 className='w-4 h-4 mr-2' /> Xóa lịch sử trò chuyện
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </>
          )}
          {!keyword && activeItem.title === 'Danh bạ' && <PhoneBook />}
          {!keyword && activeItem.title === 'Cài đặt' && <Settings />}
        </div>
      </SidebarContent>
    </Sidebar>
  )
}
