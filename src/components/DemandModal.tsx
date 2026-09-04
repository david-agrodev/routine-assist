import { useEffect, useState } from 'react'
import { PlusIcon } from './Icons'
import { useRoutine } from '../context/RoutineContext'

const DRAFT_KEY = 'routine-assist-new-demand-draft-v1'

export function DemandModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { createDemand, companies } = useRoutine()
  const [raw, setRaw] = useState('')
  const [client, setClient] = useState('')
  const [company, setCompany] = useState('Alta')
  const [regional, setRegional] = useState('')
  const [quantity, setQuantity] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const draft = JSON.parse(window.localStorage.getItem(DRAFT_KEY) || 'null')
      if (draft) {
        setRaw(draft.raw || '')
        setClient(draft.client || '')
        setCompany(draft.company || 'Alta')
        setRegional(draft.regional || '')
        setQuantity(draft.quantity || '')
      }
    } catch { /* noop */ }
  }, [])

  useEffect(() => {
    try { window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ raw, client, company, regional, quantity })) } catch { /* noop */ }
  }, [raw, client, company, regional, quantity])

  useEffect(() => {
    if (companies.length && !companies.some(c => c.name === company)) setCompany(companies[0].name)
  }, [companies, company])

  if (!open) return null

  const close = () => {
    if (busy) return
    setError(null)
    onClose()
  }

  const save = async () => {
    if (!client.trim() || busy) return
    setBusy(true); setError(null)
    try {
      await createDemand({
        client: client.trim(),
        company,
        regional: regional.trim() || undefined,
        raw: raw.trim() || undefined,
        quantity: quantity ? Number(quantity) : undefined,
      })
      setRaw(''); setClient(''); setRegional(''); setQuantity(''); setError(null)
      try { window.localStorage.removeItem(DRAFT_KEY) } catch { /* noop */ }
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Não foi possível salvar a demanda.')
    } finally { setBusy(false) }
  }

  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && close()}>
    <section className="modal-card">
      <div className="modal-head"><div><span className="eyebrow">Entrada rápida</span><h2>Nova demanda</h2></div><button className="close" onClick={close}>×</button></div>
      <label className="field"><span>Informações recebidas</span><textarea rows={5} value={raw} onChange={e=>setRaw(e.target.value)} placeholder="Cole aqui a mensagem recebida da Nathalia, comercial ou cliente..."/></label>
      <div className="form-grid demand-form-grid">
        <label className="field"><span>Cliente *</span><input value={client} onChange={e=>setClient(e.target.value)} placeholder="Nome do cliente"/></label>
        <label className="field"><span>Central *</span><select value={company} onChange={e=>setCompany(e.target.value)}>{(companies.length ? companies : [{id:'alta',name:'Alta'},{id:'genex',name:'GENEX'}]).map(c=><option key={c.id} value={c.name}>{c.name}</option>)}</select></label>
        <label className="field"><span>Quantidade de colares</span><input type="number" min="0" inputMode="numeric" value={quantity} onChange={e=>setQuantity(e.target.value)} placeholder="Ex.: 300"/></label>
        <label className="field"><span>Regional</span><input value={regional} onChange={e=>setRegional(e.target.value)} placeholder="Pode ficar vazio"/></label>
      </div>
      <div className="soft-note">Você pode salvar a demanda mesmo incompleta. Se fechar sem salvar, o rascunho continuará aqui quando voltar.</div>
      {error && <div className="auth-message error modal-error">{error}</div>}
      <div className="modal-actions"><button className="ghost" onClick={close}>Fechar por enquanto</button><button className="primary" disabled={!client.trim() || busy} onClick={() => void save()}><PlusIcon/> {busy ? 'Salvando...' : 'Salvar incompleta'}</button></div>
    </section>
  </div>
}
