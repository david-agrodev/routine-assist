import { addDays, differenceInCalendarDays, endOfWeek, format, isAfter, isBefore, isWeekend, parseISO, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CarIcon, HotelIcon, PlaneIcon, RouteIcon } from './Icons'
import { appointmentCompanyKey, companyClass, companyLabel, tripCompanyKey } from '../lib/company'
import { compactTripClients, compactTripCommercials, compactTripStops, holidayForDate } from '../lib/calendar'
import { tripDisplayTitle } from '../lib/tripTitle'
import { isFlightReady, isHotelReady, isVehicleReady } from '../lib/tripReadiness'
import type { Appointment, Demand, Holiday, Trip } from '../types/routine'

function asDate(value: string | Date) { return typeof value === 'string' ? parseISO(value) : value }

export function WeekCalendar({ compact=false, trips=[], appointments=[], demands=[], holidays=[], weekStart, onDaySelect }: { compact?: boolean; trips?: Trip[]; appointments?: Appointment[]; demands?: Demand[]; holidays?: Holiday[]; weekStart?: string | Date; onDaySelect?: (day: Date) => void }) {
  const base = startOfWeek(asDate(weekStart ?? new Date()), { weekStartsOn: 1 })
  const weekEnd = endOfWeek(base, { weekStartsOn: 1 })
  const days = Array.from({length:7}, (_,i)=>addDays(base,i))
  const visibleTrips = trips.filter(t => !isBefore(parseISO(t.end), base) && !isAfter(parseISO(t.start), weekEnd))
  const visibleAppointments = appointments.filter(a => !isBefore(parseISO(a.end), base) && !isAfter(parseISO(a.start), weekEnd))

  const position = (start: string, end: string) => {
    const s = parseISO(start); const e = parseISO(end)
    const clippedStart = isBefore(s,base) ? base : s
    const clippedEnd = isAfter(e,weekEnd) ? weekEnd : e
    const from = differenceInCalendarDays(clippedStart, base) + 1
    const to = differenceInCalendarDays(clippedEnd, base) + 2
    return `${from} / ${to}`
  }

  const rows = Math.max(4, visibleTrips.length + visibleAppointments.length + 1)
  const rowHeight = compact ? 54 : 72
  return <div className={`week-calendar ${compact ? 'compact' : ''}`}>
    <div className="week-head">{days.map(d=>{const holiday=holidayForDate(holidays,d);return <button type="button" className={`week-day-button ${isWeekend(d)?'weekend':''} ${holiday?'holiday':''}`} key={d.toISOString()} onClick={()=>onDaySelect?.(d)}><span>{format(d,'EEE',{locale:ptBR}).slice(0,3).toUpperCase()}</span><strong>{format(d,'d')}</strong>{holiday?<small title={holiday.name}>{holiday.name}</small>:<small>{isWeekend(d)?'Fim de semana':'Resumo'}</small>}</button>})}</div>
    <div className="week-grid modern-week-grid" style={{gridTemplateRows:`${compact?34:40}px repeat(${rows-1},${rowHeight}px)`}}>
      {days.map(d=>{const holiday=holidayForDate(holidays,d);return <button type="button" aria-label={`Abrir resumo de ${format(d,'dd/MM')}`} className={`day-column day-column-button ${isWeekend(d)?'weekend':''} ${holiday?'holiday':''}`} onClick={()=>onDaySelect?.(d)} key={d.toISOString()}><span className="day-column-marker">{holiday?'FERIADO':isWeekend(d)?'FIM DE SEMANA':''}</span></button>}) }
      {visibleTrips.map((t,i)=>{const key=tripCompanyKey(t,demands); const commercial=compactTripCommercials(t,demands,2); return <button type="button" key={t.id} className={`calendar-bar trip-bar calendar-event-button ${companyClass(key)}`} onClick={()=>onDaySelect?.(isBefore(parseISO(t.start),base)?base:parseISO(t.start))} style={{gridColumn:position(t.start,t.end), gridRow:i+1}}>
        <span className="calendar-event-icon"><RouteIcon/></span>
        <span className="calendar-event-copy rich"><span className="calendar-company-badge">{companyLabel(key)}</span><strong>{compactTripStops(t,2)}</strong><small>{compactTripClients(t,2)}{commercial?` • Comercial: ${commercial}`:''}</small><span className="calendar-event-foot"><em>{tripDisplayTitle(t)}</em><span className="calendar-logistics-icons">{t.hotelRequired&&<i className={isHotelReady(t)?'ok':'pending'}><HotelIcon/></i>}{t.vehicleRequired&&<i className={isVehicleReady(t)?'ok':'pending'}><CarIcon/></i>}{t.flightRequired&&<i className={isFlightReady(t)?'ok':'pending'}><PlaneIcon/></i>}</span></span></span>
      </button>})}
      {visibleAppointments.map((a,i)=>{const key=appointmentCompanyKey(a,demands); return <button type="button" key={a.id} className={`calendar-bar appointment-bar calendar-event-button ${companyClass(key)}`} onClick={()=>onDaySelect?.(isBefore(parseISO(a.start),base)?base:parseISO(a.start))} style={{gridColumn:position(a.start,a.end), gridRow:visibleTrips.length+i+1}}><span className="calendar-event-copy rich"><span className="calendar-company-badge">{companyLabel(key)}</span><strong>{a.farmName || a.client}</strong><small>{a.client}{a.city?` • ${a.city}/${a.state||''}`:''} • sem viagem</small></span></button>})}
      {visibleTrips.length===0 && visibleAppointments.length===0 && <div className="calendar-empty-grid"><strong>Semana livre</strong><span>Nenhuma viagem ou atendimento sem viagem neste período.</span></div>}
    </div>
  </div>
}
