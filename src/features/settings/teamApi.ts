import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useWorkspace } from '@/providers/WorkspaceProvider'
import type { SectionAccess, UserRole } from '@/types/database'

export function useTeamMembersQuery() {
  const { activeWorkspace } = useWorkspace()

  return useQuery({
    queryKey: ['team-members', activeWorkspace?.id],
    enabled: !!activeWorkspace,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('workspace_id', activeWorkspace!.id)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data ?? []
    },
  })
}

export interface InviteMemberPayload {
  email: string
  role: UserRole
  section_access: SectionAccess
  can_view_all_records: boolean
}

export function useInviteMember() {
  const { activeWorkspace } = useWorkspace()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: InviteMemberPayload) => {
      const { error } = await supabase.from('users').insert({
        workspace_id: activeWorkspace!.id,
        email: payload.email,
        role: payload.role,
        section_access: payload.section_access,
        can_view_all_records: payload.can_view_all_records,
        invited_at: new Date().toISOString(),
      })
      if (error) throw new Error(error.code === '23505' ? 'Esse email já foi convidado.' : error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-members'] }),
  })
}

export interface UpdateMemberPermissionsPayload {
  id: string
  role: UserRole
  section_access: SectionAccess
  can_view_all_records: boolean
}

export function useUpdateMemberPermissions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateMemberPermissionsPayload) => {
      const { error } = await supabase.from('users').update(payload).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-members'] }),
  })
}

export function useRemoveMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('users').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-members'] }),
  })
}
