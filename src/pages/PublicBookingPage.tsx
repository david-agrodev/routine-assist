import { useEffect, useMemo, useRef, useState } from 'react'
import { eachDayOfInterval, format, isWeekend, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useParams } from 'react-router-dom'
import { BrandMark } from '../components/BrandMark'
import { PublicAvailabilityCalendar } from '../components/PublicAvailabilityCalendar'
import {
  AlertIcon,
  ArrowIcon,
  BuildingIcon,
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  CollarIcon,
  DownloadIcon,
  FarmIcon,
  LockIcon,
  PhoneIcon,
  RequestIcon,
  SendIcon,
  UserIcon,
} from '../components/Icons'
import { LocationFields } from '../components/LocationFields'
import { getBrazilHolidaysForYears } from '../services/holidays'
import { getSpecialDatesForYears } from '../services/specialDates'
import { submitPublicBookingRequest } from '../services/routine'
import type { Holiday, SubmitBookingRequestInput } from '../types/routine'

const emptyForm: SubmitBookingRequestInput = {
  central: '', requesterName: '', requesterEmail: '', requesterPhone: '', clientName: '', farmName: '',
  city: '', state: '', commercialResponsible: '', quantityCollars: 0, extraAntennaCount: 0, appointmentType: 'onsite',
  start: '', end: '', preferredStartTime: '', preferredEndTime: '', notes: '', holidayAcknowledged: false, website: '',
}

function dedupeDates(items: Holiday[]) {
  const map = new Map<string, Holiday>()
  items.forEach(item => {
    const current = map.get(item.date)
    if (!current || current.type === 'commemorative') map.set(item.date, item)
  })
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date))
}

function formatBrazilPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (!digits) return ''
  if (digits.length < 3) return `(${digits}`
  const areaCode = digits.slice(0, 2)
  const number = digits.slice(2)
  if (number.length <= 4) return `(${areaCode}) ${number}`
  if (digits.length <= 10) return `(${areaCode}) ${number.slice(0, 4)}-${number.slice(4)}`
  return `(${areaCode}) ${number.slice(0, 5)}-${number.slice(5)}`
}

function equipmentSummary(form: SubmitBookingRequestInput) {
  const items = []
  if (form.quantityCollars > 0) items.push(`${form.quantityCollars} ${form.quantityCollars === 1 ? 'colar' : 'colares'}`)
  if (form.extraAntennaCount > 0) items.push(`${form.extraAntennaCount} ${form.extraAntennaCount === 1 ? 'antena adicional' : 'antenas adicionais'}`)
  return items.join(' + ') || 'Não informado'
}

function requestSummary(code: string, form: SubmitBookingRequestInput, central: string) {
  const period = form.start === form.end
    ? format(parseISO(form.start), 'dd/MM/yyyy')
    : `${format(parseISO(form.start), 'dd/MM/yyyy')} a ${format(parseISO(form.end), 'dd/MM/yyyy')}`
  return [
    '*SOLICITAÇÃO DE ATENDIMENTO*',
    `Protocolo: ${code}`,
    '',
    `Período: ${period}`,
    `Solicitante: ${form.requesterName}`,
    `Central: ${central}`,
    `Cliente: ${form.clientName}`,
    `Fazenda: ${form.farmName}`,
    `Local: ${form.city}/${form.state}`,
    `Comercial: ${form.commercialResponsible}`,
    `Equipamentos: ${equipmentSummary(form)}`,
    `Atendimento: ${form.appointmentType === 'remote' ? 'Remoto' : 'Presencial'}`,
    form.notes?.trim() ? `Observações: ${form.notes.trim()}` : '',
    '',
    'Aguardando aprovação no Routine Assist.',
  ].filter(line => line !== '').join('\n')
}

