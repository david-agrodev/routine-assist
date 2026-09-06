import { useEffect, useMemo, useState } from 'react'
import { CalendarIcon, CheckIcon, RouteIcon } from './Icons'
import { useRoutine } from '../context/RoutineContext'

const DRAFT_KEY = 'routine-assist-trip-draft-v1'

export function CreateTripModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { appointments, trips, createTrip } = useRoutine()
  const linkedIds = useMemo(() => new Set(trips.flatMap(t=>t.appointments.map(a=>a.id))), [trips])
  const available = appointments.filter(a=>a.type==='Presencial' && !linkedIds.has(a.id))
  const [title,setTitle] = useState('')
  const [origin,setOrigin] = useState('Uberaba/MG')
  const [start,setStart] = useState('')
  const [end,setEnd] = useState('')
  const [hotelRequired,setHotelRequired] = useState(true)
  const [vehicleRequired,setVehicleRequired] = useState(true)
  const [selected,setSelected] = useState<string[]>([])
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState<string|null>(null)

  useEffect(()=>{
    try {
      const draft=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null')
      if(draft){ setTitle(draft.title||''); setOrigin(draft.origin||'Uberaba/MG'); setStart(draft.start||''); setEnd(draft.end||''); setHotelRequired(draft.hotelRequired??true); setVehicleRequired(draft.vehicleRequired??true); setSelected(draft.selected||[]) }
    } catch { /* noop */ }
  },[])
  useEffect(()=>{ try{localStorage.setItem(DRAFT_KEY,JSON.stringify({title,origin,start,end,hotelRequired,vehicleRequired,selected}))}catch{} },[title,origin,start,end,hotelRequired,vehicleRequired,selected])

  if(!open) return null

  const toggleAppointment=(id:string)=>{
    const next=selected.includes(id)?selected.filter(x=>x!==id):[...selected,id]
    setSelected(next)
    const chosen=available.filter(a=>next.includes(a.id))
    if(chosen.length){
      const starts=chosen.map(a=>a.start).sort(); const ends=chosen.map(a=>a.end).sort()
      if(!start || start>starts[0]) setStart(starts[0])
      if(!end || end<ends[ends.length-1]) setEnd(ends[ends.length-1])
      if(!title && chosen[0].city) setTitle(`Viagem ${chosen[0].city}`)
    }
  }

  const save=async()=>{
    if(!title.trim()||!start||!end||busy) return
    if(end<start){setError('A data final não pode ser anterior à inicial.');return}
    setBusy(true);setError(null)
    try{
      await createTrip({title:title.trim(),origin:origin.trim()||undefined,start,end,hotelRequired,vehicleRequired,appointmentIds:selected})
      localStorage.removeItem(DRAFT_KEY)
      setTitle('');setOrigin('Uberaba/MG');setStart('');setEnd('');setHotelRequired(true);setVehicleRequired(true);setSelected([])
      onClose()
    }catch(e:any){setError(e?.message||'Não foi possível criar a viagem.')}
    finally{setBusy(false)}
  }

  return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&!busy&&onClose()}>
    <section className="modal-card trip-modal-card">
      <div className="modal-head"><div><span className="eyebrow">Planejamento</span><h2>Nova viagem</h2></div><button className="close" onClick={onClose}>×</button></div>
      <div className="form-grid trip-form-grid">
        <label className="field field-wide"><span>Nome da viagem *</span><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ex.: Goiás • Setembro"/></label>
        <label className="field"><span>Origem</span><input value={origin} onChange={e=>setOrigin(e.target.value)} placeholder="Uberaba/MG"/></label>
        <label className="field"><span>Data inicial *</span><input type="date" value={start} onChange={e=>setStart(e.target.value)}/></label>
        <label className="field"><span>Data final *</span><input type="date" value={end} onChange={e=>setEnd(e.target.value)}/></label>
      </div>
      <div className="travel-options">
        <label className="confirm-row"><input type="checkbox" checked={hotelRequired} onChange={e=>setHotelRequired(e.target.checked)}/><span><strong>Precisa de hotel</strong><small>O Routine vai alertar antes da viagem enquanto não houver reserva confirmada.</small></span></label>
        <label className="confirm-row"><input type="checkbox" checked={vehicleRequired} onChange={e=>setVehicleRequired(e.target.checked)}/><span><strong>Precisa de veículo</strong><small>O Routine vai acompanhar o envio do Forms e a confirmação da locadora.</small></span></label>
      </div>
      <div className="modal-subhead"><div><span className="eyebrow">Atendimentos</span><h3>Vincular à viagem</h3></div><span className="selection-count">{selected.length} selecionado{selected.length===1?'':'s'}</span></div>
      <div className="appointment-picker">
        {available.length===0 && <div className="soft-note">Não há atendimentos presenciais livres para vincular. Você ainda pode criar a viagem e adicionar atendimentos depois.</div>}
        {available.map(a=><button type="button" key={a.id} className={`appointment-choice ${selected.includes(a.id)?'selected':''}`} onClick={()=>toggleAppointment(a.id)}><span className="choice-check">{selected.includes(a.id)?<CheckIcon/>:<CalendarIcon/>}</span><span><strong>{a.farmName || a.client}</strong><small>{a.farmName ? `${a.client} • ` : ''}{[a.city,a.state].filter(Boolean).join('/') || 'Local não informado'} • {a.start.split('-').reverse().join('/')} → {a.end.split('-').reverse().join('/')}</small></span></button>)}
      </div>
      <div className="draft-note">A viagem também fica salva como rascunho se você sair desta tela.</div>
      {error&&<div className="auth-message error modal-error">{error}</div>}
      <div className="modal-actions"><button className="ghost" onClick={onClose}>Fechar por enquanto</button><button className="primary" disabled={!title.trim()||!start||!end||busy} onClick={()=>void save()}><RouteIcon/> {busy?'Criando...':'Criar viagem'}</button></div>
    </section>
  </div>
}
