import friendApi from '@/apis/friend.api'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import type { User } from '@/types/user.type'
import { getInitials } from '@/utils/common'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Users } from 'lucide-react'
import { toast } from 'react-toastify'
import userApi from '@/apis/user.api'

export default function FriendPage() {
  const queryClient = useQueryClient()
  const { data } = useQuery({
    queryKey: ['friendList'],
    queryFn: friendApi.getListFriend
  })

  const { data: blockedData, refetch } = useQuery({
    queryKey: ['blockedUsers'],
    queryFn: userApi.getListBlockedUser
  })

  const blockedIds = blockedData?.data.result?.map((item: any) => item.blocked_user_id) || []

  const listFriends: User[] = data?.data.result || []

  const unFriendMutation = useMutation({
    mutationFn: (friend_id: string) => friendApi.unFriend({ friend_id }),
    onSuccess: () => {
      toast.success('Hủy kết bạn thành công')

      queryClient.invalidateQueries({
        queryKey: ['friendList']
      })
    }
  })

  const blockUserMutation = useMutation({
    mutationFn: (blocked_user_id: string) => userApi.blockUser({ blocked_user_id }),
    onSuccess: (data) => {
      toast.success(data.data.message)

      queryClient.invalidateQueries({ queryKey: ['blockedUsers'] })
      queryClient.invalidateQueries({ queryKey: ['friendList'] })
    }
  })

  const unBlockMutation = useMutation({
    mutationFn: (user_id: string) => userApi.unBlockUser(user_id),
    onSuccess: (data) => {
      toast.success(data.data.message)

      queryClient.invalidateQueries({ queryKey: ['blockedUsers'] })
      queryClient.invalidateQueries({ queryKey: ['friendList'] })
    }
  })

  const handleUnfriend = (user_id: string) => {
    unFriendMutation.mutate(user_id)
  }

  const handleBlock = (friend_id: string) => {
    blockUserMutation.mutate(friend_id)
  }

  const handleUnBlock = (friend_id: string) => {
    unBlockMutation.mutate(friend_id)
  }

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
            const isBlocked = blockedIds.includes(friend._id)
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
                <div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className='p-1 rounded hover:bg-gray-300 dark:hover:bg-gray-700 cursor-pointer'>
                        <svg
                          xmlns='http://www.w3.org/2000/svg'
                          viewBox='0 0 24 24'
                          fill='currentColor'
                          className='size-7'
                        >
                          <path
                            fill-rule='evenodd'
                            d='M4.5 12a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm6 0a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm6 0a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Z'
                            clip-rule='evenodd'
                          />
                        </svg>
                      </button>
                    </PopoverTrigger>

                    <PopoverContent align='end' className='w-48 p-2 border-gray-200'>
                      <div className='flex flex-col gap-1'>
                        <button className='text-left px-3 py-2 hover:bg-gray-100 rounded cursor-pointer'>
                          Xem thông tin
                        </button>

                        <div className='border border-gray-200' />

                        <button
                          onClick={() => {
                            if (isBlocked) {
                              handleUnBlock(friend._id)
                            } else {
                              handleBlock(friend._id)
                            }
                          }}
                          className='text-left px-3 py-2 hover:bg-gray-100 rounded cursor-pointer'
                          disabled={blockUserMutation.isPending || unBlockMutation.isPending}
                        >
                          {isBlocked ? 'Gỡ chặn người dùng' : 'Chặn người dùng'}
                        </button>

                        <div className='border border-gray-200' />

                        <button
                          onClick={() => handleUnfriend(friend._id)}
                          className='text-left px-3 py-2 hover:bg-gray-100 rounded text-red-500 cursor-pointer'
                        >
                          Hủy kết bạn
                        </button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
