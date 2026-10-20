import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useWorkspace } from '@/providers/WorkspaceProvider'
import { compressImage } from '@/lib/image'
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

// Cada envio usa um nome novo (UUID), então o arquivo nunca muda: o navegador pode guardá-lo por 1 ano.
async function uploadLogo(workspaceId: string, original: File): Promise<string> {
  const file = await compressImage(original)
  const ext = file.name.split('.').pop()
  const path = `${workspaceId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('brand-logos').upload(path, file, { cacheControl: '31536000' })
  if (error) throw new Error(error.message)
  return supabase.storage.from('brand-logos').getPublicUrl(path).data.publicUrl
}

function storagePathFromUrl(url: string | null): string | null {
  const marker = '/brand-logos/'
  const index = url ? url.indexOf(marker) : -1
  return url && index >= 0 ? decodeURIComponent(url.slice(index + marker.length)) : null
}

export function useCreateBrand() {
  const { activeWorkspace } = useWorkspace()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ name, file }: { name: string; file: File | null }) => {
      const logo_url = file ? await uploadLogo(activeWorkspace!.id, file) : null
      const { error } = await supabase.from('brands').insert({ workspace_id: activeWorkspace!.id, name, logo_url })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['brands'] }),
  })
}

export function useReplaceBrandLogo() {
  const { activeWorkspace } = useWorkspace()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ brand, file }: { brand: Brand; file: File }) => {
      const logo_url = await uploadLogo(activeWorkspace!.id, file)
      const { error } = await supabase.from('brands').update({ logo_url }).eq('id', brand.id)
      if (error) throw new Error(error.message)
      const oldPath = storagePathFromUrl(brand.logo_url)
      if (oldPath) await supabase.storage.from('brand-logos').remove([oldPath])
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
