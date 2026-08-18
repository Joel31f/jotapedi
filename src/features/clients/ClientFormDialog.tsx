import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Plus, X } from 'lucide-react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TagPicker } from '@/features/tags/TagPicker'
import { LEAD_STAGES } from '@/config/leadStages'
import { useCreateClient, useUpdateClient, type ClientWithTags } from '@/features/clients/api'
import type { LeadStage } from '@/types/database'

interface ClientFormValues {
  name: string
  company: string
  document: string
  state_registration: string
  emails: string[]
  phones: string[]
  whatsapp: string
  role_title: string
  address_street: string
  address_number: string
  address_complement: string
  address_neighborhood: string
  address_city: string
  address_state: string
  address_zip: string
  lead_stage: LeadStage
  notes: string
}

const EMPTY_FORM: ClientFormValues = {
  name: '',
  company: '',
  document: '',
  state_registration: '',
  emails: [''],
  phones: [''],
  whatsapp: '',
  role_title: '',
  address_street: '',
  address_number: '',
  address_complement: '',
  address_neighborhood: '',
  address_city: '',
  address_state: '',
  address_zip: '',
  lead_stage: 'novo_lead',
  notes: '',
}

function toFormValues(client: ClientWithTags): ClientFormValues {
  return {
    name: client.name,
    company: client.company ?? '',
    document: client.document ?? '',
    state_registration: client.state_registration ?? '',
    emails: client.emails.length > 0 ? client.emails : [''],
    phones: client.phones.length > 0 ? client.phones : [''],
    whatsapp: client.whatsapp ?? '',
    role_title: client.role_title ?? '',
    address_street: client.address_street ?? '',
    address_number: client.address_number ?? '',
    address_complement: client.address_complement ?? '',
    address_neighborhood: client.address_neighborhood ?? '',
    address_city: client.address_city ?? '',
    address_state: client.address_state ?? '',
    address_zip: client.address_zip ?? '',
    lead_stage: client.lead_stage,
    notes: client.notes ?? '',
  }
}

function MultiValueField({
  label,
  values,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  values: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  type?: string
}) {
  const list = values.length > 0 ? values : ['']

  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <div className="flex flex-col gap-2">
        {list.map((value, idx) => (
          <div key={idx} className="flex gap-2">
            <Input
              type={type}
              placeholder={placeholder}
              value={value}
              onChange={(e) => onChange(list.map((v, i) => (i === idx ? e.target.value : v)))}
            />
            {list.length > 1 ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  const next = list.filter((_, i) => i !== idx)
                  onChange(next.length > 0 ? next : [''])
                }}
              >
                <X className="size-3.5" />
              </Button>
            ) : null}
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => onChange([...list, ''])}>
          <Plus className="size-3.5" />
          Adicionar
        </Button>
      </div>
    </div>
  )
}

