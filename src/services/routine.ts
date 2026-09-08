import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { suggestedTripTitle } from '../lib/tripTitle'
import type {
  AddLodgingInput,
  Appointment,
  Company,
  CreateDemandInput,
  CreateTripInput,
  Demand,
  SaveVehicleInput,
  SaveFlightInput,
  Trip,
  Hotel,
  NotificationPreferences,
  SaveTripRouteInput,
  UserProfile,
  UpdateUserProfileInput,
} from '../types/routine'

function requireClient() {
  if (!supabase) throw new Error('Supabase não configurado. Verifique o arquivo .env.local.')
  return supabase
}

export async function bootstrapWorkspace(): Promise<string> {
  const client = requireClient()
  const { data, error } = await client.rpc('bootstrap_current_user')
  if (error) throw error
  if (!data) throw new Error('Não foi possível preparar o workspace do usuário.')
  return String(data)
}

export async function getCompanies(workspaceId: string): Promise<Company[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('companies')
    .select('id,name,product_name')
    .eq('workspace_id', workspaceId)
    .order('name')
  if (error) throw error
  return (data ?? []).map((row: any) => ({ id: row.id, name: row.name, productName: row.product_name ?? undefined }))
}

export async function getDemands(workspaceId: string): Promise<Demand[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('demands')
    .select('id,client_name_snapshot,company_name_snapshot,product_name_snapshot,regional_snapshot,farm_name_snapshot,city_snapshot,state_snapshot,quantity_collars,vpu_count,uhf_antenna_count,extra_antenna_count,raw_information,next_step,status,created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((row: any) => ({
    id: row.id,
    client: row.client_name_snapshot,
    company: row.company_name_snapshot || '—',
    product: row.product_name_snapshot || '',
    regional: row.regional_snapshot || undefined,
    farmName: row.farm_name_snapshot || undefined,
    city: row.city_snapshot || undefined,
    state: row.state_snapshot || undefined,
    quantity: row.quantity_collars ?? undefined,
    vpuCount: row.vpu_count ?? undefined,
    uhfAntennaCount: row.uhf_antenna_count ?? undefined,
    extraAntennaCount: row.extra_antenna_count ?? undefined,
    raw: row.raw_information || undefined,
    nextStep: row.next_step || 'Completar informações',
    status: row.status,
    createdAt: row.created_at,
  }))
}

export async function createDemand(workspaceId: string, user: User, input: CreateDemandInput): Promise<Demand> {
  const client = requireClient()
  const { data: company, error: companyError } = await client
    .from('companies')
    .select('id,name,product_name')
    .eq('workspace_id', workspaceId)
    .eq('name', input.company)
    .maybeSingle()
  if (companyError) throw companyError

  const companyName = company?.name ?? input.company
  const productName = company?.product_name ?? (input.company === 'Alta' ? 'Alta Cow Watch' : input.company === 'GENEX' ? 'Herd Monitor' : '')

  const { data, error } = await client
    .from('demands')
    .insert({
      workspace_id: workspaceId,
      company_id: company?.id ?? null,
      created_by: user.id,
      client_name_snapshot: input.client.trim(),
      company_name_snapshot: companyName,
      product_name_snapshot: productName,
      regional_snapshot: input.regional?.trim() || null,
      farm_name_snapshot: input.farmName?.trim() || null,
      quantity_collars: input.quantity ?? null,
      vpu_count: input.vpuCount ?? null,
      uhf_antenna_count: input.uhfAntennaCount ?? null,
      extra_antenna_count: input.extraAntennaCount ?? null,
      raw_information: input.raw?.trim() || null,
      next_step: 'Completar informações',
      status: 'received',
    })
    .select('id,client_name_snapshot,company_name_snapshot,product_name_snapshot,regional_snapshot,farm_name_snapshot,city_snapshot,state_snapshot,quantity_collars,vpu_count,uhf_antenna_count,extra_antenna_count,raw_information,next_step,status,created_at')
    .single()
  if (error) throw error
  return {
    id: data.id,
    client: data.client_name_snapshot,
    company: data.company_name_snapshot || companyName,
    product: data.product_name_snapshot || productName,
    regional: data.regional_snapshot || undefined,
    farmName: data.farm_name_snapshot || undefined,
    city: data.city_snapshot || undefined,
    state: data.state_snapshot || undefined,
    quantity: data.quantity_collars ?? undefined,
    vpuCount: data.vpu_count ?? undefined,
    uhfAntennaCount: data.uhf_antenna_count ?? undefined,
    extraAntennaCount: data.extra_antenna_count ?? undefined,
    raw: data.raw_information || undefined,
    nextStep: data.next_step || 'Completar informações',
    status: data.status,
    createdAt: data.created_at,
  }
}


