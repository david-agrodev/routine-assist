import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { bootstrapWorkspace } from '../services/routine'

type AuthContextValue = {
  session: Session | null
  user: User | null
  workspaceId: string | null
  loading: boolean
  setupError: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (name: string, email: string, password: string) => Promise<{ needsConfirmation: boolean }>
  signOut: () => Promise<void>
  retryBootstrap: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [setupError, setSetupError] = useState<string | null>(null)

  const prepare = async (activeSession: Session | null) => {
    setSession(activeSession)
    setWorkspaceId(null)
    setSetupError(null)
    if (!activeSession) return
    try {
      const ws = await bootstrapWorkspace()
      setWorkspaceId(ws)
    } catch (error: any) {
      setSetupError(error?.message || 'Não foi possível preparar o banco do Routine Assist.')
    }
  }

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false)
      return
    }
    let mounted = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      await prepare(data.session)
      if (mounted) setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      window.setTimeout(async () => {
        if (!mounted) return
        setLoading(true)
        await prepare(nextSession)
        if (mounted) setLoading(false)
      }, 0)
    })
    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    workspaceId,
    loading,
    setupError,
    signIn: async (email, password) => {
      if (!supabase) throw new Error('Supabase não configurado.')
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    },
    signUp: async (name, email, password) => {
      if (!supabase) throw new Error('Supabase não configurado.')
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      })
      if (error) throw error
      return { needsConfirmation: !data.session }
    },
    signOut: async () => {
      if (!supabase) return
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    },
    retryBootstrap: async () => {
      setLoading(true)
      setSetupError(null)
      try {
        if (session) await prepare(session)
      } finally {
        setLoading(false)
      }
    },
  }), [session, workspaceId, loading, setupError])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de AuthProvider')
  return ctx
}
