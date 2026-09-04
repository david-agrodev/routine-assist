import { useMemo, useState } from 'react'
import { CalendarIcon, CheckIcon } from './Icons'
import { useRoutine } from '../context/RoutineContext'
import type { Trip } from '../types/routine'

export function LinkAppointmentsModal({trip,onClose}:{trip:Trip|null;onClose:()=>void}){
  const {appointments,trips,linkAppointmentsToTrip}=useRoutine(); const [selected,setSelected]=useState<string[]>([]); const [busy,setBusy]=useState(false); const [error,setError]=useState<string|null>(null)
  const available=useMemo(()=>{const linked=new Set(trips.flatMap(t=>t.appointments.map(a=>a.id)));return appointments.filter(a=>a.type==='Presencial'&&!linked.has(a.id))},[appointments,trips])
  if(!trip)return null
  const save=async()=>{if(!selected.length)return;setBusy(true);setError(null);try{await linkAppointmentsToTrip(trip.id,selected);onClose()}catch(e:any){setError(e?.message||'Não foi possível vincular os atendimentos.')}finally{setBusy(false)}}
  return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&!busy&&onClose()}><section className="modal-card"><div className="modal-head"><div><span className="eyebrow">Viagem</span><h2>Adicionar atendimentos</h2></div><button className="close" onClick={onClose}>×</button></div><div className="appointment-picker">{available.length===0&&<div className="soft-note">Todos os atendimentos presenciais já estão vinculados a alguma viagem.</div>}{available.map(a=><button type="button" key={a.id} className={`appointment-choice ${selected.includes(a.id)?'selected':''}`} onClick={()=>setSelected(current=>current.includes(a.id)?current.filter(x=>x!==a.id):[...current,a.id])}><span className="choice-check">{selected.includes(a.id)?<CheckIcon/>:<CalendarIcon/>}</span><span><strong>{a.client}</strong><small>{[a.city,a.state].filter(Boolean).join('/')} • {a.start.split('-').reverse().join('/')} → {a.end.split('-').reverse().join('/')}</small></span></button>)}</div>{error&&<div className="auth-message error modal-error">{error}</div>}<div className="modal-actions"><button className="ghost" onClick={onClose}>Cancelar</button><button className="primary" disabled={!selected.length||busy} onClick={()=>void save()}>{busy?'Vinculando...':'Adicionar à viagem'}</button></div></section></div>
}
