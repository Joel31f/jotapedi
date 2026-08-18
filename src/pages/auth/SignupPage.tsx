import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/providers/AuthProvider'
import { AuthLayout } from '@/pages/auth/AuthLayout'
import { supabase } from '@/lib/supabase'

export function SignupPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (password.length < 6) {
      toast.error('Senha muito curta', { description: 'Use pelo menos 6 caracteres.' })
      return
    }
    setLoading(true)
    const { error } = await signUp(email, password, name)
    setLoading(false)
    if (error) {
      toast.error('Não foi possível criar a conta', { description: error })
      return
    }

    const { data } = await supabase.auth.getSession()
    if (data.session) {
      navigate('/onboarding', { replace: true })
    } else {
      toast.success('Conta criada!', {
        description: 'Verifique seu email para confirmar o cadastro antes de entrar.',
      })
      navigate('/login', { replace: true })
    }
  }

  return (
    <AuthLayout title="Criar conta" subtitle="Comece a organizar seus pedidos hoje.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome completo"
          />
        </div>
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
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
          />
        </div>
        <Button type="submit" disabled={loading} className="mt-2">
          {loading ? 'Criando conta…' : 'Criar conta'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Já tem uma conta?{' '}
        <Link to="/login" className="text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </AuthLayout>
  )
}
