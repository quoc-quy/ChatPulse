import { GroupIcon, MailPlus, UserPlus, Users, UserX } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function PhoneBook() {
  return (
    <div>
      <div className='p-2 flex items-center hover:bg-gray-900/10 text-foreground cursor-pointer'>
        <Users size={20} className='mr-3' />
        <Link to={'/phonebook'} className='text-base font-medium text-foreground p-2 text-center'>
          Danh sách bạn bè
        </Link>
      </div>
      <div className='p-2 flex items-center hover:bg-gray-900/10 text-foreground cursor-pointer'>
        <GroupIcon size={20} className='mr-3' />
        <Link to={'/phonebook'} className='text-base font-medium text-foreground p-2 text-center'>
          Danh sách nhóm và cộng đồng
        </Link>
      </div>
      <div className='p-2 flex items-center hover:bg-gray-900/10 text-foreground cursor-pointer'>
        <UserPlus size={20} className='mr-3' />
        <Link to={'/phonebook'} className='text-base font-medium text-foreground p-2 text-center'>
          Lời mời kết bạn
        </Link>
      </div>
      <div className='p-2 flex items-center hover:bg-gray-900/10 text-foreground cursor-pointer'>
        <MailPlus size={20} className='mr-3' />
        <Link to={'/phonebook'} className='text-base font-medium text-foreground p-2 text-center'>
          Lời mời vào nhóm
        </Link>
      </div>
      <div className='p-2 flex items-center hover:bg-gray-900/10 text-foreground cursor-pointer'>
        <UserX size={20} className='mr-3' />
        <Link to={'/phonebook'} className='text-base font-medium text-foreground p-2 text-center'>
          Danh sách chặn
        </Link>
      </div>
    </div>
  )
}
