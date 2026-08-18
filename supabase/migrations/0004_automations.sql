-- =========================================================================
-- Jotapedi — motor de automações
--
-- Gatilhos por evento (order_created, order_stage_changed, client_created)
-- disparam via triggers do Postgres nas tabelas orders/clients — funcionam
-- sempre, mesmo sem ninguém com o app aberto.
--
-- Gatilhos por tempo (activity_overdue, order_stale) dependem de avaliação
-- periódica. Sem pg_cron habilitado, o app chama run_scheduled_automations()
-- sempre que o workspace é carregado (ver AppShell) — cobre o uso normal do
-- dia a dia, mas não é garantido se ninguém abrir o app. Para garantia total,
-- habilite a extensão pg_cron (Database → Extensions) e rode:
--
--   select cron.schedule(
--     'run_scheduled_automations',
--     '*/15 * * * *',
--     $$select public.run_scheduled_automations();$$
--   );
-- =========================================================================

-- ---------------------------------------------------------------------
-- Executa a ação configurada de uma automação e registra o log.
-- p_dedupe = true evita disparar mais de uma vez para a mesma entidade
-- (usado pelos gatilhos por tempo, que são reavaliados periodicamente).
-- ---------------------------------------------------------------------
create or replace function public.execute_automation(
  p_automation_id uuid,
  p_related_entity_type text,
  p_related_entity_id uuid,
  p_context jsonb default '{}'::jsonb,
  p_dedupe boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_automation record;
  v_due_at timestamptz;
begin
  select * into v_automation from public.automations where id = p_automation_id;
  if v_automation is null or not v_automation.active then
    return;
  end if;

  if p_dedupe and exists (
    select 1 from public.automation_logs
    where automation_id = p_automation_id
      and related_entity_type = p_related_entity_type
      and related_entity_id = p_related_entity_id
  ) then
    return;
  end if;

  begin
    if v_automation.action_type = 'create_activity' then
      v_due_at := now() + make_interval(days => coalesce((v_automation.action_config->>'due_in_days')::int, 1));
      insert into public.activities (workspace_id, type, title, description, due_at, client_id, order_id, status)
      values (
        v_automation.workspace_id,
        coalesce(v_automation.action_config->>'activity_type', 'task'),
        coalesce(v_automation.action_config->>'title', v_automation.name),
        v_automation.action_config->>'description',
        v_due_at,
        case when p_related_entity_type = 'client' then p_related_entity_id
             else (p_context->>'client_id')::uuid end,
        case when p_related_entity_type = 'order' then p_related_entity_id else null end,
        'pending'
      );
    elsif v_automation.action_type = 'send_notification' then
      insert into public.notifications (workspace_id, title, body, type, related_entity_type, related_entity_id)
      values (
        v_automation.workspace_id,
        coalesce(v_automation.action_config->>'title', v_automation.name),
        v_automation.action_config->>'message',
        'automation',
        p_related_entity_type,
        p_related_entity_id
      );
    end if;

    insert into public.automation_logs (automation_id, workspace_id, status, details, related_entity_type, related_entity_id)
    values (p_automation_id, v_automation.workspace_id, 'success', p_context, p_related_entity_type, p_related_entity_id);
  exception when others then
    insert into public.automation_logs (automation_id, workspace_id, status, details, related_entity_type, related_entity_id)
    values (p_automation_id, v_automation.workspace_id, 'error', jsonb_build_object('error', sqlerrm), p_related_entity_type, p_related_entity_id);
  end;
end;
$$;

-- ---------------------------------------------------------------------
-- Gatilho: pedido criado
-- ---------------------------------------------------------------------
create or replace function public.automations_on_order_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  automation record;
begin
  for automation in
    select * from public.automations
    where workspace_id = new.workspace_id and trigger_type = 'order_created' and active = true
  loop
    perform public.execute_automation(automation.id, 'order', new.id, jsonb_build_object('client_id', new.client_id));
  end loop;
  return new;
end;
$$;

create trigger orders_automations_on_insert
  after insert on public.orders
  for each row execute function public.automations_on_order_insert();

-- ---------------------------------------------------------------------
-- Gatilho: pedido muda de estágio
-- trigger_config pode ter {"to_stage_id": "<uuid>"} para restringir a um
-- estágio específico; sem essa chave, dispara em qualquer mudança.
-- ---------------------------------------------------------------------
create or replace function public.automations_on_order_stage_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  automation record;
begin
  if new.stage_id is distinct from old.stage_id then
    for automation in
      select * from public.automations
      where workspace_id = new.workspace_id and trigger_type = 'order_stage_changed' and active = true
    loop
      if automation.trigger_config->>'to_stage_id' is null
         or automation.trigger_config->>'to_stage_id' = new.stage_id::text then
        perform public.execute_automation(
          automation.id, 'order', new.id,
          jsonb_build_object('client_id', new.client_id, 'stage_id', new.stage_id)
        );
      end if;
    end loop;
  end if;
  return new;
end;
$$;

create trigger orders_automations_on_stage_change
  after update on public.orders
  for each row execute function public.automations_on_order_stage_change();

-- ---------------------------------------------------------------------
-- Gatilho: cliente cadastrado
-- ---------------------------------------------------------------------
create or replace function public.automations_on_client_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  automation record;
begin
  for automation in
    select * from public.automations
    where workspace_id = new.workspace_id and trigger_type = 'client_created' and active = true
  loop
    perform public.execute_automation(automation.id, 'client', new.id, '{}'::jsonb);
  end loop;
  return new;
end;
$$;

create trigger clients_automations_on_insert
  after insert on public.clients
  for each row execute function public.automations_on_client_insert();

-- ---------------------------------------------------------------------
-- Gatilhos por tempo: atividade atrasada há X dias / pedido sem
-- movimentação há X dias. Chamado pelo app ao carregar o workspace, ou
-- por pg_cron se configurado (ver topo do arquivo).
-- ---------------------------------------------------------------------
create or replace function public.run_scheduled_automations()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  automation record;
  activity_row record;
  order_row record;
begin
  for automation in
    select * from public.automations where trigger_type = 'activity_overdue' and active = true
  loop
    for activity_row in
      select * from public.activities
      where workspace_id = automation.workspace_id
        and status = 'pending'
        and due_at < now() - make_interval(days => coalesce((automation.trigger_config->>'days')::int, 1))
    loop
      perform public.execute_automation(automation.id, 'activity', activity_row.id, '{}'::jsonb, true);
    end loop;
  end loop;

  for automation in
    select * from public.automations where trigger_type = 'order_stale' and active = true
  loop
    for order_row in
      select * from public.orders
      where workspace_id = automation.workspace_id
        and updated_at < now() - make_interval(days => coalesce((automation.trigger_config->>'days')::int, 3))
    loop
      perform public.execute_automation(
        automation.id, 'order', order_row.id,
        jsonb_build_object('client_id', order_row.client_id), true
      );
    end loop;
  end loop;
end;
$$;

grant execute on function public.run_scheduled_automations() to authenticated;
