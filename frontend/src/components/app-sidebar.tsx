import * as React from 'react'
import { useEffect, useState, useContext } from 'react'
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

const navMain = [
  { title: 'Tin nhắn', icon: MessageSquare },
  { title: 'Danh bạ', icon: Users },
  { title: 'Thông báo', icon: Bell },
  { title: 'Cài đặt', icon: Settings }
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [activeItem, setActiveItem] = useState(navMain[0])
  const { setOpen } = useSidebar()

  // Lấy Profile User từ Global Context
  const { profile } = useContext(AppContext)

  // State quản lý danh sách chat
  const [chatList, setChatList] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const currentUser = {
    name: profile?.userName || 'Người dùng',
    email: profile?.email || '',
    avatar: profile?.avatar || ''
  }

  // Gọi API lấy danh sách chat
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

            // XỬ LÝ LẠI LOGIC XÁC ĐỊNH TÊN DỰA TRÊN TRƯỜNG "type"
            if (conv.type === 'direct') {
              // Nếu là chat 1-1, lấy tên người đối diện
              const otherUser = conv.participants?.find((p: any) => p._id !== profile._id)
              // Sửa lại thành userName cho khớp với JSON trả về
              if (otherUser) {
                chatName = otherUser.userName || otherUser.fullName || 'Người dùng'
              }
            } else if (conv.type === 'group') {
              // Nếu là nhóm, ưu tiên lấy tên nhóm (nếu có).
              // Nếu không có, ghép tên các thành viên (trừ user hiện tại) lại
              if (conv.name) {
                chatName = conv.name
              } else if (conv.participants) {
                const otherUsers = conv.participants.filter((p: any) => p._id !== profile._id)
                // Ghép tên (vd: "LamSon, quyleo")
                chatName = otherUsers.map((u: any) => u.userName).join(', ')
                if (!chatName) chatName = 'Nhóm trò chuyện'
              }
            }

            // XỬ LÝ LẠI LOGIC THỜI GIAN (Dựa vào updated_at thay vì updatedAt)
            const timeString = conv.updated_at
              ? new Date(conv.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : ''

            // XỬ LÝ LẠI LOGIC TIN NHẮN CUỐI CÙNG
            let lastMessageContent = 'Chưa có tin nhắn nào...'
            if (conv.lastMessage && (conv.lastMessage.content || conv.lastMessage.type)) {
              // 1. Xác định nội dung tin nhắn
              let content = conv.lastMessage.content
              if (conv.lastMessage.type === 'image') {
                content = 'Đã gửi một hình ảnh'
              } else if (!content) {
                content = 'Tin nhắn mới'
              }

              // 2. Xác định tiền tố (Bạn: hoặc userName:)
              let prefix = ''
              if (conv.lastMessage.sender_id) {
                // Kiểm tra xem người gửi có phải là user đang đăng nhập không
                const isMe = conv.lastMessage.sender_id === profile._id

                if (isMe) {
                  prefix = 'Bạn: '
                }
                // Nếu là group và không phải mình gửi -> tìm tên người gửi
                else if (conv.type === 'group') {
                  const sender = conv.participants?.find((p: any) => p._id === conv.lastMessage.sender_id)
                  if (sender) {
                    // Ưu tiên lấy userName, nếu không có thì lấy fullName
                    const senderName = sender.userName || sender.fullName || 'Thành viên'
                    prefix = `${senderName}: `
                  }
                }
              }

              // 3. Ghép tiền tố và nội dung
              lastMessageContent = `${prefix}${content}`
            }

            return {
              id: conv._id,
              name: chatName,
              message: lastMessageContent,
              time: timeString
            }
          })

          setChatList(formattedChats)
        } catch (error) {
          console.error('Lỗi khi tải danh sách cuộc trò chuyện:', error)
        } finally {
          setIsLoading(false)
        }
      }

      fetchChats()
    }
  }, [activeItem.title, profile])

  return (
    <Sidebar collapsible='icon' className='overflow-hidden [&>[data-sidebar=sidebar]]:flex-row' {...props}>
      {/* PANEL 1: Dải Icon mỏng */}
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

      {/* PANEL 2: Panel danh sách mở rộng */}
      <Sidebar collapsible='none' className='hidden flex-1 md:flex'>
        <SidebarHeader className='gap-3.5 border-b border-sidebar-border/40 p-4'>
          <div className='flex w-full items-center justify-between'>
            <div className='text-base font-medium text-foreground'>{activeItem.title}</div>
            <button className='flex h-6 w-6 items-center justify-center rounded-md bg-muted text-muted-foreground hover:bg-muted-foreground/20'>
              <Plus className='h-4 w-4' />
            </button>
          </div>
          <SidebarInput placeholder='Tìm kiếm...' />
        </SidebarHeader>
        <SidebarContent>
          <div className='flex flex-col gap-0 p-2'>
            {activeItem.title === 'Tin nhắn' && (
              <>
                {isLoading ? (
                  <div className='flex justify-center items-center py-6'>
                    <Loader2 className='h-6 w-6 animate-spin text-blue-500' />
                  </div>
                ) : chatList.length === 0 ? (
                  <div className='text-center py-6 text-sm text-muted-foreground'>Không có cuộc trò chuyện nào</div>
                ) : (
                  chatList.map((chat) => (
                    <div
                      key={chat.id}
                      className='flex items-start gap-3 rounded-lg p-2 hover:bg-muted cursor-pointer transition-colors'
                    >
                      <div className='flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold text-lg'>
                        {chat.name.charAt(0).toUpperCase()}
                      </div>
                      <div className='flex flex-col flex-1 overflow-hidden py-0.5'>
                        <div className='flex justify-between items-center w-full'>
                          <span className='font-semibold text-sm truncate'>{chat.name}</span>
                          <span className='text-xs text-muted-foreground shrink-0'>{chat.time}</span>
                        </div>
                        <span className='text-sm text-muted-foreground truncate mt-0.5'>{chat.message}</span>
                      </div>
                    </div>
                  ))
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
