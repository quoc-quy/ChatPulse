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
          // Trường hợp 1: Thiết bị mới hoàn toàn chưa có khóa
          if (!localPrivateKey) {
            const { privateKey, publicKey } = E2E.generateRSAKeys()
            localStorage.setItem(storageKey, privateKey)
            await userApi.updateMe({ public_key: publicKey })
            setProfile((prev: any) => (prev ? { ...prev, public_key: publicKey } : null))
            toast.info('Đã thiết lập mã hóa đầu cuối cho thiết bị này.')
          }
          // Trường hợp 2: Đã có Local Key, cần kiểm tra đối chiếu với Server Key
          else {
            const extractedPublicKey = E2E.extractPublicKeyFromPrivate(localPrivateKey)

            // ✅ FIX ĐỒNG BỘ: Nếu khóa máy tính khác với khóa server -> Ép server lấy khóa của máy tính hiện tại
            if (extractedPublicKey && extractedPublicKey !== profile.public_key) {
              await userApi.updateMe({ public_key: extractedPublicKey })
              setProfile((prev: any) => (prev ? { ...prev, public_key: extractedPublicKey } : null))
              console.log('[E2E Sync] Đã cập nhật lại Public Key lên Server cho khớp với thiết bị.')
            }
          }
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
