import { differenceInCalendarDays, parseISO } from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import { CarIcon, CheckIcon, HotelIcon, LocationIcon, PlusIcon, RouteIcon } from '../components/Icons'
import { CreateTripModal } from '../components/CreateTripModal'
import { LinkAppointmentsModal } from '../components/LinkAppointmentsModal'
import { LodgingModal } from '../components/LodgingModal'
import { VehicleModal } from '../components/VehicleModal'
import { useRoutine } from '../context/RoutineContext'
import { VEHICLE_FORM_URL } from '../lib/constants'
import { formatDateRange, formatMoney } from '../lib/format'
import { isHotelReady, isVehicleReady } from '../lib/tripReadiness'
import type { Lodging, Trip } from '../types/routine'

export function TripsPage(){
  const { trips, loading } = useRoutine()
  const [createOpen,setCreateOpen]=useState(false)
  const [selectedId,setSelectedId]=useState<string|null>(()=>{try{return localStorage.getItem('routine-assist-focus-trip')||localStorage.getItem('routine-assist-selected-trip')}catch{return null}})
  const [lodgingTrip,setLodgingTrip]=useState<Trip|null>(null)
  const [editingLodging,setEditingLodging]=useState<Lodging|null>(null)
  const [vehicleTrip,setVehicleTrip]=useState<Trip|null>(null)
  const [linkTrip,setLinkTrip]=useState<Trip|null>(null)

  const sorted=useMemo(()=>[...trips].sort((a,b)=>a.start.localeCompare(b.start)),[trips])
  const selected=sorted.find(t=>t.id===selectedId) || sorted[0]

  useEffect(()=>{
    if(!selectedId) return
    try { localStorage.setItem('routine-assist-selected-trip', selectedId); localStorage.removeItem('routine-assist-focus-trip') } catch { /* noop */ }
  },[selectedId])

  useEffect(()=>{
    if(selectedId && sorted.some(t=>t.id===selectedId)) return
    if(sorted[0]) setSelectedId(sorted[0].id)
  },[sorted,selectedId])

  if (!selected) return <>
    <section className="page-heading horizontal"><div><span className="eyebrow">Logística</span><h1>Viagens</h1><p>Hotel e veículo ficam ligados à viagem, não duplicados em cada fazenda.</p></div><button className="primary" onClick={()=>setCreateOpen(true)}><PlusIcon/> Nova viagem</button></section>
    <div className="empty-state large"><span className="section-icon terracotta"><RouteIcon/></span><strong>{loading?'Carregando viagens...':'Nenhuma viagem cadastrada ainda.'}</strong><p>Crie a viagem e vincule um ou mais atendimentos presenciais. Depois organize hotel, veículo e alertas.</p><button className="primary" onClick={()=>setCreateOpen(true)}><PlusIcon/> Criar primeira viagem</button></div>
    <CreateTripModal open={createOpen} onClose={()=>setCreateOpen(false)}/>
  </>

  const lodging = selected.lodgings[0]
  const vehicle = selected.vehicles[0]
  const hotelReady = isHotelReady(selected)
  const vehicleReady = isVehicleReady(selected)
  const readinessChecks = [selected.appointments.length>0, hotelReady, vehicleReady]
  const readiness = Math.round((readinessChecks.filter(Boolean).length/readinessChecks.length)*100)

  return <>
    <section className="page-heading horizontal"><div><span className="eyebrow">Logística</span><h1>Viagens</h1><p>Uma viagem pode reunir vários atendimentos e compartilhar hotel e veículo.</p></div><button className="primary" onClick={()=>setCreateOpen(true)}><PlusIcon/> Nova viagem</button></section>

    {sorted.length>1 && <div className="trip-switcher">{sorted.map(t=><button key={t.id} className={t.id===selected.id?'active':''} onClick={()=>setSelectedId(t.id)}><strong>{t.title}</strong><span>{formatDateRange(t.start,t.end)}</span></button>)}</div>}

    <section className="trip-setup-guide panel">
      <div className="guide-head"><div><span className="eyebrow">Fluxo da viagem</span><h2>{hotelReady && vehicleReady ? 'Logística pronta' : 'Continue organizando esta viagem'}</h2><p>O Routine conduz a sequência: atendimentos → hospedagem → veículo.</p></div><span className={`guide-status ${hotelReady&&vehicleReady?'ready':'pending'}`}>{hotelReady&&vehicleReady?'Tudo organizado':'Próximo passo abaixo'}</span></div>
      <div className="guide-steps">
        <div className={selected.appointments.length?'done':'current'}><span>{selected.appointments.length?<CheckIcon/>:'1'}</span><div><strong>Atendimentos</strong><small>{selected.appointments.length?`${selected.appointments.length} vinculado${selected.appointments.length===1?'':'s'}`:'Vincule os atendimentos'}</small></div></div>
        <div className={hotelReady?'done':selected.appointments.length?'current':''}><span>{hotelReady?<CheckIcon/>:'2'}</span><div><strong>Hospedagem</strong><small>{selected.hotelRequired?(hotelReady?'Organizada':'Reservar/cadastrar hotel'):'Não necessária'}</small></div></div>
        <div className={vehicleReady?'done':hotelReady?'current':''}><span>{vehicleReady?<CheckIcon/>:'3'}</span><div><strong>Veículo</strong><small>{selected.vehicleRequired?(vehicleReady?'Organizado':'Solicitar pelo Forms'):'Não necessário'}</small></div></div>
      </div>
      {!selected.appointments.length ? <button className="primary guide-action" onClick={()=>setLinkTrip(selected)}><PlusIcon/> Vincular atendimento</button> : !hotelReady && selected.hotelRequired ? <button className="primary guide-action" onClick={()=>{setEditingLodging(null);setLodgingTrip(selected)}}><HotelIcon/> Cadastrar hospedagem</button> : !vehicleReady && selected.vehicleRequired ? <div className="guide-actions"><a className="primary inline" href={VEHICLE_FORM_URL} target="_blank" rel="noreferrer"><CarIcon/> Abrir Forms de reserva ↗</a><button className="secondary" onClick={()=>setVehicleTrip(selected)}>Atualizar status do veículo</button></div> : <div className="guide-ready"><CheckIcon/> Esta viagem está pronta no Routine Assist.</div>}
    </section>

    <section className="trip-hero panel">
      <div className="trip-hero-top"><div><span className="eyebrow">Viagem selecionada</span><h2>{selected.title}</h2><p><RouteIcon/> {selected.origin || 'Origem não informada'} • {formatDateRange(selected.start,selected.end)}</p></div><span className="readiness">{readiness}% pronta</span></div>
      <div className="trip-detail-grid">
        <div className="trip-section"><div className="section-icon plum"><RouteIcon/></div><div className="grow"><span className="section-label">Atendimentos</span>{selected.appointments.length ? selected.appointments.map(a=><div className="appointment-row" key={a.id}><div><strong>{a.client}</strong><span>{[a.city,a.state].filter(Boolean).join('/') || 'Local não informado'}</span></div><b>{formatDateRange(a.start,a.end)}</b></div>) : <p>Nenhum atendimento vinculado ainda.</p>}<button className="secondary compact" onClick={()=>setLinkTrip(selected)}><PlusIcon/> Adicionar atendimento</button></div></div>

        <div className="trip-section"><div className={`section-icon ${hotelReady?'neutral':'warn'}`}><HotelIcon/></div><div className="grow"><span className="section-label">Hospedagem</span>{selected.hotelRequired ? selected.lodgings.length ? <>{selected.lodgings.map((stay,index)=>{const nights=Math.max(0,differenceInCalendarDays(parseISO(stay.checkOut),parseISO(stay.checkIn))); const estimated=stay.pricingMode==='daily'&&stay.dailyValue!=null?nights*stay.dailyValue:stay.totalValue; return <div className="lodging-item" key={stay.id}><div className="lodging-item-head"><div><h3>{stay.name || `Hotel ${index+1}`}</h3><p>{stay.city ? `${stay.city}${stay.state?`/${stay.state}`:''} • `:''}{formatDateRange(stay.checkIn,stay.checkOut)} • {nights} {nights===1?'noite':'noites'}</p></div><button className="secondary mini" onClick={()=>{setEditingLodging(stay);setLodgingTrip(selected)}}>Editar</button></div><div className="reservation-summary"><span>{stay.confirmed?'Reserva confirmada':'Aguardando confirmação'}</span><strong>{estimated!=null?`Total ${formatMoney(estimated)}`:'Valor não informado'}</strong></div>{stay.pricingMode==='daily'&&stay.dailyValue!=null&&<p className="reservation-code">Diária: <strong>{formatMoney(stay.dailyValue)}</strong></p>}{stay.reservationCode&&<p className="reservation-code">Reserva: <strong>{stay.reservationCode}</strong></p>}{stay.phone&&<p className="reservation-code">Telefone: <strong>{stay.phone}</strong></p>}{stay.address && <div className="location-actions"><a className="text-link" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stay.address)}`}><LocationIcon/> Maps</a><a className="text-link" target="_blank" rel="noreferrer" href={`https://www.waze.com/ul?q=${encodeURIComponent(stay.address)}&navigate=yes`}><LocationIcon/> Waze</a></div>}{stay.notes&&<p className="lodging-notes">{stay.notes}</p>}</div>})}<button className="secondary compact" onClick={()=>{setEditingLodging(null);setLodgingTrip(selected)}}><HotelIcon/> Adicionar outra hospedagem</button></> : <><h3>Hotel ainda não reservado</h3><p>Cadastre hotel, endereço, check-in/out e valor quando a reserva estiver definida.</p><button className="secondary" onClick={()=>{setEditingLodging(null);setLodgingTrip(selected)}}><HotelIcon/> Cadastrar hospedagem</button></> : <><h3>Hospedagem não necessária</h3><p>Esta viagem foi marcada sem necessidade de hotel.</p></>}</div></div>

        <div className="trip-section"><div className={`section-icon ${vehicleReady?'neutral':'terracotta'}`}><CarIcon/></div><div className="grow"><span className="section-label">Veículo</span>{selected.vehicleRequired ? vehicle ? <><h3>{vehicle.status==='confirmed'?'Reserva confirmada':vehicle.status==='requested'?'Solicitação enviada':vehicle.status==='picked_up'?'Veículo retirado':vehicle.status==='returned'?'Veículo devolvido':'Veículo registrado'}</h3><p>{vehicle.company || 'Locadora ainda não definida'}{vehicle.locator?` • ${vehicle.locator}`:''}</p>{vehicle.requestedAt&&<p className="reservation-code">Solicitado em: <strong>{new Date(vehicle.requestedAt).toLocaleDateString('pt-BR')}</strong></p>}{vehicle.pickupLocation&&<p className="reservation-code">Retirada: <strong>{vehicle.pickupLocation}</strong></p>}{vehicle.notes&&<p className="lodging-notes">{vehicle.notes}</p>}<a className="primary inline" href={VEHICLE_FORM_URL} target="_blank" rel="noreferrer"><CarIcon/> Abrir Forms de reserva ↗</a><button className="secondary compact" onClick={()=>setVehicleTrip(selected)}>Atualizar veículo</button></> : <><h3>Solicitação pendente</h3><p>Use o Forms corporativo. Depois volte e marque a solicitação como enviada.</p><a className="primary inline" href={VEHICLE_FORM_URL} target="_blank" rel="noreferrer"><CarIcon/> Abrir Forms de reserva ↗</a><button className="secondary compact" onClick={()=>setVehicleTrip(selected)}>Marcar como solicitado</button></> : <><h3>Veículo não necessário</h3><p>Esta viagem não exige reserva de veículo.</p></>}</div></div>

        <div className="trip-section"><div className="section-icon neutral"><LocationIcon/></div><div><span className="section-label">Rota</span><h3>{selected.appointments.length} {selected.appointments.length===1?'atendimento':'atendimentos'} nesta viagem</h3><p>{selected.appointments.map(a=>a.city).filter(Boolean).join(' → ') || 'As cidades aparecerão quando os atendimentos forem vinculados.'}</p></div></div>
      </div>
      <div className="trip-footer"><span className={selected.appointments.length?'ok':'pending'}><CheckIcon/> {selected.appointments.length?'Atendimentos vinculados':'Atendimentos pendentes'}</span><span className={hotelReady?'ok':'pending'}><HotelIcon/> {hotelReady?'Hotel organizado':'Hotel pendente'}</span><span className={vehicleReady?'ok':'pending'}><CarIcon/> {vehicleReady?'Veículo organizado':'Veículo pendente'}</span></div>
    </section>

    <CreateTripModal open={createOpen} onClose={()=>setCreateOpen(false)}/>
    <LodgingModal trip={lodgingTrip} lodging={editingLodging} onClose={()=>{setLodgingTrip(null);setEditingLodging(null)}}/>
    <VehicleModal trip={vehicleTrip} onClose={()=>setVehicleTrip(null)}/>
    <LinkAppointmentsModal trip={linkTrip} onClose={()=>setLinkTrip(null)}/>
  </>
}
