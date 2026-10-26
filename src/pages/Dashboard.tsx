import { differenceInCalendarDays, format, parseISO, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useNavigate } from 'react-router-dom'
import { AlertIcon, ArrowIcon, CalendarIcon, CarIcon, CheckIcon, DemandIcon, FarmIcon, HotelIcon, JourneyIcon, LocationIcon, PlaneIcon, TodayIcon } from '../components/Icons'
import { TripWeatherChip } from '../components/TripWeather'
import { WeatherPanel } from '../components/WeatherPanel'
import { useRoutine } from '../context/RoutineContext'
import { buildPendingItems } from '../lib/pending'
import { isFlightReady, isHotelReady, isVehicleReady } from '../lib/tripReadiness'
import { tripDisplayTitle } from '../lib/tripTitle'

function greeting(){
  const h=new Date().getHours()
  return h<12?'Bom dia.':h<18?'Boa tarde.':'Boa noite.'
}

export function Dashboard() {
  const navigate = useNavigate()
  const { demands, trips, appointments, error, notificationPreferences } = useRoutine()
  const activeTrips = trips.filter(t=>t.status==='planned')
  const pending = buildPendingItems(demands,activeTrips,notificationPreferences)
  const linkedAppointmentIds = new Set(activeTrips.flatMap(t => t.appointments.map(a => a.id)))
  const standaloneAppointments = appointments.filter(a => !linkedAppointmentIds.has(a.id))
  const today = startOfDay(new Date())
  const nextTrip = activeTrips.find(t=>parseISO(t.end)>=today) ?? activeTrips[0]
  const activeDemands = demands.filter(d=>!['done','cancelled'].includes(d.status)).length
  const nextDays = nextTrip ? differenceInCalendarDays(parseISO(nextTrip.start),today) : null
  const dateLabel = format(new Date(),"EEEE, d 'de' MMMM",{locale:ptBR})
  const hotelReady = nextTrip ? isHotelReady(nextTrip) : false
  const vehicleReady = nextTrip ? isVehicleReady(nextTrip) : false
  const flightReady = nextTrip ? isFlightReady(nextTrip) : false
  const todayIso = format(new Date(),'yyyy-MM-dd')
  const todayAppointments = standaloneAppointments.filter(a=>a.start<=todayIso && a.end>=todayIso)
  const todayTrips = activeTrips.filter(t=>t.start<=todayIso && t.end>=todayIso)
  const todayAppointment = todayAppointments[0]
  const todayTrip = todayTrips[0]
  const nextStop = nextTrip?.appointments[0]
  const readinessItems = nextTrip ? [
    { key: 'appointments', label: 'Atendimentos', detail: nextTrip.appointments.length ? `${nextTrip.appointments.length} vinculado${nextTrip.appointments.length===1?'':'s'}` : 'Nenhum vinculado', ready: nextTrip.appointments.length > 0, icon: DemandIcon },
    ...(nextTrip.hotelRequired ? [{ key: 'hotel', label: 'Hospedagem', detail: hotelReady ? 'Organizada' : 'Reserva pendente', ready: hotelReady, icon: HotelIcon }] : []),
    ...(nextTrip.vehicleRequired ? [{ key: 'vehicle', label: 'Veículo', detail: vehicleReady ? 'Solicitado ou confirmado' : 'Solicitação pendente', ready: vehicleReady, icon: CarIcon }] : []),
    ...(nextTrip.flightRequired ? [{ key: 'flight', label: 'Passagem', detail: flightReady ? 'Confirmada' : 'Em organização', ready: flightReady, icon: PlaneIcon }] : []),
  ] : []
  const readySteps = readinessItems.filter(item=>item.ready).length
  const preparation = readinessItems.length ? Math.round(readySteps / readinessItems.length * 100) : 0

  const openPending = (item: ReturnType<typeof buildPendingItems>[number]) => {
    if (item.target === '/viagens' && item.entityId) {
      const focus = item.kind === 'hotel' ? '&focus=hotel' : item.kind === 'vehicle' ? '&focus=vehicle' : item.kind === 'flight' ? '&focus=flight' : ''
      navigate(`/viagens?trip=${encodeURIComponent(item.entityId)}${focus}`)
      return
    }
    if (item.target === '/entrada' && item.entityId) {
      try { window.localStorage.setItem('routine-assist-focus-demand', item.entityId) } catch { /* noop */ }
      navigate('/entrada')
      return
    }
    navigate(item.target)
  }

  return <>
    <section className="page-heading dashboard-heading">
      <div className="dashboard-heading-main"><span className="dashboard-heading-icon"><TodayIcon/></span><div><span className="eyebrow">{dateLabel}</span><h1>{greeting()}</h1><p>Acompanhe sua operação e prepare os próximos deslocamentos.</p></div></div>
    </section>
    {error && <div className="data-error">{error}</div>}
    {(todayAppointments.length>0 || todayTrips.length>0) && <section className="today-strip panel dashboard-today-strip">
      <div className="today-strip-title"><span className="dashboard-mini-icon"><TodayIcon/></span><span><small>Hoje</small><strong>Resumo do dia</strong></span></div>
      <div className="today-strip-facts">
        <span className={todayTrips.length ? 'active' : ''}><JourneyIcon/><span><strong>{todayTrips.length?`${todayTrips.length} viagem${todayTrips.length===1?'':'ns'} em andamento`:'Sem viagem hoje'}</strong>{todayTrip&&<small>{tripDisplayTitle(todayTrip)}</small>}</span></span>
        <span className={todayAppointments.length ? 'active' : ''}><CalendarIcon/><span><strong>{todayAppointments.length?`${todayAppointments.length} atendimento${todayAppointments.length===1?'':'s'} hoje`:'Nenhum atendimento hoje'}</strong>{todayAppointment&&<small>{todayAppointment.farmName || todayAppointment.client} • {todayAppointment.type}</small>}</span></span>
      </div>
      <button type="button" className="text-link text-link-button" onClick={()=>navigate('/calendario')}>Abrir agenda <ArrowIcon/></button>
    </section>}
    <section className="metric-grid dashboard-metrics">
      <button type="button" className="metric-card metric-card-action metric-pending" onClick={()=>document.getElementById('dashboard-attention')?.scrollIntoView({ behavior: 'smooth', block: 'center' })} title="Ver pendências"><div className="metric-icon warn"><AlertIcon/></div><div><strong>{pending.length}</strong><span>Pendências</span></div><ArrowIcon className="metric-card-arrow"/></button>
      <button type="button" className="metric-card metric-card-action metric-trips" onClick={()=>navigate('/viagens')} title="Abrir viagens"><div className="metric-icon plum"><JourneyIcon/></div><div><strong>{activeTrips.length}</strong><span>{activeTrips.length===1?'Viagem ativa':'Viagens ativas'}</span></div><ArrowIcon className="metric-card-arrow"/></button>
      <button type="button" className="metric-card metric-card-action metric-demands" onClick={()=>navigate('/entrada')} title="Abrir demandas"><div className="metric-icon neutral"><DemandIcon/></div><div><strong>{activeDemands}</strong><span>Demandas ativas</span></div><ArrowIcon className="metric-card-arrow"/></button>
    </section>
    <div className="dashboard-grid">
      <section className="panel next-trip dashboard-next-trip">
        <div className="panel-head next-trip-head"><div><span className="eyebrow">Próxima viagem</span><div className="next-trip-title-line"><h2>{nextTrip ? tripDisplayTitle(nextTrip) : 'Nenhuma viagem planejada'}</h2>{nextTrip&&<TripWeatherChip trip={nextTrip}/>}</div></div>{nextTrip && <span className="countdown">{nextDays==null?'':nextDays<0?'em andamento':nextDays===0?'hoje':`em ${nextDays} dias`}</span>}</div>
        {nextTrip ? <>
          <div className="next-trip-overview">
            <span className="next-trip-visual"><FarmIcon/></span>
            <div><strong>{nextStop?.farmName || nextStop?.client || 'Roteiro em organização'}</strong><span><CalendarIcon/> {nextTrip.start.split('-').reverse().join('/')} → {nextTrip.end.split('-').reverse().join('/')}</span><small><LocationIcon/> {nextStop?.city ? `${nextStop.city}${nextStop.state?`/${nextStop.state}`:''}` : nextTrip.origin || 'Destino não informado'}</small></div>
          </div>
          <div className="trip-preparation" aria-label={`${preparation}% da preparação concluída`}>
            <div><span>Preparação da viagem</span><strong>{readySteps}/{readinessItems.length} etapas prontas</strong></div>
            <span className="trip-preparation-track"><i style={{ width: `${preparation}%` }}/></span>
          </div>
          <div className="check-list dashboard-check-list">
            {readinessItems.map(({key,label,detail,ready,icon:Icon})=><div className={ready?'ok':'pending'} key={key}><span className="readiness-icon"><Icon/></span><span><strong>{label}</strong><small>{detail}</small></span><span className="readiness-state" title={ready?'Organizado':'Pendente'}>{ready?<CheckIcon/>:<AlertIcon/>}</span></div>)}
          </div>
          <button className="text-link text-link-button" onClick={()=>navigate(`/viagens?trip=${encodeURIComponent(nextTrip.id)}`)}>Ver viagem <ArrowIcon/></button>
        </> : <div className="empty-inline"><p>Quando você criar uma viagem, hotel, veículo e atendimentos aparecerão aqui.</p><a className="text-link" href="/viagens">Abrir viagens <ArrowIcon/></a></div>}
      </section>
      <section className={`panel attention dashboard-attention ${pending.length===0?'attention-clear':''}`} id="dashboard-attention">
        <div className="panel-head"><div><span className="eyebrow">Prioridade</span><h2>Precisa da sua atenção</h2></div>{pending.length>0&&<span className="attention-count">{pending.length}</span>}</div>
        <div className="attention-list">
          {pending.length===0 && <div className="attention-empty attention-clear-state"><span className="attention-clear-icon"><CheckIcon/></span><div><strong>Tudo organizado</strong><span>Nenhuma pendência automática agora. Sua próxima viagem está pronta para acompanhamento.</span></div></div>}
          {pending.slice(0,4).map(item=><button type="button" className="attention-item attention-item-button" key={item.id} onClick={()=>openPending(item)} aria-label={`${item.title}: ${item.detail}`}><span className={`attention-dot ${item.urgency==='warn'?'amber':item.urgency}`}></span><div><strong>{item.title}</strong><span>{item.detail}</span></div><ArrowIcon/></button>)}
        </div>
      </section>
    </div>
    <WeatherPanel/>
  </>
}
