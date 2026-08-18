import { useEffect, useRef, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Camera } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { initialsOf } from '@/lib/format'
import { useAuth } from '@/providers/AuthProvider'
import { useWorkspace } from '@/providers/WorkspaceProvider'
import { useChangeEmail, useUpdateProfile, useUploadAvatar } from '@/features/settings/profileApi'

export function ProfileTab() {
  const { user, updatePassword } = useAuth()
  const { activeMembership } = useWorkspace()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const updateProfile = useUpdateProfile()
  const uploadAvatar = useUploadAvatar()
  const changeEmail = useChangeEmail()

  useEffect(() => {
    setName(activeMembership?.name ?? '')
    setEmail(user?.email ?? '')
  }, [activeMembership, user])

  const handleSaveName = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await updateProfile.mutateAsync(name.trim())
      toast.success('Nome atualizado')
    } catch (error) {
      toast.error('Não foi possível salvar', { description: error instanceof Error ? error.message : undefined })
    }
  }

  const handleAvatarChange = async (file: File) => {
    try {
      await uploadAvatar.mutateAsync(file)
      toast.success('Foto atualizada')
    } catch (error) {
      toast.error('Não foi possível enviar a foto', { description: error instanceof Error ? error.message : undefined })
    }
  }

  const handleChangeEmail = async (e: FormEvent) => {
    e.preventDefault()
    if (email === user?.email) return
    try {
      await changeEmail.mutateAsync(email)
      toast.success('Verifique seu novo email para confirmar a troca')
    } catch (error) {
      toast.error('Não foi possível alterar o email', { description: error instanceof Error ? error.message : undefined })
    }
  }

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 6) {
      toast.error('Senha muito curta', { description: 'Use pelo menos 6 caracteres.' })
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem')
      return
    }
    const { error } = await updatePassword(newPassword)
    if (error) {
      toast.error('Não foi possível alterar a senha', { description: error })
      return
    }
    toast.success('Senha alterada')
    setNewPassword('')
    setConfirmPassword('')
  }

  return (
    <div className="flex max-w-lg flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Foto e nome</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="group relative"
              onClick={() => fileInputRef.current?.click()}
            >
              <Avatar className="size-16">
                <AvatarImage src={activeMembership?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-primary text-lg text-primary-foreground">
                  {initialsOf(activeMembership?.name || email || '?')}
                </AvatarFallback>
              </Avatar>
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100">
                <Camera className="size-5" />
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleAvatarChange(file)
                e.target.value = ''
              }}
            />
            <form onSubmit={handleSaveName} className="flex flex-1 gap-2">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
              <Button type="submit" disabled={updateProfile.isPending}>
                Salvar
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Email</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangeEmail} className="flex gap-2">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button type="submit" variant="outline" disabled={changeEmail.isPending || email === user?.email}>
              Alterar
            </Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">Você receberá um email de confirmação antes da troca ser efetivada.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Senha</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-password">Nova senha</Label>
              <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirm-password">Confirmar nova senha</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="self-start">
              Alterar senha
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
