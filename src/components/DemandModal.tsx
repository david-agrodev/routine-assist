import { useEffect, useState } from 'react'
import { AlertIcon, ArrowIcon, CollarIcon, NotesIcon, PlusIcon, SaveIcon, TrashIcon, UserIcon } from './Icons'
import { useRoutine } from '../context/RoutineContext'
import { formatCompanyName } from '../lib/format'
import type { Demand, DemandPriority } from '../types/routine'
import { PriorityStars } from './PriorityStars'

const DRAFT_KEY = 'routine-assist-new-demand-draft-v3'

export function DemandModal({ open, onClose, onContinue }: { open: boolean; onClose: () => void; onContinue?: (demand: Demand) => void }) {
  const { createDemand, companies } = useRoutine()
  const [client, setClient] = useState('')
  const [company, setCompany] = useState('')
  const [commercialResponsible, setCommercialResponsible] = useState('')
  const [priority, setPriority] = useState<DemandPriority>(3)
  const [quantity, setQuantity] = useState('')
  const [extraAntennaCount, setExtraAntennaCount] = useState('')
  const [showExtraAntenna, setShowExtraAntenna] = useState(false)
  const [raw, setRaw] = useState('')
  const [busyAction, setBusyAction] = useState<'incomplete'|'continue'|null>(null)
  const [error, setError] = useState<string | null>(null)
  const busy = Boolean(busyAction)

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

  const save = async (action: 'incomplete'|'continue') => {
    if (!client.trim() || !company || busy) return
    setBusyAction(action); setError(null)
    try {
      const created = await createDemand({
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
      if (action === 'continue' && onContinue) onContinue(created)
      else onClose()
    } catch (err: any) {
      setError(err?.message || 'Não foi possível salvar a demanda.')
    } finally { setBusyAction(null) }
  }

  const companyOptions = companies.length ? companies : [{ id:'alta', name:'Alta' }, { id:'genex', name:'GENEX' }]
  const canSave = Boolean(client.trim() && company)
  const missingRequirements = [!client.trim() && 'cliente', !company && 'central'].filter(Boolean).join(' e ')

  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && close()}>
    <section className="modal-card demand-create-card">
      <div className="modal-head demand-create-head"><div><span className="eyebrow">Entrada rápida</span><h2>Nova demanda</h2><p>Registre o essencial agora e complete o atendimento na sequência.</p></div><div className="demand-head-actions"><span className="demand-draft-status"><SaveIcon/> Rascunho automático</span><button className="close" onClick={close} aria-label="Fechar nova demanda">×</button></div></div>

      <section className="demand-create-section demand-identification-section">
        <div className="demand-create-section-head"><span className="demand-section-icon identity"><UserIcon/></span><div><strong>Identificação</strong><small>Cliente, central e prioridade do atendimento.</small></div></div>
        <div className="form-grid demand-form-grid demand-core-grid">
          <label className="field"><span>Cliente *</span><input value={client} onChange={e=>setClient(e.target.value)} placeholder="Nome do cliente"/></label>
          <label className="field"><span>Central *</span><select value={company} onChange={e=>setCompany(e.target.value)}><option value="">Selecione a central</option>{companyOptions.map(c=><option key={c.id} value={c.name}>{formatCompanyName(c.name)}</option>)}</select></label>
          <label className="field"><span>Responsável comercial</span><input value={commercialResponsible} onChange={e=>setCommercialResponsible(e.target.value)} placeholder="Vendedor, regional ou distrital"/></label>
          <PriorityStars value={priority} onChange={setPriority}/>
        </div>
      </section>

      <section className="demand-create-section demand-items-panel">
        <div className="demand-create-section-head"><span className="demand-section-icon equipment"><CollarIcon/></span><div><strong>Itens desta demanda</strong><small>Informe os equipamentos necessários para o atendimento.</small></div></div>
        <div className="demand-items-grid">
          <label className="field"><span>Colares</span><input type="number" min="0" inputMode="numeric" value={quantity} onChange={e=>setQuantity(e.target.value)} placeholder="Ex.: 300"/></label>
          {showExtraAntenna ? <label className="field optional-demand-item"><span>Antenas adicionais</span><div className="inline-input-action"><input type="number" min="0" inputMode="numeric" value={extraAntennaCount} onChange={e=>setExtraAntennaCount(e.target.value)} placeholder="Ex.: 1"/><button type="button" className="icon-button subtle remove-item" aria-label="Remover antenas adicionais" onClick={()=>{setShowExtraAntenna(false);setExtraAntennaCount('')}}><TrashIcon/></button></div></label> : <button type="button" className="add-optional-item" onClick={()=>setShowExtraAntenna(true)}><PlusIcon/> Adicionar antenas adicionais</button>}
        </div>
        <p className="equipment-example">Ex.: 300 colares • ou apenas 1 antena adicional.</p>
      </section>

      <section className="demand-create-section demand-notes-section">
        <div className="demand-create-section-head"><span className="demand-section-icon notes"><NotesIcon/></span><div><strong>Informações recebidas</strong><small>Contexto, observações e detalhes enviados pelo cliente.</small></div></div>
        <label className="field raw-information-field"><span>Observações</span><textarea rows={4} value={raw} onChange={e=>setRaw(e.target.value)} placeholder="Cole ou escreva aqui as informações recebidas sobre esta demanda..."/></label>
      </section>

      <div className="soft-note demand-auto-save-note"><SaveIcon/><span><strong>Seu preenchimento está protegido.</strong> Você pode fechar e continuar depois; o rascunho permanecerá neste dispositivo.</span></div>
      {error && <div className="auth-message error modal-error">{error}</div>}
      <div className={`demand-required-hint ${canSave?'ready':'missing'}`} aria-live="polite">{canSave?<><SaveIcon/> Pronto para salvar.</>:<><AlertIcon/> Informe {missingRequirements} para salvar.</>}</div>
      <div className="modal-actions demand-create-actions"><button className="ghost demand-close-action" onClick={close}>Fechar por enquanto</button><div className="demand-save-actions"><button className="secondary" disabled={!canSave || busy} onClick={() => void save('incomplete')}><SaveIcon/> {busyAction === 'incomplete' ? 'Salvando...' : 'Salvar incompleta'}</button><button className="primary" disabled={!canSave || busy} onClick={() => void save('continue')}>{busyAction === 'continue' ? 'Salvando...' : 'Salvar e continuar'} <ArrowIcon/></button></div></div>
    </section>
  </div>
}
