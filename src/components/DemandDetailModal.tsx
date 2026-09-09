import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertIcon, CalendarIcon, CheckIcon, EditIcon, LocationIcon, PlusIcon, TrashIcon } from './Icons'
import { LocationFields } from './LocationFields'
import { TravelSetupPanel } from './TravelSetupPanel'
import { ConfirmActionModal } from './ConfirmActionModal'
import { PriorityStars } from './PriorityStars'
import { useRoutine } from '../context/RoutineContext'
import { formatCompanyName, formatDateRange, formatEquipmentSummary } from '../lib/format'
import { isFlightReady, isHotelReady, isVehicleReady } from '../lib/tripReadiness'
import { tripDisplayTitle } from '../lib/tripTitle'
import { getHolidaysInRange } from '../services/holidays'
import type { Appointment, AppointmentConflict, Demand, DemandPriority, DemandStatus, Holiday } from '../types/routine'

const draftKey = (id: string) => `routine-assist-demand-draft:${id}:v3`

type Draft = {
  tab: 'info'|'schedule'
  client: string
  company: string
  regional: string
  priority?: DemandPriority
  farmName: string
  city: string
  state: string
  quantity: string
  extraAntennaCount: string
  showExtraAntenna: boolean
  raw: string
  start: string
  end: string
  type: 'Presencial'|'Remoto'
  confirmed: boolean
}

