import type { LeadStage } from '@/types/database'

export const LEAD_STAGES: { id: LeadStage; title: string; color: string }[] = [
  { id: 'novo_lead', title: 'Novo lead', color: '#4d9de0' },
  { id: 'contato_feito', title: 'Contato feito', color: '#c084fc' },
  { id: 'qualificado', title: 'Qualificado', color: '#f59e0b' },
  { id: 'cliente_ativo', title: 'Cliente ativo', color: '#00e676' },
  { id: 'inativo', title: 'Inativo', color: '#8a9a8d' },
]

export const LEAD_STAGE_MAP = Object.fromEntries(LEAD_STAGES.map((s) => [s.id, s])) as Record<
  LeadStage,
  (typeof LEAD_STAGES)[number]
>
