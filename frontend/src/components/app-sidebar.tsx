import * as React from 'react'
import { useEffect, useState, useContext, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
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

const navMain = [
  { title: 'Tin nhắn', icon: MessageSquare },
  { title: 'Danh bạ', icon: Users },
  { title: 'Thông báo', icon: Bell },
  { title: 'Cài đặt', icon: Settings }
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [activeItem, setActiveItem] = useState(navMain[0])
  const { setOpen } = useSidebar()

  const { setActiveChat, activeChat } = useContext(AppContext)
  const { profile } = useContext(AppContext)

  const [chatList, setChatList] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [refetchTrigger, setRefetchTrigger] = useState(0) // Trigger để refetch khi có chat mới tinh
  const socketRef = useRef<Socket | null>(null)

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
  // Đã thêm refetchTrigger vào dependency để tự động gọi lại API khi cần
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

          formattedChats.sort((a, b) => b.timestamp - a.timestamp)
          setChatList(formattedChats)
        } catch (error) {
          console.error('Lỗi khi tải danh sách cuộc trò chuyện:', error)
        } finally {
          setIsLoading(false)
        }
      }

      fetchChats()
    }
  }, [activeItem.title, profile, refetchTrigger]) // Lắng nghe refetchTrigger

  // --- 2. LẮNG NGHE SOCKET REALTIME TỐI ƯU HÓA ---
  useEffect(() => {
    if (!profile) return

    const socket = io('http://localhost:4001', {
      auth: { user_id: profile._id }
    })
    socketRef.current = socket

    // A. NHẬN TIN NHẮN MỚI
    socket.on('receive_message', (newMessage: any) => {
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

          // KIỂM TRA ĐIỀU KIỆN UNREAD BADGE CHUẨN XÁC
          const isCurrentlyViewing = String(activeChatRef.current?.id) === convIdStr

          if (!isMe) {
            if (isCurrentlyViewing) {
              // Nếu đang mở chat này -> Tự động đánh dấu đã đọc lên server ngay lập tức để F5 không bị lỗi
              conversationsApi.markAsSeen(convIdStr).catch((err) => console.error(err))
            } else {
              // Nếu KHÔNG mở chat này -> Tăng số đếm
              chatToUpdate.unreadCount = (chatToUpdate.unreadCount || 0) + 1
            }
          }

          // Cập nhật mảng
          updatedChats.splice(existingChatIndex, 1)
          updatedChats.unshift(chatToUpdate)
          return updatedChats
        } else {
          // BẮT TRƯỜNG HỢP: Tin nhắn từ 1 nhóm/người hoàn toàn mới chưa có trong list hiện tại
          setRefetchTrigger((prev) => prev + 1)
          return prevChats
        }
      })
    })

    // B. CẬP NHẬT TRẠNG THÁI ONLINE/OFFLINE
    socket.on('user_status_change', (data: { userId: string; isOnline: boolean; lastActiveAt?: string }) => {
      setChatList((prevChats) =>
        prevChats.map((chat) => {
          if (chat.type === 'direct') {
            // FIX LỖI 1: Bọc String() để so sánh chính xác tuyệt đối
            const hasUser = chat.participants?.some((p: any) => String(p._id) === String(data.userId))
            if (hasUser) {
              return { ...chat, isOnline: data.isOnline, lastActiveAt: data.lastActiveAt || chat.lastActiveAt }
            }
          }
          return chat
        })
      )
    })

    return () => {
      socket.off('receive_message')
      socket.off('user_status_change')
      socket.disconnect()
    }
  }, [profile])

  // --- 3. ĐỒNG BỘ TRẠNG THÁI TỪ CHAT LIST LÊN CHAT HEADER ---
  useEffect(() => {
    if (activeChat) {
      const currentInList = chatList.find((c) => String(c.id) === String(activeChat.id))
      if (
        currentInList &&
        (currentInList.isOnline !== activeChat.isOnline || currentInList.lastActiveAt !== activeChat.lastActiveAt)
      ) {
        setActiveChat((prev) =>
          prev
            ? {
                ...prev,
                isOnline: currentInList.isOnline,
                lastActiveAt: currentInList.lastActiveAt
              }
            : prev
        )
      }
    }
  }, [chatList, activeChat, setActiveChat])

  // --- 4. SỰ KIỆN CLICK VÀO MỘT CHAT ---
  const handleChatSelect = async (chat: any) => {
    setActiveChat({
      id: chat.id,
      name: chat.name,
      avatar: chat.avatarUrl,
      isOnline: chat.isOnline,
      type: chat.type,
      lastActiveAt: chat.lastActiveAt
    })

    // Reset giao diện
    setChatList((prev) => prev.map((c) => (String(c.id) === String(chat.id) ? { ...c, unreadCount: 0 } : c)))

    // Gọi API lưu trạng thái
    try {
      await conversationsApi.markAsSeen(chat.id)
    } catch (error) {
      console.error('Lỗi khi đánh dấu đã xem:', error)
    }
  }

  return (
    <Sidebar collapsible='icon' className='overflow-hidden [&>[data-sidebar=sidebar]]:flex-row' {...props}>
      {/* PANEL 1: Cột biểu tượng */}
      <Sidebar
        collapsible='none'
        className='!w-[calc(var(--sidebar-width-icon)_+_1px)] border-r border-sidebar-border/40'
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
      <Sidebar collapsible='none' className='hidden flex-1 md:flex overflow-hidden'>
        <SidebarHeader className='gap-3.5 border-b border-sidebar-border/40 p-4'>
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
                        onClick={() => handleChatSelect(chat)}
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
                                chat.unreadCount > 0 && !isActive ? 'text-blue-500 font-bold' : 'text-muted-foreground'
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

            {activeItem.title !== 'Tin nhắn' && (
              <div className='text-center py-6 text-sm text-muted-foreground'>Tính năng đang phát triển...</div>
            )}
          </div>
        </SidebarContent>
      </Sidebar>
    </Sidebar>
  )
}
