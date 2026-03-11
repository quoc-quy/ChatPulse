import userApi from '@/apis/user.api'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import type { User } from '@/types/user.type'
import { getInitials } from '@/utils/common'
import { useQuery } from '@tanstack/react-query'
import { UserX } from 'lucide-react'

export default function BlockUserPage() {
  const { data } = useQuery({
    queryKey: ['list'],
    queryFn: userApi.getListBlockedUser
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listBlockedUser: User[] = data?.data.result?.map((item: any) => item.user) || []

  return (
    <div className='flex flex-1 bg-gray-200 dark:bg-gray-900 flex-col text-foreground'>
      <div className='flex items-center bg-white dark:bg-background p-4 text-foreground'>
        <UserX size={20} className='mr-3' />
        <h2 className='text-lg font-semibold text-center text-foreground '>Danh sách chặn</h2>
      </div>
      <div className='p-4 text-foreground'>
        <p className='font-semibold'>Số người dùng chặn ({listBlockedUser.length})</p>
      </div>
      <div className='text-foreground bg-white dark:bg-background rounded-sm mx-4'>
        <div className='mb-5 mt-5'>
          {listBlockedUser.map((user, index) => {
            return (
              <div
                key={index}
                className='flex items-center mx-4 justify-between px-4 py-4 hover:bg-gray-900/10 dark:hover:bg-sidebar-accent  hover:rounded-sm text-foreground cursor-pointer'
              >
                <div className='flex items-center'>
                  {!user.avatar && (
                    <Avatar className='h-12 w-12 mr-5 overflow-hidden text-foreground rounded-full border-gray-500'>
                      <AvatarImage src={user?.avatar} alt={user?.userName} />
                      <AvatarFallback className='font-semibold bg-blue-100 text-blue-600'>
                        {getInitials(user?.userName)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  {user?.avatar && (
                    <div className='h-12 w-12 mr-5 overflow-hidden text-foreground rounded-full border-gray-500'>
                      <img src={user.avatar} alt='avatar' className='h-full w-full object-cover' />
                    </div>
                  )}
                  <p>{user.userName}</p>
                </div>
                <Button className='cursor-pointer'>Bỏ chặn</Button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
