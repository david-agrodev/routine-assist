import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { BrandMark } from '../components/BrandMark'
import { EyeIcon, EyeOffIcon } from '../components/Icons'

export function LoginPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'login'|'signup'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setError(null); setMessage(null)
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password)
      } else {
        const result = await signUp(name.trim(), email.trim(), password)
        if (result.needsConfirmation) {
          setMessage('Conta criada. Confira seu e-mail para confirmar o cadastro e depois entre no Routine Assist.')
          setMode('login')
        }
      }
    } catch (err: any) {
      const text = err?.message || 'Não foi possível continuar.'
      setError(text === 'Invalid login credentials' ? 'E-mail ou senha inválidos.' : text)
    } finally { setBusy(false) }
  }

  return <div className="auth-page">
    <section className="auth-brand-panel">
      <div className="auth-brand-lockup" aria-label="Routine Assist">
        <img src="/brand-mark-inverse.svg" alt="" aria-hidden="true" />
        <span><strong>Routine</strong> Assist</span>
      </div>
      <div><span className="eyebrow">Sua rotina em ordem</span><h1>Agenda, demandas e viagens sem informação perdida.</h1><p>Organize o que recebeu, planeje deslocamentos e deixe o Routine Assist lembrar o que ainda falta.</p></div>
    </section>
    <section className="auth-form-wrap">
      <div className="auth-card">
        <div className="mobile-auth-logo"><BrandMark className="brand-mark"/><strong>Routine Assist</strong></div>
        <span className="eyebrow">{mode === 'login' ? 'Bem-vindo' : 'Primeiro acesso'}</span>
        <h2>{mode === 'login' ? 'Entrar no Routine Assist' : 'Criar sua conta'}</h2>
        <p className="auth-subtitle">{mode === 'login' ? 'Use seu e-mail e senha para acessar sua rotina.' : 'Sua primeira conta será administradora do workspace.'}</p>
        <form onSubmit={submit}>
          {mode === 'signup' && <label className="field"><span>Nome</span><input required value={name} onChange={e=>setName(e.target.value)} placeholder="Seu nome" autoComplete="name"/></label>}
          <label className="field"><span>E-mail</span><input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@empresa.com" autoComplete="email"/></label>
          <label className="field"><span>Senha</span><span className="password-input-wrap"><input required minLength={6} type={showPassword ? 'text' : 'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mínimo de 6 caracteres" autoComplete={mode==='login'?'current-password':'new-password'}/><button type="button" className="password-visibility" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>{showPassword ? <EyeOffIcon/> : <EyeIcon/>}</button></span></label>
          {error && <div className="auth-message error">{error}</div>}
          {message && <div className="auth-message success">{message}</div>}
          <button className="primary auth-submit" disabled={busy}>{busy ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}</button>
        </form>
        <button className="auth-switch" onClick={()=>{setMode(mode==='login'?'signup':'login');setError(null);setMessage(null)}}>{mode === 'login' ? 'Ainda não tenho conta' : 'Já tenho uma conta'}</button>
      </div>
    </section>
  </div>
}
