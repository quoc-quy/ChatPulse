import friendApi from '@/apis/friend.api'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import type { User } from '@/types/user.type'
import { getInitials } from '@/utils/common'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Users, MoreHorizontal } from 'lucide-react'
import { toast } from 'react-toastify'
import userApi from '@/apis/user.api'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SearchModal from './SearchModal'
import { LeaveGroupModal } from '@/components/chat/info-panel/LeaveGroupModal'

export default function FriendPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [openInfo, setOpenInfo] = useState(false)

  // State cho Modal Hủy kết bạn
  const [unfriendModalOpen, setUnfriendModalOpen] = useState(false)
  const [userToUnfriend, setUserToUnfriend] = useState<string | null>(null)

  const queryClient = useQueryClient()
  const { data } = useQuery({
    queryKey: ['friendList'],
    queryFn: friendApi.getListFriend
  })

  const { data: blockedData } = useQuery({
    queryKey: ['blockedUsers'],
    queryFn: userApi.getListBlockedUser
  })

  const blockedIds = blockedData?.data.result?.map((item: any) => item.blocked_user_id) || []
  const listFriends: User[] = data?.data.result || []

  const unFriendMutation = useMutation({
    mutationFn: (friend_id: string) => friendApi.unFriend({ friend_id }),
    onSuccess: () => {
      toast.success('Hủy kết bạn thành công')
      queryClient.invalidateQueries({ queryKey: ['friendList'] })
    }
  })

  const blockUserMutation = useMutation({
    mutationFn: (blocked_user_id: string) => userApi.blockUser({ blocked_user_id }),
    onSuccess: (data) => {
      toast.success(data.data.message)
      queryClient.invalidateQueries({ queryKey: ['blockedUsers'] })
      queryClient.invalidateQueries({ queryKey: ['friendList'] })
    }
  })

  const unBlockMutation = useMutation({
    mutationFn: (user_id: string) => userApi.unBlockUser(user_id),
    onSuccess: (data) => {
      toast.success(data.data.message)
      queryClient.invalidateQueries({ queryKey: ['blockedUsers'] })
      queryClient.invalidateQueries({ queryKey: ['friendList'] })
    }
  })

  const handleUnfriend = (user_id: string) => {
    // Thay vì gọi trực tiếp API, mở modal xác nhận
    setUserToUnfriend(user_id)
    setUnfriendModalOpen(true)
  }

  const confirmUnfriend = () => {
    if (userToUnfriend) {
      unFriendMutation.mutate(userToUnfriend)
      setUserToUnfriend(null)
    }
  }

  const handleBlock = (friend_id: string) => blockUserMutation.mutate(friend_id)
  const handleUnBlock = (friend_id: string) => unBlockMutation.mutate(friend_id)

  const handleStartChat = (friend: User) => {
    navigate('/')
    window.dispatchEvent(new CustomEvent('start_chat_with_friend', { detail: friend }))
  }

  const filteredFriends = listFriends.filter((friend) => friend.userName.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className='flex flex-1 bg-gray-200 dark:bg-gray-900 flex-col text-foreground'>
      <div className='flex items-center bg-white dark:bg-background p-4 text-foreground'>
        <Users size={20} className='mr-3' />
        <h2 className='text-lg font-semibold text-center text-foreground '>Danh sách bạn bè</h2>
      </div>
      <div className='p-4 text-foreground'>
        <p className='font-semibold'>Bạn bè ({listFriends.length})</p>
      </div>
      <div className='text-foreground bg-white dark:bg-background rounded-sm mx-4'>
        <div className='relative w-1/2 mx-4 mb-2 mt-2'>
          <svg
            xmlns='http://www.w3.org/2000/svg'
            fill='none'
            viewBox='0 0 24 24'
            strokeWidth='1.5'
            stroke='currentColor'
            className='absolute left-3 h-5 w-5 text-gray-400 top-1/2 -translate-y-1/2'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              d='m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z'
            />
          </svg>
          <Input
            className='w-full pl-10'
            placeholder='Tìm bạn'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className='mb-5'>
          {filteredFriends.map((friend) => {
            const isBlocked = blockedIds.includes(friend._id)
            return (
              <div
                key={friend.userName}
                onClick={() => handleStartChat(friend)}
                className='flex items-center mx-4 justify-between px-4 py-4 hover:bg-gray-900/10 dark:hover:bg-sidebar-accent hover:rounded-sm text-foreground cursor-pointer transition-colors'
              >
                <div className='flex items-center'>
                  {!friend.avatar ? (
                    <Avatar className='h-12 w-12 mr-5 overflow-hidden text-foreground rounded-full border-gray-500'>
                      <AvatarImage src={friend?.avatar} alt={friend?.userName} />
                      <AvatarFallback className='font-semibold bg-blue-100 text-blue-600'>
                        {getInitials(friend?.userName)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className='h-12 w-12 mr-5 overflow-hidden text-foreground rounded-full border-gray-500'>
                      <img src={friend.avatar} alt='avatar' className='h-full w-full object-cover' />
                    </div>
                  )}
                  <p className='font-medium'>{friend.userName}</p>
                </div>

                {/* NGĂN CHẶN SỰ KIỆN NỔI BỌT KHI CLICK VÀO DẤU 3 CHẤM */}
                <div onClick={(e) => e.stopPropagation()}>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className='p-1 rounded hover:bg-gray-300 dark:hover:bg-gray-700 cursor-pointer transition-colors'>
                        <MoreHorizontal className='size-6' />
                      </button>
                    </PopoverTrigger>

                    <PopoverContent align='end' className='w-48 p-2 border-gray-200 dark:border-gray-700/50'>
                      <div className='flex flex-col gap-1'>
                        <button
                          onClick={() => {
                            setSelectedUser({ ...friend, isBlocked: blockedIds.includes(friend._id), isFriend: true })
                            setOpenInfo(true)
                          }}
                          className='text-left px-3 py-2 hover:bg-gray-100 rounded cursor-pointer dark:hover:bg-sidebar-accent'
                        >
                          Xem thông tin
                        </button>
                        <div className='border border-gray-200' />
                        <button
                          onClick={() => (isBlocked ? handleUnBlock(friend._id) : handleBlock(friend._id))}
                          className='text-left px-3 py-2 hover:bg-gray-100 rounded cursor-pointer dark:hover:bg-sidebar-accent'
                          disabled={blockUserMutation.isPending || unBlockMutation.isPending}
                        >
                          {isBlocked ? 'Gỡ chặn người dùng' : 'Chặn người dùng'}
                        </button>
                        <div className='border border-gray-200' />
                        <button
                          onClick={() => handleUnfriend(friend._id)} // Đã sửa lại để gọi modal
                          className='text-left px-3 py-2 hover:bg-gray-100 rounded text-red-500 cursor-pointer dark:hover:bg-sidebar-accent'
                        >
                          Hủy kết bạn
                        </button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )
          })}
          {selectedUser && <SearchModal open={openInfo} onOpenChange={setOpenInfo} user={selectedUser} />}
        </div>
      </div>

      {/* TÍCH HỢP MODAL HỦY KẾT BẠN */}
      <LeaveGroupModal
        isOpen={unfriendModalOpen}
        onClose={() => setUnfriendModalOpen(false)}
        mode='unfriend' // Thiết lập mode là Hủy kết bạn
        title='Xác nhận hủy kết bạn'
        description='Sau khi hủy kết bạn, bạn sẽ không thể nhắn tin hay gọi điện cho người đó nữa. Bạn có chắc chắn muốn tiếp tục không?'
        confirmText='Hủy kết bạn'
        onConfirm={confirmUnfriend}
      />
    </div>
  )
}
