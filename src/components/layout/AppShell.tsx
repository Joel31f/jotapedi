import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileSidebar } from '@/components/layout/MobileSidebar'
import { Topbar } from '@/components/layout/Topbar'
import { useWorkspace } from '@/providers/WorkspaceProvider'
import { useRunScheduledAutomations } from '@/features/automations/api'

export function AppShell() {
  const { activeWorkspace } = useWorkspace()
  const runScheduledAutomations = useRunScheduledAutomations()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [sidebarHidden, setSidebarHidden] = useState(() => {
    try {
      return localStorage.getItem('jotapedi:sidebar-hidden') === '1'
    } catch {
      return false
    }
  })

  const toggleSidebar = () =>
    setSidebarHidden((prev) => {
      const next = !prev
      try {
        localStorage.setItem('jotapedi:sidebar-hidden', next ? '1' : '0')
      } catch {
        // sem storage disponível: só não lembra a escolha
      }
      return next
    })

  useEffect(() => {
    if (activeWorkspace) runScheduledAutomations.mutate()
  }, [activeWorkspace?.id])

  return (
    <div className="flex h-svh bg-background">
      {sidebarHidden ? null : <Sidebar />}
      <MobileSidebar open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          onOpenMobileNav={() => setMobileNavOpen(true)}
          sidebarHidden={sidebarHidden}
          onToggleSidebar={toggleSidebar}
        />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
