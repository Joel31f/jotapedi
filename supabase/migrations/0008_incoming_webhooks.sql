-- =========================================================================
-- Jotapedi — webhooks de entrada (receber dados de sistemas externos)
--
-- Cada linha é um endpoint com token único. A Edge Function
-- "receive-webhook" (em supabase/functions/receive-webhook) valida o
-- token e insere o registro no recurso configurado. Hoje só "client"
-- (captura de leads) está implementado — outros recursos podem ser
-- adicionados depois reaproveitando essa mesma tabela.
-- =========================================================================

create table public.incoming_webhooks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  resource text not null default 'client' check (resource in ('client')),
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index incoming_webhooks_workspace_id_idx on public.incoming_webhooks (workspace_id);
create index incoming_webhooks_token_idx on public.incoming_webhooks (token);

alter table public.incoming_webhooks enable row level security;

create policy "incoming_webhooks_all" on public.incoming_webhooks
  for all using (workspace_id in (select public.get_my_workspace_ids()))
  with check (workspace_id in (select public.get_my_workspace_ids()));
