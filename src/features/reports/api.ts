import { useQuery } from '@tanstack/react-query'
import {
  addDays,
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { useWorkspace } from '@/providers/WorkspaceProvider'

export type PeriodPreset = 'today' | 'week' | 'month' | 'quarter' | 'custom'

export interface DateRange {
  start: Date
  end: Date
}

export function resolveRange(preset: PeriodPreset, customFrom: string, customTo: string): DateRange {
  const now = new Date()
  switch (preset) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) }
    case 'week':
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) }
    case 'quarter':
      return { start: startOfQuarter(now), end: endOfQuarter(now) }
    case 'custom':
      return {
        start: customFrom ? startOfDay(new Date(customFrom)) : startOfMonth(now),
        end: customTo ? endOfDay(new Date(customTo)) : endOfDay(now),
      }
    case 'month':
    default:
      return { start: startOfMonth(now), end: endOfMonth(now) }
  }
}

interface OrderRow {
  id: string
  total: number
  created_at: string
  client_id: string
  stage_id: string
  pipeline_stages: { id: string; name: string; color: string; is_won: boolean } | null
  clients: { id: string; name: string } | null
}

function useOrdersInRange(range: DateRange) {
  const { activeWorkspace } = useWorkspace()

  return useQuery({
    queryKey: ['report-orders', activeWorkspace?.id, range.start.toISOString(), range.end.toISOString()],
    enabled: !!activeWorkspace,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, total, created_at, client_id, stage_id, pipeline_stages(id, name, color, is_won), clients(id, name)')
        .eq('workspace_id', activeWorkspace!.id)
        .gte('created_at', range.start.toISOString())
        .lte('created_at', range.end.toISOString())
      if (error) throw error
      return (data ?? []) as unknown as OrderRow[]
    },
  })
}

export function useReportMetrics(range: DateRange) {
  const { activeWorkspace } = useWorkspace()
  const { data: orders = [] } = useOrdersInRange(range)

  const leadsQuery = useQuery({
    queryKey: ['report-leads', activeWorkspace?.id, range.start.toISOString(), range.end.toISOString()],
    enabled: !!activeWorkspace,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', activeWorkspace!.id)
        .gte('created_at', range.start.toISOString())
        .lte('created_at', range.end.toISOString())
      if (error) throw error
      return count ?? 0
    },
  })

  const activitiesQuery = useQuery({
    queryKey: ['report-activities', activeWorkspace?.id, range.start.toISOString(), range.end.toISOString()],
    enabled: !!activeWorkspace,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('status')
        .eq('workspace_id', activeWorkspace!.id)
        .gte('due_at', range.start.toISOString())
        .lte('due_at', range.end.toISOString())
      if (error) throw error
      const rows = data ?? []
      const completedCount = rows.filter((r) => r.status === 'completed').length
      return { total: rows.length, completed: completedCount, rate: rows.length > 0 ? (completedCount / rows.length) * 100 : 0 }
    },
  })

  const wonOrders = orders.filter((o) => o.pipeline_stages?.is_won)
  const revenue = wonOrders.reduce((sum, o) => sum + o.total, 0)
  const avgTicket = wonOrders.length > 0 ? revenue / wonOrders.length : 0
  const conversionRate = orders.length > 0 ? (wonOrders.length / orders.length) * 100 : 0

  return {
    totalLeads: leadsQuery.data ?? 0,
    revenue,
    avgTicket,
    conversionRate,
    activitiesCompletionRate: activitiesQuery.data?.rate ?? 0,
    activitiesCompleted: activitiesQuery.data?.completed ?? 0,
    activitiesTotal: activitiesQuery.data?.total ?? 0,
  }
}

export function useRevenueByPeriod(range: DateRange) {
  const { data: orders = [] } = useOrdersInRange(range)
  const spanDays = differenceInCalendarDays(range.end, range.start)
  const byMonth = spanDays > 31

  const buckets = new Map<string, number>()
  let cursor = range.start
  while (cursor <= range.end) {
    const key = format(cursor, byMonth ? 'yyyy-MM' : 'yyyy-MM-dd')
    if (!buckets.has(key)) buckets.set(key, 0)
    cursor = byMonth ? new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1) : addDays(cursor, 1)
  }

  for (const order of orders) {
    if (!order.pipeline_stages?.is_won) continue
    const key = format(new Date(order.created_at), byMonth ? 'yyyy-MM' : 'yyyy-MM-dd')
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + order.total)
  }

  return Array.from(buckets.entries()).map(([key, value]) => ({
    label: format(byMonth ? new Date(`${key}-01`) : new Date(key), byMonth ? 'MMM/yy' : 'dd/MM', { locale: ptBR }),
    revenue: value,
  }))
}

export function useConversionFunnel(range: DateRange) {
  const { stages } = useWorkspace()
  const { data: orders = [] } = useOrdersInRange(range)

  return stages.map((stage) => {
    const stageOrders = orders.filter((o) => o.stage_id === stage.id)
    return { stage, count: stageOrders.length, value: stageOrders.reduce((sum, o) => sum + o.total, 0) }
  })
}

export function useClientRanking(range: DateRange, limit = 10) {
  const { data: orders = [] } = useOrdersInRange(range)

  const map = new Map<string, { id: string; name: string; total: number; count: number }>()
  for (const order of orders) {
    if (!order.pipeline_stages?.is_won || !order.clients) continue
    const entry = map.get(order.clients.id) ?? { id: order.clients.id, name: order.clients.name, total: 0, count: 0 }
    entry.total += order.total
    entry.count += 1
    map.set(order.clients.id, entry)
  }

  return Array.from(map.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
}

export function useProductRanking(range: DateRange, limit = 10) {
  const { activeWorkspace } = useWorkspace()
  const { data: orders = [] } = useOrdersInRange(range)
  const wonOrderIds = orders.filter((o) => o.pipeline_stages?.is_won).map((o) => o.id)

  return useQuery({
    queryKey: ['report-product-ranking', activeWorkspace?.id, wonOrderIds.join(',')],
    enabled: !!activeWorkspace && wonOrderIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_items')
        .select('description, quantity, total, product_id')
        .in('order_id', wonOrderIds)
      if (error) throw error

      const map = new Map<string, { key: string; description: string; quantity: number; total: number }>()
      for (const item of data ?? []) {
        const key = item.product_id ?? item.description
        const entry = map.get(key) ?? { key, description: item.description, quantity: 0, total: 0 }
        entry.quantity += item.quantity
        entry.total += item.total
        map.set(key, entry)
      }

      return Array.from(map.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, limit)
    },
  })
}
