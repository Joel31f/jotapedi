import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/providers/WorkspaceProvider'
import { buildClientRanking, buildFunnel, useSellerReport, type DateRange, type SellerStats } from '@/features/reports/api'

const ALL = 'all'

type SortKey = 'name' | 'orders' | 'won' | 'revenue' | 'avgTicket' | 'conversionRate' | 'activitiesRate'

const COLUMNS: { key: SortKey; label: string; align?: 'right' }[] = [
  { key: 'name', label: 'Vendedor' },
  { key: 'orders', label: 'Pedidos', align: 'right' },
  { key: 'won', label: 'Ganhos', align: 'right' },
  { key: 'revenue', label: 'Faturamento', align: 'right' },
  { key: 'avgTicket', label: 'Ticket médio', align: 'right' },
  { key: 'conversionRate', label: 'Conversão', align: 'right' },
  { key: 'activitiesRate', label: 'Atividades', align: 'right' },
]

function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold text-foreground">
          {value}
          {hint ? <span className="ml-1 text-xs font-normal text-muted-foreground">{hint}</span> : null}
        </p>
      </CardContent>
    </Card>
  )
}

export function SellersReport({ range }: { range: DateRange }) {
  const { stages } = useWorkspace()
  const { sellers, ordersOf, isLoading } = useSellerReport(range)
  const [selected, setSelected] = useState<string>(ALL)
  const [sortKey, setSortKey] = useState<SortKey>('revenue')
  const [sortDesc, setSortDesc] = useState(true)

  const sorted = useMemo(() => {
    const list = [...sellers]
    list.sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      const cmp = typeof av === 'string' ? av.localeCompare(String(bv), 'pt-BR') : Number(av) - Number(bv)
      return sortDesc ? -cmp : cmp
    })
    return list
  }, [sellers, sortKey, sortDesc])

  const maxRevenue = Math.max(1, ...sellers.map((s) => s.revenue))
  const current = selected === ALL ? null : (sellers.find((s) => s.id === selected) ?? null)

  const totals = useMemo(() => {
    const orders = sellers.reduce((sum, s) => sum + s.orders, 0)
    const won = sellers.reduce((sum, s) => sum + s.won, 0)
    const revenue = sellers.reduce((sum, s) => sum + s.revenue, 0)
    const actTotal = sellers.reduce((sum, s) => sum + s.activitiesTotal, 0)
    const actDone = sellers.reduce((sum, s) => sum + s.activitiesCompleted, 0)
    return {
      orders,
      won,
      revenue,
      avgTicket: won > 0 ? revenue / won : 0,
      conversionRate: orders > 0 ? (won / orders) * 100 : 0,
      activitiesTotal: actTotal,
      activitiesCompleted: actDone,
      activitiesRate: actTotal > 0 ? (actDone / actTotal) * 100 : 0,
    }
  }, [sellers])

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDesc((prev) => !prev)
    else {
      setSortKey(key)
      setSortDesc(key !== 'name')
    }
  }

  const selectItems = [{ value: ALL, label: 'Todos os vendedores' }, ...sellers.map((s) => ({ value: s.id, label: s.name }))]

  const detailOrders = current ? ordersOf(current.id) : []
  const detailFunnel = buildFunnel(stages, detailOrders)
  const detailMax = Math.max(1, ...detailFunnel.map((f) => f.value))
  const detailClients = buildClientRanking(detailOrders, 5)

  const rate = (value: number) => `${value.toFixed(0)}%`

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted-foreground">Ver dados de:</p>
        <Select value={selected} onValueChange={(value) => setSelected(value ?? ALL)} items={selectItems}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {selectItems.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {current ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <KpiCard label="Faturamento" value={formatCurrency(current.revenue)} />
            <KpiCard label="Pedidos" value={String(current.orders)} hint={`${current.won} ganho(s)`} />
            <KpiCard label="Ticket médio" value={formatCurrency(current.avgTicket)} />
            <KpiCard label="Taxa de conversão" value={rate(current.conversionRate)} />
            <KpiCard
              label="Conclusão de atividades"
              value={rate(current.activitiesRate)}
              hint={`(${current.activitiesCompleted}/${current.activitiesTotal})`}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Funil de {current.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {detailFunnel.map(({ stage, count, value }) => (
                  <div key={stage.id}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">
                        {stage.name} <span className="text-muted-foreground">({count})</span>
                      </span>
                      <span className="text-muted-foreground">{formatCurrency(value)}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(value / detailMax) * 100}%`, backgroundColor: stage.color }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Maiores clientes de {current.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="text-right">Pedidos</TableHead>
                      <TableHead className="text-right">Total comprado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailClients.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                          Sem vendas no período.
                        </TableCell>
                      </TableRow>
                    ) : (
                      detailClients.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="text-foreground">{c.name}</TableCell>
                          <TableCell className="text-right">{c.count}</TableCell>
                          <TableCell className="text-right font-medium text-foreground">{formatCurrency(c.total)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Comparativo entre vendedores</CardTitle>
          <p className="text-xs text-muted-foreground">
            Faturamento considera só pedidos em etapas marcadas como "Ganho". Clique em uma linha para ver só aquele vendedor.
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {COLUMNS.map((col) => (
                  <TableHead key={col.key} className={col.align === 'right' ? 'text-right' : undefined}>
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className={cn(
                        'inline-flex items-center gap-1 hover:text-foreground',
                        sortKey === col.key ? 'text-foreground' : 'text-muted-foreground',
                      )}
                    >
                      {col.label}
                      {sortKey === col.key ? sortDesc ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" /> : null}
                    </button>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={COLUMNS.length} className="text-center text-sm text-muted-foreground">
                    Carregando…
                  </TableCell>
                </TableRow>
              ) : sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={COLUMNS.length} className="text-center text-sm text-muted-foreground">
                    Sem dados no período.
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {sorted.map((s: SellerStats) => (
                    <TableRow
                      key={s.id}
                      onClick={() => setSelected((prev) => (prev === s.id ? ALL : s.id))}
                      className={cn('cursor-pointer', selected === s.id && 'bg-muted/60')}
                    >
                      <TableCell className="font-medium text-foreground">{s.name}</TableCell>
                      <TableCell className="text-right">{s.orders}</TableCell>
                      <TableCell className="text-right">{s.won}</TableCell>
                      <TableCell className="text-right">
                        <span className="font-medium text-foreground">{formatCurrency(s.revenue)}</span>
                        <div className="mt-1 ml-auto h-1 w-24 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${(s.revenue / maxRevenue) * 100}%` }} />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(s.avgTicket)}</TableCell>
                      <TableCell className="text-right">{rate(s.conversionRate)}</TableCell>
                      <TableCell className="text-right">
                        {rate(s.activitiesRate)}{' '}
                        <span className="text-xs text-muted-foreground">
                          ({s.activitiesCompleted}/{s.activitiesTotal})
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 font-medium">
                    <TableCell className="text-foreground">Total</TableCell>
                    <TableCell className="text-right">{totals.orders}</TableCell>
                    <TableCell className="text-right">{totals.won}</TableCell>
                    <TableCell className="text-right text-foreground">{formatCurrency(totals.revenue)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totals.avgTicket)}</TableCell>
                    <TableCell className="text-right">{rate(totals.conversionRate)}</TableCell>
                    <TableCell className="text-right">
                      {rate(totals.activitiesRate)}{' '}
                      <span className="text-xs text-muted-foreground">
                        ({totals.activitiesCompleted}/{totals.activitiesTotal})
                      </span>
                    </TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
