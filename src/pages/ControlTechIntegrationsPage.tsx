import { useMemo, useState } from 'react'
import { AlertIcon, CheckIcon, ClockIcon, CopyIcon, SendIcon, ToolIcon } from '../components/Icons'
import { ConfirmActionModal } from '../components/ConfirmActionModal'
import { useRoutine } from '../context/RoutineContext'
import { formatCompanyName } from '../lib/format'
import type { ControlTechIntegrationRequest, IntegrationRequestStatus } from '../types/routine'

type StatusFilter = 'all' | IntegrationRequestStatus

const statusMeta: Record<IntegrationRequestStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'pending' },
  processing: { label: 'Processing', className: 'processing' },
  completed: { label: 'Completed', className: 'completed' },
  failed: { label: 'Failed', className: 'failed' },
  cancelled: { label: 'Cancelled', className: 'cancelled' },
}

const filters: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
]

function formatDateTime(value?: string) {
  if (!value) return 'Não informado'
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function expectedDate(request: ControlTechIntegrationRequest) {
  return request.payload.expectedDate || request.payload.appointmentStart || ''
}

function requestUser(request: ControlTechIntegrationRequest) {
  return request.requestedByName || `Usuário ${request.requestedBy.slice(0, 8)}`
}

function StatusBadge({ status }: { status: IntegrationRequestStatus }) {
  const meta = statusMeta[status]
  return <span className={`integration-status ${meta.className}`}><i/>{meta.label}</span>
}

export function ControlTechIntegrationsPage() {
  const {
    controlTechIntegrationRequests,
    loading,
    error,
    refresh,
    cancelControlTechIntegrationRequest,
    processControlTechIntegrationRequest,
    retryControlTechIntegrationRequest,
  } = useRoutine()
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [selected, setSelected] = useState<ControlTechIntegrationRequest | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [actionBusy, setActionBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [showError, setShowError] = useState(false)
  const [copied, setCopied] = useState(false)

  const summary = useMemo(() => ({
    total: controlTechIntegrationRequests.length,
    pending: controlTechIntegrationRequests.filter(request => request.status === 'pending').length,
    processing: controlTechIntegrationRequests.filter(request => request.status === 'processing').length,
    completed: controlTechIntegrationRequests.filter(request => request.status === 'completed').length,
    failed: controlTechIntegrationRequests.filter(request => request.status === 'failed').length,
  }), [controlTechIntegrationRequests])

  const filtered = useMemo(() => filter === 'all'
    ? controlTechIntegrationRequests
    : controlTechIntegrationRequests.filter(request => request.status === filter),
  [controlTechIntegrationRequests, filter])

  const closeDetail = () => {
    if (actionBusy) return
    setSelected(null)
    setActionError(null)
    setActionSuccess(null)
    setShowError(false)
    setCopied(false)
  }

  const cancelSelected = async () => {
    if (!selected || actionBusy) return
    setActionBusy(true); setActionError(null); setActionSuccess(null)
    try {
      const updated = await cancelControlTechIntegrationRequest(selected.id)
      setSelected(updated)
      setCancelOpen(false)
    } catch (e:any) {
      setActionError(e?.message || 'Não foi possível cancelar a solicitação.')
    } finally { setActionBusy(false) }
  }

  const processSelected = async () => {
    if (!selected || actionBusy) return
    setActionBusy(true); setActionError(null); setActionSuccess(null)
    try {
      const updated = await processControlTechIntegrationRequest(selected.id)
      setSelected(updated)
      setActionSuccess('Solicitação processada e fazenda criada no Control Tech.')
    } catch (e:any) {
      setActionError(e?.message || 'Não foi possível processar a solicitação.')
    } finally { setActionBusy(false) }
  }

  const retrySelected = async () => {
    if (!selected || actionBusy) return
    setActionBusy(true); setActionError(null); setActionSuccess(null)
    try {
      const updated = await retryControlTechIntegrationRequest(selected.id)
      setSelected(updated)
      setShowError(false)
    } catch (e:any) {
      setActionError(e?.message || 'Não foi possível tentar novamente.')
    } finally { setActionBusy(false) }
  }

  const copyExternalReference = async () => {
    if (!selected?.externalReference) return
    if (/^https?:\/\//i.test(selected.externalReference)) {
      window.open(selected.externalReference, '_blank', 'noopener,noreferrer')
      return
    }
    await navigator.clipboard.writeText(selected.externalReference)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return <div className="control-tech-page">
    <section className="page-heading horizontal control-tech-heading">
      <div>
        <span className="eyebrow">Integração operacional</span>
        <h1>Control Tech</h1>
        <p>Acompanhe as solicitações de instalação criadas no Routine Assist antes do envio automático.</p>
      </div>
      <button className="secondary" onClick={() => void refresh()}><ClockIcon/> Atualizar fila</button>
    </section>

    <section className="integration-metrics">
      <article className="metric-card"><div className="metric-icon neutral"><ToolIcon/></div><div><strong>{summary.total}</strong><span>Total de solicitações</span></div></article>
      <article className="metric-card"><div className="metric-icon amber"><ClockIcon/></div><div><strong>{summary.pending}</strong><span>Pendentes</span></div></article>
      <article className="metric-card"><div className="metric-icon plum"><SendIcon/></div><div><strong>{summary.processing}</strong><span>Processando</span></div></article>
      <article className="metric-card"><div className="metric-icon neutral"><CheckIcon/></div><div><strong>{summary.completed}</strong><span>Concluídas</span></div></article>
      <article className="metric-card"><div className="metric-icon danger"><AlertIcon/></div><div><strong>{summary.failed}</strong><span>Falhas</span></div></article>
    </section>

    <section className="panel integration-panel">
      <div className="integration-panel-head">
        <div><span className="eyebrow">Fila de integração</span><h2>Solicitações enviadas ao Control Tech</h2></div>
        <div className="integration-filter">{filters.map(item => <button type="button" key={item.value} className={filter === item.value ? 'active' : ''} onClick={() => setFilter(item.value)}>{item.label}</button>)}</div>
      </div>

      {error && <div className="data-error">{error}</div>}
      {loading && !controlTechIntegrationRequests.length && <div className="empty-inline">Carregando solicitações...</div>}
      {!loading && !filtered.length ? <div className="empty-state large integration-empty"><span className="section-icon neutral"><ToolIcon/></span><strong>Nenhuma solicitação encontrada.</strong><p>As demandas enviadas pelo botão Solicitar instalação no Control Tech aparecerão aqui.</p></div> : <div className="integration-table">
        <div className="integration-table-head"><span>Cliente</span><span>Fazenda</span><span>Local</span><span>Central</span><span>Solicitação</span><span>Usuário</span><span>Status</span></div>
        {filtered.map(request => <article className="integration-row" key={request.id} role="button" tabIndex={0} onClick={() => { setSelected(request); setActionError(null); setActionSuccess(null); setShowError(false); setCopied(false) }} onKeyDown={event => { if (event.key === 'Enter') setSelected(request) }}>
          <div><small>Cliente</small><strong>{request.payload.client}</strong></div>
          <div><small>Fazenda</small><span>{request.payload.farmName}</span></div>
          <div><small>Cidade/UF</small><span>{request.payload.city}/{request.payload.state}</span></div>
          <div><small>Central</small><span>{formatCompanyName(request.payload.company)}</span></div>
          <div><small>Solicitação</small><span>{formatDateTime(request.createdAt)}</span></div>
          <div><small>Usuário</small><span>{requestUser(request)}</span></div>
          <div><small>Status</small><StatusBadge status={request.status}/></div>
        </article>)}
      </div>}
    </section>

    {selected && <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && closeDetail()}>
      <section className="modal-card integration-detail-modal">
        <div className="modal-head">
          <div><span className="eyebrow">Solicitação Control Tech</span><h2>{selected.payload.farmName}</h2><p className="modal-head-copy">{selected.payload.client} • {selected.payload.city}/{selected.payload.state}</p></div>
          <button className="close" onClick={closeDetail}>×</button>
        </div>

        <div className="integration-detail-status">
          <StatusBadge status={selected.status}/>
          <span>Atualizada em {formatDateTime(selected.updatedAt)}</span>
        </div>

        <section className="integration-detail-section">
          <div className="integration-section-title"><ToolIcon/><div><span className="eyebrow">Dados enviados</span><h3>Resumo da demanda</h3></div></div>
          <div className="integration-detail-grid">
            <div><span>Cliente</span><strong>{selected.payload.client}</strong></div>
            <div><span>Fazenda</span><strong>{selected.payload.farmName}</strong></div>
            <div><span>Cidade</span><strong>{selected.payload.city}</strong></div>
            <div><span>UF</span><strong>{selected.payload.state}</strong></div>
            <div><span>Central</span><strong>{formatCompanyName(selected.payload.company)}</strong></div>
            <div><span>Responsável comercial</span><strong>{selected.payload.commercialResponsible || 'Não informado'}</strong></div>
            <div><span>Colares</span><strong>{selected.payload.quantityCollars.toLocaleString('pt-BR')}</strong></div>
            <div><span>Antenas adicionais</span><strong>{selected.payload.extraAntennaCount ?? 'Não informado'}</strong></div>
            <div><span>Data prevista</span><strong>{expectedDate(selected) ? formatDateTime(expectedDate(selected)) : 'Não informada'}</strong></div>
            <div className="wide"><span>Observações</span><strong>{selected.payload.observations || 'Sem observações'}</strong></div>
          </div>
        </section>

        <section className="integration-detail-section">
          <div className="integration-section-title"><ClockIcon/><div><span className="eyebrow">Histórico</span><h3>Controle da solicitação</h3></div></div>
          <div className="integration-history-grid">
            <div><span>Criado em</span><strong>{formatDateTime(selected.createdAt)}</strong></div>
            <div><span>Status atual</span><strong>{statusMeta[selected.status].label}</strong></div>
            <div><span>Última atualização</span><strong>{formatDateTime(selected.updatedAt)}</strong></div>
            <div><span>Solicitado por</span><strong>{requestUser(selected)}</strong></div>
            <div><span>Tentativas futuras</span><strong>{selected.attempts}</strong></div>
            <div><span>Processado em</span><strong>{formatDateTime(selected.processedAt)}</strong></div>
            <div><span>Referência externa</span><strong>{selected.externalReference || 'Ainda não gerada'}</strong></div>
          </div>
          {(showError || selected.status === 'failed') && <div className="integration-error-box"><AlertIcon/><div><strong>Erro registrado</strong><span>{selected.lastError || 'Nenhum detalhe de erro foi registrado.'}</span></div></div>}
        </section>

        {actionError && <div className="auth-message error modal-error">{actionError}</div>}
        {actionSuccess && <div className="auth-message success modal-error">{actionSuccess}</div>}
        <div className="modal-actions integration-detail-actions">
          <button className="ghost" disabled={actionBusy} onClick={closeDetail}>Fechar</button>
          {selected.status === 'pending' && <button className="primary" disabled={actionBusy} onClick={() => void processSelected()}><SendIcon/> {actionBusy ? 'Processando...' : 'Processar agora'}</button>}
          {selected.status === 'pending' && <button className="danger-outline" disabled={actionBusy} onClick={() => setCancelOpen(true)}>Cancelar solicitação</button>}
          {selected.status === 'failed' && <button className="secondary" disabled={actionBusy} onClick={() => setShowError(value => !value)}><AlertIcon/> Ver erro</button>}
          {selected.status === 'failed' && <button className="primary" disabled={actionBusy} onClick={() => void retrySelected()}><SendIcon/> {actionBusy ? 'Atualizando...' : 'Tentar novamente'}</button>}
          {selected.status === 'completed' && selected.externalReference && <button className="secondary" onClick={() => void copyExternalReference()}><CopyIcon/> {copied ? 'Referência copiada' : 'Ver referência externa'}</button>}
        </div>
      </section>
    </div>}

    <ConfirmActionModal
      open={cancelOpen}
      title="Cancelar solicitação?"
      description={selected ? `${selected.payload.farmName} será marcada como Cancelled e não deverá ser consumida pelo envio automático futuro.` : ''}
      confirmLabel="Cancelar solicitação"
      busy={actionBusy}
      error={actionError}
      onCancel={() => !actionBusy && setCancelOpen(false)}
      onConfirm={() => void cancelSelected()}
    />
  </div>
}
