import friendApi from '@/apis/friend.api'
import type { User } from '@/types/user.type'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'

export default function FriendPage() {
  const { data } = useQuery({
    queryKey: ['friend'],
    queryFn: friendApi.getListFriend
  })

  const listFriends: User[] = data?.data.result || []

  useEffect(() => {}, [])

  return (
    <div className='flex flex-1 flex-col bg-muted/10 p-8'>
      <h2 className='text-2xl font-semibold mb-8 text-center text-foreground'>Danh sách bạn bè</h2>
      {listFriends.map((friend) => {
        return (
          <div className='flex items-center justify-between p-2 hover:bg-gray-900/10 text-foreground cursor-pointer'>
            <div className='flex items-center'>
              <div className='h-14 w-14 mr-5 overflow-hidden text-foreground rounded-full border'>
                <img src={friend.avatar} alt='avatar' className='h-full w-full object-cover' />
              </div>
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
  )
}
