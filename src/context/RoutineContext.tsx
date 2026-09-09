import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'
import {
  addLodging as addLodgingDb,
  cancelControlTechIntegrationRequest as cancelControlTechIntegrationRequestDb,
  checkAppointmentConflicts as checkAppointmentConflictsDb,
  createAppointmentFromDemand,
  createControlTechIntegrationRequest as createControlTechIntegrationRequestDb,
  createDemand as createDemandDb,
  completeTrip as completeTripDb,
  cancelAppointment as cancelAppointmentDb,
  deleteDemand as deleteDemandDb,
  deleteTrip as deleteTripDb,
  createTrip as createTripDb,
  getAppointments,
  getCompanies,
  getControlTechIntegrationRequests,
  getHotels,
  getNotificationPreferences,
  getUserProfile,
  getDemands,
  getTrips,
  linkAppointmentsToTrip as linkAppointmentsToTripDb,
  processControlTechIntegrationRequest as processControlTechIntegrationRequestDb,
  unlinkAppointmentFromTrip as unlinkAppointmentFromTripDb,
  saveVehicleReservation as saveVehicleReservationDb,
  saveFlightReservation as saveFlightReservationDb,
  saveTripRoute as saveTripRouteDb,
  saveNotificationPreferences as saveNotificationPreferencesDb,
  retryControlTechIntegrationRequest as retryControlTechIntegrationRequestDb,
  updateDemand as updateDemandDb,
  updateAppointment as updateAppointmentDb,
  updateTrip as updateTripDb,
  updateUserProfile as updateUserProfileDb,
} from '../services/routine'
import type {
  AddLodgingInput,
  Appointment,
  AppointmentConflict,
  Company,
  ControlTechIntegrationRequest,
  CreateControlTechIntegrationRequestInput,
  CreateAppointmentInput,
  CreateDemandInput,
  CreateTripInput,
  Demand,
  Hotel,
  NotificationPreferences,
  SaveVehicleInput,
  SaveFlightInput,
  SaveTripRouteInput,
  Trip,
  UserProfile,
  UpdateUserProfileInput,
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
  controlTechIntegrationRequests: ControlTechIntegrationRequest[]
  notificationPreferences: NotificationPreferences
  userProfile: UserProfile | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  createDemand: (input: CreateDemandInput) => Promise<void>
  createControlTechIntegrationRequest: (input: CreateControlTechIntegrationRequestInput) => Promise<ControlTechIntegrationRequest>
  cancelControlTechIntegrationRequest: (requestId: string) => Promise<ControlTechIntegrationRequest>
  retryControlTechIntegrationRequest: (requestId: string) => Promise<ControlTechIntegrationRequest>
  processControlTechIntegrationRequest: (requestId: string) => Promise<ControlTechIntegrationRequest>
  updateDemand: (demandId: string, input: UpdateDemandInput) => Promise<void>
  deleteDemand: (demandId: string) => Promise<void>
  deleteTrip: (tripId: string) => Promise<void>
  completeTrip: (tripId: string) => Promise<void>
  cancelAppointment: (appointmentId: string, demandId?: string) => Promise<void>
  checkAppointmentConflicts: (start: string, end: string, excludeAppointmentId?: string) => Promise<AppointmentConflict[]>
  scheduleDemand: (input: CreateAppointmentInput) => Promise<Appointment>
  updateAppointment: (input: UpdateAppointmentInput) => Promise<Appointment>
  createTrip: (input: CreateTripInput) => Promise<string>
  updateTrip: (input: UpdateTripInput) => Promise<void>
  linkAppointmentsToTrip: (tripId: string, appointmentIds: string[]) => Promise<void>
  unlinkAppointmentFromTrip: (tripId: string, appointmentId: string) => Promise<void>
  addLodging: (input: AddLodgingInput) => Promise<void>
  saveVehicleReservation: (input: SaveVehicleInput) => Promise<void>
  saveFlightReservation: (input: SaveFlightInput) => Promise<void>
  saveTripRoute: (input: SaveTripRouteInput) => Promise<void>
  saveNotificationPreferences: (prefs: NotificationPreferences) => Promise<void>
  updateUserProfile: (input: UpdateUserProfileInput) => Promise<void>
}

const RoutineContext = createContext<RoutineContextValue | null>(null)

