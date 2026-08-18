import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SECTION_LABELS, SECTION_ORDER } from '@/config/sections'
import type { SectionAccess, UserRole } from '@/types/database'

export function PermissionsFields({
  role,
  onRoleChange,
  sectionAccess,
  onSectionAccessChange,
  canViewAllRecords,
  onCanViewAllRecordsChange,
}: {
  role: UserRole
  onRoleChange: (role: UserRole) => void
  sectionAccess: SectionAccess
  onSectionAccessChange: (access: SectionAccess) => void
  canViewAllRecords: boolean
  onCanViewAllRecordsChange: (value: boolean) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>Permissão</Label>
        <Select
          value={role}
          onValueChange={(value) => onRoleChange((value as UserRole) ?? 'member')}
          items={[{ value: 'member', label: 'Membro' }, { value: 'admin', label: 'Admin' }]}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="member">Membro</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Admins sempre têm acesso completo, independente das opções abaixo.</p>
      </div>

      {role === 'member' ? (
        <>
          <div className="flex flex-col gap-2">
            <Label>Seções visíveis</Label>
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-border p-3">
              {SECTION_ORDER.map((section) => (
                <label key={section} className="flex items-center gap-2 text-sm text-foreground">
                  <Checkbox
                    checked={sectionAccess[section]}
                    onCheckedChange={(checked) => onSectionAccessChange({ ...sectionAccess, [section]: !!checked })}
                  />
                  {SECTION_LABELS[section]}
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-foreground">Ver todos os pedidos e atividades</p>
              <p className="text-xs text-muted-foreground">
                Desligado: só vê pedidos e atividades que criou ou é responsável. Clientes continuam visíveis para todos.
              </p>
            </div>
            <Switch checked={canViewAllRecords} onCheckedChange={onCanViewAllRecordsChange} />
          </div>
        </>
      ) : null}
    </div>
  )
}
