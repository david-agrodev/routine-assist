import { useEffect, useMemo, useRef, useState } from 'react'
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isBefore, isSameDay, isWithinInterval, parseISO, startOfMonth, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarIcon } from './Icons'

type Props = {
  start: string
  end: string
  onChange: (start: string, end: string) => void
  label?: string
  required?: boolean
}

const parseDate = (value: string) => value ? parseISO(value) : null

export function DateRangePicker({ start, end, onChange, label = 'Período', required }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [selectingEnd, setSelectingEnd] = useState(false)
  const [visibleMonth, setVisibleMonth] = useState(() => start ? startOfMonth(parseISO(start)) : startOfMonth(new Date()))
  const startDate = parseDate(start)
  const endDate = parseDate(end)

  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    window.addEventListener('pointerdown', close)
    window.addEventListener('keydown', escape)
    return () => {
      window.removeEventListener('pointerdown', close)
      window.removeEventListener('keydown', escape)
    }
  }, [open])

  const days = useMemo(() => {
    const first = startOfWeek(startOfMonth(visibleMonth), { weekStartsOn: 1 })
    const last = endOfWeek(endOfMonth(visibleMonth), { weekStartsOn: 1 })
    return eachDayOfInterval({ start: first, end: last })
  }, [visibleMonth])

  const display = startDate
    ? endDate
      ? `${format(startDate, 'dd/MM/yyyy')} → ${format(endDate, 'dd/MM/yyyy')}`
      : `${format(startDate, 'dd/MM/yyyy')} → selecione o fim`
    : 'Selecione início e fim'

  const toggle = () => {
    if (!open) {
      setVisibleMonth(startDate ? startOfMonth(startDate) : startOfMonth(new Date()))
      setSelectingEnd(false)
    }
    setOpen(value => !value)
  }

  const choose = (day: Date) => {
    const value = format(day, 'yyyy-MM-dd')
    if (!selectingEnd) {
      onChange(value, '')
      setSelectingEnd(true)
      return
    }
    if (startDate && isBefore(day, startDate)) {
      onChange(value, '')
      return
    }
    onChange(start || value, value)
    setSelectingEnd(false)
    setOpen(false)
  }

  return <div className="date-range-field" ref={rootRef}>
    <span className="date-range-label">{label}{required ? ' *' : ''}</span>
    <button type="button" className={`date-range-trigger ${open ? 'active' : ''}`} onClick={toggle} aria-expanded={open}>
      <CalendarIcon/>
      <span><strong>{display}</strong><small>{startDate && endDate ? 'Período selecionado' : 'Escolha as duas datas no mesmo calendário'}</small></span>
    </button>
    {open && <div className="date-range-popover" role="dialog" aria-label="Selecionar período">
      <div className="date-range-head">
        <button type="button" aria-label="Mês anterior" onClick={() => setVisibleMonth(month => addMonths(month, -1))}>‹</button>
        <strong>{format(visibleMonth, 'MMMM yyyy', { locale: ptBR })}</strong>
        <button type="button" aria-label="Próximo mês" onClick={() => setVisibleMonth(month => addMonths(month, 1))}>›</button>
      </div>
      <div className="date-range-weekdays" aria-hidden="true">
        {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(day => <span key={day}>{day}</span>)}
      </div>
      <div className="date-range-days">
        {days.map(day => {
          const outside = day.getMonth() !== visibleMonth.getMonth()
          const isStart = Boolean(startDate && isSameDay(day, startDate))
          const isEnd = Boolean(endDate && isSameDay(day, endDate))
          const inRange = Boolean(startDate && endDate && isWithinInterval(day, { start: startDate, end: endDate }))
          return <button
            type="button"
            key={format(day, 'yyyy-MM-dd')}
            className={`${outside ? 'outside' : ''} ${inRange ? 'in-range' : ''} ${isStart ? 'range-start' : ''} ${isEnd ? 'range-end' : ''}`}
            onClick={() => choose(day)}
            aria-label={format(day, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          >{format(day, 'd')}</button>
        })}
      </div>
      <div className="date-range-help">{selectingEnd ? 'Agora escolha a data final. Para um único dia, toque na mesma data.' : 'Primeiro escolha a data inicial.'}</div>
    </div>}
  </div>
}
