import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { NAV_ITEMS } from '@/config/nav'
import { hasSectionAccess } from '@/config/sections'
import { useWorkspace } from '@/providers/WorkspaceProvider'

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { activeWorkspace, activeMembership } = useWorkspace()
  const visibleItems = NAV_ITEMS.filter((item) => hasSectionAccess(activeMembership, item.section))

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="flex size-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
          J
        </div>
        <span className="truncate font-semibold text-sidebar-foreground">
          {activeWorkspace?.name ?? 'Jotapedi'}
        </span>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
        {visibleItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground',
                isActive && 'bg-sidebar-accent text-sidebar-primary',
              )
            }
          >
            <item.icon className="size-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-border md:block">
      <SidebarContent />
    </aside>
  )
}

export { SidebarContent }
