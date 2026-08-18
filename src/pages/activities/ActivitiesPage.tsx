import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Check, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { SearchCombobox, type ComboboxOption } from '@/components/SearchCombobox'
import { ACTIVITY_TYPE_MAP, ACTIVITY_TYPES } from '@/config/activityTypes'
import { formatDateTime } from '@/lib/format'
import { bucketActivities } from '@/lib/activityBuckets'
import { supabase } from '@/lib/supabase'
import { useWorkspace } from '@/providers/WorkspaceProvider'
import {
  EMPTY_ACTIVITY_FILTERS,
  useActivitiesQuery,
  useToggleActivityStatus,
  type ActivityFilters,
  type ActivityWithRelations,
} from '@/features/activities/api'
import { ActivityFormDialog } from '@/features/activities/ActivityFormDialog'

const SECTIONS: { key: keyof ReturnType<typeof bucketActivities>; title: string }[] = [
  { key: 'overdue', title: 'Atrasadas' },
  { key: 'today', title: 'Hoje' },
  { key: 'week', title: 'Esta semana' },
  { key: 'future', title: 'Futuras' },
  { key: 'completed', title: 'Concluídas' },
]

export function ActivitiesPage() {
  const { activeWorkspace } = useWorkspace()
  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFilters] = useState<ActivityFilters>(EMPTY_ACTIVITY_FILTERS)
  const [formOpen, setFormOpen] = useState(false)
  const [editingActivity, setEditingActivity] = useState<ActivityWithRelations | null>(null)

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setEditingActivity(null)
      setFormOpen(true)
      searchParams.delete('new')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const { data: activities = [], isLoading } = useActivitiesQuery(filters)
  const toggleStatus = useToggleActivityStatus()
  const buckets = bucketActivities(activities)

  const searchClients = async (query: string): Promise<ComboboxOption[]> => {
    if (!activeWorkspace) return []
    let q = supabase.from('clients').select('id, name, company').eq('workspace_id', activeWorkspace.id)
    const cleaned = query.replace(/[,%]/g, '').trim()
    if (cleaned) q = q.or(`name.ilike.%${cleaned}%,company.ilike.%${cleaned}%`)
    const { data } = await q.order('name', { ascending: true }).limit(20)
    return (data ?? []).map((c) => ({ id: c.id, label: c.name, sublabel: c.company }))
  }

  const hasActiveFilters =
    filters.status !== 'all' || filters.type !== 'all' || filters.clientId || filters.dateFrom || filters.dateTo

  const handleToggle = async (activity: ActivityWithRelations) => {
    try {
      await toggleStatus.mutateAsync({ id: activity.id, status: activity.status === 'completed' ? 'pending' : 'completed' })
    } catch (error) {
      toast.error('Não foi possível atualizar', { description: error instanceof Error ? error.message : undefined })
    }
  }

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Atividades</h1>
          <p className="text-sm text-muted-foreground">{activities.length} atividade(s)</p>
        </div>
        <Button
          onClick={() => {
            setEditingActivity(null)
            setFormOpen(true)
          }}
        >
          <Plus className="size-4" />
          Nova atividade
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select
          value={filters.status}
          onValueChange={(value) => setFilters((f) => ({ ...f, status: (value as ActivityFilters['status']) ?? 'all' }))}
          items={[
            { value: 'all', label: 'Todos status' },
            { value: 'pending', label: 'Pendentes' },
            { value: 'completed', label: 'Concluídas' },
          ]}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="completed">Concluídas</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.type}
          onValueChange={(value) => setFilters((f) => ({ ...f, type: (value as ActivityFilters['type']) ?? 'all' }))}
          items={[{ value: 'all', label: 'Todos tipos' }, ...ACTIVITY_TYPES.map((t) => ({ value: t.id, label: t.label }))]}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos tipos</SelectItem>
            {ACTIVITY_TYPES.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="w-56">
          <SearchCombobox
            selectedLabel={filters.clientLabel}
            placeholder="Filtrar por cliente…"
            search={searchClients}
            onSelect={(option) => setFilters((f) => ({ ...f, clientId: option.id, clientLabel: option.label }))}
          />
        </div>

        <Input
          type="date"
          className="w-36"
          value={filters.dateFrom}
          onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
        />
        <Input
          type="date"
          className="w-36"
          value={filters.dateTo}
          onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
        />

        {hasActiveFilters ? (
          <Button variant="ghost" size="sm" onClick={() => setFilters(EMPTY_ACTIVITY_FILTERS)}>
            <X className="size-3.5" />
            Limpar filtros
          </Button>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Carregando…</p>
        ) : activities.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma atividade encontrada.</p>
        ) : (
          <div className="flex flex-col gap-6">
            {SECTIONS.map((section) => {
              const items = buckets[section.key]
              if (items.length === 0) return null
              return (
                <div key={section.key}>
                  <h2 className="mb-2 text-sm font-medium text-muted-foreground">
                    {section.title} <span className="text-xs">({items.length})</span>
                  </h2>
                  <div className="flex flex-col gap-1.5">
                    {items.map((activity) => {
                      const typeConfig = ACTIVITY_TYPE_MAP[activity.type]
                      const Icon = typeConfig.icon
                      return (
                        <div
                          key={activity.id}
                          className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
                        >
                          <button
                            type="button"
                            onClick={() => handleToggle(activity)}
                            className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${
                              activity.status === 'completed'
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-muted-foreground/40'
                            }`}
                          >
                            {activity.status === 'completed' ? <Check className="size-3" /> : null}
                          </button>
                          <span
                            className="flex size-7 shrink-0 items-center justify-center rounded-md"
                            style={{ backgroundColor: `${typeConfig.color}20`, color: typeConfig.color }}
                          >
                            <Icon className="size-3.5" />
                          </span>
                          <button
                            className="flex-1 text-left"
                            onClick={() => {
                              setEditingActivity(activity)
                              setFormOpen(true)
                            }}
                          >
                            <p
                              className={`text-sm font-medium text-foreground ${
                                activity.status === 'completed' ? 'line-through opacity-60' : ''
                              }`}
                            >
                              {activity.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDateTime(activity.due_at)}
                              {activity.client ? ` · ${activity.client.name}` : ''}
                            </p>
                          </button>
                          <Badge variant="secondary" style={{ color: typeConfig.color }}>
                            {typeConfig.label}
                          </Badge>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <ActivityFormDialog open={formOpen} onOpenChange={setFormOpen} activity={editingActivity} />
    </div>
  )
}
