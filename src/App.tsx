import { useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { DemandModal } from './components/DemandModal'
import { Dashboard } from './pages/Dashboard'
import { Inbox } from './pages/Inbox'
import { CalendarPage } from './pages/CalendarPage'
import { TripsPage } from './pages/TripsPage'
import { SettingsPage } from './pages/SettingsPage'
import { LoginPage } from './pages/LoginPage'
import { useAuth } from './context/AuthContext'
import { RoutineProvider } from './context/RoutineContext'
import { isSupabaseConfigured } from './lib/supabase'
import { RouteMemory } from './components/RouteMemory'

function RoutineApp() {
  const [modal, setModal] = useState(false)
  return <RoutineProvider>
    <RouteMemory/>
    <Layout onNewDemand={() => setModal(true)}>
      <Routes>
        <Route path="/" element={<Dashboard/>}/>
        <Route path="/entrada" element={<Inbox/>}/>
        <Route path="/calendario" element={<CalendarPage/>}/>
        <Route path="/viagens" element={<TripsPage/>}/>
        <Route path="/configuracoes" element={<SettingsPage/>}/>
      </Routes>
      <DemandModal open={modal} onClose={() => setModal(false)}/>
    </Layout>
  </RoutineProvider>
}

export default function App() {
  const { user, workspaceId, loading, setupError, retryBootstrap } = useAuth()

  if (!isSupabaseConfigured) return <div className="system-state"><span className="mini-logo">R</span><h1>Supabase não configurado</h1><p>Crie um arquivo <code>.env.local</code> com a URL e a chave pública do projeto.</p></div>
  if (loading) return <div className="system-state"><span className="mini-logo pulse">R</span><h1>Preparando sua rotina...</h1><p>Conectando ao Routine Assist.</p></div>
  if (!user) return <LoginPage/>
  if (setupError) return <div className="system-state setup-state"><span className="mini-logo">R</span><span className="eyebrow">Configuração inicial</span><h1>O banco ainda precisa ser preparado.</h1><p>Abra o Supabase → SQL Editor e execute o arquivo <code>supabase/setup.sql</code> que veio no projeto. Depois volte aqui.</p><div className="setup-error">{setupError}</div><button className="primary" onClick={() => void retryBootstrap()}>Tentar novamente</button></div>
  if (!workspaceId) return <div className="system-state"><span className="mini-logo pulse">R</span><h1>Preparando workspace...</h1></div>
  return <RoutineApp/>
}
