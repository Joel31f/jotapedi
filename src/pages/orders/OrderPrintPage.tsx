import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Printer } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format'
import { useWorkspace } from '@/providers/WorkspaceProvider'

function usePrintableOrder(id: string | undefined) {
  return useQuery({
    queryKey: ['order-print', id],
    enabled: !!id,
    queryFn: async () => {
      const { data: order, error } = await supabase
        .from('orders')
        .select(
          '*, clients(name, company, document, state_registration, emails, phones, whatsapp, address_street, address_number, address_neighborhood, address_city, address_state), pipeline_stages(name), brands(name, logo_url)',
        )
        .eq('id', id!)
        .single()
      if (error) throw error

      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('*, products(sku)')
        .eq('order_id', id!)
        .order('position', { ascending: true })
      if (itemsError) throw itemsError

      return { ...(order as any), items: items ?? [] }
    },
  })
}

export function OrderPrintPage() {
  const { id } = useParams<{ id: string }>()
  const { activeWorkspace } = useWorkspace()
  const { data: order, isLoading, isError, error } = usePrintableOrder(id)

  useEffect(() => {
    if (order) {
      const timeout = setTimeout(() => window.print(), 300)
      return () => clearTimeout(timeout)
    }
  }, [order])

  if (isError) {
    return (
      <div className="p-8 text-sm text-red-600">
        Não foi possível carregar o pedido: {error instanceof Error ? error.message : 'erro desconhecido'}
      </div>
    )
  }

  if (isLoading || !order) {
    return <div className="p-8 text-sm text-neutral-500">Carregando…</div>
  }

  const brand = order.brands
  const client = order.clients
  const address = client
    ? [client.address_street, client.address_number, client.address_neighborhood, client.address_city, client.address_state]
        .filter(Boolean)
        .join(', ')
    : ''
  const itemsGrossSubtotal = order.items.reduce((sum: number, item: any) => sum + item.quantity * item.unit_price, 0)
  const itemDiscountsTotal = itemsGrossSubtotal - order.subtotal

  return (
    <div className="min-h-svh bg-white text-neutral-900">
      <div className="mx-auto max-w-3xl p-8">
        <div className="mb-6 flex items-center justify-between print:hidden">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            <Printer className="size-4" />
            Imprimir / Salvar PDF
          </button>
        </div>

        <div className="mb-8 flex items-start justify-between border-b border-neutral-200 pb-6">
          <div>
            {brand?.logo_url ? (
              <img src={brand.logo_url} alt={brand.name} className="mb-1 h-24 w-auto object-contain" />
            ) : brand ? (
              <h1 className="text-xl font-semibold">{brand.name}</h1>
            ) : (
              <h1 className="text-xl font-semibold">{activeWorkspace?.name}</h1>
            )}
            <p className="text-sm text-neutral-500">Pedido #{order.id.slice(0, 8).toUpperCase()}</p>
          </div>
          <div className="text-right text-sm text-neutral-500">
            <p>Data: {formatDate(order.created_at)}</p>
            <p>Estágio: {order.pipeline_stages?.name ?? '—'}</p>
          </div>
        </div>

        <div className="mb-6">
          <p className="mb-1 text-xs font-medium uppercase text-neutral-400">Cliente</p>
          <p className="text-base font-medium">{client?.name}</p>
          {brand ? (
            <p className="text-sm text-neutral-600">{brand.name}</p>
          ) : client?.company ? (
            <p className="text-sm text-neutral-600">{client.company}</p>
          ) : null}
          {client?.document ? <p className="text-sm text-neutral-600">Doc: {client.document}</p> : null}
          {client?.state_registration ? <p className="text-sm text-neutral-600">IE: {client.state_registration}</p> : null}
          <p className="text-sm text-neutral-600">
            {[client?.emails?.[0], client?.phones?.[0] ?? client?.whatsapp].filter(Boolean).join(' · ')}
          </p>
          {address ? <p className="text-sm text-neutral-600">{address}</p> : null}
        </div>

        <table className="mb-6 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-300 text-left text-xs uppercase text-neutral-400">
              <th className="py-2 pr-4">Código</th>
              <th className="py-2 pr-4">Descrição</th>
              <th className="py-2 pr-4 text-right">Qtd.</th>
              <th className="py-2 pr-4 text-right">Preço unit.</th>
              <th className="py-2 pr-4 text-right">Desconto</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item: any) => {
              const itemDiscount = item.quantity * item.unit_price - item.total
              return (
                <tr key={item.id} className="border-b border-neutral-100">
                  <td className="py-2 pr-4 whitespace-nowrap text-neutral-500">{item.products?.sku ?? '—'}</td>
                  <td className="py-2 pr-4">{item.description}</td>
                  <td className="py-2 pr-4 text-right whitespace-nowrap">{item.quantity}</td>
                  <td className="py-2 pr-4 text-right whitespace-nowrap">{formatCurrency(item.unit_price)}</td>
                  <td className="py-2 pr-4 text-right whitespace-nowrap">
                    {itemDiscount > 0 ? `-${formatCurrency(itemDiscount)}` : '—'}
                  </td>
                  <td className="py-2 text-right whitespace-nowrap">{formatCurrency(item.total)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <div className="mb-6 flex justify-end">
          <div className="w-56 text-sm">
            <div className="flex justify-between py-1">
              <span className="text-neutral-500">Subtotal</span>
              <span>{formatCurrency(itemsGrossSubtotal)}</span>
            </div>
            {itemDiscountsTotal > 0 ? (
              <div className="flex justify-between py-1">
                <span className="text-neutral-500">Desconto nos itens</span>
                <span>-{formatCurrency(itemDiscountsTotal)}</span>
              </div>
            ) : null}
            <div className="flex justify-between py-1">
              <span className="text-neutral-500">Desconto global</span>
              <span>
                -{order.discount_type === 'percent' ? `${order.discount_value}%` : formatCurrency(order.discount_value)}
              </span>
            </div>
            {order.freight ? (
              <div className="flex justify-between py-1">
                <span className="text-neutral-500">Frete</span>
                <span>{formatCurrency(order.freight)}</span>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-neutral-300 py-2 text-base font-semibold">
              <span>Total</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>

        {order.notes ? (
          <div className="mb-6">
            <p className="mb-1 text-xs font-medium uppercase text-neutral-400">Observações</p>
            <p className="whitespace-pre-wrap text-sm text-neutral-700">{order.notes}</p>
          </div>
        ) : null}

        <p className="text-center text-xs text-neutral-400">Gerado em {formatDateTime(new Date().toISOString())}</p>
      </div>
    </div>
  )
}
