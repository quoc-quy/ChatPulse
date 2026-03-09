// frontend-demo/src/components/app-sidebar.tsx
import * as React from 'react'
import { useEffect, useState, useContext, useRef } from 'react'
import { MessageSquare, Users, Settings, Bell, Plus, Loader2 } from 'lucide-react'
import { NavUser } from '@/components/nav-user'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from '@/components/ui/sidebar'

import { AppContext } from '@/context/app.context'
import { conversationsApi } from '@/apis/conversations.api'
import { ChatAvatar } from './chat-avatar'

import { useSocket } from '@/context/socket.context'
import PhoneBook from './phonebook/PhoneBook'

const navMain = [
  { title: 'Tin nhắn', icon: MessageSquare },
  { title: 'Danh bạ', icon: Users },
  { title: 'Thông báo', icon: Bell },
  { title: 'Cài đặt', icon: Settings }
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [activeItem, setActiveItem] = useState(navMain[0])
  const { setOpen, setOpenMobile, isMobile } = useSidebar()

  const { setActiveChat, activeChat } = useContext(AppContext)
  const { profile } = useContext(AppContext)
  const { socket } = useSocket()

  const [chatList, setChatList] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [refetchTrigger, setRefetchTrigger] = useState(0)

  const activeChatRef = useRef(activeChat)
  useEffect(() => {
    activeChatRef.current = activeChat
  }, [activeChat])

  const currentUser = {
    name: profile?.userName || 'Người dùng',
    email: profile?.email || '',
    avatar: profile?.avatar || ''
  }

  // --- 1. LẤY DANH SÁCH CUỘC TRÒ CHUYỆN ---
  useEffect(() => {
    if (activeItem.title === 'Tin nhắn' && profile) {
      const fetchChats = async () => {
        setIsLoading(true)
        try {
          const res = await conversationsApi.getConversations()

          let rawData = res.data?.result || res.data?.data || res.data
          if (!Array.isArray(rawData)) {
            rawData = []
          }

          const formattedChats = rawData.map((conv: any) => {
            let chatName = 'Cuộc trò chuyện'
            let isOnline = false
            let lastActiveAt = undefined

            if (conv.type === 'direct') {
              const otherUser = conv.participants?.find((p: any) => String(p._id) !== String(profile._id))
              if (otherUser) {
                chatName = otherUser.userName || otherUser.fullName || 'Người dùng'
                isOnline = otherUser.isOnline === true
                lastActiveAt = otherUser.last_active_at || otherUser.lastActiveAt
              }
            } else if (conv.type === 'group') {
              if (conv.name) {
                chatName = conv.name
              } else if (conv.participants) {
                const otherUsers = conv.participants.filter((p: any) => String(p._id) !== String(profile._id))
                chatName = otherUsers.map((u: any) => u.userName || u.fullName).join(', ')
                if (!chatName) chatName = 'Nhóm trò chuyện'
              }
            }

            const timeString = conv.updated_at
              ? new Date(conv.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : ''

            let lastMessageContent = 'Chưa có tin nhắn nào...'
            if (conv.lastMessage && (conv.lastMessage.content || conv.lastMessage.type)) {
              let content = conv.lastMessage.content
              if (conv.lastMessage.type === 'image' || conv.lastMessage.type === 'media') {
                content = 'Đã gửi một hình ảnh'
              } else if (!content) {
                content = 'Tin nhắn mới'
              }

              let prefix = ''
              if (conv.lastMessage.sender_id || conv.lastMessage.senderId) {
                const senderId = conv.lastMessage.sender_id || conv.lastMessage.senderId
                const isMe = String(senderId) === String(profile._id)
                if (isMe) {
                  prefix = 'Bạn: '
                } else if (conv.type === 'group') {
                  const sender = conv.participants?.find((p: any) => String(p._id) === String(senderId))
                  if (sender) {
                    const senderName = sender.userName || sender.fullName || 'Thành viên'
                    prefix = `${senderName}: `
                  }
                }
              }
              lastMessageContent = `${prefix}${content}`
            }

            const unreadCount = conv.unread_count ?? conv.unreadCount ?? 0

            return {
              id: conv._id,
              name: chatName,
              message: lastMessageContent,
              time: timeString,
              timestamp: new Date(conv.updated_at || 0).getTime(),
              type: conv.type,
              avatarUrl: conv.avatarUrl,
              participants: conv.participants || [],
              admin_id: conv.admin_id,
              isOnline,
              lastActiveAt,
              unreadCount
            }
          })

          const uniqueChatsMap = new Map()
          formattedChats.forEach((chat: any) => {
            if (!uniqueChatsMap.has(chat.id)) {
              uniqueChatsMap.set(chat.id, chat)
            }
          })
          const uniqueChats = Array.from(uniqueChatsMap.values())

          uniqueChats.sort((a, b) => b.timestamp - a.timestamp)
          setChatList(uniqueChats)
        } catch (error) {
          console.error('Lỗi khi tải danh sách cuộc trò chuyện:', error)
        } finally {
          setIsLoading(false)
        }
      }

      fetchChats()
    }
  }, [activeItem.title, profile, refetchTrigger])

  // --- 2. LẮNG NGHE SOCKET REALTIME ---
  useEffect(() => {
    if (!profile || !socket) return

    const handleReceiveMessage = (newMessage: any) => {
      setChatList((prevChats) => {
        const convIdStr = String(newMessage.conversationId)
        const existingChatIndex = prevChats.findIndex((c) => String(c.id) === convIdStr)
        let updatedChats = [...prevChats]

        const senderIdStr = String(newMessage.sender?._id || newMessage.senderId)
        const isMe = senderIdStr === String(profile._id)

        let prefix = isMe ? 'Bạn: ' : ''
        if (!isMe && newMessage.type === 'group') {
          prefix = `${newMessage.sender?.userName || newMessage.sender?.fullName || 'Thành viên'}: `
        }

        let previewContent = newMessage.content
        if (newMessage.type === 'image' || newMessage.type === 'media') previewContent = 'Đã gửi một hình ảnh'

        const newPreview = `${prefix}${previewContent}`
        const newTime = new Date(newMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        const newTimestamp = new Date(newMessage.createdAt).getTime()

        if (existingChatIndex !== -1) {
          const chatToUpdate = { ...updatedChats[existingChatIndex] }
          chatToUpdate.message = newPreview
          chatToUpdate.time = newTime
          chatToUpdate.timestamp = newTimestamp

          const isCurrentlyViewing = String(activeChatRef.current?.id) === convIdStr

          if (!isMe) {
            if (isCurrentlyViewing) {
              conversationsApi.markAsSeen(convIdStr).catch((err) => console.error(err))
            } else {
              chatToUpdate.unreadCount = (chatToUpdate.unreadCount || 0) + 1
            }
          }

          updatedChats.splice(existingChatIndex, 1)
          updatedChats.unshift(chatToUpdate)
          return updatedChats
        } else {
          setRefetchTrigger((prev) => prev + 1)
          return prevChats
        }
      })
    }

    const handleUserStatusChange = (data: { userId: string; isOnline: boolean; lastActiveAt?: string }) => {
      setChatList((prevChats) =>
        prevChats.map((chat) => {
          const hasUser = chat.participants?.some((p: any) => String(p._id) === String(data.userId))

          if (hasUser) {
            const updatedParticipants = chat.participants.map((p: any) =>
              String(p._id) === String(data.userId)
                ? { ...p, isOnline: data.isOnline, last_active_at: data.lastActiveAt || p.last_active_at }
                : p
            )

            let updatedIsOnline = chat.isOnline
            if (chat.type === 'direct') {
              const otherUser = updatedParticipants.find((p: any) => String(p._id) !== String(profile._id))
              if (otherUser) {
                updatedIsOnline = otherUser.isOnline === true
              }
            }

            return {
              ...chat,
              isOnline: updatedIsOnline,
              lastActiveAt: data.lastActiveAt || chat.lastActiveAt,
              participants: updatedParticipants
            }
          }
          return chat
        })
      )
    }

    socket.on('receive_message', handleReceiveMessage)
    socket.on('user_status_change', handleUserStatusChange)

    return () => {
      socket.off('receive_message', handleReceiveMessage)
      socket.off('user_status_change', handleUserStatusChange)
    }
  }, [profile, socket])

  // --- 3. ĐỒNG BỘ TRẠNG THÁI ---
  useEffect(() => {
    if (activeChat) {
      const currentInList = chatList.find((c) => String(c.id) === String(activeChat.id))
      if (
        currentInList &&
        (currentInList.isOnline !== activeChat.isOnline || currentInList.lastActiveAt !== activeChat.lastActiveAt)
      ) {
        setActiveChat((prev) => {
          if (!prev) return prev
          if (prev.isOnline === currentInList.isOnline && prev.lastActiveAt === currentInList.lastActiveAt) return prev
          return {
            ...prev,
            isOnline: currentInList.isOnline,
            lastActiveAt: currentInList.lastActiveAt
          }
        })
      }
    }
  }, [chatList, activeChat, setActiveChat])

  // --- 4. SỰ KIỆN CLICK VÀO MỘT CHAT ---
  const handleChatSelect = async (chatId: string) => {
    const targetChat = chatList.find((c) => String(c.id) === String(chatId))

    if (!targetChat) return

    let displayAvatar = targetChat.avatarUrl
    let actualIsOnline = targetChat.isOnline
    let actualLastActiveAt = targetChat.lastActiveAt

    if (targetChat.type === 'direct') {
      const otherUser = targetChat.participants?.find((p: any) => String(p._id) !== String(profile?._id))
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
      lastActiveAt: actualLastActiveAt
    })

    setChatList((currentChatList) =>
      currentChatList.map((c) => (String(c.id) === String(chatId) ? { ...c, unreadCount: 0 } : c))
    )

    if (isMobile) {
      setOpenMobile(false)
    }

    try {
      await conversationsApi.markAsSeen(chatId)
    } catch (error) {
      console.error('Lỗi khi đánh dấu đã xem:', error)
    }
  }

  return (
    <Sidebar collapsible='icon' className='overflow-hidden' {...props}>
      {/* WRAPPER FIX LỖI MOBILE: Bọc thẻ flex-row để ép 2 Panel nằm ngang */}
      <div className='flex flex-row h-full w-full'>
        {/* PANEL 1: Cột biểu tượng */}
        <Sidebar
          collapsible='none'
          className='!w-[calc(var(--sidebar-width-icon)_+_1px)] shrink-0 border-r border-sidebar-border/40'
        >
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  size='lg'
                  asChild
                  className='mx-auto md:h-12 md:w-12 md:p-0 flex justify-center group-data-[collapsible=icon]:!w-12 group-data-[collapsible=icon]:!h-12 group-data-[collapsible=icon]:!p-0'
                >
                  <a href='/'>
                    <div className='flex aspect-square size-10 items-center justify-center rounded-xl text-sidebar-primary-foreground'>
                      <img src='/logo-chatpulse-icon.png' alt='Logo' className='size-6' />
                    </div>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu className='gap-2 mt-2'>
              {navMain.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    tooltip={{ children: item.title, hidden: false }}
                    onClick={() => {
                      setActiveItem(item)
                      setOpen(true)
                    }}
                    isActive={activeItem.title === item.title}
                    className='mx-auto md:h-11 md:w-11 flex items-center justify-center rounded-xl group-data-[collapsible=icon]:!w-11 group-data-[collapsible=icon]:!h-11 group-data-[collapsible=icon]:!p-0'
                  >
                    <item.icon className='!size-6' />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
            <NavUser user={currentUser} />
          </SidebarFooter>
        </Sidebar>

        {/* PANEL 2: Danh sách nội dung */}
        <Sidebar collapsible='none' className='flex flex-1 overflow-hidden bg-background'>
          <SidebarHeader className='gap-3.5 border-b border-sidebar-border/40 p-4 shadow-sm'>
            <div className='flex w-full items-center justify-between'>
              <div className='text-base font-medium text-foreground'>{activeItem.title}</div>
              <button className='flex h-6 w-6 items-center justify-center rounded-md bg-muted text-muted-foreground hover:bg-muted-foreground/20 transition-colors'>
                <Plus className='h-4 w-4' />
              </button>
            </div>
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
                            <ChatAvatar chat={chat} currentUserId={profile?._id || ''} />
                          </div>

                          <div className='flex-1 overflow-hidden'>
                            <div className='flex justify-between items-center mb-0.5 gap-2'>
                              <div
                                className={`font-semibold text-sm truncate ${
                                  chat.unreadCount > 0 && !isActive ? 'text-foreground font-bold' : ''
                                }`}
                              >
                                {chat.name}
                              </div>
                              <div
                                className={`text-xs shrink-0 ${
                                  chat.unreadCount > 0 && !isActive
                                    ? 'text-blue-500 font-bold'
                                    : 'text-muted-foreground'
                                }`}
                              >
                                {chat.time}
                              </div>
                            </div>

                            <div className='flex justify-between items-center gap-2'>
                              <div
                                className={`text-sm truncate flex-1 ${
                                  chat.unreadCount > 0 && !isActive
                                    ? 'text-foreground font-medium'
                                    : 'text-muted-foreground'
                                }`}
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
      </div>
    </Sidebar>
  )
}