export function RoutineProvider({ children }: { children: React.ReactNode }) {
  const { workspaceId, user } = useAuth()
  const [demands, setDemands] = useState<Demand[]>([])
  const [trips, setTrips] = useState<Trip[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [controlTechIntegrationRequests, setControlTechIntegrationRequests] = useState<ControlTechIntegrationRequest[]>([])
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>({ alertDays:[14,7,3,1], inAppEnabled:true, pushEnabled:false })
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!workspaceId) return
    setLoading(true)
    setError(null)
    try {
      const [d, t, a, c, h, integrations, prefs, profile] = await Promise.all([
        getDemands(workspaceId),
        getTrips(workspaceId),
        getAppointments(workspaceId),
        getCompanies(workspaceId),
        getHotels(workspaceId),
        getControlTechIntegrationRequests(workspaceId),
        user ? getNotificationPreferences(user.id) : Promise.resolve({ alertDays:[14,7,3,1], inAppEnabled:true, pushEnabled:false }),
        user ? getUserProfile(user.id) : Promise.resolve(null),
      ])
      setDemands(d)
      setTrips(t)
      setAppointments(a)
      setCompanies(c)
      setHotels(h)
      setControlTechIntegrationRequests(integrations)
      setNotificationPreferences(prefs)
      setUserProfile(profile)
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

  const createControlTechIntegrationRequest = async (input: CreateControlTechIntegrationRequestInput) => {
    if (!workspaceId || !user) throw new Error('Usuário/workspace indisponível.')
    const created = await createControlTechIntegrationRequestDb(workspaceId, user, input)
    setControlTechIntegrationRequests(current => [created, ...current])
    return created
  }

  const cancelControlTechIntegrationRequest = async (requestId: string) => {
    if (!workspaceId) throw new Error('Workspace indisponível.')
    const updated = await cancelControlTechIntegrationRequestDb(workspaceId, requestId)
    setControlTechIntegrationRequests(current => current.map(request => request.id === requestId ? updated : request))
    return updated
  }

  const retryControlTechIntegrationRequest = async (requestId: string) => {
    if (!workspaceId) throw new Error('Workspace indisponível.')
    const updated = await retryControlTechIntegrationRequestDb(workspaceId, requestId)
    setControlTechIntegrationRequests(current => current.map(request => request.id === requestId ? updated : request))
    return updated
  }

  const processControlTechIntegrationRequest = async (requestId: string) => {
    if (!workspaceId) throw new Error('Workspace indisponível.')
    const updated = await processControlTechIntegrationRequestDb(workspaceId, requestId)
    setControlTechIntegrationRequests(current => current.map(request => request.id === requestId ? updated : request))
    return updated
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

  const cancelAppointment = async (appointmentId: string, demandId?: string) => {
    if (!workspaceId) throw new Error('Workspace indisponível.')
    await cancelAppointmentDb(workspaceId, appointmentId, demandId)
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

  const unlinkAppointmentFromTrip = async (tripId: string, appointmentId: string) => {
    if (!workspaceId) throw new Error('Workspace indisponível.')
    await unlinkAppointmentFromTripDb(workspaceId, tripId, appointmentId)
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

  const saveFlightReservation = async (input: SaveFlightInput) => {
    if (!workspaceId) throw new Error('Workspace indisponível.')
    await saveFlightReservationDb(workspaceId, input)
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

  const updateUserProfile = async (input: UpdateUserProfileInput) => {
    if (!user) throw new Error('Usuário indisponível.')
    const updated = await updateUserProfileDb(user.id, input)
    setUserProfile(updated)
  }

  const value = useMemo(() => ({
    demands, trips, appointments, companies, hotels, controlTechIntegrationRequests, notificationPreferences, userProfile, loading, error, refresh,
    createDemand, createControlTechIntegrationRequest, cancelControlTechIntegrationRequest, retryControlTechIntegrationRequest, processControlTechIntegrationRequest, updateDemand, deleteDemand, deleteTrip, completeTrip, cancelAppointment, checkAppointmentConflicts, scheduleDemand, updateAppointment,
    createTrip, updateTrip, linkAppointmentsToTrip, unlinkAppointmentFromTrip, addLodging, saveVehicleReservation, saveFlightReservation, saveTripRoute, saveNotificationPreferences, updateUserProfile,
  }), [demands, trips, appointments, companies, hotels, controlTechIntegrationRequests, notificationPreferences, userProfile, loading, error, refresh])

  return <RoutineContext.Provider value={value}>{children}</RoutineContext.Provider>
}

export function useRoutine() {
  const ctx = useContext(RoutineContext)
  if (!ctx) throw new Error('useRoutine precisa estar dentro de RoutineProvider')
  return ctx
}
