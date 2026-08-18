-- =========================================================================
-- Consolida o endereço dos clientes em um campo único de texto livre
-- (mantendo o CEP separado) e permite múltiplos telefones e emails.
-- =========================================================================

alter table public.clients
  add column address text,
  add column emails text[] not null default '{}',
  add column phones text[] not null default '{}';

-- Backfill: junta os campos de endereço antigos num texto único.
update public.clients
set address = (
  select nullif(string_agg(part, ', '), '')
  from unnest(array[
    nullif(trim(concat_ws(' ', address_street, address_number)), ''),
    nullif(trim(address_complement), ''),
    nullif(trim(address_neighborhood), ''),
    nullif(trim(concat_ws(' - ', address_city, address_state)), '')
  ]) as part
  where part is not null
);

-- Backfill: email/phone antigos viram o primeiro item das novas listas.
update public.clients
set emails = case when email is not null and trim(email) <> '' then array[trim(email)] else '{}'::text[] end,
    phones = case when phone is not null and trim(phone) <> '' then array[trim(phone)] else '{}'::text[] end;

alter table public.clients
  drop column address_street,
  drop column address_number,
  drop column address_complement,
  drop column address_neighborhood,
  drop column address_city,
  drop column address_state,
  drop column email,
  drop column phone;

-- Coluna derivada usada na busca da listagem de clientes (nome/empresa/documento/emails),
-- já que "email.ilike" deixou de funcionar depois que email virou uma lista (emails[]).
-- Mantida via trigger (não como "generated column") porque lower()/array_to_string
-- não passam na checagem de imutabilidade exigida por GENERATED ALWAYS AS ... STORED.
alter table public.clients
  add column search_text text;

update public.clients
set search_text = lower(
  coalesce(name, '') || ' ' ||
  coalesce(company, '') || ' ' ||
  coalesce(document, '') || ' ' ||
  coalesce(array_to_string(emails, ' '), '')
);

create or replace function public.clients_set_search_text()
returns trigger
language plpgsql
as $$
begin
  new.search_text := lower(
    coalesce(new.name, '') || ' ' ||
    coalesce(new.company, '') || ' ' ||
    coalesce(new.document, '') || ' ' ||
    coalesce(array_to_string(new.emails, ' '), '')
  );
  return new;
end;
$$;

create trigger clients_set_search_text
  before insert or update on public.clients
  for each row execute function public.clients_set_search_text();

-- ---------------------------------------------------------------------
-- Ajusta funções que referenciavam as colunas antigas (email/phone/address_*).
-- ---------------------------------------------------------------------

create or replace function public.webhooks_on_client_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.dispatch_webhooks(
    new.workspace_id, 'client_created',
    jsonb_build_object('id', new.id, 'name', new.name, 'email', new.emails[1])
  );
  return new;
end;
$$;

