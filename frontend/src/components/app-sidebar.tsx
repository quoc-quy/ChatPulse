import * as React from 'react'
import { MessageSquare, Users, Settings, Bell, Plus } from 'lucide-react'
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

const data = {
  user: {
    name: 'Quốc Quý',
    email: 'quocquy@example.com',
    avatar: ''
  },
  navMain: [
    { title: 'Tin nhắn', icon: MessageSquare },
    { title: 'Danh bạ', icon: Users },
    { title: 'Thông báo', icon: Bell },
    { title: 'Cài đặt', icon: Settings }
  ],
  chats: [
    { name: 'Nhóm Chat Web', message: 'Tối nay họp nha', time: '10:20' },
    { name: 'Dự án ChatPulse', message: 'Hoàn thành sidebar rồi', time: 'Hôm qua' },
    { name: 'Minh Tuấn', message: 'Oke bạn ơi', time: 'T2' }
  ]
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [activeItem, setActiveItem] = React.useState(data.navMain[0])
  const { setOpen } = useSidebar()

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
              {/* Căn giữa logo */}
              <SidebarMenuButton size='lg' asChild className='mx-auto md:h-12 md:w-12 md:p-0 flex justify-center'>
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
            {data.navMain.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={{ children: item.title, hidden: false }}
                  onClick={() => {
                    setActiveItem(item)
                    setOpen(true)
                  }}
                  isActive={activeItem.title === item.title}
                  // Căn giữa icon và xóa text
                  className='mx-auto md:h-11 md:w-11 flex items-center justify-center rounded-xl'
                >
                  <item.icon className='!size-5' />
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <NavUser user={data.user} />
        </SidebarFooter>
      </Sidebar>

      {/* PANEL 2: Panel danh sách mở rộng kế bên */}
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
            {data.chats.map((chat) => (
              <div
                key={chat.name}
                className='flex items-start gap-3 rounded-lg p-2 hover:bg-muted cursor-pointer transition-colors'
              >
                <div className='flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold text-lg'>
                  {chat.name.charAt(0)}
                </div>
                <div className='flex flex-col flex-1 overflow-hidden py-0.5'>
                  <div className='flex justify-between items-center w-full'>
                    <span className='font-semibold text-sm truncate'>{chat.name}</span>
                    <span className='text-xs text-muted-foreground shrink-0'>{chat.time}</span>
                  </div>
                  <span className='text-sm text-muted-foreground truncate mt-0.5'>{chat.message}</span>
                </div>
              </div>
            ))}
          </div>
        </SidebarContent>
      </Sidebar>
    </Sidebar>
  )
}
