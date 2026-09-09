export type DemandStatus = 'received' | 'waiting_info' | 'contact' | 'scheduled' | 'done'
export type DemandPriority = 1 | 2 | 3 | 4 | 5
export type Demand = {
  id: string
  client: string
  company: 'Alta' | 'GENEX'
  product: string
  priority: DemandPriority
  quantity?: number
  regional?: string
  city?: string
  state?: string
  raw?: string
  nextStep: string
  status: DemandStatus
}

export type Appointment = {
  id: string
  demandId: string
  client: string
  city: string
  state: string
  start: string
  end: string
  type: 'Presencial' | 'Remoto'
  responsible: string
}

export type Trip = {
  id: string
  title: string
  start: string
  end: string
  origin: string
  appointments: Appointment[]
  hotelRequired: boolean
  hotel?: { name: string; address: string; checkIn: string; checkOut: string; pricingMode: 'daily' | 'total'; dailyValue?: number; totalValue?: number; confirmed: boolean }
  vehicleRequired: boolean
  vehicle: { status: 'not_requested' | 'requested' | 'confirmed'; company?: 'Localiza' | 'Unidas'; locator?: string }
}

export const demands: Demand[] = [
  { id: 'd1', client: 'Sebastião Jairo', company: 'Alta', product: 'Alta Cow Watch', quantity: 300, priority: 4, regional: 'Claumi Vilela', city: 'Patrocínio', state: 'MG', nextStep: 'Atendimento agendado', status: 'scheduled' },
  { id: 'd2', client: 'Gerson Luiz Juliani', company: 'Alta', product: 'Alta Cow Watch', quantity: 100, priority: 3, regional: 'Ruander Rogério', nextStep: 'Confirmar cidade e disponibilidade', status: 'waiting_info' },
  { id: 'd3', client: 'Renata Umbelino de Souza', company: 'Alta', product: 'Alta Cow Watch', quantity: 20, priority: 5, regional: 'DW Goiânia', nextStep: 'Falar com regional', status: 'contact' },
  { id: 'd4', client: 'Nelson Marinelli', company: 'Alta', product: 'Alta Cow Watch', quantity: 10, priority: 4, regional: 'Rodrigo Borges', city: 'Coromandel', state: 'MG', raw: '10 colares + antena adicional. Talvez atendimento na próxima semana se der tempo de faturar.', nextStep: 'Aguardar faturamento e confirmar data', status: 'contact' },
  { id: 'd5', client: 'Maarten Zegwaard', company: 'Alta', product: 'Alta Cow Watch', quantity: 500, priority: 3, regional: 'Menelau', city: 'Castro', state: 'PR', raw: 'Recompra de colares; sistema já instalado. Confirmar se será necessário suporte presencial.', nextStep: 'Confirmar necessidade de deslocamento', status: 'contact' },
  { id: 'd6', client: 'Jeová José', company: 'Alta', product: 'Alta Cow Watch', priority: 1, regional: 'Rodrigo Peixoto', raw: 'Apenas uma antena adicional. Confirmar verba para instalação presencial ou suporte online.', nextStep: 'Confirmar presencial x remoto', status: 'waiting_info' },
  { id: 'd7', client: 'Giovani Trevizan', company: 'Alta', product: 'Alta Cow Watch', quantity: 60, priority: 3, regional: 'Lucas Pastore', raw: 'Instalação pela técnica Bianca; verificar se haverá necessidade de suporte online.', nextStep: 'Confirmar data com Bianca', status: 'waiting_info' },
]

const ap1: Appointment = { id: 'a1', demandId: 'd1', client: 'Sebastião Jairo', city: 'Patrocínio', state: 'MG', start: '2026-09-15', end: '2026-09-16', type: 'Presencial', responsible: 'Você' }
const ap2: Appointment = { id: 'a2', demandId: 'd4', client: 'Nelson Marinelli', city: 'Coromandel', state: 'MG', start: '2026-09-17', end: '2026-09-18', type: 'Presencial', responsible: 'Você' }

export const trips: Trip[] = [
  { id: 't1', title: 'Triângulo Mineiro • Setembro', start: '2026-09-14', end: '2026-09-19', origin: 'Uberaba/MG', appointments: [ap1, ap2], hotelRequired: true, vehicleRequired: true, vehicle: { status: 'not_requested' } }
]

export const appointments = [ap1, ap2]
