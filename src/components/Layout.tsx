import { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { BellIcon, CalendarIcon, HomeIcon, InboxIcon, ListIcon, LogoutIcon, PlusIcon, SettingsIcon, TripIcon } from './Icons'
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
  { to: '/relatorios', label: 'Relatórios', icon: ListIcon },
]

function initials(nameOrEmail: string) {
  const clean = nameOrEmail.split('@')[0].trim()
  const words = clean.split(/[\s._-]+/).filter(Boolean)
  return (words.length > 1 ? words[0][0] + words[1][0] : clean.slice(0,2)).toUpperCase()
}

export function Layout({ children, onNewDemand }: { children: React.ReactNode; onNewDemand: () => void }) {
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [profileOpen,setProfileOpen]=useState(false)
  const [signingOut,setSigningOut]=useState(false)
  const profileRef=useRef<HTMLDivElement|null>(null)
  const navigate=useNavigate()
  const { user, signOut } = useAuth()
  const { demands, trips, notificationPreferences, userProfile } = useRoutine()
  const pendingItems = buildPendingItems(demands, trips, notificationPreferences)
  const notificationCount = pendingItems.length
  const display = userProfile?.fullName || user?.user_metadata?.full_name || user?.email || 'Usuário'

  useEffect(() => {
    if (!notificationPreferences.pushEnabled || !('Notification' in window) || Notification.permission !== 'granted') return
    pendingItems.filter(item => item.kind !== 'demand' && item.stage != null).slice(0,4).forEach(item => {
      const key = `routine-assist-notified:${item.id}:stage-${item.stage}`
      if (localStorage.getItem(key)) return
      try {
        const notification = new Notification(`Routine Assist • ${item.title}`, { body: item.detail, icon: '/icon-192.png' })
        notification.onclick = () => {
          window.focus()
          if (item.entityId && item.target === '/viagens') { localStorage.setItem('routine-assist-focus-trip', item.entityId); if(item.kind==='hotel'||item.kind==='vehicle'||item.kind==='flight') localStorage.setItem('routine-assist-focus-section',item.kind) }
          window.location.href = item.target
          notification.close()
        }
        localStorage.setItem(key, '1')
      } catch { /* depende do suporte do navegador */ }
    })
  }, [notificationPreferences.pushEnabled, pendingItems.map(item=>item.id+item.stage).join('|')])

  useEffect(()=>{
    if(!profileOpen) return
    const onPointer=(event:PointerEvent)=>{
      if(profileRef.current && !profileRef.current.contains(event.target as Node)) setProfileOpen(false)
    }
    window.addEventListener('pointerdown',onPointer)
    return ()=>window.removeEventListener('pointerdown',onPointer)
  },[profileOpen])

  const logout=async()=>{
    if(signingOut) return
    setSigningOut(true)
    try {
      setProfileOpen(false)
      try {
        localStorage.removeItem('routine-assist-last-route')
        localStorage.removeItem('routine-assist-selected-trip')
      } catch { /* noop */ }
      await signOut()
    } finally { setSigningOut(false) }
  }

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
          <div className="profile-menu-wrap" ref={profileRef}>
            <button className="avatar avatar-button" aria-label="Menu do usuário" title={display} onClick={()=>setProfileOpen(v=>!v)}>{initials(display)}</button>
            {profileOpen && <div className="profile-popover">
              <div className="profile-popover-head"><span className="avatar mini-avatar">{initials(display)}</span><div><strong>{userProfile?.fullName || user?.user_metadata?.full_name || 'Usuário'}</strong><small>{user?.email}</small></div></div>
              <button onClick={()=>{setProfileOpen(false);navigate('/configuracoes')}}><SettingsIcon/><span>Configurações</span></button>
              <button className="logout-action" disabled={signingOut} onClick={()=>void logout()}><LogoutIcon/><span>{signingOut?'Saindo...':'Sair do sistema'}</span></button>
            </div>}
          </div>
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
