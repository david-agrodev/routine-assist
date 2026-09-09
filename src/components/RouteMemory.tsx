import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const KEY = 'routine-assist-last-path'
const allowed = new Set(['/', '/entrada', '/calendario', '/viagens', '/relatorios', '/integracoes', '/configuracoes'])

export function RouteMemory() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const restored = useRef(false)

  useEffect(() => {
    if (loading || !user || restored.current) return
    restored.current = true
    const current = location.pathname
    const saved = window.localStorage.getItem(KEY)
    // Se o app reabrir pela raiz, retoma a última tela usada.
    if (current === '/' && saved && saved !== '/' && allowed.has(saved)) {
      navigate(saved, { replace: true })
    }
  }, [loading, user, location.pathname, navigate])

  useEffect(() => {
    if (!user || !allowed.has(location.pathname)) return
    window.localStorage.setItem(KEY, location.pathname)
  }, [user, location.pathname])

  return null
}
