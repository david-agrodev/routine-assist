import { addDays, endOfWeek, format, isAfter, isBefore, isSameDay, isWeekend, parseISO, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CheckIcon, LocationIcon } from './Icons'
import { TripCalendarIcon, TripLogisticsIcons, TripStatusBadge, tripDone } from './CalendarTripVisuals'
import { appointmentCompanyKey, companyClass, companyLabel, tripCompanyKey } from '../lib/company'
import { compactTripClients, compactTripCommercials, compactTripStops, holidayForDate } from '../lib/calendar'
import { tripDisplayTitle } from '../lib/tripTitle'
import { TripWeatherChip } from './TripWeather'
import type { Appointment, Demand, Holiday, Trip } from '../types/routine'

function asDate(value: string | Date) { return typeof value === 'string' ? parseISO(value) : value }
function occursOnDay(start: string, end: string, day: Date) {
  const s = parseISO(start), e = parseISO(end)
  return !isBefore(day, s) && !isAfter(day, e)
}
function rangeContext(start: string, end: string, day: Date) {
  const s = parseISO(start), e = parseISO(end)
  const range = `${format(s,'dd/MM')} → ${format(e,'dd/MM')}`
  if (isSameDay(s,e)) return range
  if (isSameDay(day,s)) return `Início • ${range}`
  if (isSameDay(day,e)) return `Último dia • ${range}`
  return `Em andamento • até ${format(e,'dd/MM')}`
}
const demandForAppointment = (appointment: Appointment, demands: Demand[]) => appointment.demandId ? demands.find(d => d.id === appointment.demandId) : undefined
const appointmentDone = (appointment: Appointment, demands: Demand[]) => demandForAppointment(appointment, demands)?.status === 'done'
const appointmentRemote = (appointment: Appointment) => appointment.type === 'Remoto'
export function MobileAgenda({ compact=false, trips=[], appointments=[], demands=[], holidays=[], weekStart, onDaySelect }: { compact?: boolean; trips?: Trip[]; appointments?: Appointment[]; demands?: Demand[]; holidays?: Holiday[]; weekStart?: string | Date; onDaySelect?: (day: Date) => void }) {
  const base = startOfWeek(asDate(weekStart ?? new Date()), { weekStartsOn: 1 })
  const weekEnd = endOfWeek(base, { weekStartsOn: 1 })
  const days = Array.from({length:7}, (_,i)=>addDays(base,i))

  return <div className={`mobile-agenda ${compact ? 'compact' : ''}`}>
    {days.map((day) => {
      const holiday=holidayForDate(holidays,day)
      const dayTrips = trips.filter(t => {
        const s=parseISO(t.start), e=parseISO(t.end)
        if (isBefore(e,base)||isAfter(s,weekEnd)) return false
        return occursOnDay(t.start,t.end,day)
      })
      const dayAppointments = appointments.filter(a => {
        const s=parseISO(a.start), e=parseISO(a.end)
        if (isBefore(e,base)||isAfter(s,weekEnd)) return false
        return occursOnDay(a.start,a.end,day)
      })
      const empty = dayTrips.length===0 && dayAppointments.length===0
      return <article className={`agenda-day ${empty ? 'agenda-day-muted':''} ${isWeekend(day)?'weekend':''} ${holiday?'holiday':''}`} key={day.toISOString()}>
        <button type="button" className="agenda-date agenda-date-button" onClick={()=>onDaySelect?.(day)} aria-label={`Ver resumo de ${format(day,"d 'de' MMMM",{locale:ptBR})}`}>
          <span>{format(day,'EEE',{locale:ptBR}).slice(0,3).toUpperCase()}</span><strong>{format(day,'d')}</strong>{holiday?<small>{holiday.name}</small>:<small>{isWeekend(day)?'Fim de semana':'Ver'}</small>}
        </button>
        <div className="agenda-content">
          {dayTrips.map(t=>{const key=tripCompanyKey(t,demands); const commercial=compactTripCommercials(t,demands,2); const done=tripDone(t,demands); return <button type="button" className={`agenda-trip agenda-event-button ${companyClass(key)} ${done?'calendar-event-done':''}`} key={t.id} onClick={()=>onDaySelect?.(day)}><span className="agenda-company-line"></span><TripCalendarIcon/><div><span className="mobile-company-badge">{companyLabel(key)}</span><strong>{compactTripStops(t,2)}{done&&<span className="calendar-done-badge"><CheckIcon/> Concluída</span>}</strong><span>{compactTripClients(t,2)} • {rangeContext(t.start,t.end,day)}</span><span className="calendar-event-tags"><TripStatusBadge trip={t}/><TripWeatherChip trip={t}/></span>{commercial&&<small>Comercial: {commercial}</small>}<small className="agenda-trip-footer"><span>{tripDisplayTitle(t)}</span><TripLogisticsIcons trip={t} done={done}/></small></div></button>})}
          {dayAppointments.map(a=>{const key=appointmentCompanyKey(a,demands); const done=appointmentDone(a,demands); const remote=appointmentRemote(a); return <button type="button" className={`agenda-appointment agenda-event-button ${companyClass(key)} ${done?'calendar-event-done':''} ${remote?'calendar-event-remote':''}`} key={a.id} onClick={()=>onDaySelect?.(day)}><span className="agenda-company-line"></span><div><span className="mobile-company-badge">{companyLabel(key)}</span><strong>{a.farmName || a.client}{remote&&<span className="calendar-remote-badge">Remoto</span>}{done&&<span className="calendar-done-badge"><CheckIcon/> Concluída</span>}</strong><span>{a.client} • {remote?'atendimento remoto':'sem viagem'}</span>{(a.city||a.state)&&<small><LocationIcon/> {[a.city,a.state].filter(Boolean).join('/')}</small>}</div><b>{rangeContext(a.start,a.end,day)}</b></button>})}
          {empty && <button type="button" className="agenda-free agenda-free-button" onClick={()=>onDaySelect?.(day)}>{holiday?holiday.name:isWeekend(day)?'Fim de semana livre':'Livre'} • ver resumo</button>}
        </div>
      </article>
    })}
  </div>
}
