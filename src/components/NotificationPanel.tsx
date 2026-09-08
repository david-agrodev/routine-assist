import { useNavigate } from 'react-router-dom'
import { ArrowIcon, CarIcon, HotelIcon, InboxIcon, PlaneIcon, RouteIcon } from './Icons'
import { useRoutine } from '../context/RoutineContext'
import { buildPendingItems } from '../lib/pending'

export function NotificationPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const { demands, trips, notificationPreferences } = useRoutine()
  const items = buildPendingItems(demands, trips, notificationPreferences)
  if (!open) return null

  const openItem = (item: ReturnType<typeof buildPendingItems>[number]) => {
    if (item.entityId && item.target === '/viagens') { localStorage.setItem('routine-assist-focus-trip', item.entityId); if(item.kind==='hotel'||item.kind==='vehicle'||item.kind==='flight') localStorage.setItem('routine-assist-focus-section',item.kind) }
    if (item.entityId && item.target === '/entrada') localStorage.setItem('routine-assist-focus-demand', item.entityId)
    onClose()
    navigate(item.target)
  }

  return <>
    <button className="notification-scrim" aria-label="Fechar notificações" onClick={onClose}/>
    <aside className="notification-panel" aria-label="Notificações">
      <div className="notification-head"><div><span className="eyebrow">Central</span><h2>Notificações</h2></div><button className="close" onClick={onClose}>×</button></div>
      <div className="notification-group-label">PRECISA DA SUA ATENÇÃO</div>
      {items.length === 0 && <div className="notification-empty"><strong>Tudo em ordem.</strong><span>Nenhuma pendência automática no momento.</span></div>}
      {items.slice(0,8).map(item => {
        const Icon = item.kind === 'hotel' ? HotelIcon : item.kind === 'vehicle' ? CarIcon : item.kind === 'flight' ? PlaneIcon : item.kind === 'trip' ? RouteIcon : InboxIcon
        return <button className="notification-row" key={item.id} onClick={()=>openItem(item)}>
          <span className={`notification-symbol ${item.urgency}`}><Icon/></span>
          <span><strong>{item.title}</strong><small>{item.detail}</small></span><ArrowIcon/>
        </button>
      })}
    </aside>
  </>
}
