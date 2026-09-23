import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useWorkspace } from '@/providers/WorkspaceProvider'
import type { Database } from '@/types/database'

export type Product = Database['public']['Tables']['products']['Row']
export type ProductInsert = Database['public']['Tables']['products']['Insert']
export type ProductUpdate = Database['public']['Tables']['products']['Update']

export interface ProductFilters {
  search: string
  category: string | null
  status: 'all' | 'active' | 'inactive'
  priceStatus: 'all' | 'with_price' | 'no_price'
  minPrice: string
  maxPrice: string
}

export const PRODUCTS_PAGE_SIZE = 20

export function useProductsQuery(filters: ProductFilters, page: number) {
  const { activeWorkspace } = useWorkspace()

  return useQuery({
    queryKey: ['products', activeWorkspace?.id, filters, page],
    enabled: !!activeWorkspace,
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*', { count: 'exact' })
        .eq('workspace_id', activeWorkspace!.id)

      const search = filters.search.replace(/[,%]/g, '').trim()
      if (search) query = query.or(`sku.ilike.%${search}%,description.ilike.%${search}%`)
      if (filters.category) query = query.eq('category', filters.category)
      if (filters.status === 'active') query = query.eq('active', true)
      if (filters.status === 'inactive') query = query.eq('active', false)
      if (filters.priceStatus === 'no_price') query = query.eq('sale_price', 0)
      if (filters.priceStatus === 'with_price') query = query.gt('sale_price', 0)
      if (filters.minPrice) query = query.gte('sale_price', Number(filters.minPrice.replace(',', '.')) || 0)
      if (filters.maxPrice) query = query.lte('sale_price', Number(filters.maxPrice.replace(',', '.')) || 0)

      query = query
        .order('description', { ascending: true })
        .range(page * PRODUCTS_PAGE_SIZE, page * PRODUCTS_PAGE_SIZE + PRODUCTS_PAGE_SIZE - 1)

      const { data, error, count } = await query
      if (error) throw error
      return { rows: data ?? [], count: count ?? 0 }
    },
  })
}

export function useProductQuery(id: string | undefined) {
  return useQuery({
    queryKey: ['product', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*').eq('id', id!).single()
      if (error) throw error
      return data as Product
    },
  })
}

export function useProductCategoriesQuery() {
  const { activeWorkspace } = useWorkspace()

  return useQuery({
    queryKey: ['product-categories', activeWorkspace?.id],
    enabled: !!activeWorkspace,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('category')
        .eq('workspace_id', activeWorkspace!.id)
        .not('category', 'is', null)
      if (error) throw error
      const unique = new Set((data ?? []).map((row) => row.category).filter(Boolean) as string[])
      return Array.from(unique).sort()
    },
  })
}

function friendlyError(error: { code?: string; message: string }) {
  if (error.code === '23505') return 'Já existe um produto com esse SKU neste workspace.'
  return error.message
}

export function useCreateProduct() {
  const { activeWorkspace } = useWorkspace()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: Omit<ProductInsert, 'workspace_id'>) => {
      const { error } = await supabase
        .from('products')
        .insert({ ...payload, workspace_id: activeWorkspace!.id })
      if (error) throw new Error(friendlyError(error))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product-categories'] })
    },
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: ProductUpdate }) => {
      const { error, count } = await supabase.from('products').update(payload, { count: 'exact' }).eq('id', id)
      if (error) throw new Error(friendlyError(error))
      if (!count) throw new Error('Produto não encontrado ou sem permissão para editar nesta área de trabalho.')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product-categories'] })
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  })
}

const CHUNK_SIZE = 200

export function useBulkDeleteProducts() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ids: string[]) => {
      let deleted = 0
      for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
        const chunk = ids.slice(i, i + CHUNK_SIZE)
        const { error, count } = await supabase.from('products').delete({ count: 'exact' }).in('id', chunk)
        if (error) throw new Error(error.message)
        deleted += count ?? 0
      }
      return deleted
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product-categories'] })
    },
  })
}

export function useBulkDeleteProductsByFilter() {
  const { activeWorkspace } = useWorkspace()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (filters: ProductFilters) => {
      let query = supabase.from('products').delete({ count: 'exact' }).eq('workspace_id', activeWorkspace!.id)

      const search = filters.search.replace(/[,%]/g, '').trim()
      if (search) query = query.or(`sku.ilike.%${search}%,description.ilike.%${search}%`)
      if (filters.category) query = query.eq('category', filters.category)
      if (filters.status === 'active') query = query.eq('active', true)
      if (filters.status === 'inactive') query = query.eq('active', false)
      if (filters.priceStatus === 'no_price') query = query.eq('sale_price', 0)
      if (filters.priceStatus === 'with_price') query = query.gt('sale_price', 0)
      if (filters.minPrice) query = query.gte('sale_price', Number(filters.minPrice.replace(',', '.')) || 0)
      if (filters.maxPrice) query = query.lte('sale_price', Number(filters.maxPrice.replace(',', '.')) || 0)

      const { error, count } = await query
      if (error) throw new Error(error.message)
      return count ?? 0
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product-categories'] })
    },
  })
}

export interface ProductBulkEditPayload {
  category?: string | null
  active?: boolean
}

export function useBulkUpdateProducts() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ ids, payload }: { ids: string[]; payload: ProductBulkEditPayload }) => {
      let updated = 0
      for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
        const chunk = ids.slice(i, i + CHUNK_SIZE)
        const { error, count } = await supabase.from('products').update(payload, { count: 'exact' }).in('id', chunk)
        if (error) throw new Error(friendlyError(error))
        updated += count ?? 0
      }
      return updated
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product-categories'] })
    },
  })
}

export function useBulkUpdateProductsBySku() {
  const { activeWorkspace } = useWorkspace()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (rows: { sku: string; payload: ProductUpdate }[]) => {
      let updated = 0
      const CONCURRENCY = 20
      for (let i = 0; i < rows.length; i += CONCURRENCY) {
        const batch = rows.slice(i, i + CONCURRENCY)
        const results = await Promise.all(
          batch.map(({ sku, payload }) =>
            supabase.from('products').update(payload, { count: 'exact' }).eq('workspace_id', activeWorkspace!.id).eq('sku', sku),
          ),
        )
        for (const { error, count } of results) {
          if (error) throw new Error(friendlyError(error))
          updated += count ?? 0
        }
      }
      return updated
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product-categories'] })
    },
  })
}

export function useBulkInsertProducts() {
  const { activeWorkspace } = useWorkspace()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (rows: Omit<ProductInsert, 'workspace_id'>[]) => {
      const payload = rows.map((row) => ({ ...row, workspace_id: activeWorkspace!.id }))
      const { error, count } = await supabase.from('products').insert(payload, { count: 'exact' })
      if (error) throw new Error(friendlyError(error))
      return count ?? payload.length
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product-categories'] })
    },
  })
}
