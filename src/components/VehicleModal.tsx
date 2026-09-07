import { useEffect, useState } from 'react'
import { CarIcon, CheckIcon } from './Icons'
import { useRoutine } from '../context/RoutineContext'
import { VEHICLE_FORM_URL } from '../lib/constants'
import { tripDisplayTitle } from '../lib/tripTitle'
import type { Trip, VehicleReservation } from '../types/routine'

export function VehicleModal({trip,onClose}:{trip:Trip|null;onClose:()=>void}){
  const {saveVehicleReservation}=useRoutine(); const current=trip?.vehicles[0]
  const [status,setStatus]=useState<VehicleReservation['status']>('requested'); const [company,setCompany]=useState<''|'Localiza'|'Unidas'>(''); const [locator,setLocator]=useState(''); const [pickupAt,setPickupAt]=useState(''); const [returnAt,setReturnAt]=useState(''); const [pickupLocation,setPickupLocation]=useState(''); const [notes,setNotes]=useState(''); const [busy,setBusy]=useState(false); const [error,setError]=useState<string|null>(null)
  const key=trip?`routine-assist-vehicle-draft:${trip.id}`:''

  useEffect(()=>{
    if(!trip)return
    if(current){setStatus(current.status);setCompany(current.company||'');setLocator(current.locator||'');setPickupAt(current.pickupAt||trip.start);setReturnAt(current.returnAt||trip.end);setPickupLocation(current.pickupLocation||'');setNotes(current.notes||'');return}
    try{const d=JSON.parse(localStorage.getItem(key)||'null');setStatus(d?.status||'requested');setCompany(d?.company||'');setLocator(d?.locator||'');setPickupAt(d?.pickupAt||trip.start);setReturnAt(d?.returnAt||trip.end);setPickupLocation(d?.pickupLocation||'');setNotes(d?.notes||'')}catch{}
  },[trip?.id,current?.id])

  useEffect(()=>{if(!trip||current)return;try{localStorage.setItem(key,JSON.stringify({status,company,locator,pickupAt,returnAt,pickupLocation,notes}))}catch{}},[key,status,company,locator,pickupAt,returnAt,pickupLocation,notes,trip,current])

  if(!trip)return null
  const save=async(nextStatus=status)=>{setBusy(true);setError(null);try{await saveVehicleReservation({tripId:trip.id,reservationId:current?.id,status:nextStatus,company:company||undefined,locator:locator||undefined,pickupAt:pickupAt||undefined,returnAt:returnAt||undefined,pickupLocation:pickupLocation||undefined,notes:notes||undefined});localStorage.removeItem(key);onClose()}catch(e:any){setError(e?.message||'Não foi possível salvar o veículo.')}finally{setBusy(false)}}

  return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&!busy&&onClose()}><section className="modal-card">
    <div className="modal-head"><div><span className="eyebrow">Veículo</span><h2>{tripDisplayTitle(trip)}</h2></div><button className="close" onClick={onClose}>×</button></div>
    <a className="primary vehicle-form-cta" href={VEHICLE_FORM_URL} target="_blank" rel="noreferrer"><CarIcon/> Abrir Forms corporativo ↗</a>
    {!current && <button className="vehicle-requested-quick" disabled={busy} onClick={()=>void save('requested')}><CheckIcon/> Já enviei o Forms — marcar como solicitado</button>}
    <div className="soft-note">O Forms continua sendo o canal oficial da reserva. Aqui você acompanha se já solicitou, qual locadora foi confirmada e os dados de retirada/devolução.</div>
    <div className="form-grid vehicle-grid">
      <label className="field"><span>Status</span><select value={status} onChange={e=>setStatus(e.target.value as VehicleReservation['status'])}><option value="not_requested">Não solicitado</option><option value="requested">Solicitado / aguardando</option><option value="confirmed">Confirmado</option><option value="picked_up">Retirado</option><option value="returned">Devolvido</option></select></label>
      <label className="field"><span>Locadora</span><select value={company} onChange={e=>setCompany(e.target.value as any)}><option value="">Ainda não definida</option><option>Localiza</option><option>Unidas</option></select></label>
      <label className="field"><span>Localizador</span><input value={locator} onChange={e=>setLocator(e.target.value)} placeholder="Opcional"/></label>
      <label className="field"><span>Retirada</span><input type="date" value={pickupAt} onChange={e=>setPickupAt(e.target.value)}/></label>
      <label className="field"><span>Devolução</span><input type="date" value={returnAt} onChange={e=>setReturnAt(e.target.value)}/></label>
      <label className="field field-wide"><span>Local da retirada</span><input value={pickupLocation} onChange={e=>setPickupLocation(e.target.value)} placeholder="Ex.: Aeroporto de Uberaba"/></label>
      <label className="field field-wide"><span>Observações</span><textarea rows={3} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Ex.: retirar no balcão, categoria do veículo, observações recebidas da empresa..."/></label>
    </div>
    {current?.requestedAt && <div className="vehicle-requested-date">Solicitação registrada em <strong>{new Date(current.requestedAt).toLocaleString('pt-BR')}</strong></div>}
    {error&&<div className="auth-message error modal-error">{error}</div>}
    <div className="modal-actions"><button className="ghost" onClick={onClose}>Fechar</button><button className="primary" disabled={busy} onClick={()=>void save()}><CarIcon/> {busy?'Salvando...':'Salvar veículo'}</button></div>
  </section></div>
}
