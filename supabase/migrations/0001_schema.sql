-- =========================================================================
-- Jotapedi — schema inicial
-- Tabelas base pedidas: workspaces, users, clients, products, orders,
-- order_items, activities, automations, automation_logs, pipeline_stages, tags
-- Tabelas de apoio adicionadas (necessárias para os requisitos, não citadas
-- explicitamente na lista mas exigidas pelas features pedidas):
--   client_tags       -> junção N:N entre clients e tags
--   webhooks          -> integrações de saída (Configurações > Integrações)
--   notifications     -> notificações in-app (atividades atrasadas / automações)
-- =========================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- workspaces
-- ---------------------------------------------------------------------
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  currency text not null default 'BRL',
  timezone text not null default 'America/Sao_Paulo',
  date_format text not null default 'DD/MM/YYYY',
  monthly_goal numeric(14, 2) not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- users (membership do workspace — 1 linha por usuário por workspace)
-- ---------------------------------------------------------------------
create table public.users (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  auth_user_id uuid references auth.users (id) on delete set null,
  email text not null,
  name text,
  avatar_url text,
  role text not null default 'member' check (role in ('admin', 'member')),
  invited_at timestamptz default now(),
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  unique (workspace_id, email)
);

create index users_auth_user_id_idx on public.users (auth_user_id);
create index users_workspace_id_idx on public.users (workspace_id);

-- ---------------------------------------------------------------------
-- pipeline_stages (estágios do kanban de pedidos, configuráveis)
-- ---------------------------------------------------------------------
create table public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  position int not null default 0,
  color text not null default '#00e676',
  is_won boolean not null default false,
  created_at timestamptz not null default now()
);

create index pipeline_stages_workspace_id_idx on public.pipeline_stages (workspace_id);

-- ---------------------------------------------------------------------
-- tags
-- ---------------------------------------------------------------------
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  color text not null default '#00e676',
  created_at timestamptz not null default now(),
  unique (workspace_id, name)
);

create index tags_workspace_id_idx on public.tags (workspace_id);

-- ---------------------------------------------------------------------
-- clients
-- ---------------------------------------------------------------------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  company text,
  document text,
  email text,
  phone text,
  whatsapp text,
  role_title text,
  address_street text,
  address_number text,
  address_complement text,
  address_neighborhood text,
  address_city text,
  address_state text,
  address_zip text,
  lead_stage text not null default 'novo_lead'
    check (lead_stage in ('novo_lead', 'contato_feito', 'qualificado', 'cliente_ativo', 'inativo')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index clients_workspace_id_idx on public.clients (workspace_id);
create index clients_lead_stage_idx on public.clients (workspace_id, lead_stage);

-- junção N:N clients <-> tags
create table public.client_tags (
  client_id uuid not null references public.clients (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (client_id, tag_id)
);

-- ---------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  sku text not null,
  description text not null,
  unit text not null default 'UN',
  sale_price numeric(14, 2) not null default 0,
  cost_price numeric(14, 2) not null default 0,
  category text,
  min_stock numeric(14, 2) default 0,
  ncm text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, sku)
);

create index products_workspace_id_idx on public.products (workspace_id);
create index products_category_idx on public.products (workspace_id, category);

-- ---------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  stage_id uuid not null references public.pipeline_stages (id),
  subtotal numeric(14, 2) not null default 0,
  discount_type text not null default 'value' check (discount_type in ('percent', 'value')),
  discount_value numeric(14, 2) not null default 0,
  total numeric(14, 2) not null default 0,
  notes text,
  stage_history jsonb not null default '[]'::jsonb,
  created_by uuid references public.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_workspace_id_idx on public.orders (workspace_id);
create index orders_stage_id_idx on public.orders (workspace_id, stage_id);
create index orders_client_id_idx on public.orders (client_id);

