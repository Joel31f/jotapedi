import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/providers/AuthProvider'
import { AuthLayout } from '@/pages/auth/AuthLayout'

export function ForgotPasswordPage() {
  const { sendPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await sendPasswordReset(email)
    setLoading(false)
    if (error) {
      toast.error('Não foi possível enviar o email', { description: error })
      return
    }
    setSent(true)
  }

  return (
    <AuthLayout title="Recuperar senha" subtitle="Enviaremos um link de redefinição para seu email.">
      {sent ? (
        <p className="text-sm text-foreground">
          Se existir uma conta com o email <strong>{email}</strong>, você receberá um link para redefinir sua senha
          em breve.
        </p>
      ) : (
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
          <Button type="submit" disabled={loading} className="mt-2">
            {loading ? 'Enviando…' : 'Enviar link de recuperação'}
          </Button>
        </form>
      )}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link to="/login" className="text-primary hover:underline">
          Voltar para o login
        </Link>
      </p>
    </AuthLayout>
  )
}
