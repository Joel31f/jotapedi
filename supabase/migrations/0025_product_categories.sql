-- =========================================================================
-- Lista de categorias de produtos: o banco devolve só as categorias
-- diferentes, em vez de o navegador baixar a categoria de todos os produtos.
--
-- Roda com as permissões de quem chama (security invoker), então as regras de
-- acesso continuam valendo. Só cria uma função, não altera nenhum dado.
-- Seguro de rodar mais de uma vez.
-- =========================================================================

create or replace function public.product_categories(p_workspace_id uuid)
returns table (category text)
language sql
stable
security invoker
set search_path = public
as $$
  select distinct p.category
  from public.products p
  where p.workspace_id = p_workspace_id
    and p.category is not null
  order by 1;
$$;

revoke execute on function public.product_categories(uuid) from public, anon;
grant execute on function public.product_categories(uuid) to authenticated;
