import searchApi from '@/apis/search.api'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import SearchModal from './SearchModal'
import type { User } from '@/types/user.type'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function AddFriendModal({ open, onOpenChange }: Props) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors }
  } = useForm()
  const [user, setUser] = useState<User | null>(null)
  const [openInfo, setOpenInfo] = useState(false)

  const searchUserMutation = useMutation({
    mutationFn: (phone: string) =>
      searchApi.advancedSearch({
        phone
      })
  })

  const onSubmit = (data: any) => {
    searchUserMutation.mutate(data.phone, {
      onSuccess: (res) => {
        console.log(res)
        const users = res.data.result.users

        if (users.length > 0) {
          setUser(users[0])
          setOpenInfo(true)
        } else {
          setError('phone', {
            type: 'manual',
            message: 'Không tìm thấy người dùng'
          })
        }
      },
      onError: (error: any) => {
        const message = error?.response?.data?.errors.phone.msg || 'Có lỗi xảy ra'

        setError('phone', {
          type: 'server',
          message
        })
      }
    })
  }

  return (
    <div>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto text-foreground'>
          <DialogHeader>
            <DialogTitle className='text-center text-xl'>Thêm bạn</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className='w-full mb-5'>
            <div className='flex'>
              <Label className='w-1/3'>Số điện thoại</Label>
              <Input placeholder='Nhập số điện thoại' {...register('phone')} />
            </div>
            {errors.phone && (
              <p className='text-red-500 text-sm ml-[25%] mt-2 italic'>{errors.phone.message as string}</p>
            )}
            <div className='flex justify-end gap-2 mt-8'>
              <Button
                type='submit'
                onClick={() => onOpenChange(false)}
                className='px-10 cursor-pointer bg-gray-600 hover:bg-gray-700'
              >
                Hủy
              </Button>
              <Button type='submit' className='px-10 cursor-pointer' disabled={searchUserMutation.isPending}>
                {searchUserMutation.isPending ? 'Đang tìm...' : 'Tìm kiếm'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {user && <SearchModal open={openInfo} onOpenChange={setOpenInfo} user={user} />}
    </div>
  )
}
