-- =========================================================================
-- Jotapedi — corrige foreign keys sem ação de exclusão definida
--
-- Essas colunas referenciam registros que são apagados em cascata a
-- partir de workspaces (produtos, estágios, usuários), mas as próprias
-- colunas não tinham "on delete", então o Postgres bloqueava a
-- exclusão do workspace com erro de foreign key. Ajustado para
-- "set null" — são todos campos históricos/opcionais, não faz sentido
-- apagar o pedido/atividade inteiro só porque o produto/estágio/autor
-- foi removido.
-- =========================================================================

alter table public.order_items drop constraint if exists order_items_product_id_fkey;
alter table public.order_items
  add constraint order_items_product_id_fkey
  foreign key (product_id) references public.products (id) on delete set null;

alter table public.orders alter column stage_id drop not null;
alter table public.orders drop constraint if exists orders_stage_id_fkey;
alter table public.orders
  add constraint orders_stage_id_fkey
  foreign key (stage_id) references public.pipeline_stages (id) on delete set null;

alter table public.orders drop constraint if exists orders_created_by_fkey;
alter table public.orders
  add constraint orders_created_by_fkey
  foreign key (created_by) references public.users (id) on delete set null;

alter table public.activities drop constraint if exists activities_created_by_fkey;
alter table public.activities
  add constraint activities_created_by_fkey
  foreign key (created_by) references public.users (id) on delete set null;