export async function getAppointments(workspaceId: string): Promise<Appointment[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('appointments')
    .select('id,demand_id,responsible_user_id,title,farm_name_snapshot,city_snapshot,state_snapshot,starts_at,ends_at,appointment_type,client_confirmed')
    .eq('workspace_id', workspaceId)
    .order('starts_at', { ascending: true })
  if (error) throw error
  return (data ?? []).map((a: any) => ({
    id: a.id,
    demandId: a.demand_id ?? undefined,
    client: a.title,
    farmName: a.farm_name_snapshot || undefined,
    clientConfirmed: Boolean(a.client_confirmed),
    city: a.city_snapshot || undefined,
    state: a.state_snapshot || undefined,
    start: a.starts_at,
    end: a.ends_at,
    type: a.appointment_type === 'presencial' ? 'Presencial' : a.appointment_type === 'remoto' ? 'Remoto' : 'A definir',
    responsible: a.responsible_user_id || undefined,
  }))
}

export async function getTrips(workspaceId: string): Promise<Trip[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('trips')
    .select(`
      id,title,origin,starts_at,ends_at,hotel_required,vehicle_required,flight_required,status,completed_at,route_distance_km,route_duration_minutes,route_calculated_at,
      trip_appointments(
        sort_order,
        appointments(id,demand_id,responsible_user_id,title,farm_name_snapshot,city_snapshot,state_snapshot,starts_at,ends_at,appointment_type,client_confirmed)
      ),
      lodging_reservations(
        id,hotel_id,check_in,check_out,price_mode,daily_value,total_value,reservation_code,confirmed,notes,
        hotels(name,address,city,state,phone)
      ),
      vehicle_reservations(id,status,rental_company,locator,requested_at,pickup_at,return_at,pickup_location,notes),
      flight_reservations(id,status,outbound_origin,outbound_destination,outbound_date,outbound_time,return_origin,return_destination,return_date,return_time,airline,locator,outbound_flight_number,return_flight_number,requested_at,notes)
    `)
    .eq('workspace_id', workspaceId)
    .order('starts_at', { ascending: true })
  if (error) throw error

  return (data ?? []).map((row: any) => {
    const appointments = (row.trip_appointments ?? [])
      .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((link: any) => {
        const a = link.appointments
        return {
          id: a.id,
          demandId: a.demand_id ?? undefined,
          client: a.title,
          farmName: a.farm_name_snapshot || undefined,
          clientConfirmed: Boolean(a.client_confirmed),
          city: a.city_snapshot || undefined,
          state: a.state_snapshot || undefined,
          start: a.starts_at,
          end: a.ends_at,
          type: a.appointment_type === 'presencial' ? 'Presencial' : a.appointment_type === 'remoto' ? 'Remoto' : 'A definir',
          responsible: a.responsible_user_id || undefined,
        }
      })

    const lodgings = (row.lodging_reservations ?? []).map((r: any) => ({
      id: r.id,
      hotelId: r.hotel_id || undefined,
      name: r.hotels?.name || undefined,
      address: r.hotels?.address || undefined,
      city: r.hotels?.city || undefined,
      state: r.hotels?.state || undefined,
      phone: r.hotels?.phone || undefined,
      checkIn: r.check_in,
      checkOut: r.check_out,
      pricingMode: r.price_mode,
      dailyValue: r.daily_value == null ? undefined : Number(r.daily_value),
      totalValue: r.total_value == null ? undefined : Number(r.total_value),
      confirmed: Boolean(r.confirmed),
      reservationCode: r.reservation_code || undefined,
      notes: r.notes || undefined,
    }))

    const vehicles = (row.vehicle_reservations ?? []).map((v: any) => ({
      id: v.id,
      status: v.status,
      company: v.rental_company || undefined,
      locator: v.locator || undefined,
      requestedAt: v.requested_at || undefined,
      pickupAt: v.pickup_at || undefined,
      returnAt: v.return_at || undefined,
      pickupLocation: v.pickup_location || undefined,
      notes: v.notes || undefined,
    }))

    const flights = (row.flight_reservations ?? []).map((f: any) => ({
      id: f.id,
      status: f.status,
      outboundOrigin: f.outbound_origin || undefined,
      outboundDestination: f.outbound_destination || undefined,
      outboundDate: f.outbound_date || undefined,
      outboundTime: f.outbound_time ? String(f.outbound_time).slice(0,5) : undefined,
      returnOrigin: f.return_origin || undefined,
      returnDestination: f.return_destination || undefined,
      returnDate: f.return_date || undefined,
      returnTime: f.return_time ? String(f.return_time).slice(0,5) : undefined,
      airline: f.airline || undefined,
      locator: f.locator || undefined,
      outboundFlightNumber: f.outbound_flight_number || undefined,
      returnFlightNumber: f.return_flight_number || undefined,
      requestedAt: f.requested_at || undefined,
      notes: f.notes || undefined,
    }))

    return {
      id: row.id,
      title: row.title,
      start: row.starts_at,
      end: row.ends_at,
      origin: row.origin || undefined,
      appointments,
      hotelRequired: Boolean(row.hotel_required),
      lodgings,
      vehicleRequired: Boolean(row.vehicle_required),
      vehicles,
      flightRequired: Boolean(row.flight_required),
      flights,
      status: row.status || 'planned',
      completedAt: row.completed_at || undefined,
      routeDistanceKm: row.route_distance_km == null ? undefined : Number(row.route_distance_km),
      routeDurationMinutes: row.route_duration_minutes == null ? undefined : Number(row.route_duration_minutes),
      routeCalculatedAt: row.route_calculated_at || undefined,
    }
  })
}

