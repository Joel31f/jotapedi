-- =========================================================================
-- Jotapedi — funções de onboarding (workspace) e seed de demonstração
-- =========================================================================

-- ---------------------------------------------------------------------
-- Vincula convites pendentes (users.email = auth.email() e
-- auth_user_id ainda nulo) ao usuário autenticado. Chamar após login.
-- ---------------------------------------------------------------------
create or replace function public.accept_pending_invites()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
  set auth_user_id = auth.uid(), joined_at = coalesce(joined_at, now())
  where email = auth.email() and auth_user_id is null;
end;
$$;

grant execute on function public.accept_pending_invites() to authenticated;

-- ---------------------------------------------------------------------
-- Cria um novo workspace, torna o usuário atual admin, cria o pipeline
-- padrão e popula dados de demonstração.
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- Seed de dados de demonstração para um workspace novo
-- ---------------------------------------------------------------------
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

  insert into public.clients (workspace_id, name, company, document, email, phone, whatsapp, role_title, address_city, address_state, lead_stage, notes)
  values
    (p_workspace_id, 'Ana Ribeiro', 'Ribeiro Confecções', '12.345.678/0001-90', 'ana@ribeiroconf.com.br', '(11) 3344-5566', '(11) 98888-1111', 'Compradora', 'São Paulo', 'SP', 'cliente_ativo', 'Cliente antiga, sempre compra no início do mês.')
  returning id into cli_ana;

  insert into public.clients (workspace_id, name, company, document, email, phone, whatsapp, role_title, address_city, address_state, lead_stage, notes)
  values
    (p_workspace_id, 'Bruno Alves', 'Alves Distribuidora', '98.765.432/0001-10', 'bruno@alvesdist.com.br', '(21) 2233-4455', '(21) 97777-2222', 'Gerente Comercial', 'Rio de Janeiro', 'RJ', 'qualificado', 'Negociando volume maior para o próximo trimestre.')
  returning id into cli_bruno;

  insert into public.clients (workspace_id, name, company, document, email, phone, whatsapp, role_title, address_city, address_state, lead_stage, notes)
  values
    (p_workspace_id, 'Carla Souza', null, '123.456.789-00', 'carla.souza@gmail.com', '(31) 3322-1100', '(31) 96666-3333', null, 'Belo Horizonte', 'MG', 'contato_feito', 'Pediu orçamento pelo Instagram.')
  returning id into cli_carla;

  insert into public.clients (workspace_id, name, company, document, email, phone, whatsapp, role_title, address_city, address_state, lead_stage, notes)
  values
    (p_workspace_id, 'Diego Martins', 'Martins & Cia', '11.222.333/0001-44', 'diego@martinscia.com.br', '(41) 3030-4040', '(41) 95555-4444', 'Sócio', 'Curitiba', 'PR', 'novo_lead', 'Lead recebido pelo site.')
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
