import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Search, Upload, Pencil, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { LEAD_STAGES, LEAD_STAGE_MAP } from '@/config/leadStages'
import {
  CLIENTS_PAGE_SIZE,
  useAllClientsForKanbanQuery,
  useBulkDeleteClients,
  useBulkDeleteClientsByFilter,
  useBulkInsertClients,
  useClientsQuery,
  useDeleteClient,
  useUpdateClientStage,
  type ClientFilters,
  type ClientWithTags,
} from '@/features/clients/api'
import { ClientFormDialog } from '@/features/clients/ClientFormDialog'
import { ImportDialog } from '@/components/import/ImportDialog'
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog'
import type { LeadStage } from '@/types/database'
import type { MappingTarget } from '@/lib/spreadsheet'

const IMPORT_TARGETS: MappingTarget[] = [
  { key: 'name', label: 'Nome', required: true, aliases: ['cliente'] },
  { key: 'company', label: 'Empresa', aliases: ['empresa'] },
  { key: 'document', label: 'CNPJ/CPF', aliases: ['cnpj', 'cpf', 'documento'] },
  { key: 'email', label: 'Email(s)', aliases: ['email', 'emails'] },
  { key: 'phone', label: 'Telefone(s) 1', aliases: ['fone', 'celular', 'telefones', 'telefone1'] },
  { key: 'phone_2', label: 'Telefone(s) 2', aliases: ['telefone2', 'celular2'] },
  { key: 'whatsapp', label: 'WhatsApp', aliases: [] },
  { key: 'role_title', label: 'Cargo', aliases: [] },
  { key: 'address_street', label: 'Rua', aliases: ['endereco', 'logradouro'] },
  { key: 'address_number', label: 'Número', aliases: ['numero'] },
  { key: 'address_complement', label: 'Complemento', aliases: ['complemento'] },
  { key: 'address_neighborhood', label: 'Bairro', aliases: ['bairro'] },
  { key: 'address_city', label: 'Cidade', aliases: [] },
  { key: 'address_state', label: 'Estado (UF)', aliases: ['uf', 'estado'] },
  { key: 'city_state', label: 'Cidade e Estado juntos (ex: Eusébio-CE)', aliases: ['cidade'] },
  { key: 'address_zip', label: 'CEP', aliases: ['cep'] },
  { key: 'active_flag', label: 'Ativo (SIM/NÃO) → estágio', aliases: ['ativo'] },
  { key: 'state_registration', label: 'Inscrição Estadual', aliases: [] },
]

function splitMultiValue(value: string): string[] {
  return value
    .split(/[,;/]/)
    .map((v) => v.trim())
    .filter(Boolean)
}

function splitCityState(value: string): { city: string | null; state: string | null } {
  const trimmed = value.trim()
  const lastDash = trimmed.lastIndexOf('-')
  if (lastDash === -1) return { city: trimmed || null, state: null }
  const city = trimmed.slice(0, lastDash).trim()
  const state = trimmed.slice(lastDash + 1).trim()
  return { city: city || null, state: state || null }
}

