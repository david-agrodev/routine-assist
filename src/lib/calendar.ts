import { format } from 'date-fns'
import type { Demand, Holiday, Trip } from '../types/routine'

export function holidayForDate(holidays:Holiday[],day:Date){
  const key=format(day,'yyyy-MM-dd')
  return holidays.find(h=>h.date===key)
}

export function tripFarmNames(trip:Trip){
  return [...new Set(trip.appointments.map(a=>(a.farmName||a.client).trim()).filter(Boolean))]
}

export function tripClientNames(trip:Trip){
  return [...new Set(trip.appointments.map(a=>a.client.trim()).filter(Boolean))]
}

export function tripCommercialNames(trip:Trip,demands:Demand[]){
  const names=trip.appointments.map(a=>a.demandId?demands.find(d=>d.id===a.demandId)?.regional:undefined).filter(Boolean) as string[]
  return [...new Set(names.map(v=>v.trim()).filter(Boolean))]
}

export function compactTripStops(trip:Trip,max=2){
  const farms=tripFarmNames(trip)
  if(!farms.length) return `${trip.appointments.length} atendimento${trip.appointments.length===1?'':'s'}`
  if(farms.length<=max) return farms.join(' + ')
  return `${farms.slice(0,max).join(' + ')} +${farms.length-max}`
}

export function compactTripClients(trip:Trip,max=2){
  const clients=tripClientNames(trip)
  if(!clients.length) return ''
  if(clients.length<=max) return clients.join(' • ')
  return `${clients.slice(0,max).join(' • ')} +${clients.length-max}`
}

export function compactTripCommercials(trip:Trip,demands:Demand[],max=2){
  const names=tripCommercialNames(trip,demands)
  if(!names.length) return ''
  if(names.length<=max) return names.join(' • ')
  return `${names.slice(0,max).join(' • ')} +${names.length-max}`
}
