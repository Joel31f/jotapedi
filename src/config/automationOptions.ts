import type { AutomationAction, AutomationTrigger } from '@/types/database'

export const TRIGGER_OPTIONS: { value: AutomationTrigger; label: string; needsDays?: boolean; needsStage?: boolean }[] = [
  { value: 'order_created', label: 'Pedido criado' },
  { value: 'order_stage_changed', label: 'Pedido muda de estágio', needsStage: true },
  { value: 'client_created', label: 'Cliente cadastrado' },
  { value: 'activity_overdue', label: 'Atividade atrasada há X dias', needsDays: true },
  { value: 'order_stale', label: 'Pedido sem movimentação há X dias', needsDays: true },
]

export const ACTION_OPTIONS: { value: AutomationAction; label: string }[] = [
  { value: 'create_activity', label: 'Criar atividade' },
  { value: 'send_notification', label: 'Enviar notificação interna' },
]

export const TRIGGER_LABEL = Object.fromEntries(TRIGGER_OPTIONS.map((t) => [t.value, t.label])) as Record<
  AutomationTrigger,
  string
>

export const ACTION_LABEL = Object.fromEntries(ACTION_OPTIONS.map((a) => [a.value, a.label])) as Record<
  AutomationAction,
  string
>
