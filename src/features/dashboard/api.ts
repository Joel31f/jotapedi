import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { useWorkspace } from '@/providers/WorkspaceProvider'
import { KANBAN_RECENT_DAYS } from '@/features/orders/api'

export function useDashboardMetrics() {
  const { activeWorkspace } = useWorkspace()
  const monthStart = startOfMonth(new Date())
  const monthEnd = endOfMonth(new Date())

  return useQuery({
    queryKey: ['dashboard-metrics', activeWorkspace?.id, monthStart.toISOString()],
    enabled: !!activeWorkspace,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('dashboard_month_metrics', {
        p_workspace_id: activeWorkspace!.id,
        p_from: monthStart.toISOString(),
        p_to: monthEnd.toISOString(),
      })
      if (error) throw error

      const row = data?.[0]
      const totalOrders = Number(row?.total_orders ?? 0)
      const wonCount = Number(row?.won_orders ?? 0)
      const revenue = Number(row?.revenue ?? 0)
      const avgTicket = wonCount > 0 ? revenue / wonCount : 0
      const conversionRate = totalOrders > 0 ? (wonCount / totalOrders) * 100 : 0

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
      const { data, error } = await supabase.rpc('dashboard_revenue_trend', {
        p_workspace_id: activeWorkspace!.id,
        p_from: start.toISOString(),
        p_tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
      if (error) throw error

      const buckets = new Map<string, number>()
      for (let i = 0; i < 6; i++) {
        const monthDate = subMonths(new Date(), 5 - i)
        buckets.set(format(monthDate, 'yyyy-MM'), 0)
      }
      for (const row of data ?? []) {
        if (buckets.has(row.month)) buckets.set(row.month, Number(row.revenue))
      }

      return Array.from(buckets.entries()).map(([key, value]) => ({
        month: format(new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, 1), 'MMM', { locale: ptBR }),
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
      const since = new Date(Date.now() - KANBAN_RECENT_DAYS * 24 * 60 * 60 * 1000).toISOString()
      const { data, error } = await supabase.rpc('dashboard_pipeline_summary', {
        p_workspace_id: activeWorkspace!.id,
        p_since: since,
      })
      if (error) throw error

      const byStage = new Map((data ?? []).map((row) => [row.stage_id, row]))
      return stages.map((stage) => ({
        stage,
        count: Number(byStage.get(stage.id)?.orders_count ?? 0),
        value: Number(byStage.get(stage.id)?.total_value ?? 0),
      }))
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
