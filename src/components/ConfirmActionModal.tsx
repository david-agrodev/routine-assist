import type { ReactNode } from 'react'
import { AlertIcon, CalendarIcon, CheckIcon, TrashIcon } from './Icons'

export function ConfirmActionModal({
  open,
  title,
  description,
  detail,
  children,
  confirmLabel = 'Confirmar',
  busy = false,
  error,
  variant = 'danger',
  onCancel,
  onConfirm,
}: {
  open: boolean
  title: string
  description: string
  detail?: string
  children?: ReactNode
  confirmLabel?: string
  busy?: boolean
  error?: string | null
  variant?: 'danger'|'warning'|'success'
  onCancel: () => void
  onConfirm: () => void
}) {
  if (!open) return null
  const isWarning = variant === 'warning'
  const isSuccess = variant === 'success'

  return <div className="modal-backdrop confirm-backdrop" onMouseDown={e => e.target === e.currentTarget && !busy && onCancel()}>
    <section className={`modal-card confirm-action-card ${variant}`} role="dialog" aria-modal="true" aria-labelledby="confirm-action-title">
      <div className="confirm-action-icon">{isWarning ? <CalendarIcon/> : isSuccess ? <CheckIcon/> : <AlertIcon/>}</div>
      <div className="confirm-action-content">
        <span className="eyebrow">{isWarning ? 'Atenção à data' : isSuccess ? 'Solicitação' : 'Confirmação'}</span>
        <h2 id="confirm-action-title">{title}</h2>
        <p>{description}</p>
        {detail && <div className="confirm-action-detail">{detail}</div>}
        {children}
        {error && <div className="auth-message error modal-error">{error}</div>}
      </div>
      <div className="modal-actions confirm-action-actions">
        <button className="ghost" disabled={busy} onClick={onCancel}>Cancelar</button>
        <button className={isWarning ? 'warning-solid' : isSuccess ? 'primary' : 'danger-solid'} disabled={busy} onClick={onConfirm}>{variant === 'danger' && <TrashIcon/>} {busy ? 'Aguarde...' : confirmLabel}</button>
      </div>
    </section>
  </div>
}
