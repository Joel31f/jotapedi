import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/providers/AuthProvider'
import { AuthLayout } from '@/pages/auth/AuthLayout'

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      toast.error('Não foi possível entrar', { description: error })
      return
    }
    const redirectTo = (location.state as { from?: string } | null)?.from ?? '/'
    navigate(redirectTo, { replace: true })
  }

  return (
    <AuthLayout title="Entrar na sua conta" subtitle="Gerencie seus pedidos e clientes em um só lugar.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@empresa.com"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Senha</Label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">
              Esqueceu a senha?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        <Button type="submit" disabled={loading} className="mt-2">
          {loading ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Não tem uma conta?{' '}
        <Link to="/signup" className="text-primary hover:underline">
          Cadastre-se
        </Link>
      </p>
    </AuthLayout>
  )
}
