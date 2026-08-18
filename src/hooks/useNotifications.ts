import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useWorkspace } from '@/providers/WorkspaceProvider'
import type { Database } from '@/types/database'

type NotificationRow = Database['public']['Tables']['notifications']['Row']

export function useNotifications() {
  const { activeWorkspace, activeMembership } = useWorkspace()
  const [notifications, setNotifications] = useState<NotificationRow[]>([])

  const load = useCallback(async () => {
    if (!activeWorkspace) {
      setNotifications([])
      return
    }
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('workspace_id', activeWorkspace.id)
      .order('created_at', { ascending: false })
      .limit(20)
    setNotifications(data ?? [])
  }, [activeWorkspace])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!activeWorkspace) return
    const channel = supabase
      .channel(`notifications:${activeWorkspace.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `workspace_id=eq.${activeWorkspace.id}` },
        (payload) => {
          setNotifications((prev) => [payload.new as NotificationRow, ...prev].slice(0, 20))
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeWorkspace])

  const markAsRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    await supabase.from('notifications').update({ read: true }).eq('id', id)
  }, [])

  const markAllAsRead = useCallback(async () => {
    if (!activeWorkspace || !activeMembership) return
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id)
    if (unreadIds.length === 0) return
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    await supabase.from('notifications').update({ read: true }).in('id', unreadIds)
  }, [notifications, activeWorkspace, activeMembership])

  const unreadCount = notifications.filter((n) => !n.read).length

  return { notifications, unreadCount, markAsRead, markAllAsRead, refresh: load }
}
