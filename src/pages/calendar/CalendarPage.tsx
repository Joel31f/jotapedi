import { useMemo, useState } from 'react'
import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ACTIVITY_TYPE_MAP } from '@/config/activityTypes'
import { useActivitiesForRangeQuery, type ActivityWithRelations } from '@/features/activities/api'
import { ActivityFormDialog } from '@/features/activities/ActivityFormDialog'

type ViewMode = 'month' | 'week'

function groupByDay(activities: ActivityWithRelations[]) {
  const map = new Map<string, ActivityWithRelations[]>()
  for (const activity of activities) {
    const key = format(new Date(activity.due_at), 'yyyy-MM-dd')
    const list = map.get(key) ?? []
    list.push(activity)
    map.set(key, list)
  }
  return map
}

export function CalendarPage() {
  const [view, setView] = useState<ViewMode>('month')
  const [cursor, setCursor] = useState(new Date())
  const [formOpen, setFormOpen] = useState(false)
  const [editingActivity, setEditingActivity] = useState<ActivityWithRelations | null>(null)
  const [defaultDate, setDefaultDate] = useState<Date | null>(null)

  const rangeStart = view === 'month' ? startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 }) : startOfWeek(cursor, { weekStartsOn: 1 })
  const rangeEnd = view === 'month' ? endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }) : endOfWeek(cursor, { weekStartsOn: 1 })
  const days = useMemo(() => eachDayOfInterval({ start: rangeStart, end: rangeEnd }), [rangeStart, rangeEnd])

  const { data: activities = [] } = useActivitiesForRangeQuery(rangeStart.toISOString(), rangeEnd.toISOString())
  const byDay = useMemo(() => groupByDay(activities), [activities])

  const openCreateForDay = (day: Date) => {
    const withTime = new Date(day)
    withTime.setHours(9, 0, 0, 0)
    setEditingActivity(null)
    setDefaultDate(withTime)
    setFormOpen(true)
  }

  const openEdit = (activity: ActivityWithRelations) => {
    setEditingActivity(activity)
    setDefaultDate(null)
    setFormOpen(true)
  }

  const navigate = (dir: 1 | -1) => {
    setCursor((prev) => (view === 'month' ? addMonths(prev, dir) : addWeeks(prev, dir)))
  }

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold capitalize text-foreground">
          {format(cursor, view === 'month' ? 'MMMM yyyy' : "'Semana de' d 'de' MMMM", { locale: ptBR })}
        </h1>
        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="month">Mês</TabsTrigger>
              <TabsTrigger value="week">Semana</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button size="sm" variant="outline" onClick={() => setCursor(new Date())}>
            Hoje
          </Button>
          <Button size="icon-sm" variant="outline" onClick={() => navigate(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button size="icon-sm" variant="outline" onClick={() => navigate(1)}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-border pb-2 text-center text-xs font-medium text-muted-foreground">
        {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div className={`grid flex-1 grid-cols-7 gap-px overflow-y-auto ${view === 'month' ? '' : 'auto-rows-fr'}`}>
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const dayActivities = byDay.get(key) ?? []
          const dimmed = view === 'month' && !isSameMonth(day, cursor)
          return (
            <div
              key={key}
              onClick={() => openCreateForDay(day)}
              className={`flex min-h-24 cursor-pointer flex-col gap-1 border border-border/50 p-1.5 hover:bg-accent/40 ${
                dimmed ? 'bg-muted/20 text-muted-foreground' : ''
              }`}
            >
              <span
                className={`text-xs font-medium ${
                  isToday(day) ? 'flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground' : ''
                }`}
              >
                {format(day, 'd')}
              </span>
              <div className="flex flex-col gap-0.5">
                {dayActivities.slice(0, view === 'month' ? 3 : 8).map((activity) => {
                  const config = ACTIVITY_TYPE_MAP[activity.type]
                  return (
                    <button
                      key={activity.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        openEdit(activity)
                      }}
                      className={`truncate rounded px-1 py-0.5 text-left text-[11px] ${
                        activity.status === 'completed' ? 'opacity-50 line-through' : ''
                      }`}
                      style={{ backgroundColor: `${config.color}20`, color: config.color }}
                    >
                      {format(new Date(activity.due_at), 'HH:mm')} {activity.title}
                    </button>
                  )
                })}
                {dayActivities.length > (view === 'month' ? 3 : 8) ? (
                  <span className="text-[10px] text-muted-foreground">
                    +{dayActivities.length - (view === 'month' ? 3 : 8)} mais
                  </span>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>

      <ActivityFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        activity={editingActivity}
        defaultDate={defaultDate}
      />
    </div>
  )
}
