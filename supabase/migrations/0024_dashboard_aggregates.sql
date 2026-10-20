-- =========================================================================
-- Dashboard: o banco faz as contas e devolve só o resultado, em vez de o
-- navegador baixar todos os pedidos para somar e contar.
--
-- As funções rodam com as permissões de quem chama (security invoker), então
-- as regras de acesso por usuário (RLS) continuam valendo: quem só vê os
-- próprios pedidos continua vendo só os números deles.
--
-- Só cria funções, não altera nenhum dado. Seguro de rodar mais de uma vez.
-- =========================================================================

-- Números do período (cartões do topo): total de pedidos, pedidos ganhos e faturamento.
create or replace function public.dashboard_month_metrics(
  p_workspace_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns table (total_orders bigint, won_orders bigint, revenue numeric)
language sql
stable
security invoker
set search_path = public
as $$
  select
    count(*)::bigint,
    (count(*) filter (where s.is_won))::bigint,
    coalesce(sum(o.total) filter (where s.is_won), 0)
  from public.orders o
  join public.pipeline_stages s on s.id = o.stage_id
  where o.workspace_id = p_workspace_id
    and o.created_at >= p_from
    and o.created_at <= p_to;
$$;

-- Faturamento por mês (gráfico dos últimos 6 meses). O mês é calculado no
-- fuso do usuário, para bater com o que a tela mostrava antes.
create or replace function public.dashboard_revenue_trend(
  p_workspace_id uuid,
  p_from timestamptz,
  p_tz text default 'America/Sao_Paulo'
)
returns table (month text, revenue numeric)
language sql
stable
security invoker
set search_path = public
as $$
  select
    to_char(o.created_at at time zone p_tz, 'YYYY-MM') as month,
    coalesce(sum(o.total), 0) as revenue
  from public.orders o
  join public.pipeline_stages s on s.id = o.stage_id
  where o.workspace_id = p_workspace_id
    and o.created_at >= p_from
    and s.is_won
  group by 1
  order by 1;
$$;

-- Pipeline resumido: quantidade e valor por etapa, só dos pedidos com
-- atividade desde a data informada (a tela usa os últimos 30 dias).
create or replace function public.dashboard_pipeline_summary(
  p_workspace_id uuid,
  p_since timestamptz
)
returns table (stage_id uuid, orders_count bigint, total_value numeric)
language sql
stable
security invoker
set search_path = public
as $$
  select
    o.stage_id,
    count(*)::bigint,
    coalesce(sum(o.total), 0)
  from public.orders o
  where o.workspace_id = p_workspace_id
    and o.updated_at >= p_since
  group by o.stage_id;
$$;

revoke execute on function public.dashboard_month_metrics(uuid, timestamptz, timestamptz) from public, anon;
revoke execute on function public.dashboard_revenue_trend(uuid, timestamptz, text) from public, anon;
revoke execute on function public.dashboard_pipeline_summary(uuid, timestamptz) from public, anon;

grant execute on function public.dashboard_month_metrics(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.dashboard_revenue_trend(uuid, timestamptz, text) to authenticated;
grant execute on function public.dashboard_pipeline_summary(uuid, timestamptz) to authenticated;
