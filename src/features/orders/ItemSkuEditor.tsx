import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Check, Pencil, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'

export const isAutoSku = (sku: string) => sku.toUpperCase().startsWith('AUTO-')

interface ItemSkuEditorProps {
  sku: string
  productId: string | null
  workspaceId: string
  /** Só administradores editam, e só códigos provisórios (AUTO-…). */
  canEdit: boolean
  onSaved: (productId: string, sku: string) => void
}

export function ItemSkuEditor({ sku, productId, workspaceId, canEdit, onSaved }: ItemSkuEditorProps) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)

  const editable = canEdit && !!productId && isAutoSku(sku)

  const startEditing = () => {
    setValue(sku)
    setEditing(true)
  }

  const save = async () => {
    const next = value.trim()
    if (!productId || !next) return
    if (next === sku) {
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase.from('products').update({ sku: next }).eq('id', productId).eq('workspace_id', workspaceId)
      if (error) throw new Error(error.message)
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product', productId] })
      onSaved(productId, next)
      setEditing(false)
      toast.success('Código do produto atualizado')
    } catch (error) {
      toast.error('Não foi possível alterar o código', {
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          autoFocus
          className="h-7 w-44 font-mono text-xs"
          value={value}
          disabled={saving}
          aria-label="Novo código (SKU) do produto"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            // Enter e Esc aqui valem só para este campo: não salvam o pedido nem fecham a janela.
            if (e.key === 'Enter') {
              e.preventDefault()
              e.stopPropagation()
              void save()
            } else if (e.key === 'Escape') {
              e.preventDefault()
              e.stopPropagation()
              setEditing(false)
            }
          }}
        />
        <Button type="button" size="icon-sm" variant="ghost" title="Salvar código" disabled={saving} onClick={() => void save()}>
          <Check className="size-3.5" />
        </Button>
        <Button type="button" size="icon-sm" variant="ghost" title="Cancelar" disabled={saving} onClick={() => setEditing(false)}>
          <X className="size-3.5" />
        </Button>
      </div>
    )
  }

  if (!sku) return null

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <p className="truncate">
        Código: <span className="font-mono text-foreground">{sku}</span>
      </p>
      {isAutoSku(sku) ? (
        <span className="shrink-0 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-500">provisório</span>
      ) : null}
      {editable ? (
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="size-5"
          title="Editar o código (SKU) deste produto no catálogo"
          aria-label="Editar código do produto"
          onClick={startEditing}
        >
          <Pencil className="size-3" />
        </Button>
      ) : null}
    </div>
  )
}
