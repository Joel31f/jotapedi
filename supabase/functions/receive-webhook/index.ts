// Webhook de entrada do Jotapedi.
// URL de chamada: POST {SUPABASE_URL}/functions/v1/receive-webhook/<token>
// O token identifica o workspace e o recurso (ver tabela incoming_webhooks).
// Hoje só o recurso "client" (captura de leads) está implementado.

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  const url = new URL(req.url)
  const token = url.pathname.split('/').filter(Boolean).pop()
  if (!token) {
    return new Response(JSON.stringify({ error: 'Token ausente na URL' }), { status: 400 })
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const authHeaders = { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` }

  const webhookRes = await fetch(
    `${SUPABASE_URL}/rest/v1/incoming_webhooks?token=eq.${token}&active=eq.true&select=id,workspace_id,resource`,
    { headers: authHeaders },
  )
  const webhooks = await webhookRes.json()
  const webhook = webhooks[0]

  if (!webhook) {
    return new Response(JSON.stringify({ error: 'Token inválido ou webhook inativo' }), { status: 404 })
  }

  const payload = await req.json().catch(() => null)
  if (!payload) {
    return new Response(JSON.stringify({ error: 'JSON inválido' }), { status: 400 })
  }

  if (webhook.resource === 'client') {
    if (!payload.name) {
      return new Response(JSON.stringify({ error: 'Campo "name" é obrigatório' }), { status: 400 })
    }

    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/clients`, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({
        workspace_id: webhook.workspace_id,
        name: payload.name,
        company: payload.company ?? null,
        emails: payload.email ? [payload.email] : [],
        phones: payload.phone ? [payload.phone] : [],
        whatsapp: payload.whatsapp ?? null,
        document: payload.document ?? null,
        notes: payload.notes ?? null,
        lead_stage: 'novo_lead',
      }),
    })

    if (!insertRes.ok) {
      const details = await insertRes.text()
      return new Response(JSON.stringify({ error: 'Erro ao criar cliente', details }), { status: 500 })
    }

    const [created] = await insertRes.json()
    return new Response(JSON.stringify({ success: true, id: created.id }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ error: 'Recurso não suportado' }), { status: 400 })
})
