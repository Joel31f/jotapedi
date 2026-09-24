import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Download, Plus, Search, Upload, FileSpreadsheet, Pencil, Trash2, X } from 'lucide-react'
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
  useBulkUpdateProductsFromSheet,
  useFetchAllProducts,
  useProductCategoriesQuery,
  useProductQuery,
  useProductsQuery,
  useUpdateProduct,
  useDeleteProduct,
  type Product,
  type ProductFilters,
  type ProductUpdate,
  type SheetUpdateRow,
} from '@/features/products/api'
import { ProductFormDialog } from '@/features/products/ProductFormDialog'
import { ProductBulkEditDialog } from '@/features/products/ProductBulkEditDialog'
import { ImportDialog } from '@/components/import/ImportDialog'
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog'
import { downloadXlsx, type MappingTarget } from '@/lib/spreadsheet'
import { useWorkspace } from '@/providers/WorkspaceProvider'

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
  { key: 'id', label: 'ID interno (não altere)', aliases: ['id'] },
  { key: 'sku', label: 'SKU', aliases: ['codigo', 'código'] },
  { key: 'description', label: 'Descrição', aliases: ['nome', 'produto'] },
  { key: 'unit', label: 'Unidade', aliases: ['un', 'unidade de medida'] },
  { key: 'sale_price', label: 'Preço de venda', aliases: ['preco', 'preço', 'valor'] },
  { key: 'cost_price', label: 'Preço de custo', aliases: ['custo'] },
  { key: 'category', label: 'Categoria', aliases: ['categoria'] },
  { key: 'min_stock', label: 'Estoque mínimo', aliases: ['estoque minimo', 'estoque'] },
  { key: 'ncm', label: 'NCM', aliases: [] },
]

const EXPORT_COLUMNS: { key: string; value: (product: Product) => string | number }[] = [
  { key: 'id', value: (p) => p.id },
  { key: 'sku', value: (p) => p.sku },
  { key: 'description', value: (p) => p.description },
  { key: 'unit', value: (p) => p.unit },
  { key: 'sale_price', value: (p) => p.sale_price },
  { key: 'cost_price', value: (p) => p.cost_price },
  { key: 'category', value: (p) => p.category ?? '' },
  { key: 'min_stock', value: (p) => p.min_stock ?? '' },
  { key: 'ncm', value: (p) => p.ncm ?? '' },
]

function parseDecimal(value: string | undefined): number | null {
  if (!value) return null
  let text = value.trim().replace(/\s/g, '').replace(/^R\$/i, '')
  if (text.includes(',')) text = text.replace(/\./g, '').replace(',', '.')
  const number = Number(text)
  return text !== '' && Number.isFinite(number) ? number : null
}

