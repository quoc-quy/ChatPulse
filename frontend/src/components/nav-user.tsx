import { LogOut, ChevronsUpDown, Sun, Moon, Monitor } from 'lucide-react'
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
import { useTheme } from '@/context/theme.context'

export function NavUser({ user }: { user: { name: string; email: string; avatar: string } }) {
  const { isMobile } = useSidebar()
  const { theme, setTheme } = useTheme()

  // Hàm lấy chữ cái đầu tiên và viết hoa
  const getInitials = (name: string) => {
    if (!name) return ''
    return name.charAt(0).toUpperCase()
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size='lg'
              className='cursor-pointer hover:bg-transparent data-[state=open]:bg-transparent md:h-12 md:p-0'
            >
              <Avatar className='h-12 w-12 rounded-lg'>
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className='font-semibold bg-blue-100 text-blue-600'>
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className='grid flex-1 text-left text-sm leading-tight'>
                <span className='truncate font-semibold'>{user.name}</span>
                <span className='truncate text-xs'>{user.email}</span>
              </div>
              <ChevronsUpDown className='ml-auto size-4' />
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
                <Avatar className='h-8 w-8 rounded-lg'>
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className='font-semibold bg-blue-100 text-blue-600'>
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className='grid flex-1 text-left text-sm leading-tight'>
                  <span className='truncate font-semibold'>{user.name}</span>
                  <span className='truncate text-xs'>{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {/* --- THÊM SUB-MENU GIAO DIỆN Ở ĐÂY --- */}
            <DropdownMenuGroup>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  {/* Hiển thị icon chuẩn xác dựa trên giá trị đã chọn */}
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
            {/* ---------------------------------- */}

            <DropdownMenuSeparator />
            <DropdownMenuItem className='text-red-600'>
              <LogOut className='mr-2 h-4 w-4' />
              Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
