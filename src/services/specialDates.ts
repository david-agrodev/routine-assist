import { addDays, format, getDay, setDate, setMonth } from 'date-fns'
import type { Holiday } from '../types/routine'

function easterSunday(year: number) {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

function nthSunday(year: number, month: number, occurrence: number) {
  const first = setDate(setMonth(new Date(year, 0, 1), month), 1)
  const offset = (7 - getDay(first)) % 7
  return addDays(first, offset + (occurrence - 1) * 7)
}

export function getSpecialDatesForYear(year: number): Holiday[] {
  const easter = easterSunday(year)
  return [
    { date: format(addDays(easter, -48), 'yyyy-MM-dd'), name: 'Segunda de Carnaval', type: 'commemorative' },
    { date: format(addDays(easter, -47), 'yyyy-MM-dd'), name: 'Carnaval', type: 'commemorative' },
    { date: format(addDays(easter, 60), 'yyyy-MM-dd'), name: 'Corpus Christi', type: 'commemorative' },
    { date: format(nthSunday(year, 4, 2), 'yyyy-MM-dd'), name: 'Dia das Mães', type: 'commemorative' },
    { date: format(nthSunday(year, 7, 2), 'yyyy-MM-dd'), name: 'Dia dos Pais', type: 'commemorative' },
    { date: `${year}-06-12`, name: 'Dia dos Namorados', type: 'commemorative' },
    { date: `${year}-10-12`, name: 'Dia das Crianças', type: 'commemorative' },
  ]
}

export function getSpecialDatesForYears(years: number[]): Holiday[] {
  return [...new Set(years)].flatMap(getSpecialDatesForYear).sort((a, b) => a.date.localeCompare(b.date))
}
