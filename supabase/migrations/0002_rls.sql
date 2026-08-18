-- =========================================================================
-- Jotapedi — RLS por workspace
-- =========================================================================

-- ---------------------------------------------------------------------
-- Helpers (SECURITY DEFINER: bypassam RLS internamente, evitando
-- recursão ao consultar a própria tabela "users")
-- ---------------------------------------------------------------------
create or replace function public.get_my_workspace_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select workspace_id from public.users
  where auth_user_id = auth.uid() and joined_at is not null;
$$;

grant execute on function public.get_my_workspace_ids() to authenticated;

create or replace function public.get_my_user_id(p_workspace_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select id from public.users
  where auth_user_id = auth.uid() and workspace_id = p_workspace_id
  limit 1;
$$;

grant execute on function public.get_my_user_id(uuid) to authenticated;

create or replace function public.is_workspace_admin(p_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.users
    where auth_user_id = auth.uid()
      and workspace_id = p_workspace_id
      and role = 'admin'
      and joined_at is not null
  );
$$;

grant execute on function public.is_workspace_admin(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------
alter table public.workspaces enable row level security;
alter table public.users enable row level security;
alter table public.pipeline_stages enable row level security;
alter table public.tags enable row level security;
alter table public.clients enable row level security;
alter table public.client_tags enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.activities enable row level security;
alter table public.automations enable row level security;
alter table public.automation_logs enable row level security;
alter table public.webhooks enable row level security;
alter table public.notifications enable row level security;

-- ---------------------------------------------------------------------
-- workspaces
-- (sem policy de INSERT: criação só via RPC public.create_workspace)
-- ---------------------------------------------------------------------
create policy "workspaces_select" on public.workspaces
  for select using (id in (select public.get_my_workspace_ids()) or owner_id = auth.uid());

create policy "workspaces_update" on public.workspaces
  for update using (public.is_workspace_admin(id));

-- ---------------------------------------------------------------------
-- users (membership)
-- ---------------------------------------------------------------------
create policy "users_select" on public.users
  for select using (workspace_id in (select public.get_my_workspace_ids()));

create policy "users_insert_admin" on public.users
  for insert with check (public.is_workspace_admin(workspace_id));

create policy "users_update" on public.users
  for update using (
    public.is_workspace_admin(workspace_id) or auth_user_id = auth.uid()
  );

create policy "users_delete_admin" on public.users
  for delete using (public.is_workspace_admin(workspace_id));

-- ---------------------------------------------------------------------
-- macro: policies padrão workspace-scoped (pipeline_stages, tags,
-- clients, products, orders, activities, automations, webhooks)
-- ---------------------------------------------------------------------
create policy "pipeline_stages_all" on public.pipeline_stages
  for all using (workspace_id in (select public.get_my_workspace_ids()))
  with check (workspace_id in (select public.get_my_workspace_ids()));

create policy "tags_all" on public.tags
  for all using (workspace_id in (select public.get_my_workspace_ids()))
  with check (workspace_id in (select public.get_my_workspace_ids()));

create policy "clients_all" on public.clients
  for all using (workspace_id in (select public.get_my_workspace_ids()))
  with check (workspace_id in (select public.get_my_workspace_ids()));

create policy "products_all" on public.products
  for all using (workspace_id in (select public.get_my_workspace_ids()))
  with check (workspace_id in (select public.get_my_workspace_ids()));

create policy "orders_all" on public.orders
  for all using (workspace_id in (select public.get_my_workspace_ids()))
  with check (workspace_id in (select public.get_my_workspace_ids()));

create policy "activities_all" on public.activities
  for all using (workspace_id in (select public.get_my_workspace_ids()))
  with check (workspace_id in (select public.get_my_workspace_ids()));

create policy "automations_all" on public.automations
  for all using (workspace_id in (select public.get_my_workspace_ids()))
  with check (workspace_id in (select public.get_my_workspace_ids()));

create policy "webhooks_all" on public.webhooks
  for all using (workspace_id in (select public.get_my_workspace_ids()))
  with check (workspace_id in (select public.get_my_workspace_ids()));

-- ---------------------------------------------------------------------
-- client_tags (deriva workspace via clients)
-- ---------------------------------------------------------------------
create policy "client_tags_all" on public.client_tags
  for all using (
    exists (
      select 1 from public.clients c
      where c.id = client_tags.client_id
        and c.workspace_id in (select public.get_my_workspace_ids())
    )
  )
  with check (
    exists (
      select 1 from public.clients c
      where c.id = client_tags.client_id
        and c.workspace_id in (select public.get_my_workspace_ids())
    )
  );

-- ---------------------------------------------------------------------
-- order_items (deriva workspace via orders)
-- ---------------------------------------------------------------------
create policy "order_items_all" on public.order_items
  for all using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and o.workspace_id in (select public.get_my_workspace_ids())
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
-- automation_logs: leitura para membros; escrita só via service_role
-- (edge functions), por isso não há policy de insert/update/delete.
-- ---------------------------------------------------------------------
create policy "automation_logs_select" on public.automation_logs
  for select using (workspace_id in (select public.get_my_workspace_ids()));

-- ---------------------------------------------------------------------
-- notifications: cada usuário vê as próprias + broadcasts (user_id null)
-- ---------------------------------------------------------------------
create policy "notifications_select" on public.notifications
  for select using (
    workspace_id in (select public.get_my_workspace_ids())
    and (user_id is null or user_id = public.get_my_user_id(workspace_id))
  );

create policy "notifications_update_own" on public.notifications
  for update using (
    workspace_id in (select public.get_my_workspace_ids())
    and (user_id is null or user_id = public.get_my_user_id(workspace_id))
  );
