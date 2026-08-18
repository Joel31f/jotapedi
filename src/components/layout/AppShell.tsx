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

  useEffect(() => {
    if (activeWorkspace) runScheduledAutomations.mutate()
  }, [activeWorkspace?.id])

  return (
    <div className="flex h-svh bg-background">
      <Sidebar />
      <MobileSidebar open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