export async function updateDemand(
  workspaceId: string,
  demandId: string,
  input: import('../types/routine').UpdateDemandInput,
): Promise<Demand> {
  const client = requireClient()
  const { data: company, error: companyError } = await client
    .from('companies')
    .select('id,name,product_name')
    .eq('workspace_id', workspaceId)
    .eq('name', input.company)
    .maybeSingle()
  if (companyError) throw companyError

  const { data, error } = await client
    .from('demands')
    .update({
      company_id: company?.id ?? null,
      client_name_snapshot: input.client.trim(),
      company_name_snapshot: company?.name ?? input.company,
      product_name_snapshot: company?.product_name ?? (input.company === 'Alta' ? 'Alta Cow Watch' : input.company === 'GENEX' ? 'Herd Monitor' : ''),
      regional_snapshot: input.regional?.trim() || null,
      farm_name_snapshot: input.farmName?.trim() || null,
      city_snapshot: input.city?.trim() || null,
      state_snapshot: input.state?.trim().toUpperCase() || null,
      quantity_collars: input.quantity ?? null,
      vpu_count: input.vpuCount ?? null,
      uhf_antenna_count: input.uhfAntennaCount ?? null,
      extra_antenna_count: input.extraAntennaCount ?? null,
      raw_information: input.raw?.trim() || null,
      next_step: input.nextStep.trim() || 'Completar informações',
      status: input.status,
    })
    .eq('workspace_id', workspaceId)
    .eq('id', demandId)
    .select('id,client_name_snapshot,company_name_snapshot,product_name_snapshot,regional_snapshot,farm_name_snapshot,city_snapshot,state_snapshot,quantity_collars,vpu_count,uhf_antenna_count,extra_antenna_count,raw_information,next_step,status,created_at')
    .single()
  if (error) throw error

  const { error: appointmentSyncError } = await client
    .from('appointments')
    .update({
      title: input.client.trim(),
      farm_name_snapshot: input.farmName?.trim() || null,
      city_snapshot: input.city?.trim() || null,
      state_snapshot: input.state?.trim().toUpperCase() || null,
    })
    .eq('workspace_id', workspaceId)
    .eq('demand_id', demandId)
  if (appointmentSyncError) throw appointmentSyncError

  return {
    id: data.id,
    client: data.client_name_snapshot,
    company: data.company_name_snapshot || input.company,
    product: data.product_name_snapshot || '',
    regional: data.regional_snapshot || undefined,
    farmName: data.farm_name_snapshot || undefined,
    city: data.city_snapshot || undefined,
    state: data.state_snapshot || undefined,
    quantity: data.quantity_collars ?? undefined,
    vpuCount: data.vpu_count ?? undefined,
    uhfAntennaCount: data.uhf_antenna_count ?? undefined,
    extraAntennaCount: data.extra_antenna_count ?? undefined,
    raw: data.raw_information || undefined,
    nextStep: data.next_step || 'Completar informações',
    status: data.status,
    createdAt: data.created_at,
  }
}

export async function checkAppointmentConflicts(
  userId: string,
  start: string,
  end: string,
  excludeAppointmentId?: string,
): Promise<import('../types/routine').AppointmentConflict[]> {
  const client = requireClient()
  const { data, error } = await client.rpc('check_appointment_conflicts', {
    target_user: userId,
    target_start: start,
    target_end: end,
    exclude_appointment: excludeAppointmentId || null,
  })
  if (error) throw error
  return (data ?? []).map((row: any) => ({ id: row.id, title: row.title, start: row.starts_at, end: row.ends_at }))
}

