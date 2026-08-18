import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useWorkspace } from '@/providers/WorkspaceProvider'
import type { WebhookEvent } from '@/types/database'

export function useWebhooksQuery() {
  const { activeWorkspace } = useWorkspace()

  return useQuery({
    queryKey: ['webhooks', activeWorkspace?.id],
    enabled: !!activeWorkspace,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('webhooks')
        .select('*')
        .eq('workspace_id', activeWorkspace!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useCreateWebhook() {
  const { activeWorkspace } = useWorkspace()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ url, event }: { url: string; event: WebhookEvent }) => {
      const { error } = await supabase.from('webhooks').insert({ workspace_id: activeWorkspace!.id, url, event })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['webhooks'] }),
  })
}

export function useUpdateWebhook() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('webhooks').update({ active }).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['webhooks'] }),
  })
}

export function useDeleteWebhook() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('webhooks').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['webhooks'] }),
  })
}
