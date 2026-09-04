import { useEffect, useMemo, useState } from 'react'
import { ArrowIcon, AlertIcon } from '../components/Icons'
import { DemandDetailModal } from '../components/DemandDetailModal'
import { useRoutine } from '../context/RoutineContext'
import type { Demand, DemandStatus } from '../types/routine'

const statusLabel: Record<string,string> = {received:'Recebida',waiting_info:'Faltam dados',contact:'Em contato',scheduled:'Agendada',done:'Concluída',cancelled:'Cancelada'}
type Filter = 'all' | DemandStatus
const FILTER_KEY = 'routine-assist-inbox-filter'
const SELECTED_KEY = 'routine-assist-inbox-selected-demand'

export function Inbox() {
  const { demands, loading, error } = useRoutine()
  const [filter,setFilter] = useState<Filter>(() => (window.localStorage.getItem(FILTER_KEY) as Filter) || 'all')
  const [selectedId,setSelectedId] = useState<string|null>(() => window.localStorage.getItem('routine-assist-focus-demand') || window.localStorage.getItem(SELECTED_KEY))
  const selected = useMemo<Demand|null>(() => selectedId ? demands.find(d=>d.id===selectedId) || null : null, [selectedId, demands])
  const shown = filter==='all' ? demands : demands.filter(d=>d.status===filter)

  useEffect(() => { try { window.localStorage.setItem(FILTER_KEY, filter); window.localStorage.removeItem('routine-assist-focus-demand') } catch { /* noop */ } }, [filter])
  useEffect(() => {
    try {
      if (selectedId) window.localStorage.setItem(SELECTED_KEY, selectedId)
      else window.localStorage.removeItem(SELECTED_KEY)
    } catch { /* noop */ }
  }, [selectedId])

  return <>
    <section className="page-heading"><div><span className="eyebrow">Caixa de entrada</span><h1>Demandas</h1><p>Registre primeiro. Organize depois. Nada precisa ficar perdido em mensagens.</p></div></section>
    <div className="filters">
      <button className={`chip ${filter==='all'?'active':''}`} onClick={()=>setFilter('all')}>Todas <span>{demands.length}</span></button>
      <button className={`chip ${filter==='waiting_info'?'active':''}`} onClick={()=>setFilter('waiting_info')}>Faltam dados</button>
      <button className={`chip ${filter==='contact'?'active':''}`} onClick={()=>setFilter('contact')}>Em contato</button>
      <button className={`chip ${filter==='scheduled'?'active':''}`} onClick={()=>setFilter('scheduled')}>Agendadas</button>
    </div>
    {loading && demands.length===0 && <div className="empty-state"><strong>Carregando demandas...</strong></div>}
    {error && <div className="data-error">{error}</div>}
    {!loading && shown.length===0 && <div className="empty-state"><img className="empty-brand-mark" src="/brand-mark.svg" alt=""/><strong>Nenhuma demanda aqui ainda.</strong><p>Use “Nova demanda” para registrar a primeira informação recebida, mesmo incompleta.</p></div>}
    <section className="demand-list">
      {shown.map(d=><article className="demand-card" key={d.id} onDoubleClick={()=>setSelectedId(d.id)}>
        <div className="demand-main"><div className="demand-title"><h3>{d.client}</h3><span className={`status ${d.status}`}>{statusLabel[d.status]}</span></div><div className="demand-meta"><span>{d.company}{d.product ? ` • ${d.product}`:''}</span>{d.quantity != null && <span>{d.quantity} colares</span>}{d.regional && <span>Regional: {d.regional}</span>}</div>{(!d.city || !d.state) && <div className="inline-warning"><AlertIcon/> Cidade/UF ainda não informada</div>}{d.city && d.state && <div className="demand-location">{d.city}/{d.state}</div>}</div>
        <div className="next-step"><span>Próximo passo</span><strong>{d.nextStep}</strong></div>
        <button className="icon-button subtle" aria-label={`Abrir ${d.client}`} onClick={()=>setSelectedId(d.id)}><ArrowIcon/></button>
      </article>)}
    </section>
    <DemandDetailModal demand={selected} onClose={()=>setSelectedId(null)}/>
  </>
}
