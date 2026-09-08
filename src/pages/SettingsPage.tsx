import { useEffect, useState } from 'react'
import { BellIcon, CheckIcon, PlaneIcon, UserIcon } from '../components/Icons'
import { useAuth } from '../context/AuthContext'
import { BrandMark } from '../components/BrandMark'
import { useRoutine } from '../context/RoutineContext'
import { usePwaInstall } from '../hooks/usePwaInstall'

const options=[14,7,3,1]

export function SettingsPage(){
  const { user, signOut } = useAuth()
  const { notificationPreferences, saveNotificationPreferences, userProfile, updateUserProfile } = useRoutine()
  const [alertDays,setAlertDays]=useState(notificationPreferences.alertDays)
  const [inApp,setInApp]=useState(notificationPreferences.inAppEnabled)
  const [push,setPush]=useState(notificationPreferences.pushEnabled)
  const [fullName,setFullName]=useState('')
  const [cpf,setCpf]=useState('')
  const [phone,setPhone]=useState('')
  const [birthDate,setBirthDate]=useState('')
  const [saving,setSaving]=useState(false)
  const [savingProfile,setSavingProfile]=useState(false)
  const [message,setMessage]=useState('')
  const { installed, isIos, canPromptInstall, install } = usePwaInstall()

  useEffect(()=>{setAlertDays(notificationPreferences.alertDays);setInApp(notificationPreferences.inAppEnabled);setPush(notificationPreferences.pushEnabled)},[notificationPreferences])
  useEffect(()=>{
    setFullName(userProfile?.fullName || user?.user_metadata?.full_name || '')
    setCpf(userProfile?.cpf || '')
    setPhone(userProfile?.phone || '')
    setBirthDate(userProfile?.birthDate || '')
  },[userProfile,user])

  const requestNotifications = async () => {
    if (!('Notification' in window)) { setMessage('Este navegador não oferece notificações web.'); return }
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      setPush(true)
      new Notification('Routine Assist', { body: 'Avisos do dispositivo ativados.', icon:'/icon-192.png' })
      setMessage('Permissão concedida. Salve as preferências para manter ativado.')
    } else setMessage('A permissão não foi concedida pelo navegador.')
  }

  const toggleDay=(day:number)=>setAlertDays(days=>days.includes(day)?days.filter(d=>d!==day):[...days,day].sort((a,b)=>b-a))
  const save=async()=>{setSaving(true);setMessage('');try{await saveNotificationPreferences({alertDays:alertDays.length?alertDays:[1],inAppEnabled:inApp,pushEnabled:push});setMessage('Preferências salvas.')}catch(e:any){setMessage(e?.message||'Não foi possível salvar.')}finally{setSaving(false)}}
  const saveProfile=async()=>{
    if(!fullName.trim()||savingProfile)return
    setSavingProfile(true);setMessage('')
    try{await updateUserProfile({fullName:fullName.trim(),cpf:cpf.trim()||undefined,phone:phone.trim()||undefined,birthDate:birthDate||undefined});setMessage('Dados do passageiro salvos. Eles serão usados automaticamente nas solicitações de voo.')}catch(e:any){setMessage(e?.message||'Não foi possível salvar o perfil.')}finally{setSavingProfile(false)}
  }
  const displayName = userProfile?.fullName || user?.user_metadata?.full_name || 'Usuário'

  return <>
    <section className="page-heading"><div><span className="eyebrow">Preferências</span><h1>Configurações</h1><p>Personalize alertas, dados do passageiro e o uso do app no computador e no celular.</p></div></section>
    <div className="settings-grid">
      <section className="panel setting-card"><div className="setting-title"><BrandMark className="settings-brand-mark"/><div><h2>{displayName}</h2><p>{user?.email}</p></div></div><button className="secondary" onClick={()=>void signOut()}>Sair da conta</button></section>

      <section className="panel setting-card setting-wide passenger-profile-card">
        <div className="setting-title"><UserIcon/><div><h2>Dados do passageiro</h2><p>Preencha uma vez. O Routine usa estes dados automaticamente no e-mail de solicitação de passagem aérea.</p></div></div>
        <div className="form-grid profile-grid"><label className="field field-wide"><span>Nome completo *</span><input value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Nome completo"/></label><label className="field"><span>CPF</span><input value={cpf} onChange={e=>setCpf(e.target.value)} placeholder="000.000.000-00"/></label><label className="field"><span>Telefone</span><input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="(00) 00000-0000"/></label><label className="field"><span>Data de nascimento</span><input type="date" value={birthDate} onChange={e=>setBirthDate(e.target.value)}/></label></div>
        <div className="profile-flight-note"><PlaneIcon/><span>Esses dados são usados apenas para montar a solicitação no Outlook. A reserva continua sendo feita pela empresa.</span></div>
        <button className="primary compact" disabled={!fullName.trim()||savingProfile} onClick={()=>void saveProfile()}>{savingProfile?'Salvando...':'Salvar dados do passageiro'}</button>
      </section>

      <section className="panel setting-card setting-wide"><div className="setting-title"><BellIcon/><div><h2>Alertas antecipados</h2><p>Escolha quando o Routine deve começar a cobrar hotel, veículo e passagem pendentes.</p></div></div>
        <div className="preference-toggle-row"><span><strong>Alertas dentro do app</strong><small>Mostra pendências no dashboard e no sino.</small></span><input type="checkbox" checked={inApp} onChange={e=>setInApp(e.target.checked)}/></div>
        <div className="alert-day-picker">{options.map(day=><button type="button" className={alertDays.includes(day)?'active':''} onClick={()=>toggleDay(day)} key={day}><span>{alertDays.includes(day)&&<CheckIcon/>}</span>{day} {day===1?'dia':'dias'} antes</button>)}</div>
      </section>

      <section className="panel setting-card"><div className="setting-title"><BellIcon/><div><h2>Notificações do dispositivo</h2><p>Avisos do navegador/PWA quando o Routine estiver ativo.</p></div></div>
        <div className="preference-toggle-row"><span><strong>Ativar avisos</strong><small>{typeof window!=='undefined' && 'Notification' in window ? `Permissão: ${Notification.permission}` : 'Não suportado'}</small></span><input type="checkbox" checked={push} onChange={e=>setPush(e.target.checked)}/></div>
        <button className="secondary" onClick={()=>void requestNotifications()}>Solicitar permissão do navegador</button>
      </section>

      <section className="panel setting-card setting-wide"><div className="setting-title"><BrandMark className="settings-brand-mark"/><div><h2>Instalar Routine Assist</h2><p>Use o sistema como aplicativo no celular ou no computador.</p></div></div>
        {installed ? <div className="soft-note"><strong>Routine Assist já está instalado neste dispositivo.</strong><br/>Você pode abri-lo pela tela inicial/menu de aplicativos.</div> : <>
          <div className="soft-note">{isIos ? 'No iPhone, abra o Routine Assist no Safari, toque em Compartilhar e escolha “Adicionar à Tela de Início”.' : canPromptInstall ? 'Este navegador já permite instalar o Routine Assist como aplicativo.' : 'Em HTTPS na Vercel, Chrome e Edge normalmente liberam a instalação.'}</div>
          <button className="secondary" disabled={!canPromptInstall} onClick={async()=>{const result=await install();if(result==='accepted')setMessage('Instalação iniciada.');else if(result==='dismissed')setMessage('Instalação cancelada.');else setMessage(isIos?'No iPhone use Safari → Compartilhar → Adicionar à Tela de Início.':'A instalação ainda não foi liberada por este navegador.')}}>{canPromptInstall?'Instalar Routine Assist':'Instalação pelo navegador'}</button>
        </>}
      </section>

      <section className="panel setting-card"><div className="setting-title"><BrandMark className="settings-brand-mark"/><div><h2>Integração Control Tech</h2><p>Banco preparado para vincular usuário e fazenda futuramente.</p></div></div><span className="status waiting_info">Preparado</span></section>
    </div>
    <div className="settings-savebar">{message&&<span>{message}</span>}<button className="primary" disabled={saving} onClick={()=>void save()}>{saving?'Salvando...':'Salvar preferências'}</button></div>
  </>
}
