import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const formatDateShort = (iso?: string) => iso ? format(parseISO(iso),'dd/MM') : '—'
export const formatDateLong = (iso?: string) => iso ? format(parseISO(iso),"d 'de' MMMM",{locale:ptBR}) : '—'
export const formatDateRange = (start?: string,end?: string) => start && end ? `${formatDateShort(start)} → ${formatDateShort(end)}` : '—'
export const formatMoney = (value?: number) => value == null ? '—' : new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value)