export function ClientsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [view, setView] = useState<'lista' | 'crm'>('lista')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [leadStage, setLeadStage] = useState<ClientFilters['leadStage']>('all')
  const [page, setPage] = useState(0)

  const [formOpen, setFormOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<ClientWithTags | null>(null)
  const [deletingClient, setDeletingClient] = useState<ClientWithTags | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectAllMatching, setSelectAllMatching] = useState(false)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setEditingClient(null)
      setFormOpen(true)
      searchParams.delete('new')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const filters: ClientFilters = { search: debouncedSearch, leadStage }
  const { data, isLoading } = useClientsQuery(filters, page)
  const { data: kanbanClients = [] } = useAllClientsForKanbanQuery(debouncedSearch)
  const deleteClient = useDeleteClient()
  const bulkInsert = useBulkInsertClients()
  const bulkDeleteByIds = useBulkDeleteClients()
  const bulkDeleteByFilter = useBulkDeleteClientsByFilter()
  const updateStage = useUpdateClientStage()

  const rows = data?.rows ?? []
  const total = data?.count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / CLIENTS_PAGE_SIZE))
  const selectedCount = selectAllMatching ? total : selectedIds.size
  const allRowsSelected = rows.length > 0 && (selectAllMatching || rows.every((c) => selectedIds.has(c.id)))
  const someRowsSelected = !allRowsSelected && rows.some((c) => selectedIds.has(c.id))

  useEffect(() => {
    setSelectedIds(new Set())
    setSelectAllMatching(false)
  }, [debouncedSearch, leadStage])

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
      for (const client of rows) {
        if (checked) next.add(client.id)
        else next.delete(client.id)
      }
      return next
    })
  }

  const handleBulkDelete = async () => {
    try {
      const count = selectAllMatching
        ? await bulkDeleteByFilter.mutateAsync(filters)
        : await bulkDeleteByIds.mutateAsync([...selectedIds])
      toast.success(`${count} cliente(s) excluído(s)`)
      clearSelection()
      setBulkDeleteOpen(false)
      if (page > 0) setPage(0)
    } catch (error) {
      toast.error('Não foi possível excluir', { description: error instanceof Error ? error.message : undefined })
    }
  }

  const handleDelete = async () => {
    if (!deletingClient) return
    try {
      await deleteClient.mutateAsync(deletingClient.id)
      toast.success('Cliente excluído')
      setDeletingClient(null)
    } catch (error) {
      toast.error('Não foi possível excluir', { description: error instanceof Error ? error.message : undefined })
    }
  }

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground">{total} cliente(s) cadastrado(s)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="size-4" />
            Importar
          </Button>
          <Button
            onClick={() => {
              setEditingClient(null)
              setFormOpen(true)
            }}
          >
            <Plus className="size-4" />
            Novo cliente
          </Button>
        </div>
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as 'lista' | 'crm')} className="flex-1">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <TabsList>
            <TabsTrigger value="lista">Lista</TabsTrigger>
            <TabsTrigger value="crm">CRM</TabsTrigger>
          </TabsList>
          <div className="relative min-w-48 max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Buscar por nome, email, empresa, CNPJ…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(0)
              }}
            />
          </div>
          {view === 'lista' ? (
            <Select
              value={leadStage}
              onValueChange={(value) => {
                setLeadStage(value as ClientFilters['leadStage'])
                setPage(0)
              }}
              items={[{ value: 'all', label: 'Todos estágios' }, ...LEAD_STAGES.map((s) => ({ value: s.id, label: s.title }))]}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Estágio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos estágios</SelectItem>
                {LEAD_STAGES.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    {stage.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>

        <TabsContent value="lista" className="flex flex-1 flex-col">
          {selectedCount > 0 ? (
            <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2">
              <p className="text-sm text-foreground">{selectedCount} cliente(s) selecionado(s)</p>
              {!selectAllMatching && allRowsSelected && total > rows.length ? (
                <button
                  type="button"
                  className="text-sm text-primary underline underline-offset-2"
                  onClick={() => setSelectAllMatching(true)}
                >
                  Selecionar todos os {total} clientes que correspondem ao filtro
                </button>
              ) : null}
              <div className="ml-auto flex gap-2">
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
                  <TableHead>Nome</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Estágio</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                      Carregando…
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                      Nenhum cliente encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((client) => (
                    <TableRow key={client.id} className="cursor-pointer" onClick={() => navigate(`/clientes/${client.id}`)}>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectAllMatching || selectedIds.has(client.id)}
                          disabled={selectAllMatching}
                          onCheckedChange={(checked) => toggleRow(client.id, checked)}
                        />
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{client.name}</TableCell>
                      <TableCell>{client.company ?? '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {client.emails[0] ?? client.phones[0] ?? client.whatsapp ?? '—'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          style={{
                            backgroundColor: `${LEAD_STAGE_MAP[client.lead_stage].color}20`,
                            color: LEAD_STAGE_MAP[client.lead_stage].color,
                          }}
                        >
                          {LEAD_STAGE_MAP[client.lead_stage].title}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {client.tags.map((tag) => (
                            <Badge key={tag.id} variant="secondary">
                              {tag.name}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingClient(client)
                              setFormOpen(true)
                            }}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button size="icon-sm" variant="ghost" onClick={() => setDeletingClient(client)}>
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
        </TabsContent>

        <TabsContent value="crm" className="flex-1">
          <KanbanBoard
            columns={LEAD_STAGES}
            items={kanbanClients}
            getId={(c) => c.id}
            getColumnId={(c) => c.lead_stage}
            emptyLabel="Nenhum cliente neste estágio"
            onMove={(id, columnId) => updateStage.mutate({ id, leadStage: columnId as LeadStage })}
            renderCard={(client) => (
              <button className="w-full text-left" onClick={() => navigate(`/clientes/${client.id}`)}>
                <p className="text-sm font-medium text-foreground">{client.name}</p>
                {client.company ? <p className="text-xs text-muted-foreground">{client.company}</p> : null}
                {client.tags.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {client.tags.map((tag) => (
                      <Badge key={tag.id} variant="secondary" className="text-[10px]">
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </button>
            )}
          />
        </TabsContent>
      </Tabs>

      <ClientFormDialog open={formOpen} onOpenChange={setFormOpen} client={editingClient} />

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Importar clientes"
        templateFilename="modelo_clientes.csv"
        targets={IMPORT_TARGETS}
        onImport={async (importedRows) => {
          const payload = importedRows
            .filter((row) => row.name)
            .map((row) => {
              const citySplit = row.city_state ? splitCityState(row.city_state) : null
              const activeFlag = (row.active_flag || '').trim().toUpperCase()
              const lead_stage: LeadStage =
                activeFlag === 'SIM' ? 'cliente_ativo' : activeFlag === 'NAO' || activeFlag === 'NÃO' ? 'inativo' : 'novo_lead'

              return {
                name: row.name,
                company: row.company || null,
                document: row.document || null,
                emails: [...splitMultiValue(row.email || '')],
                phones: [...splitMultiValue(row.phone || ''), ...splitMultiValue(row.phone_2 || '')],
                whatsapp: row.whatsapp || null,
                role_title: row.role_title || null,
                address_street: row.address_street || null,
                address_number: row.address_number || null,
                address_complement: row.address_complement || null,
                address_neighborhood: row.address_neighborhood || null,
                address_city: citySplit?.city ?? (row.address_city || null),
                address_state: citySplit?.state ?? (row.address_state || null),
                address_zip: row.address_zip || null,
                state_registration: row.state_registration || null,
                lead_stage,
              }
            })
          return bulkInsert.mutateAsync(payload)
        }}
      />

      <ConfirmDeleteDialog
        open={!!deletingClient}
        onOpenChange={(open) => !open && setDeletingClient(null)}
        title="Excluir cliente"
        description={`Tem certeza que deseja excluir "${deletingClient?.name}"? Essa ação não pode ser desfeita.`}
        onConfirm={handleDelete}
        loading={deleteClient.isPending}
      />

      <ConfirmDeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title="Excluir clientes selecionados"
        description={`Tem certeza que deseja excluir ${selectedCount} cliente(s)? Essa ação não pode ser desfeita.`}
        onConfirm={handleBulkDelete}
        loading={bulkDeleteByIds.isPending || bulkDeleteByFilter.isPending}
      />
    </div>
  )
}
