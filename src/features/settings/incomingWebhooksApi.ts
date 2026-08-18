import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useWorkspace } from '@/providers/WorkspaceProvider'

export function useIncomingWebhooksQuery() {
  const { activeWorkspace } = useWorkspace()

  return useQuery({
    queryKey: ['incoming-webhooks', activeWorkspace?.id],
    enabled: !!activeWorkspace,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incoming_webhooks')
        .select('*')
        .eq('workspace_id', activeWorkspace!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useCreateIncomingWebhook() {
  const { activeWorkspace } = useWorkspace()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from('incoming_webhooks').insert({ workspace_id: activeWorkspace!.id, name })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['incoming-webhooks'] }),
  })
}

export function useUpdateIncomingWebhook() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('incoming_webhooks').update({ active }).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['incoming-webhooks'] }),
  })
}

export function useDeleteIncomingWebhook() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('incoming_webhooks').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['incoming-webhooks'] }),
  })
}