export function PublicBookingPage() {
  const { token = '' } = useParams()
  const [form, setForm] = useState<SubmitBookingRequestInput>(emptyForm)
  const [specialDates, setSpecialDates] = useState<Holiday[]>([])
  const [error, setError] = useState('')
  const [invalidLink, setInvalidLink] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [successCode, setSuccessCode] = useState('')
  const [availabilityVersion, setAvailabilityVersion] = useState(0)
  const [customCentral, setCustomCentral] = useState('')
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [submittedAt, setSubmittedAt] = useState<Date | null>(null)
  const mainRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const currentYear = new Date().getFullYear()
    const years = [currentYear, currentYear + 1, currentYear + 2]
    const localDates = getSpecialDatesForYears(years)
    setSpecialDates(localDates)
    void getBrazilHolidaysForYears(years)
      .then(holidays => setSpecialDates(dedupeDates([...holidays, ...localDates])))
      .catch(() => setSpecialDates(localDates))
  }, [])

  const selectedWarnings = useMemo(() => {
    if (!form.start || !form.end) return [] as Holiday[]
    const named = specialDates.filter(item => item.date >= form.start && item.date <= form.end)
    const hasWeekend = eachDayOfInterval({ start: parseISO(form.start), end: parseISO(form.end) }).some(date => isWeekend(date))
    return hasWeekend ? [...named, { date: form.start, name: 'O período inclui fim de semana', type: 'weekend' }] : named
  }, [form.start, form.end, specialDates])

  const update = <K extends keyof SubmitBookingRequestInput>(key: K, value: SubmitBookingRequestInput[K]) => {
    setForm(current => ({ ...current, [key]: value }))
    if (error) setError('')
  }

  const effectiveCentral = form.central === 'Outra central' ? customCentral.trim() : form.central
  const periodReady = Boolean(form.start && form.end)
  const warningsAccepted = selectedWarnings.length === 0 || form.holidayAcknowledged
  const dateStepReady = periodReady && warningsAccepted
  const phoneDigits = (form.requesterPhone || '').replace(/\D/g, '')
  const phoneReady = !phoneDigits || phoneDigits.length === 10 || phoneDigits.length === 11
  const emailReady = !form.requesterEmail?.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.requesterEmail.trim())
  const requesterReady = Boolean(effectiveCentral && form.requesterName.trim() && phoneReady && emailReady)
  const remoteTimesReady = form.appointmentType !== 'remote'
    || (!form.preferredStartTime && !form.preferredEndTime)
    || Boolean(form.preferredStartTime && form.preferredEndTime && form.preferredEndTime > form.preferredStartTime)
  const equipmentReady = form.quantityCollars > 0 || form.extraAntennaCount > 0
  const attendanceReady = Boolean(
    form.clientName.trim() && form.farmName.trim() && form.city.trim() && form.state
    && form.commercialResponsible.trim() && equipmentReady && remoteTimesReady
  )
  const ready = dateStepReady && requesterReady && attendanceReady

  const goToStep = (nextStep: 1 | 2 | 3) => {
    setStep(nextStep)
    setError('')
    if (window.innerWidth <= 960) {
      window.requestAnimationFrame(() => mainRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    }
  }

  const continueFromDates = () => {
    if (!periodReady) return setError('Selecione a data inicial e a data final para continuar.')
    if (!warningsAccepted) return setError('Confirme o aviso do período selecionado para continuar.')
    goToStep(2)
  }

  const continueFromRequester = () => {
    if (!effectiveCentral || !form.requesterName.trim()) return setError('Informe a central e o nome do solicitante para continuar.')
    if (!phoneReady) return setError('Informe um telefone com DDD válido ou deixe o campo vazio.')
    if (!emailReady) return setError('Informe um e-mail válido ou deixe o campo vazio.')
    goToStep(3)
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!ready || submitting) {
      setError('Revise os dados obrigatórios do atendimento antes de enviar.')
      return
    }
    if (form.appointmentType === 'remote' && Boolean(form.preferredStartTime) !== Boolean(form.preferredEndTime)) {
      setError('Para informar um horário remoto, preencha início e fim.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const result = await submitPublicBookingRequest(token, { ...form, central: effectiveCentral })
      setSubmittedAt(new Date())
      setSuccessCode(result.code)
    } catch (submissionError: any) {
      const message = submissionError?.message || 'Não foi possível enviar sua solicitação.'
      setError(message)
      if (/per[ií]odo|indispon[ií]vel/i.test(message)) {
        setForm(current => ({ ...current, start: '', end: '', holidayAcknowledged: false }))
        setAvailabilityVersion(value => value + 1)
        setStep(1)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const startAnotherRequest = () => {
    setForm({
      ...emptyForm,
      central: form.central,
      requesterName: form.requesterName,
      requesterEmail: form.requesterEmail,
      requesterPhone: form.requesterPhone,
    })
    setSuccessCode('')
    setSubmittedAt(null)
    setStep(1)
    setAvailabilityVersion(value => value + 1)
  }

  const shareOnWhatsapp = () => {
    const text = requestSummary(successCode, form, effectiveCentral)
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }

  const downloadReceipt = async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 760
    canvas.height = 1240
    const context = canvas.getContext('2d')
    if (!context) return

    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.strokeStyle = '#d7cdc6'
    context.lineWidth = 3
    context.strokeRect(20, 20, canvas.width - 40, canvas.height - 40)
    context.textAlign = 'center'
    context.fillStyle = '#cf7046'
    context.font = '700 24px Arial'
    context.fillText('ROUTINE ASSIST', 380, 78)
    context.fillStyle = '#242321'
    context.font = '700 32px Arial'
    context.fillText('COMPROVANTE DE SOLICITAÇÃO', 380, 122)
    context.fillStyle = '#716a64'
    context.font = '18px Arial'
    context.fillText('Documento de recebimento para análise', 380, 154)

    const dashedLine = (y: number) => {
      context.save()
      context.setLineDash([8, 8])
      context.strokeStyle = '#bdb4ad'
      context.beginPath()
      context.moveTo(55, y)
      context.lineTo(705, y)
      context.stroke()
      context.restore()
    }
    dashedLine(184)

    let y = 225
    const row = (label: string, value: string) => {
      context.textAlign = 'left'
      context.fillStyle = '#7a736d'
      context.font = '700 16px Arial'
      context.fillText(label.toUpperCase(), 62, y)
      context.fillStyle = '#242321'
      context.font = '700 20px Arial'
      const words = value.split(/\s+/)
      let line = ''
      const lines: string[] = []
      words.forEach(word => {
        const next = line ? `${line} ${word}` : word
        if (context.measureText(next).width > 630 && line) { lines.push(line); line = word } else line = next
      })
      if (line) lines.push(line)
      lines.forEach((item, index) => context.fillText(item, 62, y + 27 + index * 25))
      y += 62 + Math.max(0, lines.length - 1) * 25
    }

    row('Protocolo', successCode)
    row('Recebido em', format(submittedAt || new Date(), "dd/MM/yyyy 'às' HH:mm"))
    dashedLine(y - 18)
    row('Período solicitado', form.start === form.end ? format(parseISO(form.start), 'dd/MM/yyyy') : `${format(parseISO(form.start), 'dd/MM/yyyy')} a ${format(parseISO(form.end), 'dd/MM/yyyy')}`)
    row('Solicitante', form.requesterName)
    row('Central', effectiveCentral)
    row('Cliente', form.clientName)
    row('Fazenda', form.farmName)
    row('Local', `${form.city}/${form.state}`)
    row('Responsável comercial', form.commercialResponsible)
    row('Equipamentos', equipmentSummary(form))
    row('Atendimento', form.appointmentType === 'remote' ? 'Remoto' : 'Presencial')
    dashedLine(y - 18)
    context.textAlign = 'center'
    context.fillStyle = '#8b5d46'
    context.font = '700 19px Arial'
    context.fillText('AGUARDANDO APROVAÇÃO', 380, y + 12)
    context.fillStyle = '#716a64'
    context.font = '17px Arial'
    context.fillText('As datas ficam reservadas provisoriamente.', 380, y + 44)
    context.fillText('Este comprovante não confirma o atendimento.', 380, y + 70)
    context.font = '15px Arial'
    context.fillText('Gerado pelo Routine Assist', 380, 1170)

    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `comprovante-${successCode}.png`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  if (invalidLink || !token) return <main className="public-booking-page public-booking-state">
    <section><span className="public-state-icon"><LockIcon/></span><h1>Link indisponível</h1><p>Este link de solicitação não existe ou foi desativado. Peça um novo link ao responsável pela agenda.</p></section>
  </main>

  if (successCode) return <main className="public-booking-page public-booking-state public-receipt-state success">
    <section className="public-success-panel">
      <BrandMark className="public-brand-mark"/>
      <span className="public-state-icon"><CheckIcon/></span>
      <span className="eyebrow">Solicitação recebida</span>
      <h1>Período reservado para análise.</h1>
      <p>Sua solicitação bloqueou provisoriamente as datas escolhidas. O responsável ainda precisa aprovar o atendimento.</p>
      <div className="public-receipt-preview">
        <small>Routine Assist</small><strong>COMPROVANTE</strong><i/>
        <dl>
          <div><dt>Protocolo</dt><dd>{successCode}</dd></div>
          <div><dt>Período</dt><dd>{form.start === form.end ? format(parseISO(form.start), 'dd/MM/yyyy') : `${format(parseISO(form.start), 'dd/MM/yyyy')} a ${format(parseISO(form.end), 'dd/MM/yyyy')}`}</dd></div>
          <div><dt>Fazenda</dt><dd>{form.farmName}</dd></div>
          <div><dt>Local</dt><dd>{form.city}/{form.state}</dd></div>
          <div><dt>Equipamentos</dt><dd>{equipmentSummary(form)}</dd></div>
        </dl>
        <i/><b>Aguardando aprovação</b>
      </div>
      <div className="public-success-actions">
        <button className="whatsapp-action" type="button" onClick={shareOnWhatsapp}><SendIcon/> Compartilhar no WhatsApp</button>
        <button className="secondary" type="button" onClick={() => void downloadReceipt()}><DownloadIcon/> Baixar comprovante</button>
        <button className="primary" type="button" onClick={startAnotherRequest}><RequestIcon/> Solicitar outro atendimento</button>
      </div>
      <small className="public-preserved-note">Ao solicitar outro atendimento, seus dados de contato serão mantidos.</small>
    </section>
  </main>

  return <main className="public-booking-page">
    <header className="public-booking-header">
      <div className="public-booking-brand"><BrandMark className="public-brand-mark"/><div><strong>Routine Assist</strong><span>Solicitação de agenda</span></div></div>
      <span className="public-secure-label"><LockIcon/> Disponibilidade protegida</span>
    </header>

    <section className="public-booking-intro">
      <span className="eyebrow">Planejamento de atendimento</span>
      <h1>Solicite uma data para sua fazenda.</h1>
      <p>Consulte os dias livres, informe os dados do atendimento e envie para análise. A data só será confirmada após aprovação.</p>
      <div className="public-booking-steps" aria-label="Etapas da solicitação">
        <span className={step === 1 ? 'active' : 'done'}><i>{step > 1 ? <CheckIcon/> : '1'}</i><b>Datas</b></span>
        <span className={step === 2 ? 'active' : step > 2 ? 'done' : ''}><i>{step > 2 ? <CheckIcon/> : '2'}</i><b>Solicitante</b></span>
        <span className={step === 3 ? 'active' : ''}><i>3</i><b>Atendimento</b></span>
      </div>
    </section>

    <form className="public-booking-layout" onSubmit={submit}>
      <div className="public-booking-main" ref={mainRef}>
        {step === 1 && <div className="public-step-content">
          <PublicAvailabilityCalendar
            key={`${token}-${availabilityVersion}`}
            token={token}
            start={form.start}
            end={form.end}
            specialDates={specialDates}
            onChange={(start, end) => setForm(current => ({ ...current, start, end, holidayAcknowledged: false }))}
            onError={setError}
            onInvalidLink={() => setInvalidLink(true)}
          />

          {selectedWarnings.length > 0 && <div className="public-date-warning">
            <AlertIcon/>
            <div><strong>Atenção ao período escolhido</strong><span>{[...new Set(selectedWarnings.map(item => item.name))].join(' • ')}. A solicitação pode ser enviada, mas está sujeita à disponibilidade de atendimento.</span>
              <label><input type="checkbox" checked={form.holidayAcknowledged} onChange={event => update('holidayAcknowledged', event.target.checked)}/> Estou ciente e quero solicitar essas datas.</label>
            </div>
          </div>}
        </div>}

        {step === 2 && <section className="public-form-card public-stage-card">
          <div className="public-calendar-heading">
            <span className="public-section-icon person"><RequestIcon/></span>
            <div><span className="eyebrow">Etapa 2 de 3</span><h2>Quem está solicitando?</h2><p>Usaremos estes dados apenas para analisar e retornar sobre o atendimento.</p></div>
          </div>
          <div className="public-form-grid">
            <label className="field"><span>Central *</span><select value={form.central} onChange={event => update('central', event.target.value)}><option value="">Selecione</option><option>ALTA Genetics</option><option>GENEX Brasil</option><option>Outra central</option></select></label>
            {form.central === 'Outra central' && <label className="field"><span>Nome da central *</span><input value={customCentral} onChange={event => setCustomCentral(event.target.value)} placeholder="Informe a central"/></label>}
            <label className="field"><span><UserIcon/> Seu nome *</span><input value={form.requesterName} onChange={event => update('requesterName', event.target.value)} placeholder="Nome de quem solicita"/></label>
            <label className="field"><span><PhoneIcon/> Telefone / WhatsApp <small>Opcional</small></span><input type="tel" inputMode="tel" autoComplete="tel" maxLength={15} value={form.requesterPhone} onChange={event => update('requesterPhone', formatBrazilPhone(event.target.value))} placeholder="(00) 00000-0000"/></label>
            <label className="field"><span>E-mail <small>Opcional</small></span><input type="email" autoComplete="email" value={form.requesterEmail} onChange={event => update('requesterEmail', event.target.value)} placeholder="nome@empresa.com"/></label>
          </div>
        </section>}

        {step === 3 && <section className="public-form-card public-stage-card">
          <div className="public-calendar-heading">
            <span className="public-section-icon farm"><FarmIcon/></span>
            <div><span className="eyebrow">Etapa 3 de 3</span><h2>Dados do atendimento</h2><p>Preencha os dados do cliente e da fazenda para enviar a solicitação completa.</p></div>
          </div>
          <div className="public-form-grid">
            <label className="field"><span><UserIcon/> Cliente *</span><input value={form.clientName} onChange={event => update('clientName', event.target.value)} placeholder="Nome do cliente"/></label>
            <label className="field"><span><FarmIcon/> Fazenda *</span><input value={form.farmName} onChange={event => update('farmName', event.target.value)} placeholder="Nome da fazenda"/></label>
            <LocationFields city={form.city} state={form.state} onCityChange={value => update('city', value)} onStateChange={value => update('state', value)} required/>
            <label className="field"><span><BuildingIcon/> Responsável comercial *</span><input value={form.commercialResponsible} onChange={event => update('commercialResponsible', event.target.value)} placeholder="Nome do responsável"/></label>
          </div>

          <div className="public-equipment-group">
            <div><CollarIcon/><span><strong>Equipamentos</strong><small>Informe pelo menos colares ou antenas adicionais.</small></span></div>
            <div className="public-equipment-inputs">
              <label className="field"><span>Quantidade de colares</span><input type="number" min="0" value={form.quantityCollars || ''} onChange={event => update('quantityCollars', Math.max(0, Number(event.target.value)))} placeholder="Ex.: 300"/></label>
              <label className="field"><span>Antenas adicionais</span><input type="number" min="0" value={form.extraAntennaCount || ''} onChange={event => update('extraAntennaCount', Math.max(0, Number(event.target.value)))} placeholder="Ex.: 2"/></label>
            </div>
          </div>

          <div className="public-service-choice">
            <span>Tipo de atendimento *</span>
            <div>
              <button type="button" className={form.appointmentType === 'onsite' ? 'active' : ''} onClick={() => update('appointmentType', 'onsite')}><FarmIcon/><span><strong>Presencial</strong><small>Atendimento na fazenda</small></span></button>
              <button type="button" className={form.appointmentType === 'remote' ? 'active' : ''} onClick={() => update('appointmentType', 'remote')}><PhoneIcon/><span><strong>Remoto</strong><small>Atendimento à distância</small></span></button>
            </div>
          </div>

          {form.appointmentType === 'remote' && <div className="public-remote-time">
            <ClockIcon/><div><strong>Horário preferencial</strong><small>Opcional. A confirmação dependerá da agenda.</small></div>
            <label className="field"><span>Início</span><input type="time" value={form.preferredStartTime} onChange={event => update('preferredStartTime', event.target.value)}/></label>
            <label className="field"><span>Fim</span><input type="time" value={form.preferredEndTime} onChange={event => update('preferredEndTime', event.target.value)}/></label>
          </div>}

          <label className="field public-notes"><span>Observações</span><textarea value={form.notes} onChange={event => update('notes', event.target.value)} placeholder="Informações adicionais importantes para o atendimento"/></label>
          <label className="public-honeypot" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={event => update('website', event.target.value)}/></label>
        </section>}
      </div>

      <aside className="public-booking-summary">
        <span className="eyebrow">Resumo</span><h2>Sua solicitação</h2>
        <div className={`public-summary-row ${periodReady ? 'ready' : ''}`}><CalendarIcon/><span><small>Período</small><strong>{periodReady ? `${format(parseISO(form.start), 'dd/MM/yyyy')} a ${format(parseISO(form.end), 'dd/MM/yyyy')}` : 'Ainda não selecionado'}</strong></span></div>
        <div className={`public-summary-row ${form.requesterName ? 'ready' : ''}`}><UserIcon/><span><small>Solicitante</small><strong>{form.requesterName || 'Não informado'}</strong></span></div>
        <div className={`public-summary-row ${effectiveCentral ? 'ready' : ''}`}><BuildingIcon/><span><small>Central</small><strong>{effectiveCentral || 'Não informada'}</strong></span></div>
        <div className={`public-summary-row ${form.farmName ? 'ready' : ''}`}><FarmIcon/><span><small>Fazenda</small><strong>{form.farmName || 'Não informada'}</strong></span></div>
        <div className={`public-summary-row ${equipmentReady ? 'ready' : ''}`}><CollarIcon/><span><small>Equipamentos</small><strong>{equipmentSummary(form)}</strong></span></div>
        <div className="public-summary-row ready"><PhoneIcon/><span><small>Atendimento</small><strong>{form.appointmentType === 'remote' ? 'Remoto' : 'Presencial'}</strong></span></div>
        <div className="public-summary-notice"><LockIcon/><span>Ao enviar, as datas ficam bloqueadas até a aprovação ou reprovação.</span></div>
        {error && <div className="public-submit-error" role="alert"><AlertIcon/><span>{error}</span></div>}
        <div className={`public-summary-actions ${step > 1 ? 'with-back' : ''}`}>
          {step > 1 && <button className="secondary public-back" type="button" onClick={() => goToStep(step === 3 ? 2 : 1)}><ArrowIcon/> Voltar</button>}
          {step === 1 && <button className="primary public-submit" type="button" disabled={!dateStepReady} onClick={continueFromDates}>Continuar <ArrowIcon/></button>}
          {step === 2 && <button className="primary public-submit" type="button" disabled={!requesterReady} onClick={continueFromRequester}>Próxima etapa <ArrowIcon/></button>}
          {step === 3 && <button className="primary public-submit" type="submit" disabled={!ready || submitting}><SendIcon/>{submitting ? 'Enviando...' : 'Enviar solicitação'}</button>}
        </div>
        <small className="public-submit-help">Etapa {step} de 3. O envio não confirma automaticamente o atendimento.</small>
      </aside>
    </form>

    <footer className="public-booking-footer"><BrandMark/><span>Organização de agenda com Routine Assist</span></footer>
  </main>
}
