import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarIcon, CarIcon, CheckIcon, HotelIcon, LocationIcon, PlaneIcon, RouteIcon } from './Icons'
import { formatDateRange } from '../lib/format'
import { isFlightReady, isHotelReady, isVehicleReady } from '../lib/tripReadiness'
import { appointmentCompanyKey, companyClass, companyLabel, tripCompanyKey } from '../lib/company'
import { compactTripCommercials, holidayForDate } from '../lib/calendar'
import { tripDisplayTitle } from '../lib/tripTitle'
import type { Appointment, Demand, Holiday, Trip } from '../types/routine'

export function AgendaSummaryModal({
  date,
  trips,
  appointments,
  demands,
  holidays=[],
  onClose,
  onOpenDemand,
  onOpenTrip,
}: {
  date: Date | null
  trips: Trip[]
  appointments: Appointment[]
  demands: Demand[]
  holidays?: Holiday[]
  onClose: () => void
  onOpenDemand: (demand: Demand) => void
  onOpenTrip: (trip: Trip) => void
}) {
  if (!date) return null
  const dateKey = format(date, 'yyyy-MM-dd')
  const holiday=holidayForDate(holidays,date)
  const dayTrips = trips.filter(t => t.start <= dateKey && t.end >= dateKey)
  const dayAppointments = appointments.filter(a => a.start <= dateKey && a.end >= dateKey)
  const empty = dayTrips.length === 0 && dayAppointments.length === 0

  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <section className="modal-card agenda-summary-card">
      <div className="modal-head">
        <div><span className="eyebrow">Resumo da agenda</span><h2>{format(date, "EEEE, d 'de' MMMM", { locale: ptBR })}</h2>{holiday&&<div className="holiday-summary"><CalendarIcon/><strong>{holiday.name}</strong><span>Feriado nacional</span></div>}</div>
        <button className="close" onClick={onClose}>×</button>
      </div>

      {empty ? <div className="agenda-summary-empty"><CalendarIcon/><div><strong>Dia livre</strong><span>{holiday?`Nenhuma viagem ocupa esta data. Atenção: ${holiday.name}.`:'Nenhuma viagem ou atendimento sem viagem ocupa esta data.'}</span></div></div> : <div className="agenda-summary-list">
        {dayTrips.map(trip => {
          const hotelReady = isHotelReady(trip)
          const vehicleReady = isVehicleReady(trip)
          const flightReady = isFlightReady(trip)
          const commercial = compactTripCommercials(trip,demands,3)
          const todayStops = trip.appointments.filter(a => a.start <= dateKey && a.end >= dateKey)
          const key=tripCompanyKey(trip,demands)
          return <article className={`agenda-summary-item trip agenda-trip-summary ${companyClass(key)}`} key={trip.id}>
            <div className="agenda-summary-icon"><RouteIcon/></div>
            <div className="grow">
              <div className="summary-title-line"><span className="company-badge">{companyLabel(key)}</span><span className="eyebrow">Viagem</span></div>
              <h3>{tripDisplayTitle(trip)}</h3>
              <p>{formatDateRange(trip.start, trip.end)}{trip.origin ? ` • Partida: ${trip.origin}` : ''}</p>{commercial&&<p className="summary-commercial">Responsável comercial: <strong>{commercial}</strong></p>}
              <div className="summary-chips">
                <span><CheckIcon/> {trip.appointments.length} {trip.appointments.length === 1 ? 'atendimento' : 'atendimentos'}</span>
                <span className={hotelReady ? 'ok' : 'pending'}><HotelIcon/> {trip.hotelRequired ? (hotelReady ? 'Hotel organizado' : 'Hotel pendente') : 'Sem hotel'}</span>
                <span className={vehicleReady ? 'ok' : 'pending'}><CarIcon/> {trip.vehicleRequired ? (vehicleReady ? 'Veículo organizado' : 'Veículo pendente') : 'Sem veículo'}</span>
                {trip.flightRequired&&<span className={flightReady ? 'ok' : 'pending'}><PlaneIcon/> {flightReady ? 'Passagem organizada' : 'Passagem pendente'}</span>}
              </div>
              {todayStops.length > 0 && <div className="agenda-trip-stops">
                <span className="eyebrow">Fazendas nesta data</span>
                {todayStops.map(a => <div className="agenda-trip-stop" key={a.id}>
                  <div><strong>{a.farmName || a.client}</strong><span>{a.farmName ? `${a.client} • ` : ''}{[a.city,a.state].filter(Boolean).join('/')}</span></div>
                  <b>{formatDateRange(a.start,a.end)}</b>
                </div>)}
              </div>}
            </div>
            <button className="secondary compact summary-open" onClick={() => onOpenTrip(trip)}>Abrir viagem</button>
          </article>
        })}

        {dayAppointments.map(appointment => {
          const demand = appointment.demandId ? demands.find(d => d.id === appointment.demandId) : undefined
          const key=appointmentCompanyKey(appointment,demands)
          return <article className={`agenda-summary-item appointment ${companyClass(key)}`} key={appointment.id}>
            <div className="agenda-summary-icon"><CalendarIcon/></div>
            <div className="grow">
              <div className="summary-title-line"><span className="company-badge">{companyLabel(key)}</span><span className="eyebrow">Atendimento sem viagem</span></div>
              <h3>{appointment.farmName || appointment.client}</h3>
              <p>{appointment.farmName ? `${appointment.client} • ` : ''}{formatDateRange(appointment.start, appointment.end)} • {appointment.type}</p>
              {(appointment.city || appointment.state) && <p className="summary-location"><LocationIcon/> {[appointment.city, appointment.state].filter(Boolean).join('/')}</p>}
            </div>
            {demand && <button className="secondary compact summary-open" onClick={() => onOpenDemand(demand)}>Abrir demanda</button>}
          </article>
        })}
      </div>}

      <div className="modal-actions agenda-summary-actions"><button className="ghost" onClick={onClose}>Fechar</button></div>
    </section>
  </div>
}
