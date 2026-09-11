-- =========================================================================
-- Marcas deixam de ser fixas no código (MoldPlast/MarcoPlast) e passam a
-- ser cadastráveis por workspace, com logo enviada pelo usuário.
-- Volta a ser opcional escolher uma marca ao salvar um pedido.
-- =========================================================================

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  logo_url text,
  created_at timestamptz not null default now()
);

create index brands_workspace_id_idx on public.brands (workspace_id);

alter table public.brands enable row level security;

create policy "brands_all" on public.brands
  for all using (workspace_id in (select public.get_my_workspace_ids()))
  with check (workspace_id in (select public.get_my_workspace_ids()));

-- Bucket de storage para as logos das marcas (uma pasta por workspace_id).
insert into storage.buckets (id, name, public)
values ('brand-logos', 'brand-logos', true)
on conflict (id) do nothing;

create policy "brand_logos_public_read"
  on storage.objects for select
  using (bucket_id = 'brand-logos');

create policy "brand_logos_workspace_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'brand-logos'
    and (storage.foldername(name))[1]::uuid in (select public.get_my_workspace_ids())
  );

create policy "brand_logos_workspace_update"
  on storage.objects for update
  using (
    bucket_id = 'brand-logos'
    and (storage.foldername(name))[1]::uuid in (select public.get_my_workspace_ids())
  );

create policy "brand_logos_workspace_delete"
  on storage.objects for delete
  using (
    bucket_id = 'brand-logos'
    and (storage.foldername(name))[1]::uuid in (select public.get_my_workspace_ids())
  );

-- Novo vínculo do pedido com a marca (dinâmica), substituindo o enum fixo.
alter table public.orders
  add column brand_id uuid references public.brands (id) on delete set null;

-- Preserva os pedidos já marcados como moldplast/marcoplast: cria essas
-- duas marcas nos workspaces que já as usam, reaproveitando as logos
-- estáticas que já existem em /public/brands.
insert into public.brands (workspace_id, name, logo_url)
select distinct workspace_id, 'MoldPlast', '/brands/moldplast.jpeg'
from public.orders
where brand = 'moldplast';

insert into public.brands (workspace_id, name, logo_url)
select distinct workspace_id, 'MarcoPlast', '/brands/marcoplast.jpeg'
from public.orders
where brand = 'marcoplast';

update public.orders o
set brand_id = b.id
from public.brands b
where o.brand = 'moldplast'
  and b.workspace_id = o.workspace_id
  and b.name = 'MoldPlast';

update public.orders o
set brand_id = b.id
from public.brands b
where o.brand = 'marcoplast'
  and b.workspace_id = o.workspace_id
  and b.name = 'MarcoPlast';

-- Não removemos a coluna antiga "brand" aqui de propósito: o site em
-- produção ainda vai usá-la até o deploy da versão nova. A limpeza fica
-- para uma migration futura (0017), depois de confirmar que já publicamos.
