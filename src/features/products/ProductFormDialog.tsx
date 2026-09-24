import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useCreateProduct, useUpdateProduct, type Product } from '@/features/products/api'
import { useWorkspace } from '@/providers/WorkspaceProvider'
import { clearDraft, readDraft, writeDraft } from '@/lib/formDraft'

interface ProductFormValues {
  sku: string
  description: string
  unit: string
  sale_price: string
  cost_price: string
  category: string
  min_stock: string
  ncm: string
  active: boolean
}

const EMPTY_FORM: ProductFormValues = {
  sku: '',
  description: '',
  unit: 'UN',
  sale_price: '',
  cost_price: '',
  category: '',
  min_stock: '',
  ncm: '',
  active: true,
}

function toFormValues(product: Product): ProductFormValues {
  return {
    sku: product.sku,
    description: product.description,
    unit: product.unit,
    sale_price: String(product.sale_price),
    cost_price: String(product.cost_price),
    category: product.category ?? '',
    min_stock: product.min_stock !== null ? String(product.min_stock) : '',
    ncm: product.ncm ?? '',
    active: product.active,
  }
}

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: Product | null
  onCreated?: (id: string) => void
}) {
  const { activeWorkspace } = useWorkspace()
  const [form, setForm] = useState<ProductFormValues>(EMPTY_FORM)
  const [createdId, setCreatedId] = useState<string | null>(null)
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const saving = createProduct.isPending || updateProduct.isPending

  const draftKey = `jotapedi:draft:product:${activeWorkspace?.id ?? 'x'}:${product?.id ?? 'new'}`

  useEffect(() => {
    if (!open) return
    const draft = readDraft<ProductFormValues>(draftKey)
    if (draft && (draft.sku.trim() || draft.description.trim())) {
      setForm(draft)
      return
    }
    setForm(product ? toFormValues(product) : EMPTY_FORM)
  }, [open, product, draftKey])

  useEffect(() => {
    if (!open) return
    if (form.sku.trim() || form.description.trim()) {
      writeDraft(draftKey, form)
    } else {
      clearDraft(draftKey)
    }
  }, [open, draftKey, form])

  useEffect(() => {
    if (!open) setCreatedId(null)
  }, [open])

  const handleOpenChange = (next: boolean) => {
    if (!next) clearDraft(draftKey)
    onOpenChange(next)
  }

  const setField = <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const payload = {
      sku: form.sku.trim(),
      description: form.description.trim(),
      unit: form.unit.trim() || 'UN',
      sale_price: Number(form.sale_price.replace(',', '.')) || 0,
      cost_price: Number(form.cost_price.replace(',', '.')) || 0,
      category: form.category.trim() || null,
      min_stock: form.min_stock ? Number(form.min_stock.replace(',', '.')) : null,
      ncm: form.ncm.trim() || null,
      active: form.active,
    }

    try {
      const currentId = product?.id ?? createdId
      if (currentId) {
        await updateProduct.mutateAsync({ id: currentId, payload })
        toast.success('Produto atualizado')
      } else {
        const newId = await createProduct.mutateAsync(payload)
        setCreatedId(newId)
        onCreated?.(newId)
        toast.success('Produto criado')
      }
      clearDraft(draftKey)
    } catch (error) {
      toast.error('Não foi possível salvar o produto', {
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{product ? 'Editar produto' : 'Novo produto'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" required value={form.sku} onChange={(e) => setField('sku', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="unit">Unidade</Label>
              <Input id="unit" value={form.unit} onChange={(e) => setField('unit', e.target.value)} placeholder="UN, KG, PAR…" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              required
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sale_price">Preço de venda</Label>
              <Input
                id="sale_price"
                inputMode="decimal"
                required
                value={form.sale_price}
                onChange={(e) => setField('sale_price', e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cost_price">Preço de custo</Label>
              <Input
                id="cost_price"
                inputMode="decimal"
                value={form.cost_price}
                onChange={(e) => setField('cost_price', e.target.value)}
                placeholder="0,00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="category">Categoria</Label>
              <Input id="category" value={form.category} onChange={(e) => setField('category', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="min_stock">Estoque mínimo</Label>
              <Input
                id="min_stock"
                inputMode="decimal"
                value={form.min_stock}
                onChange={(e) => setField('min_stock', e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ncm">NCM</Label>
            <Input id="ncm" value={form.ncm} onChange={(e) => setField('ncm', e.target.value)} />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-foreground">Ativo</p>
              <p className="text-xs text-muted-foreground">Produtos inativos não aparecem na criação de pedidos.</p>
            </div>
            <Switch checked={form.active} onCheckedChange={(checked) => setField('active', checked)} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
