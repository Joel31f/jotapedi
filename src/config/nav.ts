import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  ListChecks,
  CalendarDays,
  BarChart3,
  Zap,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import type { SectionKey } from '@/config/sections'

export interface NavItem {
  label: string
  path: string
  icon: LucideIcon
  section: SectionKey
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard, section: 'dashboard' },
  { label: 'Pedidos', path: '/pedidos', icon: ShoppingCart, section: 'pedidos' },
  { label: 'Produtos', path: '/produtos', icon: Package, section: 'produtos' },
  { label: 'Clientes', path: '/clientes', icon: Users, section: 'clientes' },
  { label: 'Atividades', path: '/atividades', icon: ListChecks, section: 'atividades' },
  { label: 'Calendário', path: '/calendario', icon: CalendarDays, section: 'calendario' },
  { label: 'Relatórios', path: '/relatorios', icon: BarChart3, section: 'relatorios' },
  { label: 'Automações', path: '/automacoes', icon: Zap, section: 'automacoes' },
  { label: 'Configurações', path: '/configuracoes', icon: Settings, section: 'configuracoes' },
]
