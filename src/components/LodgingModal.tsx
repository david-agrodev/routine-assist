import { differenceInCalendarDays, parseISO } from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import { HotelIcon, LocationIcon } from './Icons'
import { LocationFields } from './LocationFields'
import { useRoutine } from '../context/RoutineContext'
import { formatMoney } from '../lib/format'
import type { Lodging, Trip } from '../types/routine'

export function LodgingModal({ trip, lodging, onClose }: { trip: Trip|null; lodging?: Lodging|null; onClose:()=>void }){
  const { addLodging, hotels }=useRoutine()
  const [hotelId,setHotelId]=useState('')
  const [name,setName]=useState(''); const [address,setAddress]=useState(''); const [city,setCity]=useState(''); const [state,setState]=useState(''); const [phone,setPhone]=useState('')
  const [checkIn,setCheckIn]=useState(''); const [checkOut,setCheckOut]=useState(''); const [mode,setMode]=useState<'daily'|'total'>('daily')
  const [daily,setDaily]=useState(''); const [total,setTotal]=useState(''); const [code,setCode]=useState(''); const [confirmed,setConfirmed]=useState(true); const [notes,setNotes]=useState('')
  const [busy,setBusy]=useState(false); const [error,setError]=useState<string|null>(null)
  const key=trip?`routine-assist-lodging-draft:${trip.id}:${lodging?.id||'new'}`:''

  useEffect(()=>{
    if(!trip)return
    if(lodging){
      setHotelId(lodging.hotelId||''); setName(lodging.name||''); setAddress(lodging.address||''); setCity(lodging.city||''); setState(lodging.state||''); setPhone(lodging.phone||'')
      setCheckIn(lodging.checkIn); setCheckOut(lodging.checkOut); setMode(lodging.pricingMode); setDaily(lodging.dailyValue?.toString().replace('.',',')||''); setTotal(lodging.totalValue?.toString().replace('.',',')||''); setCode(lodging.reservationCode||''); setConfirmed(lodging.confirmed); setNotes(lodging.notes||'')
      return
    }
    try{
      const d=JSON.parse(localStorage.getItem(key)||'null')
      setHotelId(d?.hotelId||''); setName(d?.name||''); setAddress(d?.address||''); setCity(d?.city||trip.appointments[0]?.city||''); setState(d?.state||trip.appointments[0]?.state||''); setPhone(d?.phone||'')
      setCheckIn(d?.checkIn||trip.start); setCheckOut(d?.checkOut||trip.end); setMode(d?.mode||'daily'); setDaily(d?.daily||''); setTotal(d?.total||''); setCode(d?.code||''); setConfirmed(d?.confirmed??true); setNotes(d?.notes||'')
    }catch{}
  },[trip?.id,lodging?.id])

  useEffect(()=>{
    if(!trip || lodging)return
    try{localStorage.setItem(key,JSON.stringify({hotelId,name,address,city,state,phone,checkIn,checkOut,mode,daily,total,code,confirmed,notes}))}catch{}
  },[key,hotelId,name,address,city,state,phone,checkIn,checkOut,mode,daily,total,code,confirmed,notes,trip,lodging])

  const nights = useMemo(()=> checkIn && checkOut ? Math.max(0,differenceInCalendarDays(parseISO(checkOut),parseISO(checkIn))) : 0,[checkIn,checkOut])
  const dailyNumber = Number(daily.replace(',','.')) || 0
  const estimatedTotal = mode==='daily' ? nights*dailyNumber : Number(total.replace(',','.'))||0

  if(!trip)return null

  const chooseHotel=(id:string)=>{
    setHotelId(id)
    const h=hotels.find(item=>item.id===id)
    if(!h)return
    setName(h.name); setAddress(h.address||''); setCity(h.city||''); setState(h.state||''); setPhone(h.phone||'')
  }

  const save=async()=>{
    if(!name.trim()||!checkIn||!checkOut||busy)return
    if(checkOut<checkIn){setError('O check-out não pode ser anterior ao check-in.');return}
    setBusy(true);setError(null)
    try{
      await addLodging({tripId:trip.id,reservationId:lodging?.id,hotelId:hotelId||lodging?.hotelId,hotelName:name,address:address||undefined,city:city||undefined,state:state||undefined,phone:phone||undefined,checkIn,checkOut,pricingMode:mode,dailyValue:mode==='daily'&&daily?dailyNumber:undefined,totalValue:mode==='total'&&total?Number(total.replace(',','.')):undefined,reservationCode:code||undefined,confirmed,notes:notes||undefined})
      localStorage.removeItem(key);onClose()
    }catch(e:any){setError(e?.message||'Não foi possível salvar a hospedagem.')}finally{setBusy(false)}
  }

  return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&!busy&&onClose()}><section className="modal-card lodging-modal-card">
    <div className="modal-head"><div><span className="eyebrow">Hospedagem</span><h2>{lodging?'Editar hospedagem':trip.title}</h2></div><button className="close" onClick={onClose}>×</button></div>

    {hotels.length>0 && <label className="field field-wide saved-hotel-field"><span>Usar hotel já cadastrado</span><select value={hotelId} onChange={e=>chooseHotel(e.target.value)}><option value="">Cadastrar/usar outro hotel</option>{hotels.map(h=><option key={h.id} value={h.id}>{h.name}{h.city?` • ${h.city}/${h.state||''}`:''}</option>)}</select></label>}

    <div className="form-grid lodging-grid">
      <label className="field field-wide"><span>Hotel *</span><input value={name} onChange={e=>{setName(e.target.value); if(hotelId)setHotelId('')}} placeholder="Nome do hotel"/></label>
      <LocationFields city={city} state={state} onCityChange={setCity} onStateChange={setState}/>
      <label className="field field-wide"><span>Endereço</span><input value={address} onChange={e=>setAddress(e.target.value)} placeholder="Rua, número, bairro"/></label>
      <label className="field"><span>Telefone</span><input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Opcional"/></label>
      <label className="field"><span>Check-in *</span><input type="date" value={checkIn} onChange={e=>setCheckIn(e.target.value)}/></label>
      <label className="field"><span>Check-out *</span><input type="date" value={checkOut} onChange={e=>setCheckOut(e.target.value)}/></label>
      <label className="field"><span>Cobrança</span><select value={mode} onChange={e=>setMode(e.target.value as 'daily'|'total')}><option value="daily">Valor por diária</option><option value="total">Valor total</option></select></label>
      {mode==='daily'?<label className="field"><span>Valor da diária</span><input inputMode="decimal" value={daily} onChange={e=>setDaily(e.target.value)} placeholder="185,00"/></label>:<label className="field"><span>Valor total</span><input inputMode="decimal" value={total} onChange={e=>setTotal(e.target.value)} placeholder="690,00"/></label>}
      <label className="field"><span>Nº da reserva</span><input value={code} onChange={e=>setCode(e.target.value)} placeholder="Opcional"/></label>
      <label className="field field-wide"><span>Observações</span><textarea rows={3} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Ex.: café incluso, estacionamento, horário de check-in..."/></label>
    </div>

    <div className="lodging-cost-preview"><div><span>{nights} {nights===1?'noite':'noites'}</span><strong>{estimatedTotal>0?formatMoney(estimatedTotal):'Valor ainda não informado'}</strong></div>{address&&<a target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}><LocationIcon/> Ver no Maps</a>}</div>

    <label className="confirm-row"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/><span><strong>Reserva confirmada</strong><small>Se ainda estiver cotando, desmarque e o alerta continuará ativo.</small></span></label>
    {error&&<div className="auth-message error modal-error">{error}</div>}
    <div className="modal-actions"><button className="ghost" onClick={onClose}>Fechar</button><button className="primary" disabled={!name.trim()||busy} onClick={()=>void save()}><HotelIcon/> {busy?'Salvando...':lodging?'Salvar alterações':'Salvar hospedagem'}</button></div>
  </section></div>
}
