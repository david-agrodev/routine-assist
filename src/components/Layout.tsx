import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { BellIcon, CalendarIcon, HomeIcon, InboxIcon, PlusIcon, SettingsIcon, TripIcon } from './Icons'
import { NotificationPanel } from './NotificationPanel'
import { useAuth } from '../context/AuthContext'
import { useRoutine } from '../context/RoutineContext'
import { buildPendingItems } from '../lib/pending'
import { BrandMark } from './BrandMark'

const nav = [
  { to: '/', label: 'Início', icon: HomeIcon },
  { to: '/entrada', label: 'Entrada', icon: InboxIcon },
  { to: '/calendario', label: 'Agenda', icon: CalendarIcon },
  { to: '/viagens', label: 'Viagens', icon: TripIcon },
]

function initials(nameOrEmail: string) {
  const clean = nameOrEmail.split('@')[0].trim()
  const words = clean.split(/[\s._-]+/).filter(Boolean)
  return (words.length > 1 ? words[0][0] + words[1][0] : clean.slice(0,2)).toUpperCase()
}

export function Layout({ children, onNewDemand }: { children: React.ReactNode; onNewDemand: () => void }) {
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const { user } = useAuth()
  const { demands, trips, notificationPreferences } = useRoutine()
  const pendingItems = buildPendingItems(demands, trips, notificationPreferences)
  const notificationCount = pendingItems.length
  const display = user?.user_metadata?.full_name || user?.email || 'Usuário'

  useEffect(() => {
    if (!notificationPreferences.pushEnabled || !('Notification' in window) || Notification.permission !== 'granted') return
    pendingItems.filter(item => item.kind !== 'demand' && item.stage != null).slice(0,4).forEach(item => {
      const key = `routine-assist-notified:${item.id}:stage-${item.stage}`
      if (localStorage.getItem(key)) return
      try {
        const notification = new Notification(`Routine Assist • ${item.title}`, { body: item.detail, icon: '/icon-192.png' })
        notification.onclick = () => {
          window.focus()
          if (item.entityId && item.target === '/viagens') localStorage.setItem('routine-assist-focus-trip', item.entityId)
          window.location.href = item.target
          notification.close()
        }
        localStorage.setItem(key, '1')
      } catch { /* depende do suporte do navegador */ }
    })
  }, [notificationPreferences.pushEnabled, pendingItems.map(item=>item.id+item.stage).join('|')])

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><img src="/routine-assist-logo.png" alt="Routine Assist" /></div>
      <nav className="nav-list">
        {nav.map(({to,label,icon:Icon}) => <NavLink key={to} to={to} end={to==='/' } className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}><Icon/><span>{label}</span></NavLink>)}
      </nav>
      <div className="sidebar-footer"><NavLink to="/configuracoes" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}><SettingsIcon/><span>Configurações</span></NavLink></div>
    </aside>
    <main className="main">
      <header className="topbar">
        <div className="mobile-brand"><BrandMark className="brand-mark"/><strong>Routine Assist</strong></div>
        <div className="topbar-actions">
          <button className="primary desktop-only" onClick={onNewDemand}><PlusIcon/> Nova demanda</button>
          <button className="icon-button" aria-label="Notificações" onClick={()=>setNotificationsOpen(true)}><BellIcon/>{notificationCount > 0 && <span className="badge">{notificationCount > 9 ? '9+' : notificationCount}</span>}</button>
          <NavLink to="/configuracoes" className="avatar" aria-label="Configurações do usuário" title={display}>{initials(display)}</NavLink>
        </div>
      </header>
      <div className="content">{children}</div>
    </main>
    <button className="mobile-fab" onClick={onNewDemand} aria-label="Nova demanda"><PlusIcon/></button>
    <nav className="bottom-nav" aria-label="Navegação principal">
      {nav.map(({to,label,icon:Icon}) => <NavLink key={to} to={to} end={to==='/' } className={({isActive}) => `bottom-item ${isActive ? 'active' : ''}`}><Icon/><span>{label}</span></NavLink>)}
    </nav>
    <NotificationPanel open={notificationsOpen} onClose={()=>setNotificationsOpen(false)}/>
  </div>
}
