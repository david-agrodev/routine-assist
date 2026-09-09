import { useMemo, useState } from 'react'
import { ArchiveIcon, CalendarIcon, FilterIcon, ListIcon, LocationIcon, PrintIcon, RouteIcon } from '../components/Icons'
import { useRoutine } from '../context/RoutineContext'
import { formatCompanyName } from '../lib/format'
import { companyKey, type CompanyFilter as CompanyFilterValue } from '../lib/company'
import { tripDisplayTitle } from '../lib/tripTitle'
import type { Appointment, Demand, Trip } from '../types/routine'

type DemandScope = 'all' | 'unplanned' | 'scheduled' | 'completed'

type ReportTrip = Trip & { reportDemands: Demand[] }

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function firstOfMonth() {
  const date = new Date()
  return isoDate(new Date(date.getFullYear(), date.getMonth(), 1))
}

function lastOfMonth() {
  const date = new Date()
  return isoDate(new Date(date.getFullYear(), date.getMonth() + 1, 0))
}

function displayDate(value?: string) {
  if (!value) return 'Data não informada'
  const [year, month, day] = value.slice(0, 10).split('-')
  return year && month && day ? `${day}/${month}/${year}` : value
}

function dateOnly(value?: string) {
  return value?.slice(0, 10) || ''
}

function inPeriod(value: string, from: string, to: string) {
  return Boolean(value) && value >= from && value <= to
}

function demandQuantity(demand?: Demand) {
  return demand?.quantity || 0
}

function demandForAppointment(appointment: Appointment, demandsById: Map<string, Demand>) {
  return appointment.demandId ? demandsById.get(appointment.demandId) : undefined
}

function matchesCompany(demand: Demand | undefined, filter: CompanyFilterValue) {
  return filter === 'all' || (demand && companyKey(demand.company) === filter)
}

function sumQuantities(demands: Demand[]) {
  return demands.reduce((total, demand) => total + demandQuantity(demand), 0)
}

