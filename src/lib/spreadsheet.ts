import * as XLSX from 'xlsx'

export interface ParsedSpreadsheet {
  headers: string[]
  rows: string[][]
}

export async function parseSpreadsheetFile(file: File): Promise<ParsedSpreadsheet> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false }) as string[][]
  const [headerRow, ...dataRows] = rows

  return {
    headers: (headerRow ?? []).map((h) => String(h ?? '').trim()),
    rows: dataRows.filter((row) => row.some((cell) => String(cell ?? '').trim() !== '')),
  }
}

export function downloadCsvTemplate(headers: string[], filename: string) {
  const csv = `${headers.join(',')}\n`
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export interface MappingTarget {
  key: string
  label: string
  required?: boolean
  aliases: string[]
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function guessColumnMapping(headers: string[], targets: MappingTarget[]) {
  const normalizedHeaders = headers.map(normalize)
  const mapping: Record<string, string | null> = {}

  for (const target of targets) {
    const aliasSet = [target.key, target.label, ...target.aliases].map(normalize)
    const idx = normalizedHeaders.findIndex((h) => aliasSet.includes(h))
    mapping[target.key] = idx >= 0 ? headers[idx] : null
  }

  return mapping
}

export function buildMappedRows(
  rows: string[][],
  headers: string[],
  mapping: Record<string, string | null>,
): Record<string, string>[] {
  return rows.map((row) => {
    const record: Record<string, string> = {}
    for (const [key, header] of Object.entries(mapping)) {
      if (!header) continue
      const idx = headers.indexOf(header)
      record[key] = idx >= 0 ? String(row[idx] ?? '').trim() : ''
    }
    return record
  })
}
