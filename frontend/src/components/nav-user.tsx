import { LogOut, Sun, Moon, Monitor, User as UserIcon, AlertTriangle } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/context/theme.context'
import { clearLS } from '@/utils/auth'
import { AppContext } from '@/context/app.context'
import { useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ProfilePage from '@/pages/ProfilePage'

export function NavUser({ user }: { user: { name: string; email: string; avatar: string } }) {
  const [open, setOpen] = useState(false)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const { isMobile } = useSidebar()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()

  const { setIsAuthenticated, setProfile } = useContext(AppContext)

  const getInitials = (name?: string) => {
    if (!name) return ''
    return name.charAt(0).toUpperCase()
  }

  const executeLogout = () => {
    clearLS()
    setIsAuthenticated(false)
    setProfile(null)
    navigate('/signin')
  }

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size='lg'
                className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground mx-auto h-12 w-12 p-0 flex items-center justify-center rounded-full group-data-[collapsible=icon]:!w-12 group-data-[collapsible=icon]:!h-12 group-data-[collapsible=icon]:!p-0'
              >
                {/* HIỂN THỊ AVATAR GÓC TRÁI DƯỚI */}
                <Avatar className='h-full w-full rounded-lg border border-gray-200 dark:border-gray-800'>
                  <AvatarImage src={user.avatar} alt={user.name} className='object-cover' />
                  <AvatarFallback className='font-bold text-lg bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'>
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
              </SidebarMenuButton>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              className='w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg'
              side={isMobile ? 'bottom' : 'right'}
              align='end'
              sideOffset={4}
            >
              <DropdownMenuLabel className='p-0 font-normal'>
                <div className='flex items-center gap-2 px-1 py-1.5 text-left text-sm'>
                  {/* HIỂN THỊ AVATAR TRONG POPUP MENU */}
                  <Avatar className='h-8 w-8 rounded-lg'>
                    <AvatarImage src={user.avatar} alt={user.name} className='object-cover' />
                    <AvatarFallback className='font-semibold bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'>
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className='grid flex-1 text-left text-sm leading-tight'>
                    <span className='truncate font-semibold'>{user.name}</span>
                    <span className='truncate text-xs text-muted-foreground'>{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuGroup>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    {theme === 'light' && <Sun className='mr-2 h-4 w-4' />}
                    {theme === 'dark' && <Moon className='mr-2 h-4 w-4' />}
                    {theme === 'system' && <Monitor className='mr-2 h-4 w-4' />}
                    <span>Giao diện</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent className='ml-1'>
                      <DropdownMenuItem onClick={() => setTheme('light')}>
                        <Sun className='mr-2 h-4 w-4' />
                        <span>Sáng</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTheme('dark')}>
                        <Moon className='mr-2 h-4 w-4' />
                        <span>Tối</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTheme('system')}>
                        <Monitor className='mr-2 h-4 w-4' />
                        <span>Hệ thống</span>
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
              </DropdownMenuGroup>

              <DropdownMenuSeparator />
              <button
                className='focus:bg-accent focus:text-accent-foreground relative flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:size-4 hover:bg-accent cursor-pointer w-full'
                onClick={() => setOpen(true)}
              >
                <UserIcon className='mr-2 h-4 w-4' />
                Hồ sơ của tôi
              </button>

              {/* COMPONENT PROFILE */}
              <ProfilePage open={open} onOpenChange={setOpen} />

              <DropdownMenuSeparator />
              <DropdownMenuItem
                className='text-red-600 cursor-pointer focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-950/50'
                onSelect={(e) => {
                  e.preventDefault()
                  setIsLogoutModalOpen(true)
                }}
              >
                <LogOut className='mr-2 h-4 w-4' />
                Đăng xuất
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <Dialog open={isLogoutModalOpen} onOpenChange={setIsLogoutModalOpen}>
        <DialogContent className='sm:max-w-[400px] p-0 overflow-hidden border-0'>
          <div className='p-6 flex flex-col items-center text-center pt-8'>
            <div className='w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4'>
              <AlertTriangle className='w-7 h-7 text-red-600 dark:text-red-500' />
            </div>
            <DialogHeader className='space-y-2'>
              <DialogTitle className='text-xl font-bold text-center'>Đăng xuất tài khoản</DialogTitle>
              <div className='text-sm text-muted-foreground mt-2'>
                Bạn có chắc chắn muốn đăng xuất khỏi ChatPulse?
                <br />
                Bạn sẽ cần đăng nhập lại để tiếp tục trò chuyện.
              </div>
            </DialogHeader>
          </div>
          <DialogFooter className='p-4 sm:justify-center gap-3 sm:gap-4 flex-row justify-center'>
            <Button
              variant='outline'
              className='flex-1 border-gray-300 dark:border-gray-700 bg-transparent hover:bg-muted'
              onClick={() => setIsLogoutModalOpen(false)}
            >
              Hủy
            </Button>
            <Button
              variant='destructive'
              className='flex-1 bg-red-600 hover:bg-red-700 text-white'
              onClick={executeLogout}
            >
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
