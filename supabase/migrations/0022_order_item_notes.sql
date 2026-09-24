-- =========================================================================
-- Observação por item do pedido (ex: medida específica do produto).
-- =========================================================================

alter table public.order_items
  add column notes text;