create or replace function public.seed_demo_data(p_workspace_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  st_orcamento uuid;
  st_confirmado uuid;
  st_pago uuid;
  st_enviado uuid;

  tag_vip uuid;
  tag_novo uuid;
  tag_recorrente uuid;

  cli_ana uuid;
  cli_bruno uuid;
  cli_carla uuid;
  cli_diego uuid;

  prod_a uuid;
  prod_b uuid;
  prod_c uuid;
  prod_d uuid;
  prod_e uuid;

  ord_1 uuid;
  ord_2 uuid;
  ord_3 uuid;
begin
  select id into st_orcamento from public.pipeline_stages where workspace_id = p_workspace_id and name = 'Orçamento';
  select id into st_confirmado from public.pipeline_stages where workspace_id = p_workspace_id and name = 'Confirmado';
  select id into st_pago from public.pipeline_stages where workspace_id = p_workspace_id and name = 'Pago';
  select id into st_enviado from public.pipeline_stages where workspace_id = p_workspace_id and name = 'Enviado';

  insert into public.tags (workspace_id, name, color) values
    (p_workspace_id, 'VIP', '#00e676'),
    (p_workspace_id, 'Novo', '#4d9de0'),
    (p_workspace_id, 'Recorrente', '#c084fc');
  select id into tag_vip from public.tags where workspace_id = p_workspace_id and name = 'VIP';
  select id into tag_novo from public.tags where workspace_id = p_workspace_id and name = 'Novo';
  select id into tag_recorrente from public.tags where workspace_id = p_workspace_id and name = 'Recorrente';

  insert into public.clients (workspace_id, name, company, document, emails, phones, whatsapp, role_title, address, lead_stage, notes)
  values
    (p_workspace_id, 'Ana Ribeiro', 'Ribeiro Confecções', '12.345.678/0001-90', array['ana@ribeiroconf.com.br'], array['(11) 3344-5566'], '(11) 98888-1111', 'Compradora', 'São Paulo - SP', 'cliente_ativo', 'Cliente antiga, sempre compra no início do mês.')
  returning id into cli_ana;

  insert into public.clients (workspace_id, name, company, document, emails, phones, whatsapp, role_title, address, lead_stage, notes)
  values
    (p_workspace_id, 'Bruno Alves', 'Alves Distribuidora', '98.765.432/0001-10', array['bruno@alvesdist.com.br'], array['(21) 2233-4455'], '(21) 97777-2222', 'Gerente Comercial', 'Rio de Janeiro - RJ', 'qualificado', 'Negociando volume maior para o próximo trimestre.')
  returning id into cli_bruno;

  insert into public.clients (workspace_id, name, company, document, emails, phones, whatsapp, role_title, address, lead_stage, notes)
  values
    (p_workspace_id, 'Carla Souza', null, '123.456.789-00', array['carla.souza@gmail.com'], array['(31) 3322-1100'], '(31) 96666-3333', null, 'Belo Horizonte - MG', 'contato_feito', 'Pediu orçamento pelo Instagram.')
  returning id into cli_carla;

  insert into public.clients (workspace_id, name, company, document, emails, phones, whatsapp, role_title, address, lead_stage, notes)
  values
    (p_workspace_id, 'Diego Martins', 'Martins & Cia', '11.222.333/0001-44', array['diego@martinscia.com.br'], array['(41) 3030-4040'], '(41) 95555-4444', 'Sócio', 'Curitiba - PR', 'novo_lead', 'Lead recebido pelo site.')
  returning id into cli_diego;

  insert into public.client_tags (client_id, tag_id) values
    (cli_ana, tag_vip), (cli_ana, tag_recorrente),
    (cli_bruno, tag_recorrente),
    (cli_diego, tag_novo);

  insert into public.products (workspace_id, sku, description, unit, sale_price, cost_price, category, min_stock, ncm, active)
  values
    (p_workspace_id, 'CAM-001', 'Camiseta Básica Algodão', 'UN', 39.90, 18.00, 'Vestuário', 20, '6109.10.00', true)
  returning id into prod_a;

  insert into public.products (workspace_id, sku, description, unit, sale_price, cost_price, category, min_stock, ncm, active)
  values
    (p_workspace_id, 'CAL-002', 'Calça Jeans Slim', 'UN', 129.90, 62.00, 'Vestuário', 10, '6203.42.00', true)
  returning id into prod_b;

  insert into public.products (workspace_id, sku, description, unit, sale_price, cost_price, category, min_stock, ncm, active)
  values
    (p_workspace_id, 'MOL-003', 'Moletom Capuz', 'UN', 149.90, 70.00, 'Vestuário', 8, '6110.20.00', true)
  returning id into prod_c;

  insert into public.products (workspace_id, sku, description, unit, sale_price, cost_price, category, min_stock, ncm, active)
  values
    (p_workspace_id, 'BON-004', 'Boné Aba Curva', 'UN', 49.90, 20.00, 'Acessórios', 15, '6505.00.90', true)
  returning id into prod_d;

  insert into public.products (workspace_id, sku, description, unit, sale_price, cost_price, category, min_stock, ncm, active)
  values
    (p_workspace_id, 'MEI-005', 'Meia Cano Alto (par)', 'PAR', 19.90, 8.00, 'Acessórios', 30, '6115.95.00', false)
  returning id into prod_e;

  -- Pedido 1: Pago
  insert into public.orders (workspace_id, client_id, stage_id, subtotal, discount_type, discount_value, total, notes, created_by, created_at)
  values (p_workspace_id, cli_ana, st_orcamento, 519.60, 'percent', 5, 493.62, 'Compra recorrente mensal.', p_user_id, now() - interval '18 days')
  returning id into ord_1;

  insert into public.order_items (order_id, product_id, description, quantity, unit_price, discount_type, discount_value, total, position) values
    (ord_1, prod_a, 'Camiseta Básica Algodão', 8, 39.90, 'value', 0, 319.20, 0),
    (ord_1, prod_d, 'Boné Aba Curva', 4, 49.90, 'value', 0, 199.60, 1);

  update public.orders set stage_id = st_confirmado where id = ord_1;
  update public.orders set stage_id = st_pago where id = ord_1;

  -- Pedido 2: Confirmado
  insert into public.orders (workspace_id, client_id, stage_id, subtotal, discount_type, discount_value, total, notes, created_by, created_at)
  values (p_workspace_id, cli_bruno, st_orcamento, 779.40, 'value', 30, 749.40, 'Aguardando confirmação de pagamento.', p_user_id, now() - interval '4 days')
  returning id into ord_2;

  insert into public.order_items (order_id, product_id, description, quantity, unit_price, discount_type, discount_value, total, position) values
    (ord_2, prod_b, 'Calça Jeans Slim', 6, 129.90, 'value', 0, 779.40, 0);

  update public.orders set stage_id = st_confirmado where id = ord_2;

  -- Pedido 3: Orçamento
  insert into public.orders (workspace_id, client_id, stage_id, subtotal, discount_type, discount_value, total, notes, created_by, created_at)
  values (p_workspace_id, cli_carla, st_orcamento, 299.80, 'value', 0, 299.80, 'Aguardando retorno da cliente.', p_user_id, now() - interval '1 day')
  returning id into ord_3;

  insert into public.order_items (order_id, product_id, description, quantity, unit_price, discount_type, discount_value, total, position) values
    (ord_3, prod_c, 'Moletom Capuz', 2, 149.90, 'value', 0, 299.80, 0);

  -- Atividades: atrasada, hoje, futura
  insert into public.activities (workspace_id, type, title, description, due_at, client_id, order_id, status, assigned_to, created_by) values
    (p_workspace_id, 'call', 'Ligar para confirmar pagamento', 'Confirmar se o boleto já foi pago.', now() - interval '2 days', cli_bruno, ord_2, 'pending', p_user_id, p_user_id),
    (p_workspace_id, 'whatsapp', 'Enviar catálogo atualizado', 'Cliente pediu novidades da coleção.', now() + interval '2 hours', cli_carla, ord_3, 'pending', p_user_id, p_user_id),
    (p_workspace_id, 'meeting', 'Reunião comercial trimestral', 'Revisar volume de compras do próximo trimestre.', now() + interval '3 days', cli_bruno, null, 'pending', p_user_id, p_user_id),
    (p_workspace_id, 'email', 'Enviar boas-vindas', 'Novo lead recebido pelo site institucional.', now() + interval '1 day', cli_diego, null, 'pending', p_user_id, p_user_id),
    (p_workspace_id, 'task', 'Separar pedido para envio', 'Pedido pago, preparar para despacho.', now() - interval '6 hours', cli_ana, ord_1, 'completed', p_user_id, p_user_id);

  update public.activities set completed_at = now() - interval '5 hours'
  where workspace_id = p_workspace_id and status = 'completed';
end;
$$;

grant execute on function public.seed_demo_data(uuid, uuid) to authenticated;
