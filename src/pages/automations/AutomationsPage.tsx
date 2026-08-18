import { useState } from 'react'
import { toast } from 'sonner'
import { History, Pencil, Plus, Trash2, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { PlaceholderPage } from '@/components/PlaceholderPage'
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog'
import { TRIGGER_LABEL, ACTION_LABEL } from '@/config/automationOptions'
import {
  useAutomationsQuery,
  useDeleteAutomation,
  useUpdateAutomation,
  type Automation,
} from '@/features/automations/api'
import { AutomationFormDialog } from '@/features/automations/AutomationFormDialog'
import { AutomationLogsDialog } from '@/features/automations/AutomationLogsDialog'

export function AutomationsPage() {
  const { data: automations = [], isLoading } = useAutomationsQuery()
  const updateAutomation = useUpdateAutomation()
  const deleteAutomation = useDeleteAutomation()

  const [formOpen, setFormOpen] = useState(false)
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null)
  const [logsAutomation, setLogsAutomation] = useState<Automation | null>(null)
  const [deletingAutomation, setDeletingAutomation] = useState<Automation | null>(null)

  const handleToggleActive = async (automation: Automation, active: boolean) => {
    try {
      await updateAutomation.mutateAsync({ id: automation.id, payload: { active } })
    } catch (error) {
      toast.error('Não foi possível atualizar', { description: error instanceof Error ? error.message : undefined })
    }
  }

  const handleDelete = async () => {
    if (!deletingAutomation) return
    try {
      await deleteAutomation.mutateAsync(deletingAutomation.id)
      toast.success('Automação excluída')
      setDeletingAutomation(null)
    } catch (error) {
      toast.error('Não foi possível excluir', { description: error instanceof Error ? error.message : undefined })
    }
  }

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Automações</h1>
          <p className="text-sm text-muted-foreground">{automations.length} automação(ões)</p>
        </div>
        <Button
          onClick={() => {
            setEditingAutomation(null)
            setFormOpen(true)
          }}
        >
          <Plus className="size-4" />
          Nova automação
        </Button>
      </div>

      {isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Carregando…</p>
      ) : automations.length === 0 ? (
        <PlaceholderPage
          title="Nenhuma automação ainda"
          icon={Zap}
          description='Clique em "Nova automação" para criar a primeira: escolha um gatilho, configure a condição e defina a ação.'
        />
      ) : (
        <div className="flex flex-col gap-2">
          {automations.map((automation) => (
            <Card key={automation.id}>
              <CardContent className="flex items-center gap-3 py-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Zap className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{automation.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {TRIGGER_LABEL[automation.trigger_type]} → {ACTION_LABEL[automation.action_type]}
                  </p>
                </div>
                <Badge variant={automation.active ? 'secondary' : 'outline'}>{automation.active ? 'Ativa' : 'Inativa'}</Badge>
                <Switch checked={automation.active} onCheckedChange={(checked) => handleToggleActive(automation, checked)} />
                <Button size="icon-sm" variant="ghost" onClick={() => setLogsAutomation(automation)}>
                  <History className="size-3.5" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => {
                    setEditingAutomation(automation)
                    setFormOpen(true)
                  }}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button size="icon-sm" variant="ghost" onClick={() => setDeletingAutomation(automation)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AutomationFormDialog open={formOpen} onOpenChange={setFormOpen} automation={editingAutomation} />
      <AutomationLogsDialog
        open={!!logsAutomation}
        onOpenChange={(open) => !open && setLogsAutomation(null)}
        automation={logsAutomation}
      />
      <ConfirmDeleteDialog
        open={!!deletingAutomation}
        onOpenChange={(open) => !open && setDeletingAutomation(null)}
        title="Excluir automação"
        description={`Tem certeza que deseja excluir "${deletingAutomation?.name}"? Essa ação não pode ser desfeita.`}
        onConfirm={handleDelete}
        loading={deleteAutomation.isPending}
      />
    </div>
  )
}