export async function createAppointmentFromDemand(
  workspaceId: string,
  user: User,
  input: import('../types/routine').CreateAppointmentInput,
): Promise<Appointment> {
  const client = requireClient()
  const appointmentType = input.type === 'Presencial' ? 'presencial' : 'remoto'
  const { data, error } = await client
    .from('appointments')
    .insert({
      workspace_id: workspaceId,
      demand_id: input.demandId,
      responsible_user_id: user.id,
      title: input.client.trim(),
      farm_name_snapshot: input.farmName?.trim() || null,
      city_snapshot: input.city.trim(),
      state_snapshot: input.state.trim().toUpperCase(),
      appointment_type: appointmentType,
      starts_at: input.start,
      ends_at: input.end,
      client_confirmed: input.clientConfirmed,
    })
    .select('id,demand_id,title,farm_name_snapshot,city_snapshot,state_snapshot,starts_at,ends_at,appointment_type,client_confirmed')
    .single()
  if (error) throw error

  const { error: demandError } = await client
    .from('demands')
    .update({ status: 'scheduled', next_step: input.type === 'Presencial' ? 'Organizar viagem' : 'Atendimento agendado' })
    .eq('workspace_id', workspaceId)
    .eq('id', input.demandId)
  if (demandError) throw demandError

  return {
    id: data.id,
    demandId: data.demand_id ?? undefined,
    client: data.title,
    farmName: data.farm_name_snapshot || undefined,
    clientConfirmed: Boolean(data.client_confirmed),
    city: data.city_snapshot || undefined,
    state: data.state_snapshot || undefined,
    start: data.starts_at,
    end: data.ends_at,
    type: data.appointment_type === 'presencial' ? 'Presencial' : 'Remoto',
    responsible: user.id,
  }
}


export async function createTrip(
  workspaceId: string,
  user: User,
  input: CreateTripInput,
): Promise<string> {
  const client = requireClient()
  const { data: trip, error } = await client
    .from('trips')
    .insert({
      workspace_id: workspaceId,
      created_by: user.id,
      title: input.title.trim(),
      origin: input.origin?.trim() || null,
      starts_at: input.start,
      ends_at: input.end,
      hotel_required: input.hotelRequired,
      vehicle_required: input.vehicleRequired,
      flight_required: input.flightRequired,
      route_distance_km: null,
      route_duration_minutes: null,
      route_calculated_at: null,
    })
    .select('id')
    .single()
  if (error) throw error

  if (input.appointmentIds.length) {
    const { error: linkError } = await client.from('trip_appointments').insert(
      input.appointmentIds.map((appointmentId, index) => ({
        trip_id: trip.id,
        appointment_id: appointmentId,
        sort_order: index,
      })),
    )
    if (linkError) throw linkError
    const { data: linkedAppointments, error: linkedAppointmentsError } = await client
      .from('appointments')
      .select('demand_id')
      .in('id', input.appointmentIds)
    if (linkedAppointmentsError) throw linkedAppointmentsError
    const demandIds = [...new Set((linkedAppointments ?? []).map((a: any) => a.demand_id).filter(Boolean))]
    if (demandIds.length) {
      const { error: demandError } = await client.from('demands')
        .update({ next_step: 'Organizar logística da viagem' })
        .eq('workspace_id', workspaceId)
        .in('id', demandIds)
      if (demandError) throw demandError
    }
  }
  return String(trip.id)
}

export async function linkAppointmentsToTrip(
  workspaceId: string,
  tripId: string,
  appointmentIds: string[],
): Promise<void> {
  if (!appointmentIds.length) return
  const client = requireClient()
  const { error } = await client.from('trip_appointments').upsert(
    appointmentIds.map((appointmentId, index) => ({
      trip_id: tripId,
      appointment_id: appointmentId,
      sort_order: index,
    })),
    { onConflict: 'trip_id,appointment_id', ignoreDuplicates: true },
  )
  if (error) throw error

  const { data: linkedAppointments, error: linkedAppointmentsError } = await client
    .from('appointments')
    .select('demand_id,starts_at,ends_at')
    .in('id', appointmentIds)
  if (linkedAppointmentsError) throw linkedAppointmentsError

  const { data: trip, error: tripError } = await client
    .from('trips')
    .select('title,starts_at,ends_at')
    .eq('workspace_id', workspaceId)
    .eq('id', tripId)
    .single()
  if (tripError) throw tripError

  const starts = [trip.starts_at, ...(linkedAppointments ?? []).map((a: any) => a.starts_at)].filter(Boolean).sort()
  const ends = [trip.ends_at, ...(linkedAppointments ?? []).map((a: any) => a.ends_at)].filter(Boolean).sort()
  const { data: allLinks, error: allLinksError } = await client.from('trip_appointments')
    .select('sort_order,appointments(title,farm_name_snapshot,city_snapshot,state_snapshot)')
    .eq('trip_id', tripId)
  if (allLinksError) throw allLinksError
  const allStops=(allLinks ?? []).sort((a:any,b:any)=>(a.sort_order??0)-(b.sort_order??0)).map((link:any)=>({
    client:link.appointments?.title || '', farmName:link.appointments?.farm_name_snapshot || undefined, city:link.appointments?.city_snapshot || undefined, state:link.appointments?.state_snapshot || undefined,
  }))
  const autoTitle = /^Viagem\s+/i.test(trip.title || '') || /^Nova viagem$/i.test(trip.title || '')
  const updatePayload:any={ route_distance_km:null, route_duration_minutes:null, route_calculated_at:null }
  if (starts.length && ends.length) { updatePayload.starts_at=starts[0]; updatePayload.ends_at=ends[ends.length - 1] }
  if (autoTitle && allStops.length) updatePayload.title=suggestedTripTitle(allStops as any)
  const { error: resizeError } = await client.from('trips')
    .update(updatePayload)
    .eq('workspace_id', workspaceId)
    .eq('id', tripId)
  if (resizeError) throw resizeError

  const demandIds = [...new Set((linkedAppointments ?? []).map((a: any) => a.demand_id).filter(Boolean))]
  if (demandIds.length) {
    const { error: demandError } = await client.from('demands')
      .update({ next_step: 'Organizar logística da viagem' })
      .eq('workspace_id', workspaceId)
      .in('id', demandIds)
    if (demandError) throw demandError
  }
}




