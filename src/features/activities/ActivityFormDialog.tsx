import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SearchCombobox, type ComboboxOption } from '@/components/SearchCombobox'
import { ACTIVITY_TYPES } from '@/config/activityTypes'
import { formatCurrency, formatDate } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { useWorkspace } from '@/providers/WorkspaceProvider'
import {
  useCreateActivity,
  useDeleteActivity,
  useUpdateActivity,
  type ActivityWithRelations,
} from '@/features/activities/api'
import type { ActivityType } from '@/types/database'

function toLocalDateTimeInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function ActivityFormDialog({
  open,
  onOpenChange,
  activity,
  defaultDate,
  defaultClient,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  activity: ActivityWithRelations | null
  defaultDate?: Date | null
  defaultClient?: { id: string; label: string } | null
}) {
  const { activeWorkspace, activeMembership, isAdmin } = useWorkspace()
  const [title, setTitle] = useState('')
  const [type, setType] = useState<ActivityType>('task')
  const [dueAt, setDueAt] = useState(toLocalDateTimeInput(new Date()))
  const [clientId, setClientId] = useState<string | null>(null)
  const [clientLabel, setClientLabel] = useState<string | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [orderLabel, setOrderLabel] = useState<string | null>(null)
  const [assignedTo, setAssignedTo] = useState<string | null>(null)
  const [assignedToLabel, setAssignedToLabel] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [completed, setCompleted] = useState(false)

  const createActivity = useCreateActivity()
  const updateActivity = useUpdateActivity()
  const deleteActivity = useDeleteActivity()
  const saving = createActivity.isPending || updateActivity.isPending

  useEffect(() => {
    if (!open) return
    if (activity) {
      setTitle(activity.title)
      setType(activity.type)
      setDueAt(toLocalDateTimeInput(new Date(activity.due_at)))
      setClientId(activity.client?.id ?? null)
      setClientLabel(activity.client?.name ?? null)
      setOrderId(activity.order?.id ?? null)
      setOrderLabel(activity.order ? 'Pedido vinculado' : null)
      setAssignedTo(activity.assigned_to)
      setAssignedToLabel(null)
      if (activity.assigned_to) {
        supabase
          .from('users')
          .select('name, email')
          .eq('id', activity.assigned_to)
          .single()
          .then(({ data }) => data && setAssignedToLabel(data.name || data.email))
      }
      setDescription(activity.description ?? '')
      setCompleted(activity.status === 'completed')
    } else {
      setTitle('')
      setType('task')
      setDueAt(toLocalDateTimeInput(defaultDate ?? new Date()))
      setClientId(defaultClient?.id ?? null)
      setClientLabel(defaultClient?.label ?? null)
      setOrderId(null)
      setOrderLabel(null)
      setAssignedTo(activeMembership?.id ?? null)
      setAssignedToLabel(activeMembership?.name ?? null)
      setDescription('')
      setCompleted(false)
    }
  }, [open, activity, defaultDate, defaultClient, activeMembership])

  const searchClients = async (query: string): Promise<ComboboxOption[]> => {
    if (!activeWorkspace) return []
    let q = supabase.from('clients').select('id, name, company').eq('workspace_id', activeWorkspace.id)
    const cleaned = query.replace(/[,%]/g, '').trim()
    if (cleaned) q = q.or(`name.ilike.%${cleaned}%,company.ilike.%${cleaned}%`)
    const { data } = await q.order('name', { ascending: true }).limit(20)
    return (data ?? []).map((c) => ({ id: c.id, label: c.name, sublabel: c.company }))
  }

  const searchOrders = async (): Promise<ComboboxOption[]> => {
    if (!activeWorkspace) return []
    let q = supabase
      .from('orders')
      .select('id, total, created_at, clients(name)')
      .eq('workspace_id', activeWorkspace.id)
    if (clientId) q = q.eq('client_id', clientId)
    const { data } = await q.order('created_at', { ascending: false }).limit(20)
    return (data ?? []).map((o: any) => ({
      id: o.id,
      label: `${o.clients?.name ?? 'Sem cliente'} — ${formatDate(o.created_at)}`,
      sublabel: formatCurrency(o.total),
    }))
  }

  const searchTeamMembers = async (query: string): Promise<ComboboxOption[]> => {
    if (!activeWorkspace) return []
    if (!isAdmin) {
      if (!activeMembership) return []
      return [{ id: activeMembership.id, label: activeMembership.name || activeMembership.email }]
    }
    let q = supabase
      .from('users')
      .select('id, name, email')
      .eq('workspace_id', activeWorkspace.id)
      .not('joined_at', 'is', null)
    const cleaned = query.replace(/[,%]/g, '').trim()
    if (cleaned) q = q.or(`name.ilike.%${cleaned}%,email.ilike.%${cleaned}%`)
    const { data } = await q.order('name', { ascending: true }).limit(20)
    return (data ?? []).map((u) => ({ id: u.id, label: u.name || u.email }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const payload = {
      type,
      title: title.trim(),
      description: description.trim() || null,
      due_at: new Date(dueAt).toISOString(),
      client_id: clientId,
      order_id: orderId,
      assigned_to: assignedTo,
      status: completed ? ('completed' as const) : ('pending' as const),
      ...(activity ? {} : { created_by: activeMembership?.id ?? null }),
    }

    try {
      if (activity) {
        await updateActivity.mutateAsync({ id: activity.id, payload })
        toast.success('Atividade atualizada')
      } else {
        await createActivity.mutateAsync(payload)
        toast.success('Atividade criada')
      }
      onOpenChange(false)
    } catch (error) {
      toast.error('Não foi possível salvar a atividade', {
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }

  const handleDelete = async () => {
    if (!activity) return
    try {
      await deleteActivity.mutateAsync(activity.id)
      toast.success('Atividade excluída')
      onOpenChange(false)
    } catch (error) {
      toast.error('Não foi possível excluir', { description: error instanceof Error ? error.message : undefined })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{activity ? 'Editar atividade' : 'Nova atividade'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Título</Label>
            <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Tipo</Label>
              <Select
                value={type}
                onValueChange={(value) => setType((value as ActivityType) ?? 'task')}
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
              <Label htmlFor="due_at">Data e hora</Label>
              <Input id="due_at" type="datetime-local" required value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Cliente vinculado</Label>
              <SearchCombobox
                selectedLabel={clientLabel}
                placeholder="Selecionar cliente…"
                search={searchClients}
                onSelect={(option) => {
                  setClientId(option.id)
                  setClientLabel(option.label)
                }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Pedido vinculado</Label>
              <SearchCombobox
                selectedLabel={orderLabel}
                placeholder="Selecionar pedido…"
                search={searchOrders}
                onSelect={(option) => {
                  setOrderId(option.id)
                  setOrderLabel(option.label)
                }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Responsável</Label>
            <SearchCombobox
              selectedLabel={assignedToLabel}
              placeholder="Selecionar responsável…"
              search={searchTeamMembers}
              onSelect={(option) => {
                setAssignedTo(option.id)
                setAssignedToLabel(option.label)
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <p className="text-sm font-medium text-foreground">Concluída</p>
            <Switch checked={completed} onCheckedChange={setCompleted} />
          </div>

          <DialogFooter>
            {activity ? (
              <Button type="button" variant="outline" onClick={handleDelete} disabled={deleteActivity.isPending}>
                Excluir
              </Button>
            ) : null}
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
