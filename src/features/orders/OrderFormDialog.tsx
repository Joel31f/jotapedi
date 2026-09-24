import { useEffect, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Printer, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SearchCombobox, type ComboboxOption } from '@/components/SearchCombobox'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { useWorkspace } from '@/providers/WorkspaceProvider'
import { useCreateOrder, useUpdateOrder, type OrderWithItems, type OrderItemPayload } from '@/features/orders/api'
import { useBrandsQuery } from '@/features/brands/api'
import { clearDraft, readDraft, writeDraft } from '@/lib/formDraft'
import type { DiscountType } from '@/types/database'

interface LineItem {
  key: string
  product_id: string | null
  description: string
  quantity: string
  unit_price: string
  discount_type: DiscountType
  discount_value: string
  net_price: string
}

function emptyItem(): LineItem {
  return {
    key: crypto.randomUUID(),
    product_id: null,
    description: '',
    quantity: '1',
    unit_price: '0',
    discount_type: 'value',
    discount_value: '0',
    net_price: '0',
  }
}

function toNumber(value: string) {
  return Number(value.replace(',', '.')) || 0
}

function round2(value: number) {
  return Math.round(value * 100) / 100
}

function netUnitPrice(item: Pick<LineItem, 'unit_price' | 'discount_type' | 'discount_value'>) {
  const price = toNumber(item.unit_price)
  const discount = item.discount_type === 'percent' ? (price * toNumber(item.discount_value)) / 100 : toNumber(item.discount_value)
  return Math.max(0, price - discount)
}

function withNetPrice(item: Omit<LineItem, 'net_price'>): LineItem {
  return { ...item, net_price: String(round2(netUnitPrice(item))) }
}

interface OrderDraft {
  clientId: string | null
  clientLabel: string | null
  stageId: string
  brandId: string | null
  assignedTo: string | null
  assignedToLabel: string | null
  items: LineItem[]
  discountType: DiscountType
  discountValue: string
  freight: string
  notes: string
  contactName: string
  shippingMethod: string
  paymentTerms: string
  deliveryDate: string
  purchaseOrderNumber: string
}

function itemTotal(item: LineItem) {
  const quantity = toNumber(item.quantity)
  const gross = quantity * toNumber(item.unit_price)
  const discount =
    item.discount_type === 'percent' ? (gross * toNumber(item.discount_value)) / 100 : toNumber(item.discount_value) * quantity
  return Math.max(0, gross - discount)
}