async function refreshTripAfterAppointmentRemoval(workspaceId: string, tripId: string): Promise<void> {
  const client = requireClient()
  const { data: trip, error: tripError } = await client
    .from('trips')
    .select('title')
    .eq('workspace_id', workspaceId)
    .eq('id', tripId)
    .maybeSingle()
  if (tripError) throw tripError
  if (!trip) return

  const { data: links, error: linksError } = await client
    .from('trip_appointments')
    .select('sort_order,appointments(id,title,farm_name_snapshot,city_snapshot,state_snapshot,demand_id)')
    .eq('trip_id', tripId)
  if (linksError) throw linksError

  const ordered = (links ?? [])
    .sort((a:any,b:any)=>(a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((link:any)=>link.appointments)
    .filter(Boolean)

  const payload:any = {
    route_distance_km: null,
    route_duration_minutes: null,
    route_calculated_at: null,
  }
  const autoTitle = /^Viagem\s+/i.test(trip.title || '') || /^Nova viagem$/i.test(trip.title || '')
  if (autoTitle && ordered.length) {
    payload.title = suggestedTripTitle(ordered.map((a:any)=>({
      client:a.title || '',
      farmName:a.farm_name_snapshot || undefined,
      city:a.city_snapshot || undefined,
      state:a.state_snapshot || undefined,
    })) as any)
  }
  const { error: updateError } = await client
    .from('trips')
    .update(payload)
    .eq('workspace_id', workspaceId)
    .eq('id', tripId)
  if (updateError) throw updateError
}

export async function unlinkAppointmentFromTrip(
  workspaceId: string,
  tripId: string,
  appointmentId: string,
): Promise<void> {
  const client = requireClient()
  const { data: appointment, error: appointmentError } = await client
    .from('appointments')
    .select('demand_id')
    .eq('workspace_id', workspaceId)
    .eq('id', appointmentId)
    .maybeSingle()
  if (appointmentError) throw appointmentError

  const { error } = await client
    .from('trip_appointments')
    .delete()
    .eq('trip_id', tripId)
    .eq('appointment_id', appointmentId)
  if (error) throw error

  await refreshTripAfterAppointmentRemoval(workspaceId, tripId)

  if (appointment?.demand_id) {
    const { data: remainingLinks, error: remainingError } = await client
      .from('trip_appointments')
      .select('trip_id')
      .eq('appointment_id', appointmentId)
      .limit(1)
    if (remainingError) throw remainingError
    if (!remainingLinks?.length) {
      const { error: demandError } = await client
        .from('demands')
        .update({ status:'scheduled', next_step:'Organizar viagem' })
        .eq('workspace_id', workspaceId)
        .eq('id', appointment.demand_id)
      if (demandError) throw demandError
    }
  }
}

export async function cancelAppointment(
  workspaceId: string,
  appointmentId: string,
  demandId?: string,
): Promise<void> {
  const client = requireClient()
  const { data: links, error: linksError } = await client
    .from('trip_appointments')
    .select('trip_id')
    .eq('appointment_id', appointmentId)
  if (linksError) throw linksError
  const tripIds: string[] = Array.from(new Set<string>((links ?? []).map((l:any)=>String(l.trip_id))))

  const { data: appointment, error: appointmentError } = await client
    .from('appointments')
    .select('demand_id')
    .eq('workspace_id', workspaceId)
    .eq('id', appointmentId)
    .maybeSingle()
  if (appointmentError) throw appointmentError

  const { error: deleteError } = await client
    .from('appointments')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('id', appointmentId)
  if (deleteError) throw deleteError

  const targetDemandId = demandId || appointment?.demand_id
  if (targetDemandId) {
    const { error: demandError } = await client
      .from('demands')
      .update({ status:'cancelled', next_step:'Atendimento cancelado' })
      .eq('workspace_id', workspaceId)
      .eq('id', targetDemandId)
    if (demandError) throw demandError
  }

  for (const tripId of tripIds) await refreshTripAfterAppointmentRemoval(workspaceId, tripId)
}

export async function updateAppointment(
  workspaceId: string,
  user: User,
  input: import('../types/routine').UpdateAppointmentInput,
): Promise<Appointment> {
  const client = requireClient()
  const appointmentType = input.type === 'Presencial' ? 'presencial' : 'remoto'
  const { data, error } = await client
    .from('appointments')
    .update({
      starts_at: input.start,
      ends_at: input.end,
      appointment_type: appointmentType,
      client_confirmed: input.clientConfirmed,
      farm_name_snapshot: input.farmName?.trim() || null,
      city_snapshot: input.city?.trim() || null,
      state_snapshot: input.state?.trim().toUpperCase() || null,
    })
    .eq('workspace_id', workspaceId)
    .eq('id', input.appointmentId)
    .select('id,demand_id,title,farm_name_snapshot,city_snapshot,state_snapshot,starts_at,ends_at,appointment_type,client_confirmed')
    .single()
  if (error) throw error

  if (input.demandId) {
    const { error: demandError } = await client
      .from('demands')
      .update({ status: 'scheduled', next_step: input.type === 'Presencial' ? 'Organizar viagem' : 'Atendimento agendado' })
      .eq('workspace_id', workspaceId)
      .eq('id', input.demandId)
    if (demandError) throw demandError
  }

  // Se o atendimento continua presencial e já está em uma viagem, ampliamos o período
  // da viagem quando necessário. Nunca encurtamos automaticamente a logística.
  if (input.type === 'Presencial') {
    const { data: links, error: linksError } = await client
      .from('trip_appointments')
      .select('trip_id')
      .eq('appointment_id', input.appointmentId)
    if (linksError) throw linksError
    for (const link of links ?? []) {
      const { data: trip, error: tripError } = await client
        .from('trips')
        .select('starts_at,ends_at')
        .eq('workspace_id', workspaceId)
        .eq('id', link.trip_id)
        .single()
      if (tripError) throw tripError
      const startsAt = [trip.starts_at, input.start].filter(Boolean).sort()[0]
      const endsAt = [trip.ends_at, input.end].filter(Boolean).sort().slice(-1)[0]
      if (startsAt !== trip.starts_at || endsAt !== trip.ends_at) {
        const { error: resizeError } = await client
          .from('trips')
          .update({ starts_at: startsAt, ends_at: endsAt })
          .eq('workspace_id', workspaceId)
          .eq('id', link.trip_id)
        if (resizeError) throw resizeError
      }
    }
  }

  return {
    id: data.id,
    demandId: data.demand_id ?? undefined,
    client: data.title,
    farmName: data.farm_name_snapshot || undefined,
    clientConfirmed: Boolean(data.client_confirmed),
    city: data.city_snapshot || undefined,
    state: data.state_snapshot || undefined,
    start: data.starts_at,
    end: data.ends_at,
    type: data.appointment_type === 'presencial' ? 'Presencial' : 'Remoto',
    responsible: user.id,
  }
}

export async function updateTrip(
  workspaceId: string,
  input: import('../types/routine').UpdateTripInput,
): Promise<void> {
  const client = requireClient()
  const { error } = await client
    .from('trips')
    .update({
      title: input.title.trim(),
      origin: input.origin?.trim() || null,
      starts_at: input.start,
      ends_at: input.end,
      hotel_required: input.hotelRequired,
      vehicle_required: input.vehicleRequired,
      flight_required: input.flightRequired,
      route_distance_km: null,
      route_duration_minutes: null,
      route_calculated_at: null,
    })
    .eq('workspace_id', workspaceId)
    .eq('id', input.tripId)
  if (error) throw error
}



export async function getUserProfile(userId: string): Promise<UserProfile> {
  const client = requireClient()
  const { data, error } = await client.from('profiles').select('id,full_name,cpf,phone,birth_date').eq('id', userId).single()
  if (error) throw error
  return { id:data.id, fullName:data.full_name || undefined, cpf:data.cpf || undefined, phone:data.phone || undefined, birthDate:data.birth_date || undefined }
}

export async function updateUserProfile(userId: string, input: UpdateUserProfileInput): Promise<UserProfile> {
  const client = requireClient()
  const { data, error } = await client.from('profiles').update({
    full_name: input.fullName.trim(),
    cpf: input.cpf?.trim() || null,
    phone: input.phone?.trim() || null,
    birth_date: input.birthDate || null,
    updated_at: new Date().toISOString(),
  }).eq('id', userId).select('id,full_name,cpf,phone,birth_date').single()
  if (error) throw error
  return { id:data.id, fullName:data.full_name || undefined, cpf:data.cpf || undefined, phone:data.phone || undefined, birthDate:data.birth_date || undefined }
}

export async function saveFlightReservation(workspaceId: string, input: SaveFlightInput): Promise<void> {
  const client = requireClient()
  const payload = {
    workspace_id: workspaceId,
    trip_id: input.tripId,
    status: input.status,
    outbound_origin: input.outboundOrigin?.trim() || null,
    outbound_destination: input.outboundDestination?.trim() || null,
    outbound_date: input.outboundDate || null,
    outbound_time: input.outboundTime || null,
    return_origin: input.returnOrigin?.trim() || null,
    return_destination: input.returnDestination?.trim() || null,
    return_date: input.returnDate || null,
    return_time: input.returnTime || null,
    airline: input.airline?.trim() || null,
    locator: input.locator?.trim() || null,
    outbound_flight_number: input.outboundFlightNumber?.trim() || null,
    return_flight_number: input.returnFlightNumber?.trim() || null,
    requested_at: input.status === 'not_requested' ? null : new Date().toISOString(),
    notes: input.notes?.trim() || null,
    updated_at: new Date().toISOString(),
  }
  if (input.reservationId) {
    const { error } = await client.from('flight_reservations').update(payload).eq('workspace_id', workspaceId).eq('id', input.reservationId)
    if (error) throw error
  } else {
    const { error } = await client.from('flight_reservations').upsert(payload, { onConflict:'trip_id' })
    if (error) throw error
  }
}

export async function saveTripRoute(workspaceId:string,input:SaveTripRouteInput):Promise<void>{
  const client=requireClient()
  const {error}=await client.from('trips').update({
    route_distance_km:input.distanceKm,
    route_duration_minutes:input.durationMinutes,
    route_calculated_at:new Date().toISOString(),
  }).eq('workspace_id',workspaceId).eq('id',input.tripId)
  if(error) throw error
}

export async function getHotels(workspaceId: string): Promise<Hotel[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('hotels')
    .select('id,name,address,city,state,phone,notes')
    .eq('workspace_id', workspaceId)
    .order('name')
  if (error) throw error
  return (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    address: row.address || undefined,
    city: row.city || undefined,
    state: row.state || undefined,
    phone: row.phone || undefined,
    notes: row.notes || undefined,
  }))
}

