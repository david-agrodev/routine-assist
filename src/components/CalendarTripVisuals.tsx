import { AlertIcon, CarIcon, CheckIcon, HotelIcon, PlaneIcon, RouteIcon } from './Icons'
import type { ReactNode } from 'react'
import { isFlightReady, isHotelReady, isVehicleReady } from '../lib/tripReadiness'
import type { Demand, Trip } from '../types/routine'

export function tripDone(trip: Trip, demands: Demand[]) {
  return trip.appointments.length > 0 && trip.appointments.every(appointment => {
    if (!appointment.demandId) return false
    return demands.find(demand => demand.id === appointment.demandId)?.status === 'done'
  })
}

export function tripReadinessStatus(trip: Trip) {
  const missing: string[] = []
  if (trip.hotelRequired && !isHotelReady(trip)) missing.push('Hospedagem')
  if (trip.vehicleRequired && !isVehicleReady(trip)) missing.push('Veículo')
  if (trip.flightRequired && !isFlightReady(trip)) missing.push('Passagem')

  if (!missing.length) return { label: 'Pronto para viagem', tone: 'ready' as const, detail: 'Organização concluída', icon: <CheckIcon/> }
  if (missing.length === 1 && missing[0] === 'Hospedagem') return { label: 'Hospedagem pendente', tone: 'pending' as const, detail: 'Reserve ou confirme a hospedagem', icon: <HotelIcon/> }
  if (missing.length === 1 && missing[0] === 'Veículo') return { label: 'Veículo pendente', tone: 'pending' as const, detail: 'Solicite ou confirme o veículo', icon: <CarIcon/> }
  if (missing.length === 1 && missing[0] === 'Passagem') return { label: 'Passagem pendente', tone: 'pending' as const, detail: 'Solicite ou confirme a passagem', icon: <PlaneIcon/> }
  return { label: 'Organização pendente', tone: 'warn' as const, detail: `${missing.join(', ')} pendente${missing.length === 1 ? '' : 's'}`, icon: <AlertIcon/> }
}

function CalendarTooltipIcon({ className, label, children }: { className: string; label: string; children: ReactNode }) {
  return <i className={`${className} calendar-tooltip-icon`} data-tooltip={label} title={label} aria-label={label}>{children}</i>
}

export function TripStatusBadge({ trip }: { trip: Trip }) {
  const status = tripReadinessStatus(trip)
  return <span className={`calendar-trip-status ${status.tone}`} title={status.detail}>{status.icon}{status.label}</span>
}

export function TripLogisticsIcons({ trip, done = false }: { trip: Trip; done?: boolean }) {
  return <span className="calendar-logistics-icons">
    {done && <CalendarTooltipIcon className="done" label="Atendimentos concluídos"><CheckIcon/></CalendarTooltipIcon>}
    {trip.hotelRequired && <CalendarTooltipIcon className={isHotelReady(trip) ? 'ok' : 'pending'} label={isHotelReady(trip) ? 'Hospedagem confirmada' : 'Hospedagem pendente'}><HotelIcon/></CalendarTooltipIcon>}
    {trip.vehicleRequired && <CalendarTooltipIcon className={isVehicleReady(trip) ? 'ok' : 'pending'} label={isVehicleReady(trip) ? 'Veículo confirmado' : 'Veículo pendente'}><CarIcon/></CalendarTooltipIcon>}
    {trip.flightRequired && <CalendarTooltipIcon className={isFlightReady(trip) ? 'ok' : 'pending'} label={isFlightReady(trip) ? 'Passagem confirmada' : 'Passagem pendente'}><PlaneIcon/></CalendarTooltipIcon>}
  </span>
}

export function TripCalendarIcon() {
  return <span className="calendar-event-icon refined"><RouteIcon/></span>
}
