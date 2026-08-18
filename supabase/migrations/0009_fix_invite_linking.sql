-- =========================================================================
-- Jotapedi — corrige risco de vínculo cruzado ao aceitar convites
--
-- accept_pending_invites() linkava qualquer convite pendente que
-- batesse com auth.email() ao usuário autenticado, mesmo se esse
-- usuário já fosse membro do MESMO workspace por outra linha (ex: o
-- próprio admin trocou o email do perfil e "herdou" um convite
-- pendente daquele email no mesmo workspace, criando duas linhas de
-- membership confusas para a mesma conta).
--
-- Agora só linka se o auth_user_id ainda não é membro daquele
-- workspace por nenhuma outra linha. Também adiciona uma constraint
-- de segurança: nunca duas linhas de "users" no mesmo workspace podem
-- apontar para o mesmo auth_user_id.
-- =========================================================================

create or replace function public.accept_pending_invites()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users as pending
  set auth_user_id = auth.uid(), joined_at = coalesce(pending.joined_at, now())
  where pending.email = auth.email()
    and pending.auth_user_id is null
    and not exists (
      select 1 from public.users existing
      where existing.workspace_id = pending.workspace_id
        and existing.auth_user_id = auth.uid()
    );
end;
$$;

create unique index if not exists users_workspace_auth_user_unique
  on public.users (workspace_id, auth_user_id)
  where auth_user_id is not null;
