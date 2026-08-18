import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useWorkspace } from '@/providers/WorkspaceProvider'
import { useUpdateWorkspacePreferences } from '@/features/settings/workspaceApi'

const CURRENCIES = [
  { value: 'BRL', label: 'Real (BRL)' },
  { value: 'USD', label: 'Dólar (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' },
]

const TIMEZONES = [
  { value: 'America/Sao_Paulo', label: 'São Paulo (GMT-3)' },
  { value: 'America/Manaus', label: 'Manaus (GMT-4)' },
  { value: 'America/Rio_Branco', label: 'Rio Branco (GMT-5)' },
  { value: 'America/New_York', label: 'Nova York (GMT-5)' },
  { value: 'Europe/Lisbon', label: 'Lisboa (GMT+0)' },
]

const DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: '31/12/2026' },
  { value: 'MM/DD/YYYY', label: '12/31/2026' },
  { value: 'YYYY-MM-DD', label: '2026-12-31' },
]

export function PreferencesTab() {
  const { activeWorkspace } = useWorkspace()
  const [currency, setCurrency] = useState('BRL')
  const [timezone, setTimezone] = useState('America/Sao_Paulo')
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY')
  const updatePreferences = useUpdateWorkspacePreferences()

  useEffect(() => {
    if (activeWorkspace) {
      setCurrency(activeWorkspace.currency)
      setTimezone(activeWorkspace.timezone)
      setDateFormat(activeWorkspace.date_format)
    }
  }, [activeWorkspace])

  const handleSave = async () => {
    try {
      await updatePreferences.mutateAsync({ currency, timezone, date_format: dateFormat })
      toast.success('Preferências salvas')
    } catch (error) {
      toast.error('Não foi possível salvar', { description: error instanceof Error ? error.message : undefined })
    }
  }

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle className="text-sm">Preferências do workspace</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Moeda</Label>
          <Select
            value={currency}
            onValueChange={(value) => setCurrency(value ?? 'BRL')}
            items={CURRENCIES.map((c) => ({ value: c.value, label: c.label }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Fuso horário</Label>
          <Select
            value={timezone}
            onValueChange={(value) => setTimezone(value ?? 'America/Sao_Paulo')}
            items={TIMEZONES.map((t) => ({ value: t.value, label: t.label }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Formato de data</Label>
          <Select
            value={dateFormat}
            onValueChange={(value) => setDateFormat(value ?? 'DD/MM/YYYY')}
            items={DATE_FORMATS.map((d) => ({ value: d.value, label: d.label }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_FORMATS.map((d) => (
                <SelectItem key={d.value} value={d.value}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button className="self-start" onClick={handleSave} disabled={updatePreferences.isPending}>
          Salvar preferências
        </Button>
      </CardContent>
    </Card>
  )
}
