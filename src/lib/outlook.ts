import type { FlightReservation, Trip, UserProfile } from '../types/routine'

export const AIRFARE_RECIPIENT = 'keyla.santos@urus.org'

function brDate(value?: string) {
  if (!value) return 'Não informado'
  const [y,m,d] = value.split('-')
  return y && m && d ? `${d}/${m}/${y}` : value
}

export function buildAirfareEmail(profile: UserProfile | null, trip: Trip, flight: Partial<FlightReservation>) {
  const passengerName = profile?.fullName?.trim() || 'Não informado'
  const origin = flight.outboundOrigin?.trim() || trip.origin || 'Não informado'
  const destination = flight.outboundDestination?.trim() || trip.appointments[0]?.city || 'Não informado'
  const outboundDate = flight.outboundDate || trip.start
  const returnDate = flight.returnDate || trip.end
  const returnOrigin = flight.returnOrigin?.trim() || destination
  const returnDestination = flight.returnDestination?.trim() || origin

  const subject = `Solicitação de Passagem Aérea | ${passengerName} | ${origin} → ${destination} | ${brDate(outboundDate)} a ${brDate(returnDate)}`
  const lines = [
    'Olá, Keyla. Tudo bem?',
    '',
    'Solicito, por gentileza, a reserva das passagens aéreas conforme as informações abaixo.',
    '',
    'DADOS DO PASSAGEIRO',
    `Nome completo: ${passengerName}`,
    `CPF: ${profile?.cpf || 'Não informado'}`,
    `Data de nascimento: ${brDate(profile?.birthDate)}`,
    `Telefone: ${profile?.phone || 'Não informado'}`,
    '',
    'DADOS DA VIAGEM',
    '',
    'Ida',
    `Origem: ${origin}`,
    `Destino: ${destination}`,
    `Data: ${brDate(outboundDate)}`,
    `Horário desejado: ${flight.outboundTime || 'Não informado'}`,
    '',
    'Retorno',
    `Origem: ${returnOrigin}`,
    `Destino: ${returnDestination}`,
    `Data: ${brDate(returnDate)}`,
    `Horário desejado: ${flight.returnTime || 'Não informado'}`,
  ]
  if (flight.notes?.trim()) lines.push('', `Observação: ${flight.notes.trim()}`)
  lines.push(
    '',
    'Caso não haja disponibilidade exatamente nos horários informados, podem ser consideradas opções próximas que sejam compatíveis com a logística da viagem.',
    '',
    'Peço, por favor, que após a reserva me encaminhe a confirmação e o localizador.',
    '',
    'Obrigado!',
  )

  const body = lines.join('\n')
  const qs = new URLSearchParams({ to: AIRFARE_RECIPIENT, subject, body })
  return {
    recipient: AIRFARE_RECIPIENT,
    subject,
    body,
    url: `https://outlook.office.com/mail/deeplink/compose?${qs.toString()}`,
  }
}
