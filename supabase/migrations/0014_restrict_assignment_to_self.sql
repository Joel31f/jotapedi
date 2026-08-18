-- =========================================================================
-- Reforça no banco (não só na tela) que um membro que não é admin só pode
-- atribuir um pedido/atividade a si mesmo (ou deixar sem responsável).
-- Admins continuam podendo atribuir a qualquer membro do workspace.
-- =========================================================================

drop policy if exists "orders_insert" on public.orders;
drop policy if exists "orders_update" on public.orders;

create policy "orders_insert" on public.orders
  for insert with check (
    workspace_id in (select public.get_my_workspace_ids())
    and (
      public.is_workspace_admin(workspace_id)
      or assigned_to is null
      or assigned_to = public.get_my_user_id(workspace_id)
    )
  );

create policy "orders_update" on public.orders
  for update using (
    workspace_id in (select public.get_my_workspace_ids())
    and (
      public.can_view_all_records(workspace_id)
      or created_by = public.get_my_user_id(workspace_id)
      or assigned_to = public.get_my_user_id(workspace_id)
    )
  )
  with check (
    workspace_id in (select public.get_my_workspace_ids())
    and (
      public.is_workspace_admin(workspace_id)
      or assigned_to is null
      or assigned_to = public.get_my_user_id(workspace_id)
    )
  );

drop policy if exists "activities_insert" on public.activities;
drop policy if exists "activities_update" on public.activities;

create policy "activities_insert" on public.activities
  for insert with check (
    workspace_id in (select public.get_my_workspace_ids())
    and (
      public.is_workspace_admin(workspace_id)
      or assigned_to is null
      or assigned_to = public.get_my_user_id(workspace_id)
    )
  );

create policy "activities_update" on public.activities
  for update using (
    workspace_id in (select public.get_my_workspace_ids())
    and (
      public.can_view_all_records(workspace_id)
      or created_by = public.get_my_user_id(workspace_id)
      or assigned_to = public.get_my_user_id(workspace_id)
    )
  )
  with check (
    workspace_id in (select public.get_my_workspace_ids())
    and (
      public.is_workspace_admin(workspace_id)
      or assigned_to is null
      or assigned_to = public.get_my_user_id(workspace_id)
    )
  );
