import { addDays, addWeeks, differenceInCalendarDays, endOfMonth, endOfWeek, format, isAfter, isBefore, isWeekend, parseISO, startOfMonth, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { appointmentCompanyKey, companyClass, companyLabel, tripCompanyKey } from '../lib/company'
import { compactTripClients, compactTripCommercials, compactTripStops, holidayForDate } from '../lib/calendar'
import { tripDisplayTitle } from '../lib/tripTitle'
import { CarIcon, HotelIcon, PlaneIcon } from './Icons'
import { isFlightReady, isHotelReady, isVehicleReady } from '../lib/tripReadiness'
import type { Appointment, Demand, Holiday, Trip } from '../types/routine'

function clipPosition(start:string,end:string,weekStart:Date){
  const weekEnd=endOfWeek(weekStart,{weekStartsOn:1})
  const s=parseISO(start),e=parseISO(end)
  const clippedStart=isBefore(s,weekStart)?weekStart:s
  const clippedEnd=isAfter(e,weekEnd)?weekEnd:e
  const from=differenceInCalendarDays(clippedStart,weekStart)+1
  const to=differenceInCalendarDays(clippedEnd,weekStart)+2
  return `${from} / ${to}`
}

export function MonthCalendar({ month, trips, appointments, demands=[], holidays=[], onDaySelect }:{month:Date;trips:Trip[];appointments:Appointment[];demands?:Demand[];holidays?:Holiday[];onDaySelect?:(day:Date)=>void}){
  const gridStart=startOfWeek(startOfMonth(month),{weekStartsOn:1})
  const gridEnd=endOfWeek(endOfMonth(month),{weekStartsOn:1})
  const weeks:Date[]=[]
  for(let d=gridStart;!isAfter(d,gridEnd);d=addWeeks(d,1))weeks.push(d)
  const dayNames=['SEG','TER','QUA','QUI','SEX','SÁB','DOM']

  return <div className="month-calendar">
    <div className="month-head">{dayNames.map((d,i)=><span className={i>=5?'weekend':''} key={d}>{d}</span>)}</div>
    {weeks.map((weekStart)=>{
      const weekEnd=endOfWeek(weekStart,{weekStartsOn:1})
      const weekTrips=trips.filter(t=>!isBefore(parseISO(t.end),weekStart)&&!isAfter(parseISO(t.start),weekEnd))
      const weekAppointments=appointments.filter(a=>!isBefore(parseISO(a.end),weekStart)&&!isAfter(parseISO(a.start),weekEnd))
      const rows=Math.max(3,1+weekTrips.length+weekAppointments.length)
      return <div className="month-week" key={weekStart.toISOString()} style={{gridTemplateRows:`36px repeat(${rows-1},50px)`}}>
        {Array.from({length:7},(_,i)=>addDays(weekStart,i)).map(day=>{const holiday=holidayForDate(holidays,day);return <button type="button" className={`month-day month-day-button ${day.getMonth()===month.getMonth()?'':'outside'} ${isWeekend(day)?'weekend':''} ${holiday?'holiday':''}`} key={day.toISOString()} onClick={()=>onDaySelect?.(day)} style={{gridColumn:iFor(day,weekStart),gridRow:1}}><span>{format(day,'d',{locale:ptBR})}</span>{holiday&&<small title={holiday.name}>{holiday.name}</small>}</button>})}
        {Array.from({length:7},(_,i)=>{const day=addDays(weekStart,i);const holiday=holidayForDate(holidays,day);return <button type="button" aria-label="Abrir resumo do dia" className={`month-column month-column-button ${isWeekend(day)?'weekend':''} ${holiday?'holiday':''}`} key={i} onClick={()=>onDaySelect?.(day)} style={{gridColumn:i+1,gridRow:`1 / ${rows+1}`}}/>}) }
        {weekTrips.map((t,i)=>{const key=tripCompanyKey(t,demands); const commercial=compactTripCommercials(t,demands,2); return <button type="button" className={`month-event trip month-event-button ${companyClass(key)}`} key={t.id} onClick={()=>onDaySelect?.(isBefore(parseISO(t.start),weekStart)?weekStart:parseISO(t.start))} style={{gridColumn:clipPosition(t.start,t.end,weekStart),gridRow:i+2}}><span className="month-event-main"><b>{companyLabel(key)}</b><strong>{compactTripStops(t,2)}</strong><span className="calendar-logistics-icons">{t.hotelRequired&&<i className={isHotelReady(t)?'ok':'pending'} title={isHotelReady(t)?'Hotel organizado':'Hotel pendente'}><HotelIcon/></i>}{t.vehicleRequired&&<i className={isVehicleReady(t)?'ok':'pending'} title={isVehicleReady(t)?'Veículo organizado':'Veículo pendente'}><CarIcon/></i>}{t.flightRequired&&<i className={isFlightReady(t)?'ok':'pending'} title={isFlightReady(t)?'Passagem organizada':'Passagem pendente'}><PlaneIcon/></i>}</span></span><small>{compactTripClients(t,2)}{commercial?` • Comercial: ${commercial}`:''}</small></button>})}
        {weekAppointments.map((a,i)=>{const key=appointmentCompanyKey(a,demands); return <button type="button" className={`month-event appointment month-event-button ${companyClass(key)}`} key={a.id} onClick={()=>onDaySelect?.(isBefore(parseISO(a.start),weekStart)?weekStart:parseISO(a.start))} style={{gridColumn:clipPosition(a.start,a.end,weekStart),gridRow:weekTrips.length+i+2}}><span className="month-event-main"><b>{companyLabel(key)}</b><strong>{a.farmName || a.client}</strong></span><small>{a.client} • sem viagem</small></button>})}
      </div>
    })}
  </div>
}

function iFor(day:Date,weekStart:Date){return differenceInCalendarDays(day,weekStart)+1}
