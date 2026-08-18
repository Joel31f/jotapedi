import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Search, Upload, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { formatCurrency } from '@/lib/format'
import {
  PRODUCTS_PAGE_SIZE,
  useBulkInsertProducts,
  useProductCategoriesQuery,
  useProductsQuery,
  useUpdateProduct,
  useDeleteProduct,
  type Product,
  type ProductFilters,
} from '@/features/products/api'
import { ProductFormDialog } from '@/features/products/ProductFormDialog'
import { ImportDialog } from '@/components/import/ImportDialog'
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog'
import type { MappingTarget } from '@/lib/spreadsheet'

const IMPORT_TARGETS: MappingTarget[] = [
  { key: 'sku', label: 'SKU', required: true, aliases: ['codigo', 'código'] },
  { key: 'description', label: 'Descrição', required: true, aliases: ['nome', 'produto'] },
  { key: 'unit', label: 'Unidade', aliases: ['un', 'unidade de medida'] },
  { key: 'sale_price', label: 'Preço de venda', aliases: ['preco', 'preço', 'valor'] },
  { key: 'cost_price', label: 'Preço de custo', aliases: ['custo'] },
  { key: 'category', label: 'Categoria', aliases: ['categoria'] },
  { key: 'min_stock', label: 'Estoque mínimo', aliases: ['estoque minimo', 'estoque'] },
  { key: 'ncm', label: 'NCM', aliases: [] },
]

export function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [category, setCategory] = useState<string | null>(null)
  const [status, setStatus] = useState<ProductFilters['status']>('all')
  const [page, setPage] = useState(0)

  const [formOpen, setFormOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setEditingProduct(null)
      setFormOpen(true)
      searchParams.delete('new')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const filters: ProductFilters = { search: debouncedSearch, category, status }
  const { data, isLoading } = useProductsQuery(filters, page)
  const { data: categories = [] } = useProductCategoriesQuery()
  const updateProduct = useUpdateProduct()
  const deleteProduct = useDeleteProduct()
  const bulkInsert = useBulkInsertProducts()

  const rows = data?.rows ?? []
  const total = data?.count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PRODUCTS_PAGE_SIZE))

  const handleToggleActive = async (product: Product, active: boolean) => {
    try {
      await updateProduct.mutateAsync({ id: product.id, payload: { active } })
    } catch (error) {
      toast.error('Não foi possível atualizar o status', {
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }

  const handleDelete = async () => {
    if (!deletingProduct) return
    try {
      await deleteProduct.mutateAsync(deletingProduct.id)
      toast.success('Produto excluído')
      setDeletingProduct(null)
    } catch (error) {
      toast.error('Não foi possível excluir', { description: error instanceof Error ? error.message : undefined })
    }
  }

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Produtos</h1>
          <p className="text-sm text-muted-foreground">{total} produto(s) cadastrado(s)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="size-4" />
            Importar
          </Button>
          <Button
            onClick={() => {
              setEditingProduct(null)
              setFormOpen(true)
            }}
          >
            <Plus className="size-4" />
            Novo produto
          </Button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Buscar por SKU ou descrição…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
          />
        </div>
        <Select
          value={category ?? '__all__'}
          onValueChange={(value) => {
            setCategory(value === '__all__' ? null : value)
            setPage(0)
          }}
          items={[{ value: '__all__', label: 'Todas categorias' }, ...categories.map((c) => ({ value: c, label: c }))]}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas categorias</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as ProductFilters['status'])
            setPage(0)
          }}
          items={[
            { value: 'all', label: 'Todos' },
            { value: 'active', label: 'Ativos' },
            { value: 'inactive', label: 'Inativos' },
          ]}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Un.</TableHead>
              <TableHead className="text-right">Venda</TableHead>
              <TableHead className="text-right">Custo</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                  Carregando…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum produto encontrado.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-mono text-xs">{product.sku}</TableCell>
                  <TableCell>{product.description}</TableCell>
                  <TableCell>
                    {product.category ? <Badge variant="secondary">{product.category}</Badge> : '—'}
                  </TableCell>
                  <TableCell>{product.unit}</TableCell>
                  <TableCell className="text-right">{formatCurrency(product.sale_price)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(product.cost_price)}</TableCell>
                  <TableCell>
                    <Switch checked={product.active} onCheckedChange={(checked) => handleToggleActive(product, checked)} />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingProduct(product)
                          setFormOpen(true)
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button size="icon-sm" variant="ghost" onClick={() => setDeletingProduct(product)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Página {page + 1} de {totalPages}
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </Button>
          <Button size="sm" variant="outline" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Próxima
          </Button>
        </div>
      </div>

      <ProductFormDialog open={formOpen} onOpenChange={setFormOpen} product={editingProduct} />

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Importar produtos"
        templateFilename="modelo_produtos.csv"
        targets={IMPORT_TARGETS}
        onImport={async (importedRows) => {
          const payload = importedRows
            .filter((row) => row.sku && row.description)
            .map((row) => ({
              sku: row.sku,
              description: row.description,
              unit: row.unit || 'UN',
              sale_price: Number(row.sale_price?.replace(',', '.')) || 0,
              cost_price: Number(row.cost_price?.replace(',', '.')) || 0,
              category: row.category || null,
              min_stock: row.min_stock ? Number(row.min_stock.replace(',', '.')) : null,
              ncm: row.ncm || null,
              active: true,
            }))
          return bulkInsert.mutateAsync(payload)
        }}
      />

      <ConfirmDeleteDialog
        open={!!deletingProduct}
        onOpenChange={(open) => !open && setDeletingProduct(null)}
        title="Excluir produto"
        description={`Tem certeza que deseja excluir "${deletingProduct?.description}"? Essa ação não pode ser desfeita.`}
        onConfirm={handleDelete}
        loading={deleteProduct.isPending}
      />
    </div>
  )
}