export async function addLodging(
  workspaceId: string,
  input: AddLodgingInput,
): Promise<void> {
  const client = requireClient()
  let hotelId = input.hotelId

  if (hotelId) {
    const { error: hotelUpdateError } = await client
      .from('hotels')
      .update({
        name: input.hotelName.trim(),
        address: input.address?.trim() || null,
        city: input.city?.trim() || null,
        state: input.state?.trim().toUpperCase() || null,
        phone: input.phone?.trim() || null,
      })
      .eq('workspace_id', workspaceId)
      .eq('id', hotelId)
    if (hotelUpdateError) throw hotelUpdateError
  } else {
    const { data: existing, error: existingError } = await client
      .from('hotels')
      .select('id')
      .eq('workspace_id', workspaceId)
      .ilike('name', input.hotelName.trim())
      .eq('city', input.city?.trim() || '')
      .maybeSingle()
    if (existingError) throw existingError

    if (existing?.id) {
      hotelId = existing.id
      const { error: hotelUpdateError } = await client
        .from('hotels')
        .update({
          address: input.address?.trim() || null,
          state: input.state?.trim().toUpperCase() || null,
          phone: input.phone?.trim() || null,
        })
        .eq('workspace_id', workspaceId)
        .eq('id', hotelId)
      if (hotelUpdateError) throw hotelUpdateError
    } else {
      const { data: hotel, error: hotelError } = await client
        .from('hotels')
        .insert({
          workspace_id: workspaceId,
          name: input.hotelName.trim(),
          address: input.address?.trim() || null,
          city: input.city?.trim() || null,
          state: input.state?.trim().toUpperCase() || null,
          phone: input.phone?.trim() || null,
        })
        .select('id')
        .single()
      if (hotelError) throw hotelError
      hotelId = hotel.id
    }
  }

  const payload = {
    workspace_id: workspaceId,
    trip_id: input.tripId,
    hotel_id: hotelId,
    check_in: input.checkIn,
    check_out: input.checkOut,
    price_mode: input.pricingMode,
    daily_value: input.dailyValue ?? null,
    total_value: input.totalValue ?? null,
    reservation_code: input.reservationCode?.trim() || null,
    confirmed: input.confirmed,
    notes: input.notes?.trim() || null,
  }

  if (input.reservationId) {
    const { data: updated, error } = await client.from('lodging_reservations')
      .update(payload)
      .eq('workspace_id', workspaceId)
      .eq('trip_id', input.tripId)
      .eq('id', input.reservationId)
      .select('id,hotel_id')
      .maybeSingle()
    if (error) throw error
    if (!updated?.id) throw new Error('A hospedagem não foi encontrada para edição. Atualize a página e tente novamente.')
    return
  }

  const { data: inserted, error } = await client.from('lodging_reservations').insert(payload).select('id').maybeSingle()
  if (error) throw error
  if (!inserted?.id) throw new Error('A hospedagem não pôde ser criada.')
}

