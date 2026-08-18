import type { Database, SectionAccess } from '@/types/database'

type UserRow = Database['public']['Tables']['users']['Row']

export function hasSectionAccess(membership: UserRow | null, section: SectionKey) {
  if (!membership) return false
  if (membership.role === 'admin') return true
  return !!membership.section_access?.[section]
}

export type SectionKey = keyof SectionAccess

export const SECTION_LABELS: Record<SectionKey, string> = {
  dashboard: 'Dashboard',
  pedidos: 'Pedidos',
  produtos: 'Produtos',
  clientes: 'Clientes',
  atividades: 'Atividades',
  calendario: 'Calendário',
  relatorios: 'Relatórios',
  automacoes: 'Automações',
  configuracoes: 'Configurações',
}

export const SECTION_ORDER: SectionKey[] = [
  'dashboard',
  'pedidos',
  'produtos',
  'clientes',
  'atividades',
  'calendario',
  'relatorios',
  'automacoes',
  'configuracoes',
]

export const DEFAULT_ATENDENTE_ACCESS: SectionAccess = {
  dashboard: true,
  pedidos: true,
  produtos: false,
  clientes: true,
  atividades: true,
  calendario: true,
  relatorios: false,
  automacoes: false,
  configuracoes: false,
}

export const FULL_ACCESS: SectionAccess = {
  dashboard: true,
  pedidos: true,
  produtos: true,
  clientes: true,
  atividades: true,
  calendario: true,
  relatorios: true,
  automacoes: true,
  configuracoes: true,
}
