import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type {
  AddLodgingInput,
  Appointment,
  Company,
  CreateDemandInput,
  CreateTripInput,
  Demand,
  SaveVehicleInput,
  Trip,
  Hotel,
  NotificationPreferences,
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
      id,title,origin,starts_at,ends_at,hotel_required,vehicle_required,
      trip_appointments(
        sort_order,
        appointments(id,demand_id,responsible_user_id,title,farm_name_snapshot,city_snapshot,state_snapshot,starts_at,ends_at,appointment_type,client_confirmed)
      ),
      lodging_reservations(
        id,hotel_id,check_in,check_out,price_mode,daily_value,total_value,reservation_code,confirmed,notes,
        hotels(name,address,city,state,phone)
      ),
      vehicle_reservations(id,status,rental_company,locator,requested_at,pickup_at,return_at,pickup_location,notes)
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
        .update({ next_step: 'Organizar hotel e veículo' })
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
    .select('starts_at,ends_at')
    .eq('workspace_id', workspaceId)
    .eq('id', tripId)
    .single()
  if (tripError) throw tripError

  const starts = [trip.starts_at, ...(linkedAppointments ?? []).map((a: any) => a.starts_at)].filter(Boolean).sort()
  const ends = [trip.ends_at, ...(linkedAppointments ?? []).map((a: any) => a.ends_at)].filter(Boolean).sort()
  if (starts.length && ends.length && (starts[0] !== trip.starts_at || ends[ends.length - 1] !== trip.ends_at)) {
    const { error: resizeError } = await client.from('trips')
      .update({ starts_at: starts[0], ends_at: ends[ends.length - 1] })
      .eq('workspace_id', workspaceId)
      .eq('id', tripId)
    if (resizeError) throw resizeError
  }

  const demandIds = [...new Set((linkedAppointments ?? []).map((a: any) => a.demand_id).filter(Boolean))]
  if (demandIds.length) {
    const { error: demandError } = await client.from('demands')
      .update({ next_step: 'Organizar hotel e veículo' })
      .eq('workspace_id', workspaceId)
      .in('id', demandIds)
    if (demandError) throw demandError
  }
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
    })
    .eq('workspace_id', workspaceId)
    .eq('id', input.tripId)
  if (error) throw error
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
    const { error } = await client.from('lodging_reservations')
      .update(payload)
      .eq('workspace_id', workspaceId)
      .eq('id', input.reservationId)
    if (error) throw error
    return
  }

  const { error } = await client.from('lodging_reservations').insert(payload)
  if (error) throw error
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
      .update({ next_step: 'Organizar viagem' })
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
