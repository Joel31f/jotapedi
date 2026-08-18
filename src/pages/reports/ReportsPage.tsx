import { useState } from 'react'
import { toast } from 'sonner'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency } from '@/lib/format'
import { useWorkspace } from '@/providers/WorkspaceProvider'
import {
  resolveRange,
  useClientRanking,
  useConversionFunnel,
  useProductRanking,
  useReportMetrics,
  useRevenueByPeriod,
  type PeriodPreset,
} from '@/features/reports/api'
import { exportRawData } from '@/features/reports/export'

const PERIOD_OPTIONS: { value: PeriodPreset; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: 'week', label: 'Esta semana' },
  { value: 'month', label: 'Este mês' },
  { value: 'quarter', label: 'Trimestre' },
  { value: 'custom', label: 'Personalizado' },
]

export function ReportsPage() {
  const { activeWorkspace } = useWorkspace()
  const [preset, setPreset] = useState<PeriodPreset>('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [exporting, setExporting] = useState(false)

  const range = resolveRange(preset, customFrom, customTo)
  const metrics = useReportMetrics(range)
  const revenueSeries = useRevenueByPeriod(range)
  const funnel = useConversionFunnel(range)
  const clientRanking = useClientRanking(range, 10)
  const { data: productRanking = [] } = useProductRanking(range, 10)

  const maxFunnelValue = Math.max(1, ...funnel.map((f) => f.value))

  const handleExport = async () => {
    if (!activeWorkspace) return
    setExporting(true)
    try {
      await exportRawData(activeWorkspace.id)
      toast.success('Exportação gerada')
    } catch (error) {
      toast.error('Não foi possível exportar', { description: error instanceof Error ? error.message : undefined })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-foreground">Relatórios</h1>
        <div className="flex items-center gap-2">
          <Select
            value={preset}
            onValueChange={(value) => setPreset((value as PeriodPreset) ?? 'month')}
            items={PERIOD_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {preset === 'custom' ? (
            <>
              <Input type="date" className="w-36" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
              <Input type="date" className="w-36" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
            </>
          ) : null}
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            <Download className="size-4" />
            {exporting ? 'Exportando…' : 'Exportar XLSX'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Total de leads</p>
            <p className="text-lg font-semibold text-foreground">{metrics.totalLeads}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Faturamento</p>
            <p className="text-lg font-semibold text-foreground">{formatCurrency(metrics.revenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Ticket médio</p>
            <p className="text-lg font-semibold text-foreground">{formatCurrency(metrics.avgTicket)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Taxa de conversão</p>
            <p className="text-lg font-semibold text-foreground">{metrics.conversionRate.toFixed(0)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Conclusão de atividades</p>
            <p className="text-lg font-semibold text-foreground">
              {metrics.activitiesCompletionRate.toFixed(0)}%{' '}
              <span className="text-xs font-normal text-muted-foreground">
                ({metrics.activitiesCompleted}/{metrics.activitiesTotal})
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Faturamento no período</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueSeries} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                  <YAxis hide />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="revenue" fill="#00e676" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Funil de conversão</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {funnel.map(({ stage, count, value }) => (
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
                    style={{ width: `${(value / maxFunnelValue) * 100}%`, backgroundColor: stage.color }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Ranking de clientes</CardTitle>
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
                {clientRanking.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                      Sem dados no período.
                    </TableCell>
                  </TableRow>
                ) : (
                  clientRanking.map((c) => (
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

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Produtos mais vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Qtd.</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productRanking.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                      Sem dados no período.
                    </TableCell>
                  </TableRow>
                ) : (
                  productRanking.map((p) => (
                    <TableRow key={p.key}>
                      <TableCell className="text-foreground">{p.description}</TableCell>
                      <TableCell className="text-right">{p.quantity}</TableCell>
                      <TableCell className="text-right font-medium text-foreground">{formatCurrency(p.total)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
