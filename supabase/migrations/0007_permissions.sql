-- =========================================================================
-- Jotapedi — permissões granulares por membro da equipe
--
-- section_access controla quais seções aparecem no menu do usuário
-- (aplicado no frontend). can_view_all_records controla a visibilidade
-- de PEDIDOS e ATIVIDADES, e É reforçado via RLS: membros com
-- can_view_all_records = false só veem pedidos/atividades onde são
-- created_by ou assigned_to. Clientes continuam visíveis para todo
-- mundo do workspace (não é restrito). Admins sempre veem tudo.
--
-- Este arquivo é seguro de rodar mais de uma vez (idempotente).
-- =========================================================================

alter table public.users
  add column if not exists section_access jsonb not null default '{
    "dashboard": true, "pedidos": true, "produtos": true, "clientes": true,
    "atividades": true, "calendario": true, "relatorios": true,
    "automacoes": true, "configuracoes": true
  }'::jsonb;

alter table public.users
  add column if not exists can_view_all_records boolean not null default true;

-- coluna antiga de uma tentativa anterior desta migration, se existir
alter table public.users
  drop column if exists can_view_all_orders;

alter table public.orders
  add column if not exists assigned_to uuid references public.users (id) on delete set null;

create index if not exists orders_assigned_to_idx on public.orders (assigned_to);

drop function if exists public.can_view_all_orders(uuid);

create or replace function public.can_view_all_records(p_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (
      select role = 'admin' or can_view_all_records
      from public.users
      where auth_user_id = auth.uid() and workspace_id = p_workspace_id and joined_at is not null
    ),
    false
  );
$$;

grant execute on function public.can_view_all_records(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Pedidos: substitui a policy única "orders_all" por policies que
-- respeitam o escopo de visibilidade de cada membro.
-- ---------------------------------------------------------------------
drop policy if exists "orders_all" on public.orders;
drop policy if exists "orders_select" on public.orders;
drop policy if exists "orders_insert" on public.orders;
drop policy if exists "orders_update" on public.orders;
drop policy if exists "orders_delete" on public.orders;

create policy "orders_select" on public.orders
  for select using (
    workspace_id in (select public.get_my_workspace_ids())
    and (
      public.can_view_all_records(workspace_id)
      or created_by = public.get_my_user_id(workspace_id)
      or assigned_to = public.get_my_user_id(workspace_id)
    )
  );

create policy "orders_insert" on public.orders
  for insert with check (workspace_id in (select public.get_my_workspace_ids()));

create policy "orders_update" on public.orders
  for update using (
    workspace_id in (select public.get_my_workspace_ids())
    and (
      public.can_view_all_records(workspace_id)
      or created_by = public.get_my_user_id(workspace_id)
      or assigned_to = public.get_my_user_id(workspace_id)
    )
  );

create policy "orders_delete" on public.orders
  for delete using (
    workspace_id in (select public.get_my_workspace_ids())
    and (
      public.can_view_all_records(workspace_id)
      or created_by = public.get_my_user_id(workspace_id)
      or assigned_to = public.get_my_user_id(workspace_id)
    )
  );

-- ---------------------------------------------------------------------
-- order_items herda a mesma visibilidade do pedido pai.
-- ---------------------------------------------------------------------
drop policy if exists "order_items_all" on public.order_items;
drop policy if exists "order_items_select_update_delete" on public.order_items;

create policy "order_items_select_update_delete" on public.order_items
  for all using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and o.workspace_id in (select public.get_my_workspace_ids())
        and (
          public.can_view_all_records(o.workspace_id)
          or o.created_by = public.get_my_user_id(o.workspace_id)
          or o.assigned_to = public.get_my_user_id(o.workspace_id)
        )
    )
  )
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and o.workspace_id in (select public.get_my_workspace_ids())
    )
  );

-- ---------------------------------------------------------------------
-- Atividades: mesmo escopo de visibilidade de pedidos. activities já
-- tem created_by e assigned_to desde o schema inicial.
-- ---------------------------------------------------------------------
drop policy if exists "activities_all" on public.activities;
drop policy if exists "activities_select" on public.activities;
drop policy if exists "activities_insert" on public.activities;
drop policy if exists "activities_update" on public.activities;
drop policy if exists "activities_delete" on public.activities;

create policy "activities_select" on public.activities
  for select using (
    workspace_id in (select public.get_my_workspace_ids())
    and (
      public.can_view_all_records(workspace_id)
      or created_by = public.get_my_user_id(workspace_id)
      or assigned_to = public.get_my_user_id(workspace_id)
    )
  );

create policy "activities_insert" on public.activities
  for insert with check (workspace_id in (select public.get_my_workspace_ids()));

create policy "activities_update" on public.activities
  for update using (
    workspace_id in (select public.get_my_workspace_ids())
    and (
      public.can_view_all_records(workspace_id)
      or created_by = public.get_my_user_id(workspace_id)
      or assigned_to = public.get_my_user_id(workspace_id)
    )
  );

create policy "activities_delete" on public.activities
  for delete using (
    workspace_id in (select public.get_my_workspace_ids())
    and (
      public.can_view_all_records(workspace_id)
      or created_by = public.get_my_user_id(workspace_id)
      or assigned_to = public.get_my_user_id(workspace_id)
    )
  );

-- força o PostgREST a recarregar o cache de schema imediatamente
notify pgrst, 'reload schema';
