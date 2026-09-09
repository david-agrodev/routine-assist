import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0'

type ControlTechPayload = {
  source?: string
  destination?: string
  demandId?: string
  client?: string
  company?: string
  farmName?: string
  city?: string
  state?: string
  quantityCollars?: number
  commercialResponsible?: string
  extraAntennaCount?: number
  observations?: string
  expectedDate?: string
  appointmentStart?: string
  demandStatus?: string
  nextStep?: string
  requestedAt?: string
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Secret ${name} nao configurado.`)
  return value
}

function cleanText(value: unknown) {
  return String(value ?? '').trim()
}

function requiredText(payload: ControlTechPayload, key: keyof ControlTechPayload, label: string) {
  const value = cleanText(payload[key])
  if (!value) throw new Error(`Campo obrigatorio ausente: ${label}.`)
  return value
}

function normalizeCentral(company?: string) {
  const text = cleanText(company).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  if (text.includes('alta')) return 'Alta Genetics'
  if (text.includes('genex')) return 'Genex Brasil'
  return 'Outra / Não informado'
}

function truncateError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || 'Erro desconhecido.')
  return message.slice(0, 2000)
}

function buildFarmNotes(payload: ControlTechPayload, requestId: string) {
  const notes = [
    'Criada por integracao Routine Assist.',
    `Solicitacao Routine: ${requestId}`,
    payload.demandId ? `Demanda Routine: ${payload.demandId}` : '',
    payload.nextStep ? `Proximo passo no Routine: ${payload.nextStep}` : '',
    payload.expectedDate ? `Data prevista: ${payload.expectedDate}` : '',
    payload.observations ? `Observacoes da demanda: ${payload.observations}` : '',
  ]
  return notes.filter(Boolean).join('\n')
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (request.method !== 'POST') return jsonResponse({ ok: false, error: 'Metodo nao permitido.' }, 405)

  try {
    const routineUrl = requiredEnv('SUPABASE_URL')
    const routineAnonKey = requiredEnv('SUPABASE_ANON_KEY')
    const routineServiceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY')
    const controlTechUrl = requiredEnv('CONTROL_TECH_SUPABASE_URL')
    const controlTechServiceRoleKey = requiredEnv('CONTROL_TECH_SERVICE_ROLE_KEY')
    const controlTechOwnerUserId = requiredEnv('CONTROL_TECH_OWNER_USER_ID')

    const authorization = request.headers.get('Authorization') || ''
    if (!authorization) return jsonResponse({ ok: false, error: 'Sessao nao informada.' }, 401)

    const body = await request.json().catch(() => ({}))
    const requestId = cleanText(body.requestId)
    if (!requestId) return jsonResponse({ ok: false, error: 'requestId nao informado.' }, 400)

    const userClient = createClient(routineUrl, routineAnonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData.user) return jsonResponse({ ok: false, error: 'Sessao invalida.' }, 401)

    const { data: visibleRequest, error: visibleError } = await userClient
      .from('control_tech_integration_requests')
      .select('id,status,attempts')
      .eq('id', requestId)
      .single()

    if (visibleError || !visibleRequest) {
      return jsonResponse({ ok: false, error: 'Solicitacao nao encontrada ou sem permissao.' }, 404)
    }
    if (visibleRequest.status !== 'pending') {
      return jsonResponse({ ok: false, error: `Solicitacao esta com status ${visibleRequest.status}.` }, 409)
    }

    const routineAdmin = createClient(routineUrl, routineServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const controlTechAdmin = createClient(controlTechUrl, controlTechServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const attempt = Number(visibleRequest.attempts || 0) + 1
    const { data: claimed, error: claimError } = await routineAdmin
      .from('control_tech_integration_requests')
      .update({ status: 'processing', attempts: attempt, last_error: null })
      .eq('id', requestId)
      .eq('status', 'pending')
      .select('*')
      .single()

    if (claimError || !claimed) {
      return jsonResponse({ ok: false, error: 'Solicitacao ja esta sendo processada ou mudou de status.' }, 409)
    }

    try {
      const payload = (claimed.payload || {}) as ControlTechPayload
      const demandId = requiredText(payload, 'demandId', 'demanda')
      const farmName = requiredText(payload, 'farmName', 'fazenda')
      const city = requiredText(payload, 'city', 'cidade')
      const state = requiredText(payload, 'state', 'UF')
      const clientName = requiredText(payload, 'client', 'cliente')
      const central = normalizeCentral(payload.company)
      const quantityCollars = Number(payload.quantityCollars || 0)
      if (!Number.isFinite(quantityCollars) || quantityCollars <= 0) {
        throw new Error('Quantidade de colares invalida.')
      }

      const { data: existingByRequest, error: requestLinkError } = await controlTechAdmin
        .from('external_integration_links')
        .select('entity_id')
        .eq('provider', 'routine-assist')
        .eq('external_request_id', claimed.id)
        .maybeSingle()
      if (requestLinkError) throw requestLinkError

      const { data: existingByDemand, error: demandLinkError } = existingByRequest ? { data: null, error: null } : await controlTechAdmin
        .from('external_integration_links')
        .select('entity_id')
        .eq('provider', 'routine-assist')
        .eq('external_demand_id', demandId)
        .eq('entity_type', 'fazenda')
        .maybeSingle()
      if (demandLinkError) throw demandLinkError

      const existingFarmId = existingByRequest?.entity_id || existingByDemand?.entity_id
      if (existingFarmId) {
        const { data: completed, error: completeError } = await routineAdmin
          .from('control_tech_integration_requests')
          .update({
            status: 'completed',
            external_reference: `controltech:fazendas:${existingFarmId}`,
            processed_at: new Date().toISOString(),
            last_error: null,
          })
          .eq('id', claimed.id)
          .select('*')
          .single()
        if (completeError) throw completeError
        return jsonResponse({ ok: true, request: completed, target: { entityType: 'fazenda', entityId: existingFarmId } })
      }

      const now = new Date().toISOString()
      const farmRow = {
        user_id: controlTechOwnerUserId,
        nome: farmName,
        central,
        regional_nome: cleanText(payload.commercialResponsible) || null,
        responsavel: clientName,
        estado_uf: state.toUpperCase(),
        cidade: city,
        qtd_colares_prevista: quantityCollars,
        qtd_colares_instalada: 0,
        qtd_colares_entregue_cliente: 0,
        status: 'Não iniciada',
        observacoes: buildFarmNotes(payload, claimed.id),
        observacoes_colares: cleanText(payload.observations) || null,
        created_at: cleanText(payload.requestedAt) || now,
        updated_at: now,
      }

      const { data: farm, error: farmError } = await controlTechAdmin
        .from('fazendas')
        .insert(farmRow)
        .select('id')
        .single()
      if (farmError || !farm) throw farmError || new Error('Fazenda nao criada no Control Tech.')

      const { error: linkError } = await controlTechAdmin
        .from('external_integration_links')
        .insert({
          provider: 'routine-assist',
          external_request_id: claimed.id,
          external_demand_id: demandId,
          entity_type: 'fazenda',
          entity_id: farm.id,
          payload: { request: { id: claimed.id, origin: claimed.origin, destination: claimed.destination }, installation: payload },
          status: 'completed',
          created_by: controlTechOwnerUserId,
        })
      if (linkError) throw linkError

      const { data: completed, error: completeError } = await routineAdmin
        .from('control_tech_integration_requests')
        .update({
          status: 'completed',
          external_reference: `controltech:fazendas:${farm.id}`,
          processed_at: now,
          last_error: null,
        })
        .eq('id', claimed.id)
        .select('*')
        .single()
      if (completeError) throw completeError

      return jsonResponse({ ok: true, request: completed, target: { entityType: 'fazenda', entityId: farm.id } })
    } catch (error) {
      const message = truncateError(error)
      await routineAdmin
        .from('control_tech_integration_requests')
        .update({ status: 'failed', last_error: message, processed_at: null })
        .eq('id', claimed.id)
      return jsonResponse({ ok: false, error: message }, 500)
    }
  } catch (error) {
    return jsonResponse({ ok: false, error: truncateError(error) }, 500)
  }
})
