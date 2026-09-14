import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useBulkUpdateProducts, type ProductBulkEditPayload } from '@/features/products/api'

export function ProductBulkEditDialog({
  open,
  onOpenChange,
  productIds,
  count,
  onDone,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  productIds: string[]
  count: number
  onDone: () => void
}) {
  const [changeCategory, setChangeCategory] = useState(false)
  const [category, setCategory] = useState('')
  const [activeOption, setActiveOption] = useState<'keep' | 'active' | 'inactive'>('keep')
  const bulkUpdate = useBulkUpdateProducts()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const payload: ProductBulkEditPayload = {}
    if (changeCategory) payload.category = category.trim() || null
    if (activeOption !== 'keep') payload.active = activeOption === 'active'

    if (Object.keys(payload).length === 0) {
      toast.error('Escolha ao menos uma alteração para aplicar')
      return
    }

    try {
      const updated = await bulkUpdate.mutateAsync({ ids: productIds, payload })
      toast.success(`${updated} produto(s) atualizado(s)`)
      onDone()
      onOpenChange(false)
    } catch (error) {
      toast.error('Não foi possível atualizar', { description: error instanceof Error ? error.message : undefined })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar {count} produto(s)</DialogTitle>
          <DialogDescription>Só as alterações marcadas abaixo são aplicadas — o resto de cada produto fica como está.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={changeCategory} onChange={(e) => setChangeCategory(e.target.checked)} />
              Alterar categoria
            </label>
            {changeCategory ? (
              <Input
                placeholder="Nova categoria (deixe em branco para remover)"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Status</Label>
            <Select
              value={activeOption}
              onValueChange={(value) => setActiveOption(value as typeof activeOption)}
              items={[
                { value: 'keep', label: 'Não alterar' },
                { value: 'active', label: 'Marcar como ativo' },
                { value: 'inactive', label: 'Marcar como inativo' },
              ]}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="keep">Não alterar</SelectItem>
                <SelectItem value="active">Marcar como ativo</SelectItem>
                <SelectItem value="inactive">Marcar como inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={bulkUpdate.isPending}>
              {bulkUpdate.isPending ? 'Aplicando…' : `Aplicar em ${count} produto(s)`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
