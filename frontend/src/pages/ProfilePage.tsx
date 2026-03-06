import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ProfilePage() {
  return (
    <div className='flex flex-1 flex-col bg-muted/10 p-8'>
      <h2 className='text-2xl font-semibold mb-8 text-center text-foreground'>Hồ sơ của tôi</h2>

      {/* Avatar */}
      <div className='flex flex-col items-center mb-8 gap-4'>
        <div className='h-28 w-28 overflow-hidden text-foreground rounded-full border'>
          <img alt='avatar' className='h-full w-full object-cover' />
        </div>
      </div>

      <form className='w-full'>
        {/* grid 2 cột */}
        <div className='grid grid-cols-2 gap-6'>
          <div>
            <Label className='text-sm font-medium text-foreground'>User Name</Label>
            <Input name='userName' />
          </div>

          <div>
            <Label className='text-sm font-medium text-foreground'>Email</Label>
            <Input name='email' type='email' />
          </div>

          <div>
            <Label className='text-sm font-medium text-foreground'>Password</Label>
            <Input name='password' type='password' />
          </div>

          <div>
            <Label className='text-sm font-medium text-foreground'>Date of Birth</Label>
            <Input name='date_of_birth' type='date' />
          </div>

          <div>
            <Label className='text-sm font-medium text-foreground'>Phone</Label>
            <Input name='phone' />
          </div>

          <div>
            <Label className='text-sm font-medium text-foreground'>Gender</Label>
            <Input name='gender' placeholder='male / female' />
          </div>

          {/* bio full row */}
          <div className='col-span-2'>
            <Label className='text-sm font-medium text-foreground'>Bio</Label>
            <textarea
              name='bio'
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
