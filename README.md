# Jotapedi

CRM de pedidos. React + TypeScript + Tailwind CSS v4 + shadcn/ui no frontend, Supabase (Postgres + Auth + Realtime) no backend.

## Status

Todas as 7 fases do roadmap estão concluídas: Auth + base + banco, Clientes + Produtos, Pedidos (Kanban), Atividades + Calendário, Dashboard + Relatórios, Automações, Configurações + Integrações — incluindo permissões granulares por membro da equipe.

## Configurar o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No **SQL Editor** do projeto, execute nesta ordem todos os arquivos em `supabase/migrations/` (0001 até 0008).
3. Em **Project Settings → API**, copie a **Project URL** e a **anon public key**.
4. Em **Authentication → URL Configuration**, garanta que `http://localhost:5173` (ou a URL do seu deploy) está na lista de Redirect URLs.
5. (Opcional, recomendado antes de produção) Em **Authentication → Sign In / Providers → Email**, religue o **"Confirm email"** caso tenha desligado para testes.

### Automações (gatilhos por tempo)

Os gatilhos "Atividade atrasada" e "Pedido sem movimentação" são avaliados sempre que alguém abre o app. Para garantia total mesmo sem ninguém logado, habilite a extensão `pg_cron` (Database → Extensions) e rode:

```sql
select cron.schedule(
  'run_scheduled_automations',
  '*/15 * * * *',
  $$select public.run_scheduled_automations();$$
);
```

### Webhooks de entrada (Edge Function)

O endpoint que recebe webhooks externos (`supabase/functions/receive-webhook`) precisa ser publicado com a CLI do Supabase:

```bash
npx supabase login
npx supabase link --project-ref <seu-project-ref>
npx supabase functions deploy receive-webhook
```

Sem esse deploy, os endpoints criados em Configurações → Integrações → Entrada ficam com a URL configurada mas não respondem ainda.

## Rodar localmente

```bash
npm install
cp .env.example .env
```

Edite `.env` com a URL e a anon key do seu projeto Supabase. Depois:

```bash
npm run dev
```

## Login com Google

Não configurado (apenas email/senha). Para habilitar depois: crie credenciais OAuth no Google Cloud Console, cadastre o Client ID/Secret em **Authentication → Providers → Google** no Supabase, e adicione o botão de login social na página `src/pages/auth/LoginPage.tsx` chamando `supabase.auth.signInWithOAuth({ provider: 'google' })`.

## Deploy (Vercel)

```bash
npm run build
```

Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` como variáveis de ambiente no projeto Vercel. Framework preset: Vite.

## Permissões de equipe

Cada membro convidado (role "Membro") tem:
- **Seções visíveis**: controla o que aparece no menu lateral e bloqueia a rota direto (`section_access` na tabela `users`). É uma restrição de navegação/UX, não uma policy de RLS por tabela.
- **Ver todos os pedidos e atividades**: quando desligado, o membro só vê pedidos e atividades onde é `created_by` ou `assigned_to`. Reforçado via RLS (`can_view_all_records`, migration `0007_permissions.sql`) — vale mesmo se alguém tentar acessar a API diretamente. **Clientes/leads não são restritos** — todo mundo do workspace vê todos os clientes.

Admins sempre têm acesso completo, independente dessas configurações. Se você rodou uma versão anterior da migration `0007` que criou a coluna `can_view_all_orders`, pode rodar o arquivo de novo sem problema — ele remove a coluna antiga e recria com o nome certo.

## Notas sobre o schema

Além das tabelas pedidas (`workspaces`, `users`, `clients`, `products`, `orders`, `order_items`, `activities`, `automations`, `automation_logs`, `pipeline_stages`, `tags`), foram criadas tabelas de apoio exigidas pelas features do briefing:

- `client_tags` — junção N:N entre clientes e tags.
- `webhooks` — integrações de saída (Configurações → Integrações → Saída).
- `incoming_webhooks` — integrações de entrada (Configurações → Integrações → Entrada).
- `notifications` — notificações in-app (atividades atrasadas / automações executadas).

Todas as tabelas têm Row Level Security habilitada e isoladas por `workspace_id`.

## Pendências conhecidas (rodada de ajustes visuais)

- Moeda/fuso horário/formato de data (Configurações → Preferências) são salvos no banco mas ainda não propagam para a formatação em todas as telas (tudo exibe em BRL / formato padrão por enquanto).
- Reordenar estágios do pipeline é por botão (↑↓), não drag-and-drop.
- Bundle JS grande (~550KB gzip) por causa do Recharts/XLSX — vale dividir em chunks por rota.
