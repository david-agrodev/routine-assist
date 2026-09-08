import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarIcon, CheckIcon, MailIcon, PlaneIcon, UserIcon } from './Icons'
import { useRoutine } from '../context/RoutineContext'
import { AIRFARE_RECIPIENT, buildAirfareEmail } from '../lib/outlook'
import type { FlightReservation, FlightStatus, Trip } from '../types/routine'

function destinationFromTrip(trip: Trip) {
  const first = trip.appointments[0]
  return first?.city ? `${first.city}${first.state ? `/${first.state}` : ''}` : ''
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
      setNotes(d?.notes || '')
    }catch{/* noop */}
  },[trip?.id,existing?.id])

  useEffect(()=>{
    if(!trip || existing) return
    try{localStorage.setItem(draftKey,JSON.stringify({status,outboundOrigin,outboundDestination,outboundDate,outboundTime,returnOrigin,returnDestination,returnDate,returnTime,airline,locator,outboundFlightNumber,returnFlightNumber,notes}))}catch{/* noop */}
  },[trip,existing,draftKey,status,outboundOrigin,outboundDestination,outboundDate,outboundTime,returnOrigin,returnDestination,returnDate,returnTime,airline,locator,outboundFlightNumber,returnFlightNumber,notes])

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
    notes:notes||undefined,
  })

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

      <div className="flight-email-preview"><MailIcon/><div><strong>Solicitação pelo Outlook</strong><span>Destinatário: {AIRFARE_RECIPIENT}</span><small>O assunto inclui passageiro, origem, destino e período. O corpo leva seus dados do Perfil e os horários desejados.</small></div></div>

      {error&&<div className="auth-message error modal-error">{error}</div>}
      {message&&<div className="auth-message success modal-error">{message}</div>}
      <div className="modal-actions flight-modal-actions"><button className="ghost" onClick={onClose}>Fechar por enquanto</button><button className="secondary" disabled={busy} onClick={()=>void save()}>{busy?'Salvando...':'Salvar dados'}</button>{status==='not_requested'&&<button className="secondary" disabled={busy} onClick={()=>void save('requested')}><CheckIcon/> Marcar e-mail enviado</button>}<button className="primary" disabled={busy} onClick={()=>void openOutlook()}><MailIcon/> Abrir solicitação no Outlook</button></div>
    </section>
  </div>
}
