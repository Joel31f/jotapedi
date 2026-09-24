import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useWorkspace } from '@/providers/WorkspaceProvider'
import type { Database } from '@/types/database'

export type Order = Database['public']['Tables']['orders']['Row']
export type OrderItem = Database['public']['Tables']['order_items']['Row']
export type OrderItemInsert = Database['public']['Tables']['order_items']['Insert']

export interface OrderWithRelations extends Order {
  client: { id: string; name: string; company: string | null } | null
  stage: { id: string; name: string; color: string } | null
}

export interface OrderWithItems extends OrderWithRelations {
  items: OrderItem[]
}

export interface OrderFilters {
  stageId: string | 'all'
  clientId: string | null
  clientLabel: string | null
  dateFrom: string
  dateTo: string
  minValue: string
  maxValue: string
}

export const EMPTY_ORDER_FILTERS: OrderFilters = {
  stageId: 'all',
  clientId: null,
  clientLabel: null,
  dateFrom: '',
  dateTo: '',
  minValue: '',
  maxValue: '',
}

export const ORDERS_PAGE_SIZE = 20

function mapOrder(row: any): OrderWithRelations {
  const { clients, pipeline_stages, ...rest } = row
  return { ...rest, client: clients ?? null, stage: pipeline_stages ?? null }
}

function applyOrderFilters(query: any, filters: OrderFilters) {
  if (filters.stageId !== 'all') query = query.eq('stage_id', filters.stageId)
  if (filters.clientId) query = query.eq('client_id', filters.clientId)
  if (filters.dateFrom) query = query.gte('created_at', `${filters.dateFrom}T00:00:00`)
  if (filters.dateTo) query = query.lte('created_at', `${filters.dateTo}T23:59:59`)
  if (filters.minValue) query = query.gte('total', Number(filters.minValue.replace(',', '.')))
  if (filters.maxValue) query = query.lte('total', Number(filters.maxValue.replace(',', '.')))
  return query
}

export function useOrdersQuery(filters: OrderFilters, page: number) {
  const { activeWorkspace } = useWorkspace()

  return useQuery({
    queryKey: ['orders', activeWorkspace?.id, filters, page],
    enabled: !!activeWorkspace,
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select('*, clients(id, name, company), pipeline_stages(id, name, color)', { count: 'exact' })
        .eq('workspace_id', activeWorkspace!.id)

      query = applyOrderFilters(query, filters)
      query = query
        .order('created_at', { ascending: false })
        .range(page * ORDERS_PAGE_SIZE, page * ORDERS_PAGE_SIZE + ORDERS_PAGE_SIZE - 1)

      const { data, error, count } = await query
      if (error) throw error
      return { rows: (data ?? []).map(mapOrder), count: count ?? 0 }
    },
  })
}

export function useOrdersKanbanQuery(filters: OrderFilters) {
  const { activeWorkspace } = useWorkspace()

  return useQuery({
    queryKey: ['orders-kanban', activeWorkspace?.id, filters],
    enabled: !!activeWorkspace,
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select('*, clients(id, name, company), pipeline_stages(id, name, color)')
        .eq('workspace_id', activeWorkspace!.id)

      query = applyOrderFilters(query, filters)
      const { data, error } = await query.order('created_at', { ascending: false }).limit(300)
      if (error) throw error
      return (data ?? []).map(mapOrder)
    },
  })
}

export function useOrderQuery(id: string | undefined) {
  return useQuery({
    queryKey: ['order', id],
    enabled: !!id,
    queryFn: async () => {
      const { data: order, error } = await supabase
        .from('orders')
        .select('*, clients(id, name, company), pipeline_stages(id, name, color)')
        .eq('id', id!)
        .single()
      if (error) throw error

      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', id!)
        .order('position', { ascending: true })
      if (itemsError) throw itemsError

      return { ...mapOrder(order), items: items ?? [] } as OrderWithItems
    },
  })
}

export interface OrderPayload {
  client_id: string
  stage_id: string
  subtotal: number
  discount_type: 'percent' | 'value'
  discount_value: number
  freight: number
  total: number
  notes: string | null
  contact_name: string | null
  shipping_method: string | null
  payment_terms: string | null
  delivery_date: string | null
  purchase_order_number: string | null
  created_by?: string | null
  assigned_to?: string | null
  brand_id?: string | null
}

export interface OrderItemPayload {
  product_id: string | null
  description: string
  quantity: number
  unit_price: number
  discount_type: 'percent' | 'value'
  discount_value: number
  total: number
  position: number
  notes: string | null
}

async function replaceOrderItems(orderId: string, items: OrderItemPayload[]) {
  await supabase.from('order_items').delete().eq('order_id', orderId)
  if (items.length > 0) {
    await supabase.from('order_items').insert(items.map((item) => ({ ...item, order_id: orderId })))
  }
}

export function useCreateOrder() {
  const { activeWorkspace } = useWorkspace()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ payload, items }: { payload: OrderPayload; items: OrderItemPayload[] }) => {
      const { data, error } = await supabase
        .from('orders')
        .insert({ ...payload, workspace_id: activeWorkspace!.id })
        .select('id')
        .single()
      if (error) throw new Error(error.message)
      await replaceOrderItems(data.id, items)
      return data.id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['orders-kanban'] })
    },
  })
}

export function useUpdateOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, payload, items }: { id: string; payload: OrderPayload; items: OrderItemPayload[] }) => {
      const { error, count } = await supabase.from('orders').update(payload, { count: 'exact' }).eq('id', id)
      if (error) throw new Error(error.message)
      if (!count) throw new Error('Pedido não encontrado ou sem permissão para editar nesta área de trabalho.')
      await replaceOrderItems(id, items)
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['orders-kanban'] })
      queryClient.invalidateQueries({ queryKey: ['order', variables.id] })
    },
  })
}

export function useUpdateOrderStage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, stageId }: { id: string; stageId: string }) => {
      const { error } = await supabase.from('orders').update({ stage_id: stageId }).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onMutate: async ({ id, stageId }) => {
      const queries = queryClient.getQueriesData<OrderWithRelations[]>({ queryKey: ['orders-kanban'] })
      for (const [key, data] of queries) {
        if (!data) continue
        queryClient.setQueryData(
          key,
          data.map((o) => (o.id === id ? { ...o, stage_id: stageId } : o)),
        )
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['orders-kanban'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export function useDeleteOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('orders').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['orders-kanban'] })
    },
  })
}
