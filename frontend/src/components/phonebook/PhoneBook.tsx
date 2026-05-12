import friendApi from '@/apis/friend.api'
import { useQuery } from '@tanstack/react-query'
import { GroupIcon, UserPlus, Users, UserX } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'

export default function PhoneBook() {
  const { data: requestData, isLoading } = useQuery({
    queryKey: ['ListRequest'],
    queryFn: friendApi.getListFriendRequest
  })

  if (isLoading) {
    return (
      <div className='flex flex-col gap-2 p-2'>
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className='p-2 flex items-center'>
            <Skeleton className='w-5 h-5 rounded-full mr-3 shrink-0' />
            <Skeleton className='h-5 w-3/4 rounded-md' />
          </div>
        ))}
      </div>
    )
  }

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
