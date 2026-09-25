import { useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Printer } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDateOnly, formatDateTime, formatDateTimeFull } from '@/lib/format'
import { useWorkspace } from '@/providers/WorkspaceProvider'

function usePrintableOrder(id: string | undefined) {
  return useQuery({
    queryKey: ['order-print', id],
    enabled: !!id,
    queryFn: async () => {
      const { data: order, error } = await supabase
        .from('orders')
        .select(
          '*, clients(name, company, document, state_registration, emails, phones, whatsapp, address_street, address_number, address_neighborhood, address_city, address_state, address_zip), pipeline_stages(name), brands(name, logo_url)',
        )
        .eq('id', id!)
        .single()
      if (error) throw error

      let seller: { name: string | null; email: string } | null = null
      if ((order as any).assigned_to) {
        const { data } = await supabase
          .from('users')
          .select('name, email')
          .eq('id', (order as any).assigned_to)
          .single()
        seller = data
      }

      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('*, products(sku)')
        .eq('order_id', id!)
        .order('position', { ascending: true })
      if (itemsError) throw itemsError

      return { ...(order as any), items: items ?? [], seller }
    },
  })
}

export function OrderPrintPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const isProduction = searchParams.get('modo') === 'producao'
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
        .join(', ') + (client.address_zip ? ` — CEP ${client.address_zip}` : '')
    : ''
  const seller = order.seller ? [order.seller.name, order.seller.email].filter(Boolean).join(' - ') : ''
  const orderDetails = [
    { label: 'Contato', value: order.contact_name },
    { label: 'Transporte', value: order.shipping_method },
    { label: 'Condição de pagamento', value: order.payment_terms },
    { label: 'Previsão de entrega', value: order.delivery_date ? formatDateOnly(order.delivery_date) : null },
    { label: 'Vendedor', value: seller },
  ].filter((detail) => detail.value)
  const itemsGrossSubtotal = order.items.reduce((sum: number, item: any) => sum + item.quantity * item.unit_price, 0)
  const itemDiscountsTotal = itemsGrossSubtotal - order.subtotal

  return (
    <div className="min-h-svh bg-white text-neutral-900">
      <style>{`@page { size: A4; margin: 8mm; }`}</style>
      <div className="mx-auto max-w-4xl px-6 py-4 text-[12px] leading-snug print:max-w-none print:p-0">
        <div className="mb-3 flex items-center justify-between print:hidden">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            <Printer className="size-4" />
            Imprimir / Salvar PDF
          </button>
        </div>

        <div className="mb-2 flex items-center justify-between gap-4 border-b border-neutral-300 pb-2">
          <div className="flex items-center gap-3">
            {brand?.logo_url ? (
              <img src={brand.logo_url} alt={brand.name} className="h-12 w-auto object-contain" />
            ) : (
              <h1 className="text-base font-semibold">{brand?.name ?? activeWorkspace?.name}</h1>
            )}
            <p className="text-sm font-semibold text-neutral-700">Pedido #{order.id.slice(0, 8).toUpperCase()}</p>
          </div>
          <div className="text-right text-[11px] text-neutral-500">
            {isProduction ? <p className="font-semibold uppercase text-neutral-900">Via de produção</p> : null}
            <p>Emissão: {formatDateTimeFull(order.created_at)}</p>
            <p>Estágio: {order.pipeline_stages?.name ?? '—'}</p>
          </div>
        </div>

        <div className="mb-2 flex items-start justify-between gap-6">
          <div className="min-w-0 space-y-px">
            <p>
              <span className="mr-1 text-[10px] font-medium uppercase text-neutral-400">Cliente</span>
              <span className="text-[13px] font-semibold">{client?.name}</span>
              {brand?.name ?? client?.company ? (
                <span className="text-neutral-600"> · {brand?.name ?? client?.company}</span>
              ) : null}
            </p>
            {client?.document || client?.state_registration ? (
              <p className="text-neutral-600">
                {[
                  client?.document ? `Doc: ${client.document}` : null,
                  client?.state_registration ? `IE: ${client.state_registration}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            ) : null}
            {client?.emails?.[0] || client?.phones?.[0] || client?.whatsapp ? (
              <p className="text-neutral-600">
                {[client?.emails?.[0], client?.phones?.[0] ?? client?.whatsapp].filter(Boolean).join(' · ')}
              </p>
            ) : null}
            {address ? <p className="text-neutral-600">{address}</p> : null}
          </div>
          {order.purchase_order_number ? (
            <div className="shrink-0 text-right">
              <p className="text-[10px] font-medium uppercase text-neutral-400">Ordem de compra</p>
              <p className="text-[13px] font-semibold">{order.purchase_order_number}</p>
            </div>
          ) : null}
        </div>

        {orderDetails.length > 0 ? (
          <div className="mb-2 grid grid-cols-3 gap-x-4 gap-y-0.5 border-y border-neutral-300 py-1.5 text-[11px]">
            {orderDetails.map((detail) => (
              <p key={detail.label} className="text-neutral-700">
                <span className="text-[10px] font-medium uppercase text-neutral-400">{detail.label}: </span>
                {detail.value}
              </p>
            ))}
          </div>
        ) : null}

        <table className="mb-2 w-full border-collapse text-[11px]">
          <thead>
            <tr className="border-b border-neutral-400 text-left text-[10px] uppercase text-neutral-500">
              <th className="py-1 pr-3">Código</th>
              <th className="py-1 pr-3">Descrição</th>
              <th className={isProduction ? 'py-1 text-right' : 'py-1 pr-3 text-right'}>Qtd.</th>
              {isProduction ? null : (
                <>
                  <th className="py-1 pr-3 text-right">Unit.</th>
                  <th className="py-1 pr-3 text-right">Desc.</th>
                  <th className="py-1 pr-3 text-right">Unit. c/ desc.</th>
                  <th className="py-1 text-right">Total</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {order.items.map((item: any) => {
              const itemDiscount = item.quantity * item.unit_price - item.total
              const netUnitPrice = item.quantity > 0 ? item.total / item.quantity : item.unit_price
              return (
                <tr key={item.id} className="break-inside-avoid border-b border-neutral-200 align-top">
                  <td className="py-[3px] pr-3 whitespace-nowrap text-neutral-500">{item.products?.sku ?? '—'}</td>
                  <td className="py-[3px] pr-3">
                    {item.description}
                    {item.notes ? (
                      <span className="block whitespace-pre-wrap text-[10px] leading-tight text-neutral-500">
                        Obs.: {item.notes}
                      </span>
                    ) : null}
                  </td>
                  <td className={isProduction ? 'py-[3px] text-right whitespace-nowrap' : 'py-[3px] pr-3 text-right whitespace-nowrap'}>
                    {item.quantity}
                  </td>
                  {isProduction ? null : (
                    <>
                      <td className="py-[3px] pr-3 text-right whitespace-nowrap">{formatCurrency(item.unit_price)}</td>
                      <td className="py-[3px] pr-3 text-right whitespace-nowrap">
                        {itemDiscount > 0 ? `-${formatCurrency(itemDiscount)}` : '—'}
                      </td>
                      <td className="py-[3px] pr-3 text-right whitespace-nowrap">{formatCurrency(netUnitPrice)}</td>
                      <td className="py-[3px] text-right whitespace-nowrap font-medium">{formatCurrency(item.total)}</td>
                    </>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>

        {isProduction ? null : (
          <div className="mb-2 flex break-inside-avoid justify-end">
            <div className="w-52 text-[11px]">
              <div className="flex justify-between py-px">
                <span className="text-neutral-500">Subtotal</span>
                <span>{formatCurrency(itemsGrossSubtotal)}</span>
              </div>
              {itemDiscountsTotal > 0 ? (
                <div className="flex justify-between py-px">
                  <span className="text-neutral-500">Desconto nos itens</span>
                  <span>-{formatCurrency(itemDiscountsTotal)}</span>
                </div>
              ) : null}
              {Number(order.discount_value) > 0 ? (
                <div className="flex justify-between py-px">
                  <span className="text-neutral-500">Desconto global</span>
                  <span>
                    -{order.discount_type === 'percent' ? `${order.discount_value}%` : formatCurrency(order.discount_value)}
                  </span>
                </div>
              ) : null}
              {order.freight ? (
                <div className="flex justify-between py-px">
                  <span className="text-neutral-500">Frete</span>
                  <span>{formatCurrency(order.freight)}</span>
                </div>
              ) : null}
              <div className="mt-0.5 flex justify-between border-t border-neutral-400 pt-1 text-sm font-semibold">
                <span>Total</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>
        )}

        {order.notes ? (
          <div className="mb-2 break-inside-avoid">
            <p className="text-[10px] font-medium uppercase text-neutral-400">Observações</p>
            <p className="whitespace-pre-wrap text-[11px] text-neutral-700">{order.notes}</p>
          </div>
        ) : null}

        <p className="text-center text-[9px] text-neutral-400">Gerado em {formatDateTime(new Date().toISOString())}</p>
      </div>
    </div>
  )
}
