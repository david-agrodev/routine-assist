import { useEffect, useState } from 'react'
import { PlusIcon, TrashIcon } from './Icons'
import { useRoutine } from '../context/RoutineContext'
import { formatCompanyName } from '../lib/format'
import type { DemandPriority } from '../types/routine'
import { PriorityStars } from './PriorityStars'

const DRAFT_KEY = 'routine-assist-new-demand-draft-v3'

export function DemandModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { createDemand, companies } = useRoutine()
  const [client, setClient] = useState('')
  const [company, setCompany] = useState('')
  const [commercialResponsible, setCommercialResponsible] = useState('')
  const [priority, setPriority] = useState<DemandPriority>(3)
  const [quantity, setQuantity] = useState('')
  const [extraAntennaCount, setExtraAntennaCount] = useState('')
  const [showExtraAntenna, setShowExtraAntenna] = useState(false)
  const [raw, setRaw] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const draft = JSON.parse(window.localStorage.getItem(DRAFT_KEY) || 'null')
      if (draft) {
        setClient(draft.client || '')
        setCompany(draft.company || '')
        setCommercialResponsible(draft.commercialResponsible || '')
        setPriority(Number(draft.priority) as DemandPriority || 3)
        setQuantity(draft.quantity || '')
        setExtraAntennaCount(draft.extraAntennaCount || '')
        setShowExtraAntenna(Boolean(draft.showExtraAntenna || draft.extraAntennaCount))
        setRaw(draft.raw || '')
      }
    } catch { /* noop */ }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({
        client, company, commercialResponsible, priority, quantity, extraAntennaCount, showExtraAntenna, raw,
      }))
    } catch { /* noop */ }
  }, [client, company, commercialResponsible, priority, quantity, extraAntennaCount, showExtraAntenna, raw])

  if (!open) return null

  const close = () => {
    if (busy) return
    setError(null)
    onClose()
  }

  const n = (value: string) => value === '' ? undefined : Number(value)

  const save = async () => {
    if (!client.trim() || !company || busy) return
    setBusy(true); setError(null)
    try {
      await createDemand({
        client: client.trim(),
        company,
        regional: commercialResponsible.trim() || undefined,
        priority,
        quantity: n(quantity),
        extraAntennaCount: showExtraAntenna ? n(extraAntennaCount) : undefined,
        raw: raw.trim() || undefined,
      })
      setClient(''); setCompany(''); setCommercialResponsible(''); setPriority(3); setQuantity(''); setExtraAntennaCount(''); setShowExtraAntenna(false); setRaw(''); setError(null)
      try { window.localStorage.removeItem(DRAFT_KEY) } catch { /* noop */ }
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Não foi possível salvar a demanda.')
    } finally { setBusy(false) }
  }

  const companyOptions = companies.length ? companies : [{ id:'alta', name:'Alta' }, { id:'genex', name:'GENEX' }]

  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && close()}>
    <section className="modal-card demand-create-card">
      <div className="modal-head"><div><span className="eyebrow">Entrada rápida</span><h2>Nova demanda</h2></div><button className="close" onClick={close}>×</button></div>

      <div className="form-grid demand-form-grid demand-core-grid">
        <label className="field"><span>Cliente *</span><input value={client} onChange={e=>setClient(e.target.value)} placeholder="Nome do cliente"/></label>
        <label className="field"><span>Central *</span><select value={company} onChange={e=>setCompany(e.target.value)}><option value="">Selecione a central</option>{companyOptions.map(c=><option key={c.id} value={c.name}>{formatCompanyName(c.name)}</option>)}</select></label>
        <label className="field"><span>Responsável comercial</span><input value={commercialResponsible} onChange={e=>setCommercialResponsible(e.target.value)} placeholder="Vendedor, regional ou distrital"/></label>
        <PriorityStars value={priority} onChange={setPriority}/>
      </div>

      <div className="equipment-panel demand-items-panel">
        <div className="equipment-head"><div><strong>Itens desta demanda</strong><span>Registre somente o que importa para organizar este atendimento.</span></div></div>
        <div className="demand-items-grid">
          <label className="field"><span>Colares</span><input type="number" min="0" inputMode="numeric" value={quantity} onChange={e=>setQuantity(e.target.value)} placeholder="Ex.: 300"/></label>
          {showExtraAntenna ? <label className="field optional-demand-item"><span>Antenas adicionais</span><div className="inline-input-action"><input type="number" min="0" inputMode="numeric" value={extraAntennaCount} onChange={e=>setExtraAntennaCount(e.target.value)} placeholder="Ex.: 1"/><button type="button" className="icon-button subtle remove-item" aria-label="Remover antenas adicionais" onClick={()=>{setShowExtraAntenna(false);setExtraAntennaCount('')}}><TrashIcon/></button></div></label> : <button type="button" className="add-optional-item" onClick={()=>setShowExtraAntenna(true)}><PlusIcon/> Adicionar antenas adicionais</button>}
        </div>
        <p className="equipment-example">Ex.: 300 colares • ou apenas 1 antena adicional.</p>
      </div>

      <label className="field raw-information-field"><span>Informações recebidas / observações</span><textarea rows={4} value={raw} onChange={e=>setRaw(e.target.value)} placeholder="Cole ou escreva aqui as informações recebidas sobre esta demanda..."/></label>

      <div className="soft-note">Você pode salvar a demanda mesmo incompleta. Se fechar sem salvar, o rascunho continuará aqui quando voltar.</div>
      {error && <div className="auth-message error modal-error">{error}</div>}
      <div className="modal-actions"><button className="ghost" onClick={close}>Fechar por enquanto</button><button className="primary" disabled={!client.trim() || !company || busy} onClick={() => void save()}><PlusIcon/> {busy ? 'Salvando...' : 'Salvar incompleta'}</button></div>
    </section>
  </div>
}
