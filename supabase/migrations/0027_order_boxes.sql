-- =========================================================================
-- Total de caixas do pedido: campo informativo, digitado (não é calculado).
-- =========================================================================

alter table public.orders
  add column if not exists boxes numeric(12, 2);