-- ---------------------------------------------------------------------
-- order_items
-- ---------------------------------------------------------------------
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id),
  description text not null,
  quantity numeric(14, 3) not null default 1,
  unit_price numeric(14, 2) not null default 0,
  discount_type text not null default 'value' check (discount_type in ('percent', 'value')),
  discount_value numeric(14, 2) not null default 0,
  total numeric(14, 2) not null default 0,
  position int not null default 0
);

create index order_items_order_id_idx on public.order_items (order_id);

-- ---------------------------------------------------------------------
-- activities
-- ---------------------------------------------------------------------
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  type text not null check (type in ('call', 'email', 'whatsapp', 'meeting', 'task')),
  title text not null,
  description text,
  due_at timestamptz not null default now(),
  client_id uuid references public.clients (id) on delete set null,
  order_id uuid references public.orders (id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'completed')),
  completed_at timestamptz,
  assigned_to uuid references public.users (id) on delete set null,
  created_by uuid references public.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index activities_workspace_id_idx on public.activities (workspace_id);
create index activities_due_at_idx on public.activities (workspace_id, status, due_at);
create index activities_client_id_idx on public.activities (client_id);
create index activities_order_id_idx on public.activities (order_id);

-- ---------------------------------------------------------------------
-- automations
-- ---------------------------------------------------------------------
create table public.automations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  trigger_type text not null check (trigger_type in (
    'order_stage_changed', 'order_created', 'client_created',
    'activity_overdue', 'order_stale'
  )),
  trigger_config jsonb not null default '{}'::jsonb,
  action_type text not null check (action_type in ('create_activity', 'send_notification')),
  action_config jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index automations_workspace_id_idx on public.automations (workspace_id);

-- ---------------------------------------------------------------------
-- automation_logs
-- ---------------------------------------------------------------------
create table public.automation_logs (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references public.automations (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  status text not null default 'success' check (status in ('success', 'error')),
  details jsonb not null default '{}'::jsonb,
  related_entity_type text,
  related_entity_id uuid,
  triggered_at timestamptz not null default now()
);

create index automation_logs_automation_id_idx on public.automation_logs (automation_id);
create index automation_logs_workspace_id_idx on public.automation_logs (workspace_id);

-- ---------------------------------------------------------------------
-- webhooks (Configurações > Integrações)
-- ---------------------------------------------------------------------
create table public.webhooks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  url text not null,
  event text not null check (event in (
    'order_created', 'order_stage_changed', 'client_created', 'activity_created'
  )),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index webhooks_workspace_id_idx on public.webhooks (workspace_id);

-- ---------------------------------------------------------------------
-- notifications (in-app)
-- ---------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid references public.users (id) on delete cascade,
  title text not null,
  body text,
  type text not null default 'info' check (type in ('info', 'overdue_activity', 'automation')),
  read boolean not null default false,
  related_entity_type text,
  related_entity_id uuid,
  created_at timestamptz not null default now()
);

create index notifications_workspace_id_idx on public.notifications (workspace_id, user_id, read);

-- =========================================================================
-- Triggers: updated_at automático
-- =========================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger clients_set_updated_at before update on public.clients
  for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger orders_set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();
create trigger activities_set_updated_at before update on public.activities
  for each row execute function public.set_updated_at();
create trigger automations_set_updated_at before update on public.automations
  for each row execute function public.set_updated_at();

-- Histórico de estágio do pedido (append em stage_history ao mudar stage_id)
create or replace function public.orders_track_stage_change()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.stage_history = jsonb_build_array(
      jsonb_build_object(
        'stage_id', new.stage_id,
        'changed_at', now(),
        'changed_by', auth.uid()
      )
    );
  elsif new.stage_id is distinct from old.stage_id then
    new.stage_history = old.stage_history || jsonb_build_object(
      'stage_id', new.stage_id,
      'changed_at', now(),
      'changed_by', auth.uid()
    );
  end if;
  return new;
end;
$$;

create trigger orders_stage_history before insert or update on public.orders
  for each row execute function public.orders_track_stage_change();
