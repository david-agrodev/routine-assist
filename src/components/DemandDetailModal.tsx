import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertIcon, CalendarIcon, CheckIcon } from './Icons'
import { LocationFields } from './LocationFields'
import { TravelSetupPanel } from './TravelSetupPanel'
import { useRoutine } from '../context/RoutineContext'
import { formatDateRange } from '../lib/format'
import type { Appointment, AppointmentConflict, Demand, DemandStatus } from '../types/routine'

const draftKey = (id: string) => `routine-assist-demand-draft:${id}`

type Draft = {
  tab: 'info'|'schedule'; client: string; company: string; regional: string; city: string; state: string;
  quantity: string; raw: string; start: string; end: string; type: 'Presencial'|'Remoto'; confirmed: boolean
}

const statusLabel: Record<DemandStatus,string> = {
  received:'Recebida', waiting_info:'Faltam informações', contact:'Pronta para combinar data',
  scheduled:'Agendada', done:'Concluída', cancelled:'Cancelada',
}

export function DemandDetailModal({ demand, onClose }: { demand: Demand | null; onClose: () => void }) {
  const { companies, appointments, trips, updateDemand, checkAppointmentConflicts, scheduleDemand } = useRoutine()
  const [tab, setTab] = useState<'info'|'schedule'>('info')
  const [client, setClient] = useState('')
  const [company, setCompany] = useState('Alta')
  const [regional, setRegional] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [quantity, setQuantity] = useState('')
  const [raw, setRaw] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [type, setType] = useState<'Presencial'|'Remoto'>('Presencial')
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conflicts, setConflicts] = useState<AppointmentConflict[]>([])
  const [checked, setChecked] = useState(false)
  const [createdAppointment, setCreatedAppointment] = useState<Appointment | null>(null)
  const initializedFor = useRef<string | null>(null)

  const existingAppointment = useMemo(() => {
    if (!demand) return null
    return appointments.find(a => a.demandId === demand.id) || null
  }, [appointments, demand])
  const appointment = createdAppointment || existingAppointment
  const linkedTrip = useMemo(() => appointment ? trips.find(t => t.appointments.some(a => a.id === appointment.id)) || null : null, [trips, appointment])

  useEffect(() => {
    if (!demand) { initializedFor.current = null; setCreatedAppointment(null); return }
    let draft: Partial<Draft> | null = null
    try { draft = JSON.parse(window.localStorage.getItem(draftKey(demand.id)) || 'null') } catch { draft = null }
    setTab(draft?.tab || 'info')
    setClient(draft?.client ?? demand.client)
    setCompany(draft?.company ?? demand.company)
    setRegional(draft?.regional ?? demand.regional ?? '')
    setCity(draft?.city ?? demand.city ?? '')
    setState(draft?.state ?? demand.state ?? '')
    setQuantity(draft?.quantity ?? (demand.quantity == null ? '' : String(demand.quantity)))
    setRaw(draft?.raw ?? demand.raw ?? '')
    setStart(draft?.start ?? existingAppointment?.start ?? '')
    setEnd(draft?.end ?? existingAppointment?.end ?? '')
    setType(draft?.type ?? (existingAppointment?.type === 'Remoto' ? 'Remoto' : 'Presencial'))
    setConfirmed(draft?.confirmed ?? Boolean(existingAppointment))
    setConflicts([]); setChecked(false); setError(null); setCreatedAppointment(null)
    initializedFor.current = demand.id
  }, [demand?.id])

  useEffect(() => {
    if (!demand || initializedFor.current !== demand.id || appointment) return
    const draft: Draft = { tab, client, company, regional, city, state, quantity, raw, start, end, type, confirmed }
    try { window.localStorage.setItem(draftKey(demand.id), JSON.stringify(draft)) } catch { /* persistência opcional */ }
  }, [demand, appointment, tab, client, company, regional, city, state, quantity, raw, start, end, type, confirmed])

  const incomplete = useMemo(() => [!city.trim() && 'cidade', !state.trim() && 'UF', !regional.trim() && 'regional/comercial'].filter(Boolean) as string[], [city,state,regional])
  if (!demand) return null

  const infoComplete = Boolean(city.trim() && state.trim())
  const isScheduled = Boolean(appointment) || demand.status === 'scheduled'
  const tripComplete = Boolean(linkedTrip) || (appointment?.type === 'Remoto')
  const autoStatus: DemandStatus = ['done','cancelled'].includes(demand.status)
    ? demand.status
    : isScheduled ? 'scheduled' : infoComplete ? 'contact' : 'waiting_info'
  const autoNextStep = linkedTrip
    ? 'Organizar hotel e veículo'
    : appointment?.type === 'Remoto' ? 'Atendimento agendado'
    : isScheduled ? 'Organizar viagem'
    : infoComplete ? 'Combinar data com o cliente'
    : 'Completar informações'

  const payload = (forcedStatus?: DemandStatus, forcedNext?: string) => ({
    client: client.trim(), company, regional: regional.trim() || undefined,
    city: city.trim() || undefined, state: state.trim().toUpperCase() || undefined,
    quantity: quantity ? Number(quantity) : undefined, raw: raw.trim() || undefined,
    nextStep: forcedNext || autoNextStep, status: forcedStatus || autoStatus,
  })

  const save = async () => {
    if (!client.trim() || busy) return
    setBusy(true); setError(null)
    try { await updateDemand(demand.id, payload()) }
    catch (e:any) { setError(e?.message || 'Não foi possível salvar a demanda.') }
    finally { setBusy(false) }
  }

  const verify = async () => {
    setError(null); setConflicts([]); setChecked(false)
    if (!client.trim() || !city.trim() || !state.trim() || !start || !end) {
      setError('Preencha cliente, cidade, UF e o período antes de agendar.')
      return
    }
    if (end < start) { setError('A data final não pode ser anterior à data inicial.'); return }
    if (!confirmed) { setError('Confirme que a data já foi combinada com o cliente.'); return }
    setBusy(true)
    try {
      await updateDemand(demand.id, payload('contact', 'Data confirmada; verificar agenda'))
      const found = await checkAppointmentConflicts(start, end)
      setConflicts(found); setChecked(true)
      if (found.length === 0) await createSchedule(false)
    } catch (e:any) { setError(e?.message || 'Não foi possível verificar a agenda.') }
    finally { setBusy(false) }
  }

  const createSchedule = async (allowConflict: boolean) => {
    setBusy(true); setError(null)
    try {
      const created = await scheduleDemand({ demandId: demand.id, client: client.trim(), city: city.trim(), state: state.trim().toUpperCase(), start, end, type, clientConfirmed: confirmed, allowConflict })
      setCreatedAppointment(created)
      setConflicts([]); setChecked(false)
      try { window.localStorage.removeItem(draftKey(demand.id)) } catch { /* noop */ }
    } catch (e:any) { setError(e?.message || 'Não foi possível agendar o atendimento.') }
    finally { setBusy(false) }
  }

  const workflow = [
    { label:'Recebida', done:true },
    { label:'Informações', done:infoComplete },
    { label:'Agenda', done:isScheduled },
    { label: appointment?.type === 'Remoto' ? 'Sem viagem' : 'Viagem', done:tripComplete },
  ]

  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && !busy && onClose()}>
    <section className="modal-card demand-detail-card">
      <div className="modal-head"><div><span className="eyebrow">Demanda</span><h2>{demand.client}</h2></div><button className="close" onClick={onClose}>×</button></div>

      <div className="workflow-progress" aria-label="Progresso da demanda">
        {workflow.map((step,index)=><div key={step.label} className={`workflow-step ${step.done?'done':''}`}><span>{step.done?<CheckIcon/>:index+1}</span><small>{step.label}</small></div>)}
      </div>

      <div className="detail-tabs">
        <button className={tab==='info'?'active':''} onClick={()=>setTab('info')}>Informações</button>
        <button className={tab==='schedule'?'active':''} onClick={()=>setTab('schedule')}><CalendarIcon/> Agenda e viagem</button>
      </div>

      {tab==='info' ? <>
        <div className="auto-status-panel">
          <div><span className="eyebrow">Situação automática</span><strong>{statusLabel[autoStatus]}</strong></div>
          <div><span className="eyebrow">Próximo passo</span><strong>{autoNextStep}</strong></div>
          <p>Você não precisa mais escolher o status. O Routine atualiza conforme as informações, o agendamento e a viagem.</p>
        </div>
        <div className="form-grid demand-edit-grid simplified-demand-grid">
          <label className="field"><span>Cliente *</span><input value={client} onChange={e=>setClient(e.target.value)}/></label>
          <label className="field"><span>Central *</span><select value={company} onChange={e=>setCompany(e.target.value)}>{(companies.length?companies:[{id:'alta',name:'Alta'},{id:'genex',name:'GENEX'}]).map(c=><option key={c.id} value={c.name}>{c.name}</option>)}</select></label>
          <label className="field"><span>Colares</span><input type="number" min="0" value={quantity} onChange={e=>setQuantity(e.target.value)}/></label>
          <label className="field"><span>Regional / comercial</span><input value={regional} onChange={e=>setRegional(e.target.value)} placeholder="Nome do regional/distrital"/></label>
          <LocationFields city={city} state={state} onCityChange={setCity} onStateChange={setState}/>
        </div>
        <label className="field"><span>Informações recebidas / observações</span><textarea rows={5} value={raw} onChange={e=>setRaw(e.target.value)}/></label>
        {incomplete.length>0 && <div className="soft-note"><AlertIcon/> Ainda falta {incomplete.join(', ')}. Você pode salvar mesmo assim.</div>}
        <div className="draft-note">Rascunho salvo automaticamente neste dispositivo.</div>
        {error && <div className="auth-message error modal-error">{error}</div>}
        <div className="modal-actions"><button className="ghost" onClick={onClose}>Fechar</button>{!isScheduled && infoComplete && <button className="secondary" onClick={()=>setTab('schedule')}><CalendarIcon/> Ir para agendamento</button>}<button className="primary" disabled={!client.trim()||busy} onClick={()=>void save()}>{busy?'Salvando...':'Salvar alterações'}</button></div>
      </> : <>
        {appointment ? <>
          <div className="scheduled-summary">
            <span className="section-icon neutral"><CheckIcon/></span>
            <div className="grow"><span className="eyebrow">Atendimento agendado</span><h3>{appointment.client}</h3><p>{[appointment.city,appointment.state].filter(Boolean).join('/')} • {formatDateRange(appointment.start,appointment.end)} • {appointment.type}</p></div>
          </div>
          {appointment.type === 'Presencial' ? <TravelSetupPanel appointment={appointment} onFinish={onClose}/> : <div className="remote-success"><CheckIcon/><div><strong>Pronto.</strong><span>Como o atendimento é remoto, não é necessário criar viagem, hotel ou veículo.</span></div></div>}
        </> : demand.status==='scheduled' ? <div className="scheduled-note"><CheckIcon/><div><strong>Esta demanda está marcada como agendada.</strong><span>Atualize a página caso o compromisso ainda não tenha aparecido. O Routine usa o compromisso da Agenda para organizar a viagem.</span></div></div> : <>
          <div className="schedule-intro"><span className="section-icon plum"><CalendarIcon/></span><div><strong>Transformar em compromisso de agenda</strong><p>Primeiro confirme a data com o cliente. Depois o Routine verifica conflitos e conduz você para a viagem.</p></div></div>
          <div className="form-grid schedule-grid">
            <LocationFields city={city} state={state} onCityChange={setCity} onStateChange={setState} required/>
            <label className="field"><span>Tipo *</span><select value={type} onChange={e=>setType(e.target.value as 'Presencial'|'Remoto')}><option>Presencial</option><option>Remoto</option></select></label>
            <label className="field"><span>Data inicial *</span><input type="date" value={start} onChange={e=>{setStart(e.target.value);setChecked(false);setConflicts([])}}/></label>
            <label className="field"><span>Data final *</span><input type="date" value={end} onChange={e=>{setEnd(e.target.value);setChecked(false);setConflicts([])}}/></label>
          </div>
          <label className="confirm-row"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/><span><strong>Data confirmada com o cliente</strong><small>O Routine só cria o compromisso depois desta confirmação.</small></span></label>
          <div className="draft-note">Data e opções ficam salvas mesmo se você fechar a demanda e voltar depois.</div>
          {conflicts.length>0 && <div className="conflict-box"><div className="conflict-title"><AlertIcon/><div><strong>Conflito de agenda</strong><span>Você já possui compromisso nesse período.</span></div></div>{conflicts.map(c=><div className="conflict-row" key={c.id}><strong>{c.title}</strong><span>{formatDateRange(c.start,c.end)}</span></div>)}</div>}
          {checked && conflicts.length===0 && <div className="auth-message success"><CheckIcon/> Agenda disponível.</div>}
          {error && <div className="auth-message error modal-error">{error}</div>}
          <div className="modal-actions">
            <button className="ghost" onClick={()=>setTab('info')}>Voltar</button>
            {conflicts.length>0 ? <><button className="secondary" onClick={()=>{setConflicts([]);setChecked(false)}}>Alterar data</button><button className="danger-soft" disabled={busy} onClick={()=>void createSchedule(true)}>Agendar mesmo assim</button></> : <button className="primary" disabled={busy} onClick={()=>void verify()}><CalendarIcon/> {busy?'Verificando...':'Verificar e agendar'}</button>}
          </div>
        </>}
      </>}
    </section>
  </div>
}
