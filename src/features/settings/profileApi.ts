import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/AuthProvider'
import { useWorkspace } from '@/providers/WorkspaceProvider'

export function useUpdateProfile() {
  const { activeMembership, refresh } = useWorkspace()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from('users').update({ name }).eq('id', activeMembership!.id)
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => {
      await refresh()
      queryClient.invalidateQueries()
    },
  })
}

export function useUploadAvatar() {
  const { user } = useAuth()
  const { activeMembership, refresh } = useWorkspace()

  return useMutation({
    mutationFn: async (file: File) => {
      const ext = file.name.split('.').pop()
      const path = `${user!.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
      if (uploadError) throw new Error(uploadError.message)

      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: data.publicUrl })
        .eq('id', activeMembership!.id)
      if (updateError) throw new Error(updateError.message)

      return data.publicUrl
    },
    onSuccess: () => refresh(),
  })
}

export function useChangeEmail() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.auth.updateUser({ email })
      if (error) throw new Error(error.message)
    },
  })
}
