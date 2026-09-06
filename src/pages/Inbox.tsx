import { useEffect, useMemo, useState } from 'react'
import { ArrowIcon, AlertIcon } from '../components/Icons'
import { DemandDetailModal } from '../components/DemandDetailModal'
import { CompanyFilter } from '../components/CompanyFilter'
import { useRoutine } from '../context/RoutineContext'
import { formatCompanyName, formatEquipmentSummary } from '../lib/format'
import { companyClass, companyKey, type CompanyFilter as CompanyFilterValue } from '../lib/company'
import { isHotelReady, isVehicleReady } from '../lib/tripReadiness'
import type { Demand, DemandStatus } from '../types/routine'

type Filter = 'all' | DemandStatus
const FILTER_KEY = 'routine-assist-inbox-filter'
const SELECTED_KEY = 'routine-assist-inbox-selected-demand'
const COMPANY_FILTER_KEY = 'routine-assist-inbox-company-filter'

export function Inbox() {
  const { demands, appointments, trips, loading, error } = useRoutine()
  const [filter,setFilter] = useState<Filter>(() => (window.localStorage.getItem(FILTER_KEY) as Filter) || 'all')
  const [selectedId,setSelectedId] = useState<string|null>(() => window.localStorage.getItem('routine-assist-focus-demand') || window.localStorage.getItem(SELECTED_KEY))
  const [companyFilter,setCompanyFilter]=useState<CompanyFilterValue>(() => (window.localStorage.getItem(COMPANY_FILTER_KEY) as CompanyFilterValue) || 'all')
  const selected = useMemo<Demand|null>(() => selectedId ? demands.find(d=>d.id===selectedId) || null : null, [selectedId, demands])
  const shown = demands.filter(d => (filter==='all' || d.status===filter) && (companyFilter==='all' || companyKey(d.company)===companyFilter))

  useEffect(() => { try { window.localStorage.setItem(FILTER_KEY, filter); window.localStorage.removeItem('routine-assist-focus-demand') } catch { /* noop */ } }, [filter])
  useEffect(() => { try { window.localStorage.setItem(COMPANY_FILTER_KEY, companyFilter) } catch { /* noop */ } }, [companyFilter])
  useEffect(() => {
    try {
      if (selectedId) window.localStorage.setItem(SELECTED_KEY, selectedId)
      else window.localStorage.removeItem(SELECTED_KEY)
    } catch { /* noop */ }
  }, [selectedId])

  return <>
    <section className="page-heading"><div><span className="eyebrow">Caixa de entrada</span><h1>Demandas</h1><p>Registre primeiro. Organize depois. Nada precisa ficar perdido em mensagens.</p></div></section>
    <div className="demand-filter-panel">
      <CompanyFilter value={companyFilter} onChange={setCompanyFilter}/>
      <div className="filters status-filters">
        <button className={`chip ${filter==='all'?'active':''}`} onClick={()=>setFilter('all')}>Todos os status <span>{demands.length}</span></button>
        <button className={`chip ${filter==='waiting_info'?'active':''}`} onClick={()=>setFilter('waiting_info')}>Faltam dados</button>
        <button className={`chip ${filter==='contact'?'active':''}`} onClick={()=>setFilter('contact')}>Em contato</button>
        <button className={`chip ${filter==='scheduled'?'active':''}`} onClick={()=>setFilter('scheduled')}>Agendadas</button>
      </div>
    </div>
    {loading && demands.length===0 && <div className="empty-state"><strong>Carregando demandas...</strong></div>}
    {error && <div className="data-error">{error}</div>}
    {!loading && shown.length===0 && <div className="empty-state"><img className="empty-brand-mark" src="/brand-mark.svg" alt=""/><strong>Nenhuma demanda aqui ainda.</strong><p>Use “Nova demanda” para registrar a primeira informação recebida, mesmo incompleta.</p></div>}
    <section className="demand-list">
      {shown.map(d=>{
        const appointment = appointments.find(a=>a.demandId===d.id)
        const linkedTrip = appointment ? trips.find(t=>t.appointments.some(a=>a.id===appointment.id)) : undefined
        const logisticsReady = linkedTrip ? isHotelReady(linkedTrip) && isVehicleReady(linkedTrip) : false
        const stage = d.status==='cancelled'
          ? { label:'Cancelada', cls:'cancelled', next:'Sem próximo passo' }
          : linkedTrip
            ? { label:logisticsReady?'Viagem pronta':'Logística pendente', cls:'scheduled', next:logisticsReady?'Acompanhar viagem':'Organizar hotel e veículo' }
            : appointment?.type==='Remoto'
              ? { label:'Remoto agendado', cls:'scheduled', next:'Acompanhar atendimento remoto' }
              : appointment
                ? { label:'Agendada', cls:'scheduled', next:'Organizar viagem' }
                : d.city && d.state
                  ? { label:'Pronta para agendar', cls:'contact', next:'Combinar data com o cliente' }
                  : { label:'Faltam dados', cls:'waiting_info', next:'Completar cidade e UF' }
        return <article className={`demand-card ${companyClass(companyKey(d.company))}`} key={d.id} onDoubleClick={()=>setSelectedId(d.id)}>
          <div className="demand-main"><div className="demand-title"><h3>{d.client}</h3><span className={`status ${stage.cls}`}>{stage.label}</span></div><div className="demand-meta"><span>{formatCompanyName(d.company)}{d.product ? ` • ${d.product}`:''}</span><span>{formatEquipmentSummary(d)}</span>{d.regional && <span>Responsável comercial: {d.regional}</span>}</div>{(!d.city || !d.state) && <div className="inline-warning"><AlertIcon/> Cidade/UF ainda não informada</div>}{d.city && d.state && <div className="demand-location">{d.farmName ? `${d.farmName} • ` : ''}{d.city}/{d.state}</div>}</div>
          <div className="next-step"><span>Próximo passo</span><strong>{stage.next}</strong></div>
          <button className="icon-button subtle" aria-label={`Abrir ${d.client}`} onClick={()=>setSelectedId(d.id)}><ArrowIcon/></button>
        </article>
      })}
    </section>
    <DemandDetailModal demand={selected} onClose={()=>setSelectedId(null)}/>
  </>
}
