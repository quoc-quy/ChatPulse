/* eslint-disable @typescript-eslint/no-explicit-any */
import { AppSidebar } from '@/components/sidebars/AppSidebar'
import { GlobalCallUI } from '@/components/chat/GlobalCallUI'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import React from 'react'

export default function MainLayout({ children }: { children: React.ReactNode }) {
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
