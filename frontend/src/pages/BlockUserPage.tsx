import { UserPlus } from 'lucide-react'

export default function BlockUserPage() {
  return (
    <div className='flex flex-1 bg-gray-200 dark:bg-gray-900 flex-col text-foreground'>
      <div className='flex items-center bg-white dark:bg-background p-4 text-foreground'>
        <UserPlus size={20} className='mr-3' />
        <h2 className='text-lg font-semibold text-center text-foreground '>Danh sách chặn</h2>
      </div>
    </div>
  )
}
