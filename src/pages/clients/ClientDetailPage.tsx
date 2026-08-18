import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Building2, Check, ListChecks, Mail, MapPin, Pencil, Phone, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LEAD_STAGE_MAP } from '@/config/leadStages'
import { ACTIVITY_TYPE_MAP } from '@/config/activityTypes'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format'
import { useClientOrderStatsQuery, useClientQuery, useDeleteClient } from '@/features/clients/api'
import { ClientFormDialog } from '@/features/clients/ClientFormDialog'
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog'
import {
  useActivitiesForClientQuery,
  useToggleActivityStatus,
  type ActivityWithRelations,
} from '@/features/activities/api'
import { ActivityFormDialog } from '@/features/activities/ActivityFormDialog'

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: client, isLoading } = useClientQuery(id)
  const { data: orderStats } = useClientOrderStatsQuery(id)
  const deleteClient = useDeleteClient()
  const { data: clientActivities = [] } = useActivitiesForClientQuery(id)
  const toggleActivityStatus = useToggleActivityStatus()
  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [activityFormOpen, setActivityFormOpen] = useState(false)
  const [editingActivity, setEditingActivity] = useState<ActivityWithRelations | null>(null)

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Carregando…</div>
  }

  if (!client) {
    return <div className="p-6 text-sm text-muted-foreground">Cliente não encontrado.</div>
  }

  const stage = LEAD_STAGE_MAP[client.lead_stage]
  const address = [
    [client.address_street, client.address_number].filter(Boolean).join(', '),
    client.address_complement,
    client.address_neighborhood,
    client.address_city,
    client.address_state,
  ]
    .filter(Boolean)
    .join(', ')

  const handleDelete = async () => {
    try {
      await deleteClient.mutateAsync(client.id)
      toast.success('Cliente excluído')
      navigate('/clientes')
    } catch (error) {
      toast.error('Não foi possível excluir', { description: error instanceof Error ? error.message : undefined })
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <Button variant="ghost" size="sm" className="mb-3" onClick={() => navigate('/clientes')}>
        <ArrowLeft className="size-4" />
        Voltar
      </Button>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-foreground">{client.name}</h1>
            <Badge style={{ backgroundColor: `${stage.color}20`, color: stage.color }}>{stage.title}</Badge>
          </div>
          {client.company ? (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Building2 className="size-3.5" />
              {client.company}
            </p>
          ) : null}
          {client.tags.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {client.tags.map((tag) => (
                <Badge key={tag.id} variant="secondary">
                  {tag.name}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setFormOpen(true)}>
            <Pencil className="size-4" />
            Editar
          </Button>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="size-4" />
            Excluir
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Contato</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {client.emails.map((email) => (
              <p key={email} className="flex items-center gap-2 text-foreground">
                <Mail className="size-3.5 text-muted-foreground" /> {email}
              </p>
            ))}
            {client.phones.map((phone) => (
              <p key={phone} className="flex items-center gap-2 text-foreground">
                <Phone className="size-3.5 text-muted-foreground" /> {phone}
              </p>
            ))}
            {client.whatsapp ? (
              <p className="flex items-center gap-2 text-foreground">
                <Phone className="size-3.5 text-muted-foreground" /> {client.whatsapp} (WhatsApp)
              </p>
            ) : null}
            {client.document ? <p className="text-muted-foreground">Doc: {client.document}</p> : null}
            {client.state_registration ? <p className="text-muted-foreground">IE: {client.state_registration}</p> : null}
            {client.role_title ? <p className="text-muted-foreground">Cargo: {client.role_title}</p> : null}
            {address ? (
              <p className="flex items-start gap-2 text-foreground">
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" /> {address}
              </p>
            ) : null}
            {client.emails.length === 0 && client.phones.length === 0 && !client.whatsapp && !address ? (
              <p className="text-muted-foreground">Nenhum dado de contato cadastrado.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5 text-sm">
              <ShoppingCart className="size-4" /> Histórico de pedidos
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <p className="text-foreground">
              Total comprado: <strong>{formatCurrency(orderStats?.totalPurchased ?? 0)}</strong>
            </p>
            <p className="text-muted-foreground">
              {orderStats?.ordersCount ?? 0} pedido(s) — último em{' '}
              {orderStats?.lastOrderAt ? formatDate(orderStats.lastOrderAt) : '—'}
            </p>
          </CardContent>
        </Card>

        {client.notes ? (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm">Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-foreground">{client.notes}</p>
            </CardContent>
          </Card>
        ) : null}

        <Card className="md:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-1.5 text-sm">
              <ListChecks className="size-4" /> Atividades
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditingActivity(null)
                setActivityFormOpen(true)
              }}
            >
              <Plus className="size-3.5" />
              Nova atividade
            </Button>
          </CardHeader>
          <CardContent>
            {clientActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma atividade vinculada a este cliente ainda.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {clientActivities.map((activity) => {
                  const config = ACTIVITY_TYPE_MAP[activity.type]
                  const Icon = config.icon
                  return (
                    <div key={activity.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
                      <button
                        type="button"
                        onClick={() =>
                          toggleActivityStatus.mutate({
                            id: activity.id,
                            status: activity.status === 'completed' ? 'pending' : 'completed',
                          })
                        }
                        className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${
                          activity.status === 'completed' ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40'
                        }`}
                      >
                        {activity.status === 'completed' ? <Check className="size-3" /> : null}
                      </button>
                      <span
                        className="flex size-7 shrink-0 items-center justify-center rounded-md"
                        style={{ backgroundColor: `${config.color}20`, color: config.color }}
                      >
                        <Icon className="size-3.5" />
                      </span>
                      <button
                        className="flex-1 text-left"
                        onClick={() => {
                          setEditingActivity(activity as unknown as ActivityWithRelations)
                          setActivityFormOpen(true)
                        }}
                      >
                        <p className={`text-sm text-foreground ${activity.status === 'completed' ? 'line-through opacity-60' : ''}`}>
                          {activity.title}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(activity.due_at)}</p>
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ClientFormDialog open={formOpen} onOpenChange={setFormOpen} client={client} />
      <ActivityFormDialog
        open={activityFormOpen}
        onOpenChange={setActivityFormOpen}
        activity={editingActivity}
        defaultClient={{ id: client.id, label: client.name }}
      />
      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir cliente"
        description={`Tem certeza que deseja excluir "${client.name}"? Essa ação não pode ser desfeita.`}
        onConfirm={handleDelete}
        loading={deleteClient.isPending}
      />
    </div>
  )
}
