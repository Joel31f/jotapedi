import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useWorkspace } from '@/providers/WorkspaceProvider'
import { useCreateStage, useDeleteStage, useReorderStages, useUpdateStage } from '@/features/settings/pipelineApi'

export function PipelineTab() {
  const { stages } = useWorkspace()
  const [newStageName, setNewStageName] = useState('')
  const [editingNames, setEditingNames] = useState<Record<string, string>>({})

  const createStage = useCreateStage()
  const updateStage = useUpdateStage()
  const reorderStages = useReorderStages()
  const deleteStage = useDeleteStage()

  const sortedStages = [...stages].sort((a, b) => a.position - b.position)

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!newStageName.trim()) return
    try {
      await createStage.mutateAsync(newStageName.trim())
      setNewStageName('')
    } catch (error) {
      toast.error('Não foi possível criar o estágio', { description: error instanceof Error ? error.message : undefined })
    }
  }

  const handleRename = async (id: string) => {
    const name = editingNames[id]?.trim()
    if (!name) return
    try {
      await updateStage.mutateAsync({ id, name })
      toast.success('Estágio renomeado')
    } catch (error) {
      toast.error('Não foi possível renomear', { description: error instanceof Error ? error.message : undefined })
    }
  }

  const handleToggleWon = async (id: string, isWon: boolean) => {
    try {
      await updateStage.mutateAsync({ id, is_won: isWon })
      toast.success(isWon ? 'Estágio marcado como ganho' : 'Estágio desmarcado como ganho')
    } catch (error) {
      toast.error('Não foi possível alterar', { description: error instanceof Error ? error.message : undefined })
    }
  }

  const handleMove = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= sortedStages.length) return
    const reordered = [...sortedStages]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(targetIndex, 0, moved)
    reorderStages.mutate(reordered.map((s) => s.id))
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteStage.mutateAsync(id)
      toast.success('Estágio excluído')
    } catch (error) {
      toast.error('Não foi possível excluir', { description: error instanceof Error ? error.message : undefined })
    }
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="text-sm">Estágios do pipeline de pedidos</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {sortedStages.map((stage, index) => (
          <div key={stage.id} className="flex items-center gap-2 rounded-lg border border-border px-2 py-1.5">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: stage.color }} />
            <Input
              className="h-8"
              value={editingNames[stage.id] ?? stage.name}
              onChange={(e) => setEditingNames((prev) => ({ ...prev, [stage.id]: e.target.value }))}
              onBlur={() => handleRename(stage.id)}
            />
            <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
              <Switch checked={stage.is_won} onCheckedChange={(checked) => handleToggleWon(stage.id, checked)} />
              Ganho
            </label>
            <Button size="icon-sm" variant="ghost" disabled={index === 0} onClick={() => handleMove(index, -1)}>
              <ArrowUp className="size-3.5" />
            </Button>
            <Button size="icon-sm" variant="ghost" disabled={index === sortedStages.length - 1} onClick={() => handleMove(index, 1)}>
              <ArrowDown className="size-3.5" />
            </Button>
            <Button size="icon-sm" variant="ghost" onClick={() => handleDelete(stage.id)}>
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}

        <form onSubmit={handleCreate} className="mt-2 flex gap-2">
          <Input placeholder="Nome do novo estágio" value={newStageName} onChange={(e) => setNewStageName(e.target.value)} />
          <Button type="submit" disabled={createStage.isPending}>
            <Plus className="size-4" />
            Adicionar
          </Button>
        </form>
        <p className="text-xs text-muted-foreground">
          Os estágios marcados como "ganho" (por exemplo, Pago e Enviado) são os que entram no faturamento do Dashboard e dos
          Relatórios. Pode marcar mais de um. Se mudar, os números do faturamento mudam junto, inclusive os de meses anteriores.
        </p>
      </CardContent>
    </Card>
  )
}
