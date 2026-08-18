import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useWorkspace } from '@/providers/WorkspaceProvider'

export function useCreateStage() {
  const { activeWorkspace, stages, refreshStages } = useWorkspace()

  return useMutation({
    mutationFn: async (name: string) => {
      const position = stages.length > 0 ? Math.max(...stages.map((s) => s.position)) + 1 : 0
      const { error } = await supabase
        .from('pipeline_stages')
        .insert({ workspace_id: activeWorkspace!.id, name, position, color: '#00e676' })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => refreshStages(),
  })
}

export function useUpdateStage() {
  const { refreshStages } = useWorkspace()

  return useMutation({
    mutationFn: async ({ id, name, color }: { id: string; name?: string; color?: string }) => {
      const payload: { name?: string; color?: string } = {}
      if (name !== undefined) payload.name = name
      if (color !== undefined) payload.color = color
      const { error } = await supabase.from('pipeline_stages').update(payload).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => refreshStages(),
  })
}

export function useReorderStages() {
  const { refreshStages } = useWorkspace()

  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      await Promise.all(orderedIds.map((id, index) => supabase.from('pipeline_stages').update({ position: index }).eq('id', id)))
    },
    onSuccess: () => refreshStages(),
  })
}

export function useDeleteStage() {
  const { refreshStages } = useWorkspace()

  return useMutation({
    mutationFn: async (id: string) => {
      const { count, error: countError } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('stage_id', id)
      if (countError) throw new Error(countError.message)
      if ((count ?? 0) > 0) {
        throw new Error('Existem pedidos nesse estágio. Mova-os antes de excluir.')
      }
      const { error } = await supabase.from('pipeline_stages').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => refreshStages(),
  })
}