export function OrderFormDialog({
  open,
  onOpenChange,
  order,
  defaultClient,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: OrderWithItems | null
  defaultClient?: { id: string; label: string } | null
}) {
  const { activeWorkspace, activeMembership, isAdmin, stages } = useWorkspace()
  const [clientId, setClientId] = useState<string | null>(null)
  const [clientLabel, setClientLabel] = useState<string | null>(null)
  const [stageId, setStageId] = useState<string>('')
  const [brandId, setBrandId] = useState<string | null>(null)
  const [assignedTo, setAssignedTo] = useState<string | null>(null)
  const [assignedToLabel, setAssignedToLabel] = useState<string | null>(null)
  const [items, setItems] = useState<LineItem[]>([emptyItem()])
  const [discountType, setDiscountType] = useState<DiscountType>('value')
  const [discountValue, setDiscountValue] = useState('0')
  const [freight, setFreight] = useState('0')
  const [notes, setNotes] = useState('')
  const [contactName, setContactName] = useState('')
  const [shippingMethod, setShippingMethod] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState('')

  const createOrder = useCreateOrder()
  const updateOrder = useUpdateOrder()
  const { data: brands = [] } = useBrandsQuery()
  const saving = createOrder.isPending || updateOrder.isPending

  const { data: suggestions } = useQuery({
    queryKey: ['order-field-suggestions', activeWorkspace?.id],
    enabled: !!activeWorkspace && open,
    queryFn: async () => {
      const { data } = await supabase
        .from('orders')
        .select('shipping_method, payment_terms')
        .eq('workspace_id', activeWorkspace!.id)
        .order('created_at', { ascending: false })
        .limit(300)
      const unique = (values: (string | null)[]) => [...new Set(values.filter((v): v is string => !!v))]
      return {
        shipping: unique((data ?? []).map((o) => o.shipping_method)),
        payment: unique((data ?? []).map((o) => o.payment_terms)),
      }
    },
  })

  const prefillFromLastOrder = async (clientIdToFill: string) => {
    const { data } = await supabase
      .from('orders')
      .select('contact_name, shipping_method, payment_terms')
      .eq('client_id', clientIdToFill)
      .order('created_at', { ascending: false })
      .limit(10)
    const firstFilled = (pick: (o: NonNullable<typeof data>[number]) => string | null) =>
      (data ?? []).map(pick).find((v) => !!v) ?? ''
    const contact = firstFilled((o) => o.contact_name)
    const shipping = firstFilled((o) => o.shipping_method)
    const payment = firstFilled((o) => o.payment_terms)
    setContactName((prev) => prev || contact)
    setShippingMethod((prev) => prev || shipping)
    setPaymentTerms((prev) => prev || payment)
  }

  const draftKey = `jotapedi:draft:order:${activeWorkspace?.id ?? 'x'}:${order?.id ?? 'new'}`

  useEffect(() => {
    if (!open) return
    const draft = readDraft<OrderDraft>(draftKey)
    if (draft && (draft.clientId || draft.items.some((i) => i.description.trim()))) {
      setClientId(draft.clientId)
      setClientLabel(draft.clientLabel)
      setStageId(draft.stageId)
      setBrandId(draft.brandId)
      setAssignedTo(draft.assignedTo)
      setAssignedToLabel(draft.assignedToLabel)
      setDiscountType(draft.discountType)
      setDiscountValue(draft.discountValue)
      setFreight(draft.freight)
      setNotes(draft.notes)
      setContactName(draft.contactName)
      setShippingMethod(draft.shippingMethod)
      setPaymentTerms(draft.paymentTerms)
      setDeliveryDate(draft.deliveryDate)
      setPurchaseOrderNumber(draft.purchaseOrderNumber)
      setItems(draft.items.map(withNetPrice))
      toast.info('Rascunho recuperado — continue de onde parou')
      return
    }
    if (order) {
      setClientId(order.client?.id ?? null)
      setClientLabel(order.client?.name ?? null)
      setStageId(order.stage_id)
      setBrandId(order.brand_id)
      setAssignedTo(order.assigned_to)
      setAssignedToLabel(null)
      if (order.assigned_to) {
        supabase
          .from('users')
          .select('name, email')
          .eq('id', order.assigned_to)
          .single()
          .then(({ data }) => data && setAssignedToLabel(data.name || data.email))
      }
      setDiscountType(order.discount_type)
      setDiscountValue(String(order.discount_value))
      setFreight(String(order.freight))
      setNotes(order.notes ?? '')
      setContactName(order.contact_name ?? '')
      setShippingMethod(order.shipping_method ?? '')
      setPaymentTerms(order.payment_terms ?? '')
      setDeliveryDate(order.delivery_date ?? '')
      setPurchaseOrderNumber(order.purchase_order_number ?? '')
      setItems(
        order.items.length > 0
          ? order.items.map((i) =>
              withNetPrice({
                key: i.id,
                product_id: i.product_id,
                description: i.description,
                quantity: String(i.quantity),
                unit_price: String(i.unit_price),
                discount_type: i.discount_type,
                discount_value: String(i.discount_value),
              }),
            )
          : [emptyItem()],
      )
    } else {
      setClientId(defaultClient?.id ?? null)
      setClientLabel(defaultClient?.label ?? null)
      setStageId(stages[0]?.id ?? '')
      setBrandId(null)
      setAssignedTo(activeMembership?.id ?? null)
      setAssignedToLabel(activeMembership?.name ?? null)
      setDiscountType('value')
      setDiscountValue('0')
      setFreight('0')
      setNotes('')
      setContactName('')
      setShippingMethod('')
      setPaymentTerms('')
      setDeliveryDate('')
      setPurchaseOrderNumber('')
      setItems([emptyItem()])
      if (defaultClient?.id) prefillFromLastOrder(defaultClient.id)
    }
  }, [open, order, defaultClient, stages, activeMembership, draftKey])

  useEffect(() => {
    if (!open) return
    const meaningful =
      !!clientId || items.some((i) => i.description.trim()) || !!notes.trim() || !!contactName.trim() || !!shippingMethod.trim()
    if (meaningful) {
      writeDraft<OrderDraft>(draftKey, {
        clientId,
        clientLabel,
        stageId,
        brandId,
        assignedTo,
        assignedToLabel,
        items,
        discountType,
        discountValue,
        freight,
        notes,
        contactName,
        shippingMethod,
        paymentTerms,
        deliveryDate,
        purchaseOrderNumber,
      })
    } else {
      clearDraft(draftKey)
    }
  }, [
    open,
    draftKey,
    clientId,
    clientLabel,
    stageId,
    brandId,
    assignedTo,
    assignedToLabel,
    items,
    discountType,
    discountValue,
    freight,
    notes,
    contactName,
    shippingMethod,
    paymentTerms,
    deliveryDate,
    purchaseOrderNumber,
  ])

  const handleOpenChange = (next: boolean) => {
    if (!next) clearDraft(draftKey)
    onOpenChange(next)
  }

  const searchClients = async (query: string): Promise<ComboboxOption[]> => {
    if (!activeWorkspace) return []
    let q = supabase.from('clients').select('id, name, company').eq('workspace_id', activeWorkspace.id)
    const cleaned = query.replace(/[,%]/g, '').trim()
    if (cleaned) q = q.ilike('search_text', `%${cleaned.toLowerCase()}%`)
    const { data } = await q.order('name', { ascending: true }).limit(20)
    return (data ?? []).map((c) => ({ id: c.id, label: c.name, sublabel: c.company }))
  }

  const searchProducts = async (query: string): Promise<ComboboxOption[]> => {
    if (!activeWorkspace) return []
    let q = supabase
      .from('products')
      .select('id, sku, description, sale_price')
      .eq('workspace_id', activeWorkspace.id)
      .eq('active', true)
    const cleaned = query.replace(/[,%]/g, '').trim()
    if (cleaned) q = q.or(`sku.ilike.%${cleaned}%,description.ilike.%${cleaned}%`)
    const { data } = await q.order('description', { ascending: true }).limit(20)
    return (data ?? []).map((p) => ({ id: p.id, label: p.description, sublabel: `${p.sku} · ${formatCurrency(p.sale_price)}` }))
  }

  const createProductFromDescription = async (item: LineItem, description: string): Promise<ComboboxOption> => {
    if (!activeWorkspace) throw new Error('Workspace não encontrado')

    let base: { sale_price: number; cost_price: number; unit: string; category: string | null; ncm: string | null } | null = null
    if (item.product_id) {
      const { data } = await supabase
        .from('products')
        .select('sale_price, cost_price, unit, category, ncm')
        .eq('id', item.product_id)
        .single()
      base = data
    }

    const sku = `AUTO-${Date.now().toString(36).toUpperCase()}`
    const { data, error } = await supabase
      .from('products')
      .insert({
        workspace_id: activeWorkspace.id,
        sku,
        description,
        unit: base?.unit ?? 'UN',
        sale_price: base?.sale_price ?? toNumber(item.unit_price),
        cost_price: base?.cost_price ?? 0,
        category: base?.category ?? null,
        ncm: base?.ncm ?? null,
        active: true,
      })
      .select('id, sku, description, sale_price')
      .single()
    if (error) throw new Error(error.message)

    return { id: data.id, label: data.description, sublabel: `${data.sku} · ${formatCurrency(data.sale_price)}` }
  }

  const searchTeamMembers = async (query: string): Promise<ComboboxOption[]> => {
    if (!activeWorkspace) return []
    if (!isAdmin) {
      if (!activeMembership) return []
      return [{ id: activeMembership.id, label: activeMembership.name || activeMembership.email }]
    }
    let q = supabase
      .from('users')
      .select('id, name, email')
      .eq('workspace_id', activeWorkspace.id)
      .not('joined_at', 'is', null)
    const cleaned = query.replace(/[,%]/g, '').trim()
    if (cleaned) q = q.or(`name.ilike.%${cleaned}%,email.ilike.%${cleaned}%`)
    const { data } = await q.order('name', { ascending: true }).limit(20)
    return (data ?? []).map((u) => ({ id: u.id, label: u.name || u.email }))
  }

  const updateItem = (key: string, patch: Partial<LineItem>) =>
    setItems((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item
        const next = { ...item, ...patch }
        if ('net_price' in patch) {
          next.discount_type = 'value'
          next.discount_value = String(Math.max(0, round2(toNumber(next.unit_price) - toNumber(next.net_price))))
        } else if ('unit_price' in patch || 'discount_type' in patch || 'discount_value' in patch) {
          next.net_price = String(round2(netUnitPrice(next)))
        }
        return next
      }),
    )

  const refreshNetPrice = (key: string) =>
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, net_price: String(round2(netUnitPrice(item))) } : item)))

  const removeItem = (key: string) => setItems((prev) => (prev.length > 1 ? prev.filter((item) => item.key !== key) : prev))

  const grossSubtotal = items.reduce((sum, item) => sum + toNumber(item.quantity) * toNumber(item.unit_price), 0)
  const subtotal = items.reduce((sum, item) => sum + itemTotal(item), 0)
  const itemDiscountsTotal = grossSubtotal - subtotal
  const globalDiscountAmount = discountType === 'percent' ? (subtotal * toNumber(discountValue)) / 100 : toNumber(discountValue)
  const total = Math.max(0, subtotal - globalDiscountAmount) + toNumber(freight)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!clientId) {
      toast.error('Selecione um cliente')
      return
    }
    if (!stageId) {
      toast.error('Selecione um estágio')
      return
    }

    const orderPayload = {
      client_id: clientId,
      stage_id: stageId,
      brand_id: brandId,
      assigned_to: assignedTo,
      subtotal,
      discount_type: discountType,
      discount_value: toNumber(discountValue),
      freight: toNumber(freight),
      total,
      notes: notes.trim() || null,
      contact_name: contactName.trim() || null,
      shipping_method: shippingMethod.trim() || null,
      payment_terms: paymentTerms.trim() || null,
      delivery_date: deliveryDate || null,
      purchase_order_number: purchaseOrderNumber.trim() || null,
      ...(order ? {} : { created_by: activeMembership?.id ?? null }),
    }

    const itemsPayload: OrderItemPayload[] = items
      .filter((item) => item.description.trim())
      .map((item, index) => ({
        product_id: item.product_id,
        description: item.description.trim(),
        quantity: toNumber(item.quantity) || 1,
        unit_price: toNumber(item.unit_price),
        discount_type: item.discount_type,
        discount_value: toNumber(item.discount_value),
        total: itemTotal(item),
        position: index,
      }))

    try {
      if (order) {
        await updateOrder.mutateAsync({ id: order.id, payload: orderPayload, items: itemsPayload })
        toast.success('Pedido atualizado')
      } else {
        await createOrder.mutateAsync({ payload: orderPayload, items: itemsPayload })
        toast.success('Pedido criado')
      }
      clearDraft(draftKey)
      onOpenChange(false)
    } catch (error) {
      toast.error('Não foi possível salvar o pedido', {
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[92vh] w-[min(96vw,80rem)] max-w-none overflow-y-auto sm:max-w-none">
        <DialogHeader>
          <DialogTitle>{order ? 'Editar pedido' : 'Novo pedido'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-wrap gap-3">
            <div className="flex min-w-[220px] flex-1 flex-col gap-1.5">
              <Label>Cliente</Label>
              <SearchCombobox
                selectedLabel={clientLabel}
                placeholder="Selecionar cliente…"
                search={searchClients}
                onSelect={(option) => {
                  setClientId(option.id)
                  setClientLabel(option.label)
                  if (!order) prefillFromLastOrder(option.id)
                }}
              />
            </div>
            <div className="flex min-w-[180px] flex-1 flex-col gap-1.5">
              <Label>Estágio</Label>
              <Select
                value={stageId}
                onValueChange={(value) => setStageId(value ?? '')}
                items={stages.map((s) => ({ value: s.id, label: s.name }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecionar estágio" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex min-w-[180px] flex-1 flex-col gap-1.5">
              <Label>Marca</Label>
              <Select
                value={brandId ?? '__none__'}
                onValueChange={(value) => setBrandId(value === '__none__' ? null : value)}
                items={[{ value: '__none__', label: 'Sem marca' }, ...brands.map((b) => ({ value: b.id, label: b.name }))]}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecionar marca" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem marca</SelectItem>
                  {brands.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex min-w-[220px] flex-1 flex-col gap-1.5">
              <Label>Responsável</Label>
              <SearchCombobox
                selectedLabel={assignedToLabel}
                placeholder="Selecionar responsável…"
                search={searchTeamMembers}
                onSelect={(option) => {
                  setAssignedTo(option.id)
                  setAssignedToLabel(option.label)
                }}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="flex min-w-[180px] flex-1 flex-col gap-1.5">
              <Label htmlFor="contact_name">Contato</Label>
              <Input id="contact_name" value={contactName} onChange={(e) => setContactName(e.target.value)} />
            </div>
            <div className="flex min-w-[220px] flex-1 flex-col gap-1.5">
              <Label htmlFor="shipping_method">Transporte</Label>
              <Input
                id="shipping_method"
                placeholder="Ex: Cliente Retira - Avisar Antes"
                list="shipping-suggestions"
                value={shippingMethod}
                onChange={(e) => setShippingMethod(e.target.value)}
              />
              <datalist id="shipping-suggestions">
                {(suggestions?.shipping ?? []).map((value) => (
                  <option key={value} value={value} />
                ))}
              </datalist>
            </div>
            <div className="flex min-w-[220px] flex-1 flex-col gap-1.5">
              <Label htmlFor="payment_terms">Condição de pagamento</Label>
              <Input
                id="payment_terms"
                placeholder="Ex: À Negociar - Pagamento Normal"
                list="payment-suggestions"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
              />
              <datalist id="payment-suggestions">
                {(suggestions?.payment ?? []).map((value) => (
                  <option key={value} value={value} />
                ))}
              </datalist>
            </div>
            <div className="flex min-w-[160px] flex-1 flex-col gap-1.5">
              <Label htmlFor="delivery_date">Previsão de entrega</Label>
              <Input id="delivery_date" type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
            </div>
            <div className="flex min-w-[200px] flex-1 flex-col gap-1.5">
              <Label htmlFor="purchase_order_number">Nº da ordem de compra do cliente</Label>
              <Input
                id="purchase_order_number"
                placeholder="Número que o cliente informou"
                value={purchaseOrderNumber}
                onChange={(e) => setPurchaseOrderNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Itens</Label>
              <Button type="button" size="sm" variant="outline" onClick={() => setItems((prev) => [...prev, emptyItem()])}>
                <Plus className="size-3.5" />
                Adicionar item
              </Button>
            </div>

            <div className="flex flex-col gap-3">
              {items.map((item) => (
                <div key={item.key} className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-3">
                  <div className="flex min-w-[240px] flex-[3] flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">Produto / descrição</Label>
                    <SearchCombobox
                      selectedLabel={item.description || null}
                      placeholder="Buscar produto…"
                      search={searchProducts}
                      onCreate={(query) => createProductFromDescription(item, query)}
                      createLabel={(query) => `Criar produto "${query}"`}
                      onSelect={(option) => {
                        const [, priceLabel] = (option.sublabel ?? '').split('·')
                        updateItem(item.key, {
                          product_id: option.id,
                          description: option.label,
                          unit_price: priceLabel ? priceLabel.replace(/[^\d,.-]/g, '').replace(',', '.') : item.unit_price,
                        })
                      }}
                    />
                  </div>
                  <div className="flex min-w-[100px] flex-1 flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">Qtd.</Label>
                    <Input
                      className="h-10"
                      inputMode="decimal"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.key, { quantity: e.target.value })}
                    />
                  </div>
                  <div className="flex min-w-[120px] flex-1 flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">Preço unit.</Label>
                    <Input
                      className="h-10"
                      inputMode="decimal"
                      value={item.unit_price}
                      onChange={(e) => updateItem(item.key, { unit_price: e.target.value })}
                    />
                  </div>
                  <div className="flex min-w-[120px] flex-1 flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">Desc. item</Label>
                    <Input
                      className="h-10"
                      inputMode="decimal"
                      value={item.discount_value}
                      onChange={(e) => updateItem(item.key, { discount_value: e.target.value })}
                    />
                  </div>
                  <div className="flex min-w-[100px] flex-1 flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">Tipo</Label>
                    <Select
                      value={item.discount_type}
                      onValueChange={(value) => updateItem(item.key, { discount_type: value as DiscountType })}
                      items={[{ value: 'value', label: 'R$' }, { value: 'percent', label: '%' }]}
                    >
                      <SelectTrigger className="h-10 w-full px-2 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="value">R$</SelectItem>
                        <SelectItem value="percent">%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex min-w-[120px] flex-1 flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">Preço c/ desc.</Label>
                    <Input
                      className="h-10"
                      inputMode="decimal"
                      value={item.net_price}
                      onChange={(e) => updateItem(item.key, { net_price: e.target.value })}
                      onBlur={() => refreshNetPrice(item.key)}
                    />
                  </div>
                  <Button type="button" size="icon" variant="ghost" onClick={() => removeItem(item.key)}>
                    <Trash2 className="size-4" />
                  </Button>
                  <p className="w-full text-right text-xs text-muted-foreground">
                    Total do item: <span className="text-foreground">{formatCurrency(itemTotal(item))}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg border border-border p-3">
            <div className="flex items-end gap-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Desconto global</Label>
                <Input
                  className="h-8 w-28"
                  inputMode="decimal"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                />
              </div>
              <Select
                value={discountType}
                onValueChange={(value) => setDiscountType(value as DiscountType)}
                items={[{ value: 'value', label: 'R$' }, { value: 'percent', label: '%' }]}
              >
                <SelectTrigger className="h-8 w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="value">R$</SelectItem>
                  <SelectItem value="percent">%</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Frete</Label>
                <Input
                  className="h-8 w-28"
                  inputMode="decimal"
                  value={freight}
                  onChange={(e) => setFreight(e.target.value)}
                />
              </div>
            </div>
            <div className="text-right text-sm">
              <p className="text-muted-foreground">Subtotal: {formatCurrency(grossSubtotal)}</p>
              {itemDiscountsTotal > 0 ? (
                <p className="text-muted-foreground">Desconto nos itens: -{formatCurrency(itemDiscountsTotal)}</p>
              ) : null}
              <p className="text-muted-foreground">Desconto global: -{formatCurrency(globalDiscountAmount)}</p>
              <p className="text-muted-foreground">Frete: {formatCurrency(toNumber(freight))}</p>
              <p className="text-base font-semibold text-foreground">Total: {formatCurrency(total)}</p>
            </div>
          </div>

          {order && order.stage_history.length > 0 ? (
            <div className="rounded-lg border border-border p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Histórico de estágio</p>
              <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                {order.stage_history.map((entry, idx) => {
                  const stage = stages.find((s) => s.id === entry.stage_id)
                  return (
                    <p key={idx}>
                      {formatDateTime(entry.changed_at)} — {stage?.name ?? 'Estágio removido'}
                    </p>
                  )
                })}
              </div>
            </div>
          ) : null}

          <DialogFooter>
            {order ? (
              <>
                <a
                  href={`/pedidos/${order.id}/imprimir?modo=producao`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(buttonVariants({ variant: 'outline' }), 'gap-1.5')}
                >
                  <Printer className="size-4" />
                  Imprimir p/ produção
                </a>
                <a
                  href={`/pedidos/${order.id}/imprimir`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(buttonVariants({ variant: 'outline' }), 'gap-1.5')}
                >
                  <Printer className="size-4" />
                  Imprimir
                </a>
              </>
            ) : null}
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
