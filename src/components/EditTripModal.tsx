import { useEffect, useMemo, useState } from 'react'
import { EditIcon, LocationIcon, RouteIcon } from './Icons'
import { useRoutine } from '../context/RoutineContext'
import { formatDateRange } from '../lib/format'
import { LocationFields } from './LocationFields'
import { locationLabel, parseLocationLabel } from '../lib/location'
import { tripDisplayTitle } from '../lib/tripTitle'
import type { Trip } from '../types/routine'

export function EditTripModal({ trip, onClose }: { trip: Trip | null; onClose: () => void }) {
  const { updateTrip } = useRoutine()
  const [title,setTitle]=useState('')
  const [departureCity,setDepartureCity]=useState('')
  const [departureState,setDepartureState]=useState('')
  const [start,setStart]=useState('')
  const [end,setEnd]=useState('')
  const [hotelRequired,setHotelRequired]=useState(true)
  const [vehicleRequired,setVehicleRequired]=useState(true)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState<string|null>(null)

  useEffect(()=>{
    if(!trip) return
    const dep=parseLocationLabel(trip.origin)
    setTitle(tripDisplayTitle(trip)); setDepartureCity(dep.city); setDepartureState(dep.state); setStart(trip.start); setEnd(trip.end)
    setHotelRequired(trip.hotelRequired); setVehicleRequired(trip.vehicleRequired); setError(null)
  },[trip?.id])

  const appointmentBounds = useMemo(()=>{
    if(!trip?.appointments.length) return null
    const starts=trip.appointments.map(a=>a.start).sort()
    const ends=trip.appointments.map(a=>a.end).sort()
    return { start: starts[0], end: ends[ends.length-1] }
  },[trip])

  const destinations=useMemo(()=>{
    if(!trip) return []
    const seen=new Set<string>()
    return trip.appointments.filter(a=>{const k=`${a.city||''}|${a.state||''}`; if(!a.city||seen.has(k))return false;seen.add(k);return true})
  },[trip])

  if(!trip) return null

  const save = async () => {
    if(!title.trim() || !departureCity || !departureState || !start || !end || busy) return
    if(end < start){ setError('A data de retorno não pode ser anterior à saída.'); return }
    if(appointmentBounds && (start > appointmentBounds.start || end < appointmentBounds.end)){
      setError(`A viagem precisa cobrir os atendimentos vinculados (${formatDateRange(appointmentBounds.start,appointmentBounds.end)}). Se o atendimento mudou, edite primeiro a demanda.`)
      return
    }
    setBusy(true); setError(null)
    try {
      await updateTrip({ tripId:trip.id, title:title.trim(), origin:locationLabel(departureCity,departureState), start, end, hotelRequired, vehicleRequired })
      try { localStorage.setItem('routine-assist-last-departure',locationLabel(departureCity,departureState)) } catch { /* noop */ }
      onClose()
    } catch(e:any){ setError(e?.message || 'Não foi possível atualizar a viagem.') }
    finally { setBusy(false) }
  }

  return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&!busy&&onClose()}>
    <section className="modal-card edit-trip-card">
      <div className="modal-head"><div><span className="eyebrow">Editar logística</span><h2>{tripDisplayTitle(trip)}</h2></div><button className="close" onClick={onClose}>×</button></div>
      <div className="edit-trip-intro"><span className="section-icon terracotta"><EditIcon/></span><div><strong>Datas da viagem podem mudar.</strong><p>Ajuste saída e retorno sem recriar a demanda. Os atendimentos vinculados continuam preservados.</p></div></div>

      {destinations.length>0 && <div className="detected-destinations"><span className="section-icon neutral"><LocationIcon/></span><div><strong>Destinos desta viagem</strong><div className="destination-chips">{destinations.map(a=><span key={`${a.city}-${a.state}`}>{a.city}/{a.state}</span>)}</div><small>Os destinos vêm das demandas vinculadas. Para alterar, edite a cidade na demanda.</small></div></div>}

      <div className="departure-location-box"><div className="departure-location-title"><LocationIcon/><div><strong>Ponto de partida *</strong><small>Selecione de onde você inicia a viagem. A rota estimada considera retorno a este ponto.</small></div></div><div className="form-grid departure-location-grid"><LocationFields city={departureCity} state={departureState} onCityChange={setDepartureCity} onStateChange={setDepartureState} required/></div></div>

      <div className="form-grid edit-trip-grid">
        <label className="field field-wide"><span>Nome da viagem *</span><input value={title} onChange={e=>setTitle(e.target.value)}/></label>
        <label className="field"><span>Saída *</span><input type="date" value={start} onChange={e=>setStart(e.target.value)}/></label>
        <label className="field"><span>Retorno *</span><input type="date" value={end} onChange={e=>setEnd(e.target.value)}/></label>
      </div>
      {appointmentBounds && <div className="soft-note"><RouteIcon/> Atendimentos ocupam {formatDateRange(appointmentBounds.start,appointmentBounds.end)}. A viagem deve cobrir esse intervalo.</div>}
      <div className="travel-options compact-options">
        <label className="confirm-row"><input type="checkbox" checked={hotelRequired} onChange={e=>setHotelRequired(e.target.checked)}/><span><strong>Precisa de hotel</strong><small>Ativa os lembretes de hospedagem.</small></span></label>
        <label className="confirm-row"><input type="checkbox" checked={vehicleRequired} onChange={e=>setVehicleRequired(e.target.checked)}/><span><strong>Precisa de veículo</strong><small>Ativa o fluxo do Forms corporativo.</small></span></label>
      </div>
      {error && <div className="auth-message error modal-error">{error}</div>}
      <div className="modal-actions"><button className="ghost" onClick={onClose}>Cancelar</button><button className="primary" disabled={busy||!title.trim()||!departureCity||!departureState||!start||!end} onClick={()=>void save()}><EditIcon/> {busy?'Salvando...':'Salvar alterações'}</button></div>
    </section>
  </div>
}
