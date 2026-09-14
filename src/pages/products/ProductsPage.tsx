import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Search, Upload, FileSpreadsheet, Pencil, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { formatCurrency } from '@/lib/format'
import {
  PRODUCTS_PAGE_SIZE,
  useBulkDeleteProducts,
  useBulkDeleteProductsByFilter,
  useBulkInsertProducts,
  useBulkUpdateProductsBySku,
  useProductCategoriesQuery,
  useProductsQuery,
  useUpdateProduct,
  useDeleteProduct,
  type Product,
  type ProductFilters,
  type ProductUpdate,
} from '@/features/products/api'
import { ProductFormDialog } from '@/features/products/ProductFormDialog'
import { ProductBulkEditDialog } from '@/features/products/ProductBulkEditDialog'
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

const UPDATE_TARGETS: MappingTarget[] = [
  { key: 'sku', label: 'SKU (usado para encontrar o produto)', required: true, aliases: ['codigo', 'código'] },
  { key: 'description', label: 'Descrição', aliases: ['nome', 'produto'] },
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
  const [priceStatus, setPriceStatus] = useState<ProductFilters['priceStatus']>('all')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const debouncedMinPrice = useDebouncedValue(minPrice, 400)
  const debouncedMaxPrice = useDebouncedValue(maxPrice, 400)
  const [page, setPage] = useState(0)

  const [formOpen, setFormOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [updateOpen, setUpdateOpen] = useState(false)
  const [bulkEditOpen, setBulkEditOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectAllMatching, setSelectAllMatching] = useState(false)

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setEditingProduct(null)
      setFormOpen(true)
      searchParams.delete('new')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const filters: ProductFilters = {
    search: debouncedSearch,
    category,
    status,
    priceStatus,
    minPrice: debouncedMinPrice,
    maxPrice: debouncedMaxPrice,
  }
  const { data, isLoading } = useProductsQuery(filters, page)
  const { data: categories = [] } = useProductCategoriesQuery()
  const updateProduct = useUpdateProduct()
  const deleteProduct = useDeleteProduct()
  const bulkInsert = useBulkInsertProducts()
  const bulkUpdateBySku = useBulkUpdateProductsBySku()
  const bulkDeleteByIds = useBulkDeleteProducts()
  const bulkDeleteByFilter = useBulkDeleteProductsByFilter()

  const rows = data?.rows ?? []
  const total = data?.count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PRODUCTS_PAGE_SIZE))
  const selectedCount = selectAllMatching ? total : selectedIds.size
  const allRowsSelected = rows.length > 0 && (selectAllMatching || rows.every((p) => selectedIds.has(p.id)))
  const someRowsSelected = !allRowsSelected && rows.some((p) => selectedIds.has(p.id))

  useEffect(() => {
    setSelectedIds(new Set())
    setSelectAllMatching(false)
  }, [debouncedSearch, category, status, priceStatus, debouncedMinPrice, debouncedMaxPrice])

  const clearSelection = () => {
    setSelectedIds(new Set())
    setSelectAllMatching(false)
  }

  const toggleRow = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const toggleAllOnPage = (checked: boolean) => {
    if (selectAllMatching) {
      clearSelection()
      return
    }
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const product of rows) {
        if (checked) next.add(product.id)
        else next.delete(product.id)
      }
      return next
    })
  }

  const handleToggleActive = async (product: Product, active: boolean) => {
    try {
      await updateProduct.mutateAsync({ id: product.id, payload: { active } })
    } catch (error) {
      toast.error('Não foi possível atualizar o status', {
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }

  const handleBulkDelete = async () => {
    try {
      const count = selectAllMatching
        ? await bulkDeleteByFilter.mutateAsync(filters)
        : await bulkDeleteByIds.mutateAsync([...selectedIds])
      toast.success(`${count} produto(s) excluído(s)`)
      clearSelection()
      setBulkDeleteOpen(false)
      if (page > 0) setPage(0)
    } catch (error) {
      toast.error('Não foi possível excluir', { description: error instanceof Error ? error.message : undefined })
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
          <Button variant="outline" onClick={() => setUpdateOpen(true)}>
            <FileSpreadsheet className="size-4" />
            Atualizar por planilha
          </Button>
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
        <Select
          value={priceStatus}
          onValueChange={(value) => {
            setPriceStatus(value as ProductFilters['priceStatus'])
            setPage(0)
          }}
          items={[
            { value: 'all', label: 'Qualquer preço' },
            { value: 'with_price', label: 'Com preço' },
            { value: 'no_price', label: 'Sem preço' },
          ]}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Preço" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Qualquer preço</SelectItem>
            <SelectItem value="with_price">Com preço</SelectItem>
            <SelectItem value="no_price">Sem preço</SelectItem>
          </SelectContent>
        </Select>
        <Input
          className="w-24"
          inputMode="decimal"
          placeholder="Preço min."
          value={minPrice}
          onChange={(e) => {
            setMinPrice(e.target.value)
            setPage(0)
          }}
        />
        <Input
          className="w-24"
          inputMode="decimal"
          placeholder="Preço máx."
          value={maxPrice}
          onChange={(e) => {
            setMaxPrice(e.target.value)
            setPage(0)
          }}
        />
      </div>

      {selectedCount > 0 ? (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2">
          <p className="text-sm text-foreground">{selectedCount} produto(s) selecionado(s)</p>
          {!selectAllMatching && allRowsSelected && total > rows.length ? (
            <button
              type="button"
              className="text-sm text-primary underline underline-offset-2"
              onClick={() => setSelectAllMatching(true)}
            >
              Selecionar todos os {total} produtos que correspondem ao filtro
            </button>
          ) : null}
          <div className="ml-auto flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={selectAllMatching}
              title={selectAllMatching ? 'Edição em massa não funciona com "selecionar todos" — marque manualmente' : undefined}
              onClick={() => setBulkEditOpen(true)}
            >
              <Pencil className="size-3.5" />
              Editar selecionados
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setBulkDeleteOpen(true)}>
              <Trash2 className="size-3.5" />
              Excluir selecionados
            </Button>
            <Button size="sm" variant="ghost" onClick={clearSelection}>
              <X className="size-3.5" />
              Cancelar seleção
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex-1 overflow-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allRowsSelected}
                  indeterminate={someRowsSelected}
                  onCheckedChange={(checked) => toggleAllOnPage(checked)}
                  disabled={rows.length === 0}
                />
              </TableHead>
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
                <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                  Carregando…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum produto encontrado.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectAllMatching || selectedIds.has(product.id)}
                      disabled={selectAllMatching}
                      onCheckedChange={(checked) => toggleRow(product.id, checked)}
                    />
                  </TableCell>
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

      <ImportDialog
        open={updateOpen}
        onOpenChange={setUpdateOpen}
        title="Atualizar produtos por planilha"
        description="Isso não cria produtos novos — atualiza os produtos que já existem, encontrando cada um pelo SKU. Só os campos que você mapear abaixo são alterados."
        templateFilename="modelo_atualizar_produtos.csv"
        targets={UPDATE_TARGETS}
        actionLabel="Atualizar"
        actionLabelIng="Atualizando"
        successVerb="atualizado(s)"
        onImport={async (importedRows) => {
          const rows = importedRows
            .filter((row) => row.sku)
            .map((row) => {
              const payload: ProductUpdate = {}
              if ('description' in row && row.description) payload.description = row.description
              if ('unit' in row && row.unit) payload.unit = row.unit
              if ('sale_price' in row) payload.sale_price = Number(row.sale_price?.replace(',', '.')) || 0
              if ('cost_price' in row) payload.cost_price = Number(row.cost_price?.replace(',', '.')) || 0
              if ('category' in row) payload.category = row.category || null
              if ('min_stock' in row) payload.min_stock = row.min_stock ? Number(row.min_stock.replace(',', '.')) : null
              if ('ncm' in row) payload.ncm = row.ncm || null
              return { sku: row.sku, payload }
            })
            .filter((r) => Object.keys(r.payload).length > 0)
          return bulkUpdateBySku.mutateAsync(rows)
        }}
      />

      <ProductBulkEditDialog
        open={bulkEditOpen}
        onOpenChange={setBulkEditOpen}
        productIds={[...selectedIds]}
        count={selectedCount}
        onDone={clearSelection}
      />

      <ConfirmDeleteDialog
        open={!!deletingProduct}
        onOpenChange={(open) => !open && setDeletingProduct(null)}
        title="Excluir produto"
        description={`Tem certeza que deseja excluir "${deletingProduct?.description}"? Essa ação não pode ser desfeita.`}
        onConfirm={handleDelete}
        loading={deleteProduct.isPending}
      />

      <ConfirmDeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title="Excluir produtos selecionados"
        description={`Tem certeza que deseja excluir ${selectedCount} produto(s)? Essa ação não pode ser desfeita.`}
        onConfirm={handleBulkDelete}
        loading={bulkDeleteByIds.isPending || bulkDeleteByFilter.isPending}
      />
    </div>
  )
}
