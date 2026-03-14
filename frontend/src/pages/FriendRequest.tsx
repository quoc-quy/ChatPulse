import friendApi from '@/apis/friend.api'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { getInitials } from '@/utils/common'
import { useMutation, useQuery } from '@tanstack/react-query'
import { UserPlus } from 'lucide-react'
import { toast } from 'react-toastify'

export default function FriendRequest() {
  const { data, refetch } = useQuery({
    queryKey: ['ListRequestFriend'],
    queryFn: friendApi.getListRequestFriend
  })

  const cancelRequestFriendMutation = useMutation({
    mutationFn: (user_id: string) => friendApi.cancelRequestFriend(user_id),
    onSuccess: (data) => {
      refetch()
      toast.success(data.data.message)
    }
  })

  const handleCancelRequestFriend = (user_id: string) => {
    cancelRequestFriendMutation.mutate(user_id)
  }

  const listPendingFriend = data?.data.result || []

  return (
    <div className='flex flex-1 bg-gray-200 dark:bg-gray-900 flex-col text-foreground'>
      <div className='flex items-center bg-white dark:bg-background p-4 text-foreground'>
        <UserPlus size={20} className='mr-3' />
        <h2 className='text-lg font-semibold text-center text-foreground '>Danh sách lời mời kết bạn đã gửi</h2>
      </div>
      {listPendingFriend.length > 0 ? (
        <div>
          <div className='p-4 text-foreground'>
            <p className='font-semibold'>Lời mời kết bạn gửi đi ({listPendingFriend.length})</p>
          </div>
          <div className='text-foreground rounded-sm mx-4 py-2'>
            <div className='mb-5 mt-5'>
              <div className='grid grid-cols-3 gap-6 px-4 pb-6'>
                {listPendingFriend.map((request: any) => {
                  const user = request.receiver_info

                  return (
                    <div className='flex flex-col items-center bg-white dark:bg-background rounded-xl p-6 shadow-sm hover:shadow-md transition'>
                      {/* Avatar */}
                      {!user?.avatar ? (
                        <Avatar className='h-16 w-16 mb-3'>
                          <AvatarImage src={user?.avatar} alt={user?.userName} />
                          <AvatarFallback className='font-bold bg-blue-100 text-blue-600'>
                            {getInitials(user?.userName)}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className='h-16 w-16 rounded-full overflow-hidden mb-3'>
                          <img src={user?.avatar} alt='avatar' className='h-full w-full object-cover' />
                        </div>
                      )}

                      {/* Username */}
                      <p className='font-medium text-center mb-4'>{user?.userName}</p>

                      {/* Buttons */}
                      <Button
                        onClick={() => handleCancelRequestFriend(request._id)}
                        className='flex-1 hover:bg-red-700 bg-red-500 text-white cursor-pointer'
                      >
                        Hủy lời mời
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className='flex justify-center items-center h-screen text-foreground'>
          <h1 className='text-lg italic items-center'>Danh sách trống</h1>
        </div>
      )}
    </div>
  )
}
