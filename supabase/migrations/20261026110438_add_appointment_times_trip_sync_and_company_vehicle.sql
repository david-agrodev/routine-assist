-- Appointment time slots remain opt-in so every existing record keeps its
-- current all-day behavior.
alter table public.appointments
  add column if not exists all_day boolean not null default true,
  add column if not exists start_time time without time zone,
  add column if not exists end_time time without time zone;

alter table public.appointments
  drop constraint if exists appointment_time_fields_valid;

alter table public.appointments
  add constraint appointment_time_fields_valid check (
    (all_day and start_time is null and end_time is null)
    or
    (
      not all_day
      and start_time is not null
      and end_time is not null
      and (starts_at < ends_at or start_time < end_time)
    )
  );

-- Company vehicles use the same reservation workflow without requiring a
-- rental-company form or locator.
alter table public.vehicle_reservations
  drop constraint if exists vehicle_reservations_rental_company_check;

alter table public.vehicle_reservations
  add constraint vehicle_reservations_rental_company_check check (
    rental_company is null
    or rental_company in ('Localiza', 'Unidas', 'Veículo da empresa')
  );

-- Preserve the same-trip exception while adding time-aware conflicts.
-- A timed remote appointment may coexist with a legacy/all-day field visit.
create or replace function public.prevent_appointment_overlap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.appointments a
    where a.responsible_user_id = new.responsible_user_id
      and a.id is distinct from new.id
      and a.starts_at <= new.ends_at
      and a.ends_at >= new.starts_at
      and case
        when a.all_day and new.all_day then true
        when a.all_day and not new.all_day then new.appointment_type <> 'remoto'
        when not a.all_day and new.all_day then a.appointment_type <> 'remoto'
        else
          (a.starts_at + a.start_time) < (new.ends_at + new.end_time)
          and (a.ends_at + a.end_time) > (new.starts_at + new.start_time)
      end
      and not exists (
        select 1
        from public.trip_appointments mine
        join public.trip_appointments theirs on theirs.trip_id = mine.trip_id
        where mine.appointment_id = new.id
          and theirs.appointment_id = a.id
      )
  ) then
    raise exception 'Periodo indisponivel: ja existe outro atendimento para este responsavel no horario selecionado.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_appointment_overlap on public.appointments;
create trigger prevent_appointment_overlap
before insert or update of responsible_user_id, starts_at, ends_at, all_day, start_time, end_time, appointment_type
on public.appointments
for each row execute function public.prevent_appointment_overlap();

create or replace function public.check_appointment_conflicts(
  target_user uuid,
  target_start date,
  target_end date,
  target_all_day boolean,
  target_start_time time without time zone,
  target_end_time time without time zone,
  target_type public.appointment_type,
  exclude_appointment uuid default null
)
returns table(
  id uuid,
  title text,
  starts_at date,
  ends_at date,
  all_day boolean,
  start_time time without time zone,
  end_time time without time zone,
  appointment_type public.appointment_type
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id,
    a.title,
    a.starts_at,
    a.ends_at,
    a.all_day,
    a.start_time,
    a.end_time,
    a.appointment_type
  from public.appointments a
  where a.responsible_user_id = target_user
    and a.id is distinct from exclude_appointment
    and a.starts_at <= target_end
    and a.ends_at >= target_start
    and public.is_workspace_member(a.workspace_id)
    and case
      when a.all_day and target_all_day then true
      when a.all_day and not target_all_day then target_type <> 'remoto'
      when not a.all_day and target_all_day then a.appointment_type <> 'remoto'
      else
        (a.starts_at + a.start_time) < (target_end + target_end_time)
        and (a.ends_at + a.end_time) > (target_start + target_start_time)
    end
    and not (
      exclude_appointment is not null
      and exists (
        select 1
        from public.trip_appointments mine
        join public.trip_appointments theirs on theirs.trip_id = mine.trip_id
        where mine.appointment_id = exclude_appointment
          and theirs.appointment_id = a.id
      )
    )
  order by a.starts_at, a.start_time nulls first;
$$;

revoke all on function public.check_appointment_conflicts(uuid,date,date,boolean,time,time,public.appointment_type,uuid) from public;
grant execute on function public.check_appointment_conflicts(uuid,date,date,boolean,time,time,public.appointment_type,uuid) to authenticated;

-- Updating the trip and its linked appointments in one transaction prevents
-- the two date ranges from drifting apart.
create or replace function public.update_trip_with_schedule(
  target_workspace uuid,
  target_trip uuid,
  target_title text,
  target_origin text,
  target_start date,
  target_end date,
  target_hotel_required boolean,
  target_vehicle_required boolean,
  target_flight_required boolean,
  sync_appointments boolean default false
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if target_end < target_start then
    raise exception 'A data de retorno nao pode ser anterior a saida.' using errcode = '22007';
  end if;

  if not exists (
    select 1
    from public.trips t
    where t.id = target_trip
      and t.workspace_id = target_workspace
      and public.is_workspace_member(t.workspace_id)
  ) then
    raise exception 'Viagem nao encontrada ou sem permissao.' using errcode = 'P0002';
  end if;

  if not sync_appointments and exists (
    select 1
    from public.trip_appointments ta
    join public.appointments a on a.id = ta.appointment_id
    where ta.trip_id = target_trip
      and (a.starts_at < target_start or a.ends_at > target_end)
  ) then
    raise exception 'A viagem precisa cobrir os atendimentos vinculados.' using errcode = '23514';
  end if;

  update public.trips
  set title = btrim(target_title),
      origin = nullif(btrim(target_origin), ''),
      starts_at = target_start,
      ends_at = target_end,
      hotel_required = target_hotel_required,
      vehicle_required = target_vehicle_required,
      flight_required = target_flight_required,
      route_distance_km = null,
      route_duration_minutes = null,
      route_calculated_at = null
  where id = target_trip
    and workspace_id = target_workspace;

  if sync_appointments then
    update public.appointments a
    set starts_at = target_start,
        ends_at = target_end
    from public.trip_appointments ta
    where ta.trip_id = target_trip
      and ta.appointment_id = a.id
      and a.workspace_id = target_workspace;
  end if;
end;
$$;

revoke all on function public.update_trip_with_schedule(uuid,uuid,text,text,date,date,boolean,boolean,boolean,boolean) from public;
grant execute on function public.update_trip_with_schedule(uuid,uuid,text,text,date,date,boolean,boolean,boolean,boolean) to authenticated;

-- Server-only delivery ledger. RLS is intentionally enabled without client
-- policies; the Edge Function accesses it through the service role.
create table if not exists public.push_delivery_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  stage integer not null,
  created_at timestamptz not null default now(),
  unique (user_id, entity_type, entity_id, stage)
);

alter table public.push_delivery_log enable row level security;
