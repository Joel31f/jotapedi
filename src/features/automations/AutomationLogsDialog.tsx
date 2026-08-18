import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/format'
import { useAutomationLogsQuery, type Automation } from '@/features/automations/api'

export function AutomationLogsDialog({
  open,
  onOpenChange,
  automation,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  automation: Automation | null
}) {
  const { data: logs = [], isLoading } = useAutomationLogsQuery(automation?.id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico — {automation?.name}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Essa automação ainda não foi executada.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                <div>
                  <p className="text-foreground">{formatDateTime(log.triggered_at)}</p>
                  <p className="text-xs text-muted-foreground">
                    {log.related_entity_type ?? '—'} {log.status === 'error' ? `· ${(log.details as { error?: string })?.error ?? ''}` : ''}
                  </p>
                </div>
                <Badge variant={log.status === 'success' ? 'secondary' : 'destructive'}>
                  {log.status === 'success' ? 'Sucesso' : 'Erro'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
