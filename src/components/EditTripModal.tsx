import { useEffect, useMemo, useState } from 'react'
import { EditIcon, RouteIcon } from './Icons'
import { useRoutine } from '../context/RoutineContext'
import { formatDateRange } from '../lib/format'
import type { Trip } from '../types/routine'

export function EditTripModal({ trip, onClose }: { trip: Trip | null; onClose: () => void }) {
  const { updateTrip } = useRoutine()
  const [title,setTitle]=useState('')
  const [origin,setOrigin]=useState('')
  const [start,setStart]=useState('')
  const [end,setEnd]=useState('')
  const [hotelRequired,setHotelRequired]=useState(true)
  const [vehicleRequired,setVehicleRequired]=useState(true)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState<string|null>(null)

  useEffect(()=>{
    if(!trip) return
    setTitle(trip.title); setOrigin(trip.origin || ''); setStart(trip.start); setEnd(trip.end)
    setHotelRequired(trip.hotelRequired); setVehicleRequired(trip.vehicleRequired); setError(null)
  },[trip?.id])

  const appointmentBounds = useMemo(()=>{
    if(!trip?.appointments.length) return null
    const starts=trip.appointments.map(a=>a.start).sort()
    const ends=trip.appointments.map(a=>a.end).sort()
    return { start: starts[0], end: ends[ends.length-1] }
  },[trip])

  if(!trip) return null

  const save = async () => {
    if(!title.trim() || !start || !end || busy) return
    if(end < start){ setError('A data de retorno não pode ser anterior à saída.'); return }
    if(appointmentBounds && (start > appointmentBounds.start || end < appointmentBounds.end)){
      setError(`A viagem precisa cobrir os atendimentos vinculados (${formatDateRange(appointmentBounds.start,appointmentBounds.end)}). Se o atendimento mudou, edite primeiro a demanda.`)
      return
    }
    setBusy(true); setError(null)
    try {
      await updateTrip({ tripId:trip.id, title:title.trim(), origin:origin.trim() || undefined, start, end, hotelRequired, vehicleRequired })
      onClose()
    } catch(e:any){ setError(e?.message || 'Não foi possível atualizar a viagem.') }
    finally { setBusy(false) }
  }

  return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&!busy&&onClose()}>
    <section className="modal-card edit-trip-card">
      <div className="modal-head"><div><span className="eyebrow">Editar logística</span><h2>{trip.title}</h2></div><button className="close" onClick={onClose}>×</button></div>
      <div className="edit-trip-intro"><span className="section-icon terracotta"><EditIcon/></span><div><strong>Datas da viagem podem mudar.</strong><p>Ajuste saída e retorno sem recriar a demanda. Os atendimentos vinculados continuam preservados.</p></div></div>
      <div className="form-grid edit-trip-grid">
        <label className="field field-wide"><span>Nome da viagem *</span><input value={title} onChange={e=>setTitle(e.target.value)}/></label>
        <label className="field"><span>Origem</span><input value={origin} onChange={e=>setOrigin(e.target.value)} placeholder="Uberaba/MG"/></label>
        <label className="field"><span>Saída *</span><input type="date" value={start} onChange={e=>setStart(e.target.value)}/></label>
        <label className="field"><span>Retorno *</span><input type="date" value={end} onChange={e=>setEnd(e.target.value)}/></label>
      </div>
      {appointmentBounds && <div className="soft-note"><RouteIcon/> Atendimentos ocupam {formatDateRange(appointmentBounds.start,appointmentBounds.end)}. A viagem deve cobrir esse intervalo.</div>}
      <div className="travel-options compact-options">
        <label className="confirm-row"><input type="checkbox" checked={hotelRequired} onChange={e=>setHotelRequired(e.target.checked)}/><span><strong>Precisa de hotel</strong><small>Ativa os lembretes de hospedagem.</small></span></label>
        <label className="confirm-row"><input type="checkbox" checked={vehicleRequired} onChange={e=>setVehicleRequired(e.target.checked)}/><span><strong>Precisa de veículo</strong><small>Ativa o fluxo do Forms corporativo.</small></span></label>
      </div>
      {error && <div className="auth-message error modal-error">{error}</div>}
      <div className="modal-actions"><button className="ghost" onClick={onClose}>Cancelar</button><button className="primary" disabled={busy||!title.trim()||!start||!end} onClick={()=>void save()}><EditIcon/> {busy?'Salvando...':'Salvar alterações'}</button></div>
    </section>
  </div>
}
