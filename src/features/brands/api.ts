import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useWorkspace } from '@/providers/WorkspaceProvider'
import type { Database } from '@/types/database'

export type Brand = Database['public']['Tables']['brands']['Row']

export function useBrandsQuery() {
  const { activeWorkspace } = useWorkspace()

  return useQuery({
    queryKey: ['brands', activeWorkspace?.id],
    enabled: !!activeWorkspace,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('workspace_id', activeWorkspace!.id)
        .order('name', { ascending: true })
      if (error) throw new Error(error.message)
      return data
    },
  })
}

export function useCreateBrand() {
  const { activeWorkspace } = useWorkspace()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ name, file }: { name: string; file: File | null }) => {
      let logo_url: string | null = null
      if (file) {
        const ext = file.name.split('.').pop()
        const path = `${activeWorkspace!.id}/${crypto.randomUUID()}.${ext}`
        const { error: uploadError } = await supabase.storage.from('brand-logos').upload(path, file)
        if (uploadError) throw new Error(uploadError.message)
        logo_url = supabase.storage.from('brand-logos').getPublicUrl(path).data.publicUrl
      }
      const { error } = await supabase.from('brands').insert({ workspace_id: activeWorkspace!.id, name, logo_url })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['brands'] }),
  })
}

export function useDeleteBrand() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('brands').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['brands'] }),
  })
}
