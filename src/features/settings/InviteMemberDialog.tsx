import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PermissionsFields } from '@/features/settings/PermissionsFields'
import { useInviteMember } from '@/features/settings/teamApi'
import { DEFAULT_ATENDENTE_ACCESS, FULL_ACCESS } from '@/config/sections'
import type { SectionAccess, UserRole } from '@/types/database'

export function InviteMemberDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('member')
  const [sectionAccess, setSectionAccess] = useState<SectionAccess>(DEFAULT_ATENDENTE_ACCESS)
  const [canViewAllRecords, setCanViewAllRecords] = useState(false)
  const inviteMember = useInviteMember()

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await inviteMember.mutateAsync({ email: email.trim(), role, section_access: sectionAccess, can_view_all_records: canViewAllRecords })
      toast.success('Acesso liberado para esse email', {
        description: 'Nenhum email é enviado — avise a pessoa para se cadastrar no Jotapedi usando exatamente esse endereço.',
      })
      setEmail('')
      setRole('member')
      setSectionAccess(DEFAULT_ATENDENTE_ACCESS)
      setCanViewAllRecords(false)
      onOpenChange(false)
    } catch (error) {
      toast.error('Não foi possível convidar', { description: error instanceof Error ? error.message : undefined })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Liberar acesso para um membro</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-email">Email</Label>
            <Input id="invite-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              Isso não envia email — avise a pessoa para se cadastrar no Jotapedi usando exatamente este endereço.
            </p>
          </div>

          <PermissionsFields
            role={role}
            onRoleChange={handleRoleChange}
            sectionAccess={sectionAccess}
            onSectionAccessChange={setSectionAccess}
            canViewAllRecords={canViewAllRecords}
            onCanViewAllRecordsChange={setCanViewAllRecords}
          />

          <DialogFooter>
            <Button type="submit" disabled={inviteMember.isPending}>
              Liberar acesso
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
