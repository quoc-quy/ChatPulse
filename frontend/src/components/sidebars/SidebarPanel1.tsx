/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarContent,
  SidebarFooter
} from '@/components/ui/sidebar'
import { NavUser } from '@/components/nav-user'
import { useNavigate, useLocation } from 'react-router-dom'
import { useSidebar } from '@/components/ui/sidebar'

interface SidebarPanel1Props {
  navMain: any[]
  activeItem: any
  setActiveItem: (item: any) => void
  hasUnreadMessages: boolean
  currentUser: any
  requestCount: number
}

export function SidebarPanel1({
  navMain,
  activeItem,
  setActiveItem,
  hasUnreadMessages,
  currentUser,
  requestCount
}: SidebarPanel1Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const { setOpen } = useSidebar()

  return (
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
                  if (item.title === 'Tin nhắn' && location.pathname !== '/') {
                    navigate('/')
                  }
                }}
                isActive={activeItem.title === item.title}
                className='mx-auto md:h-11 md:w-11 flex items-center justify-center rounded-xl group-data-[collapsible=icon]:!w-11 group-data-[collapsible=icon]:!h-11 group-data-[collapsible=icon]:!p-0'
              >
                <div className='relative flex items-center justify-center'>
                  <item.icon className='!size-6' />
                  {item.title === 'Tin nhắn' && hasUnreadMessages && (
                    <span className='absolute -top-1 -right-1.5 flex h-3 w-3'>
                      <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-[#a139e4] opacity-75'></span>
                      <span className='relative inline-flex rounded-full h-3 w-3 bg-gradient-to-r from-[#6b45e9] to-[#a139e4] border-2 border-background'></span>
                    </span>
                  )}
                  {item.title === 'Danh bạ' && requestCount > 0 && (
                    <span className='absolute -top-1 -right-1.5 flex h-3 w-3'>
                      <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-[#a139e4] opacity-75'></span>
                      <span className='relative inline-flex rounded-full h-3 w-3 bg-gradient-to-r from-[#6b45e9] to-[#a139e4] border-2 border-background'></span>
                    </span>
                  )}
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={currentUser} />
      </SidebarFooter>
    </Sidebar>
  )
}
