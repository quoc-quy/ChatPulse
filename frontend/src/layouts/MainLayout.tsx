/* eslint-disable @typescript-eslint/no-explicit-any */
import { AppSidebar } from '@/components/sidebars/AppSidebar'
import { GlobalCallUI } from '@/components/chat/GlobalCallUI'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { useContext, useEffect, useRef } from 'react'
import { AppContext } from '@/context/app.context'
import userApi from '@/apis/user.api'
import { toast } from 'sonner'
import { E2E } from '@/utils/e2e.utils'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { profile, setProfile } = useContext(AppContext)
  const isE2EInitialized = useRef(false)

  useEffect(() => {
    if (profile && !isE2EInitialized.current) {
      const storageKey = `rsa_private_key_${profile._id}`
      const localPrivateKey = localStorage.getItem(storageKey)

      const syncKeys = async () => {
        isE2EInitialized.current = true
        try {
          // Trường hợp 1: Thiết bị mới, chưa có khóa Private Key → Tạo mới cặp khóa
          if (!localPrivateKey) {
            const { privateKey, publicKey } = E2E.generateRSAKeys()
            localStorage.setItem(storageKey, privateKey)
            await userApi.updateMe({
              public_key: publicKey
            })
            setProfile((prev: any) => (prev ? { ...prev, public_key: publicKey } : null))
            toast.info('Đã thiết lập mã hóa đầu cuối cho thiết bị này.')
          }
          // Trường hợp 2: Có khóa máy nhưng server bị mất (do reset data...) → Phục hồi Public Key
          else if (!profile.public_key) {
            // thay vì dùng (window as any).JSEncrypt (không tồn tại, gây lỗi runtime)
            const publicKey = E2E.extractPublicKeyFromPrivate(localPrivateKey)
            if (publicKey) {
              await userApi.updateMe({ public_key: publicKey })
              setProfile((prev: any) => (prev ? { ...prev, public_key: publicKey } : null))
            }
          }
          // Trường hợp 3: Cả 2 đều có → không cần làm gì
        } catch (error) {
          console.error('[E2E Sync Error]', error)
          isE2EInitialized.current = false
        }
      }
      syncKeys()
    }
  }, [profile, setProfile])

  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': '24rem',
          '--sidebar-width-icon': '4rem'
        } as React.CSSProperties
      }
    >
      <AppSidebar />
      <SidebarInset>{children}</SidebarInset>
      <GlobalCallUI />
    </SidebarProvider>
  )
}
