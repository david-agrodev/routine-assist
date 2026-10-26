import { useEffect, useMemo, useState } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isToday,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarIcon, LockIcon } from './Icons'
import { getPublicBookingAvailability } from '../services/routine'
import type { BookingAvailabilityDay, Holiday } from '../types/routine'

type Props = {
  token: string
  start: string
  end: string
  specialDates: Holiday[]
  onChange: (start: string, end: string) => void
  onError: (message: string) => void
  onInvalidLink: () => void
}

export function PublicAvailabilityCalendar({ token, start, end, specialDates, onChange, onError, onInvalidLink }: Props) {
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(start ? parseISO(start) : new Date()))
  const [availability, setAvailability] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [checkingRange, setCheckingRange] = useState(false)
  const startDate = start ? parseISO(start) : null
  const endDate = end ? parseISO(end) : null
  const today = startOfDay(new Date())

  const { gridStart, gridEnd, days } = useMemo(() => {
    const first = startOfWeek(startOfMonth(visibleMonth), { weekStartsOn: 1 })
    const last = endOfWeek(endOfMonth(visibleMonth), { weekStartsOn: 1 })
    return { gridStart: first, gridEnd: last, days: eachDayOfInterval({ start: first, end: last }) }
  }, [visibleMonth])

  useEffect(() => {
    let active = true
    setLoading(true)
    void getPublicBookingAvailability(token, format(gridStart, 'yyyy-MM-dd'), format(gridEnd, 'yyyy-MM-dd'))
      .then(items => {
        if (!active) return
        setAvailability(Object.fromEntries(items.map(item => [item.date, item.available])))
      })
      .catch(error => {
        if (!active) return
        const message = error?.message || 'Não foi possível consultar a agenda agora.'
        if (/link|desativado/i.test(message)) onInvalidLink()
        else onError(message)
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [token, gridStart.getTime(), gridEnd.getTime()])

  const choose = async (day: Date) => {
    const value = format(day, 'yyyy-MM-dd')
    if (isBefore(day, today) || availability[value] === false || checkingRange) return

    if (!startDate || endDate) {
      onError('')
      onChange(value, '')
      return
    }

    if (isBefore(day, startDate)) {
      onError('')
      onChange(value, '')
      return
    }

    setCheckingRange(true)
    onError('')
    try {
      const range = await getPublicBookingAvailability(token, start, value)
      if (range.some(item => !item.available)) {
        onError('O período atravessa uma data indisponível. Escolha um intervalo livre.')
        return
      }
      onChange(start, value)
    } catch (error: any) {
      onError(error?.message || 'Não foi possível validar este período.')
    } finally {
      setCheckingRange(false)
    }
  }

  const selectedLabel = startDate
    ? endDate
      ? `${format(startDate, "d 'de' MMM", { locale: ptBR })} a ${format(endDate, "d 'de' MMM", { locale: ptBR })}`
      : `${format(startDate, "d 'de' MMM", { locale: ptBR })} - escolha a data final`
    : 'Selecione a primeira data'

  return <section className="public-calendar-card">
    <div className="public-calendar-heading">
      <span className="public-section-icon calendar"><CalendarIcon/></span>
      <div><span className="eyebrow">Datas disponíveis</span><h2>Quando você pretende agendar?</h2><p>Datas em cinza já estão reservadas. Nenhuma informação da agenda é exibida.</p></div>
    </div>

    <div className="public-calendar-toolbar">
      <button type="button" aria-label="Mês anterior" onClick={() => setVisibleMonth(month => addMonths(month, -1))}>‹</button>
      <div><strong>{format(visibleMonth, 'MMMM yyyy', { locale: ptBR })}</strong><small>{checkingRange ? 'Validando o período...' : selectedLabel}</small></div>
      <button type="button" aria-label="Próximo mês" onClick={() => setVisibleMonth(month => addMonths(month, 1))}>›</button>
    </div>

    <div className={`public-calendar-grid ${loading ? 'loading' : ''}`} aria-busy={loading}>
      {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(day => <span className="public-calendar-weekday" key={day}>{day}</span>)}
      {days.map(day => {
        const key = format(day, 'yyyy-MM-dd')
        const outside = day.getMonth() !== visibleMonth.getMonth()
        const past = isBefore(day, today)
        const unavailable = availability[key] !== true
        const special = specialDates.find(item => item.date === key)
        const isStart = Boolean(startDate && isSameDay(day, startDate))
        const isEnd = Boolean(endDate && isSameDay(day, endDate))
        const inRange = Boolean(startDate && endDate && isWithinInterval(day, { start: startDate, end: endDate }))
        const disabled = loading || past || unavailable
        return <button
          type="button"
          key={key}
          className={`${outside ? 'outside' : ''} ${disabled ? 'unavailable' : 'available'} ${special ? 'special' : ''} ${isToday(day) ? 'today' : ''} ${inRange ? 'in-range' : ''} ${isStart ? 'range-start' : ''} ${isEnd ? 'range-end' : ''}`}
          disabled={disabled}
          onClick={() => void choose(day)}
          title={special?.name || (unavailable ? 'Data indisponível' : undefined)}
          aria-label={`${format(day, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}${unavailable ? ', indisponível' : ', disponível'}${special ? `, ${special.name}` : ''}`}
        >
          <span>{format(day, 'd')}</span>
          {unavailable && <LockIcon/>}
          {special && !unavailable && <i aria-hidden="true"/>}
        </button>
      })}
    </div>

    <div className="public-calendar-legend">
      <span><i className="free"/> Livre</span>
      <span><i className="busy"/> Indisponível</span>
      <span><i className="special"/> Feriado ou data especial</span>
    </div>
  </section>
}
