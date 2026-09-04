import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'
import {
  addLodging as addLodgingDb,
  checkAppointmentConflicts as checkAppointmentConflictsDb,
  createAppointmentFromDemand,
  createDemand as createDemandDb,
  createTrip as createTripDb,
  getAppointments,
  getCompanies,
  getHotels,
  getNotificationPreferences,
  getDemands,
  getTrips,
  linkAppointmentsToTrip as linkAppointmentsToTripDb,
  saveVehicleReservation as saveVehicleReservationDb,
  saveNotificationPreferences as saveNotificationPreferencesDb,
  updateDemand as updateDemandDb,
} from '../services/routine'
import type {
  AddLodgingInput,
  Appointment,
  AppointmentConflict,
  Company,
  CreateAppointmentInput,
  CreateDemandInput,
  CreateTripInput,
  Demand,
  Hotel,
  NotificationPreferences,
  SaveVehicleInput,
  Trip,
  UpdateDemandInput,
} from '../types/routine'

type RoutineContextValue = {
  demands: Demand[]
  trips: Trip[]
  appointments: Appointment[]
  companies: Company[]
  hotels: Hotel[]
  notificationPreferences: NotificationPreferences
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  createDemand: (input: CreateDemandInput) => Promise<void>
  updateDemand: (demandId: string, input: UpdateDemandInput) => Promise<void>
  checkAppointmentConflicts: (start: string, end: string) => Promise<AppointmentConflict[]>
  scheduleDemand: (input: CreateAppointmentInput) => Promise<Appointment>
  createTrip: (input: CreateTripInput) => Promise<string>
  linkAppointmentsToTrip: (tripId: string, appointmentIds: string[]) => Promise<void>
  addLodging: (input: AddLodgingInput) => Promise<void>
  saveVehicleReservation: (input: SaveVehicleInput) => Promise<void>
  saveNotificationPreferences: (prefs: NotificationPreferences) => Promise<void>
}

const RoutineContext = createContext<RoutineContextValue | null>(null)

export function RoutineProvider({ children }: { children: React.ReactNode }) {
  const { workspaceId, user } = useAuth()
  const [demands, setDemands] = useState<Demand[]>([])
  const [trips, setTrips] = useState<Trip[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>({ alertDays:[14,7,3,1], inAppEnabled:true, pushEnabled:false })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!workspaceId) return
    setLoading(true)
    setError(null)
    try {
      const [d, t, a, c, h, prefs] = await Promise.all([
        getDemands(workspaceId),
        getTrips(workspaceId),
        getAppointments(workspaceId),
        getCompanies(workspaceId),
        getHotels(workspaceId),
        user ? getNotificationPreferences(user.id) : Promise.resolve({ alertDays:[14,7,3,1], inAppEnabled:true, pushEnabled:false }),
      ])
      setDemands(d)
      setTrips(t)
      setAppointments(a)
      setCompanies(c)
      setHotels(h)
      setNotificationPreferences(prefs)
    } catch (err: any) {
      setError(err?.message || 'Não foi possível carregar os dados.')
    } finally {
      setLoading(false)
    }
  }, [workspaceId, user])

  useEffect(() => { void refresh() }, [refresh])

  const createDemand = async (input: CreateDemandInput) => {
    if (!workspaceId || !user) throw new Error('Usuário/workspace indisponível.')
    const created = await createDemandDb(workspaceId, user, input)
    setDemands(current => [created, ...current])
  }

  const updateDemand = async (demandId: string, input: UpdateDemandInput) => {
    if (!workspaceId) throw new Error('Workspace indisponível.')
    const updated = await updateDemandDb(workspaceId, demandId, input)
    setDemands(current => current.map(d => d.id === demandId ? updated : d))
  }

  const checkAppointmentConflicts = async (start: string, end: string) => {
    if (!user) throw new Error('Usuário indisponível.')
    return checkAppointmentConflictsDb(user.id, start, end)
  }

  const scheduleDemand = async (input: CreateAppointmentInput) => {
    if (!workspaceId || !user) throw new Error('Usuário/workspace indisponível.')
    const appointment = await createAppointmentFromDemand(workspaceId, user, input)
    setAppointments(current => [...current, appointment].sort((a,b) => a.start.localeCompare(b.start)))
    setDemands(current => current.map(d => d.id === input.demandId ? { ...d, status: 'scheduled', nextStep: input.type === 'Presencial' ? 'Organizar viagem' : 'Atendimento agendado', city: input.city, state: input.state } : d))
    return appointment
  }

  const createTrip = async (input: CreateTripInput) => {
    if (!workspaceId || !user) throw new Error('Usuário/workspace indisponível.')
    const tripId = await createTripDb(workspaceId, user, input)
    await refresh()
    return tripId
  }

  const linkAppointmentsToTrip = async (tripId: string, appointmentIds: string[]) => {
    if (!workspaceId) throw new Error('Workspace indisponível.')
    await linkAppointmentsToTripDb(workspaceId, tripId, appointmentIds)
    await refresh()
  }

  const addLodging = async (input: AddLodgingInput) => {
    if (!workspaceId) throw new Error('Workspace indisponível.')
    await addLodgingDb(workspaceId, input)
    await refresh()
  }

  const saveVehicleReservation = async (input: SaveVehicleInput) => {
    if (!workspaceId) throw new Error('Workspace indisponível.')
    await saveVehicleReservationDb(workspaceId, input)
    await refresh()
  }

  const saveNotificationPreferences = async (prefs: NotificationPreferences) => {
    if (!user) throw new Error('Usuário indisponível.')
    await saveNotificationPreferencesDb(user.id, prefs)
    setNotificationPreferences(prefs)
  }

  const value = useMemo(() => ({
    demands, trips, appointments, companies, hotels, notificationPreferences, loading, error, refresh,
    createDemand, updateDemand, checkAppointmentConflicts, scheduleDemand,
    createTrip, linkAppointmentsToTrip, addLodging, saveVehicleReservation, saveNotificationPreferences,
  }), [demands, trips, appointments, companies, hotels, notificationPreferences, loading, error, refresh])

  return <RoutineContext.Provider value={value}>{children}</RoutineContext.Provider>
}

export function useRoutine() {
  const ctx = useContext(RoutineContext)
  if (!ctx) throw new Error('useRoutine precisa estar dentro de RoutineProvider')
  return ctx
}
