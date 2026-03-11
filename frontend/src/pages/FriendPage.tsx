import friendApi from '@/apis/friend.api'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import type { User } from '@/types/user.type'
import { getInitials } from '@/utils/common'
import { useQuery } from '@tanstack/react-query'
import { Users } from 'lucide-react'
import { useEffect } from 'react'

export default function FriendPage() {
  const { data } = useQuery({
    queryKey: ['friend'],
    queryFn: friendApi.getListFriend
  })

  const listFriends: User[] = data?.data.result || []

  useEffect(() => {}, [])

  return (
    <div className='flex flex-1 bg-gray-200 dark:bg-gray-900 flex-col text-foreground'>
      <div className='flex items-center bg-white dark:bg-background p-4 text-foreground'>
        <Users size={20} className='mr-3' />
        <h2 className='text-lg font-semibold text-center text-foreground '>Danh sách bạn bè</h2>
      </div>
      <div className='p-4 text-foreground'>
        <p className='font-semibold'>Bạn bè ({listFriends.length})</p>
      </div>
      <div className='text-foreground bg-white dark:bg-background rounded-sm mx-4'>
        <div className='relative w-1/2 mx-4 mb-2 mt-2'>
          <svg
            xmlns='http://www.w3.org/2000/svg'
            fill='none'
            viewBox='0 0 24 24'
            strokeWidth='1.5'
            stroke='currentColor'
            className='absolute left-3 h-5 w-5 text-gray-400 top-1/2 -translate-y-1/2'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              d='m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z'
            />
          </svg>

          <Input className='w-full pl-10' placeholder='Tìm bạn' />
        </div>
        <div className='mb-5'>
          {listFriends.map((friend) => {
            return (
              <div
                key={friend.userName}
                className='flex items-center mx-4 justify-between px-4 py-4 hover:bg-gray-900/10 dark:hover:bg-sidebar-accent  hover:rounded-sm text-foreground cursor-pointer'
              >
                <div className='flex items-center'>
                  {!friend.avatar && (
                    <Avatar className='h-12 w-12 mr-5 overflow-hidden text-foreground rounded-full border-gray-500'>
                      <AvatarImage src={friend?.avatar} alt={friend?.userName} />
                      <AvatarFallback className='font-semibold bg-blue-100 text-blue-600'>
                        {getInitials(friend?.userName)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  {friend?.avatar && (
                    <div className='h-12 w-12 mr-5 overflow-hidden text-foreground rounded-full border-gray-500'>
                      <img src={friend.avatar} alt='avatar' className='h-full w-full object-cover' />
                    </div>
                  )}
                  <p>{friend.userName}</p>
                </div>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke-width='1.5'
                  stroke='currentColor'
                  className='size-7'
                >
                  <path
                    stroke-linecap='round'
                    stroke-linejoin='round'
                    d='M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z'
                  />
                </svg>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
