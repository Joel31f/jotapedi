import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, Pencil, ShoppingCart, TrendingUp, Wallet, Target } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ACTIVITY_TYPE_MAP } from '@/config/activityTypes'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { useWorkspace } from '@/providers/WorkspaceProvider'
import {
  useDashboardMetrics,
  useOverdueActivities,
  usePipelineSummary,
  useRevenueTrend,
  useUpdateMonthlyGoal,
} from '@/features/dashboard/api'

function MetricCard({ icon: Icon, label, value, hint }: { icon: typeof Wallet; label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold text-foreground">{value}</p>
          {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardPage() {
  const { activeWorkspace, activeMembership } = useWorkspace()
  const { data: metrics } = useDashboardMetrics()
  const { data: trend = [] } = useRevenueTrend()
  const { data: pipeline = [] } = usePipelineSummary()
  const { data: overdue = [] } = useOverdueActivities(5)
  const updateGoal = useUpdateMonthlyGoal()
  const [goalInput, setGoalInput] = useState('')
  const [goalOpen, setGoalOpen] = useState(false)

  useEffect(() => {
    setGoalInput(activeWorkspace ? String(activeWorkspace.monthly_goal) : '0')
  }, [activeWorkspace])

  const monthlyGoal = activeWorkspace?.monthly_goal ?? 0
  const goalProgress = monthlyGoal > 0 ? Math.min(100, ((metrics?.revenue ?? 0) / monthlyGoal) * 100) : 0
  const maxPipelineValue = Math.max(1, ...pipeline.map((p) => p.value))

  const handleSaveGoal = async () => {
    const value = Number(goalInput.replace(',', '.')) || 0
    try {
      await updateGoal.mutateAsync(value)
      toast.success('Meta atualizada')
      setGoalOpen(false)
    } catch (error) {
      toast.error('Não foi possível atualizar a meta', { description: error instanceof Error ? error.message : undefined })
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Olá, {activeMembership?.name?.split(' ')[0] ?? 'bem-vindo'}</h1>
        <p className="text-sm text-muted-foreground">Workspace {activeWorkspace?.name}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={ShoppingCart} label="Total de pedidos" value={String(metrics?.totalOrders ?? 0)} hint="este mês" />
        <MetricCard icon={Wallet} label="Faturamento do mês" value={formatCurrency(metrics?.revenue ?? 0)} />
        <MetricCard icon={TrendingUp} label="Ticket médio" value={formatCurrency(metrics?.avgTicket ?? 0)} />
        <MetricCard icon={Target} label="Taxa de conversão" value={`${(metrics?.conversionRate ?? 0).toFixed(0)}%`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Evolução de faturamento (últimos 6 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00e676" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#00e676" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
                  <YAxis hide />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#00e676" strokeWidth={2} fill="url(#revenueFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-sm">Meta mensal</CardTitle>
            <Popover open={goalOpen} onOpenChange={setGoalOpen}>
              <PopoverTrigger className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent">
                <Pencil className="size-3.5" />
              </PopoverTrigger>
              <PopoverContent className="w-56">
                <p className="mb-2 text-xs text-muted-foreground">Meta de faturamento mensal</p>
                <div className="flex gap-2">
                  <Input value={goalInput} inputMode="decimal" onChange={(e) => setGoalInput(e.target.value)} />
                  <Button size="sm" onClick={handleSaveGoal} disabled={updateGoal.isPending}>
                    Salvar
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-2xl font-semibold text-foreground">{formatCurrency(metrics?.revenue ?? 0)}</p>
            <Progress value={goalProgress} />
            <p className="text-xs text-muted-foreground">
              {goalProgress.toFixed(0)}% da meta de {formatCurrency(monthlyGoal)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Pipeline resumido</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {pipeline.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum pedido ainda.</p>
            ) : (
              pipeline.map(({ stage, count, value }) => (
                <div key={stage.id}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">
                      {stage.name} <span className="text-muted-foreground">({count})</span>
                    </span>
                    <span className="text-muted-foreground">{formatCurrency(value)}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(value / maxPipelineValue) * 100}%`, backgroundColor: stage.color }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-1.5 text-sm">
              <AlertTriangle className="size-4 text-destructive" /> Atividades atrasadas
            </CardTitle>
            <Link to="/atividades" className="text-xs text-primary hover:underline">
              Ver todas
            </Link>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {overdue.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma atividade atrasada.</p>
            ) : (
              overdue.map((activity) => {
                const config = ACTIVITY_TYPE_MAP[activity.type as keyof typeof ACTIVITY_TYPE_MAP]
                return (
                  <div key={activity.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                    <span
                      className="flex size-6 shrink-0 items-center justify-center rounded-md"
                      style={{ backgroundColor: `${config.color}20`, color: config.color }}
                    >
                      <config.icon className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-foreground">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(activity.due_at)}
                        {activity.clients ? ` · ${activity.clients.name}` : ''}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
