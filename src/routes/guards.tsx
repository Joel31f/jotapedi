import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/providers/AuthProvider'
import { useWorkspace } from '@/providers/WorkspaceProvider'
import { hasSectionAccess, type SectionKey } from '@/config/sections'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <FullScreenSpinner />
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  return <>{children}</>
}

export function RequireWorkspace({ children }: { children: ReactNode }) {
  const { loading, hasWorkspace } = useWorkspace()

  if (loading) return <FullScreenSpinner />
  if (!hasWorkspace) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

export function RedirectIfHasWorkspace({ children }: { children: ReactNode }) {
  const { loading, hasWorkspace } = useWorkspace()

  if (loading) return <FullScreenSpinner />
  if (hasWorkspace) return <Navigate to="/" replace />
  return <>{children}</>
}

export function RequireSection({ section, children }: { section: SectionKey; children: ReactNode }) {
  const { loading, activeMembership } = useWorkspace()

  if (loading) return <FullScreenSpinner />
  if (!hasSectionAccess(activeMembership, section)) return <Navigate to="/sem-permissao" replace />
  return <>{children}</>
}

export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <FullScreenSpinner />
  if (user) return <Navigate to="/" replace />
  return <>{children}</>
}

function FullScreenSpinner() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background">
      <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  )
}
