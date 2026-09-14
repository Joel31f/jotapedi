-- =========================================================================
-- Adiciona o campo de frete no pedido (soma ao total, depois do desconto).
-- =========================================================================

alter table public.orders
  add column freight numeric(14, 2) not null default 0;
