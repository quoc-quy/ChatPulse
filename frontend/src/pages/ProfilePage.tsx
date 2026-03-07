import userApi from '@/apis/user.api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'

export default function ProfilePage() {
  const { data: userData } = useQuery({
    queryKey: ['profile'],
    queryFn: userApi.getMe
  })

  const { register, reset, setValue, watch } = useForm()

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
    <div className='flex flex-1 flex-col bg-muted/10 p-8'>
      <h2 className='text-2xl font-semibold mb-8 text-center text-foreground'>Hồ sơ của tôi</h2>

      {/* Avatar */}
      <div className='flex flex-col items-center mb-8 gap-4'>
        <div className='h-28 w-28 overflow-hidden text-foreground rounded-full border'>
          <img src={profile?.avatar} alt='avatar' className='h-full w-full object-cover' />
        </div>
      </div>

      <form className='w-full'>
        {/* grid 2 cột */}
        <div className='grid grid-cols-2 gap-6'>
          <div>
            <Label className='text-sm font-medium text-foreground'>User Name</Label>
            <Input {...register('userName')} />
          </div>

          <div>
            <Label className='text-sm font-medium text-foreground'>Email</Label>
            <Input {...register('email')} type='email' />
          </div>

          <div>
            <Label className='text-sm font-medium text-foreground'>Date of Birth</Label>
            <Input {...register('date_of_birth')} type='date' />
          </div>

          <div>
            <Label className='text-sm font-medium text-foreground'>Phone</Label>
            <Input {...register('phone')} />
          </div>

          <div>
            <Label className='text-sm font-medium text-foreground'>Gender</Label>

            <RadioGroup
              value={watch('gender')}
              className='flex gap-6 mt-2'
              onValueChange={(value) => setValue('gender', value)}
            >
              <div className='flex text-foreground items-center space-x-2'>
                <RadioGroupItem value='male' id='male' />
                <Label htmlFor='male'>Male</Label>
              </div>

              <div className='flex text-foreground items-center space-x-2'>
                <RadioGroupItem value='female' id='female' />
                <Label htmlFor='female'>Female</Label>
              </div>
            </RadioGroup>
          </div>

          {/* bio full row */}
          <div className='col-span-2'>
            <Label className='text-sm font-medium text-foreground'>Bio</Label>
            <textarea
              {...register('bio')}
              placeholder='Nhập giới thiệu bản thân...'
              className='w-full mt-2 min-h-[120px] shadow-xs text-foreground rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'
            />
          </div>
        </div>

        <div className='flex justify-center mt-8'>
          <Button type='submit' className='px-10'>
            Cập nhật hồ sơ
          </Button>
        </div>
      </form>
    </div>
  )
}
