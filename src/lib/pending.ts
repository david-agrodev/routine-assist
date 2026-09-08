import { differenceInCalendarDays, parseISO, startOfDay } from 'date-fns'
import { tripDisplayTitle } from './tripTitle'
import type { Demand, NotificationPreferences, Trip } from '../types/routine'
import { isFlightReady, isHotelReady, isVehicleReady } from './tripReadiness'

export type PendingItem = {
  id: string
  kind: 'hotel'|'vehicle'|'flight'|'demand'|'trip'
  title: string
  detail: string
  urgency: 'warn'|'terracotta'|'plum'
  stage?: number
  target: '/viagens' | '/entrada'
  entityId?: string
}

const DEFAULT_DAYS = [14,7,3,1]
const daysUntil = (isoDate: string) => differenceInCalendarDays(parseISO(isoDate), startOfDay(new Date()))

function activeStage(days: number, alertDays: number[]) {
  const sorted = [...new Set(alertDays.filter(n=>n>=0))].sort((a,b)=>b-a)
  return sorted.find(threshold => days <= threshold)
}

function urgencyFor(days: number): PendingItem['urgency'] {
  if (days <= 1) return 'terracotta'
  if (days <= 7) return 'warn'
  return 'plum'
}

export function buildPendingItems(
  demands: Demand[],
  trips: Trip[],
  prefs?: NotificationPreferences,
): PendingItem[] {
  const items: PendingItem[] = []
  const alertDays = prefs?.alertDays?.length ? prefs.alertDays : DEFAULT_DAYS
  const inAppEnabled = prefs?.inAppEnabled ?? true

  if (inAppEnabled) {
    for (const trip of trips) {
      if (trip.status === 'completed') continue
      const days = daysUntil(trip.start)
      const endDays = daysUntil(trip.end)
      if (endDays < 0) {
        items.push({ id:`complete-${trip.id}`, kind:'trip', title:'Concluir viagem', detail:`${tripDisplayTitle(trip)} • período encerrado`, urgency:'plum', target:'/viagens', entityId:trip.id })
        continue
      }
      const stage = activeStage(days, alertDays)
      if (stage == null) continue
      const countdown = days < 0 ? 'viagem em andamento' : days === 0 ? 'viagem começa hoje' : `faltam ${days} dia${days === 1 ? '' : 's'}`

      if (trip.hotelRequired && !isHotelReady(trip)) {
        items.push({ id:`hotel-${trip.id}`, kind:'hotel', title: days <= 1 ? 'Hotel urgente' : 'Reservar hotel', detail:`${tripDisplayTitle(trip)} • ${countdown}`, urgency:urgencyFor(days), stage, target:'/viagens', entityId:trip.id })
      }

      if (trip.vehicleRequired && !isVehicleReady(trip)) {
        items.push({ id:`vehicle-${trip.id}`, kind:'vehicle', title: days <= 1 ? 'Veículo urgente' : 'Solicitar veículo', detail:`${tripDisplayTitle(trip)} • ${countdown}`, urgency:urgencyFor(days), stage, target:'/viagens', entityId:trip.id })
      }

      if (trip.flightRequired && !isFlightReady(trip)) {
        const requested=trip.flights.some(f=>f.status==='requested')
        items.push({ id:`flight-${trip.id}`, kind:'flight', title: requested ? (days <= 1 ? 'Confirmar passagem urgente' : 'Confirmar passagem aérea') : (days <= 1 ? 'Passagem urgente' : 'Solicitar passagem aérea'), detail:`${tripDisplayTitle(trip)} • ${requested?'aguardando confirmação • ':''}${countdown}`, urgency:urgencyFor(days), stage, target:'/viagens', entityId:trip.id })
      }
    }
  }

  for (const demand of demands) {
    if (demand.status === 'done' || demand.status === 'cancelled' || demand.status === 'scheduled') continue
    const missingPlace = !demand.city || !demand.state
    if (missingPlace) items.push({ id:`demand-${demand.id}`, kind:'demand', title:'Completar demanda', detail:`${demand.client} • cidade/UF ainda pendente`, urgency:'plum', target:'/entrada', entityId:demand.id })
  }

  return items.sort((a,b) => {
    const rank = { terracotta:0, warn:1, plum:2 }
    return rank[a.urgency] - rank[b.urgency]
  })
}
