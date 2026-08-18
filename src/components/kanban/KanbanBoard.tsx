import type { ReactNode } from 'react'
import { DndContext, useDraggable, useDroppable, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { cn } from '@/lib/utils'

export interface KanbanColumn {
  id: string
  title: string
  color?: string
}

interface KanbanBoardProps<T> {
  columns: KanbanColumn[]
  items: T[]
  getId: (item: T) => string
  getColumnId: (item: T) => string
  renderCard: (item: T) => ReactNode
  renderColumnHeaderExtra?: (columnId: string, items: T[]) => ReactNode
  onMove: (itemId: string, columnId: string) => void
  emptyLabel?: string
}

export function KanbanBoard<T>({
  columns,
  items,
  getId,
  getColumnId,
  renderCard,
  renderColumnHeaderExtra,
  onMove,
  emptyLabel = 'Nenhum item',
}: KanbanBoardProps<T>) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return
    const itemId = String(active.id)
    const columnId = String(over.id)
    const item = items.find((i) => getId(i) === itemId)
    if (item && getColumnId(item) !== columnId) {
      onMove(itemId, columnId)
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex h-full gap-4 overflow-x-auto p-4">
        {columns.map((column) => {
          const columnItems = items.filter((item) => getColumnId(item) === column.id)
          return (
            <KanbanColumnView
              key={column.id}
              column={column}
              count={columnItems.length}
              headerExtra={renderColumnHeaderExtra?.(column.id, columnItems)}
            >
              {columnItems.length === 0 ? (
                <p className="px-2 py-6 text-center text-xs text-muted-foreground">{emptyLabel}</p>
              ) : (
                columnItems.map((item) => (
                  <KanbanCard key={getId(item)} id={getId(item)}>
                    {renderCard(item)}
                  </KanbanCard>
                ))
              )}
            </KanbanColumnView>
          )
        })}
      </div>
    </DndContext>
  )
}

function KanbanColumnView({
  column,
  count,
  headerExtra,
  children,
}: {
  column: KanbanColumn
  count: number
  headerExtra?: ReactNode
  children: ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-lg bg-muted/40">
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ backgroundColor: column.color ?? 'var(--primary)' }} />
          <span className="text-sm font-medium text-foreground">{column.title}</span>
          <span className="text-xs text-muted-foreground">{count}</span>
        </div>
        {headerExtra}
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'flex flex-1 flex-col gap-2 overflow-y-auto rounded-b-lg p-2 pt-0 transition-colors',
          isOver && 'bg-primary/5',
        )}
      >
        {children}
      </div>
    </div>
  )
}

function KanbanCard({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={
        transform
          ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 }
          : undefined
      }
      className={cn(
        'cursor-grab rounded-md border border-border bg-card p-3 shadow-sm active:cursor-grabbing',
        isDragging && 'opacity-60',
      )}
    >
      {children}
    </div>
  )
}
