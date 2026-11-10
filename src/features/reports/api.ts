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

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day || 1)
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
        start: customFrom ? startOfDay(parseLocalDate(customFrom)) : startOfMonth(now),
        end: customTo ? endOfDay(parseLocalDate(customTo)) : endOfDay(now),
      }
    case 'month':
    default:
      return { start: startOfMonth(now), end: endOfMonth(now) }
  }
}

export interface OrderRow {
  id: string
  total: number
  created_at: string
  client_id: string
  stage_id: string
  assigned_to: string | null
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
        .select('id, total, created_at, client_id, stage_id, assigned_to, pipeline_stages(id, name, color, is_won), clients(id, name)')
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
    label: format(parseLocalDate(key), byMonth ? 'MMM/yy' : 'dd/MM', { locale: ptBR }),
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
        .select('description, quantity, total, product_id, products(sku)')
        .in('order_id', wonOrderIds)
      if (error) throw error

      const rows = (data ?? []) as unknown as {
        description: string
        quantity: number
        total: number
        product_id: string | null
        products?: { sku: string } | null
      }[]
      const map = new Map<string, { key: string; sku: string | null; description: string; quantity: number; total: number }>()
      for (const item of rows) {
        const key = item.product_id ?? item.description
        const entry = map.get(key) ?? { key, sku: item.products?.sku ?? null, description: item.description, quantity: 0, total: 0 }
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

// ---------------------------------------------------------------------------
// Relatório por vendedor
// ---------------------------------------------------------------------------

export const NO_SELLER_ID = 'none'

export interface SellerStats {
  id: string
  name: string
  orders: number
  won: number
  revenue: number
  avgTicket: number
  conversionRate: number
  activitiesTotal: number
  activitiesCompleted: number
  activitiesRate: number
}

export function buildFunnel(stages: { id: string; name: string; color: string }[], orders: OrderRow[]) {
  return stages.map((stage) => {
    const stageOrders = orders.filter((o) => o.stage_id === stage.id)
    return { stage, count: stageOrders.length, value: stageOrders.reduce((sum, o) => sum + o.total, 0) }
  })
}

export function buildClientRanking(orders: OrderRow[], limit = 5) {
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

export function sellerKey(assignedTo: string | null) {
  return assignedTo ?? NO_SELLER_ID
}

export function useSellerReport(range: DateRange) {
  const { activeWorkspace } = useWorkspace()
  const { data: orders = [], isLoading: ordersLoading } = useOrdersInRange(range)

  const membersQuery = useQuery({
    queryKey: ['report-members', activeWorkspace?.id],
    enabled: !!activeWorkspace,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('workspace_id', activeWorkspace!.id)
        .not('joined_at', 'is', null)
      if (error) throw error
      return data ?? []
    },
  })

  const activitiesQuery = useQuery({
    queryKey: ['report-activities-by-user', activeWorkspace?.id, range.start.toISOString(), range.end.toISOString()],
    enabled: !!activeWorkspace,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('status, assigned_to')
        .eq('workspace_id', activeWorkspace!.id)
        .gte('due_at', range.start.toISOString())
        .lte('due_at', range.end.toISOString())
      if (error) throw error
      return data ?? []
    },
  })

  const members = membersQuery.data ?? []
  const activities = activitiesQuery.data ?? []

  const names = new Map<string, string>(members.map((m) => [m.id, m.name || m.email]))
  const ids = new Set<string>(members.map((m) => m.id))
  // Pedidos/atividades sem responsável (ou de alguém que saiu) entram numa linha própria.
  const hasUnassigned =
    orders.some((o) => !o.assigned_to || !ids.has(o.assigned_to)) || activities.some((a) => !a.assigned_to || !ids.has(a.assigned_to))
  const keys = [...members.map((m) => m.id), ...(hasUnassigned ? [NO_SELLER_ID] : [])]
  const resolveKey = (assignedTo: string | null) => (assignedTo && ids.has(assignedTo) ? assignedTo : NO_SELLER_ID)

  const sellers: SellerStats[] = keys.map((id) => {
    const sellerOrders = orders.filter((o) => resolveKey(o.assigned_to) === id)
    const won = sellerOrders.filter((o) => o.pipeline_stages?.is_won)
    const revenue = won.reduce((sum, o) => sum + o.total, 0)
    const sellerActivities = activities.filter((a) => resolveKey(a.assigned_to) === id)
    const completed = sellerActivities.filter((a) => a.status === 'completed').length
    return {
      id,
      name: id === NO_SELLER_ID ? 'Sem responsável' : (names.get(id) ?? 'Sem nome'),
      orders: sellerOrders.length,
      won: won.length,
      revenue,
      avgTicket: won.length > 0 ? revenue / won.length : 0,
      conversionRate: sellerOrders.length > 0 ? (won.length / sellerOrders.length) * 100 : 0,
      activitiesTotal: sellerActivities.length,
      activitiesCompleted: completed,
      activitiesRate: sellerActivities.length > 0 ? (completed / sellerActivities.length) * 100 : 0,
    }
  })

  const ordersOf = (id: string) => orders.filter((o) => resolveKey(o.assigned_to) === id)

  return {
    sellers,
    ordersOf,
    isLoading: ordersLoading || membersQuery.isLoading || activitiesQuery.isLoading,
  }
}
