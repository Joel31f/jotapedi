import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ChevronDown, Plus } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { cn } from '@/lib/utils'

export interface ComboboxOption {
  id: string
  label: string
  sublabel?: string | null
}

export function SearchCombobox({
  selectedLabel,
  onSelect,
  search,
  placeholder,
  emptyLabel = 'Nenhum resultado.',
  className,
  onCreate,
  createLabel,
}: {
  selectedLabel: string | null
  onSelect: (option: ComboboxOption) => void
  search: (query: string) => Promise<ComboboxOption[]>
  placeholder: string
  emptyLabel?: string
  className?: string
  onCreate?: (query: string) => Promise<ComboboxOption>
  createLabel?: (query: string) => string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 250)
  const [options, setOptions] = useState<ComboboxOption[]>([])
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    search(debouncedQuery).then((results) => {
      if (!cancelled) setOptions(results)
    })
    return () => {
      cancelled = true
    }
  }, [debouncedQuery, open, search])

  const handleCreate = async () => {
    if (!onCreate || !query.trim() || creating) return
    setCreating(true)
    try {
      const option = await onCreate(query.trim())
      onSelect(option)
      setOpen(false)
      setQuery('')
    } catch (error) {
      toast.error('Não foi possível criar', { description: error instanceof Error ? error.message : undefined })
    } finally {
      setCreating(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          'flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 text-left text-sm',
          className,
        )}
      >
        <span className={cn('truncate', selectedLabel ? 'text-foreground' : 'text-muted-foreground')}>
          {selectedLabel ?? placeholder}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder={placeholder} value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.id}
                  onSelect={() => {
                    onSelect(option)
                    setOpen(false)
                    setQuery('')
                  }}
                >
                  <div className="flex flex-col">
                    <span>{option.label}</span>
                    {option.sublabel ? <span className="text-xs text-muted-foreground">{option.sublabel}</span> : null}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            {onCreate && query.trim() ? (
              <CommandGroup>
                <CommandItem value={`__create__${query.trim()}`} disabled={creating} onSelect={handleCreate}>
                  <Plus className="size-3.5" />
                  {creating ? 'Criando…' : (createLabel ?? ((q: string) => `Criar "${q}"`))(query.trim())}
                </CommandItem>
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
