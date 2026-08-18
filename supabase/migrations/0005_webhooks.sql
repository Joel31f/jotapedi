-- =========================================================================
-- Jotapedi — webhooks de saída (Configurações → Integrações)
--
-- Usa a extensão pg_net do Supabase para disparar chamadas HTTP assíncronas
-- direto do Postgres, sem precisar de Edge Function. Se a extensão não
-- estiver disponível no seu projeto, habilite em Database → Extensions
-- (procure por "pg_net") antes de rodar este arquivo.
-- =========================================================================

create extension if not exists pg_net;

create or replace function public.dispatch_webhooks(p_workspace_id uuid, p_event text, p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  webhook record;
begin
  for webhook in
    select * from public.webhooks
    where workspace_id = p_workspace_id and event = p_event and active = true
  loop
    perform net.http_post(
      url := webhook.url,
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('event', p_event, 'data', p_payload)
    );
  end loop;
end;
$$;

create or replace function public.webhooks_on_order_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.dispatch_webhooks(
    new.workspace_id, 'order_created',
    jsonb_build_object('id', new.id, 'client_id', new.client_id, 'total', new.total)
  );
  return new;
end;
$$;

create trigger webhooks_orders_on_insert
  after insert on public.orders
  for each row execute function public.webhooks_on_order_insert();

create or replace function public.webhooks_on_order_stage_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.stage_id is distinct from old.stage_id then
    perform public.dispatch_webhooks(
      new.workspace_id, 'order_stage_changed',
      jsonb_build_object('id', new.id, 'client_id', new.client_id, 'stage_id', new.stage_id, 'total', new.total)
    );
  end if;
  return new;
end;
$$;

create trigger webhooks_orders_on_stage_change
  after update on public.orders
  for each row execute function public.webhooks_on_order_stage_change();

create or replace function public.webhooks_on_client_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.dispatch_webhooks(
    new.workspace_id, 'client_created',
    jsonb_build_object('id', new.id, 'name', new.name, 'email', new.email)
  );
  return new;
end;
$$;

create trigger webhooks_clients_on_insert
  after insert on public.clients
  for each row execute function public.webhooks_on_client_insert();

create or replace function public.webhooks_on_activity_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.dispatch_webhooks(
    new.workspace_id, 'activity_created',
    jsonb_build_object('id', new.id, 'title', new.title, 'type', new.type, 'due_at', new.due_at)
  );
  return new;
end;
$$;

create trigger webhooks_activities_on_insert
  after insert on public.activities
  for each row execute function public.webhooks_on_activity_insert();