export function DemandDetailModal({ demand, onClose, initialTab }: { demand: Demand | null; onClose: () => void; initialTab?: 'info'|'schedule' }) {
  const { companies, appointments, trips, updateDemand, deleteDemand, cancelAppointment, checkAppointmentConflicts, scheduleDemand, updateAppointment } = useRoutine()
  const [tab, setTab] = useState<'info'|'schedule'>('info')
  const [client, setClient] = useState('')
  const [company, setCompany] = useState('')
  const [regional, setRegional] = useState('')
  const [priority, setPriority] = useState<DemandPriority>(3)
  const [farmName, setFarmName] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [quantity, setQuantity] = useState('')
  const [extraAntennaCount, setExtraAntennaCount] = useState('')
  const [showExtraAntenna, setShowExtraAntenna] = useState(false)
  const [raw, setRaw] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [type, setType] = useState<'Presencial'|'Remoto'>('Presencial')
  const [confirmed, setConfirmed] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conflicts, setConflicts] = useState<AppointmentConflict[]>([])
  const [checked, setChecked] = useState(false)
  const [createdAppointment, setCreatedAppointment] = useState<Appointment | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [cancelAppointmentOpen, setCancelAppointmentOpen] = useState(false)
  const [cancelAppointmentError, setCancelAppointmentError] = useState<string | null>(null)
  const [cancelDemandOpen, setCancelDemandOpen] = useState(false)
  const [cancelDemandError, setCancelDemandError] = useState<string | null>(null)
  const [holidayPrompt, setHolidayPrompt] = useState<{ holidays: Holiday[]; mode: 'create'|'edit'; unavailable?: boolean } | null>(null)
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
    setTab(initialTab || draft?.tab || 'info')
    setClient(draft?.client ?? demand.client)
    setCompany(draft?.company ?? demand.company)
    setRegional(draft?.regional ?? demand.regional ?? '')
    const savedPriority = Number(draft?.priority ?? demand.priority)
    setPriority((savedPriority >= 1 && savedPriority <= 5 ? savedPriority : 3) as DemandPriority)
    setFarmName(draft?.farmName ?? demand.farmName ?? existingAppointment?.farmName ?? '')
    setCity(draft?.city ?? demand.city ?? '')
    setState(draft?.state ?? demand.state ?? '')
    setQuantity(draft?.quantity ?? (demand.quantity == null ? '' : String(demand.quantity)))
    setExtraAntennaCount(draft?.extraAntennaCount ?? (demand.extraAntennaCount == null ? '' : String(demand.extraAntennaCount)))
    setShowExtraAntenna(draft?.showExtraAntenna ?? ((demand.extraAntennaCount ?? 0) > 0))
    setRaw(draft?.raw ?? demand.raw ?? '')
    setStart(draft?.start ?? existingAppointment?.start ?? '')
    setEnd(draft?.end ?? existingAppointment?.end ?? '')
    setType(draft?.type ?? (existingAppointment?.type === 'Remoto' ? 'Remoto' : 'Presencial'))
    setConfirmed(draft?.confirmed ?? Boolean(existingAppointment?.clientConfirmed ?? existingAppointment))
    setConflicts([]); setChecked(false); setError(null); setCreatedAppointment(null); setDeleteOpen(false); setCancelAppointmentOpen(false); setCancelAppointmentError(null); setCancelDemandOpen(false); setCancelDemandError(null); setEditingAppointment(false)
    initializedFor.current = demand.id
  }, [demand?.id, existingAppointment?.id])

  useEffect(() => {
    if (!demand || initializedFor.current !== demand.id || appointment) return
    const draft: Draft = { tab, client, company, regional, priority, farmName, city, state, quantity, extraAntennaCount, showExtraAntenna, raw, start, end, type, confirmed }
    try { window.localStorage.setItem(draftKey(demand.id), JSON.stringify(draft)) } catch { /* persistência opcional */ }
  }, [demand, appointment, tab, client, company, regional, priority, farmName, city, state, quantity, extraAntennaCount, showExtraAntenna, raw, start, end, type, confirmed])

  if (!demand) return null

  const infoComplete = Boolean(city.trim() && state.trim())
  const isScheduled = Boolean(appointment)
  const tripComplete = Boolean(linkedTrip) || (appointment?.type === 'Remoto')
  const hotelReady = linkedTrip ? isHotelReady(linkedTrip) : false
  const vehicleReady = linkedTrip ? isVehicleReady(linkedTrip) : false
  const flightReady = linkedTrip ? isFlightReady(linkedTrip) : false
  const logisticsReady = Boolean(linkedTrip && hotelReady && vehicleReady && flightReady)

  let autoStatusText = 'Informações pendentes'
  if (demand.status === 'cancelled') autoStatusText = 'Cancelada'
  else if (demand.status === 'done' || linkedTrip?.status === 'completed') autoStatusText = 'Concluída'
  else if (linkedTrip) autoStatusText = logisticsReady ? 'Viagem pronta' : 'Logística pendente'
  else if (appointment?.type === 'Remoto') autoStatusText = 'Atendimento remoto agendado'
  else if (appointment) autoStatusText = 'Agendada • organizar viagem'
  else if (infoComplete) autoStatusText = 'Pronta para agendar'

  const autoNextStep = demand.status === 'done' || linkedTrip?.status === 'completed'
    ? 'No histórico'
    : linkedTrip
    ? logisticsReady ? 'Acompanhar a viagem' : 'Organizar logística da viagem'
    : appointment?.type === 'Remoto' ? 'Acompanhar atendimento remoto'
    : appointment ? 'Organizar viagem'
    : infoComplete ? 'Combinar data com o cliente'
    : 'Completar cidade e UF'

  const storedStatus: DemandStatus = demand.status === 'cancelled'
    ? 'cancelled'
    : demand.status === 'done' ? 'done'
    : isScheduled ? 'scheduled' : infoComplete ? 'contact' : 'waiting_info'

  const incomplete = [!city.trim() && 'cidade', !state.trim() && 'UF'].filter(Boolean) as string[]
  const n = (value: string) => value === '' ? undefined : Number(value)
  const payload = (forcedStatus?: DemandStatus, forcedNext?: string) => ({
    client: client.trim(),
    company,
    regional: regional.trim() || undefined,
    priority,
    farmName: farmName.trim() || undefined,
    city: city.trim() || undefined,
    state: state.trim().toUpperCase() || undefined,
    quantity: n(quantity),
    extraAntennaCount: showExtraAntenna ? n(extraAntennaCount) : undefined,
    raw: raw.trim() || undefined,
    nextStep: forcedNext || autoNextStep,
    status: forcedStatus || storedStatus,
  })

  const save = async () => {
    if (!client.trim() || !company || busy) return
    setBusy(true); setError(null)
    try { await updateDemand(demand.id, payload()) }
    catch (e:any) { setError(e?.message || 'Não foi possível salvar a demanda.') }
    finally { setBusy(false) }
  }

  const removeDemand = async () => {
    if (busy) return
    setBusy(true); setError(null)
    try {
      await deleteDemand(demand.id)
      setDeleteOpen(false)
      onClose()
    } catch (e:any) { setError(e?.message || 'Não foi possível excluir a demanda.') }
    finally { setBusy(false) }
  }

  const cancelScheduledAppointment = async () => {
    if (!appointment || busy) return
    setBusy(true); setCancelAppointmentError(null)
    try {
      await cancelAppointment(appointment.id, demand.id)
      setCreatedAppointment(null)
      setEditingAppointment(false)
      setCancelAppointmentOpen(false)
      setTab('info')
    } catch (e:any) { setCancelAppointmentError(e?.message || 'Não foi possível cancelar o atendimento.') }
    finally { setBusy(false) }
  }

  const cancelDemand = async () => {
    if (busy) return
    setBusy(true); setCancelDemandError(null)
    try {
      await updateDemand(demand.id, payload('cancelled', 'Demanda cancelada'))
      setCancelDemandOpen(false)
      onClose()
    } catch (e:any) { setCancelDemandError(e?.message || 'Não foi possível cancelar a demanda.') }
    finally { setBusy(false) }
  }

  const reopenDemand = async () => {
    if (busy) return
    setBusy(true); setError(null)
    try {
      const nextStatus: DemandStatus = infoComplete ? 'contact' : 'waiting_info'
      const nextStep = infoComplete ? 'Combinar nova data com o cliente' : 'Completar cidade e UF'
      await updateDemand(demand.id, payload(nextStatus, nextStep))
      onClose()
    } catch (e:any) { setError(e?.message || 'Não foi possível reabrir a demanda.') }
    finally { setBusy(false) }
  }

  const validateSchedule = () => {
    if (!client.trim() || !city.trim() || !state.trim() || !start || !end) return 'Informe cidade e UF na aba Informações e preencha o período antes de agendar.'
    if (type === 'Presencial' && !farmName.trim()) return 'Informe o nome da fazenda na aba Informações antes de agendar um atendimento presencial.'
    if (end < start) return 'A data final não pode ser anterior à data inicial.'
    if (!confirmed) return 'Confirme que a data já foi combinada com o cliente.'
    if (linkedTrip && type === 'Remoto') return 'Este atendimento está vinculado a uma viagem. Exclua/desvincule a viagem antes de mudar o atendimento para remoto.'
    return null
  }

  const continueAfterAvailability = async (mode: 'create'|'edit') => {
    try {
      const holidays = await getHolidaysInRange(start, end)
      if (holidays.length > 0) {
        setHolidayPrompt({ holidays, mode })
        return
      }
    } catch {
      setHolidayPrompt({ holidays: [], mode, unavailable: true })
      return
    }
    if (mode === 'edit') await saveExisting()
    else await createSchedule()
  }

  const verifyNew = async () => {
    setError(null); setConflicts([]); setChecked(false)
    const validation = validateSchedule()
    if (validation) { setError(validation); return }
    setBusy(true)
    try {
      await updateDemand(demand.id, payload('contact', 'Data confirmada; verificar agenda'))
      const found = await checkAppointmentConflicts(start, end)
      setConflicts(found); setChecked(true)
      if (found.length === 0) await continueAfterAvailability('create')
    } catch (e:any) { setError(e?.message || 'Não foi possível verificar a agenda.') }
    finally { setBusy(false) }
  }

  const createSchedule = async () => {
    setBusy(true); setError(null)
    try {
      const created = await scheduleDemand({
        demandId: demand.id,
        client: client.trim(),
        city: city.trim(),
        state: state.trim().toUpperCase(),
        farmName: farmName.trim() || undefined,
        start,
        end,
        type,
        clientConfirmed: confirmed,
      })
      setCreatedAppointment(created)
      setConflicts([]); setChecked(false)
      try { window.localStorage.removeItem(draftKey(demand.id)) } catch { /* noop */ }
    } catch (e:any) { setError(e?.message || 'Não foi possível agendar o atendimento.') }
    finally { setBusy(false) }
  }

  const beginAppointmentEdit = () => {
    if (!appointment) return
    setStart(appointment.start); setEnd(appointment.end); setType(appointment.type === 'Remoto' ? 'Remoto' : 'Presencial')
    setConfirmed(Boolean(appointment.clientConfirmed ?? true)); setConflicts([]); setChecked(false); setError(null); setEditingAppointment(true)
  }

  const verifyExisting = async () => {
    if (!appointment) return
    setError(null); setConflicts([]); setChecked(false)
    const validation = validateSchedule()
    if (validation) { setError(validation); return }
    setBusy(true)
    try {
      const found = await checkAppointmentConflicts(start, end, appointment.id)
      setConflicts(found); setChecked(true)
      if (found.length === 0) await continueAfterAvailability('edit')
    } catch(e:any){ setError(e?.message || 'Não foi possível verificar a agenda.') }
    finally { setBusy(false) }
  }

  const saveExisting = async () => {
    if (!appointment) return
    setBusy(true); setError(null)
    try {
      const updated = await updateAppointment({
        appointmentId: appointment.id,
        demandId: demand.id,
        start,end,type,clientConfirmed:confirmed,
        farmName:farmName.trim() || undefined,
        city:city.trim() || undefined,
        state:state.trim().toUpperCase() || undefined,
      })
      setCreatedAppointment(updated); setEditingAppointment(false); setConflicts([]); setChecked(false)
    } catch(e:any){ setError(e?.message || 'Não foi possível atualizar o agendamento.') }
    finally { setBusy(false) }
  }

  const workflow = [
    { label:'Recebida', done:true },
    { label:'Informações', done:infoComplete },
    { label:'Agenda', done:isScheduled },
    { label: appointment?.type === 'Remoto' ? 'Sem viagem' : 'Viagem', done:tripComplete },
  ]
  const companyOptions = companies.length ? companies : [{ id:'alta', name:'Alta' }, { id:'genex', name:'GENEX' }]
  const deleteDetail = linkedTrip
    ? `O compromisso será removido da Agenda e desvinculado de “${tripDisplayTitle(linkedTrip)}”. A viagem continuará existindo.`
    : appointment ? 'O compromisso também será removido da Agenda.' : 'Esta ação remove somente a demanda cadastrada.'

  const scheduleEditor = (isEdit:boolean) => <>
    <div className="schedule-intro"><span className="section-icon plum"><CalendarIcon/></span><div><strong>{isEdit ? 'Editar compromisso da agenda' : 'Transformar em compromisso de agenda'}</strong><p>Cidade, UF e fazenda vêm da aba Informações. Aqui você controla apenas tipo e período.</p></div></div>
    <div className={`schedule-location ${infoComplete?'ready':'missing'}`}>
      <span className="section-icon neutral"><LocationIcon/></span>
      <div className="grow"><span className="eyebrow">Local do atendimento</span><strong>{infoComplete ? `${farmName ? `${farmName} • ` : ''}${city}/${state}` : 'Cidade/UF ainda não informadas'}</strong><small>{infoComplete ? 'Para alterar local ou fazenda, volte à aba Informações.' : 'Preencha o local na aba Informações antes de agendar.'}</small></div>
      <button className="secondary mini" onClick={()=>setTab('info')}>{infoComplete?'Alterar informações':'Preencher local'}</button>
    </div>
    {type==='Presencial' && !farmName.trim() && <div className="soft-note"><AlertIcon/> Para atendimento presencial, informe o nome da fazenda na aba Informações.</div>}
    <div className="form-grid schedule-grid schedule-grid-no-location">
      <label className="field"><span>Tipo *</span><select value={type} onChange={e=>setType(e.target.value as 'Presencial'|'Remoto')}><option>Presencial</option><option>Remoto</option></select></label>
      <label className="field"><span>Data inicial *</span><input type="date" value={start} onChange={e=>{setStart(e.target.value);setChecked(false);setConflicts([])}}/></label>
      <label className="field"><span>Data final *</span><input type="date" value={end} onChange={e=>{setEnd(e.target.value);setChecked(false);setConflicts([])}}/></label>
    </div>
    <label className="confirm-row"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/><span><strong>Data confirmada com o cliente</strong><small>O Routine só salva o compromisso depois desta confirmação.</small></span></label>
    {isEdit && linkedTrip && <div className="soft-note"><EditIcon/> Se o novo período ultrapassar a viagem, o Routine amplia a viagem automaticamente. Para encurtar saída/retorno, edite a viagem depois.</div>}
    {!isEdit && <div className="draft-note">Data e opções ficam salvas mesmo se você fechar a demanda e voltar depois.</div>}
    {conflicts.length>0 && <div className="conflict-box hard-block"><div className="conflict-title"><AlertIcon/><div><strong>Período indisponível</strong><span>Já existe atendimento neste período. O Routine não permite sobreposição de agenda.</span></div></div>{conflicts.map(c=><div className="conflict-row" key={c.id}><strong>{c.title}</strong><span>{formatDateRange(c.start,c.end)}</span></div>)}</div>}
    {checked && conflicts.length===0 && <div className="auth-message success"><CheckIcon/> Agenda disponível.</div>}
    {error && <div className="auth-message error modal-error">{error}</div>}
    <div className="modal-actions">
      {isEdit ? <button className="ghost" onClick={()=>{setEditingAppointment(false);setConflicts([]);setError(null)}}>Cancelar edição</button> : <button className="ghost" onClick={()=>setTab('info')}>Voltar</button>}
      {conflicts.length>0 ? <button className="primary" onClick={()=>{setConflicts([]);setChecked(false)}}>Escolher outra data</button> : <button className="primary" disabled={busy || !infoComplete || (type==='Presencial' && !farmName.trim())} onClick={()=>void (isEdit ? verifyExisting() : verifyNew())}><CalendarIcon/> {busy?'Verificando...':isEdit?'Verificar e salvar':'Verificar e agendar'}</button>}
    </div>
  </>

  return <>
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && !busy && onClose()}>
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
            <div><span className="eyebrow">Situação automática</span><strong>{autoStatusText}</strong></div>
            <div><span className="eyebrow">Próximo passo</span><strong>{autoNextStep}</strong></div>
            <p>O Routine atualiza o estágio conforme informações, agendamento, viagem, hotel, veículo e passagem.</p>
          </div>

          <div className="form-grid simplified-demand-grid">
            <label className="field"><span>Cliente *</span><input value={client} onChange={e=>setClient(e.target.value)} placeholder="Nome do cliente"/></label>
            <label className="field"><span>Central *</span><select value={company} onChange={e=>setCompany(e.target.value)}><option value="">Selecione</option>{companyOptions.map(c=><option key={c.id} value={c.name}>{formatCompanyName(c.name)}</option>)}</select></label>
            <label className="field"><span>Responsável comercial</span><input value={regional} onChange={e=>setRegional(e.target.value)} placeholder="Vendedor, regional ou distrital"/></label>
            <label className="field"><span>Fazenda</span><input value={farmName} onChange={e=>setFarmName(e.target.value)} placeholder="Obrigatória antes do atendimento presencial"/></label>
            <PriorityStars value={priority} onChange={setPriority}/>
          </div>
          <div className="location-grid"><LocationFields state={state} city={city} onStateChange={setState} onCityChange={setCity}/></div>

          <div className="equipment-panel demand-items-panel">
            <div className="equipment-head"><div><strong>Itens desta demanda</strong><span>{formatEquipmentSummary({quantity:n(quantity),extraAntennaCount:showExtraAntenna?n(extraAntennaCount):undefined})}</span></div><small>Preencha apenas o que foi vendido nesta demanda.</small></div>
            <div className="demand-items-grid">
              <label className="field"><span>Colares</span><input type="number" min="0" inputMode="numeric" value={quantity} onChange={e=>setQuantity(e.target.value)} placeholder="Ex.: 300"/></label>
              {showExtraAntenna ? <label className="field optional-demand-item"><span>Antenas adicionais</span><div className="inline-input-action"><input type="number" min="0" inputMode="numeric" value={extraAntennaCount} onChange={e=>setExtraAntennaCount(e.target.value)} placeholder="Ex.: 1"/><button type="button" className="icon-button subtle remove-item" aria-label="Remover antenas adicionais" onClick={()=>{setShowExtraAntenna(false);setExtraAntennaCount('')}}><TrashIcon/></button></div></label> : <button type="button" className="add-optional-item" onClick={()=>setShowExtraAntenna(true)}><PlusIcon/> Adicionar antenas adicionais</button>}
            </div>
          </div>

          <label className="field raw-information-field"><span>Informações recebidas / observações</span><textarea rows={4} value={raw} onChange={e=>setRaw(e.target.value)} placeholder="Cole ou escreva aqui as informações recebidas sobre esta demanda..."/></label>
          {incomplete.length>0 && <div className="soft-note"><AlertIcon/> Ainda falta {incomplete.join(' e ')}. Você pode salvar mesmo assim.</div>}
          <div className="draft-note">Rascunho salvo automaticamente neste dispositivo.</div>
          {error && <div className="auth-message error modal-error">{error}</div>}
          <div className="modal-actions demand-actions"><button className="danger-outline" disabled={busy} onClick={()=>{setError(null);setDeleteOpen(true)}}><TrashIcon/> Excluir demanda</button>{demand.status === 'cancelled' ? <button className="primary" disabled={busy} onClick={()=>void reopenDemand()}><CheckIcon/> {busy?'Reabrindo...':'Reabrir demanda'}</button> : !isScheduled && <button className="danger-outline" disabled={busy} onClick={()=>{setCancelDemandError(null);setCancelDemandOpen(true)}}><TrashIcon/> Cancelar demanda</button>}<span className="actions-spacer"/><button className="ghost" onClick={onClose}>Fechar</button>{!isScheduled && infoComplete && <button className="secondary" onClick={()=>setTab('schedule')}><CalendarIcon/> Ir para agendamento</button>}<button className="primary" disabled={!client.trim()||!company||busy} onClick={()=>void save()}>{busy?'Salvando...':'Salvar alterações'}</button></div>
        </> : <>
          {appointment && !editingAppointment ? <>
            <div className="scheduled-summary">
              <span className="section-icon neutral"><CheckIcon/></span>
              <div className="grow"><span className="eyebrow">Atendimento agendado</span><h3>{appointment.farmName || appointment.client}</h3><p>{appointment.client}{appointment.farmName ? ' • ' : ''}{[appointment.city,appointment.state].filter(Boolean).join('/')} • {formatDateRange(appointment.start,appointment.end)} • {appointment.type}</p></div>
              <div className="scheduled-summary-actions"><button className="secondary compact" onClick={beginAppointmentEdit}><EditIcon/> Editar agendamento</button><button className="danger-soft compact" onClick={()=>{setCancelAppointmentError(null);setCancelAppointmentOpen(true)}}><TrashIcon/> Cancelar atendimento</button></div>
            </div>
            {appointment.type === 'Presencial' ? <TravelSetupPanel appointment={appointment} onFinish={onClose}/> : <div className="remote-success"><CheckIcon/><div><strong>Pronto.</strong><span>Como o atendimento é remoto, não é necessário criar viagem, hotel ou veículo.</span></div></div>}
          </> : scheduleEditor(Boolean(appointment && editingAppointment))}
        </>}
      </section>
    </div>

    <ConfirmActionModal
      open={Boolean(holidayPrompt)}
      title={holidayPrompt?.unavailable ? "Não foi possível verificar feriados" : "Agendar em feriado?"}
      description={holidayPrompt?.unavailable ? "A consulta de feriados nacionais está indisponível no momento. Você pode continuar ciente disso." : holidayPrompt ? `O período inclui ${holidayPrompt.holidays.length === 1 ? 'um feriado nacional' : `${holidayPrompt.holidays.length} feriados nacionais`}.` : ''}
      detail={holidayPrompt?.unavailable ? "Se preferir, cancele e tente novamente antes de confirmar a data com o cliente." : holidayPrompt ? holidayPrompt.holidays.map(h => `${h.date.split('-').reverse().join('/')} • ${h.name}`).join('\n') : ''}
      confirmLabel={holidayPrompt?.unavailable ? "Agendar sem verificação" : "Agendar mesmo sendo feriado"}
      variant="warning"
      busy={busy}
      onCancel={()=>!busy&&setHolidayPrompt(null)}
      onConfirm={()=>{const mode=holidayPrompt?.mode;setHolidayPrompt(null);if(mode==='edit')void saveExisting();else if(mode==='create')void createSchedule()}}
    />

    <ConfirmActionModal
      open={cancelAppointmentOpen}
      title="Cancelar atendimento?"
      description={`${appointment?.farmName || demand.client} será retirado da Agenda${linkedTrip ? ` e da “${tripDisplayTitle(linkedTrip)}”` : ''}.`}
      detail={linkedTrip ? 'A viagem continuará existindo com os demais atendimentos. O nome e a rota serão atualizados automaticamente. A demanda voltará para a fila aberta para que você possa escolher outra data.' : 'A demanda voltará para a fila aberta e poderá ser agendada novamente quando houver uma nova data.'}
      confirmLabel="Cancelar atendimento"
      busy={busy}
      error={cancelAppointmentError}
      onCancel={()=>!busy&&setCancelAppointmentOpen(false)}
      onConfirm={()=>void cancelScheduledAppointment()}
    />

    <ConfirmActionModal
      open={cancelDemandOpen}
      title="Cancelar demanda?"
      description={`${demand.client} será movida para o histórico como cancelada.`}
      detail="Use esta opção somente quando a demanda não deve mais ser acompanhada. Para trocar a data ou aguardar uma nova data, use “Cancelar atendimento”."
      confirmLabel="Cancelar demanda"
      busy={busy}
      error={cancelDemandError}
      onCancel={()=>!busy&&setCancelDemandOpen(false)}
      onConfirm={()=>void cancelDemand()}
    />

    <ConfirmActionModal
      open={deleteOpen}
      title="Excluir demanda?"
      description={`${demand.client} será removido do Routine Assist.`}
      detail={deleteDetail}
      confirmLabel="Excluir demanda"
      busy={busy}
      error={error}
      onCancel={()=>!busy&&setDeleteOpen(false)}
      onConfirm={()=>void removeDemand()}
    />
  </>
}
