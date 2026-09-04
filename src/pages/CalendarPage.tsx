import { addDays, addMonths, addWeeks, format, startOfMonth, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useState } from 'react'
import { WeekCalendar } from '../components/WeekCalendar'
import { MobileAgenda } from '../components/MobileAgenda'
import { MonthCalendar } from '../components/MonthCalendar'
import { AlertIcon } from '../components/Icons'
import { useRoutine } from '../context/RoutineContext'

type ViewMode='month'|'week'|'agenda'

export function CalendarPage(){
  const { trips, appointments } = useRoutine()
  const [mode,setMode]=useState<ViewMode>('week')
  const [anchor,setAnchor]=useState(()=>new Date())
  const week=startOfWeek(anchor,{weekStartsOn:1})
  const month=startOfMonth(anchor)
  const label = mode==='month' ? format(month,"MMMM 'de' yyyy",{locale:ptBR}) : `${format(week,'dd MMM',{locale:ptBR})} — ${format(addDays(week,6),'dd MMM',{locale:ptBR})}`
  const previous=()=>setAnchor(a=>mode==='month'?addMonths(a,-1):addWeeks(a,-1))
  const next=()=>setAnchor(a=>mode==='month'?addMonths(a,1):addWeeks(a,1))
  const changeMode=(nextMode:ViewMode)=>{setMode(nextMode);setAnchor(new Date())}

  return <>
    <section className="page-heading horizontal"><div><span className="eyebrow">Agenda</span><h1>Calendário</h1><p>Viagens e atendimentos aparecem como períodos contínuos. O Routine valida conflitos antes de novos agendamentos.</p></div>
      <div className="view-switch desktop-calendar-switch"><button className={mode==='month'?'active':''} onClick={()=>changeMode('month')}>Mês</button><button className={mode==='week'?'active':''} onClick={()=>changeMode('week')}>Semana</button><button className={mode==='agenda'?'active':''} onClick={()=>changeMode('agenda')}>Agenda</button></div>
      <div className="view-switch mobile-calendar-switch"><button className={mode==='month'?'active':''} onClick={()=>changeMode('month')}>Mês</button><button className={mode==='week'?'active':''} onClick={()=>changeMode('week')}>Semana</button><button className={mode==='agenda'?'active':''} onClick={()=>changeMode('agenda')}>Agenda</button></div>
    </section>
    <section className="panel calendar-main-panel"><div className="calendar-toolbar"><button aria-label="Período anterior" onClick={previous}>‹</button><strong className="calendar-period-label">{label}</strong><div className="calendar-toolbar-right"><button className="today-button" onClick={()=>setAnchor(new Date())}>Hoje</button><button aria-label="Próximo período" onClick={next}>›</button></div></div>
      {mode==='month' && <div className="desktop-month-calendar"><MonthCalendar month={month} trips={trips} appointments={appointments}/></div>}
      {mode==='month' && <div className="mobile-month-fallback"><MonthCalendar month={month} trips={trips} appointments={appointments}/></div>}
      {mode==='week' && <div className="desktop-calendar"><WeekCalendar trips={trips} appointments={appointments} weekStart={week}/></div>}
      {mode==='week' && <div className="mobile-calendar"><MobileAgenda trips={trips} appointments={appointments} weekStart={week}/></div>}
      {mode==='agenda' && <MobileAgenda trips={trips} appointments={appointments} weekStart={week}/>} 
    </section>
    <div className="calendar-legend"><span><i className="legend trip"></i> Viagem</span><span><i className="legend appointment"></i> Atendimento</span><span><AlertIcon/> Sobreposição é validada antes do agendamento</span></div>
  </>
}