export async function saveVehicleReservation(
  workspaceId: string,
  input: SaveVehicleInput,
): Promise<void> {
  const client = requireClient()
  const payload = {
    workspace_id: workspaceId,
    trip_id: input.tripId,
    status: input.status,
    rental_company: input.company || null,
    locator: input.locator?.trim() || null,
    pickup_at: input.pickupAt || null,
    return_at: input.returnAt || null,
    pickup_location: input.pickupLocation?.trim() || null,
    notes: input.notes?.trim() || null,
    requested_at: ['requested','confirmed','picked_up','returned'].includes(input.status) ? new Date().toISOString() : null,
    form_url: 'https://forms.cloud.microsoft/pages/responsepage.aspx?id=ovpYBG4dE0iA1wsCfIUhBVYJmZgr6BZPihez6CAuhL9UNVZDUUEzQ0xCQ1NWNUdVRTBWRzRRQ0VENy4u&route=shorturl',
  }

  if (input.reservationId) {
    const { error } = await client
      .from('vehicle_reservations')
      .update(payload)
      .eq('workspace_id', workspaceId)
      .eq('id', input.reservationId)
    if (error) throw error
    return
  }

  const { error } = await client.from('vehicle_reservations').insert(payload)
  if (error) throw error
}




export async function completeTrip(workspaceId: string, tripId: string): Promise<void> {
  const client = requireClient()
  const { data: links, error: linkError } = await client
    .from('trip_appointments')
    .select('appointments(demand_id)')
    .eq('trip_id', tripId)
  if (linkError) throw linkError

  const { error: tripError } = await client
    .from('trips')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('workspace_id', workspaceId)
    .eq('id', tripId)
  if (tripError) throw tripError

  const demandIds = [...new Set((links ?? []).map((row: any) => row.appointments?.demand_id).filter(Boolean))]
  if (demandIds.length) {
    const { error: demandError } = await client
      .from('demands')
      .update({ status: 'done', next_step: 'Concluída' })
      .eq('workspace_id', workspaceId)
      .in('id', demandIds)
    if (demandError) throw demandError
  }
}

