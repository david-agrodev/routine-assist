import { addDays, endOfWeek, format, isAfter, isBefore, isSameDay, parseISO, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { LocationIcon, RouteIcon } from './Icons'
import type { Appointment, Trip } from '../types/routine'

function asDate(value: string | Date) { return typeof value === 'string' ? parseISO(value) : value }

export function MobileAgenda({ compact=false, trips=[], appointments=[], weekStart }: { compact?: boolean; trips?: Trip[]; appointments?: Appointment[]; weekStart?: string | Date }) {
  const base = startOfWeek(asDate(weekStart ?? new Date()), { weekStartsOn: 1 })
  const weekEnd = endOfWeek(base, { weekStartsOn: 1 })
  const days = Array.from({length:7}, (_,i)=>addDays(base,i))

  return <div className={`mobile-agenda ${compact ? 'compact' : ''}`}>
    {days.map((day, index) => {
      const dayTrips = trips.filter(t => {
        const s=parseISO(t.start), e=parseISO(t.end)
        if (isBefore(e,base)||isAfter(s,weekEnd)) return false
        return isSameDay(s,day) || (index===0 && isBefore(s,base) && !isBefore(e,base))
      })
      const dayAppointments = appointments.filter(a => {
        const s=parseISO(a.start), e=parseISO(a.end)
        if (isBefore(e,base)||isAfter(s,weekEnd)) return false
        return isSameDay(s,day) || (index===0 && isBefore(s,base) && !isBefore(e,base))
      })
      const empty = dayTrips.length===0 && dayAppointments.length===0
      return <article className={`agenda-day ${empty ? 'agenda-day-muted':''}`} key={day.toISOString()}>
        <div className="agenda-date"><span>{format(day,'EEE',{locale:ptBR}).slice(0,3).toUpperCase()}</span><strong>{format(day,'d')}</strong></div>
        <div className="agenda-content">
          {dayTrips.map(t=><div className="agenda-trip" key={t.id}><RouteIcon/><div><strong>{t.title}</strong><span>{format(parseISO(t.start),'dd/MM')} → {format(parseISO(t.end),'dd/MM')}</span></div></div>)}
          {dayAppointments.map(a=><div className="agenda-appointment" key={a.id}><div><strong>{a.client}</strong>{(a.city||a.state)&&<span><LocationIcon/> {[a.city,a.state].filter(Boolean).join('/')}</span>}</div><b>{format(parseISO(a.start),'dd/MM')} → {format(parseISO(a.end),'dd/MM')}</b></div>)}
          {empty && <span className="agenda-free">Livre</span>}
        </div>
      </article>
    })}
  </div>
}
