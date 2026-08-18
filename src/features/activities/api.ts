import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useWorkspace } from '@/providers/WorkspaceProvider'
import type { ActivityStatus, ActivityType, Database } from '@/types/database'

export type Activity = Database['public']['Tables']['activities']['Row']

export interface ActivityWithRelations extends Activity {
  client: { id: string; name: string } | null
  order: { id: string } | null
}

export interface ActivityFilters {
  status: ActivityStatus | 'all'
  type: ActivityType | 'all'
  clientId: string | null
  clientLabel: string | null
  dateFrom: string
  dateTo: string
}

export const EMPTY_ACTIVITY_FILTERS: ActivityFilters = {
  status: 'all',
  type: 'all',
  clientId: null,
  clientLabel: null,
  dateFrom: '',
  dateTo: '',
}

function mapActivity(row: any): ActivityWithRelations {
  const { clients, orders, ...rest } = row
  return { ...rest, client: clients ?? null, order: orders ?? null }
}

export function useActivitiesQuery(filters: ActivityFilters) {
  const { activeWorkspace } = useWorkspace()

  return useQuery({
    queryKey: ['activities', activeWorkspace?.id, filters],
    enabled: !!activeWorkspace,
    queryFn: async () => {
      let query = supabase
        .from('activities')
        .select('*, clients(id, name), orders(id)')
        .eq('workspace_id', activeWorkspace!.id)

      if (filters.status !== 'all') query = query.eq('status', filters.status)
      if (filters.type !== 'all') query = query.eq('type', filters.type)
      if (filters.clientId) query = query.eq('client_id', filters.clientId)
      if (filters.dateFrom) query = query.gte('due_at', `${filters.dateFrom}T00:00:00`)
      if (filters.dateTo) query = query.lte('due_at', `${filters.dateTo}T23:59:59`)

      const { data, error } = await query.order('due_at', { ascending: true }).limit(500)
      if (error) throw error
      return (data ?? []).map(mapActivity)
    },
  })
}

export function useActivitiesForRangeQuery(startIso: string, endIso: string) {
  const { activeWorkspace } = useWorkspace()

  return useQuery({
    queryKey: ['activities-range', activeWorkspace?.id, startIso, endIso],
    enabled: !!activeWorkspace,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('*, clients(id, name), orders(id)')
        .eq('workspace_id', activeWorkspace!.id)
        .gte('due_at', startIso)
        .lte('due_at', endIso)
        .order('due_at', { ascending: true })
      if (error) throw error
      return (data ?? []).map(mapActivity)
    },
  })
}

export function useActivitiesForClientQuery(clientId: string | undefined) {
  return useQuery({
    queryKey: ['activities-client', clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('client_id', clientId!)
        .order('due_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useActivityQuery(id: string | undefined) {
  return useQuery({
    queryKey: ['activity', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('*, clients(id, name), orders(id)')
        .eq('id', id!)
        .single()
      if (error) throw error
      return mapActivity(data)
    },
  })
}

export interface ActivityPayload {
  type: ActivityType
  title: string
  description: string | null
  due_at: string
  client_id: string | null
  order_id: string | null
  status: ActivityStatus
  created_by?: string | null
  assigned_to?: string | null
}

function invalidateActivityQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['activities'] })
  queryClient.invalidateQueries({ queryKey: ['activities-range'] })
  queryClient.invalidateQueries({ queryKey: ['activities-client'] })
}

export function useCreateActivity() {
  const { activeWorkspace } = useWorkspace()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: ActivityPayload) => {
      const { error } = await supabase.from('activities').insert({ ...payload, workspace_id: activeWorkspace!.id })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => invalidateActivityQueries(queryClient),
  })
}

export function useUpdateActivity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: ActivityPayload }) => {
      const { error } = await supabase.from('activities').update(payload).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: (_data, variables) => {
      invalidateActivityQueries(queryClient)
      queryClient.invalidateQueries({ queryKey: ['activity', variables.id] })
    },
  })
}

export function useToggleActivityStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ActivityStatus }) => {
      const { error } = await supabase
        .from('activities')
        .update({ status, completed_at: status === 'completed' ? new Date().toISOString() : null })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    onMutate: async ({ id, status }) => {
      const queries = queryClient.getQueriesData<ActivityWithRelations[]>({ queryKey: ['activities'] })
      for (const [key, data] of queries) {
        if (!data) continue
        queryClient.setQueryData(
          key,
          data.map((a) => (a.id === id ? { ...a, status } : a)),
        )
      }
    },
    onSettled: () => invalidateActivityQueries(queryClient),
  })
}

export function useDeleteActivity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('activities').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => invalidateActivityQueries(queryClient),
  })
}
