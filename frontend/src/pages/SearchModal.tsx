import userApi from '@/apis/user.api'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import type { User } from '@/types/user.type'
import { getInitials } from '@/utils/common'
import { useMutation } from '@tanstack/react-query'
import { UserX } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User
}

export default function SearchModal({ open, onOpenChange, user }: Props) {
  const queryClient = useQueryClient()
  const blockUserMutation = useMutation({
    mutationFn: (blocked_user_id: string) => userApi.blockUser({ blocked_user_id }),
    onSuccess: (data) => {
      toast.success(data.data.message)

      queryClient.invalidateQueries({
        queryKey: ['blockedUsers']
      })
    }
  })

  const unBlockMutation = useMutation({
    mutationFn: (user_id: string) => userApi.unBlockUser(user_id),
    onSuccess: (data) => {
      toast.success(data.data.message)

      queryClient.invalidateQueries({
        queryKey: ['blockedUsers']
      })
    }
  })

  const handleToggleBlock = () => {
    if (user.isBlocked) {
      unBlockMutation.mutate(user._id)
    } else {
      blockUserMutation.mutate(user._id)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md'>
        <DialogHeader>
          <DialogTitle className='text-center font-semibold text-xl'>Thông tin tài khoản</DialogTitle>
        </DialogHeader>

        {/* Avatar */}
        <div className='flex flex-col items-center gap-4'>
          <div className='h-28 w-28 overflow-hidden rounded-full'>
            {!user?.avatar && (
              <Avatar className='h-full w-full object-cover overflow-hidden text-foreground rounded-full border-gray-500'>
                <AvatarImage alt={user?.userName} />
                <AvatarFallback className='text-3xl font-semibold bg-blue-100 text-blue-600'>
                  {getInitials(user?.userName)}
                </AvatarFallback>
              </Avatar>
            )}
            {user?.avatar && <img src={user.avatar} alt='avatar' className='h-full w-full object-cover' />}
          </div>
        </div>

        <div className='flex flex-col items-center gap-4'>
          <div className='text-lg font-semibold'>{user.userName}</div>

          <Button className={`px-10 cursor-pointer ${user.isFriend ? 'bg-red-700 hover:bg-red-900' : ''}`}>
            {user.isFriend ? 'Hủy kết bạn' : 'Kết bạn'}
          </Button>
        </div>
        <div className='bg-gray-300 h-2 w-[calc(100%+3rem)] -mx-6' />
        <div className='p-2 flex gap-5 flex-col'>
          <h1 className='font-semibold text-left text-xl'>Thông tin cá nhân</h1>
          <div className='flex'>
            <Label className='w-1/3 text-gray-400'>Bio</Label>
            <div className='text-sm'>{user.bio}</div>
          </div>
          <div className='flex'>
            <Label className='w-1/3 text-gray-400'>Số điện thoại</Label>
            <div className='text-sm'>{user.phone}</div>
          </div>
          <div className='flex'>
            <Label className='w-1/3 text-gray-400'>Giới tính</Label>
            <div className='text-sm'>{user.gender}</div>
          </div>
          <div className='flex'>
            <Label className='w-1/3 text-gray-400'>Ngày sinh</Label>
            <div className='text-sm'>{user.date_of_birth.slice(0, 10)}</div>
          </div>
        </div>
        <div className='bg-gray-300 h-2 w-[calc(100%+3rem)] -mx-6' />
        <div
          className='flex gap-5 focus:bg-accent 
                focus:text-accent-foreground 
                relative items-center
                rounded-sm px-2 py-1.5 text-md outline-hidden 
                select-none 
                [&_svg]:pointer-events-none 
                [&_svg]:shrink-0 
                [&_svg]:size-4
                hover:bg-accent
                cursor-pointer
                w-full
                '
          onClick={handleToggleBlock}
        >
          <UserX size={20} className='mr-3' />
          <button className='cursor-pointer'>{user.isBlocked ? 'Gỡ chặn người dùng' : 'Chặn người dùng'}</button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
