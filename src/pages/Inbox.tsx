import { useEffect, useMemo, useState } from 'react'
import { AlertIcon, ArrowIcon, ArchiveIcon, CheckIcon, SearchIcon } from '../components/Icons'
import { DemandDetailModal } from '../components/DemandDetailModal'
import { CompanyFilter } from '../components/CompanyFilter'
import { useRoutine } from '../context/RoutineContext'
import { tripDisplayTitle } from '../lib/tripTitle'
import { formatCompanyName, formatDateShort, formatEquipmentSummary } from '../lib/format'
import { companyClass, companyKey, type CompanyFilter as CompanyFilterValue } from '../lib/company'
import { isFlightReady, isHotelReady, isVehicleReady } from '../lib/tripReadiness'
import type { Demand, DemandPriority, DemandStatus, Trip } from '../types/routine'

type StatusFilter = 'all' | DemandStatus
type WorkspaceTab = 'open' | 'ready' | 'completed'
type SortOption = 'newest' | 'oldest' | 'az' | 'za' | 'next_trip'

const priorityRank: Record<DemandPriority, number> = { 5: 0, 4: 1, 3: 2, 2: 3, 1: 4 }

const STATUS_FILTER_KEY = 'routine-assist-inbox-filter'
const SELECTED_KEY = 'routine-assist-inbox-selected-demand'
const COMPANY_FILTER_KEY = 'routine-assist-inbox-company-filter'
const TAB_KEY = 'routine-assist-inbox-tab'
const SORT_KEY = 'routine-assist-inbox-sort'
const PAGE_SIZE = 20

type DemandStage = {
  label: string
  cls: string
  next: string
  kind: 'open' | 'ready' | 'completed'
  trip?: Trip
  date?: string
}

function buildStage(d: Demand, appointments: ReturnType<typeof useRoutine>['appointments'], trips: Trip[]): DemandStage {
  const appointment = appointments.find(a => a.demandId === d.id)
  const linkedTrip = appointment ? trips.find(t => t.appointments.some(a => a.id === appointment.id)) : undefined
  const activeTrip = linkedTrip?.status === 'planned' ? linkedTrip : undefined
  const completedTrip = linkedTrip?.status === 'completed' ? linkedTrip : undefined
  const logisticsReady = activeTrip ? isHotelReady(activeTrip) && isVehicleReady(activeTrip) && isFlightReady(activeTrip) : false

  if (d.status === 'cancelled') return { label: 'Cancelada', cls: 'cancelled', next: 'Sem próximo passo', kind: 'completed', trip: linkedTrip, date: linkedTrip?.end }
  if (d.status === 'done' || completedTrip) return { label: 'Concluída', cls: 'completed', next: 'No histórico', kind: 'completed', trip: completedTrip, date: completedTrip?.end || appointment?.end }
  if (activeTrip && logisticsReady) return { label: 'Viagem pronta', cls: 'ready', next: 'Acompanhar viagem', kind: 'ready', trip: activeTrip, date: activeTrip.start }
  if (activeTrip) return { label: 'Logística pendente', cls: 'scheduled', next: 'Organizar logística da viagem', kind: 'open', trip: activeTrip, date: activeTrip.start }
  if (appointment?.type === 'Remoto') return { label: 'Remoto agendado', cls: 'scheduled', next: 'Acompanhar atendimento remoto', kind: 'open', date: appointment.start }
  if (appointment) return { label: 'Agendada', cls: 'scheduled', next: 'Organizar viagem', kind: 'open', date: appointment.start }
  if (d.city && d.state) return { label: 'Pronta para agendar', cls: 'contact', next: 'Combinar data com o cliente', kind: 'open' }
  return { label: 'Faltam dados', cls: 'waiting_info', next: 'Completar cidade e UF', kind: 'open' }
}

