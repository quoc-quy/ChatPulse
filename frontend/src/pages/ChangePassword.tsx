import type { ChangePasswordBody } from '@/apis/user.api'
import userApi from '@/apis/user.api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useMutation } from '@tanstack/react-query'
import { Settings } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'react-toastify'

export default function ChangePassword() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    reset
  } = useForm()

  const changePasswordMutation = useMutation({
    mutationFn: userApi.changePassword
  })

  const handleChangePassword = handleSubmit((data) => {
    changePasswordMutation.mutate(data as ChangePasswordBody, {
      onSuccess: () => {
        toast.success('Đổi mật khẩu thành công')
        reset()
      },
      onError: (error: any) => {
        const errorsFromBE = error?.response?.data?.errors

        if (errorsFromBE) {
          Object.keys(errorsFromBE).forEach((key) => {
            setError(key as any, {
              type: 'server',
              message: errorsFromBE[key].msg
            })
          })
        }
      }
    })
  })

  return (
    <div className='flex flex-1  dark:bg-gray-900 flex-col bg-white text-foreground'>
      <div className='flex items-center bg-white dark:bg-background p-4 text-foreground'>
        <Settings size={20} className='mr-3' />
        <h2 className='text-lg font-semibold text-center text-foreground'>Thay đổi mật khẩu</h2>
      </div>

      <form className='p-5 flex flex-col gap-10 text-foreground' onSubmit={handleChangePassword}>
        <div>
          <Label>Nhập lại mật khẩu cũ</Label>
          <Input type='password' {...register('old_password')} placeholder='Nhập lại mật khẩu...' />
          {errors.old_password && <p className='text-red-500 text-sm mt-1'>{errors.old_password.message as string}</p>}
        </div>

        <div>
          <Label>Nhập mật khẩu mới</Label>
          <Input type='password' {...register('password')} placeholder='Nhập mật khẩu mới...' />
          {errors.password && <p className='text-red-500 text-sm mt-1'>{errors.password.message as string}</p>}
        </div>

        <div>
          <Label>Nhập lại mật khẩu mới</Label>
          <Input type='password' {...register('confirm_password')} placeholder='Nhập lại mật khẩu mới...' />
          {errors.confirm_password && (
            <p className='text-red-500 text-sm mt-1'>{errors.confirm_password.message as string}</p>
          )}
        </div>

        <Button className='cursor-pointer'>Đổi mật khẩu</Button>
      </form>
    </div>
  )
}
