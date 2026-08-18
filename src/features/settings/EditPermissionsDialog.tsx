import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { PermissionsFields } from '@/features/settings/PermissionsFields'
import { useUpdateMemberPermissions } from '@/features/settings/teamApi'
import { DEFAULT_ATENDENTE_ACCESS, FULL_ACCESS } from '@/config/sections'
import type { Database, SectionAccess, UserRole } from '@/types/database'

type UserRow = Database['public']['Tables']['users']['Row']

export function EditPermissionsDialog({
  open,
  onOpenChange,
  member,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: UserRow | null
}) {
  const [role, setRole] = useState<UserRole>('member')
  const [sectionAccess, setSectionAccess] = useState<SectionAccess>(FULL_ACCESS)
  const [canViewAllRecords, setCanViewAllRecords] = useState(true)
  const updatePermissions = useUpdateMemberPermissions()

  useEffect(() => {
    if (open && member) {
      setRole(member.role)
      setSectionAccess(member.section_access)
      setCanViewAllRecords(member.can_view_all_records)
    }
  }, [open, member])

  const handleRoleChange = (nextRole: UserRole) => {
    setRole(nextRole)
    if (nextRole === 'admin') {
      setSectionAccess(FULL_ACCESS)
      setCanViewAllRecords(true)
    } else {
      setSectionAccess(DEFAULT_ATENDENTE_ACCESS)
      setCanViewAllRecords(false)
    }
  }

  const handleSave = async () => {
    if (!member) return
    try {
      await updatePermissions.mutateAsync({ id: member.id, role, section_access: sectionAccess, can_view_all_records: canViewAllRecords })
      toast.success('Permissões atualizadas')
      onOpenChange(false)
    } catch (error) {
      toast.error('Não foi possível salvar', { description: error instanceof Error ? error.message : undefined })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Permissões — {member?.name || member?.email}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <PermissionsFields
            role={role}
            onRoleChange={handleRoleChange}
            sectionAccess={sectionAccess}
            onSectionAccessChange={setSectionAccess}
            canViewAllRecords={canViewAllRecords}
            onCanViewAllRecordsChange={setCanViewAllRecords}
          />
          <DialogFooter>
            <Button onClick={handleSave} disabled={updatePermissions.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
