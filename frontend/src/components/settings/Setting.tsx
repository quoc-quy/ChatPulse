import { Settings2 } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Settings() {
  return (
    <div>
      <div className='p-2 flex items-center hover:bg-gray-900/10 text-foreground cursor-pointer'>
        <Settings2 size={20} className='mr-3' />
        <Link to={'/settings/change-password'} className='text-base font-medium text-foreground p-2 text-center'>
          Thay đổi mật khẩu
        </Link>
      </div>
    </div>
  )
}
