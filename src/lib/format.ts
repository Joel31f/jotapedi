export function formatCurrency(value: number, currency = 'BRL') {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value)
}

export function formatDate(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value
  return new Intl.DateTimeFormat('pt-BR').format(date)
}

export function formatDateTime(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

export function initialsOf(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}
