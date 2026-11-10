-- =========================================================================
-- Observação para produção (separada da observação do cliente) e
-- quantidade de caixas por item do pedido (o total do pedido é a soma).
-- =========================================================================

-- A coluna "notes" existente passa a ser a "Observação do cliente" na tela.
alter table public.orders
  add column if not exists production_notes text;

alter table public.order_items
  add column if not exists boxes numeric(12, 2) not null default 0;