export async function deleteDemand(workspaceId: string, demandId: string): Promise<void> {
  const client = requireClient()
  const { data: appointmentRows, error: appointmentLookupError } = await client
    .from('appointments')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('demand_id', demandId)
  if (appointmentLookupError) throw appointmentLookupError

  const appointmentIds = (appointmentRows ?? []).map((row: any) => row.id)
  if (appointmentIds.length) {
    const { error: appointmentDeleteError } = await client
      .from('appointments')
      .delete()
      .eq('workspace_id', workspaceId)
      .in('id', appointmentIds)
    if (appointmentDeleteError) throw appointmentDeleteError
  }

  const { error } = await client
    .from('demands')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('id', demandId)
  if (error) throw error
}

export async function deleteTrip(workspaceId: string, tripId: string): Promise<void> {
  const client = requireClient()
  const { data: links, error: linkLookupError } = await client
    .from('trip_appointments')
    .select('appointments(demand_id)')
    .eq('trip_id', tripId)
  if (linkLookupError) throw linkLookupError

  const demandIds = [...new Set((links ?? []).map((row: any) => row.appointments?.demand_id).filter(Boolean))]
  const { error } = await client
    .from('trips')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('id', tripId)
  if (error) throw error

  if (demandIds.length) {
    const { error: demandError } = await client
      .from('demands')
      .update({ status: 'scheduled', next_step: 'Organizar viagem' })
      .eq('workspace_id', workspaceId)
      .in('id', demandIds)
    if (demandError) throw demandError
  }
}

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const client = requireClient()
  const { data, error } = await client
    .from('notification_preferences')
    .select('alert_days,in_app_enabled,push_enabled')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return {
    alertDays: Array.isArray(data?.alert_days) ? data.alert_days.map(Number).sort((a:number,b:number)=>b-a) : [14,7,3,1],
    inAppEnabled: data?.in_app_enabled ?? true,
    pushEnabled: data?.push_enabled ?? false,
  }
}

export async function saveNotificationPreferences(userId: string, prefs: NotificationPreferences): Promise<void> {
  const client = requireClient()
  const { error } = await client
    .from('notification_preferences')
    .upsert({
      user_id: userId,
      alert_days: prefs.alertDays,
      in_app_enabled: prefs.inAppEnabled,
      push_enabled: prefs.pushEnabled,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
  if (error) throw error
}
