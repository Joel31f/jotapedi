import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useWorkspace } from '@/providers/WorkspaceProvider'

export interface WorkspacePreferences {
  currency: string
  timezone: string
  date_format: string
}

export function useUpdateWorkspacePreferences() {
  const { activeWorkspace, refresh } = useWorkspace()

  return useMutation({
    mutationFn: async (payload: WorkspacePreferences) => {
      const { error } = await supabase.from('workspaces').update(payload).eq('id', activeWorkspace!.id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => refresh(),
  })
}
