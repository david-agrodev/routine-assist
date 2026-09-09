export type DemandStatus = 'received' | 'waiting_info' | 'contact' | 'scheduled' | 'done' | 'cancelled'
export type DemandPriority = 1 | 2 | 3 | 4 | 5

export type Demand = {
  id: string
  client: string
  company: 'Alta' | 'GENEX' | string
  product: string
  priority: DemandPriority
  quantity?: number
  vpuCount?: number
  uhfAntennaCount?: number
  extraAntennaCount?: number
  regional?: string
  farmName?: string
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
  farmName?: string
  clientConfirmed?: boolean
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

export type FlightStatus = 'not_requested' | 'requested' | 'confirmed'

export type FlightReservation = {
  id: string
  status: FlightStatus
  outboundOrigin?: string
  outboundDestination?: string
  outboundDate?: string
  outboundTime?: string
  returnOrigin?: string
  returnDestination?: string
  returnDate?: string
  returnTime?: string
  airline?: string
  locator?: string
  outboundFlightNumber?: string
  returnFlightNumber?: string
  requestedAt?: string
  notes?: string
}

export type UserProfile = {
  id: string
  fullName?: string
  cpf?: string
  phone?: string
  birthDate?: string
}

export type TripStatus = 'planned' | 'completed'

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
  flightRequired: boolean
  flights: FlightReservation[]
  status: TripStatus
  completedAt?: string
  routeDistanceKm?: number
  routeDurationMinutes?: number
  routeCalculatedAt?: string
}

export type Holiday = {
  date: string
  name: string
  type?: string
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
  farmName?: string
  raw?: string
  quantity?: number
  vpuCount?: number
  uhfAntennaCount?: number
  extraAntennaCount?: number
  priority?: DemandPriority
}

export type UpdateDemandInput = {
  client: string
  company: string
  regional?: string
  farmName?: string
  city?: string
  state?: string
  quantity?: number
  vpuCount?: number
  uhfAntennaCount?: number
  extraAntennaCount?: number
  priority: DemandPriority
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
  farmName?: string
  start: string
  end: string
  type: 'Presencial' | 'Remoto'
  clientConfirmed: boolean
}

export type CreateTripInput = {
  title: string
  origin?: string
  start: string
  end: string
  hotelRequired: boolean
  vehicleRequired: boolean
  flightRequired: boolean
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

export type SaveFlightInput = {
  tripId: string
  reservationId?: string
  status: FlightStatus
  outboundOrigin?: string
  outboundDestination?: string
  outboundDate?: string
  outboundTime?: string
  returnOrigin?: string
  returnDestination?: string
  returnDate?: string
  returnTime?: string
  airline?: string
  locator?: string
  outboundFlightNumber?: string
  returnFlightNumber?: string
  notes?: string
}

export type UpdateAppointmentInput = {
  appointmentId: string
  demandId?: string
  start: string
  end: string
  type: 'Presencial' | 'Remoto'
  clientConfirmed: boolean
  farmName?: string
  city?: string
  state?: string
}

export type UpdateTripInput = {
  tripId: string
  title: string
  origin?: string
  start: string
  end: string
  hotelRequired: boolean
  vehicleRequired: boolean
  flightRequired: boolean
}

export type SaveTripRouteInput = {
  tripId: string
  distanceKm: number
  durationMinutes: number
}

export type UpdateUserProfileInput = {
  fullName: string
  cpf?: string
  phone?: string
  birthDate?: string
}
