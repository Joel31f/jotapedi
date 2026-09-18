-- =========================================================================
-- Novos campos no pedido: contato, transporte, condição de pagamento e
-- previsão de entrega (todos opcionais).
-- =========================================================================

alter table public.orders
  add column contact_name text,
  add column shipping_method text,
  add column payment_terms text,
  add column delivery_date date;
