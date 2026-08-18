import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ACTION_OPTIONS, TRIGGER_OPTIONS } from '@/config/automationOptions'
import { ACTIVITY_TYPES } from '@/config/activityTypes'
import { useWorkspace } from '@/providers/WorkspaceProvider'
import { useCreateAutomation, useUpdateAutomation, type Automation } from '@/features/automations/api'
import type { ActivityType, AutomationAction, AutomationTrigger } from '@/types/database'

export function AutomationFormDialog({
  open,
  onOpenChange,
  automation,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  automation: Automation | null
}) {
  const { stages } = useWorkspace()
  const [name, setName] = useState('')
  const [triggerType, setTriggerType] = useState<AutomationTrigger>('order_created')
  const [triggerDays, setTriggerDays] = useState('3')
  const [triggerStageId, setTriggerStageId] = useState<string>('__any__')
  const [actionType, setActionType] = useState<AutomationAction>('create_activity')
  const [activityType, setActivityType] = useState<ActivityType>('task')
  const [dueInDays, setDueInDays] = useState('1')
  const [actionTitle, setActionTitle] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [active, setActive] = useState(true)

  const createAutomation = useCreateAutomation()
  const updateAutomation = useUpdateAutomation()
  const saving = createAutomation.isPending || updateAutomation.isPending

  const triggerMeta = TRIGGER_OPTIONS.find((t) => t.value === triggerType)

  useEffect(() => {
    if (!open) return
    if (automation) {
      setName(automation.name)
      setTriggerType(automation.trigger_type)
      setTriggerDays(String((automation.trigger_config as Record<string, unknown>)?.days ?? '3'))
      setTriggerStageId(((automation.trigger_config as Record<string, unknown>)?.to_stage_id as string) ?? '__any__')
      setActionType(automation.action_type)
      const actionConfig = automation.action_config as Record<string, unknown>
      setActivityType((actionConfig?.activity_type as ActivityType) ?? 'task')
      setDueInDays(String(actionConfig?.due_in_days ?? '1'))
      setActionTitle((actionConfig?.title as string) ?? '')
      setActionMessage(((actionConfig?.description ?? actionConfig?.message) as string) ?? '')
      setActive(automation.active)
    } else {
      setName('')
      setTriggerType('order_created')
      setTriggerDays('3')
      setTriggerStageId('__any__')
      setActionType('create_activity')
      setActivityType('task')
      setDueInDays('1')
      setActionTitle('')
      setActionMessage('')
      setActive(true)
    }
  }, [open, automation])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    const triggerConfig: Record<string, unknown> = {}
    if (triggerMeta?.needsDays) triggerConfig.days = Number(triggerDays) || 1
    if (triggerMeta?.needsStage && triggerStageId !== '__any__') triggerConfig.to_stage_id = triggerStageId

    const actionConfig: Record<string, unknown> =
      actionType === 'create_activity'
        ? { activity_type: activityType, due_in_days: Number(dueInDays) || 1, title: actionTitle.trim(), description: actionMessage.trim() || null }
        : { title: actionTitle.trim(), message: actionMessage.trim() || null }

    const payload = {
      name: name.trim(),
      trigger_type: triggerType,
      trigger_config: triggerConfig,
      action_type: actionType,
      action_config: actionConfig,
      active,
    }

    try {
      if (automation) {
        await updateAutomation.mutateAsync({ id: automation.id, payload })
        toast.success('Automação atualizada')
      } else {
        await createAutomation.mutateAsync(payload)
        toast.success('Automação criada')
      }
      onOpenChange(false)
    } catch (error) {
      toast.error('Não foi possível salvar a automação', {
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{automation ? 'Editar automação' : 'Nova automação'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Cobrar pedido parado" />
          </div>

          <div className="rounded-lg border border-border p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">1. Gatilho</p>
            <Select
              value={triggerType}
              onValueChange={(value) => setTriggerType((value as AutomationTrigger) ?? 'order_created')}
              items={TRIGGER_OPTIONS.map((t) => ({ value: t.value, label: t.label }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRIGGER_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {triggerMeta?.needsDays ? (
              <div className="mt-2 flex flex-col gap-1.5">
                <Label className="text-xs">Dias</Label>
                <Input inputMode="numeric" value={triggerDays} onChange={(e) => setTriggerDays(e.target.value)} className="w-28" />
              </div>
            ) : null}

            {triggerMeta?.needsStage ? (
              <div className="mt-2 flex flex-col gap-1.5">
                <Label className="text-xs">Estágio de destino</Label>
                <Select
                  value={triggerStageId}
                  onValueChange={(value) => setTriggerStageId(value ?? '__any__')}
                  items={[{ value: '__any__', label: 'Qualquer estágio' }, ...stages.map((s) => ({ value: s.id, label: s.name }))]}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__any__">Qualquer estágio</SelectItem>
                    {stages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>

          <div className="rounded-lg border border-border p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">2. Ação</p>
            <Select
              value={actionType}
              onValueChange={(value) => setActionType((value as AutomationAction) ?? 'create_activity')}
              items={ACTION_OPTIONS.map((a) => ({ value: a.value, label: a.label }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTION_OPTIONS.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="mt-2 flex flex-col gap-2">
              {actionType === 'create_activity' ? (
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs">Tipo</Label>
                    <Select
                      value={activityType}
                      onValueChange={(value) => setActivityType((value as ActivityType) ?? 'task')}
                      items={ACTIVITY_TYPES.map((t) => ({ value: t.id, label: t.label }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTIVITY_TYPES.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs">Prazo (dias)</Label>
                    <Input inputMode="numeric" value={dueInDays} onChange={(e) => setDueInDays(e.target.value)} />
                  </div>
                </div>
              ) : null}

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Título</Label>
                <Input required value={actionTitle} onChange={(e) => setActionTitle(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">{actionType === 'create_activity' ? 'Descrição' : 'Mensagem'}</Label>
                <Textarea rows={2} value={actionMessage} onChange={(e) => setActionMessage(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <p className="text-sm font-medium text-foreground">Ativa</p>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
