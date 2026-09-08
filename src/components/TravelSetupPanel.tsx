import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CarIcon, CheckIcon, HotelIcon, LocationIcon, PlaneIcon, RouteIcon } from './Icons'
import { useRoutine } from '../context/RoutineContext'
import { formatDateRange } from '../lib/format'
import { LocationFields } from './LocationFields'
import { locationLabel, parseLocationLabel } from '../lib/location'
import { suggestedTripTitle, tripDisplayTitle } from '../lib/tripTitle'
import type { Appointment } from '../types/routine'

type Mode = 'choose' | 'create' | 'link' | 'done'

const draftKey = (appointmentId: string) => `routine-assist-travel-setup:${appointmentId}:v2`
const LAST_DEPARTURE_KEY='routine-assist-last-departure'

export function TravelSetupPanel({ appointment, onFinish }: { appointment: Appointment; onFinish: () => void }) {
  const { trips, createTrip, linkAppointmentsToTrip } = useRoutine()
  const navigate = useNavigate()
  const linkedTrip = useMemo(() => trips.find(t => t.appointments.some(a => a.id === appointment.id)), [trips, appointment.id])
  const [mode, setMode] = useState<Mode>(linkedTrip ? 'done' : 'choose')
  const [title, setTitle] = useState(suggestedTripTitle([appointment]))
  const [departureCity, setDepartureCity] = useState('')
  const [departureState, setDepartureState] = useState('')
  const [start, setStart] = useState(appointment.start)
  const [end, setEnd] = useState(appointment.end)
  const [hotelRequired, setHotelRequired] = useState(true)
  const [vehicleRequired, setVehicleRequired] = useState(true)
  const [flightRequired, setFlightRequired] = useState(false)
  const [tripId, setTripId] = useState(linkedTrip?.id || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey(appointment.id))
      const last=parseLocationLabel(localStorage.getItem(LAST_DEPARTURE_KEY)||'')
      if (!raw || linkedTrip) { if(!linkedTrip){setDepartureCity(last.city);setDepartureState(last.state)}; return }
      const draft = JSON.parse(raw)
      const dep=parseLocationLabel(draft.origin||'')
      setMode(draft.mode || 'choose')
      setTitle(draft.title || suggestedTripTitle([appointment]))
      setDepartureCity(dep.city||last.city); setDepartureState(dep.state||last.state)
      setStart(draft.start || appointment.start)
      setEnd(draft.end || appointment.end)
      setHotelRequired(draft.hotelRequired ?? true)
      setVehicleRequired(draft.vehicleRequired ?? true)
      setFlightRequired(draft.flightRequired ?? false)
      setTripId(draft.tripId || '')
    } catch { /* rascunho opcional */ }
  }, [appointment.id, appointment.city, appointment.client, appointment.start, appointment.end, linkedTrip])

  useEffect(() => { if (linkedTrip) setMode('done') }, [linkedTrip])

  useEffect(() => {
    if (linkedTrip || mode === 'done') return
    try { localStorage.setItem(draftKey(appointment.id), JSON.stringify({ mode, title, origin:locationLabel(departureCity,departureState), start, end, hotelRequired, vehicleRequired, flightRequired, tripId })) } catch { /* noop */ }
  }, [appointment.id, linkedTrip, mode, title, departureCity, departureState, start, end, hotelRequired, vehicleRequired, flightRequired, tripId])

  const sortedTrips = useMemo(() => [...trips].filter(t=>t.status==='planned').sort((a,b) => a.start.localeCompare(b.start)), [trips])
  const selectedTrip = sortedTrips.find(t => t.id === tripId)

  const finishWithTrip = (id: string) => {
    try {
      localStorage.removeItem(draftKey(appointment.id))
      localStorage.setItem('routine-assist-focus-trip', id)
    } catch { /* noop */ }
    setTripId(id); setMode('done')
  }

  const handleCreate = async () => {
    if (!title.trim() || !departureCity || !departureState || !start || !end || busy) return
    if (end < start) { setError('A data final da viagem não pode ser anterior à inicial.'); return }
    setBusy(true); setError(null)
    try {
      const origin=locationLabel(departureCity,departureState)
      const id = await createTrip({ title: title.trim(), origin, start, end, hotelRequired, vehicleRequired, flightRequired, appointmentIds: [appointment.id] })
      localStorage.setItem(LAST_DEPARTURE_KEY,origin)
      finishWithTrip(id)
    } catch (e:any) { setError(e?.message || 'Não foi possível criar a viagem.') }
    finally { setBusy(false) }
  }

  const handleLink = async () => {
    if (!tripId || busy) return
    setBusy(true); setError(null)
    try { await linkAppointmentsToTrip(tripId, [appointment.id]); finishWithTrip(tripId) }
    catch (e:any) { setError(e?.message || 'Não foi possível vincular à viagem.') }
    finally { setBusy(false) }
  }

  const goTrips = () => {
    if (tripId) try { localStorage.setItem('routine-assist-focus-trip', tripId) } catch { /* noop */ }
    onFinish(); navigate('/viagens')
  }

  if (mode === 'done') {
    const trip = linkedTrip || selectedTrip
    return <div className="travel-setup success-stage">
      <div className="travel-success-head"><span className="section-icon neutral"><CheckIcon/></span><div><strong>{trip ? 'Viagem organizada' : 'Atendimento vinculado'}</strong><p>{trip ? `${tripDisplayTitle(trip)} • ${formatDateRange(trip.start, trip.end)}` : 'O atendimento já faz parte de uma viagem.'}</p></div></div>
      <div className="next-logistics-grid"><div><HotelIcon/><span><strong>Hospedagem</strong><small>{trip?.hotelRequired === false ? 'Não necessária' : 'Cadastrar ou confirmar hotel'}</small></span></div><div><CarIcon/><span><strong>Veículo</strong><small>{trip?.vehicleRequired === false ? 'Não necessário' : 'Solicitar pelo Forms e acompanhar'}</small></span></div><div><PlaneIcon/><span><strong>Passagem</strong><small>{trip?.flightRequired === false ? 'Não necessária' : 'Solicitar pelo Outlook e acompanhar'}</small></span></div></div>
      <div className="modal-actions travel-actions"><button className="ghost" onClick={onFinish}>Fechar por enquanto</button><button className="primary" onClick={goTrips}><RouteIcon/> Continuar para logística da viagem</button></div>
    </div>
  }

  if (mode === 'create') return <div className="travel-setup">
    <div className="travel-stage-head"><button className="text-back" onClick={()=>setMode('choose')}>← Voltar</button><div><span className="eyebrow">Etapa 2 de 2</span><h3>Criar viagem</h3><p>O destino já vem do atendimento. Aqui você define apenas partida e período da logística.</p></div></div>
    <div className="detected-destinations"><span className="section-icon neutral"><LocationIcon/></span><div><strong>Destino detectado</strong><div className="destination-chips"><span>{appointment.city}/{appointment.state} • {appointment.farmName || appointment.client}</span></div></div></div>
    <div className="departure-location-box"><div className="departure-location-title"><LocationIcon/><div><strong>Ponto de partida *</strong><small>Selecione de onde você inicia e onde começa a rota terrestre até a última parada.</small></div></div><div className="form-grid departure-location-grid"><LocationFields city={departureCity} state={departureState} onCityChange={setDepartureCity} onStateChange={setDepartureState} required/></div></div>
    <div className="form-grid trip-form-grid">
      <label className="field field-wide"><span>Nome da viagem *</span><input value={title} onChange={e=>setTitle(e.target.value)} placeholder={suggestedTripTitle([appointment])}/></label>
      <label className="field"><span>Saída *</span><input type="date" value={start} onChange={e=>setStart(e.target.value)}/></label>
      <label className="field"><span>Retorno *</span><input type="date" value={end} onChange={e=>setEnd(e.target.value)}/></label>
    </div>
    <p className="field-help">As datas começaram iguais ao atendimento. Ajuste saída e retorno conforme sua logística.</p>
    <div className="travel-options compact-options"><label className="confirm-row"><input type="checkbox" checked={hotelRequired} onChange={e=>setHotelRequired(e.target.checked)}/><span><strong>Precisa de hotel</strong><small>Gera alertas até a hospedagem estar organizada.</small></span></label><label className="confirm-row"><input type="checkbox" checked={vehicleRequired} onChange={e=>setVehicleRequired(e.target.checked)}/><span><strong>Precisa de veículo</strong><small>Gera alerta para solicitar e confirmar a reserva.</small></span></label><label className="confirm-row"><input type="checkbox" checked={flightRequired} onChange={e=>setFlightRequired(e.target.checked)}/><span><strong><PlaneIcon/> Precisa de passagem aérea</strong><small>Gera alerta até a solicitação ser enviada pelo Outlook.</small></span></label></div>
    {error && <div className="auth-message error modal-error">{error}</div>}
    <div className="modal-actions"><button className="ghost" onClick={()=>setMode('choose')}>Voltar</button><button className="primary" disabled={!title.trim()||!departureCity||!departureState||!start||!end||busy} onClick={()=>void handleCreate()}><RouteIcon/> {busy?'Criando...':'Criar e vincular'}</button></div>
  </div>

  if (mode === 'link') return <div className="travel-setup">
    <div className="travel-stage-head"><button className="text-back" onClick={()=>setMode('choose')}>← Voltar</button><div><span className="eyebrow">Etapa 2 de 2</span><h3>Vincular a uma viagem</h3><p>O nome da viagem será atualizado automaticamente quando ganhar novos destinos.</p></div></div>
    <div className="existing-trip-list">
      {sortedTrips.length === 0 && <div className="soft-note">Você ainda não possui nenhuma viagem. Volte e escolha “Criar nova viagem”.</div>}
      {sortedTrips.map(t => { const contains = t.start <= appointment.start && t.end >= appointment.end; return <button type="button" key={t.id} className={`existing-trip-choice ${tripId===t.id?'selected':''}`} onClick={()=>setTripId(t.id)}><span className="choice-check">{tripId===t.id?<CheckIcon/>:<RouteIcon/>}</span><span className="grow"><strong>{tripDisplayTitle(t)}</strong><small>{formatDateRange(t.start,t.end)} • {t.appointments.length} atendimento{t.appointments.length===1?'':'s'}</small></span><span className={`compat-badge ${contains?'ok':'adjust'}`}>{contains?'Período compatível':'Período será ajustado'}</span></button> })}
    </div>
    {error && <div className="auth-message error modal-error">{error}</div>}
    <div className="modal-actions"><button className="ghost" onClick={()=>setMode('choose')}>Voltar</button><button className="primary" disabled={!tripId||busy} onClick={()=>void handleLink()}>{busy?'Vinculando...':'Vincular atendimento'}</button></div>
  </div>

  return <div className="travel-setup">
    <div className="travel-stage-head"><div><span className="eyebrow">Próximo passo</span><h3>Organizar deslocamento</h3><p>O atendimento presencial está na agenda. Agora escolha como ele entra na sua logística.</p></div></div>
    <div className="travel-choice-grid"><button type="button" onClick={()=>setMode('create')}><span className="section-icon terracotta"><RouteIcon/></span><span><strong>Criar nova viagem</strong><small>O destino será {appointment.city}/{appointment.state}; você só define o ponto de partida e o período.</small></span></button><button type="button" onClick={()=>setMode('link')}><span className="section-icon plum"><CheckIcon/></span><span><strong>Vincular a viagem existente</strong><small>Ideal quando você vai atender mais de uma fazenda na mesma viagem.</small></span></button></div>
    <div className="modal-actions travel-actions"><button className="ghost" onClick={onFinish}>Fazer isso depois</button></div>
  </div>
}
