import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'
import {
  addLodging as addLodgingDb,
  checkAppointmentConflicts as checkAppointmentConflictsDb,
  createAppointmentFromDemand,
  createDemand as createDemandDb,
  completeTrip as completeTripDb,
  deleteDemand as deleteDemandDb,
  deleteTrip as deleteTripDb,
  createTrip as createTripDb,
  getAppointments,
  getCompanies,
  getHotels,
  getNotificationPreferences,
  getDemands,
  getTrips,
  linkAppointmentsToTrip as linkAppointmentsToTripDb,
  saveVehicleReservation as saveVehicleReservationDb,
  saveTripRoute as saveTripRouteDb,
  saveNotificationPreferences as saveNotificationPreferencesDb,
  updateDemand as updateDemandDb,
  updateAppointment as updateAppointmentDb,
  updateTrip as updateTripDb,
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
  SaveTripRouteInput,
  Trip,
  UpdateDemandInput,
  UpdateAppointmentInput,
  UpdateTripInput,
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
  deleteDemand: (demandId: string) => Promise<void>
  deleteTrip: (tripId: string) => Promise<void>
  completeTrip: (tripId: string) => Promise<void>
  checkAppointmentConflicts: (start: string, end: string, excludeAppointmentId?: string) => Promise<AppointmentConflict[]>
  scheduleDemand: (input: CreateAppointmentInput) => Promise<Appointment>
  updateAppointment: (input: UpdateAppointmentInput) => Promise<Appointment>
  createTrip: (input: CreateTripInput) => Promise<string>
  updateTrip: (input: UpdateTripInput) => Promise<void>
  linkAppointmentsToTrip: (tripId: string, appointmentIds: string[]) => Promise<void>
  addLodging: (input: AddLodgingInput) => Promise<void>
  saveVehicleReservation: (input: SaveVehicleInput) => Promise<void>
  saveTripRoute: (input: SaveTripRouteInput) => Promise<void>
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
    setAppointments(current => current.map(a => a.demandId === demandId ? { ...a, client: updated.client, farmName: updated.farmName, city: updated.city, state: updated.state } : a))
    setTrips(current => current.map(t => ({ ...t, appointments: t.appointments.map(a => a.demandId === demandId ? { ...a, client: updated.client, farmName: updated.farmName, city: updated.city, state: updated.state } : a) })))
  }

  const deleteDemand = async (demandId: string) => {
    if (!workspaceId) throw new Error('Workspace indisponível.')
    await deleteDemandDb(workspaceId, demandId)
    try { window.localStorage.removeItem(`routine-assist-demand-draft:${demandId}`) } catch { /* noop */ }
    await refresh()
  }

  const deleteTrip = async (tripId: string) => {
    if (!workspaceId) throw new Error('Workspace indisponível.')
    await deleteTripDb(workspaceId, tripId)
    await refresh()
  }


  const completeTrip = async (tripId: string) => {
    if (!workspaceId) throw new Error('Workspace indisponível.')
    await completeTripDb(workspaceId, tripId)
    await refresh()
  }

  const checkAppointmentConflicts = async (start: string, end: string, excludeAppointmentId?: string) => {
    if (!user) throw new Error('Usuário indisponível.')
    return checkAppointmentConflictsDb(user.id, start, end, excludeAppointmentId)
  }

  const scheduleDemand = async (input: CreateAppointmentInput) => {
    if (!workspaceId || !user) throw new Error('Usuário/workspace indisponível.')
    const conflicts = await checkAppointmentConflictsDb(user.id, input.start, input.end)
    if (conflicts.length) throw new Error('Período indisponível: já existe outro atendimento nas datas selecionadas.')
    const appointment = await createAppointmentFromDemand(workspaceId, user, input)
    setAppointments(current => [...current, appointment].sort((a,b) => a.start.localeCompare(b.start)))
    setDemands(current => current.map(d => d.id === input.demandId ? { ...d, status: 'scheduled', nextStep: input.type === 'Presencial' ? 'Organizar viagem' : 'Atendimento agendado', farmName: input.farmName, city: input.city, state: input.state } : d))
    return appointment
  }

  const updateAppointment = async (input: UpdateAppointmentInput) => {
    if (!workspaceId || !user) throw new Error('Usuário/workspace indisponível.')
    const conflicts = await checkAppointmentConflictsDb(user.id, input.start, input.end, input.appointmentId)
    if (conflicts.length) throw new Error('Período indisponível: já existe outro atendimento nas datas selecionadas.')
    const updated = await updateAppointmentDb(workspaceId, user, input)
    setAppointments(current => current.map(a => a.id === updated.id ? updated : a).sort((a,b) => a.start.localeCompare(b.start)))
    setTrips(current => current.map(t => ({ ...t, appointments: t.appointments.map(a => a.id === updated.id ? updated : a), start: t.appointments.some(a => a.id === updated.id) && updated.start < t.start ? updated.start : t.start, end: t.appointments.some(a => a.id === updated.id) && updated.end > t.end ? updated.end : t.end })))
    setDemands(current => current.map(d => d.id === input.demandId ? { ...d, status: 'scheduled', nextStep: input.type === 'Presencial' ? 'Organizar viagem' : 'Atendimento agendado' } : d))
    return updated
  }

  const createTrip = async (input: CreateTripInput) => {
    if (!workspaceId || !user) throw new Error('Usuário/workspace indisponível.')
    const tripId = await createTripDb(workspaceId, user, input)
    await refresh()
    return tripId
  }

  const updateTrip = async (input: UpdateTripInput) => {
    if (!workspaceId) throw new Error('Workspace indisponível.')
    await updateTripDb(workspaceId, input)
    await refresh()
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

  const saveTripRoute = async (input: SaveTripRouteInput) => {
    if (!workspaceId) throw new Error('Workspace indisponível.')
    await saveTripRouteDb(workspaceId, input)
    await refresh()
  }

  const saveNotificationPreferences = async (prefs: NotificationPreferences) => {
    if (!user) throw new Error('Usuário indisponível.')
    await saveNotificationPreferencesDb(user.id, prefs)
    setNotificationPreferences(prefs)
  }

  const value = useMemo(() => ({
    demands, trips, appointments, companies, hotels, notificationPreferences, loading, error, refresh,
    createDemand, updateDemand, deleteDemand, deleteTrip, completeTrip, checkAppointmentConflicts, scheduleDemand, updateAppointment,
    createTrip, updateTrip, linkAppointmentsToTrip, addLodging, saveVehicleReservation, saveTripRoute, saveNotificationPreferences,
  }), [demands, trips, appointments, companies, hotels, notificationPreferences, loading, error, refresh])

  return <RoutineContext.Provider value={value}>{children}</RoutineContext.Provider>
}

export function useRoutine() {
  const ctx = useContext(RoutineContext)
  if (!ctx) throw new Error('useRoutine precisa estar dentro de RoutineProvider')
  return ctx
}