export function ReportsPage() {
  const { demands, appointments, trips, loading, error } = useRoutine()
  const [from, setFrom] = useState(firstOfMonth)
  const [to, setTo] = useState(lastOfMonth)
  const [company, setCompany] = useState<CompanyFilterValue>('all')
  const [scope, setScope] = useState<DemandScope>('all')
  const [reportTitle, setReportTitle] = useState('Relatório operacional')

  const report = useMemo(() => {
    const demandsById = new Map(demands.map(demand => [demand.id, demand]))
    const scheduledDemandIds = new Set(appointments.map(appointment => appointment.demandId).filter(Boolean))
    const unplannedDemands = demands.filter(demand => {
      if (scheduledDemandIds.has(demand.id) || !inPeriod(dateOnly(demand.createdAt), from, to)) return false
      if (!matchesCompany(demand, company)) return false
      return scope === 'all' || scope === 'unplanned' || (scope === 'completed' && demand.status === 'done')
    })

    const reportAppointments = appointments.filter(appointment => {
      const demand = demandForAppointment(appointment, demandsById)
      return inPeriod(dateOnly(appointment.start), from, to) && matchesCompany(demand, company)
    })

    const reportTrips: ReportTrip[] = trips.filter(trip => {
      if (dateOnly(trip.end) < from || dateOnly(trip.start) > to) return false
      const tripDemands = trip.appointments.map(appointment => demandsById.get(appointment.demandId || '')).filter(Boolean) as Demand[]
      return company === 'all' || tripDemands.some(demand => matchesCompany(demand, company))
    }).map(trip => ({
      ...trip,
      reportDemands: trip.appointments.map(appointment => demandsById.get(appointment.demandId || '')).filter(Boolean) as Demand[],
    }))

    const filteredAppointments = scope === 'completed'
      ? reportAppointments.filter(appointment => appointment.demandId && demandsById.get(appointment.demandId)?.status === 'done')
      : scope === 'unplanned'
        ? []
        : reportAppointments

    const filteredTrips = scope === 'unplanned'
      ? []
      : scope === 'completed'
        ? reportTrips.filter(trip => trip.status === 'completed')
        : reportTrips

    const filteredUnplanned = scope === 'scheduled' || scope === 'completed' ? [] : unplannedDemands
    const appointmentDemands = filteredAppointments.map(appointment => demandForAppointment(appointment, demandsById)).filter(Boolean) as Demand[]
    const tripDemands = filteredTrips.flatMap(trip => trip.reportDemands)
    const uniqueDemands = new Map([...filteredUnplanned, ...appointmentDemands, ...tripDemands].map(demand => [demand.id, demand]))

    return {
      demands: filteredUnplanned,
      appointments: filteredAppointments,
      trips: filteredTrips,
      demandCollars: sumQuantities(filteredUnplanned),
      appointmentCollars: sumQuantities(appointmentDemands),
      tripCollars: sumQuantities(tripDemands),
      uniqueDemandCollars: sumQuantities([...uniqueDemands.values()]),
      demandsById,
    }
  }, [appointments, company, demands, from, scope, to, trips])

  const generatedAt = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  const totalCollars = report.uniqueDemandCollars

  return <div className="report-page">
    <section className="page-heading report-heading no-print">
      <div><span className="eyebrow">Gestão e prestação de contas</span><h1>Relatórios</h1><p>Monte um resumo das demandas, visitas e viagens para compartilhar com sua liderança.</p></div>
      <button className="primary" onClick={() => window.print()}><PrintIcon/> Imprimir / salvar PDF</button>
    </section>

    <section className="panel report-filters no-print">
      <div className="report-filter-head"><div><span className="eyebrow">Personalizar relatório</span><h2>Escolha o recorte</h2></div><FilterIcon/></div>
      <div className="report-filter-grid">
        <label className="field"><span>Nome do relatório</span><input value={reportTitle} onChange={event => setReportTitle(event.target.value)} placeholder="Ex.: Visitas comerciais de setembro"/></label>
        <label className="field"><span>Data inicial</span><input type="date" value={from} onChange={event => setFrom(event.target.value)}/></label>
        <label className="field"><span>Data final</span><input type="date" value={to} onChange={event => setTo(event.target.value)}/></label>
        <label className="field"><span>Central</span><select value={company} onChange={event => setCompany(event.target.value as CompanyFilterValue)}><option value="all">Todas as centrais</option><option value="alta">Alta</option><option value="genex">GENEX</option></select></label>
        <label className="field"><span>Mostrar</span><select value={scope} onChange={event => setScope(event.target.value as DemandScope)}><option value="all">Demandas e logística</option><option value="unplanned">Somente demandas sem agendamento</option><option value="scheduled">Somente visitas e viagens</option><option value="completed">Somente concluídas</option></select></label>
      </div>
    </section>

    <section className="report-document" aria-label="Relatório">
      <header className="report-document-head">
        <div className="report-brand"><img src="/routine-assist-logo.png" alt="Routine Assist"/><span>Gestão de rotina comercial</span></div>
        <div className="report-document-meta"><span>Período</span><strong>{displayDate(from)} a {displayDate(to)}</strong><small>Gerado em {generatedAt}</small></div>
      </header>
      <div className="report-document-title"><span className="eyebrow">Relatório personalizado</span><h2>{reportTitle || 'Relatório operacional'}</h2><p>{company === 'all' ? 'Todas as centrais' : company === 'alta' ? 'Central Alta' : 'Central GENEX'}</p></div>

      {error && <div className="data-error">{error}</div>}
      {loading && demands.length === 0 && <div className="empty-inline">Carregando dados do relatório...</div>}

      <div className="report-metrics">
        <article><span className="report-metric-icon terracotta"><ListIcon/></span><div><strong>{report.demands.length}</strong><small>Demandas sem agendamento</small></div></article>
        <article><span className="report-metric-icon plum"><CalendarIcon/></span><div><strong>{report.appointments.length}</strong><small>Visitas no período</small></div></article>
        <article><span className="report-metric-icon neutral"><RouteIcon/></span><div><strong>{report.trips.length}</strong><small>Viagens programadas</small></div></article>
        <article><span className="report-metric-icon amber"><ArchiveIcon/></span><div><strong>{totalCollars.toLocaleString('pt-BR')}</strong><small>Colares no recorte</small></div></article>
      </div>

      <ReportSection title="Demandas sem agendamento" icon={<ListIcon/>} count={report.demands.length} quantity={report.demandCollars} empty="Nenhuma demanda sem agendamento neste recorte.">
        <div className="report-table report-demand-table"><div className="report-table-head"><span>Cliente / fazenda</span><span>Central</span><span>Responsável comercial</span><span>Colares</span><span>Entrada</span></div>{report.demands.map(demand => <div className="report-table-row" key={demand.id}><div><strong>{demand.client}</strong><small>{demand.farmName || 'Fazenda não informada'}{demand.city && demand.state ? ` • ${demand.city}/${demand.state}` : ''}</small></div><span>{formatCompanyName(demand.company)}</span><span>{demand.regional || 'Não informado'}</span><strong>{demandQuantity(demand).toLocaleString('pt-BR')}</strong><span>{displayDate(dateOnly(demand.createdAt))}</span></div>)}</div>
      </ReportSection>

      <ReportSection title="Visitas e atendimentos" icon={<CalendarIcon/>} count={report.appointments.length} quantity={report.appointmentCollars} empty="Nenhuma visita agendada neste recorte.">
        <div className="report-table"><div className="report-table-head"><span>Cliente / fazenda</span><span>Local</span><span>Tipo</span><span>Colares</span><span>Data</span></div>{report.appointments.map(appointment => { const demand = demandForAppointment(appointment, report.demandsById); return <div className="report-table-row" key={appointment.id}><div><strong>{appointment.farmName || appointment.client}</strong><small>{appointment.farmName ? appointment.client : 'Atendimento'}</small></div><span><LocationIcon/> {[appointment.city, appointment.state].filter(Boolean).join('/') || 'Não informado'}</span><span>{appointment.type}</span><strong>{demandQuantity(demand).toLocaleString('pt-BR')}</strong><span>{displayDate(dateOnly(appointment.start))}</span></div> })}</div>
      </ReportSection>

      <ReportSection title="Viagens programadas" icon={<RouteIcon/>} count={report.trips.length} quantity={report.tripCollars} empty="Nenhuma viagem no período selecionado.">
        <div className="report-table report-trip-table"><div className="report-table-head"><span>Viagem</span><span>Período</span><span>Paradas</span><span>Colares</span><span>Status</span></div>{report.trips.map(trip => <div className="report-table-row" key={trip.id}><div><strong>{tripDisplayTitle(trip)}</strong><small>{trip.origin ? `Saída: ${trip.origin}` : 'Ponto de partida não informado'}</small></div><span>{displayDate(dateOnly(trip.start))} a {displayDate(dateOnly(trip.end))}</span><span>{trip.appointments.length} {trip.appointments.length === 1 ? 'visita' : 'visitas'}</span><strong>{sumQuantities(trip.reportDemands).toLocaleString('pt-BR')}</strong><span className={trip.status === 'completed' ? 'report-status done' : 'report-status'}>{trip.status === 'completed' ? 'Concluída' : 'Programada'}</span></div>)}</div>
      </ReportSection>

      <footer className="report-document-foot"><span>Routine Assist • relatório gerado a partir dos dados selecionados</span><strong>Total geral: {totalCollars.toLocaleString('pt-BR')} colares</strong></footer>
    </section>
  </div>
}

function ReportSection({ title, icon, count, quantity, empty, children }: { title: string; icon: React.ReactNode; count: number; quantity: number; empty: string; children: React.ReactNode }) {
  return <section className={`report-section ${count ? '' : 'report-section-empty'}`}><header><div className="report-section-title"><span>{icon}</span><div><span className="eyebrow">Resumo operacional</span><h3>{title}</h3></div></div><div className="report-section-total"><strong>{count}</strong><small>itens • {quantity.toLocaleString('pt-BR')} colares</small></div></header>{count ? children : <div className="report-empty">{empty}</div>}</section>
}
