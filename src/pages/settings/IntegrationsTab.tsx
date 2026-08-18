import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Copy, Plus, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCreateWebhook, useDeleteWebhook, useUpdateWebhook, useWebhooksQuery } from '@/features/settings/webhooksApi'
import {
  useCreateIncomingWebhook,
  useDeleteIncomingWebhook,
  useIncomingWebhooksQuery,
  useUpdateIncomingWebhook,
} from '@/features/settings/incomingWebhooksApi'
import type { WebhookEvent } from '@/types/database'

const EVENT_LABEL: Record<WebhookEvent, string> = {
  order_created: 'Pedido criado',
  order_stage_changed: 'Pedido muda de estágio',
  client_created: 'Cliente criado',
  activity_created: 'Atividade criada',
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
  toast.success('Copiado')
}

function OutgoingWebhooksSection() {
  const { data: webhooks = [] } = useWebhooksQuery()
  const createWebhook = useCreateWebhook()
  const updateWebhook = useUpdateWebhook()
  const deleteWebhook = useDeleteWebhook()
  const [url, setUrl] = useState('')
  const [event, setEvent] = useState<WebhookEvent>('order_created')

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await createWebhook.mutateAsync({ url: url.trim(), event })
      toast.success('Webhook criado')
      setUrl('')
    } catch (error) {
      toast.error('Não foi possível criar o webhook', { description: error instanceof Error ? error.message : undefined })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Webhooks de saída</CardTitle>
        <p className="text-xs text-muted-foreground">
          O Jotapedi envia um POST para a URL configurada quando o evento escolhido acontecer.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form onSubmit={handleCreate} className="flex flex-wrap gap-2">
          <Input
            className="min-w-56 flex-1"
            required
            type="url"
            placeholder="https://seu-endpoint.com/webhook"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <Select
            value={event}
            onValueChange={(value) => setEvent((value as WebhookEvent) ?? 'order_created')}
            items={Object.entries(EVENT_LABEL).map(([value, label]) => ({ value, label }))}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(EVENT_LABEL).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" disabled={createWebhook.isPending}>
            <Plus className="size-4" />
            Adicionar
          </Button>
        </form>

        <div className="flex flex-col gap-2">
          {webhooks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum webhook de saída configurado ainda.</p>
          ) : (
            webhooks.map((webhook) => (
              <div key={webhook.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{webhook.url}</p>
                  <Badge variant="secondary">{EVENT_LABEL[webhook.event]}</Badge>
                </div>
                <Switch
                  checked={webhook.active}
                  onCheckedChange={(checked) => updateWebhook.mutate({ id: webhook.id, active: checked })}
                />
                <Button size="icon-sm" variant="ghost" onClick={() => deleteWebhook.mutate(webhook.id)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function IncomingWebhooksSection() {
  const { data: webhooks = [] } = useIncomingWebhooksQuery()
  const createWebhook = useCreateIncomingWebhook()
  const updateWebhook = useUpdateIncomingWebhook()
  const deleteWebhook = useDeleteIncomingWebhook()
  const [name, setName] = useState('')

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await createWebhook.mutateAsync(name.trim())
      toast.success('Endpoint criado')
      setName('')
    } catch (error) {
      toast.error('Não foi possível criar', { description: error instanceof Error ? error.message : undefined })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Webhooks de entrada</CardTitle>
        <p className="text-xs text-muted-foreground">
          Crie um endpoint e use a URL gerada para que sistemas externos (formulários, landing pages, outras
          plataformas) cadastrem clientes automaticamente no Jotapedi.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form onSubmit={handleCreate} className="flex gap-2">
          <Input
            className="flex-1"
            required
            placeholder="Nome do endpoint (ex: Formulário do site)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button type="submit" disabled={createWebhook.isPending}>
            <Plus className="size-4" />
            Criar endpoint
          </Button>
        </form>

        <div className="flex flex-col gap-2">
          {webhooks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum webhook de entrada criado ainda.</p>
          ) : (
            webhooks.map((webhook) => {
              const endpointUrl = `${SUPABASE_URL}/functions/v1/receive-webhook/${webhook.token}`
              return (
                <div key={webhook.id} className="flex flex-col gap-2 rounded-lg border border-border px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{webhook.name}</p>
                      <Badge variant="secondary">Recurso: Cliente</Badge>
                    </div>
                    <Switch
                      checked={webhook.active}
                      onCheckedChange={(checked) => updateWebhook.mutate({ id: webhook.id, active: checked })}
                    />
                    <Button size="icon-sm" variant="ghost" onClick={() => deleteWebhook.mutate(webhook.id)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 rounded-md bg-muted px-2 py-1.5">
                    <code className="flex-1 truncate text-xs text-muted-foreground">{endpointUrl}</code>
                    <Button size="icon-sm" variant="ghost" onClick={() => copyToClipboard(endpointUrl)}>
                      <Copy className="size-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function DocsSection() {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Webhooks de saída — payload</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p className="text-muted-foreground">
            Toda chamada é um <code className="rounded bg-muted px-1">POST</code> com{' '}
            <code className="rounded bg-muted px-1">Content-Type: application/json</code> no formato:
          </p>
          <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs">
{`{
  "event": "order_created",
  "data": {
    "id": "uuid-do-pedido",
    "client_id": "uuid-do-cliente",
    "total": 493.62
  }
}`}
          </pre>
          <p className="text-muted-foreground">Eventos disponíveis: order_created, order_stage_changed, client_created, activity_created.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Webhooks de entrada — como chamar</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p className="text-muted-foreground">
            Envie um <code className="rounded bg-muted px-1">POST</code> para a URL do endpoint (aba "Entrada") com o
            corpo em JSON. Hoje só o recurso Cliente está disponível:
          </p>
          <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs">
{`curl -X POST "<url-do-endpoint>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Maria Souza",
    "email": "maria@exemplo.com",
    "phone": "(11) 99999-0000",
    "company": "Maria Confecções"
  }'`}
          </pre>
          <p className="text-muted-foreground">
            Só <code className="rounded bg-muted px-1">name</code> é obrigatório. O cliente entra automaticamente no
            estágio "Novo lead".
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export function IntegrationsTab() {
  return (
    <Tabs defaultValue="saida" className="max-w-2xl">
      <TabsList>
        <TabsTrigger value="saida">Saída</TabsTrigger>
        <TabsTrigger value="entrada">Entrada</TabsTrigger>
        <TabsTrigger value="docs">Documentação</TabsTrigger>
      </TabsList>
      <TabsContent value="saida" className="mt-4">
        <OutgoingWebhooksSection />
      </TabsContent>
      <TabsContent value="entrada" className="mt-4">
        <IncomingWebhooksSection />
      </TabsContent>
      <TabsContent value="docs" className="mt-4">
        <DocsSection />
      </TabsContent>
    </Tabs>
  )
}
