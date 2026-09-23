import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useWorkspace } from '@/providers/WorkspaceProvider'
import type { Database, LeadStage } from '@/types/database'

export type Client = Database['public']['Tables']['clients']['Row']
export type ClientInsert = Database['public']['Tables']['clients']['Insert']
export type ClientUpdate = Database['public']['Tables']['clients']['Update']
export type ClientWithTags = Client & { tags: { id: string; name: string; color: string }[] }

export interface ClientFilters {
  search: string
  leadStage: LeadStage | 'all'
}

export const CLIENTS_PAGE_SIZE = 20

function mapClientTags(row: any): ClientWithTags {
  const { client_tags, ...rest } = row
  return {
    ...rest,
    tags: (client_tags ?? [])
      .map((ct: { tags: { id: string; name: string; color: string } | null }) => ct.tags)
      .filter((t: unknown): t is { id: string; name: string; color: string } => !!t),
  } as ClientWithTags
}

export function useClientsQuery(filters: ClientFilters, page: number) {
  const { activeWorkspace } = useWorkspace()

  return useQuery({
    queryKey: ['clients', activeWorkspace?.id, filters, page],
    enabled: !!activeWorkspace,
    queryFn: async () => {
      let query = supabase
        .from('clients')
        .select('*, client_tags(tags(id, name, color))', { count: 'exact' })
        .eq('workspace_id', activeWorkspace!.id)

      const search = filters.search.replace(/[,%]/g, '').trim()
      if (search) {
        query = query.ilike('search_text', `%${search.toLowerCase()}%`)
      }
      if (filters.leadStage !== 'all') query = query.eq('lead_stage', filters.leadStage)

      query = query
        .order('name', { ascending: true })
        .range(page * CLIENTS_PAGE_SIZE, page * CLIENTS_PAGE_SIZE + CLIENTS_PAGE_SIZE - 1)

      const { data, error, count } = await query
      if (error) throw error
      return { rows: (data ?? []).map(mapClientTags), count: count ?? 0 }
    },
  })
}

export function useAllClientsForKanbanQuery(search: string) {
  const { activeWorkspace } = useWorkspace()

  return useQuery({
    queryKey: ['clients-kanban', activeWorkspace?.id, search],
    enabled: !!activeWorkspace,
    queryFn: async () => {
      let query = supabase
        .from('clients')
        .select('*, client_tags(tags(id, name, color))')
        .eq('workspace_id', activeWorkspace!.id)

      const cleaned = search.replace(/[,%]/g, '').trim()
      if (cleaned) query = query.or(`name.ilike.%${cleaned}%,company.ilike.%${cleaned}%`)

      const { data, error } = await query.order('name', { ascending: true }).limit(500)
      if (error) throw error
      return (data ?? []).map(mapClientTags)
    },
  })
}

export function useClientQuery(id: string | undefined) {
  return useQuery({
    queryKey: ['client', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*, client_tags(tags(id, name, color))')
        .eq('id', id!)
        .single()
      if (error) throw error
      return mapClientTags(data)
    },
  })
}

export function useClientOrderStatsQuery(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-order-stats', clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, total, created_at, stage_id, pipeline_stages(name, is_won)')
        .eq('client_id', clientId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      const rows = data ?? []
      const totalPurchased = rows
        .filter((r) => (r.pipeline_stages as unknown as { is_won: boolean } | null)?.is_won)
        .reduce((sum, r) => sum + r.total, 0)
      return {
        ordersCount: rows.length,
        totalPurchased,
        lastOrderAt: rows[0]?.created_at ?? null,
        orders: rows,
      }
    },
  })
}

async function syncClientTags(clientId: string, tagIds: string[]) {
  await supabase.from('client_tags').delete().eq('client_id', clientId)
  if (tagIds.length > 0) {
    await supabase.from('client_tags').insert(tagIds.map((tagId) => ({ client_id: clientId, tag_id: tagId })))
  }
}

export function useCreateClient() {
  const { activeWorkspace } = useWorkspace()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ payload, tagIds }: { payload: Omit<ClientInsert, 'workspace_id'>; tagIds: string[] }) => {
      const { data, error } = await supabase
        .from('clients')
        .insert({ ...payload, workspace_id: activeWorkspace!.id })
        .select('id')
        .single()
      if (error) throw new Error(error.message)
      await syncClientTags(data.id, tagIds)
      return data.id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['clients-kanban'] })
    },
  })
}

export function useUpdateClient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, payload, tagIds }: { id: string; payload: ClientUpdate; tagIds?: string[] }) => {
      const { error, count } = await supabase.from('clients').update(payload, { count: 'exact' }).eq('id', id)
      if (error) throw new Error(error.message)
      if (!count) throw new Error('Cliente não encontrado ou sem permissão para editar nesta área de trabalho.')
      if (tagIds) await syncClientTags(id, tagIds)
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['clients-kanban'] })
      queryClient.invalidateQueries({ queryKey: ['client', variables.id] })
    },
  })
}

export function useUpdateClientStage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, leadStage }: { id: string; leadStage: LeadStage }) => {
      const { error } = await supabase.from('clients').update({ lead_stage: leadStage }).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onMutate: async ({ id, leadStage }) => {
      const queries = queryClient.getQueriesData<ClientWithTags[]>({ queryKey: ['clients-kanban'] })
      for (const [key, data] of queries) {
        if (!data) continue
        queryClient.setQueryData(
          key,
          data.map((c) => (c.id === id ? { ...c, lead_stage: leadStage } : c)),
        )
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['clients-kanban'] })
      queryClient.invalidateQueries({ queryKey: ['clients'] })
    },
  })
}

export function useDeleteClient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('clients').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['clients-kanban'] })
    },
  })
}

const BULK_DELETE_CHUNK_SIZE = 200

export function useBulkDeleteClients() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ids: string[]) => {
      let deleted = 0
      for (let i = 0; i < ids.length; i += BULK_DELETE_CHUNK_SIZE) {
        const chunk = ids.slice(i, i + BULK_DELETE_CHUNK_SIZE)
        const { error, count } = await supabase.from('clients').delete({ count: 'exact' }).in('id', chunk)
        if (error) throw new Error(error.message)
        deleted += count ?? 0
      }
      return deleted
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['clients-kanban'] })
    },
  })
}

export function useBulkDeleteClientsByFilter() {
  const { activeWorkspace } = useWorkspace()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (filters: ClientFilters) => {
      let query = supabase.from('clients').delete({ count: 'exact' }).eq('workspace_id', activeWorkspace!.id)

      const search = filters.search.replace(/[,%]/g, '').trim()
      if (search) query = query.ilike('search_text', `%${search.toLowerCase()}%`)
      if (filters.leadStage !== 'all') query = query.eq('lead_stage', filters.leadStage)

      const { error, count } = await query
      if (error) throw new Error(error.message)
      return count ?? 0
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['clients-kanban'] })
    },
  })
}

export function useBulkInsertClients() {
  const { activeWorkspace } = useWorkspace()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (rows: Omit<ClientInsert, 'workspace_id'>[]) => {
      const payload = rows.map((row) => ({ ...row, workspace_id: activeWorkspace!.id }))
      const { error, count } = await supabase.from('clients').insert(payload, { count: 'exact' })
      if (error) throw new Error(error.message)
      return count ?? payload.length
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['clients-kanban'] })
    },
  })
}
