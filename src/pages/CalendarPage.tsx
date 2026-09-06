import { addDays, addMonths, addWeeks, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { WeekCalendar } from '../components/WeekCalendar'
import { MobileAgenda } from '../components/MobileAgenda'
import { MonthCalendar } from '../components/MonthCalendar'
import { AgendaSummaryModal } from '../components/AgendaSummaryModal'
import { DemandDetailModal } from '../components/DemandDetailModal'
import { AlertIcon, CalendarIcon, RouteIcon } from '../components/Icons'
import { useRoutine } from '../context/RoutineContext'
import { getBrazilHolidaysForYears } from '../services/holidays'
import type { Demand, Holiday, Trip } from '../types/routine'

type ViewMode='month'|'week'|'agenda'

export function CalendarPage(){
  const { trips, appointments, demands } = useRoutine()
  const linkedAppointmentIds = useMemo(()=>new Set(trips.flatMap(t => t.appointments.map(a => a.id))),[trips])
  const standaloneAppointments = useMemo(()=>appointments.filter(a => !linkedAppointmentIds.has(a.id)),[appointments,linkedAppointmentIds])
  const navigate = useNavigate()
  const [mode,setMode]=useState<ViewMode>('week')
  const [anchor,setAnchor]=useState(()=>new Date())
  const [summaryDate,setSummaryDate]=useState<Date|null>(null)
  const [selectedDemand,setSelectedDemand]=useState<Demand|null>(null)
  const [holidays,setHolidays]=useState<Holiday[]>([])
  const [holidayLoadError,setHolidayLoadError]=useState(false)

  const week=startOfWeek(anchor,{weekStartsOn:1})
  const month=startOfMonth(anchor)
  const periodStart=mode==='month'?startOfWeek(month,{weekStartsOn:1}):week
  const periodEnd=mode==='month'?endOfWeek(endOfMonth(month),{weekStartsOn:1}):addDays(week,6)
  const label = mode==='month' ? format(month,"MMMM 'de' yyyy",{locale:ptBR}) : `${format(week,'dd MMM',{locale:ptBR})} — ${format(addDays(week,6),'dd MMM',{locale:ptBR})}`

  useEffect(()=>{
    const years=[periodStart.getFullYear(),periodEnd.getFullYear()]
    let active=true
    setHolidayLoadError(false)
    void getBrazilHolidaysForYears(years).then(items=>{if(active){setHolidays(items);setHolidayLoadError(false)}}).catch(()=>{if(active){setHolidays([]);setHolidayLoadError(true)}})
    return()=>{active=false}
  },[periodStart.getFullYear(),periodEnd.getFullYear()])

  const visibleHolidayCount=useMemo(()=>{
    const start=format(periodStart,'yyyy-MM-dd'),end=format(periodEnd,'yyyy-MM-dd')
    return holidays.filter(h=>h.date>=start&&h.date<=end).length
  },[holidays,periodStart,periodEnd])

  const existingConflicts=useMemo(()=>{
    const pairs:{first:string;second:string;start:string;end:string}[]=[]
    for(let i=0;i<appointments.length;i++) for(let j=i+1;j<appointments.length;j++){
      const a=appointments[i],b=appointments[j]
      const sameResponsible=!a.responsible||!b.responsible||a.responsible===b.responsible
      if(sameResponsible&&a.start<=b.end&&a.end>=b.start) pairs.push({first:a.farmName||a.client,second:b.farmName||b.client,start:a.start>b.start?a.start:b.start,end:a.end<b.end?a.end:b.end})
    }
    return pairs
  },[appointments])

  const previous=()=>setAnchor(a=>mode==='month'?addMonths(a,-1):addWeeks(a,-1))
  const next=()=>setAnchor(a=>mode==='month'?addMonths(a,1):addWeeks(a,1))
  const changeMode=(nextMode:ViewMode)=>{setMode(nextMode);setAnchor(new Date())}
  const openDemand=(demand:Demand)=>{setSummaryDate(null);setSelectedDemand(demand)}
  const openTrip=(trip:Trip)=>{setSummaryDate(null);navigate(`/viagens?trip=${encodeURIComponent(trip.id)}`)}

  return <>
    <section className="page-heading calendar-page-heading">
      <div><span className="eyebrow">Agenda operacional</span><h1>Calendário</h1><p>Todas as centrais ficam visíveis ao mesmo tempo para evitar conflitos. Viagens aparecem como períodos contínuos e mostram as fazendas vinculadas.</p></div>
      <div className="calendar-heading-badge"><CalendarIcon/><div><strong>{trips.length}</strong><span>viagens no calendário</span></div></div>
    </section>

    <section className="calendar-controls panel calendar-controls-no-filter">
      <div className="calendar-context-copy"><RouteIcon/><div><strong>Agenda única</strong><span>ALTA e GENEX sempre aparecem juntas.</span></div></div>
      <div className="calendar-context-copy holiday-context"><CalendarIcon/><div><strong>{holidayLoadError?'—':visibleHolidayCount}</strong><span>{holidayLoadError?'feriados indisponíveis':`feriado${visibleHolidayCount===1?'':'s'} nacional${visibleHolidayCount===1?'':'is'} neste período`}</span></div></div>
      <div className="calendar-view-control"><span>Visualização</span><div className="view-switch"><button className={mode==='month'?'active':''} onClick={()=>changeMode('month')}>Mês</button><button className={mode==='week'?'active':''} onClick={()=>changeMode('week')}>Semana</button><button className={mode==='agenda'?'active':''} onClick={()=>changeMode('agenda')}>Agenda</button></div></div>
    </section>


    {existingConflicts.length>0 && <div className="legacy-conflict-banner"><AlertIcon/><div><strong>{existingConflicts.length} conflito{existingConflicts.length===1?' antigo':'s antigos'} na agenda</strong><span>Há atendimentos já cadastrados em datas sobrepostas. Novos conflitos estão bloqueados; ajuste os períodos antigos em Demandas.</span></div></div>}

    <section className="panel calendar-main-panel redesigned-calendar-panel">
      <div className="calendar-toolbar modern-calendar-toolbar">
        <button aria-label="Período anterior" onClick={previous}>‹</button>
        <div className="calendar-period-copy"><span className="eyebrow">Período</span><strong className="calendar-period-label">{label}</strong><small>Finais de semana e feriados são destacados. Toque em uma data para abrir o resumo.</small></div>
        <div className="calendar-toolbar-right"><button className="today-button" onClick={()=>setAnchor(new Date())}>Hoje</button><button aria-label="Próximo período" onClick={next}>›</button></div>
      </div>
      {mode==='month' && <div className="desktop-month-calendar"><MonthCalendar month={month} trips={trips} appointments={standaloneAppointments} demands={demands} holidays={holidays} onDaySelect={setSummaryDate}/></div>}
      {mode==='month' && <div className="mobile-month-fallback"><MonthCalendar month={month} trips={trips} appointments={standaloneAppointments} demands={demands} holidays={holidays} onDaySelect={setSummaryDate}/></div>}
      {mode==='week' && <div className="desktop-calendar"><WeekCalendar trips={trips} appointments={standaloneAppointments} demands={demands} holidays={holidays} weekStart={week} onDaySelect={setSummaryDate}/></div>}
      {mode==='week' && <div className="mobile-calendar"><MobileAgenda trips={trips} appointments={standaloneAppointments} demands={demands} holidays={holidays} weekStart={week} onDaySelect={setSummaryDate}/></div>}
      {mode==='agenda' && <MobileAgenda trips={trips} appointments={standaloneAppointments} demands={demands} holidays={holidays} weekStart={week} onDaySelect={setSummaryDate}/>} 
    </section>
    <div className="calendar-legend modern-calendar-legend"><span><i className="legend company-alta"></i> ALTA</span><span><i className="legend company-genex"></i> GENEX</span><span><i className="legend weekend"></i> Sábado / domingo</span><span><i className="legend holiday"></i> Feriado nacional</span><span><AlertIcon/> Datas ocupadas não podem receber outro atendimento.</span></div>

    <AgendaSummaryModal date={summaryDate} trips={trips} appointments={standaloneAppointments} demands={demands} holidays={holidays} onClose={()=>setSummaryDate(null)} onOpenDemand={openDemand} onOpenTrip={openTrip}/>
    <DemandDetailModal demand={selectedDemand} onClose={()=>setSelectedDemand(null)}/>
  </>
}
