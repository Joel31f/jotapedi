-- =========================================================================
-- jfjsolucoes@gmail.com passa a ter acesso de admin em todas as áreas de
-- trabalho — as que já existem hoje (backfill) e qualquer uma criada daqui
-- pra frente (create_workspace atualizado). Sem mudança de tela: o
-- seletor de área de trabalho que já existe no menu da conta cobre a
-- necessidade de "escolher qual acessar".
-- =========================================================================

insert into public.users (workspace_id, email, name, role, auth_user_id, joined_at)
select w.id, 'jfjsolucoes@gmail.com', 'jfjsolucoes@gmail.com', 'admin', null, null
from public.workspaces w
where not exists (
  select 1 from public.users u where u.workspace_id = w.id and u.email = 'jfjsolucoes@gmail.com'
);

create or replace function public.create_workspace(p_name text, p_user_name text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace_id uuid;
  v_user_id uuid;
begin
  insert into public.workspaces (name, owner_id)
  values (p_name, auth.uid())
  returning id into v_workspace_id;

  insert into public.users (workspace_id, auth_user_id, email, name, role, joined_at)
  values (v_workspace_id, auth.uid(), auth.email(), coalesce(p_user_name, auth.email()), 'admin', now())
  returning id into v_user_id;

  if auth.email() is distinct from 'jfjsolucoes@gmail.com' then
    insert into public.users (workspace_id, email, name, role, auth_user_id, joined_at)
    values (v_workspace_id, 'jfjsolucoes@gmail.com', 'jfjsolucoes@gmail.com', 'admin', null, null);
  end if;

  insert into public.pipeline_stages (workspace_id, name, position, color, is_won)
  values
    (v_workspace_id, 'Orçamento', 0, '#8a9a8d', false),
    (v_workspace_id, 'Confirmado', 1, '#4d9de0', false),
    (v_workspace_id, 'Pago', 2, '#00e676', true),
    (v_workspace_id, 'Enviado', 3, '#c084fc', false);

  perform public.seed_demo_data(v_workspace_id, v_user_id);

  return v_workspace_id;
end;
$$;

grant execute on function public.create_workspace(text, text) to authenticated;
