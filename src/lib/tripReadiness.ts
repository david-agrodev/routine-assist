import type { Trip } from '../types/routine'

export function isHotelReady(trip: Trip): boolean {
  if (!trip.hotelRequired) return true
  const stays = trip.lodgings.filter(item=>item.confirmed).sort((a,b)=>a.checkIn.localeCompare(b.checkIn))
  if (!stays.length) return false
  if (stays[0].checkIn > trip.start) return false
  let coveredUntil = stays[0].checkOut
  for (const stay of stays.slice(1)) {
    if (stay.checkIn > coveredUntil) return false
    if (stay.checkOut > coveredUntil) coveredUntil = stay.checkOut
  }
  return coveredUntil >= trip.end
}

export function isVehicleReady(trip: Trip): boolean {
  if (!trip.vehicleRequired) return true
  return trip.vehicles.some(v=>['requested','confirmed','picked_up','returned'].includes(v.status))
}

export function isFlightReady(trip: Trip): boolean {
  if (!trip.flightRequired) return true
  return trip.flights.some(f=>f.status==='confirmed')
}
