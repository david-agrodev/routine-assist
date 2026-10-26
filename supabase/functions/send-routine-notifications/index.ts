import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

type TripRow = {
  id: string
  workspace_id: string
  title: string
  starts_at: string
  ends_at: string
  hotel_required: boolean
  vehicle_required: boolean
  flight_required: boolean
  lodging_reservations: Array<{ check_in: string; check_out: string; confirmed: boolean }>
  vehicle_reservations: Array<{ status: string }>
  flight_reservations: Array<{ status: string }>
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@example.com'

const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
if (vapidPublicKey && vapidPrivateKey) webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

function localDate() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}`
}

function daysBetween(from: string, to: string) {
  const start = Date.parse(`${from}T00:00:00Z`)
  const end = Date.parse(`${to}T00:00:00Z`)
  return Math.round((end - start) / 86_400_000)
}

function activeStage(days: number, values: number[]) {
  return [...new Set(values.filter(value => value >= 0))].sort((a, b) => a - b).find(value => days <= value)
}

function hotelReady(trip: TripRow) {
  if (!trip.hotel_required) return true
  const stays = (trip.lodging_reservations || []).filter(stay => stay.confirmed).sort((a, b) => a.check_in.localeCompare(b.check_in))
  if (!stays.length || stays[0].check_in > trip.starts_at) return false
  let coveredUntil = stays[0].check_out
  for (const stay of stays.slice(1)) {
    if (stay.check_in > coveredUntil) return false
    if (stay.check_out > coveredUntil) coveredUntil = stay.check_out
  }
  return coveredUntil >= trip.ends_at
}

function vehicleReady(trip: TripRow) {
  return !trip.vehicle_required || (trip.vehicle_reservations || []).some(vehicle => ['requested', 'confirmed', 'picked_up', 'returned'].includes(vehicle.status))
}

function flightReady(trip: TripRow) {
  return !trip.flight_required || (trip.flight_reservations || []).some(flight => flight.status === 'confirmed')
}

Deno.serve(async request => {
  if (request.headers.get('authorization') !== `Bearer ${serviceRoleKey}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!vapidPublicKey || !vapidPrivateKey) {
    return Response.json({ error: 'VAPID secrets are not configured.' }, { status: 500 })
  }

  const { data: preferences, error: preferencesError } = await admin
    .from('notification_preferences')
    .select('user_id,alert_days')
    .eq('push_enabled', true)
  if (preferencesError) return Response.json({ error: preferencesError.message }, { status: 500 })

  const today = localDate()
  let delivered = 0
  let removedSubscriptions = 0

  for (const preference of preferences || []) {
    const { data: subscriptions } = await admin
      .from('push_subscriptions')
      .select('id,endpoint,p256dh,auth')
      .eq('user_id', preference.user_id)
      .not('p256dh', 'is', null)
      .not('auth', 'is', null)
    if (!subscriptions?.length) continue

    const { data: memberships } = await admin.from('workspace_members').select('workspace_id').eq('user_id', preference.user_id)
    const workspaceIds = (memberships || []).map(row => row.workspace_id)
    if (!workspaceIds.length) continue

    const { data: trips, error: tripsError } = await admin
      .from('trips')
      .select('id,workspace_id,title,starts_at,ends_at,hotel_required,vehicle_required,flight_required,lodging_reservations(check_in,check_out,confirmed),vehicle_reservations(status),flight_reservations(status)')
      .in('workspace_id', workspaceIds)
      .eq('status', 'planned')
      .gte('ends_at', today)
    if (tripsError) continue

    const tripRows = (trips || []) as TripRow[]
    const tripIds = tripRows.map(trip => trip.id)
    const { data: previous } = tripIds.length ? await admin
      .from('push_delivery_log')
      .select('entity_type,entity_id,stage')
      .eq('user_id', preference.user_id)
      .in('entity_id', tripIds) : { data: [] }
    const deliveredKeys = new Set((previous || []).map(row => `${row.entity_type}:${row.entity_id}:${row.stage}`))

    for (const trip of tripRows) {
      const days = daysBetween(today, trip.starts_at)
      const stage = activeStage(days, Array.isArray(preference.alert_days) ? preference.alert_days.map(Number) : [14, 7, 3, 1])
      if (stage == null) continue
      const countdown = days < 0 ? 'viagem em andamento' : days === 0 ? 'a viagem começa hoje' : `faltam ${days} dia${days === 1 ? '' : 's'}`
      const pending = [
        !hotelReady(trip) && { kind: 'hotel', title: 'Hospedagem pendente' },
        !vehicleReady(trip) && { kind: 'vehicle', title: 'Veículo pendente' },
        !flightReady(trip) && { kind: 'flight', title: 'Passagem aérea pendente' },
      ].filter(Boolean) as Array<{ kind: string; title: string }>

      for (const item of pending) {
        const deliveryKey = `${item.kind}:${trip.id}:${stage}`
        if (deliveredKeys.has(deliveryKey)) continue
        const payload = JSON.stringify({
          title: `Routine Assist • ${item.title}`,
          body: `${trip.title} • ${countdown}`,
          url: '/viagens',
          tag: deliveryKey,
        })
        let sent = false
        for (const subscription of subscriptions) {
          try {
            await webpush.sendNotification({
              endpoint: subscription.endpoint,
              keys: { p256dh: subscription.p256dh!, auth: subscription.auth! },
            }, payload)
            sent = true
          } catch (error: any) {
            if (error?.statusCode === 404 || error?.statusCode === 410) {
              await admin.from('push_subscriptions').delete().eq('id', subscription.id)
              removedSubscriptions += 1
            }
          }
        }
        if (sent) {
          await admin.from('push_delivery_log').upsert({
            workspace_id: trip.workspace_id,
            user_id: preference.user_id,
            entity_type: item.kind,
            entity_id: trip.id,
            stage,
          }, { onConflict: 'user_id,entity_type,entity_id,stage' })
          deliveredKeys.add(deliveryKey)
          delivered += 1
        }
      }
    }
  }

  return Response.json({ ok: true, delivered, removedSubscriptions })
})
