import * as XLSX from 'xlsx'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'

type Page = PromiseLike<{ data: any[] | null; error: { message: string } | null }>

// O Supabase devolve no máximo 1.000 linhas por pedido; busca página por página até acabar.
async function fetchAll(build: (from: number, to: number) => Page, pageSize = 1000): Promise<any[]> {
  const all: any[] = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build(from, from + pageSize - 1)
    if (error) throw new Error(error.message)
    all.push(...(data ?? []))
    if (!data || data.length < pageSize) break
  }
  return all
}

const dateTime = (value: string | null | undefined) => (value ? format(new Date(value), 'dd/MM/yyyy HH:mm') : '')

const plainRows = (rows: any[]) =>
  rows.map((row) =>
    Object.fromEntries(Object.entries(row).map(([key, value]) => [key, Array.isArray(value) ? value.join('; ') : value])),
  )

export async function exportRawData(workspaceId: string) {
  const [clients, products, orders, members] = await Promise.all([
    fetchAll((from, to) => supabase.from('clients').select('*').eq('workspace_id', workspaceId).order('id').range(from, to)),
    fetchAll((from, to) => supabase.from('products').select('*').eq('workspace_id', workspaceId).order('id').range(from, to)),
    fetchAll(
      (from, to) =>
        supabase
          .from('orders')
          .select(
            '*, clients(name, company, document), pipeline_stages(name), brands(name), order_items(position, description, quantity, unit_price, discount_type, discount_value, total, notes, products(sku))',
          )
          .eq('workspace_id', workspaceId)
          .order('id')
          .range(from, to) as unknown as Page,
      300,
    ),
    fetchAll((from, to) => supabase.from('users').select('id, name, email').eq('workspace_id', workspaceId).order('id').range(from, to)),
  ])

  const memberName = new Map(members.map((m) => [m.id, m.name || m.email]))

  const orderRows = orders.flatMap((order: any): Record<string, string | number | null>[] => {
    const base = {
      pedido_id: order.id,
      criado_em: dateTime(order.created_at),
      ultima_atividade: dateTime(order.updated_at),
      estagio: order.pipeline_stages?.name ?? '',
      cliente: order.clients?.name ?? '',
      empresa: order.clients?.company ?? '',
      documento: order.clients?.document ?? '',
      marca: order.brands?.name ?? '',
      responsavel: memberName.get(order.assigned_to) ?? '',
      contato: order.contact_name ?? '',
      transporte: order.shipping_method ?? '',
      condicao_pagamento: order.payment_terms ?? '',
      previsao_entrega: order.delivery_date ?? '',
      ordem_compra_cliente: order.purchase_order_number ?? '',
      frete: order.freight,
      desconto_global_tipo: order.discount_type,
      desconto_global_valor: order.discount_value,
      subtotal: order.subtotal,
      total_pedido: order.total,
      observacoes_pedido: order.notes ?? '',
    }
    const items = [...(order.order_items ?? [])].sort((a: any, b: any) => a.position - b.position)
    if (items.length === 0) {
      return [{ ...base, item: '', codigo: '', produto: '', quantidade: '', preco_unitario: '', desconto_item_tipo: '', desconto_item_valor: '', total_item: '', observacao_item: '' }]
    }
    return items.map((item: any, index: number) => ({
      ...base,
      item: index + 1,
      codigo: item.products?.sku ?? '',
      produto: item.description,
      quantidade: item.quantity,
      preco_unitario: item.unit_price,
      desconto_item_tipo: item.discount_type,
      desconto_item_valor: item.discount_value,
      total_item: item.total,
      observacao_item: item.notes ?? '',
    }))
  })

  const summary = [
    { informacao: 'Gerado em', valor: dateTime(new Date().toISOString()) },
    { informacao: 'Pedidos', valor: orders.length },
    { informacao: 'Linhas de itens de pedidos', valor: orderRows.length },
    { informacao: 'Clientes', valor: clients.length },
    { informacao: 'Produtos', valor: products.length },
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summary), 'Resumo')
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(orderRows), 'Pedidos')
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(plainRows(clients)), 'Clientes')
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(plainRows(products)), 'Produtos')

  XLSX.writeFile(workbook, `jotapedi_export_${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
}
