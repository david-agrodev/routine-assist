import { AlertIcon, CalendarIcon, TrashIcon } from './Icons'

export function ConfirmActionModal({
  open,
  title,
  description,
  detail,
  confirmLabel = 'Confirmar',
  busy = false,
  error,
  variant='danger',
  onCancel,
  onConfirm,
}: {
  open: boolean
  title: string
  description: string
  detail?: string
  confirmLabel?: string
  busy?: boolean
  error?: string | null
  variant?: 'danger'|'warning'
  onCancel: () => void
  onConfirm: () => void
}) {
  if (!open) return null
  return <div className="modal-backdrop confirm-backdrop" onMouseDown={e => e.target === e.currentTarget && !busy && onCancel()}>
    <section className={`modal-card confirm-action-card ${variant}`} role="dialog" aria-modal="true" aria-labelledby="confirm-action-title">
      <div className="confirm-action-icon">{variant==='warning'?<CalendarIcon/>:<AlertIcon/>}</div>
      <div className="confirm-action-content">
        <span className="eyebrow">{variant==='warning'?'Atenção à data':'Confirmação'}</span>
        <h2 id="confirm-action-title">{title}</h2>
        <p>{description}</p>
        {detail && <div className="confirm-action-detail">{detail}</div>}
        {error && <div className="auth-message error modal-error">{error}</div>}
      </div>
      <div className="modal-actions confirm-action-actions">
        <button className="ghost" disabled={busy} onClick={onCancel}>Cancelar</button>
        <button className={variant==='warning'?'warning-solid':'danger-solid'} disabled={busy} onClick={onConfirm}>{variant==='danger'&&<TrashIcon/>} {busy ? 'Aguarde...' : confirmLabel}</button>
      </div>
    </section>
  </div>
}
