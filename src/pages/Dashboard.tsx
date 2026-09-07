import { differenceInCalendarDays, format, parseISO, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AlertIcon, ArrowIcon, CarIcon, CheckIcon, HotelIcon, RouteIcon } from '../components/Icons'
import { WeekCalendar } from '../components/WeekCalendar'
import { MobileAgenda } from '../components/MobileAgenda'
import { useRoutine } from '../context/RoutineContext'
import { buildPendingItems } from '../lib/pending'
import { isHotelReady, isVehicleReady } from '../lib/tripReadiness'
import { tripDisplayTitle } from '../lib/tripTitle'

function greeting(){
  const h=new Date().getHours()
  return h<12?'Bom dia.':h<18?'Boa tarde.':'Boa noite.'
}

export function Dashboard() {
  const { demands, trips, appointments, loading, error, notificationPreferences } = useRoutine()
  const activeTrips = trips.filter(t=>t.status==='planned')
  const pending = buildPendingItems(demands,activeTrips,notificationPreferences)
  const linkedAppointmentIds = new Set(activeTrips.flatMap(t => t.appointments.map(a => a.id)))
  const standaloneAppointments = appointments.filter(a => !linkedAppointmentIds.has(a.id))
  const today = startOfDay(new Date())
  const nextTrip = activeTrips.find(t=>parseISO(t.end)>=today) ?? activeTrips[0]
  const activeDemands = demands.filter(d=>!['done','cancelled'].includes(d.status)).length
  const weekAnchor = nextTrip?.start || standaloneAppointments[0]?.start || new Date()
  const nextDays = nextTrip ? differenceInCalendarDays(parseISO(nextTrip.start),today) : null
  const dateLabel = format(new Date(),"EEEE, d 'de' MMMM",{locale:ptBR})
  const hotelReady = nextTrip ? isHotelReady(nextTrip) : false
  const vehicleReady = nextTrip ? isVehicleReady(nextTrip) : false
  const todayIso = format(new Date(),'yyyy-MM-dd')
  const todayAppointments = standaloneAppointments.filter(a=>a.start<=todayIso && a.end>=todayIso)
  const todayTrips = activeTrips.filter(t=>t.start<=todayIso && t.end>=todayIso)

  return <>
    <section className="page-heading"><div><span className="eyebrow">{dateLabel}</span><h1>{greeting()}</h1><p>Aqui está o que precisa da sua atenção.</p></div></section>
    {error && <div className="data-error">{error}</div>}
    {(todayAppointments.length>0 || todayTrips.length>0) && <section className="today-strip panel"><div><span className="eyebrow">Hoje</span><strong>{todayTrips.length?`${todayTrips.length} viagem${todayTrips.length===1?'':'ns'} em andamento`:'Sem viagem hoje'}</strong><span>{todayAppointments.length?`${todayAppointments.length} atendimento${todayAppointments.length===1?'':'s'} hoje`:'Nenhum atendimento hoje'}</span></div><a className="text-link" href="/calendario">Abrir agenda <ArrowIcon/></a></section>}
    <section className="metric-grid">
      <article className="metric-card"><div className="metric-icon warn"><AlertIcon/></div><div><strong>{pending.length}</strong><span>Pendências</span></div></article>
      <article className="metric-card"><div className="metric-icon plum"><RouteIcon/></div><div><strong>{activeTrips.length}</strong><span>{activeTrips.length===1?'Viagem ativa':'Viagens ativas'}</span></div></article>
      <article className="metric-card"><div className="metric-icon neutral"><CheckIcon/></div><div><strong>{activeDemands}</strong><span>Demandas ativas</span></div></article>
    </section>
    <div className="dashboard-grid">
      <section className="panel next-trip">
        <div className="panel-head"><div><span className="eyebrow">Próxima viagem</span><h2>{nextTrip ? tripDisplayTitle(nextTrip) : 'Nenhuma viagem planejada'}</h2></div>{nextTrip && <span className="countdown">{nextDays==null?'':nextDays<0?'em andamento':nextDays===0?'hoje':`em ${nextDays} dias`}</span>}</div>
        {nextTrip ? <>
          <div className="trip-date"><strong>{nextTrip.start.split('-').reverse().join('/')} → {nextTrip.end.split('-').reverse().join('/')}</strong><span>{nextTrip.origin ? `Ponto de partida: ${nextTrip.origin} • `:''}{nextTrip.appointments.length} atendimento{nextTrip.appointments.length===1?'':'s'}</span></div>
          <div className="check-list">
            <div className={nextTrip.appointments.length ? 'ok':'pending'}><CheckIcon/> {nextTrip.appointments.length ? 'Atendimentos vinculados':'Nenhum atendimento vinculado'}</div>
            <div className={hotelReady?'ok':'pending'}><HotelIcon/> {hotelReady?'Hospedagem organizada':'Hotel ainda não reservado'}</div>
            <div className={vehicleReady?'ok':'pending'}><CarIcon/> {vehicleReady?'Veículo solicitado/confirmado':'Veículo ainda não solicitado'}</div>
          </div>
          <a className="text-link" href="/viagens">Ver viagem <ArrowIcon/></a>
        </> : <div className="empty-inline"><p>Quando você criar uma viagem, hotel, veículo e atendimentos aparecerão aqui.</p><a className="text-link" href="/viagens">Abrir viagens <ArrowIcon/></a></div>}
      </section>
      <section className="panel attention">
        <div className="panel-head"><div><span className="eyebrow">Prioridade</span><h2>Precisa da sua atenção</h2></div></div>
        <div className="attention-list">
          {pending.length===0 && <div className="attention-empty"><CheckIcon/><div><strong>Tudo em ordem</strong><span>Nenhuma pendência automática agora.</span></div></div>}
          {pending.slice(0,4).map(item=><div className="attention-item" key={item.id}><span className={`attention-dot ${item.urgency==='warn'?'amber':item.urgency}`}></span><div><strong>{item.title}</strong><span>{item.detail}</span></div><ArrowIcon/></div>)}
        </div>
      </section>
    </div>
    <section className="panel calendar-panel"><div className="panel-head"><div><span className="eyebrow">Agenda</span><h2>Visão da semana</h2></div><a className="text-link" href="/calendario">Abrir calendário <ArrowIcon/></a></div>{loading && appointments.length===0 && activeTrips.length===0 ? <div className="empty-inline">Carregando agenda...</div> : <><div className="desktop-calendar"><WeekCalendar compact trips={activeTrips} appointments={standaloneAppointments} demands={demands} weekStart={weekAnchor}/></div><div className="mobile-calendar"><MobileAgenda compact trips={activeTrips} appointments={standaloneAppointments} demands={demands} weekStart={weekAnchor}/></div></>}</section>
  </>
}
