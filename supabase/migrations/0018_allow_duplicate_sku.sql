-- =========================================================================
-- Permite repetir o mesmo SKU em mais de um produto do mesmo workspace
-- (antes era bloqueado por uma constraint de unicidade).
-- =========================================================================

do $$
declare
  v_constraint_name text;
begin
  select con.conname into v_constraint_name
  from pg_constraint con
  where con.conrelid = 'public.products'::regclass
    and con.contype = 'u'
    and (
      select array_agg(attname order by attname)
      from pg_attribute
      where attrelid = con.conrelid and attnum = any(con.conkey)
    ) = array['sku', 'workspace_id'];

  if v_constraint_name is not null then
    execute format('alter table public.products drop constraint %I', v_constraint_name);
  end if;
end $$;
