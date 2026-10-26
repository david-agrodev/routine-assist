import { addDays, addWeeks, differenceInCalendarDays, endOfMonth, endOfWeek, format, isAfter, isBefore, isToday, isWeekend, parseISO, startOfMonth, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { appointmentCompanyKey, companyClass, companyLabel, tripCompanyKey } from '../lib/company'
import { compactTripClients, compactTripCommercials, compactTripStops, holidayForDate } from '../lib/calendar'
import { tripDisplayTitle } from '../lib/tripTitle'
import { CheckIcon, RequestIcon } from './Icons'
import { TripLogisticsIcons, TripStatusBadge, tripDone, tripReadinessStatus } from './CalendarTripVisuals'
import { TripWeatherChip } from './TripWeather'
import { formatScheduleTime } from '../lib/format'
import type { Appointment, BookingRequest, Demand, Holiday, Trip } from '../types/routine'

function clipPosition(start:string,end:string,weekStart:Date){
  const weekEnd=endOfWeek(weekStart,{weekStartsOn:1})
  const s=parseISO(start),e=parseISO(end)
  const clippedStart=isBefore(s,weekStart)?weekStart:s
  const clippedEnd=isAfter(e,weekEnd)?weekEnd:e
  const from=differenceInCalendarDays(clippedStart,weekStart)+1
  const to=differenceInCalendarDays(clippedEnd,weekStart)+2
  return `${from} / ${to}`
}
const demandForAppointment = (appointment: Appointment, demands: Demand[]) => appointment.demandId ? demands.find(d => d.id === appointment.demandId) : undefined
const appointmentDone = (appointment: Appointment, demands: Demand[]) => demandForAppointment(appointment, demands)?.status === 'done'
const appointmentRemote = (appointment: Appointment) => appointment.type === 'Remoto'
export function MonthCalendar({ month, trips, appointments, bookingRequests=[], demands=[], holidays=[], onDaySelect, onBookingRequestSelect, mobile=false }:{month:Date;trips:Trip[];appointments:Appointment[];bookingRequests?:BookingRequest[];demands?:Demand[];holidays?:Holiday[];onDaySelect?:(day:Date)=>void;onBookingRequestSelect?:(request:BookingRequest)=>void;mobile?:boolean}){
  const gridStart=startOfWeek(startOfMonth(month),{weekStartsOn:1})
  const gridEnd=endOfWeek(endOfMonth(month),{weekStartsOn:1})
  const weeks:Date[]=[]
  for(let d=gridStart;!isAfter(d,gridEnd);d=addWeeks(d,1))weeks.push(d)
  const dayNames=['SEG','TER','QUA','QUI','SEX','SÁB','DOM']

  return <div className={`month-calendar ${mobile?'month-calendar-mobile':''}`}>
    <div className="month-head">{dayNames.map((d,i)=><span className={i>=5?'weekend':''} key={d}>{d}</span>)}</div>
    {weeks.map((weekStart)=>{
      const weekEnd=endOfWeek(weekStart,{weekStartsOn:1})
      const weekTrips=trips.filter(t=>!isBefore(parseISO(t.end),weekStart)&&!isAfter(parseISO(t.start),weekEnd))
      const weekAppointments=appointments.filter(a=>!isBefore(parseISO(a.end),weekStart)&&!isAfter(parseISO(a.start),weekEnd))
      const weekRequests=bookingRequests.filter(request=>request.status==='pending'&&!isBefore(parseISO(request.end),weekStart)&&!isAfter(parseISO(request.start),weekEnd))
      const rows=Math.max(3,1+weekTrips.length+weekAppointments.length+weekRequests.length)
      return <div className="month-week" key={weekStart.toISOString()} style={{gridTemplateRows:`36px repeat(${rows-1},${mobile?'132px':'76px'})`}}>
        {Array.from({length:7},(_,i)=>addDays(weekStart,i)).map(day=>{const holiday=holidayForDate(holidays,day);const today=isToday(day);return <button type="button" className={`month-day month-day-button ${day.getMonth()===month.getMonth()?'':'outside'} ${isWeekend(day)?'weekend':''} ${holiday?'holiday':''} ${today?'today':''}`} aria-current={today?'date':undefined} key={day.toISOString()} onClick={()=>onDaySelect?.(day)} style={{gridColumn:iFor(day,weekStart),gridRow:1}}><span>{format(day,'d',{locale:ptBR})}</span>{today?<small title={holiday?.name}>Hoje</small>:holiday&&<small title={holiday.name}>{holiday.name}</small>}</button>})}
        {Array.from({length:7},(_,i)=>{const day=addDays(weekStart,i);const holiday=holidayForDate(holidays,day);const today=isToday(day);return <button type="button" aria-label="Abrir resumo do dia" aria-current={today?'date':undefined} className={`month-column month-column-button ${isWeekend(day)?'weekend':''} ${holiday?'holiday':''} ${today?'today':''}`} key={i} onClick={()=>onDaySelect?.(day)} style={{gridColumn:i+1,gridRow:`1 / ${rows+1}`}}/>}) }
        {weekTrips.map((t,i)=>{const key=tripCompanyKey(t,demands); const commercial=compactTripCommercials(t,demands,2); const done=tripDone(t,demands); const status=tripReadinessStatus(t); return <button type="button" className={`month-event trip month-event-button ${companyClass(key)} ${done?'calendar-event-done':''}`} key={t.id} onClick={()=>onDaySelect?.(isBefore(parseISO(t.start),weekStart)?weekStart:parseISO(t.start))} style={{gridColumn:clipPosition(t.start,t.end,weekStart),gridRow:i+2}}><span className="month-event-main"><b>{companyLabel(key)}</b><TripWeatherChip trip={t}/><strong>{compactTripStops(t,2)}</strong><TripLogisticsIcons trip={t} done={done}/></span><small className="month-event-detail"><span>{compactTripClients(t,2)}</span>{commercial&&<span>Comercial: {commercial}</span>}</small>{status.tone!=='ready'&&<span className="month-event-aux"><TripStatusBadge trip={t}/></span>}</button>})}
        {weekAppointments.map((a,i)=>{const key=appointmentCompanyKey(a,demands); const done=appointmentDone(a,demands); const remote=appointmentRemote(a); return <button type="button" className={`month-event appointment month-event-button ${companyClass(key)} ${done?'calendar-event-done':''} ${remote?'calendar-event-remote':''}`} key={a.id} onClick={()=>onDaySelect?.(isBefore(parseISO(a.start),weekStart)?weekStart:parseISO(a.start))} style={{gridColumn:clipPosition(a.start,a.end,weekStart),gridRow:weekTrips.length+i+2}}><span className="month-event-main"><b>{companyLabel(key)}</b><strong>{a.farmName || a.client}{remote&&<span className="calendar-remote-badge">Remoto</span>}{done&&<span className="calendar-done-badge"><CheckIcon/> Concluída</span>}</strong></span><small>{a.client} • {formatScheduleTime(a)} • {remote?'atendimento remoto':'sem viagem'}</small></button>})}
        {weekRequests.map((request,i)=><button type="button" className="month-event booking-request month-event-button" key={request.id} onClick={()=>onBookingRequestSelect?.(request)} style={{gridColumn:clipPosition(request.start,request.end,weekStart),gridRow:weekTrips.length+weekAppointments.length+i+2}}><span className="month-event-main"><b><RequestIcon/> Pedido</b><strong>{request.farmName}</strong></span><small>{request.central} • aguardando aprovação</small></button>)}
      </div>
    })}
  </div>
}

function iFor(day:Date,weekStart:Date){return differenceInCalendarDays(day,weekStart)+1}
