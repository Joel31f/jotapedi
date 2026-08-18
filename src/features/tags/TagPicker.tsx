import { useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Badge } from '@/components/ui/badge'
import { useCreateTag, useTagsQuery } from '@/features/tags/api'

export function TagPicker({
  selectedTagIds,
  onChange,
}: {
  selectedTagIds: string[]
  onChange: (ids: string[]) => void
}) {
  const { data: tags = [] } = useTagsQuery()
  const createTag = useCreateTag()
  const [query, setQuery] = useState('')

  const toggle = (id: string) => {
    onChange(selectedTagIds.includes(id) ? selectedTagIds.filter((t) => t !== id) : [...selectedTagIds, id])
  }

  const handleCreate = async () => {
    const name = query.trim()
    if (!name) return
    const tag = await createTag.mutateAsync(name)
    onChange([...selectedTagIds, tag.id])
    setQuery('')
  }

  const selectedTags = tags.filter((t) => selectedTagIds.includes(t.id))
  const exactMatch = tags.some((t) => t.name.toLowerCase() === query.trim().toLowerCase())

  return (
    <Popover>
      <PopoverTrigger className="flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-left text-sm">
        {selectedTags.length === 0 ? (
          <span className="text-muted-foreground">Selecionar tags…</span>
        ) : (
          selectedTags.map((tag) => (
            <Badge
              key={tag.id}
              style={{ backgroundColor: `${tag.color}20`, color: tag.color, borderColor: `${tag.color}40` }}
            >
              {tag.name}
            </Badge>
          ))
        )}
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar ou criar tag…" value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>
              {query.trim() ? (
                <button
                  type="button"
                  onClick={handleCreate}
                  className="flex w-full items-center gap-2 px-2 py-1.5 text-sm text-primary hover:underline"
                >
                  <Plus className="size-3.5" /> Criar tag "{query.trim()}"
                </button>
              ) : (
                'Nenhuma tag encontrada.'
              )}
            </CommandEmpty>
            <CommandGroup>
              {tags.map((tag) => (
                <CommandItem key={tag.id} value={tag.name} onSelect={() => toggle(tag.id)}>
                  <span className="size-2 rounded-full" style={{ backgroundColor: tag.color }} />
                  {tag.name}
                  {selectedTagIds.includes(tag.id) ? <Check className="ml-auto size-3.5" /> : null}
                </CommandItem>
              ))}
              {query.trim() && !exactMatch ? (
                <CommandItem value={`create-${query}`} onSelect={handleCreate}>
                  <Plus className="size-3.5" /> Criar tag "{query.trim()}"
                </CommandItem>
              ) : null}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
