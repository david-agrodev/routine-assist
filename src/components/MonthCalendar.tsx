import { addDays, addWeeks, differenceInCalendarDays, endOfMonth, endOfWeek, format, isAfter, isBefore, parseISO, startOfMonth, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Appointment, Trip } from '../types/routine'

function clipPosition(start:string,end:string,weekStart:Date){
  const weekEnd=endOfWeek(weekStart,{weekStartsOn:1})
  const s=parseISO(start),e=parseISO(end)
  const clippedStart=isBefore(s,weekStart)?weekStart:s
  const clippedEnd=isAfter(e,weekEnd)?weekEnd:e
  const from=differenceInCalendarDays(clippedStart,weekStart)+1
  const to=differenceInCalendarDays(clippedEnd,weekStart)+2
  return `${from} / ${to}`
}

export function MonthCalendar({ month, trips, appointments }:{month:Date;trips:Trip[];appointments:Appointment[]}){
  const gridStart=startOfWeek(startOfMonth(month),{weekStartsOn:1})
  const gridEnd=endOfWeek(endOfMonth(month),{weekStartsOn:1})
  const weeks:Date[]=[]
  for(let d=gridStart;!isAfter(d,gridEnd);d=addWeeks(d,1))weeks.push(d)
  const dayNames=['SEG','TER','QUA','QUI','SEX','SÁB','DOM']

  return <div className="month-calendar">
    <div className="month-head">{dayNames.map(d=><span key={d}>{d}</span>)}</div>
    {weeks.map((weekStart,weekIndex)=>{
      const weekEnd=endOfWeek(weekStart,{weekStartsOn:1})
      const weekTrips=trips.filter(t=>!isBefore(parseISO(t.end),weekStart)&&!isAfter(parseISO(t.start),weekEnd))
      const weekAppointments=appointments.filter(a=>!isBefore(parseISO(a.end),weekStart)&&!isAfter(parseISO(a.start),weekEnd))
      const rows=Math.max(3,1+weekTrips.length+weekAppointments.length)
      return <div className="month-week" key={weekStart.toISOString()} style={{gridTemplateRows:`30px repeat(${rows-1},31px)`}}>
        {Array.from({length:7},(_,i)=>addDays(weekStart,i)).map(day=><div className={`month-day ${day.getMonth()===month.getMonth()?'':'outside'}`} key={day.toISOString()} style={{gridColumn:iFor(day,weekStart),gridRow:1}}><span>{format(day,'d',{locale:ptBR})}</span></div>)}
        {Array.from({length:7},(_,i)=><div className="month-column" key={i} style={{gridColumn:i+1,gridRow:`1 / ${rows+1}`}}/>)}
        {weekTrips.map((t,i)=><div className="month-event trip" key={t.id} style={{gridColumn:clipPosition(t.start,t.end,weekStart),gridRow:i+2}}><b>Viagem</b> {t.title}</div>)}
        {weekAppointments.map((a,i)=><div className="month-event appointment" key={a.id} style={{gridColumn:clipPosition(a.start,a.end,weekStart),gridRow:weekTrips.length+i+2}}><strong>{a.client}</strong></div>)}
      </div>
    })}
  </div>
}

function iFor(day:Date,weekStart:Date){return differenceInCalendarDays(day,weekStart)+1}
