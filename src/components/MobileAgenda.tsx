import { addDays, endOfWeek, format, isAfter, isBefore, isSameDay, isWeekend, parseISO, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { LocationIcon, RouteIcon } from './Icons'
import { appointmentCompanyKey, companyClass, companyLabel, tripCompanyKey } from '../lib/company'
import { compactTripClients, compactTripStops, holidayForDate } from '../lib/calendar'
import { tripDisplayTitle } from '../lib/tripTitle'
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
          {dayTrips.map(t=>{const key=tripCompanyKey(t,demands); return <button type="button" className={`agenda-trip agenda-event-button ${companyClass(key)}`} key={t.id} onClick={()=>onDaySelect?.(day)}><span className="agenda-company-line"></span><RouteIcon/><div><span className="mobile-company-badge">{companyLabel(key)}</span><strong>{compactTripStops(t,2)}</strong><span>{compactTripClients(t,2)} • {rangeContext(t.start,t.end,day)}</span><small>{tripDisplayTitle(t)}</small></div></button>})}
          {dayAppointments.map(a=>{const key=appointmentCompanyKey(a,demands); return <button type="button" className={`agenda-appointment agenda-event-button ${companyClass(key)}`} key={a.id} onClick={()=>onDaySelect?.(day)}><span className="agenda-company-line"></span><div><span className="mobile-company-badge">{companyLabel(key)}</span><strong>{a.farmName || a.client}</strong><span>{a.client} • sem viagem</span>{(a.city||a.state)&&<small><LocationIcon/> {[a.city,a.state].filter(Boolean).join('/')}</small>}</div><b>{rangeContext(a.start,a.end,day)}</b></button>})}
          {empty && <button type="button" className="agenda-free agenda-free-button" onClick={()=>onDaySelect?.(day)}>{holiday?holiday.name:isWeekend(day)?'Fim de semana livre':'Livre'} • ver resumo</button>}
        </div>
      </article>
    })}
  </div>
}
