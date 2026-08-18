import * as XLSX from 'xlsx'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'

export async function exportRawData(workspaceId: string) {
  const [{ data: clients }, { data: products }, { data: orders }] = await Promise.all([
    supabase.from('clients').select('*').eq('workspace_id', workspaceId),
    supabase.from('products').select('*').eq('workspace_id', workspaceId),
    supabase
      .from('orders')
      .select('id, created_at, total, notes, clients(name), pipeline_stages(name), order_items(description, quantity, unit_price, total)')
      .eq('workspace_id', workspaceId),
  ])

  const ordersFlat = (orders ?? []).flatMap((order: any) =>
    (order.order_items ?? []).length > 0
      ? order.order_items.map((item: any) => ({
          pedido_id: order.id,
          data: order.created_at,
          cliente: order.clients?.name ?? '',
          estagio: order.pipeline_stages?.name ?? '',
          produto: item.description,
          quantidade: item.quantity,
          preco_unitario: item.unit_price,
          total_item: item.total,
          total_pedido: order.total,
        }))
      : [
          {
            pedido_id: order.id,
            data: order.created_at,
            cliente: order.clients?.name ?? '',
            estagio: order.pipeline_stages?.name ?? '',
            produto: '',
            quantidade: '',
            preco_unitario: '',
            total_item: '',
            total_pedido: order.total,
          },
        ],
  )

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(ordersFlat), 'Pedidos')
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(clients ?? []), 'Clientes')
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(products ?? []), 'Produtos')

  XLSX.writeFile(workbook, `jotapedi_export_${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
}
