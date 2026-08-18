import { Sheet, SheetContent } from '@/components/ui/sheet'
import { SidebarContent } from '@/components/layout/Sidebar'

export function MobileSidebar({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-64 p-0">
        <SidebarContent onNavigate={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  )
}
