import { addDays, differenceInCalendarDays, endOfWeek, format, isAfter, isBefore, parseISO, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Appointment, Trip } from '../types/routine'

function asDate(value: string | Date) { return typeof value === 'string' ? parseISO(value) : value }

export function WeekCalendar({ compact=false, trips=[], appointments=[], weekStart }: { compact?: boolean; trips?: Trip[]; appointments?: Appointment[]; weekStart?: string | Date }) {
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
  const rowHeight = compact ? 40 : 46
  return <div className={`week-calendar ${compact ? 'compact' : ''}`}>
    <div className="week-head">{days.map(d=><div key={d.toISOString()}><span>{format(d,'EEE',{locale:ptBR}).slice(0,3).toUpperCase()}</span><strong>{format(d,'d')}</strong></div>)}</div>
    <div className="week-grid" style={{gridTemplateRows:`${compact?30:34}px repeat(${rows-1},${rowHeight}px)`}}>
      {days.map(d=><div className="day-column" key={d.toISOString()}/>) }
      {visibleTrips.map((t,i)=><div key={t.id} className="calendar-bar trip-bar" style={{gridColumn:position(t.start,t.end), gridRow:i+1}}><span>VIAGEM</span> {t.title}</div>)}
      {visibleAppointments.map((a,i)=><div key={a.id} className="calendar-bar appointment-bar" style={{gridColumn:position(a.start,a.end), gridRow:visibleTrips.length+i+1}}><strong>{a.client}</strong><span>{[a.city,a.state].filter(Boolean).join('/')}</span></div>)}
      {visibleTrips.length===0 && visibleAppointments.length===0 && <div className="calendar-empty-grid">Nenhum compromisso nesta semana.</div>}
    </div>
  </div>
}
