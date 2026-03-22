import friendApi from '@/apis/friend.api'
import { useQuery } from '@tanstack/react-query'
import { GroupIcon, MailPlus, UserPlus, Users, UserX } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function PhoneBook() {
  const { data: requestData } = useQuery({
    queryKey: ['ListRequest'],
    queryFn: friendApi.getListFriendRequest
  })

  const requestCount = requestData?.data.result.length || 0

  return (
    <div>
      <div className='p-2 flex items-center hover:bg-gray-900/10 text-foreground cursor-pointer'>
        <Users size={20} className='mr-3' />
        <Link to={'/phonebook/friend-list'} className='text-base font-medium text-foreground p-2 text-center'>
          Danh sách bạn bè
        </Link>
      </div>
      <div className='p-2 flex items-center hover:bg-gray-900/10 text-foreground cursor-pointer'>
        <GroupIcon size={20} className='mr-3' />
        <Link to={'/phonebook/friend-request'} className='text-base font-medium text-foreground p-2 text-center'>
          Lời mời kết bạn đã gửi
        </Link>
      </div>
      <div className='p-2 flex items-center hover:bg-gray-900/10 text-foreground cursor-pointer relative'>
        <UserPlus size={20} className='mr-3' />

        <Link to={'/phonebook/friend-invitation'} className='text-base font-medium text-foreground p-2 text-center'>
          Lời mời kết bạn
        </Link>

        {/* badge */}
        {requestCount > 0 && (
          <span className='absolute right-3 flex items-center justify-center min-w-[18px] h-5 px-1 text-xs font-bold text-white bg-red-500 rounded-full'>
            {requestCount}
          </span>
        )}
      </div>
      <div className='p-2 flex items-center hover:bg-gray-900/10 text-foreground cursor-pointer'>
        <UserX size={20} className='mr-3' />
        <Link to={'/phonebook/blocking'} className='text-base font-medium text-foreground p-2 text-center'>
          Danh sách chặn
        </Link>
      </div>
    </div>
  )
}
