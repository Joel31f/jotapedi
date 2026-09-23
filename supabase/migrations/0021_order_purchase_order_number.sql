-- =========================================================================
-- Número da ordem de compra/pedido que o cliente informa (opcional).
-- =========================================================================

alter table public.orders
  add column purchase_order_number text;
