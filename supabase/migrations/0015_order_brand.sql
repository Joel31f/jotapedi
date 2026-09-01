-- =========================================================================
-- Permite escolher a marca (MoldPlast / MarcoPlast) de cada pedido, usada
-- para exibir a logo correta na impressão em vez do nome do workspace.
-- =========================================================================

alter table public.orders
  add column brand text check (brand in ('moldplast', 'marcoplast'));
