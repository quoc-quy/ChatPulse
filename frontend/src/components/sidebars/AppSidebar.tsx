import * as React from 'react'
import { useState, useContext } from 'react' // Thêm useContext
import { MessageSquare, Users, Settings } from 'lucide-react'
import { Sidebar } from '@/components/ui/sidebar'
import { useConversations } from '@/hooks/useConversations'
import { AppContext } from '@/context/app.context' // Import AppContext

import { SidebarPanel1 } from './SidebarPanel1'
import { SidebarPanel2 } from './SidebarPanel2'
import { useQuery } from '@tanstack/react-query'
import friendApi from '@/apis/friend.api'

const navMain = [
  { title: 'Tin nhắn', icon: MessageSquare },
  { title: 'Danh bạ', icon: Users },
  { title: 'Cài đặt', icon: Settings }
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [activeItem, setActiveItem] = useState(navMain[0])

  // Xóa profile ở useConversations vì nó có thể không realtime
  const { chatList, setChatList, isLoading, hasUnreadMessages, setActiveChat } = useConversations()

  // LẤY PROFILE TỪ ĐÂY ĐỂ REALTIME CHUẨN XÁC NHẤT
  const { profile } = useContext(AppContext)

  const currentUser = {
    name: profile?.userName || 'Người dùng',
    email: profile?.email || '',
    avatar: profile?.avatar || ''
  }

  const { data: requestData } = useQuery({
    queryKey: ['ListRequest'],
    queryFn: friendApi.getListFriendRequest
  })

  const requestCount = requestData?.data.result.length || 0

  return (
    <Sidebar collapsible='icon' className='overflow-hidden' {...props}>
      <div className='flex flex-row h-full w-full'>
        <SidebarPanel1
          navMain={navMain}
          activeItem={activeItem}
          setActiveItem={setActiveItem}
          hasUnreadMessages={hasUnreadMessages}
          currentUser={currentUser}
          requestCount={requestCount}
        />

        <SidebarPanel2
          activeItem={activeItem}
          isLoading={isLoading}
          chatList={chatList}
          setActiveChat={setActiveChat}
          setChatList={setChatList}
          profileId={profile?._id || ''}
          onSwitchToChat={() => setActiveItem(navMain[0])}
        />
      </div>
    </Sidebar>
  )
}
