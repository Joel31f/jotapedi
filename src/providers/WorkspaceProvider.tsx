import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/AuthProvider'
import type { Database } from '@/types/database'

type WorkspaceRow = Database['public']['Tables']['workspaces']['Row']
type UserRow = Database['public']['Tables']['users']['Row']
type StageRow = Database['public']['Tables']['pipeline_stages']['Row']

const ACTIVE_WORKSPACE_KEY = 'jotapedi_active_workspace'

interface Membership {
  membership: UserRow
  workspace: WorkspaceRow
}

interface WorkspaceContextValue {
  loading: boolean
  memberships: Membership[]
  activeWorkspace: WorkspaceRow | null
  activeMembership: UserRow | null
  stages: StageRow[]
  isAdmin: boolean
  hasWorkspace: boolean
  switchWorkspace: (workspaceId: string) => void
  createWorkspace: (name: string) => Promise<{ error: string | null }>
  refresh: () => Promise<void>
  refreshStages: () => Promise<void>
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(
    () => localStorage.getItem(ACTIVE_WORKSPACE_KEY),
  )
  const [stages, setStages] = useState<StageRow[]>([])

  const loadMemberships = useCallback(async () => {
    if (authLoading) {
      return
    }

    if (!user) {
      setMemberships([])
      setLoading(false)
      return
    }

    setLoading(true)
    await supabase.rpc('accept_pending_invites')

    const { data: userRows } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', user.id)
      .not('joined_at', 'is', null)

    if (!userRows || userRows.length === 0) {
      setMemberships([])
      setLoading(false)
      return
    }

    const workspaceIds = userRows.map((u) => u.workspace_id)
    const { data: workspaceRows } = await supabase.from('workspaces').select('*').in('id', workspaceIds)

    const combined: Membership[] = []
    for (const membership of userRows) {
      const workspace = workspaceRows?.find((w) => w.id === membership.workspace_id)
      if (workspace) combined.push({ membership, workspace })
    }

    setMemberships(combined)
    setLoading(false)
  }, [user, authLoading])

  useEffect(() => {
    loadMemberships()
  }, [loadMemberships])

  useEffect(() => {
    if (memberships.length === 0) return
    const stillValid = memberships.some((m) => m.workspace.id === activeWorkspaceId)
    if (!stillValid) {
      setActiveWorkspaceId(memberships[0].workspace.id)
    }
  }, [memberships, activeWorkspaceId])

  const refreshStages = useCallback(async () => {
    if (!activeWorkspaceId) {
      setStages([])
      return
    }
    const { data } = await supabase
      .from('pipeline_stages')
      .select('*')
      .eq('workspace_id', activeWorkspaceId)
      .order('position', { ascending: true })
    setStages(data ?? [])
  }, [activeWorkspaceId])

  useEffect(() => {
    refreshStages()
  }, [refreshStages])

  const switchWorkspace = (workspaceId: string) => {
    localStorage.setItem(ACTIVE_WORKSPACE_KEY, workspaceId)
    setActiveWorkspaceId(workspaceId)
  }

  const createWorkspace: WorkspaceContextValue['createWorkspace'] = async (name) => {
    const { data, error } = await supabase.rpc('create_workspace', {
      p_name: name,
      p_user_name: (user?.user_metadata?.name as string | undefined) ?? null,
    })
    if (error) return { error: error.message }
    await loadMemberships()
    if (data) {
      localStorage.setItem(ACTIVE_WORKSPACE_KEY, data)
      setActiveWorkspaceId(data)
    }
    return { error: null }
  }

  const activeMembershipEntry = memberships.find((m) => m.workspace.id === activeWorkspaceId) ?? null

  return (
    <WorkspaceContext.Provider
      value={{
        loading,
        memberships,
        activeWorkspace: activeMembershipEntry?.workspace ?? null,
        activeMembership: activeMembershipEntry?.membership ?? null,
        stages,
        isAdmin: activeMembershipEntry?.membership.role === 'admin',
        hasWorkspace: memberships.length > 0,
        switchWorkspace,
        createWorkspace,
        refresh: loadMemberships,
        refreshStages,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace deve ser usado dentro de <WorkspaceProvider>')
  return ctx
}
