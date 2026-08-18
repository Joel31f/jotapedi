import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package, Users } from 'lucide-react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { NAV_ITEMS } from '@/config/nav'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useWorkspace } from '@/providers/WorkspaceProvider'
import { supabase } from '@/lib/supabase'

interface ClientResult {
  id: string
  name: string
  company: string | null
}

interface ProductResult {
  id: string
  sku: string
  description: string
}

export function CommandMenu({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate()
  const { activeWorkspace } = useWorkspace()
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 250)
  const [clients, setClients] = useState<ClientResult[]>([])
  const [products, setProducts] = useState<ProductResult[]>([])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onOpenChange])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  useEffect(() => {
    const term = debouncedQuery.replace(/[,%]/g, '').trim()
    if (!activeWorkspace || term.length < 2) {
      setClients([])
      setProducts([])
      return
    }

    let cancelled = false

    supabase
      .from('clients')
      .select('id, name, company')
      .eq('workspace_id', activeWorkspace.id)
      .or(`name.ilike.%${term}%,company.ilike.%${term}%,email.ilike.%${term}%,document.ilike.%${term}%`)
      .limit(5)
      .then(({ data }) => {
        if (!cancelled) setClients(data ?? [])
      })

    supabase
      .from('products')
      .select('id, sku, description')
      .eq('workspace_id', activeWorkspace.id)
      .or(`sku.ilike.%${term}%,description.ilike.%${term}%`)
      .limit(5)
      .then(({ data }) => {
        if (!cancelled) setProducts(data ?? [])
      })

    return () => {
      cancelled = true
    }
  }, [debouncedQuery, activeWorkspace])

  const go = (path: string) => {
    onOpenChange(false)
    navigate(path)
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Busca global" description="Navegue pelo Jotapedi">
      <CommandInput placeholder="Buscar páginas, clientes, produtos…" value={query} onValueChange={setQuery} />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
        {clients.length > 0 ? (
          <CommandGroup heading="Clientes">
            {clients.map((client) => (
              <CommandItem key={client.id} value={`client-${client.id}`} onSelect={() => go(`/clientes/${client.id}`)}>
                <Users className="size-4" />
                <span>{client.name}</span>
                {client.company ? <span className="text-xs text-muted-foreground">{client.company}</span> : null}
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
        {products.length > 0 ? (
          <CommandGroup heading="Produtos">
            {products.map((product) => (
              <CommandItem key={product.id} value={`product-${product.id}`} onSelect={() => go('/produtos')}>
                <Package className="size-4" />
                <span>{product.description}</span>
                <span className="text-xs text-muted-foreground">{product.sku}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
        <CommandGroup heading="Navegação">
          {NAV_ITEMS.map((item) => (
            <CommandItem key={item.path} value={item.label} onSelect={() => go(item.path)}>
              <item.icon className="size-4" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
