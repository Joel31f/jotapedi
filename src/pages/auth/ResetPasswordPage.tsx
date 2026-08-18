import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/providers/AuthProvider'
import { AuthLayout } from '@/pages/auth/AuthLayout'

export function ResetPasswordPage() {
  const { updatePassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (password.length < 6) {
      toast.error('Senha muito curta', { description: 'Use pelo menos 6 caracteres.' })
      return
    }
    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem')
      return
    }
    setLoading(true)
    const { error } = await updatePassword(password)
    setLoading(false)
    if (error) {
      toast.error('Não foi possível redefinir a senha', { description: error })
      return
    }
    toast.success('Senha redefinida com sucesso')
    navigate('/', { replace: true })
  }

  return (
    <AuthLayout title="Definir nova senha" subtitle="Escolha uma nova senha para sua conta.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Nova senha</Label>
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
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
          <Input
            id="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repita a senha"
          />
        </div>
        <Button type="submit" disabled={loading} className="mt-2">
          {loading ? 'Salvando…' : 'Salvar nova senha'}
        </Button>
      </form>
    </AuthLayout>
  )
}
