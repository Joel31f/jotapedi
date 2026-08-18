import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { useWorkspace } from '@/providers/WorkspaceProvider'

export function useDashboardMetrics() {
  const { activeWorkspace } = useWorkspace()
  const monthStart = startOfMonth(new Date())
  const monthEnd = endOfMonth(new Date())

  return useQuery({
    queryKey: ['dashboard-metrics', activeWorkspace?.id, monthStart.toISOString()],
    enabled: !!activeWorkspace,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('total, pipeline_stages(is_won)')
        .eq('workspace_id', activeWorkspace!.id)
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString())
      if (error) throw error

      const rows = (data ?? []) as unknown as { total: number; pipeline_stages: { is_won: boolean } | null }[]
      const totalOrders = rows.length
      const wonOrders = rows.filter((r) => r.pipeline_stages?.is_won)
      const revenue = wonOrders.reduce((sum, r) => sum + r.total, 0)
      const avgTicket = wonOrders.length > 0 ? revenue / wonOrders.length : 0
      const conversionRate = totalOrders > 0 ? (wonOrders.length / totalOrders) * 100 : 0

      return { totalOrders, revenue, avgTicket, conversionRate }
    },
  })
}

export function useRevenueTrend() {
  const { activeWorkspace } = useWorkspace()
  const start = startOfMonth(subMonths(new Date(), 5))

  return useQuery({
    queryKey: ['revenue-trend', activeWorkspace?.id, start.toISOString()],
    enabled: !!activeWorkspace,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('total, created_at, pipeline_stages(is_won)')
        .eq('workspace_id', activeWorkspace!.id)
        .gte('created_at', start.toISOString())
      if (error) throw error

      const rows = (data ?? []) as unknown as { total: number; created_at: string; pipeline_stages: { is_won: boolean } | null }[]
      const buckets = new Map<string, number>()
      for (let i = 0; i < 6; i++) {
        const monthDate = subMonths(new Date(), 5 - i)
        buckets.set(format(monthDate, 'yyyy-MM'), 0)
      }
      for (const row of rows) {
        if (!row.pipeline_stages?.is_won) continue
        const key = format(new Date(row.created_at), 'yyyy-MM')
        if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + row.total)
      }

      return Array.from(buckets.entries()).map(([key, value]) => ({
        month: format(new Date(`${key}-01`), 'MMM', { locale: ptBR }),
        revenue: value,
      }))
    },
  })
}

export function usePipelineSummary() {
  const { activeWorkspace, stages } = useWorkspace()

  return useQuery({
    queryKey: ['pipeline-summary', activeWorkspace?.id, stages.map((s) => s.id).join(',')],
    enabled: !!activeWorkspace && stages.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('stage_id, total')
        .eq('workspace_id', activeWorkspace!.id)
      if (error) throw error

      return stages.map((stage) => {
        const stageOrders = (data ?? []).filter((o) => o.stage_id === stage.id)
        return {
          stage,
          count: stageOrders.length,
          value: stageOrders.reduce((sum, o) => sum + o.total, 0),
        }
      })
    },
  })
}

export function useOverdueActivities(limit = 5) {
  const { activeWorkspace } = useWorkspace()

  return useQuery({
    queryKey: ['overdue-activities', activeWorkspace?.id, limit],
    enabled: !!activeWorkspace,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('*, clients(id, name)')
        .eq('workspace_id', activeWorkspace!.id)
        .eq('status', 'pending')
        .lt('due_at', new Date().toISOString())
        .order('due_at', { ascending: true })
        .limit(limit)
      if (error) throw error
      return (data ?? []) as unknown as { id: string; title: string; due_at: string; type: string; clients: { name: string } | null }[]
    },
  })
}

export function useUpdateMonthlyGoal() {
  const { activeWorkspace, refresh } = useWorkspace()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (goal: number) => {
      const { error } = await supabase.from('workspaces').update({ monthly_goal: goal }).eq('id', activeWorkspace!.id)
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => {
      await refresh()
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
    },
  })
}
