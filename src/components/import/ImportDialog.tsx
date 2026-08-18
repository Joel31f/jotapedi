import { useState } from 'react'
import { toast } from 'sonner'
import { Download, Upload } from 'lucide-react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  buildMappedRows,
  downloadCsvTemplate,
  guessColumnMapping,
  parseSpreadsheetFile,
  type MappingTarget,
} from '@/lib/spreadsheet'

type Step = 'select' | 'map' | 'preview'

export function ImportDialog({
  open,
  onOpenChange,
  title,
  templateFilename,
  targets,
  onImport,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  templateFilename: string
  targets: MappingTarget[]
  onImport: (rows: Record<string, string>[]) => Promise<number>
}) {
  const [step, setStep] = useState<Step>('select')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<Record<string, string | null>>({})
  const [importing, setImporting] = useState(false)

  const reset = () => {
    setStep('select')
    setHeaders([])
    setRows([])
    setMapping({})
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const handleFile = async (file: File) => {
    try {
      const parsed = await parseSpreadsheetFile(file)
      if (parsed.rows.length === 0) {
        toast.error('Arquivo vazio ou sem linhas de dados.')
        return
      }
      setHeaders(parsed.headers)
      setRows(parsed.rows)
      setMapping(guessColumnMapping(parsed.headers, targets))
      setStep('map')
    } catch {
      toast.error('Não foi possível ler o arquivo', { description: 'Use um arquivo .csv ou .xlsx válido.' })
    }
  }

  const missingRequired = targets.filter((t) => t.required && !mapping[t.key])

  const handleImport = async () => {
    setImporting(true)
    try {
      const mappedRows = buildMappedRows(rows, headers, mapping)
      const count = await onImport(mappedRows)
      toast.success(`${count} registro(s) importado(s) com sucesso`)
      handleOpenChange(false)
    } catch (error) {
      toast.error('Erro ao importar', { description: error instanceof Error ? error.message : undefined })
    } finally {
      setImporting(false)
    }
  }

  const previewRows = buildMappedRows(rows.slice(0, 5), headers, mapping)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Importe um arquivo .csv ou .xlsx e associe as colunas aos campos do sistema.</DialogDescription>
        </DialogHeader>

        {step === 'select' && (
          <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border py-10">
            <Upload className="size-8 text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm text-foreground">Selecione um arquivo .csv ou .xlsx</p>
              <p className="text-xs text-muted-foreground">A primeira linha deve conter os nomes das colunas.</p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => downloadCsvTemplate(targets.map((t) => t.label), templateFilename)}>
                <Download className="size-4" />
                Baixar modelo
              </Button>
              <Button type="button" onClick={() => document.getElementById('import-file-input')?.click()}>
                Escolher arquivo
              </Button>
            </div>
            <input
              id="import-file-input"
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
                e.target.value = ''
              }}
            />
          </div>
        )}

        {step === 'map' && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              {rows.length} linha(s) encontrada(s). Associe cada campo à coluna correspondente no arquivo.
            </p>
            <div className="grid max-h-72 grid-cols-2 gap-3 overflow-y-auto pr-1">
              {targets.map((target) => (
                <div key={target.key} className="flex flex-col gap-1.5">
                  <Label>
                    {target.label}
                    {target.required ? <span className="text-destructive"> *</span> : null}
                  </Label>
                  <Select
                    value={mapping[target.key] ?? '__none__'}
                    onValueChange={(value) =>
                      setMapping((prev) => ({ ...prev, [target.key]: value === '__none__' ? null : value }))
                    }
                    items={[{ value: '__none__', label: 'Não importar' }, ...headers.map((h) => ({ value: h, label: h }))]}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Não importar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Não importar</SelectItem>
                      {headers.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStep('select')}>
                Voltar
              </Button>
              <Button type="button" disabled={missingRequired.length > 0} onClick={() => setStep('preview')}>
                Continuar
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'preview' && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Confira uma amostra dos dados que serão importados ({rows.length} linha(s) no total).
            </p>
            <div className="max-h-72 overflow-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {targets
                      .filter((t) => mapping[t.key])
                      .map((t) => (
                        <TableHead key={t.key}>{t.label}</TableHead>
                      ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((row, idx) => (
                    <TableRow key={idx}>
                      {targets
                        .filter((t) => mapping[t.key])
                        .map((t) => (
                          <TableCell key={t.key}>{row[t.key]}</TableCell>
                        ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStep('map')}>
                Voltar
              </Button>
              <Button type="button" disabled={importing} onClick={handleImport}>
                {importing ? 'Importando…' : `Importar ${rows.length} registro(s)`}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
