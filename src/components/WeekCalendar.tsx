import { addDays, differenceInCalendarDays, endOfWeek, format, isAfter, isBefore, isToday, isWeekend, parseISO, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CheckIcon, RequestIcon } from './Icons'
import { TripCalendarIcon, TripLogisticsIcons, TripStatusBadge, tripDone } from './CalendarTripVisuals'
import { appointmentCompanyKey, companyClass, companyLabel, tripCompanyKey } from '../lib/company'
import { compactTripClients, compactTripCommercials, compactTripStops, holidayForDate } from '../lib/calendar'
import { tripDisplayTitle } from '../lib/tripTitle'
import { TripWeatherChip } from './TripWeather'
import { formatScheduleTime } from '../lib/format'
import type { Appointment, BookingRequest, Demand, Holiday, Trip } from '../types/routine'

function asDate(value: string | Date) { return typeof value === 'string' ? parseISO(value) : value }
const demandForAppointment = (appointment: Appointment, demands: Demand[]) => appointment.demandId ? demands.find(d => d.id === appointment.demandId) : undefined
const appointmentDone = (appointment: Appointment, demands: Demand[]) => demandForAppointment(appointment, demands)?.status === 'done'
const appointmentRemote = (appointment: Appointment) => appointment.type === 'Remoto'
export function WeekCalendar({ compact=false, trips=[], appointments=[], bookingRequests=[], demands=[], holidays=[], weekStart, onDaySelect, onBookingRequestSelect }: { compact?: boolean; trips?: Trip[]; appointments?: Appointment[]; bookingRequests?: BookingRequest[]; demands?: Demand[]; holidays?: Holiday[]; weekStart?: string | Date; onDaySelect?: (day: Date) => void; onBookingRequestSelect?: (request: BookingRequest) => void }) {
  const base = startOfWeek(asDate(weekStart ?? new Date()), { weekStartsOn: 1 })
  const weekEnd = endOfWeek(base, { weekStartsOn: 1 })
  const days = Array.from({length:7}, (_,i)=>addDays(base,i))
  const visibleTrips = trips.filter(t => !isBefore(parseISO(t.end), base) && !isAfter(parseISO(t.start), weekEnd))
  const visibleAppointments = appointments.filter(a => !isBefore(parseISO(a.end), base) && !isAfter(parseISO(a.start), weekEnd))
  const visibleRequests = bookingRequests.filter(request => request.status === 'pending' && !isBefore(parseISO(request.end), base) && !isAfter(parseISO(request.start), weekEnd))

  const position = (start: string, end: string) => {
    const s = parseISO(start); const e = parseISO(end)
    const clippedStart = isBefore(s,base) ? base : s
    const clippedEnd = isAfter(e,weekEnd) ? weekEnd : e
    const from = differenceInCalendarDays(clippedStart, base) + 1
    const to = differenceInCalendarDays(clippedEnd, base) + 2
    return `${from} / ${to}`
  }

  const rows = Math.max(4, visibleTrips.length + visibleAppointments.length + visibleRequests.length + 1)
  const rowHeight = compact ? 88 : 108
  return <div className={`week-calendar ${compact ? 'compact' : ''}`}>
    <div className="week-head">{days.map(d=>{const holiday=holidayForDate(holidays,d);const today=isToday(d);return <button type="button" className={`week-day-button ${isWeekend(d)?'weekend':''} ${holiday?'holiday':''} ${today?'today':''}`} aria-current={today?'date':undefined} key={d.toISOString()} onClick={()=>onDaySelect?.(d)}><span>{format(d,'EEE',{locale:ptBR}).slice(0,3).toUpperCase()}</span><strong>{format(d,'d')}</strong>{today?<small title={holiday?.name}>Hoje</small>:holiday?<small title={holiday.name}>{holiday.name}</small>:<small>{isWeekend(d)?'Fim de semana':'Resumo'}</small>}</button>})}</div>
    <div className="week-grid modern-week-grid" style={{gridTemplateRows:`${compact?34:40}px repeat(${rows-1},${rowHeight}px)`}}>
      {days.map(d=>{const holiday=holidayForDate(holidays,d);const today=isToday(d);return <button type="button" aria-label={`Abrir resumo de ${format(d,'dd/MM')}`} aria-current={today?'date':undefined} className={`day-column day-column-button ${isWeekend(d)?'weekend':''} ${holiday?'holiday':''} ${today?'today':''}`} onClick={()=>onDaySelect?.(d)} key={d.toISOString()}><span className="day-column-marker">{today?'HOJE':holiday?'FERIADO':isWeekend(d)?'FIM DE SEMANA':''}</span></button>}) }
      {visibleTrips.map((t,i)=>{const key=tripCompanyKey(t,demands); const commercial=compactTripCommercials(t,demands,2); const done=tripDone(t,demands); return <button type="button" key={t.id} className={`calendar-bar trip-bar calendar-event-button ${companyClass(key)} ${done?'calendar-event-done':''}`} onClick={()=>onDaySelect?.(isBefore(parseISO(t.start),base)?base:parseISO(t.start))} style={{gridColumn:position(t.start,t.end), gridRow:i+2}}>
        <TripCalendarIcon/>
        <span className="calendar-event-copy rich"><span className="calendar-company-badge">{companyLabel(key)}</span><strong>{compactTripStops(t,2)}</strong><small>{compactTripClients(t,2)}{commercial?` • Comercial: ${commercial}`:''}</small><span className="calendar-event-tags"><TripStatusBadge trip={t}/><TripWeatherChip trip={t}/></span><span className="calendar-event-foot"><em>{tripDisplayTitle(t)}</em><TripLogisticsIcons trip={t} done={done}/></span></span>
      </button>})}
      {visibleAppointments.map((a,i)=>{const key=appointmentCompanyKey(a,demands); const done=appointmentDone(a,demands); const remote=appointmentRemote(a); return <button type="button" key={a.id} className={`calendar-bar appointment-bar calendar-event-button ${companyClass(key)} ${done?'calendar-event-done':''} ${remote?'calendar-event-remote':''}`} onClick={()=>onDaySelect?.(isBefore(parseISO(a.start),base)?base:parseISO(a.start))} style={{gridColumn:position(a.start,a.end), gridRow:visibleTrips.length+i+2}}><span className="calendar-event-copy rich"><span className="calendar-company-badge">{companyLabel(key)}</span><strong>{a.farmName || a.client}{remote&&<span className="calendar-remote-badge">Remoto</span>}{done&&<span className="calendar-done-badge"><CheckIcon/> Concluída</span>}</strong><small>{a.client}{a.city?` • ${a.city}/${a.state||''}`:''} • {formatScheduleTime(a)} • {remote?'atendimento remoto':'sem viagem'}</small></span></button>})}
      {visibleRequests.map((request,i)=><button type="button" key={request.id} className="calendar-bar booking-request-bar calendar-event-button" onClick={()=>onBookingRequestSelect?.(request)} style={{gridColumn:position(request.start,request.end),gridRow:visibleTrips.length+visibleAppointments.length+i+2}}><RequestIcon/><span className="calendar-event-copy rich"><span className="calendar-request-badge">Solicitação</span><strong>{request.farmName}</strong><small>{request.central} • aguardando aprovação</small></span></button>)}
      {visibleTrips.length===0 && visibleAppointments.length===0 && visibleRequests.length===0 && <div className="calendar-empty-grid"><strong>Semana livre</strong><span>Nenhuma viagem, atendimento ou solicitação neste período.</span></div>}
    </div>
  </div>
}
