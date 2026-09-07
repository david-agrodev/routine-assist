import { useEffect, useMemo, useState } from 'react'
import { CalendarIcon, CheckIcon, LocationIcon, RouteIcon } from './Icons'
import { useRoutine } from '../context/RoutineContext'
import { LocationFields } from './LocationFields'
import { locationLabel, parseLocationLabel } from '../lib/location'
import { suggestedTripTitle } from '../lib/tripTitle'

const DRAFT_KEY = 'routine-assist-trip-draft-v2'
const LAST_DEPARTURE_KEY='routine-assist-last-departure'

export function CreateTripModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { appointments, trips, createTrip } = useRoutine()
  const linkedIds = useMemo(() => new Set(trips.flatMap(t=>t.appointments.map(a=>a.id))), [trips])
  const available = appointments.filter(a=>a.type==='Presencial' && !linkedIds.has(a.id))
  const [title,setTitle] = useState('')
  const [titleTouched,setTitleTouched] = useState(false)
  const [departureCity,setDepartureCity] = useState('')
  const [departureState,setDepartureState] = useState('')
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
      const last=parseLocationLabel(localStorage.getItem(LAST_DEPARTURE_KEY)||'')
      if(draft){
        const dep=parseLocationLabel(draft.origin||'')
        setTitle(draft.title||''); setTitleTouched(Boolean(draft.titleTouched)); setDepartureCity(dep.city||last.city); setDepartureState(dep.state||last.state)
        setStart(draft.start||''); setEnd(draft.end||''); setHotelRequired(draft.hotelRequired??true); setVehicleRequired(draft.vehicleRequired??true); setSelected(draft.selected||[])
      } else { setDepartureCity(last.city); setDepartureState(last.state) }
    } catch { /* noop */ }
  },[])

  const chosen=useMemo(()=>available.filter(a=>selected.includes(a.id)),[available,selected])
  const destinations=useMemo(()=>{
    const seen=new Set<string>(); return chosen.filter(a=>{const k=`${a.city||''}|${a.state||''}`; if(seen.has(k))return false;seen.add(k);return true})
  },[chosen])

  useEffect(()=>{
    if(chosen.length && !titleTouched) setTitle(suggestedTripTitle(chosen))
  },[chosen,titleTouched])

  useEffect(()=>{ try{localStorage.setItem(DRAFT_KEY,JSON.stringify({title,titleTouched,origin:locationLabel(departureCity,departureState),start,end,hotelRequired,vehicleRequired,selected}))}catch{} },[title,titleTouched,departureCity,departureState,start,end,hotelRequired,vehicleRequired,selected])

  if(!open) return null

  const toggleAppointment=(id:string)=>{
    const next=selected.includes(id)?selected.filter(x=>x!==id):[...selected,id]
    setSelected(next)
    const picked=available.filter(a=>next.includes(a.id))
    if(picked.length){
      const starts=picked.map(a=>a.start).sort(); const ends=picked.map(a=>a.end).sort()
      if(!start || start>starts[0]) setStart(starts[0])
      if(!end || end<ends[ends.length-1]) setEnd(ends[ends.length-1])
    }
  }

  const save=async()=>{
    if(!title.trim()||!start||!end||!departureCity||!departureState||busy) return
    if(end<start){setError('A data final não pode ser anterior à inicial.');return}
    setBusy(true);setError(null)
    try{
      const origin=locationLabel(departureCity,departureState)
      await createTrip({title:title.trim(),origin,start,end,hotelRequired,vehicleRequired,appointmentIds:selected})
      localStorage.setItem(LAST_DEPARTURE_KEY,origin)
      localStorage.removeItem(DRAFT_KEY)
      setTitle('');setTitleTouched(false);setStart('');setEnd('');setHotelRequired(true);setVehicleRequired(true);setSelected([])
      onClose()
    }catch(e:any){setError(e?.message||'Não foi possível criar a viagem.')}
    finally{setBusy(false)}
  }

  return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&!busy&&onClose()}>
    <section className="modal-card trip-modal-card">
      <div className="modal-head"><div><span className="eyebrow">Planejamento</span><h2>Nova viagem</h2></div><button className="close" onClick={onClose}>×</button></div>

      <div className="trip-planning-block">
        <div className="modal-subhead"><div><span className="eyebrow">1. Atendimentos</span><h3>Escolha os destinos desta viagem</h3></div><span className="selection-count">{selected.length} selecionado{selected.length===1?'':'s'}</span></div>
        <div className="appointment-picker">
          {available.length===0 && <div className="soft-note">Não há atendimentos presenciais livres para vincular. Você ainda pode criar a viagem e adicionar atendimentos depois.</div>}
          {available.map(a=><button type="button" key={a.id} className={`appointment-choice ${selected.includes(a.id)?'selected':''}`} onClick={()=>toggleAppointment(a.id)}><span className="choice-check">{selected.includes(a.id)?<CheckIcon/>:<CalendarIcon/>}</span><span><strong>{a.farmName || a.client}</strong><small>{a.farmName ? `${a.client} • ` : ''}{[a.city,a.state].filter(Boolean).join('/') || 'Local não informado'} • {a.start.split('-').reverse().join('/')} → {a.end.split('-').reverse().join('/')}</small></span></button>)}
        </div>
        {destinations.length>0 && <div className="detected-destinations"><span className="section-icon neutral"><LocationIcon/></span><div><strong>Destinos detectados</strong><div className="destination-chips">{destinations.map(a=><span key={`${a.city}-${a.state}`}>{a.city}/{a.state}</span>)}</div></div></div>}
      </div>

      <div className="trip-planning-block">
        <div className="modal-subhead"><div><span className="eyebrow">2. Deslocamento</span><h3>Defina o ponto de partida e o período</h3></div></div>
        <div className="departure-location-box"><div className="departure-location-title"><LocationIcon/><div><strong>Ponto de partida</strong><small>É de onde você inicia e para onde a estimativa de rota considera o retorno.</small></div></div><div className="form-grid departure-location-grid"><LocationFields city={departureCity} state={departureState} onCityChange={setDepartureCity} onStateChange={setDepartureState} required/></div></div>
        <div className="form-grid trip-form-grid">
          <label className="field field-wide"><span>Nome da viagem *</span><input value={title} onChange={e=>{setTitle(e.target.value);setTitleTouched(true)}} placeholder={chosen.length?suggestedTripTitle(chosen):'Ex.: Goiás • Setembro'}/><small className="field-inline-hint">O Routine sugere o nome conforme os destinos. Você pode personalizar.</small></label>
          <label className="field"><span>Saída *</span><input type="date" value={start} onChange={e=>setStart(e.target.value)}/></label>
          <label className="field"><span>Retorno *</span><input type="date" value={end} onChange={e=>setEnd(e.target.value)}/></label>
        </div>
      </div>

      <div className="travel-options">
        <label className="confirm-row"><input type="checkbox" checked={hotelRequired} onChange={e=>setHotelRequired(e.target.checked)}/><span><strong>Precisa de hotel</strong><small>O Routine vai alertar antes da viagem enquanto não houver reserva confirmada.</small></span></label>
        <label className="confirm-row"><input type="checkbox" checked={vehicleRequired} onChange={e=>setVehicleRequired(e.target.checked)}/><span><strong>Precisa de veículo</strong><small>O Routine vai acompanhar o envio do Forms e a confirmação da locadora.</small></span></label>
      </div>
      <div className="draft-note">A viagem também fica salva como rascunho se você sair desta tela.</div>
      {error&&<div className="auth-message error modal-error">{error}</div>}
      <div className="modal-actions"><button className="ghost" onClick={onClose}>Fechar por enquanto</button><button className="primary" disabled={!title.trim()||!departureCity||!departureState||!start||!end||busy} onClick={()=>void save()}><RouteIcon/> {busy?'Criando...':'Criar viagem'}</button></div>
    </section>
  </div>
}