function summarize(label: string, values: string[]) {
  if (values.length === 0) return null
  const sample = values.slice(0, 3).join(', ')
  return `${values.length} ${label} (ex.: ${sample}${values.length > 3 ? '…' : ''})`
}

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

  // Só na primeira renderização: reabre o diálogo certo se a URL já pedir
  // (link "?new=1" vindo de outra tela, ou recarregamento com "?edit=<id>" ainda na URL).
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setEditingProduct(null)
      setFormOpen(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const editId = searchParams.get('edit')
  const { data: editProductFromUrl } = useProductQuery(editId ?? undefined)

  useEffect(() => {
    if (editId && editProductFromUrl) {
      setEditingProduct(editProductFromUrl)
      setFormOpen(true)
    }
  }, [editId, editProductFromUrl])

  const openNewDialog = () => {
    setEditingProduct(null)
    setFormOpen(true)
    searchParams.delete('edit')
    searchParams.set('new', '1')
    setSearchParams(searchParams, { replace: true })
  }

  const openEditDialog = (product: Product) => {
    setEditingProduct(product)
    setFormOpen(true)
    searchParams.delete('new')
    searchParams.set('edit', product.id)
    setSearchParams(searchParams, { replace: true })
  }

  const handleFormOpenChange = (open: boolean) => {
    setFormOpen(open)
    if (!open && (searchParams.get('edit') || searchParams.get('new'))) {
      searchParams.delete('edit')
      searchParams.delete('new')
      setSearchParams(searchParams, { replace: true })
    }
  }

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
  const bulkUpdateFromSheet = useBulkUpdateProductsFromSheet()
  const fetchAllProducts = useFetchAllProducts()
  const { isAdmin } = useWorkspace()
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const products = await fetchAllProducts(filters)
      const headers = EXPORT_COLUMNS.map((column) => UPDATE_TARGETS.find((t) => t.key === column.key)!.label)
      const dataRows = products.map((product) => EXPORT_COLUMNS.map((column) => column.value(product)))
      downloadXlsx(headers, dataRows, `produtos_${new Date().toISOString().slice(0, 10)}.xlsx`, 'Produtos')
      toast.success(`${products.length} produto(s) exportado(s)`)
    } catch (error) {
      toast.error('Não foi possível exportar', { description: error instanceof Error ? error.message : undefined })
    } finally {
      setExporting(false)
    }
  }
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
          {isAdmin ? (
            <>
              <Button variant="outline" disabled={exporting} onClick={handleExport}>
                <Download className="size-4" />
                {exporting ? 'Exportando…' : 'Exportar'}
              </Button>
              <Button variant="outline" onClick={() => setUpdateOpen(true)}>
                <FileSpreadsheet className="size-4" />
                Atualizar por planilha
              </Button>
            </>
          ) : null}
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="size-4" />
            Importar
          </Button>
          <Button onClick={openNewDialog}>
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
                        onClick={() => openEditDialog(product)}
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

      <ProductFormDialog open={formOpen} onOpenChange={handleFormOpenChange} product={editingProduct} />

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
        description="Não cria produtos novos — atualiza os que já existem. Se a planilha tiver a coluna de ID interno (baixe pelo botão Exportar), cada linha atualiza exatamente um produto e o SKU também pode ser trocado. Sem o ID, o produto é encontrado pelo SKU, e linhas cujo SKU exista em mais de um produto são ignoradas. Células vazias não alteram nada."
        templateFilename="modelo_atualizar_produtos.csv"
        targets={UPDATE_TARGETS}
        requireAnyOf={{ keys: ['id', 'sku'], message: 'Associe pelo menos a coluna do ID interno ou a do SKU.' }}
        actionLabel="Atualizar"
        actionLabelIng="Atualizando"
        successVerb="atualizado(s)"
        onImport={async (importedRows) => {
          const sheetRows: SheetUpdateRow[] = importedRows
            .map((row) => {
              const id = row.id?.trim() || undefined
              const sku = row.sku?.trim() || undefined
              const payload: ProductUpdate = {}
              if (row.description) payload.description = row.description
              if (row.unit) payload.unit = row.unit
              const salePrice = parseDecimal(row.sale_price)
              if (salePrice !== null) payload.sale_price = salePrice
              const costPrice = parseDecimal(row.cost_price)
              if (costPrice !== null) payload.cost_price = costPrice
              const minStock = parseDecimal(row.min_stock)
              if (minStock !== null) payload.min_stock = minStock
              if (row.category) payload.category = row.category
              if (row.ncm) payload.ncm = row.ncm
              if (id && sku) payload.sku = sku
              return { id, sku, payload }
            })
            .filter((r) => (r.id || r.sku) && Object.keys(r.payload).length > 0)
          const result = await bulkUpdateFromSheet.mutateAsync(sheetRows)
          const notes = [
            summarize('não encontrado(s)', result.notFound),
            summarize('ignorado(s) por SKU repetido (use o ID interno)', result.ambiguous),
          ].filter((note): note is string => !!note)
          return { count: result.updated, notes }
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
