import type { Appointment, Trip } from '../types/routine'

type StopLike = Pick<Appointment,'city'|'state'|'farmName'|'client'>

function unique<T>(items:T[]){ return [...new Set(items)] }

export function suggestedTripTitle(stops:StopLike[]): string {
  const cities = unique(stops.map(s=>s.city?.trim()).filter(Boolean) as string[])
  const states = unique(stops.map(s=>s.state?.trim().toUpperCase()).filter(Boolean) as string[])
  if (cities.length === 0) {
    const farms = unique(stops.map(s=>(s.farmName || s.client)?.trim()).filter(Boolean) as string[])
    if (farms.length === 1) return `Viagem ${farms[0]}`
    if (farms.length === 2) return `Viagem ${farms[0]} + ${farms[1]}`
    if (farms.length > 2) return `Viagem ${farms[0]} + ${farms[1]} +${farms.length-2}`
    return 'Nova viagem'
  }
  if (cities.length === 1) return stops.length > 1 ? `Viagem ${cities[0]} • ${stops.length} atendimentos` : `Viagem ${cities[0]}`
  if (cities.length === 2) return `Viagem ${cities[0]} + ${cities[1]}`
  if (states.length === 1) return `Viagem ${states[0]} • ${stops.length} atendimentos`
  return `Viagem ${cities[0]} + ${cities[1]} +${cities.length-2}`
}

export function tripDisplayTitle(trip:Trip): string {
  const stored = trip.title?.trim() || ''
  if (!stored || /^Viagem\s+/i.test(stored) || /^Nova viagem$/i.test(stored)) return suggestedTripTitle(trip.appointments)
  return stored
}
