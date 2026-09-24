import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SearchCombobox, type ComboboxOption } from '@/components/SearchCombobox'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog'
import { formatCurrency, formatDate } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { useWorkspace } from '@/providers/WorkspaceProvider'
import {
  EMPTY_ORDER_FILTERS,
  ORDERS_PAGE_SIZE,
  useDeleteOrder,
  useOrderQuery,
  useOrdersKanbanQuery,
  useOrdersQuery,
  useUpdateOrderStage,
  type OrderFilters,
  type OrderWithRelations,
} from '@/features/orders/api'
import { OrderFormDialog } from '@/features/orders/OrderFormDialog'

type SortColumn = 'created_at' | 'total' | 'client' | 'stage'

export function OrdersPage() {
  const { activeWorkspace, stages } = useWorkspace()
  const [searchParams, setSearchParams] = useSearchParams()
  const [view, setView] = useState<'kanban' | 'lista'>('kanban')
  const [filters, setFilters] = useState<OrderFilters>(EMPTY_ORDER_FILTERS)
  const [page, setPage] = useState(0)
  const [sortColumn, setSortColumn] = useState<SortColumn>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const [formOpen, setFormOpen] = useState(false)
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null)
  const [deletingOrder, setDeletingOrder] = useState<OrderWithRelations | null>(null)

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setEditingOrderId(null)
      setFormOpen(true)
    }
    const editIdInit = searchParams.get('edit')
    if (editIdInit) {
      setEditingOrderId(editIdInit)
      setFormOpen(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openNewDialog = () => {
    setEditingOrderId(null)
    setFormOpen(true)
    searchParams.delete('edit')
    searchParams.set('new', '1')
    setSearchParams(searchParams, { replace: true })
  }

  const openEditDialog = (orderId: string) => {
    setEditingOrderId(orderId)
    setFormOpen(true)
    searchParams.delete('new')
    searchParams.set('edit', orderId)
    setSearchParams(searchParams, { replace: true })
  }

  const handleFormOpenChange = (open: boolean) => {
    setFormOpen(open)
    if (!open) {
      setEditingOrderId(null)
      if (searchParams.get('edit') || searchParams.get('new')) {
        searchParams.delete('edit')
        searchParams.delete('new')
        setSearchParams(searchParams, { replace: true })
      }
    }
  }

  const { data: editingOrder } = useOrderQuery(editingOrderId ?? undefined)
  const { data, isLoading } = useOrdersQuery(filters, page)
  const { data: kanbanOrders = [] } = useOrdersKanbanQuery(filters)
  const deleteOrder = useDeleteOrder()
  const updateStage = useUpdateOrderStage()

  const rows = data?.rows ?? []
  const total = data?.count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / ORDERS_PAGE_SIZE))

  const sortedRows = useMemo(() => {
    const copy = [...rows]
    copy.sort((a, b) => {
      let cmp = 0
      if (sortColumn === 'created_at') cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      if (sortColumn === 'total') cmp = a.total - b.total
      if (sortColumn === 'client') cmp = (a.client?.name ?? '').localeCompare(b.client?.name ?? '')
      if (sortColumn === 'stage') cmp = (a.stage?.name ?? '').localeCompare(b.stage?.name ?? '')
      return sortDir === 'asc' ? cmp : -cmp
    })
    return copy
  }, [rows, sortColumn, sortDir])

  const toggleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column)
      setSortDir('asc')
    }
  }

  const searchClients = async (query: string): Promise<ComboboxOption[]> => {
    if (!activeWorkspace) return []
    let q = supabase.from('clients').select('id, name, company').eq('workspace_id', activeWorkspace.id)
    const cleaned = query.replace(/[,%]/g, '').trim()
    if (cleaned) q = q.or(`name.ilike.%${cleaned}%,company.ilike.%${cleaned}%`)
    const { data: clientRows } = await q.order('name', { ascending: true }).limit(20)
    return (clientRows ?? []).map((c) => ({ id: c.id, label: c.name, sublabel: c.company }))
  }

  const hasActiveFilters =
    filters.stageId !== 'all' || filters.clientId || filters.dateFrom || filters.dateTo || filters.minValue || filters.maxValue

  const handleDelete = async () => {
    if (!deletingOrder) return
    try {
      await deleteOrder.mutateAsync(deletingOrder.id)
      toast.success('Pedido excluído')
      setDeletingOrder(null)
    } catch (error) {
      toast.error('Não foi possível excluir', { description: error instanceof Error ? error.message : undefined })
    }
  }

  const SortHeader = ({ column, label }: { column: SortColumn; label: string }) => (
    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort(column)}>
      <span className="flex items-center gap-1">
        {label}
        {sortColumn === column ? (
          sortDir === 'asc' ? (
            <ArrowUp className="size-3" />
          ) : (
            <ArrowDown className="size-3" />
          )
        ) : null}
      </span>
    </TableHead>
  )

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Pedidos</h1>
          <p className="text-sm text-muted-foreground">{total} pedido(s)</p>
        </div>
        <Button onClick={openNewDialog}>
          <Plus className="size-4" />
          Novo pedido
        </Button>
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as 'kanban' | 'lista')} className="flex-1">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <TabsList>
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
            <TabsTrigger value="lista">Lista</TabsTrigger>
          </TabsList>
        </div>

        <div className="mb-4 flex flex-wrap items-end gap-2">
          <Select
            value={filters.stageId}
            onValueChange={(value) => setFilters((f) => ({ ...f, stageId: value ?? 'all' }))}
            items={[{ value: 'all', label: 'Todos estágios' }, ...stages.map((s) => ({ value: s.id, label: s.name }))]}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Estágio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos estágios</SelectItem>
              {stages.map((stage) => (
                <SelectItem key={stage.id} value={stage.id}>
                  {stage.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="w-56">
            <SearchCombobox
              selectedLabel={filters.clientLabel}
              placeholder="Filtrar por cliente…"
              search={searchClients}
              onSelect={(option) => setFilters((f) => ({ ...f, clientId: option.id, clientLabel: option.label }))}
            />
          </div>

          <Input
            type="date"
            className="w-36"
            value={filters.dateFrom}
            onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
          />
          <Input
            type="date"
            className="w-36"
            value={filters.dateTo}
            onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
          />
          <Input
            className="w-28"
            placeholder="Valor mín."
            inputMode="decimal"
            value={filters.minValue}
            onChange={(e) => setFilters((f) => ({ ...f, minValue: e.target.value }))}
          />
          <Input
            className="w-28"
            placeholder="Valor máx."
            inputMode="decimal"
            value={filters.maxValue}
            onChange={(e) => setFilters((f) => ({ ...f, maxValue: e.target.value }))}
          />

          {hasActiveFilters ? (
            <Button variant="ghost" size="sm" onClick={() => setFilters(EMPTY_ORDER_FILTERS)}>
              <X className="size-3.5" />
              Limpar filtros
            </Button>
          ) : null}
        </div>

        <TabsContent value="kanban" className="flex-1">
          <KanbanBoard
            columns={stages.map((s) => ({ id: s.id, title: s.name, color: s.color }))}
            items={kanbanOrders}
            getId={(o) => o.id}
            getColumnId={(o) => o.stage_id}
            emptyLabel="Nenhum pedido neste estágio"
            onMove={(id, columnId) => updateStage.mutate({ id, stageId: columnId })}
            renderColumnHeaderExtra={(_columnId, colItems) => (
              <span className="text-xs text-muted-foreground">
                {formatCurrency(colItems.reduce((sum, o) => sum + o.total, 0))}
              </span>
            )}
            renderCard={(order) => (
              <button
                className="w-full text-left"
                onClick={() => openEditDialog(order.id)}
              >
                <p className="text-sm font-medium text-foreground">{order.client?.name ?? 'Sem cliente'}</p>
                <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
                <p className="mt-1 text-sm font-semibold text-primary">{formatCurrency(order.total)}</p>
              </button>
            )}
          />
        </TabsContent>

        <TabsContent value="lista" className="flex flex-1 flex-col">
          <div className="flex-1 overflow-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortHeader column="client" label="Cliente" />
                  <SortHeader column="stage" label="Estágio" />
                  <SortHeader column="created_at" label="Data" />
                  <SortHeader column="total" label="Total" />
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                      Carregando…
                    </TableCell>
                  </TableRow>
                ) : sortedRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                      Nenhum pedido encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedRows.map((order) => (
                    <TableRow
                      key={order.id}
                      className="cursor-pointer"
                      onClick={() => openEditDialog(order.id)}
                    >
                      <TableCell className="font-medium text-foreground">{order.client?.name ?? '—'}</TableCell>
                      <TableCell>
                        <Badge style={{ backgroundColor: `${order.stage?.color}20`, color: order.stage?.color }}>
                          {order.stage?.name ?? '—'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(order.created_at)}</TableCell>
                      <TableCell className="font-medium text-foreground">{formatCurrency(order.total)}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => setDeletingOrder(order)}
                        >
                          <X className="size-3.5" />
                        </Button>
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
        </TabsContent>
      </Tabs>

      <OrderFormDialog
        open={formOpen}
        onOpenChange={handleFormOpenChange}
        onCreated={openEditDialog}
        order={editingOrder ?? null}
      />

      <ConfirmDeleteDialog
        open={!!deletingOrder}
        onOpenChange={(open) => !open && setDeletingOrder(null)}
        title="Excluir pedido"
        description="Tem certeza que deseja excluir este pedido? Essa ação não pode ser desfeita."
        onConfirm={handleDelete}
        loading={deleteOrder.isPending}
      />
    </div>
  )
}
