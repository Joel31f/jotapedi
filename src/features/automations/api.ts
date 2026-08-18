import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useWorkspace } from '@/providers/WorkspaceProvider'
import type { AutomationAction, AutomationTrigger, Database } from '@/types/database'

export type Automation = Database['public']['Tables']['automations']['Row']
export type AutomationLog = Database['public']['Tables']['automation_logs']['Row']

export function useAutomationsQuery() {
  const { activeWorkspace } = useWorkspace()

  return useQuery({
    queryKey: ['automations', activeWorkspace?.id],
    enabled: !!activeWorkspace,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automations')
        .select('*')
        .eq('workspace_id', activeWorkspace!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useAutomationLogsQuery(automationId: string | undefined) {
  return useQuery({
    queryKey: ['automation-logs', automationId],
    enabled: !!automationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automation_logs')
        .select('*')
        .eq('automation_id', automationId!)
        .order('triggered_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data ?? []
    },
  })
}

export interface AutomationPayload {
  name: string
  trigger_type: AutomationTrigger
  trigger_config: Record<string, unknown>
  action_type: AutomationAction
  action_config: Record<string, unknown>
  active: boolean
}

export function useCreateAutomation() {
  const { activeWorkspace } = useWorkspace()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: AutomationPayload) => {
      const { error } = await supabase.from('automations').insert({ ...payload, workspace_id: activeWorkspace!.id })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['automations'] }),
  })
}

export function useUpdateAutomation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<AutomationPayload> }) => {
      const { error } = await supabase.from('automations').update(payload).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['automations'] }),
  })
}

export function useDeleteAutomation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('automations').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['automations'] }),
  })
}

export function useRunScheduledAutomations() {
  return useMutation({
    mutationFn: async () => {
      await supabase.rpc('run_scheduled_automations')
    },
  })
}
