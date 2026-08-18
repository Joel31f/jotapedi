import { endOfDay, endOfWeek, startOfDay } from 'date-fns'
import type { ActivityWithRelations } from '@/features/activities/api'

export interface ActivityBuckets {
  overdue: ActivityWithRelations[]
  today: ActivityWithRelations[]
  week: ActivityWithRelations[]
  future: ActivityWithRelations[]
  completed: ActivityWithRelations[]
}

export function bucketActivities(activities: ActivityWithRelations[]): ActivityBuckets {
  const now = new Date()
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

  const buckets: ActivityBuckets = { overdue: [], today: [], week: [], future: [], completed: [] }

  for (const activity of activities) {
    if (activity.status === 'completed') {
      buckets.completed.push(activity)
      continue
    }
    const due = new Date(activity.due_at)
    if (due < todayStart) buckets.overdue.push(activity)
    else if (due <= todayEnd) buckets.today.push(activity)
    else if (due <= weekEnd) buckets.week.push(activity)
    else buckets.future.push(activity)
  }

  return buckets
}
