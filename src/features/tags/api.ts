import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useWorkspace } from '@/providers/WorkspaceProvider'

const TAG_COLORS = ['#00e676', '#4d9de0', '#c084fc', '#f59e0b', '#f87171', '#38bdf8']

export function useTagsQuery() {
  const { activeWorkspace } = useWorkspace()

  return useQuery({
    queryKey: ['tags', activeWorkspace?.id],
    enabled: !!activeWorkspace,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('workspace_id', activeWorkspace!.id)
        .order('name', { ascending: true })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useCreateTag() {
  const { activeWorkspace } = useWorkspace()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (name: string) => {
      const color = TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]
      const { data, error } = await supabase
        .from('tags')
        .insert({ workspace_id: activeWorkspace!.id, name, color })
        .select('*')
        .single()
      if (error) throw new Error(error.code === '23505' ? 'Essa tag já existe.' : error.message)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tags'] }),
  })
}
