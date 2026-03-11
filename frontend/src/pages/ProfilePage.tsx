import userApi from '@/apis/user.api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/utils/common'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ProfilePage({ open, onOpenChange }: Props) {
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto text-foreground'>
        <DialogHeader>
          <DialogTitle className='text-center text-xl'>Hồ sơ của tôi</DialogTitle>
        </DialogHeader>

        {/* Avatar */}
        <div className='flex flex-col items-center mb-6 gap-4'>
          <div className='h-28 w-28 overflow-hidden rounded-full'>
            {!profile.avatar && (
              <Avatar className='h-full w-full object-cover overflow-hidden text-foreground rounded-full border-gray-500'>
                <AvatarImage alt={profile.userName} />
                <AvatarFallback className='text-3xl font-semibold bg-blue-100 text-blue-600'>
                  {getInitials(profile.userName)}
                </AvatarFallback>
              </Avatar>
            )}
            {profile.avatar && <img src={profile?.avatar} alt='avatar' className='h-full w-full object-cover' />}
          </div>
        </div>

        <form className='w-full'>
          <div className='grid grid-cols-2 gap-6'>
            <div>
              <Label>User Name</Label>
              <Input {...register('userName')} />
            </div>

            <div>
              <Label>Email</Label>
              <Input {...register('email')} type='email' />
            </div>

            <div>
              <Label>Date of Birth</Label>
              <Input {...register('date_of_birth')} type='date' />
            </div>

            <div>
              <Label>Phone</Label>
              <Input {...register('phone')} />
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
            <Button type='submit' className='px-10 cursor-pointer'>
              Cập nhật hồ sơ
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