export function ClientFormDialog({
  open,
  onOpenChange,
  client,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  client: ClientWithTags | null
}) {
  const [form, setForm] = useState<ClientFormValues>(EMPTY_FORM)
  const [tagIds, setTagIds] = useState<string[]>([])
  const [cepStatus, setCepStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const createClient = useCreateClient()
  const updateClient = useUpdateClient()
  const saving = createClient.isPending || updateClient.isPending

  useEffect(() => {
    if (open) {
      setForm(client ? toFormValues(client) : EMPTY_FORM)
      setTagIds(client ? client.tags.map((t) => t.id) : [])
    }
  }, [open, client])

  const setField = <K extends keyof ClientFormValues>(key: K, value: ClientFormValues[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleCepChange = async (rawValue: string) => {
    setField('address_zip', rawValue)
    const digits = rawValue.replace(/\D/g, '')
    if (digits.length !== 8) {
      setCepStatus('idle')
      return
    }
    setCepStatus('loading')
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const data = await res.json()
      if (data.erro) {
        setCepStatus('error')
        return
      }
      setForm((prev) => ({
        ...prev,
        address_street: data.logradouro || prev.address_street,
        address_neighborhood: data.bairro || prev.address_neighborhood,
        address_city: data.localidade || prev.address_city,
        address_state: data.uf || prev.address_state,
      }))
      setCepStatus('idle')
    } catch {
      setCepStatus('error')
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const payload = {
      name: form.name.trim(),
      company: form.company.trim() || null,
      document: form.document.trim() || null,
      state_registration: form.state_registration.trim() || null,
      emails: form.emails.map((v) => v.trim()).filter(Boolean),
      phones: form.phones.map((v) => v.trim()).filter(Boolean),
      whatsapp: form.whatsapp.trim() || null,
      role_title: form.role_title.trim() || null,
      address_street: form.address_street.trim() || null,
      address_number: form.address_number.trim() || null,
      address_complement: form.address_complement.trim() || null,
      address_neighborhood: form.address_neighborhood.trim() || null,
      address_city: form.address_city.trim() || null,
      address_state: form.address_state.trim() || null,
      address_zip: form.address_zip.trim() || null,
      lead_stage: form.lead_stage,
      notes: form.notes.trim() || null,
    }

    try {
      if (client) {
        await updateClient.mutateAsync({ id: client.id, payload, tagIds })
        toast.success('Cliente atualizado')
      } else {
        await createClient.mutateAsync({ payload, tagIds })
        toast.success('Cliente criado')
      }
      onOpenChange(false)
    } catch (error) {
      toast.error('Não foi possível salvar o cliente', {
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{client ? 'Editar cliente' : 'Novo cliente'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" required value={form.name} onChange={(e) => setField('name', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="company">Empresa</Label>
              <Input id="company" value={form.company} onChange={(e) => setField('company', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="document">CNPJ/CPF</Label>
              <Input id="document" value={form.document} onChange={(e) => setField('document', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="state_registration">Inscrição Estadual</Label>
              <Input
                id="state_registration"
                value={form.state_registration}
                onChange={(e) => setField('state_registration', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="role_title">Cargo</Label>
              <Input id="role_title" value={form.role_title} onChange={(e) => setField('role_title', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MultiValueField
              label="Email"
              type="email"
              values={form.emails}
              onChange={(values) => setField('emails', values)}
            />
            <MultiValueField label="Telefone" values={form.phones} onChange={(values) => setField('phones', values)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input id="whatsapp" value={form.whatsapp} onChange={(e) => setField('whatsapp', e.target.value)} />
          </div>

          <div className="rounded-lg border border-border p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Endereço</p>
            <div className="mb-2 flex items-center gap-2">
              <Input
                className="w-36"
                placeholder="CEP"
                value={form.address_zip}
                onChange={(e) => handleCepChange(e.target.value)}
              />
              {cepStatus === 'loading' ? <p className="text-xs text-muted-foreground">Buscando endereço…</p> : null}
              {cepStatus === 'error' ? <p className="text-xs text-destructive">CEP não encontrado</p> : null}
            </div>
            <div className="grid grid-cols-4 gap-2">
              <Input
                className="col-span-3"
                placeholder="Rua"
                value={form.address_street}
                onChange={(e) => setField('address_street', e.target.value)}
              />
              <Input placeholder="Número" value={form.address_number} onChange={(e) => setField('address_number', e.target.value)} />
              <Input
                className="col-span-2"
                placeholder="Complemento"
                value={form.address_complement}
                onChange={(e) => setField('address_complement', e.target.value)}
              />
              <Input
                className="col-span-2"
                placeholder="Bairro"
                value={form.address_neighborhood}
                onChange={(e) => setField('address_neighborhood', e.target.value)}
              />
              <Input
                className="col-span-2"
                placeholder="Cidade"
                value={form.address_city}
                onChange={(e) => setField('address_city', e.target.value)}
              />
              <Input placeholder="UF" value={form.address_state} onChange={(e) => setField('address_state', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Estágio do lead</Label>
              <Select
                value={form.lead_stage}
                onValueChange={(value) => setField('lead_stage', value as LeadStage)}
                items={LEAD_STAGES.map((s) => ({ value: s.id, label: s.title }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_STAGES.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Tags</Label>
              <TagPicker selectedTagIds={tagIds} onChange={setTagIds} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" rows={3} value={form.notes} onChange={(e) => setField('notes', e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
