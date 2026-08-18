import { Phone, Mail, MessageCircle, Users, CheckSquare, type LucideIcon } from 'lucide-react'
import type { ActivityType } from '@/types/database'

export const ACTIVITY_TYPES: { id: ActivityType; label: string; color: string; icon: LucideIcon }[] = [
  { id: 'call', label: 'Ligação', color: '#4d9de0', icon: Phone },
  { id: 'email', label: 'Email', color: '#c084fc', icon: Mail },
  { id: 'whatsapp', label: 'WhatsApp', color: '#00e676', icon: MessageCircle },
  { id: 'meeting', label: 'Reunião', color: '#f59e0b', icon: Users },
  { id: 'task', label: 'Tarefa', color: '#8a9a8d', icon: CheckSquare },
]

export const ACTIVITY_TYPE_MAP = Object.fromEntries(ACTIVITY_TYPES.map((t) => [t.id, t])) as Record<
  ActivityType,
  (typeof ACTIVITY_TYPES)[number]
>