function normalize(value?: string) {
  return (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')
}

export function Inbox() {
  const { demands, appointments, trips, loading, error } = useRoutine()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() => (window.localStorage.getItem(STATUS_FILTER_KEY) as StatusFilter) || 'all')
  const [tab, setTab] = useState<WorkspaceTab>(() => (window.localStorage.getItem(TAB_KEY) as WorkspaceTab) || 'open')
  const [sort, setSort] = useState<SortOption>(() => (window.localStorage.getItem(SORT_KEY) as SortOption) || 'newest')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(() => window.localStorage.getItem('routine-assist-focus-demand') || window.localStorage.getItem(SELECTED_KEY))
  const [companyFilter, setCompanyFilter] = useState<CompanyFilterValue>(() => (window.localStorage.getItem(COMPANY_FILTER_KEY) as CompanyFilterValue) || 'all')
  const selected = useMemo<Demand | null>(() => selectedId ? demands.find(d => d.id === selectedId) || null : null, [selectedId, demands])

  const enriched = useMemo(() => demands.map(d => ({ demand: d, stage: buildStage(d, appointments, trips) })), [demands, appointments, trips])

  const baseFiltered = useMemo(() => {
    const q = normalize(search.trim())
    return enriched.filter(({ demand }) => {
      if (companyFilter !== 'all' && companyKey(demand.company) !== companyFilter) return false
      if (!q) return true
      return [demand.client, demand.farmName, demand.city, demand.state, demand.regional, demand.raw]
        .some(value => normalize(value).includes(q))
    })
  }, [enriched, companyFilter, search])

  const counts = useMemo(() => ({
    open: baseFiltered.filter(item => item.stage.kind === 'open').length,
    ready: baseFiltered.filter(item => item.stage.kind === 'ready').length,
    completed: baseFiltered.filter(item => item.stage.kind === 'completed').length,
  }), [baseFiltered])

  const shown = useMemo(() => {
    let rows = baseFiltered.filter(item => item.stage.kind === tab)
    if (tab === 'open' && statusFilter !== 'all') {
      rows = rows.filter(({ demand, stage }) => {
        if (statusFilter === 'waiting_info') return stage.cls === 'waiting_info'
        if (statusFilter === 'contact') return stage.cls === 'contact'
        if (statusFilter === 'scheduled') return ['scheduled'].includes(stage.cls)
        return demand.status === statusFilter
      })
    }

    rows = [...rows].sort((a, b) => {
      const priorityDifference = priorityRank[a.demand.priority] - priorityRank[b.demand.priority]
      if (priorityDifference !== 0) return priorityDifference
      if (sort === 'az') return a.demand.client.localeCompare(b.demand.client, 'pt-BR')
      if (sort === 'za') return b.demand.client.localeCompare(a.demand.client, 'pt-BR')
      if (sort === 'oldest') return (a.demand.createdAt || '').localeCompare(b.demand.createdAt || '')
      if (sort === 'next_trip') {
        const ad = a.stage.date || '9999-12-31'
        const bd = b.stage.date || '9999-12-31'
        return ad.localeCompare(bd) || a.demand.client.localeCompare(b.demand.client, 'pt-BR')
      }
      return (b.demand.createdAt || '').localeCompare(a.demand.createdAt || '')
    })
    return rows
  }, [baseFiltered, tab, statusFilter, sort])

  const pageCount = Math.max(1, Math.ceil(shown.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const paged = shown.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const firstIndex = shown.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0
  const lastIndex = Math.min(currentPage * PAGE_SIZE, shown.length)

  useEffect(() => { setPage(1) }, [tab, statusFilter, companyFilter, sort, search])
  useEffect(() => { if (page > pageCount) setPage(pageCount) }, [page, pageCount])
  useEffect(() => { try { window.localStorage.setItem(STATUS_FILTER_KEY, statusFilter); window.localStorage.removeItem('routine-assist-focus-demand') } catch { /* noop */ } }, [statusFilter])
  useEffect(() => { try { window.localStorage.setItem(COMPANY_FILTER_KEY, companyFilter) } catch { /* noop */ } }, [companyFilter])
  useEffect(() => { try { window.localStorage.setItem(TAB_KEY, tab) } catch { /* noop */ } }, [tab])
  useEffect(() => { try { window.localStorage.setItem(SORT_KEY, sort) } catch { /* noop */ } }, [sort])
  useEffect(() => {
    try {
      if (selectedId) window.localStorage.setItem(SELECTED_KEY, selectedId)
      else window.localStorage.removeItem(SELECTED_KEY)
    } catch { /* noop */ }
  }, [selectedId])

  return <>
    <section className="page-heading inbox-heading">
      <div><span className="eyebrow">Caixa de entrada</span><h1>Demandas</h1><p>Use esta tela como sua fila de trabalho. O que já está pronto sai da frente sem desaparecer do Routine.</p></div>
    </section>

    <section className="inbox-workspace-tabs" aria-label="Etapas das demandas">
      <button className={tab === 'open' ? 'active' : ''} onClick={() => setTab('open')}><AlertIcon/><span><strong>Em aberto</strong><small>Precisam de alguma ação</small></span><b>{counts.open}</b></button>
      <button className={tab === 'ready' ? 'active ready' : ''} onClick={() => setTab('ready')}><CheckIcon/><span><strong>Prontas</strong><small>Logística organizada</small></span><b>{counts.ready}</b></button>
      <button className={tab === 'completed' ? 'active completed' : ''} onClick={() => setTab('completed')}><ArchiveIcon/><span><strong>Concluídas</strong><small>Histórico das demandas</small></span><b>{counts.completed}</b></button>
    </section>

    <section className="demand-toolbar panel">
      <div className="demand-search-field"><SearchIcon/><input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente, fazenda, cidade ou responsável comercial..." aria-label="Buscar demandas"/>{search && <button type="button" onClick={() => setSearch('')} aria-label="Limpar busca">×</button>}</div>
      <div className="demand-toolbar-row"><CompanyFilter value={companyFilter} onChange={setCompanyFilter}/><label className="sort-control"><span>Ordenar</span><select value={sort} onChange={e => setSort(e.target.value as SortOption)}><option value="newest">Mais recentes</option><option value="oldest">Mais antigas</option><option value="az">A → Z</option><option value="za">Z → A</option><option value="next_trip">Próxima data</option></select></label></div>
      {tab === 'open' && <div className="filters status-filters compact-status-filters"><button className={`chip ${statusFilter === 'all' ? 'active' : ''}`} onClick={() => setStatusFilter('all')}>Todos em aberto</button><button className={`chip ${statusFilter === 'waiting_info' ? 'active' : ''}`} onClick={() => setStatusFilter('waiting_info')}>Faltam dados</button><button className={`chip ${statusFilter === 'contact' ? 'active' : ''}`} onClick={() => setStatusFilter('contact')}>Prontas para agendar</button><button className={`chip ${statusFilter === 'scheduled' ? 'active' : ''}`} onClick={() => setStatusFilter('scheduled')}>Agendadas / logística</button></div>}
    </section>

    {loading && demands.length === 0 && <div className="empty-state"><strong>Carregando demandas...</strong></div>}
    {error && <div className="data-error">{error}</div>}
    {!loading && shown.length === 0 && <div className="empty-state"><img className="empty-brand-mark" src="/brand-mark.svg" alt=""/><strong>{search ? 'Nenhuma demanda encontrada.' : tab === 'ready' ? 'Nenhuma viagem pronta ainda.' : tab === 'completed' ? 'Seu histórico ainda está vazio.' : 'Nenhuma demanda em aberto.'}</strong><p>{search ? 'Tente outro nome, fazenda, cidade ou responsável comercial.' : tab === 'completed' ? 'Quando uma viagem for concluída, as demandas vinculadas aparecerão aqui.' : 'Use “Nova demanda” para registrar uma nova solicitação.'}</p></div>}

    <section className="demand-list">
      {paged.map(({ demand: d, stage }) => <article className={`demand-card ${companyClass(companyKey(d.company))} demand-stage-${stage.kind}`} key={d.id} onDoubleClick={() => setSelectedId(d.id)}>
        <div className="demand-main"><div className="demand-title"><h3>{d.client}</h3><span className="priority-badge" title={`Prioridade ${d.priority} de 5`} aria-label={`Prioridade ${d.priority} de 5`}>{Array.from({ length: 5 }, (_, index) => <span key={index} className={index < d.priority ? 'filled' : ''}>★</span>)}</span><span className={`status ${stage.cls}`}>{stage.kind === 'ready' && <CheckIcon/>}{stage.label}</span></div><div className="demand-meta"><span>{formatCompanyName(d.company)}{d.product ? ` • ${d.product}` : ''}</span><span>{formatEquipmentSummary(d)}</span>{d.regional && <span>Responsável comercial: {d.regional}</span>}<span>Entrada: {d.createdAt ? formatDateShort(d.createdAt) : '—'}</span>{stage.date && <span>{stage.trip ? 'Visita/viagem' : 'Atendimento'}: {formatDateShort(stage.date)}</span>}{stage.date && !stage.trip && <span className="appointment-type-badge">{appointments.find(a => a.demandId === d.id)?.type || 'Agenda'}</span>}</div>{(!d.city || !d.state) && stage.kind === 'open' && <div className="inline-warning"><AlertIcon/> Cidade/UF ainda não informada</div>}{d.city && d.state && <div className="demand-location">{d.farmName ? `${d.farmName} • ` : ''}{d.city}/{d.state}</div>}{stage.trip && <div className="demand-trip-reference"><span>{stage.kind === 'completed' ? 'Viagem concluída' : 'Viagem'}</span><strong>{tripDisplayTitle(stage.trip)}</strong></div>}</div>
        <div className="next-step"><span>{stage.kind === 'completed' ? 'Histórico' : 'Próximo passo'}</span><strong>{stage.next}</strong></div>
        <button className="icon-button subtle" aria-label={`Abrir ${d.client}`} onClick={() => setSelectedId(d.id)}><ArrowIcon/></button>
      </article>)}
    </section>

    {shown.length > 0 && <nav className="demand-pagination" aria-label="Paginação de demandas"><div><strong>{firstIndex}–{lastIndex}</strong><span> de {shown.length} demanda{shown.length === 1 ? '' : 's'}</span></div><div className="pagination-actions"><button disabled={currentPage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>‹ Anterior</button><span className="page-numbers">{Array.from({ length: pageCount }, (_, i) => i + 1).filter(n => n === 1 || n === pageCount || Math.abs(n - currentPage) <= 1).map((n, index, arr) => <span key={n}>{index > 0 && n - arr[index - 1] > 1 && <i>…</i>}<button className={n === currentPage ? 'active' : ''} onClick={() => setPage(n)}>{n}</button></span>)}</span><button disabled={currentPage >= pageCount} onClick={() => setPage(p => Math.min(pageCount, p + 1))}>Próxima ›</button></div></nav>}

    <DemandDetailModal demand={selected} onClose={() => setSelectedId(null)}/>
  </>
}
