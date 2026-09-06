import { differenceInCalendarDays, parseISO } from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  BuildingIcon,
  CarIcon,
  CheckIcon,
  CompassIcon,
  EditIcon,
  HotelIcon,
  ListIcon,
  LocationIcon,
  PlusIcon,
  RouteIcon,
  TrashIcon,
} from '../components/Icons'
import { CreateTripModal } from '../components/CreateTripModal'
import { LinkAppointmentsModal } from '../components/LinkAppointmentsModal'
import { LodgingModal } from '../components/LodgingModal'
import { VehicleModal } from '../components/VehicleModal'
import { ConfirmActionModal } from '../components/ConfirmActionModal'
import { EditTripModal } from '../components/EditTripModal'
import { useRoutine } from '../context/RoutineContext'
import { VEHICLE_FORM_URL } from '../lib/constants'
import { formatDateRange, formatMoney } from '../lib/format'
import { companyClass, companyLabel, tripCompanyKey } from '../lib/company'
import { compactTripStops } from '../lib/calendar'
import { isHotelReady, isVehicleReady } from '../lib/tripReadiness'
import type { Lodging, Trip } from '../types/routine'

export function TripsPage(){
  const { trips, demands, loading, deleteTrip } = useRoutine()
  const [searchParams,setSearchParams] = useSearchParams()
  const queryTripId = searchParams.get('trip')
  const [createOpen,setCreateOpen]=useState(false)
  const [selectedId,setSelectedId]=useState<string|null>(queryTripId || null)
  const [lodgingTrip,setLodgingTrip]=useState<Trip|null>(null)
  const [editingLodging,setEditingLodging]=useState<Lodging|null>(null)
  const [vehicleTrip,setVehicleTrip]=useState<Trip|null>(null)
  const [linkTrip,setLinkTrip]=useState<Trip|null>(null)
  const [editTrip,setEditTrip]=useState<Trip|null>(null)
  const [deleting,setDeleting]=useState(false)
  const [deleteOpen,setDeleteOpen]=useState(false)
  const [deleteError,setDeleteError]=useState<string|null>(null)
  const sorted=useMemo(()=>[...trips].sort((a,b)=>a.start.localeCompare(b.start)),[trips])
  const selected=selectedId ? sorted.find(t=>t.id===selectedId) || null : null

  useEffect(()=>{
    if (queryTripId && sorted.some(t=>t.id===queryTripId)) {
      setSelectedId(queryTripId)
      return
    }
    if (!queryTripId) setSelectedId(null)
  },[queryTripId,sorted])

  useEffect(()=>{
    if(selectedId && !sorted.some(t=>t.id===selectedId)){
      setSelectedId(null)
      setSearchParams({})
    }
  },[selectedId,sorted,setSearchParams])

  const selectTrip=(trip:Trip)=>{
    setSelectedId(trip.id)
    setSearchParams({trip:trip.id})
    window.requestAnimationFrame(()=>document.getElementById('trip-selected-detail')?.scrollIntoView({behavior:'smooth',block:'start'}))
  }

  const closeSelected=()=>{
    setSelectedId(null)
    setSearchParams({})
    window.requestAnimationFrame(()=>document.getElementById('trip-browser')?.scrollIntoView({behavior:'smooth',block:'start'}))
  }

  const pageHeader=<section className="page-heading trips-page-heading"><div><span className="eyebrow">Logística</span><h1>Viagens</h1><p>Escolha a viagem que deseja consultar. Nenhuma viagem fica aberta automaticamente para manter a tela simples e objetiva.</p></div><div className="page-heading-actions"><button className="primary" onClick={()=>setCreateOpen(true)}><PlusIcon/> Nova viagem</button></div></section>

  if (!sorted.length) return <>
    {pageHeader}
    <div className="empty-state large trip-empty-state"><span className="section-icon terracotta"><RouteIcon/></span><strong>{loading?'Carregando viagens...':'Nenhuma viagem cadastrada ainda.'}</strong><p>Crie uma viagem e vincule um ou mais atendimentos presenciais. Depois organize hospedagem, veículo e rota.</p><div className="empty-actions"><button className="primary" onClick={()=>setCreateOpen(true)}><PlusIcon/> Criar viagem</button></div></div>
    <CreateTripModal open={createOpen} onClose={()=>setCreateOpen(false)}/>
  </>

  const removeSelectedTrip = async () => {
    if (!selected || deleting) return
    setDeleting(true); setDeleteError(null)
    try {
      await deleteTrip(selected.id)
      setSelectedId(null)
      setSearchParams({})
      setDeleteOpen(false)
    } catch (e:any) {
      setDeleteError(e?.message || 'Não foi possível excluir a viagem.')
    } finally { setDeleting(false) }
  }

  const browser=<section id="trip-browser" className="panel trip-browser trip-browser-v14">
    <div className="trip-browser-head">
      <div><span className="eyebrow">Suas viagens</span><h2>Qual viagem deseja acessar?</h2><p>Selecione um card para abrir atendimentos, hospedagem, veículo e rota.</p></div>
      <span>{sorted.length} cadastrada{sorted.length===1?'':'s'}</span>
    </div>
    <div className="trip-browser-grid">{sorted.map(t=>{
      const key=tripCompanyKey(t,demands)
      const hotelOk=isHotelReady(t)
      const vehicleOk=isVehicleReady(t)
      return <button type="button" key={t.id} className={`trip-browser-card ${t.id===selected?.id?'active':''} ${companyClass(key)}`} onClick={()=>selectTrip(t)}>
        <span className="trip-browser-accent" aria-hidden="true"/>
        <div className="trip-browser-card-top"><span className="company-badge">{companyLabel(key)}</span><span>{formatDateRange(t.start,t.end)}</span></div>
        <strong>{t.title}</strong>
        <small><LocationIcon/> {compactTripStops(t,2)}</small>
        <div className="trip-browser-card-meta"><span><BuildingIcon/> {t.appointments.length} {t.appointments.length===1?'fazenda':'fazendas'}</span><span className={hotelOk?'ok':'pending'}><HotelIcon/>{hotelOk?'Hotel OK':'Hotel pendente'}</span><span className={vehicleOk?'ok':'pending'}><CarIcon/>{vehicleOk?'Veículo OK':'Veículo pendente'}</span></div>
        <div className="trip-browser-open"><span>Abrir viagem</span><span>→</span></div>
      </button>
    })}</div>
  </section>

  if(!selected) return <>
    {pageHeader}
    {browser}
    <section className="panel trip-no-selection">
      <div className="trip-no-selection-icon"><CompassIcon/></div>
      <div><span className="eyebrow">Nenhuma viagem aberta</span><h2>Selecione uma viagem acima</h2><p>Os detalhes só aparecem depois da sua escolha. Isso evita confundir uma viagem antiga com a que você realmente quer consultar.</p></div>
    </section>
    <CreateTripModal open={createOpen} onClose={()=>setCreateOpen(false)}/>
  </>

  const lodging = selected.lodgings[0]
  const vehicle = selected.vehicles[0]
  const hotelReady = isHotelReady(selected)
  const vehicleReady = isVehicleReady(selected)
  const clientDatesReady = selected.appointments.length > 0 && selected.appointments.every(a => a.clientConfirmed !== false)
  const readinessChecks = [selected.appointments.length>0, clientDatesReady, hotelReady, vehicleReady]
  const readinessDone = readinessChecks.filter(Boolean).length
  const readiness = Math.round((readinessDone/readinessChecks.length)*100)
  const companyKey=tripCompanyKey(selected,demands)

  return <>
    {pageHeader}
    {browser}

    <section id="trip-selected-detail" className={`trip-selected-shell ${companyClass(companyKey)}`}>
      <header className="trip-selected-header">
        <div className="trip-selected-heading">
          <div className="company-title-row"><span className="company-badge">{companyLabel(companyKey)}</span><span className="eyebrow">Viagem aberta</span></div>
          <h2>{selected.title}</h2>
          <div className="trip-selected-meta"><span><RouteIcon/> {selected.origin || 'Origem não informada'}</span><span><CalendarIconProxy/> {formatDateRange(selected.start,selected.end)}</span><span><BuildingIcon/> {selected.appointments.length} {selected.appointments.length===1?'fazenda':'fazendas'}</span></div>
        </div>
        <div className="trip-selected-actions">
          <div className="trip-readiness-card"><span>Preparação</span><strong>{readiness}%</strong><i><b style={{width:`${readiness}%`}}/></i><small>{readinessDone}/4 etapas prontas</small></div>
          <div className="trip-action-row"><button className="secondary mini" onClick={()=>setEditTrip(selected)}><EditIcon/> Editar</button><button className="secondary mini" onClick={closeSelected}>Fechar detalhes</button><button className="danger-outline mini" disabled={deleting} onClick={()=>{setDeleteError(null);setDeleteOpen(true)}}><TrashIcon/> Excluir</button></div>
        </div>
      </header>

      <div className="trip-workspace-grid">
        <article className="trip-work-card appointments-card">
          <div className="trip-work-card-head"><span className="trip-card-icon plum"><ListIcon/></span><div><span className="section-label">Atendimentos</span><h3>{selected.appointments.length ? `${selected.appointments.length} vinculado${selected.appointments.length===1?'':'s'}` : 'Nenhum atendimento'}</h3></div></div>
          <div className="trip-work-card-body">
            {selected.appointments.length ? selected.appointments.map(a=><div className="appointment-row appointment-row-v14" key={a.id}><div><strong>{a.farmName || a.client}</strong><span>{a.farmName ? `${a.client} • ` : ''}{[a.city,a.state].filter(Boolean).join('/') || 'Local não informado'}</span></div><b>{formatDateRange(a.start,a.end)}</b></div>) : <p className="trip-empty-copy">Vincule os atendimentos que fazem parte deste deslocamento.</p>}
          </div>
          <div className="trip-work-card-actions"><button className="secondary compact no-margin" onClick={()=>setLinkTrip(selected)}><PlusIcon/> Adicionar atendimento</button></div>
        </article>

        <article className={`trip-work-card lodging-card ${hotelReady?'is-ready':'needs-action'}`}>
          <div className="trip-work-card-head"><span className={`trip-card-icon ${hotelReady?'neutral':'warn'}`}><HotelIcon/></span><div><span className="section-label">Hospedagem</span><h3>{selected.hotelRequired ? selected.lodgings.length ? 'Hospedagem cadastrada' : 'Hotel pendente' : 'Não necessária'}</h3></div>{hotelReady&&<span className="ready-pill"><CheckIcon/> Organizado</span>}</div>
          <div className="trip-work-card-body">
            {selected.hotelRequired ? selected.lodgings.length ? selected.lodgings.map((stay,index)=>{
              const nights=Math.max(0,differenceInCalendarDays(parseISO(stay.checkOut),parseISO(stay.checkIn)))
              const estimated=stay.pricingMode==='daily'&&stay.dailyValue!=null?nights*stay.dailyValue:stay.totalValue
              return <div className="lodging-item lodging-item-v14" key={stay.id}>
                <div className="lodging-item-head"><div><h4>{stay.name || `Hotel ${index+1}`}</h4><p><LocationIcon/> {stay.city ? `${stay.city}${stay.state?`/${stay.state}`:''}`:'Cidade não informada'} <span>•</span> {formatDateRange(stay.checkIn,stay.checkOut)} <span>•</span> {nights} {nights===1?'noite':'noites'}</p></div><button className="icon-action-button" title="Editar hospedagem" onClick={()=>{setEditingLodging(stay);setLodgingTrip(selected)}}><EditIcon/></button></div>
                <div className="lodging-stat-grid"><span><small>Status</small><strong>{stay.confirmed?'Confirmada':'Aguardando confirmação'}</strong></span><span><small>Valor</small><strong>{estimated!=null?formatMoney(estimated):'Não informado'}</strong></span>{stay.reservationCode&&<span><small>Reserva</small><strong>{stay.reservationCode}</strong></span>}</div>
                {stay.address&&<div className="location-actions compact-links"><a className="text-link" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stay.address)}`}><LocationIcon/> Maps</a><a className="text-link" target="_blank" rel="noreferrer" href={`https://www.waze.com/ul?q=${encodeURIComponent(stay.address)}&navigate=yes`}><LocationIcon/> Waze</a></div>}
              </div>
            }) : <p className="trip-empty-copy">Cadastre hotel, período, endereço e valor da reserva.</p> : <p className="trip-empty-copy">Esta viagem foi marcada sem necessidade de hospedagem.</p>}
          </div>
          {selected.hotelRequired&&<div className="trip-work-card-actions"><button className={selected.lodgings.length?'secondary compact no-margin':'primary compact no-margin'} onClick={()=>{setEditingLodging(null);setLodgingTrip(selected)}}><HotelIcon/> {selected.lodgings.length?'Adicionar hospedagem':'Cadastrar hospedagem'}</button></div>}
        </article>

        <article className={`trip-work-card vehicle-card ${vehicleReady?'is-ready':'needs-action'}`}>
          <div className="trip-work-card-head"><span className={`trip-card-icon ${vehicleReady?'neutral':'terracotta'}`}><CarIcon/></span><div><span className="section-label">Veículo</span><h3>{selected.vehicleRequired ? vehicle ? vehicle.status==='confirmed'?'Reserva confirmada':vehicle.status==='requested'?'Solicitação enviada':vehicle.status==='picked_up'?'Veículo retirado':vehicle.status==='returned'?'Veículo devolvido':'Veículo registrado' : 'Solicitação pendente' : 'Não necessário'}</h3></div>{vehicleReady&&<span className="ready-pill"><CheckIcon/> Organizado</span>}</div>
          <div className="trip-work-card-body">
            {selected.vehicleRequired ? vehicle ? <div className="vehicle-summary-v14"><div className="vehicle-company"><CarIcon/><div><small>Locadora</small><strong>{vehicle.company || 'Ainda não definida'}</strong></div></div><div className="vehicle-stat-grid">{vehicle.locator&&<span><small>Localizador</small><strong>{vehicle.locator}</strong></span>}{vehicle.requestedAt&&<span><small>Solicitado em</small><strong>{new Date(vehicle.requestedAt).toLocaleDateString('pt-BR')}</strong></span>}{vehicle.pickupLocation&&<span><small>Retirada</small><strong>{vehicle.pickupLocation}</strong></span>}</div></div> : <p className="trip-empty-copy">Abra o Forms corporativo para solicitar o veículo e depois atualize o status no Routine.</p> : <p className="trip-empty-copy">Esta viagem não exige reserva de veículo.</p>}
          </div>
          {selected.vehicleRequired&&<div className="trip-work-card-actions split"><a className="primary compact no-margin" href={VEHICLE_FORM_URL} target="_blank" rel="noreferrer"><CarIcon/> Abrir Forms ↗</a><button className="secondary compact no-margin" onClick={()=>setVehicleTrip(selected)}>Atualizar veículo</button></div>}
        </article>

        <article className="trip-work-card route-card">
          <div className="trip-work-card-head"><span className="trip-card-icon neutral"><CompassIcon/></span><div><span className="section-label">Rota da viagem</span><h3>{selected.appointments.length ? 'Paradas planejadas' : 'Rota ainda vazia'}</h3></div></div>
          <div className="trip-work-card-body">
            {selected.appointments.length ? <div className="route-stops-v14">{selected.appointments.map((a,index)=><div key={a.id}><i>{index+1}</i><span><strong>{a.farmName || a.client}</strong><small>{[a.city,a.state].filter(Boolean).join('/') || 'Local não informado'}</small></span></div>)}</div> : <p className="trip-empty-copy">As cidades aparecem automaticamente conforme você vincula atendimentos.</p>}
          </div>
        </article>
      </div>

      <footer className="trip-status-strip"><span className={selected.appointments.length?'ok':'pending'}><CheckIcon/> {selected.appointments.length?'Atendimentos vinculados':'Atendimentos pendentes'}</span><span className={hotelReady?'ok':'pending'}><HotelIcon/> {hotelReady?'Hotel organizado':'Hotel pendente'}</span><span className={vehicleReady?'ok':'pending'}><CarIcon/> {vehicleReady?'Veículo organizado':'Veículo pendente'}</span></footer>
    </section>

    <CreateTripModal open={createOpen} onClose={()=>setCreateOpen(false)}/>
    <EditTripModal trip={editTrip} onClose={()=>setEditTrip(null)}/>
    <LodgingModal trip={lodgingTrip} lodging={editingLodging} onClose={()=>{setLodgingTrip(null);setEditingLodging(null)}}/>
    <VehicleModal trip={vehicleTrip} onClose={()=>setVehicleTrip(null)}/>
    <LinkAppointmentsModal trip={linkTrip} onClose={()=>setLinkTrip(null)}/>
    <ConfirmActionModal
      open={deleteOpen}
      title="Excluir viagem?"
      description={`${selected.title} será removida do Routine Assist.`}
      detail={`Hotel, veículo e vínculos serão excluídos. Os ${selected.appointments.length} atendimento${selected.appointments.length===1?'':'s'} continuarão cadastrados e voltarão a ficar sem viagem.`}
      confirmLabel="Excluir viagem"
      busy={deleting}
      error={deleteError}
      onCancel={()=>!deleting&&setDeleteOpen(false)}
      onConfirm={()=>void removeSelectedTrip()}
    />
  </>
}

function CalendarIconProxy(){
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="5.5" width="16" height="14" rx="2.5"/><path d="M8 3.8v3.4M16 3.8v3.4M4 9.3h16"/><path d="M8 13h3M8 16h5"/></svg>
}
