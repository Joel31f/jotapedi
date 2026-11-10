-- =========================================================================
-- Etapa que bloqueia o pedido (ex.: "Em produção").
--
-- Quando um pedido está numa etapa marcada com locks_order, SÓ administradores
-- podem alterá-lo: editar dados, trocar itens, mudar de etapa ou excluir.
-- A regra vale no banco (não só na tela). Qualquer pessoa ainda pode LEVAR um
-- pedido para a etapa bloqueada; depois que entra, só administrador mexe.
--
-- Só barra quando a edição vem direto de um usuário logado (role
-- "authenticated"); o SQL Editor do Supabase, funções internas e automações
-- não são afetados. Seguro de rodar mais de uma vez.
-- =========================================================================

alter table public.pipeline_stages
  add column if not exists locks_order boolean not null default false;

create or replace function public.stage_locks_order(p_stage_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select locks_order from public.pipeline_stages where id = p_stage_id), false);
$$;

grant execute on function public.stage_locks_order(uuid) to authenticated;

-- Pedido: bloqueia UPDATE e DELETE de quem não é admin quando a etapa ATUAL
-- (antes da edição) é bloqueada.
create or replace function public.enforce_order_lock()
returns trigger
language plpgsql
as $$
begin
  if current_user = 'authenticated'
     and public.stage_locks_order(old.stage_id)
     and not public.is_workspace_admin(old.workspace_id)
  then
    raise exception 'Pedido bloqueado: somente administradores podem alterar um pedido nesta etapa.'
      using errcode = '42501';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_enforce_lock on public.orders;
create trigger orders_enforce_lock
  before update or delete on public.orders
  for each row execute function public.enforce_order_lock();

-- Itens do pedido: mesma regra, olhando a etapa do pedido pai.
create or replace function public.assert_order_not_locked(p_order_id uuid)
returns void
language plpgsql
as $$
declare
  v_stage uuid;
  v_workspace uuid;
begin
  select stage_id, workspace_id into v_stage, v_workspace
  from public.orders
  where id = p_order_id;

  -- Pedido já não existe (ex.: exclusão em cascata): nada a verificar.
  if not found then
    return;
  end if;

  if public.stage_locks_order(v_stage) and not public.is_workspace_admin(v_workspace) then
    raise exception 'Pedido bloqueado: somente administradores podem alterar os itens de um pedido nesta etapa.'
      using errcode = '42501';
  end if;
end;
$$;

create or replace function public.enforce_order_items_lock()
returns trigger
language plpgsql
as $$
begin
  if current_user = 'authenticated' then
    if tg_op in ('UPDATE', 'DELETE') then
      perform public.assert_order_not_locked(old.order_id);
    end if;
    if tg_op in ('INSERT', 'UPDATE') then
      perform public.assert_order_not_locked(new.order_id);
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists order_items_enforce_lock on public.order_items;
create trigger order_items_enforce_lock
  before insert or update or delete on public.order_items
  for each row execute function public.enforce_order_items_lock();
