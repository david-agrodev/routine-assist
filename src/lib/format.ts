import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const formatDateShort = (iso?: string) => iso ? format(parseISO(iso),'dd/MM') : '—'
export const formatDateLong = (iso?: string) => iso ? format(parseISO(iso),"d 'de' MMMM",{locale:ptBR}) : '—'
export const formatDateRange = (start?: string,end?: string) => start && end ? `${formatDateShort(start)} → ${formatDateShort(end)}` : '—'
export const formatMoney = (value?: number) => value == null ? '—' : new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value)

export function formatCompanyName(name?: string) {
  if (!name) return '—'
  if (name.toLowerCase() === 'alta') return 'ALTA'
  if (name.toLowerCase() === 'genex') return 'GENEX'
  return name.toUpperCase()
}

export function formatEquipmentSummary(input: { quantity?: number; extraAntennaCount?: number }) {
  const parts: string[] = []
  if ((input.quantity ?? 0) > 0) parts.push(`${input.quantity} colar${input.quantity === 1 ? '' : 'es'}`)
  if ((input.extraAntennaCount ?? 0) > 0) parts.push(`${input.extraAntennaCount} ${input.extraAntennaCount === 1 ? 'antena adicional' : 'antenas adicionais'}`)
  return parts.length ? parts.join(' • ') : 'Itens ainda não informados'
}
