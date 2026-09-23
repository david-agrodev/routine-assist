import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarIcon, CheckIcon, MailIcon, PlaneIcon, UserIcon } from './Icons'
import { useRoutine } from '../context/RoutineContext'
import { AIRFARE_RECIPIENT, buildAirfareEmail } from '../lib/outlook'
import type { FlightReservation, FlightSegment, FlightStatus, Trip } from '../types/routine'

function destinationFromTrip(trip: Trip) {
  const first = trip.appointments[0]
  return first?.city ? `${first.city}${first.state ? `/${first.state}` : ''}` : ''
}

function createSegment(direction: FlightSegment['direction'], baseDate = '', baseAirline = ''): FlightSegment {
  const randomId = window.crypto?.randomUUID?.() || `segment-${Date.now()}-${Math.random().toString(16).slice(2)}`
  return { id: randomId, direction, origin: '', destination: '', departureDate: baseDate || undefined, arrivalDate: baseDate || undefined, airline: baseAirline || undefined }
}

function initialSegments(existing?: FlightReservation): FlightSegment[] {
  if (!existing) return []
  if (existing.segments?.length) return existing.segments
  const rows: FlightSegment[] = []
  if (existing.outboundFlightNumber) rows.push({ id:'legacy-outbound', direction:'outbound', origin:existing.outboundOrigin || '', destination:existing.outboundDestination || '', departureDate:existing.outboundDate, departureTime:existing.outboundTime, airline:existing.airline, flightNumber:existing.outboundFlightNumber })
  if (existing.returnFlightNumber) rows.push({ id:'legacy-return', direction:'return', origin:existing.returnOrigin || '', destination:existing.returnDestination || '', departureDate:existing.returnDate, departureTime:existing.returnTime, airline:existing.airline, flightNumber:existing.returnFlightNumber })
  return rows
}

