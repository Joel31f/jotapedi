import { useRef, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog'
import { useBrandsQuery, useCreateBrand, useDeleteBrand, type Brand } from '@/features/brands/api'

export function BrandsTab() {
  const { data: brands = [], isLoading } = useBrandsQuery()
  const createBrand = useCreateBrand()
  const deleteBrand = useDeleteBrand()
  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [deletingBrand, setDeletingBrand] = useState<Brand | null>(null)

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    try {
      await createBrand.mutateAsync({ name: name.trim(), file })
      setName('')
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      toast.success('Marca criada')
    } catch (error) {
      toast.error('Não foi possível criar a marca', { description: error instanceof Error ? error.message : undefined })
    }
  }

  const handleDelete = async () => {
    if (!deletingBrand) return
    try {
      await deleteBrand.mutateAsync(deletingBrand.id)
      toast.success('Marca excluída')
      setDeletingBrand(null)
    } catch (error) {
      toast.error('Não foi possível excluir', { description: error instanceof Error ? error.message : undefined })
    }
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="text-sm">Marcas</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : brands.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma marca cadastrada ainda.</p>
        ) : (
          brands.map((brand) => (
            <div key={brand.id} className="flex items-center gap-2 rounded-lg border border-border px-2 py-1.5">
              {brand.logo_url ? (
                <img src={brand.logo_url} alt={brand.name} className="h-6 w-auto max-w-16 object-contain" />
              ) : null}
              <span className="flex-1 text-sm text-foreground">{brand.name}</span>
              <Button size="icon-sm" variant="ghost" onClick={() => setDeletingBrand(brand)}>
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))
        )}

        <form onSubmit={handleCreate} className="mt-2 flex flex-col gap-2">
          <div className="flex gap-2">
            <Input placeholder="Nome da marca" value={name} onChange={(e) => setName(e.target.value)} />
            <Button type="submit" disabled={createBrand.isPending}>
              <Plus className="size-4" />
              Adicionar
            </Button>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Logo (opcional, aparece na impressão do pedido)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-sm text-muted-foreground file:mr-2 file:rounded-md file:border-0 file:bg-secondary file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-secondary-foreground"
            />
          </div>
        </form>
        <p className="text-xs text-muted-foreground">
          As marcas cadastradas aqui aparecem como opção de "Marca" ao criar um pedido — é opcional escolher uma.
        </p>
      </CardContent>

      <ConfirmDeleteDialog
        open={!!deletingBrand}
        onOpenChange={(open) => !open && setDeletingBrand(null)}
        title="Excluir marca"
        description={`Tem certeza que deseja excluir "${deletingBrand?.name}"? Pedidos que já usam essa marca ficam sem marca, mas não são afetados de outra forma.`}
        onConfirm={handleDelete}
        loading={deleteBrand.isPending}
      />
    </Card>
  )
}
