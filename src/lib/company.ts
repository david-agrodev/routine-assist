import type { Appointment, Demand, Trip } from '../types/routine'

export type CompanyFilter = 'all' | 'alta' | 'genex'
export type CompanyKey = 'alta' | 'genex' | 'mixed' | 'unknown'

export function companyKey(value?: string): CompanyKey {
  const normalized = (value || '').trim().toLowerCase()
  if (normalized === 'alta') return 'alta'
  if (normalized === 'genex') return 'genex'
  return 'unknown'
}

export function companyLabel(key: CompanyKey | CompanyFilter) {
  if (key === 'alta') return 'ALTA'
  if (key === 'genex') return 'GENEX'
  if (key === 'mixed') return 'Mista'
  if (key === 'all') return 'Todas'
  return 'Sem central'
}

export function demandForAppointment(appointment: Appointment, demands: Demand[]) {
  return appointment.demandId ? demands.find(d => d.id === appointment.demandId) : undefined
}

export function appointmentCompanyKey(appointment: Appointment, demands: Demand[]): CompanyKey {
  return companyKey(demandForAppointment(appointment, demands)?.company)
}

export function tripCompanyKeys(trip: Trip, demands: Demand[]): CompanyKey[] {
  const keys = trip.appointments
    .map(a => appointmentCompanyKey(a, demands))
    .filter((key): key is 'alta' | 'genex' => key === 'alta' || key === 'genex')
  return [...new Set(keys)]
}

export function tripCompanyKey(trip: Trip, demands: Demand[]): CompanyKey {
  const keys = tripCompanyKeys(trip, demands)
  if (keys.length === 1) return keys[0]
  if (keys.length > 1) return 'mixed'
  return 'unknown'
}

export function tripMatchesCompany(trip: Trip, demands: Demand[], filter: CompanyFilter) {
  if (filter === 'all') return true
  return tripCompanyKeys(trip, demands).includes(filter)
}

export function appointmentMatchesCompany(appointment: Appointment, demands: Demand[], filter: CompanyFilter) {
  if (filter === 'all') return true
  return appointmentCompanyKey(appointment, demands) === filter
}

export function companyClass(key: CompanyKey) {
  return `company-${key}`
}
