import { useState } from 'react'
import { toast } from 'sonner'
import { Settings2, Trash2, UserPlus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { initialsOf } from '@/lib/format'
import { useWorkspace } from '@/providers/WorkspaceProvider'
import { useRemoveMember, useTeamMembersQuery } from '@/features/settings/teamApi'
import { InviteMemberDialog } from '@/features/settings/InviteMemberDialog'
import { EditPermissionsDialog } from '@/features/settings/EditPermissionsDialog'
import type { Database } from '@/types/database'

type UserRow = Database['public']['Tables']['users']['Row']

export function TeamTab() {
  const { isAdmin, activeMembership } = useWorkspace()
  const { data: members = [] } = useTeamMembersQuery()
  const removeMember = useRemoveMember()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<UserRow | null>(null)

  const handleRemove = async (id: string) => {
    try {
      await removeMember.mutateAsync(id)
      toast.success('Membro removido')
    } catch (error) {
      toast.error('Não foi possível remover', { description: error instanceof Error ? error.message : undefined })
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      {isAdmin ? (
        <div className="flex justify-end">
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="size-4" />
            Convidar membro
          </Button>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Membros ({members.length})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {members.map((member) => (
            <div key={member.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
              <Avatar className="size-8">
                <AvatarImage src={member.avatar_url ?? undefined} />
                <AvatarFallback className="text-xs">{initialsOf(member.name || member.email)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">{member.name || member.email}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {member.email} {!member.joined_at ? <Badge variant="outline">Pendente</Badge> : null}
                </p>
              </div>
              <Badge variant="secondary">{member.role === 'admin' ? 'Admin' : 'Membro'}</Badge>
              {member.role === 'member' ? (
                <Badge variant="outline">{member.can_view_all_records ? 'Vê tudo' : 'Só o que é dele'}</Badge>
              ) : null}
              {isAdmin && member.id !== activeMembership?.id ? (
                <>
                  <Button size="icon-sm" variant="ghost" onClick={() => setEditingMember(member)}>
                    <Settings2 className="size-3.5" />
                  </Button>
                  <Button size="icon-sm" variant="ghost" onClick={() => handleRemove(member.id)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>

      <InviteMemberDialog open={inviteOpen} onOpenChange={setInviteOpen} />
      <EditPermissionsDialog
        open={!!editingMember}
        onOpenChange={(open) => !open && setEditingMember(null)}
        member={editingMember}
      />
    </div>
  )
}
