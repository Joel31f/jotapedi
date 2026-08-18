import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useWorkspace } from '@/providers/WorkspaceProvider'
import { useAuth } from '@/providers/AuthProvider'
import { AuthLayout } from '@/pages/auth/AuthLayout'

export function CreateWorkspacePage() {
  const { createWorkspace } = useWorkspace()
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await createWorkspace(name)
    setLoading(false)
    if (error) {
      toast.error('Não foi possível criar o workspace', { description: error })
      return
    }
    toast.success('Workspace criado!', { description: 'Preparamos alguns dados de exemplo para você explorar.' })
    navigate('/', { replace: true })
  }

  return (
    <AuthLayout title="Crie seu workspace" subtitle="Dê um nome para a conta da sua empresa no Jotapedi.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="workspace-name">Nome da empresa</Label>
          <Input
            id="workspace-name"
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Ribeiro Confecções"
          />
        </div>
        <Button type="submit" disabled={loading} className="mt-2">
          {loading ? 'Criando…' : 'Criar workspace'}
        </Button>
      </form>
      <button
        type="button"
        onClick={() => signOut()}
        className="mt-6 w-full text-center text-sm text-muted-foreground hover:underline"
      >
        Sair
      </button>
    </AuthLayout>
  )
}
