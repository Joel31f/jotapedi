import { ShieldAlert } from 'lucide-react'
import { PlaceholderPage } from '@/components/PlaceholderPage'

export function NoPermissionPage() {
  return (
    <PlaceholderPage
      title="Sem permissão"
      icon={ShieldAlert}
      description="Você não tem acesso a esta seção. Fale com um administrador do workspace se precisar dessa permissão."
    />
  )
}