export function FlightModal({ trip, onClose }: { trip: Trip | null; onClose: () => void }) {
  const { saveFlightReservation, userProfile } = useRoutine()
  const navigate = useNavigate()
  const existing = trip?.flights[0]
  const draftKey = trip ? `routine-assist-flight-draft:${trip.id}` : ''

  const [status,setStatus] = useState<FlightStatus>('not_requested')
  const [outboundOrigin,setOutboundOrigin] = useState('')
  const [outboundDestination,setOutboundDestination] = useState('')
  const [outboundDate,setOutboundDate] = useState('')
  const [outboundTime,setOutboundTime] = useState('')
  const [returnOrigin,setReturnOrigin] = useState('')
  const [returnDestination,setReturnDestination] = useState('')
  const [returnDate,setReturnDate] = useState('')
  const [returnTime,setReturnTime] = useState('')
  const [airline,setAirline] = useState('')
  const [locator,setLocator] = useState('')
  const [outboundFlightNumber,setOutboundFlightNumber] = useState('')
  const [returnFlightNumber,setReturnFlightNumber] = useState('')
  const [segments,setSegments] = useState<FlightSegment[]>([])
  const [notes,setNotes] = useState('')
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState<string|null>(null)
  const [message,setMessage] = useState('')

  useEffect(()=>{
    if(!trip) return
    setError(null); setMessage('')
    if(existing){
      setStatus(existing.status)
      setOutboundOrigin(existing.outboundOrigin || trip.origin || '')
      setOutboundDestination(existing.outboundDestination || destinationFromTrip(trip))
      setOutboundDate(existing.outboundDate || trip.start)
      setOutboundTime(existing.outboundTime || '')
      setReturnOrigin(existing.returnOrigin || existing.outboundDestination || destinationFromTrip(trip))
      setReturnDestination(existing.returnDestination || existing.outboundOrigin || trip.origin || '')
      setReturnDate(existing.returnDate || trip.end)
      setReturnTime(existing.returnTime || '')
      setAirline(existing.airline || '')
      setLocator(existing.locator || '')
      setOutboundFlightNumber(existing.outboundFlightNumber || '')
      setReturnFlightNumber(existing.returnFlightNumber || '')
      setSegments(initialSegments(existing))
      setNotes(existing.notes || '')
      return
    }
    try{
      const d=JSON.parse(localStorage.getItem(draftKey)||'null')
      const destination=destinationFromTrip(trip)
      setStatus(d?.status || 'not_requested')
      setOutboundOrigin(d?.outboundOrigin || trip.origin || '')
      setOutboundDestination(d?.outboundDestination || destination)
      setOutboundDate(d?.outboundDate || trip.start)
      setOutboundTime(d?.outboundTime || '')
      setReturnOrigin(d?.returnOrigin || destination)
      setReturnDestination(d?.returnDestination || trip.origin || '')
      setReturnDate(d?.returnDate || trip.end)
      setReturnTime(d?.returnTime || '')
      setAirline(d?.airline || '')
      setLocator(d?.locator || '')
      setOutboundFlightNumber(d?.outboundFlightNumber || '')
      setReturnFlightNumber(d?.returnFlightNumber || '')
      setSegments(Array.isArray(d?.segments) ? d.segments : [])
      setNotes(d?.notes || '')
    }catch{/* noop */}
  },[trip?.id,existing?.id])

  useEffect(()=>{
    if(!trip || existing) return
    try{localStorage.setItem(draftKey,JSON.stringify({status,outboundOrigin,outboundDestination,outboundDate,outboundTime,returnOrigin,returnDestination,returnDate,returnTime,airline,locator,outboundFlightNumber,returnFlightNumber,segments,notes}))}catch{/* noop */}
  },[trip,existing,draftKey,status,outboundOrigin,outboundDestination,outboundDate,outboundTime,returnOrigin,returnDestination,returnDate,returnTime,airline,locator,outboundFlightNumber,returnFlightNumber,segments,notes])

  const missingProfile = useMemo(()=>{
    const missing:string[]=[]
    if(!userProfile?.fullName) missing.push('nome completo')
    if(!userProfile?.cpf) missing.push('CPF')
    if(!userProfile?.phone) missing.push('telefone')
    if(!userProfile?.birthDate) missing.push('data de nascimento')
    return missing
  },[userProfile])

  if(!trip) return null

  const payload=(nextStatus:FlightStatus=status)=>({
    tripId:trip.id,
    reservationId:existing?.id,
    status:nextStatus,
    outboundOrigin:outboundOrigin||undefined,
    outboundDestination:outboundDestination||undefined,
    outboundDate:outboundDate||undefined,
    outboundTime:outboundTime||undefined,
    returnOrigin:returnOrigin||undefined,
    returnDestination:returnDestination||undefined,
    returnDate:returnDate||undefined,
    returnTime:returnTime||undefined,
    airline:airline||undefined,
    locator:locator||undefined,
    outboundFlightNumber:outboundFlightNumber||undefined,
    returnFlightNumber:returnFlightNumber||undefined,
    segments,
    notes:notes||undefined,
  })

  const addSegment = (direction: FlightSegment['direction']) => setSegments(current => [...current, createSegment(direction, direction === 'outbound' ? outboundDate : returnDate, airline)])
  const updateSegment = (id: string, patch: Partial<FlightSegment>) => setSegments(current => current.map(segment => segment.id === id ? { ...segment, ...patch } : segment))
  const removeSegment = (id: string) => setSegments(current => current.filter(segment => segment.id !== id))

  const validateRequest=()=>{
    const missing:string[]=[]
    if(missingProfile.length) missing.push(...missingProfile)
    if(!outboundOrigin.trim()) missing.push('origem da ida')
    if(!outboundDestination.trim()) missing.push('destino da ida')
    if(!outboundDate) missing.push('data da ida')
    if(!outboundTime) missing.push('horário desejado da ida')
    if(!returnDate) missing.push('data da volta')
    if(!returnTime) missing.push('horário desejado da volta')
    if(missing.length){setError(`Complete antes de solicitar: ${missing.join(', ')}.`);return false}
    return true
  }

  const save=async(nextStatus:FlightStatus=status)=>{
    if(busy) return false
    setBusy(true);setError(null);setMessage('')
    try{
      await saveFlightReservation(payload(nextStatus))
      setStatus(nextStatus)
      try{localStorage.removeItem(draftKey)}catch{/* noop */}
      setMessage(nextStatus==='requested'?'Solicitação marcada como enviada.':'Dados da passagem salvos.')
      return true
    }catch(e:any){setError(e?.message||'Não foi possível salvar a passagem.');return false}
    finally{setBusy(false)}
  }

  const openOutlook=async()=>{
    setError(null);setMessage('')
    if(!validateRequest()) return
    const email=buildAirfareEmail(userProfile,trip,payload(status) as any)
    await save(status)
    const opened=window.open(email.url,'_blank')
    if(!opened) setError('O navegador bloqueou a abertura do Outlook. Libere pop-ups para o Routine Assist e tente novamente.')
    else {
      try { opened.opener=null } catch { /* noop */ }
      setMessage(`Outlook aberto com o e-mail para ${AIRFARE_RECIPIENT}. Depois de enviar, marque a solicitação como enviada.`)
    }
  }

  const segmentFields = (direction: FlightSegment['direction']) => {
    const rows = segments.filter(segment => segment.direction === direction)
    return <div className="flight-segment-group">
      <div className="flight-segment-group-head"><strong>{direction === 'outbound' ? 'Trechos da ida' : 'Trechos da volta'}</strong><button type="button" className="secondary compact" onClick={()=>addSegment(direction)}><PlaneIcon/> Adicionar trecho</button></div>
      {rows.length === 0 ? <p className="trip-empty-copy">Nenhum trecho informado ainda.</p> : rows.map((segment, index) => <div className="flight-segment-card" key={segment.id}>
        <div className="flight-segment-index"><span>{index + 1}</span><strong>{direction === 'outbound' ? 'Ida' : 'Volta'}</strong></div>
        <div className="form-grid flight-segment-grid">
          <label className="field"><span>Origem</span><input value={segment.origin} onChange={e=>updateSegment(segment.id,{origin:e.target.value})} placeholder="Ex.: Uberlândia/MG - UDI"/></label>
          <label className="field"><span>Destino</span><input value={segment.destination} onChange={e=>updateSegment(segment.id,{destination:e.target.value})} placeholder="Ex.: Campinas/SP - VCP"/></label>
          <label className="field"><span>Saída</span><input type="date" value={segment.departureDate || ''} onChange={e=>updateSegment(segment.id,{departureDate:e.target.value || undefined})}/></label>
          <label className="field"><span>Hora saída</span><input type="time" value={segment.departureTime || ''} onChange={e=>updateSegment(segment.id,{departureTime:e.target.value || undefined})}/></label>
          <label className="field"><span>Chegada</span><input type="date" value={segment.arrivalDate || ''} onChange={e=>updateSegment(segment.id,{arrivalDate:e.target.value || undefined})}/></label>
          <label className="field"><span>Hora chegada</span><input type="time" value={segment.arrivalTime || ''} onChange={e=>updateSegment(segment.id,{arrivalTime:e.target.value || undefined})}/></label>
          <label className="field"><span>Companhia</span><input value={segment.airline || ''} onChange={e=>updateSegment(segment.id,{airline:e.target.value || undefined})} placeholder="Ex.: Azul"/></label>
          <label className="field"><span>Nº do voo</span><input value={segment.flightNumber || ''} onChange={e=>updateSegment(segment.id,{flightNumber:e.target.value || undefined})} placeholder="Ex.: AD 1234"/></label>
        </div>
        <button type="button" className="mini-link-button danger flight-segment-remove" onClick={()=>removeSegment(segment.id)}>Remover trecho</button>
      </div>)}
    </div>
  }

  return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&!busy&&onClose()}>
    <section className="modal-card flight-modal-card">
      <div className="modal-head"><div><span className="eyebrow">Passagem aérea</span><h2>Organizar voo</h2><p>O Routine monta a solicitação e abre o Outlook já endereçado para a responsável pela reserva.</p></div><button className="close" onClick={onClose}>×</button></div>

      {missingProfile.length>0&&<div className="flight-profile-warning"><UserIcon/><div><strong>Dados do passageiro incompletos</strong><span>Falta: {missingProfile.join(', ')}.</span></div><button type="button" className="secondary compact" onClick={()=>{onClose();navigate('/configuracoes')}}>Completar perfil</button></div>}

      <div className="flight-form-section">
        <div className="lodging-section-title"><span className="section-icon terracotta"><PlaneIcon/></span><div><strong>Ida</strong><small>Informe cidade/aeroporto e o horário que você gostaria de viajar.</small></div></div>
        <div className="form-grid flight-grid"><label className="field"><span>Origem *</span><input value={outboundOrigin} onChange={e=>setOutboundOrigin(e.target.value)} placeholder="Ex.: Uberlândia/MG ou UDI"/></label><label className="field"><span>Destino *</span><input value={outboundDestination} onChange={e=>{setOutboundDestination(e.target.value);if(!returnOrigin)setReturnOrigin(e.target.value)}} placeholder="Ex.: Goiânia/GO ou GYN"/></label><label className="field"><span>Data da ida *</span><input type="date" value={outboundDate} onChange={e=>setOutboundDate(e.target.value)}/></label><label className="field"><span>Horário desejado *</span><input type="time" value={outboundTime} onChange={e=>setOutboundTime(e.target.value)}/></label></div>
      </div>

      <div className="flight-form-section">
        <div className="lodging-section-title"><span className="section-icon plum"><PlaneIcon/></span><div><strong>Retorno</strong><small>O Routine sugere o caminho inverso, mas você pode alterar.</small></div></div>
        <div className="form-grid flight-grid"><label className="field"><span>Origem da volta</span><input value={returnOrigin} onChange={e=>setReturnOrigin(e.target.value)} placeholder="Cidade/aeroporto"/></label><label className="field"><span>Destino da volta</span><input value={returnDestination} onChange={e=>setReturnDestination(e.target.value)} placeholder="Cidade/aeroporto"/></label><label className="field"><span>Data da volta *</span><input type="date" value={returnDate} onChange={e=>setReturnDate(e.target.value)}/></label><label className="field"><span>Horário desejado *</span><input type="time" value={returnTime} onChange={e=>setReturnTime(e.target.value)}/></label></div>
      </div>

      <div className="flight-form-section">
        <div className="lodging-section-title"><span className="section-icon neutral"><CheckIcon/></span><div><strong>Reserva</strong><small>Preencha estes dados quando a Keyla confirmar a emissão.</small></div></div>
        <div className="form-grid flight-grid"><label className="field"><span>Status</span><select value={status} onChange={e=>setStatus(e.target.value as FlightStatus)}><option value="not_requested">Ainda não solicitei</option><option value="requested">E-mail enviado</option><option value="confirmed">Passagem confirmada</option></select></label><label className="field"><span>Companhia aérea</span><input value={airline} onChange={e=>setAirline(e.target.value)} placeholder="Opcional"/></label><label className="field"><span>Localizador</span><input value={locator} onChange={e=>setLocator(e.target.value)} placeholder="Opcional"/></label><label className="field"><span>Voo ida</span><input value={outboundFlightNumber} onChange={e=>setOutboundFlightNumber(e.target.value)} placeholder="Ex.: AD 1234"/></label><label className="field"><span>Voo volta</span><input value={returnFlightNumber} onChange={e=>setReturnFlightNumber(e.target.value)} placeholder="Ex.: AD 4321"/></label><label className="field field-wide"><span>Observações para a passagem</span><textarea rows={3} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Ex.: preciso chegar antes das 10h para retirar o veículo no aeroporto."/></label></div>
      </div>

      <div className="flight-form-section flight-segments-section">
        <div className="lodging-section-title"><span className="section-icon terracotta"><PlaneIcon/></span><div><strong>Trechos do bilhete emitido</strong><small>Use estes campos depois que receber o ticket. Registre cada conexão separadamente.</small></div></div>
        <div className="flight-segment-help">Ex.: Ida: Uberlândia/MG - UDI {'->'} Campinas/SP - VCP {'->'} Londrina/PR - LDB. Volta: Londrina/PR - LDB {'->'} Campinas/SP - VCP {'->'} Uberlândia/MG - UDI.</div>
        <div className="flight-segments-layout">{segmentFields('outbound')}{segmentFields('return')}</div>
      </div>

      <div className="flight-email-preview"><MailIcon/><div><strong>Solicitação pelo Outlook</strong><span>Destinatário: {AIRFARE_RECIPIENT}</span><small>O assunto inclui passageiro, origem, destino e período. O corpo leva seus dados do Perfil e os horários desejados.</small></div></div>

      {error&&<div className="auth-message error modal-error">{error}</div>}
      {message&&<div className="auth-message success modal-error">{message}</div>}
      <div className="modal-actions flight-modal-actions"><button className="ghost" onClick={onClose}>Fechar por enquanto</button><button className="secondary" disabled={busy} onClick={()=>void save()}>{busy?'Salvando...':'Salvar dados'}</button>{status==='not_requested'&&<button className="secondary" disabled={busy} onClick={()=>void save('requested')}><CheckIcon/> Marcar e-mail enviado</button>}<button className="primary" disabled={busy} onClick={()=>void openOutlook()}><MailIcon/> Abrir solicitação no Outlook</button></div>
    </section>
  </div>
}
