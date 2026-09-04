export type DemandStatus = 'received' | 'waiting_info' | 'contact' | 'scheduled' | 'done' | 'cancelled'

export type Demand = {
  id: string
  client: string
  company: 'Alta' | 'GENEX' | string
  product: string
  quantity?: number
  regional?: string
  city?: string
  state?: string
  raw?: string
  nextStep: string
  status: DemandStatus
  createdAt?: string
}

export type Appointment = {
  id: string
  demandId?: string
  client: string
  city?: string
  state?: string
  start: string
  end: string
  type: 'Presencial' | 'Remoto' | 'A definir'
  responsible?: string
}

export type Hotel = {
  id: string
  name: string
  address?: string
  city?: string
  state?: string
  phone?: string
  notes?: string
}

export type Lodging = {
  id: string
  hotelId?: string
  name?: string
  address?: string
  city?: string
  state?: string
  phone?: string
  checkIn: string
  checkOut: string
  pricingMode: 'daily' | 'total'
  dailyValue?: number
  totalValue?: number
  confirmed: boolean
  reservationCode?: string
  notes?: string
}

export type VehicleReservation = {
  id: string
  status: 'not_required' | 'not_requested' | 'requested' | 'confirmed' | 'picked_up' | 'returned'
  company?: 'Localiza' | 'Unidas'
  locator?: string
  requestedAt?: string
  pickupAt?: string
  returnAt?: string
  pickupLocation?: string
  notes?: string
}

export type Trip = {
  id: string
  title: string
  start: string
  end: string
  origin?: string
  appointments: Appointment[]
  hotelRequired: boolean
  lodgings: Lodging[]
  vehicleRequired: boolean
  vehicles: VehicleReservation[]
}

export type Company = {
  id: string
  name: string
  productName?: string
}

export type NotificationPreferences = {
  alertDays: number[]
  inAppEnabled: boolean
  pushEnabled: boolean
}

export type CreateDemandInput = {
  client: string
  company: string
  regional?: string
  raw?: string
  quantity?: number
}

export type UpdateDemandInput = {
  client: string
  company: string
  regional?: string
  city?: string
  state?: string
  quantity?: number
  raw?: string
  nextStep: string
  status: DemandStatus
}

export type AppointmentConflict = {
  id: string
  title: string
  start: string
  end: string
}

export type CreateAppointmentInput = {
  demandId: string
  client: string
  city: string
  state: string
  start: string
  end: string
  type: 'Presencial' | 'Remoto'
  clientConfirmed: boolean
  allowConflict?: boolean
}

export type CreateTripInput = {
  title: string
  origin?: string
  start: string
  end: string
  hotelRequired: boolean
  vehicleRequired: boolean
  appointmentIds: string[]
}

export type AddLodgingInput = {
  tripId: string
  reservationId?: string
  hotelId?: string
  hotelName: string
  address?: string
  city?: string
  state?: string
  phone?: string
  checkIn: string
  checkOut: string
  pricingMode: 'daily' | 'total'
  dailyValue?: number
  totalValue?: number
  reservationCode?: string
  confirmed: boolean
  notes?: string
}

export type SaveVehicleInput = {
  tripId: string
  reservationId?: string
  status: VehicleReservation['status']
  company?: 'Localiza' | 'Unidas'
  locator?: string
  pickupAt?: string
  returnAt?: string
  pickupLocation?: string
  notes?: string
}
