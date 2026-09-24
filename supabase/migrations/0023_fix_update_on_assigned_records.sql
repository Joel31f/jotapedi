-- =========================================================================
-- Corrige: membro que não é admin não conseguia editar/mover pedidos e
-- atividades atribuídos a OUTRA pessoa (erro "new row violates row-level
-- security policy").
--
-- A regra da migration 0014 usava WITH CHECK (assigned_to é nulo, é eu, ou
-- sou admin) no UPDATE. Como o WITH CHECK enxerga o registro DEPOIS da
-- edição, qualquer alteração (até só mudar a etapa) num pedido atribuído a
-- outro membro era barrada — mesmo sem mudar o responsável.
--
-- Agora o UPDATE só exige que o registro continue no mesmo workspace, e a
-- regra "não-admin só atribui a si mesmo" passa a valer só quando o
-- responsável realmente muda (via trigger, que enxerga o antes e o depois).
-- Seguro de rodar mais de uma vez.
-- =========================================================================

drop policy if exists "orders_update" on public.orders;

create policy "orders_update" on public.orders
  for update using (
    workspace_id in (select public.get_my_workspace_ids())
    and (
      public.can_view_all_records(workspace_id)
      or created_by = public.get_my_user_id(workspace_id)
      or assigned_to = public.get_my_user_id(workspace_id)
    )
  )
  with check (workspace_id in (select public.get_my_workspace_ids()));

drop policy if exists "activities_update" on public.activities;

create policy "activities_update" on public.activities
  for update using (
    workspace_id in (select public.get_my_workspace_ids())
    and (
      public.can_view_all_records(workspace_id)
      or created_by = public.get_my_user_id(workspace_id)
      or assigned_to = public.get_my_user_id(workspace_id)
    )
  )
  with check (workspace_id in (select public.get_my_workspace_ids()));

-- Só barra quando a edição vem direto de um usuário logado (role
-- "authenticated"); funções internas/automações não são afetadas.
create or replace function public.enforce_assignment_rule()
returns trigger
language plpgsql
as $$
begin
  if current_user = 'authenticated'
     and new.assigned_to is not null
     and new.assigned_to is distinct from old.assigned_to
     and not public.is_workspace_admin(new.workspace_id)
     and new.assigned_to is distinct from public.get_my_user_id(new.workspace_id)
  then
    raise exception 'Apenas administradores podem atribuir para outra pessoa.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists orders_enforce_assignment on public.orders;
create trigger orders_enforce_assignment
  before update on public.orders
  for each row execute function public.enforce_assignment_rule();

drop trigger if exists activities_enforce_assignment on public.activities;
create trigger activities_enforce_assignment
  before update on public.activities
  for each row execute function public.enforce_assignment_rule();
