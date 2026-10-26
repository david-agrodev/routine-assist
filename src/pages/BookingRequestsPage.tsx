import { useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ConfirmActionModal } from '../components/ConfirmActionModal'
import {
  AlertIcon,
  BuildingIcon,
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  CollarIcon,
  CopyIcon,
  FarmIcon,
  LocationIcon,
  PhoneIcon,
  RefreshIcon,
  RequestIcon,
  UserIcon,
} from '../components/Icons'
import { useAuth } from '../context/AuthContext'
import { useRoutine } from '../context/RoutineContext'
import { formatDateRange } from '../lib/format'
import { getOrCreateBookingLink } from '../services/routine'
import type { BookingRequest, BookingRequestStatus } from '../types/routine'

const statusMeta: Record<BookingRequestStatus, { label: string; description: string }> = {
  pending: { label: 'Pendente', description: 'Aguardando sua análise' },
  approved: { label: 'Aprovada', description: 'Demanda e atendimento criados' },
  rejected: { label: 'Reprovada', description: 'Período liberado' },
  cancelled: { label: 'Cancelada', description: 'Solicitação cancelada' },
}

type Filter = 'all' | BookingRequestStatus

export function BookingRequestsPage() {
  const { workspaceId } = useAuth()
  const { bookingRequests, loading, error, refresh, reviewBookingRequest } = useRoutine()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter>('all')
  const [selected, setSelected] = useState<BookingRequest | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [decision, setDecision] = useState<'approved' | 'rejected' | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [publicLink, setPublicLink] = useState('')
  const [linkMessage, setLinkMessage] = useState('')

  useEffect(() => {
    if (!workspaceId) return
    let active = true
    void getOrCreateBookingLink(workspaceId)
      .then(link => {
        if (!active) return
        setPublicLink(`${window.location.origin}/solicitar-agendamento/${link.token}`)
      })
      .catch(() => { if (active) setLinkMessage('Não foi possível carregar o link público.') })
    return () => { active = false }
  }, [workspaceId])

  useEffect(() => {
    const requestId = params.get('request')
    if (!requestId) return
    const request = bookingRequests.find(item => item.id === requestId)
    if (request) setSelected(request)
  }, [params, bookingRequests])

  useEffect(() => {
    if (!selected) return
    const current = bookingRequests.find(item => item.id === selected.id)
    if (current) setSelected(current)
  }, [bookingRequests, selected?.id])

  const counts = useMemo(() => ({
    all: bookingRequests.length,
    pending: bookingRequests.filter(item => item.status === 'pending').length,
    approved: bookingRequests.filter(item => item.status === 'approved').length,
    rejected: bookingRequests.filter(item => item.status === 'rejected').length,
  }), [bookingRequests])
  const visible = filter === 'all' ? bookingRequests : bookingRequests.filter(item => item.status === filter)

  const openRequest = (request: BookingRequest) => {
    setSelected(request)
    setReviewNotes(request.reviewNotes || '')
    setActionError('')
    setParams({ request: request.id })
  }
  const closeRequest = () => {
    setSelected(null)
    setDecision(null)
    setActionError('')
    setParams({})
  }
  const confirmDecision = async () => {
    if (!selected || !decision || busy) return
    setBusy(true)
    setActionError('')
    try {
      await reviewBookingRequest(selected.id, decision, reviewNotes)
      setDecision(null)
    } catch (reviewError: any) {
      setActionError(reviewError?.message || 'Não foi possível analisar a solicitação.')
    } finally {
      setBusy(false)
    }
  }
  const openDemand = (request: BookingRequest) => {
    if (!request.demandId) return
    localStorage.setItem('routine-assist-focus-demand', request.demandId)
    navigate('/entrada')
  }
  const copyPublicLink = async () => {
    if (!publicLink) return
    try {
      await navigator.clipboard.writeText(publicLink)
      setLinkMessage('Link copiado. Agora é só enviar para a pessoa que vai solicitar a data.')
    } catch {
      setLinkMessage('Não foi possível copiar automaticamente. Selecione o endereço exibido abaixo.')
    }
  }

  return <>
    <section className="page-heading booking-page-heading">
      <div><span className="eyebrow">Agenda compartilhada</span><h1>Solicitações</h1><p>Analise pedidos externos antes que eles entrem como demanda e atendimento na sua agenda.</p></div>
      <div className="booking-page-actions"><button className="secondary" disabled={!publicLink} onClick={() => void copyPublicLink()}><CopyIcon/> Copiar link público</button><button className="secondary" disabled={loading} onClick={() => void refresh()}><RefreshIcon/> Atualizar</button></div>
    </section>

    <section className="booking-share-bar">
      <span className="booking-share-icon"><RequestIcon/></span>
      <div><strong>Link para solicitar datas</strong><span>{publicLink || 'Preparando link seguro...'}</span>{linkMessage&&<small>{linkMessage}</small>}</div>
      <button className="primary compact" type="button" disabled={!publicLink} onClick={() => void copyPublicLink()}><CopyIcon/> Copiar</button>
    </section>

    {error && <div className="auth-message error">{error}</div>}

    <section className="booking-metrics">
      <article><span className="booking-metric-icon all"><RequestIcon/></span><div><strong>{counts.all}</strong><small>Total</small></div></article>
      <article><span className="booking-metric-icon pending"><ClockIcon/></span><div><strong>{counts.pending}</strong><small>Pendentes</small></div></article>
      <article><span className="booking-metric-icon approved"><CheckIcon/></span><div><strong>{counts.approved}</strong><small>Aprovadas</small></div></article>
      <article><span className="booking-metric-icon rejected"><AlertIcon/></span><div><strong>{counts.rejected}</strong><small>Reprovadas</small></div></article>
    </section>

    <section className="panel booking-queue-panel">
      <div className="booking-queue-head">
        <div><span className="eyebrow">Fila de análise</span><h2>Pedidos recebidos</h2></div>
        <div className="booking-filters">
          {(['all','pending','approved','rejected'] as Filter[]).map(item => <button type="button" className={filter === item ? 'active' : ''} onClick={() => setFilter(item)} key={item}>{item === 'all' ? 'Todas' : statusMeta[item as BookingRequestStatus].label}</button>)}
        </div>
      </div>

      {visible.length === 0 ? <div className="booking-empty"><RequestIcon/><strong>Nenhuma solicitação encontrada.</strong><span>Os pedidos enviados pelo seu link compartilhável aparecerão aqui.</span></div> : <div className="booking-request-list">
        {visible.map(request => <button type="button" className={`booking-request-row ${request.status}`} key={request.id} onClick={() => openRequest(request)}>
          <span className="booking-request-main"><span className="booking-code">{request.code}</span><strong>{request.farmName}</strong><small>{request.clientName} • {request.central}</small></span>
          <span><small>Período</small><strong>{formatDateRange(request.start, request.end)}</strong></span>
          <span><small>Local</small><strong>{request.city}/{request.state}</strong></span>
          <span><small>Solicitante</small><strong>{request.requesterName}</strong></span>
          <span className={`booking-status ${request.status}`}><i/>{statusMeta[request.status].label}</span>
        </button>)}
      </div>}
    </section>

    {selected && <div className="modal-backdrop booking-detail-backdrop" onMouseDown={event => event.target === event.currentTarget && !busy && closeRequest()}>
      <section className="modal-card booking-detail-modal" role="dialog" aria-modal="true" aria-labelledby="booking-detail-title">
        <div className="modal-head booking-detail-head">
          <div><span className="eyebrow">{selected.code}</span><h2 id="booking-detail-title">{selected.farmName}</h2><p>{selected.clientName} • {selected.central}</p></div>
          <button className="close" onClick={closeRequest}>×</button>
        </div>

        <div className="booking-detail-status-line"><span className={`booking-status ${selected.status}`}><i/>{statusMeta[selected.status].label}</span><span>{statusMeta[selected.status].description}</span><small>Recebida em {format(parseISO(selected.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</small></div>

        <section className="booking-detail-section">
          <div className="booking-detail-section-title"><CalendarIcon/><div><span className="eyebrow">Agenda</span><h3>Período solicitado</h3></div></div>
          <div className="booking-period-highlight"><strong>{formatDateRange(selected.start, selected.end)}</strong><span>{selected.appointmentType}{selected.preferredStartTime && selected.preferredEndTime ? ` • ${selected.preferredStartTime}–${selected.preferredEndTime}` : ' • Dia todo'}</span>{selected.holidayAcknowledged && <small><AlertIcon/> Solicitante confirmou o aviso de data especial.</small>}</div>
        </section>

        <section className="booking-detail-section">
          <div className="booking-detail-section-title"><FarmIcon/><div><span className="eyebrow">Atendimento</span><h3>Cliente e fazenda</h3></div></div>
          <div className="booking-detail-grid">
            <div><UserIcon/><span><small>Cliente</small><strong>{selected.clientName}</strong></span></div>
            <div><FarmIcon/><span><small>Fazenda</small><strong>{selected.farmName}</strong></span></div>
            <div><LocationIcon/><span><small>Cidade / UF</small><strong>{selected.city}/{selected.state}</strong></span></div>
            <div><BuildingIcon/><span><small>Central</small><strong>{selected.central}</strong></span></div>
            <div><UserIcon/><span><small>Comercial</small><strong>{selected.commercialResponsible}</strong></span></div>
            <div><CollarIcon/><span><small>Colares</small><strong>{selected.quantityCollars}</strong></span></div>
            <div><RequestIcon/><span><small>Antenas adicionais</small><strong>{selected.extraAntennaCount}</strong></span></div>
          </div>
        </section>

        <section className="booking-detail-section">
          <div className="booking-detail-section-title"><RequestIcon/><div><span className="eyebrow">Contato</span><h3>Quem solicitou</h3></div></div>
          <div className="booking-contact-line"><UserIcon/><span><strong>{selected.requesterName}</strong><small>{selected.requesterEmail || 'E-mail não informado'}</small></span>{selected.requesterPhone ? <a href={`https://wa.me/55${selected.requesterPhone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"><PhoneIcon/>{selected.requesterPhone}</a> : <small className="booking-contact-empty">Telefone não informado</small>}</div>
          {selected.notes && <div className="booking-notes"><small>Observações</small><p>{selected.notes}</p></div>}
        </section>

        <label className="field booking-review-notes"><span>Nota da análise</span><textarea value={reviewNotes} disabled={selected.status !== 'pending'} onChange={event => setReviewNotes(event.target.value)} placeholder="Opcional: registre o motivo ou uma orientação"/></label>
        {actionError && <div className="auth-message error">{actionError}</div>}

        <div className="modal-actions booking-detail-actions">
          <button className="ghost" onClick={closeRequest}>Fechar</button>
          <span className="actions-spacer"/>
          {selected.status === 'approved' && selected.demandId && <button className="secondary" onClick={() => openDemand(selected)}>Abrir demanda</button>}
          {selected.status === 'pending' && <><button className="danger-outline" disabled={busy} onClick={() => setDecision('rejected')}>Reprovar e liberar data</button><button className="primary" disabled={busy} onClick={() => setDecision('approved')}><CheckIcon/> Aprovar solicitação</button></>}
        </div>
      </section>
    </div>}

    <ConfirmActionModal
      open={Boolean(decision && selected)}
      title={decision === 'approved' ? 'Aprovar esta solicitação?' : 'Reprovar esta solicitação?'}
      description={decision === 'approved' ? 'Uma demanda e um agendamento serão criados automaticamente no Routine.' : 'A solicitação será encerrada e o período ficará livre para novos pedidos.'}
      detail={selected ? `${selected.farmName} • ${formatDateRange(selected.start, selected.end)}` : undefined}
      confirmLabel={decision === 'approved' ? 'Aprovar e agendar' : 'Reprovar solicitação'}
      variant={decision === 'approved' ? 'success' : 'danger'}
      busy={busy}
      error={actionError}
      onCancel={() => { setDecision(null); setActionError('') }}
      onConfirm={() => void confirmDecision()}
    />
  </>
}
