/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import userApi, { type BodyUpdateProfile } from '@/apis/user.api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useContext, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/utils/common'
import { toast } from 'react-toastify'
import { setProfileFromLS, setProfileToLS } from '@/utils/auth'
import { AppContext } from '@/context/app.context'
import { Camera, Loader2 } from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ProfilePage({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { setProfile: setGlobalProfile } = useContext(AppContext)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors }
  } = useForm()
  const { data: userData } = useQuery({
    queryKey: ['profile'],
    queryFn: userApi.getMe
  })

  const updateMeMutation = useMutation({
    mutationFn: userApi.updateMe
  })

  const uploadAvatarMutation = useMutation({
    mutationFn: userApi.uploadAvatar,
    onSuccess: (res) => {
      try {
        const newUser = res.data.result.user
        toast.success('Cập nhật ảnh đại diện thành công')

        if (setGlobalProfile) setGlobalProfile(newUser)
        if (setProfileToLS) setProfileToLS(newUser)

        queryClient.invalidateQueries({ queryKey: ['profile'] })
      } catch (err) {
        console.error('Lỗi khi đồng bộ dữ liệu sau upload:', err)
      }
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || 'Lỗi khi upload ảnh đại diện'
      toast.error(msg)
    }
  })

  const handleUpdateMe = handleSubmit((data) => {
    updateMeMutation.mutate(data as BodyUpdateProfile, {
      onSuccess: () => {
        toast.success('Cập nhật thông tin thành công')

        queryClient.invalidateQueries({
          queryKey: ['profile']
        })

        onOpenChange(false)
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

  // Xử lý khi chọn ảnh
  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileFromLocal = event.target.files?.[0]
    if (!fileFromLocal) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(fileFromLocal.type)) {
      toast.error('Ảnh chỉ hỗ trợ định dạng JPG, PNG hoặc WEBP')
      event.target.value = ''
      return
    }

    if (fileFromLocal.size > 5 * 1024 * 1024) {
      toast.error('Kích thước ảnh tối đa là 5MB')
      event.target.value = ''
      return
    }

    const formData = new FormData()
    formData.append('avatar', fileFromLocal)
    uploadAvatarMutation.mutate(formData)

    event.target.value = ''
  }

  const profile = userData?.data.user

  useEffect(() => {
    if (profile) {
      reset({
        userName: profile.userName,
        email: profile.email,
        date_of_birth: profile.date_of_birth?.slice(0, 10),
        phone: profile.phone,
        gender: profile.gender,
        bio: profile.bio
      })
    }
  }, [profile, reset])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto text-foreground'>
        <DialogHeader>
          <DialogTitle className='text-center text-xl'>Hồ sơ của tôi</DialogTitle>
        </DialogHeader>

        {/* Avatar */}
        <div className='flex flex-col items-center mb-6 gap-4'>
          <div className='relative'>
            <div className='h-28 w-28 overflow-hidden rounded-full ring-2 ring-offset-2 ring-gray-100 dark:ring-gray-800 dark:ring-offset-background shadow-inner'>
              {!profile?.avatar ? (
                <Avatar className='h-full w-full object-cover overflow-hidden text-foreground rounded-full border-gray-500'>
                  <AvatarImage alt={profile?.userName} />
                  <AvatarFallback className='text-3xl font-semibold bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'>
                    {getInitials(profile?.userName)}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <img src={profile.avatar} alt='avatar' className='h-full w-full object-cover' />
              )}

              {uploadAvatarMutation.isPending && (
                <div className='absolute inset-0 bg-black/50 flex items-center justify-center rounded-full'>
                  <Loader2 className='w-8 h-8 text-white animate-spin' />
                </div>
              )}
            </div>

            {/* Lưu ý: button này CẦN type="button" để không trigger submit form */}
            <button
              type='button'
              disabled={uploadAvatarMutation.isPending}
              className='absolute bottom-0 right-0 h-9 w-9 rounded-full flex items-center justify-center shadow-lg border transition-colors cursor-pointer group bg-background border-border hover:bg-accent dark:hover:bg-slate-800 disabled:opacity-50'
              onClick={() => fileInputRef.current?.click()}
              title='Đổi ảnh đại diện'
            >
              <Camera className='h-4 w-4 text-muted-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400' />
            </button>

            <input
              type='file'
              accept='.jpg,.jpeg,.png,.webp'
              className='hidden'
              ref={fileInputRef}
              onChange={handleAvatarChange}
            />
          </div>
        </div>

        <form className='w-full' onSubmit={handleUpdateMe}>
          <div className='grid grid-cols-2 gap-6'>
            <div>
              <Label>User Name</Label>
              <Input {...register('userName')} />
              {errors.userName && <p className='text-red-500 text-sm mt-1'>{errors.userName.message as string}</p>}
            </div>

            <div>
              <Label>Email</Label>
              <Input {...register('email')} type='email' disabled />
            </div>

            <div>
              <Label>Date of Birth</Label>
              <Input {...register('date_of_birth')} type='date' />
              {errors.date_of_birth && (
                <p className='text-red-500 text-sm mt-1'>{errors.date_of_birth.message as string}</p>
              )}
            </div>

            <div>
              <Label>Phone</Label>
              <Input {...register('phone')} />
              {errors.phone && <p className='text-red-500 text-sm mt-1'>{errors.phone.message as string}</p>}
            </div>

            <div>
              <Label>Gender</Label>

              <RadioGroup
                value={watch('gender')}
                className='flex gap-6 mt-2'
                onValueChange={(value) => setValue('gender', value)}
              >
                <div className='flex items-center space-x-2'>
                  <RadioGroupItem value='male' id='male' />
                  <Label htmlFor='male'>Male</Label>
                </div>

                <div className='flex items-center space-x-2'>
                  <RadioGroupItem value='female' id='female' />
                  <Label htmlFor='female'>Female</Label>
                </div>
              </RadioGroup>
            </div>

            <div className='col-span-2'>
              <Label>Bio</Label>

              <textarea
                {...register('bio')}
                className='w-full mt-2 min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'
              />
            </div>
          </div>

          <div className='flex justify-center mt-8'>
            <Button type='submit' className='px-10 cursor-pointer' disabled={updateMeMutation.isPending}>
              {updateMeMutation.isPending ? 'Đang cập nhật...' : 'Cập nhật hồ sơ'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
