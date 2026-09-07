-- Routine Assist v1.6 — rota estimada e conflitos dentro da mesma viagem
-- Execute uma vez no SQL Editor do Supabase. Não apaga dados existentes.

alter table public.trips
  add column if not exists route_distance_km numeric(10,1);

alter table public.trips
  add column if not exists route_duration_minutes integer;

alter table public.trips
  add column if not exists route_calculated_at timestamptz;

-- Ao editar um atendimento que já pertence a uma viagem, uma sobreposição com
-- outro atendimento da MESMA viagem não é conflito. Viagens diferentes continuam bloqueadas.
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
      and not exists (
        select 1
        from public.trip_appointments mine
        join public.trip_appointments theirs on theirs.trip_id = mine.trip_id
        where mine.appointment_id = new.id
          and theirs.appointment_id = a.id
      )
  ) then
    raise exception 'Período indisponível: já existe outro atendimento para este responsável nas datas selecionadas.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_appointment_overlap on public.appointments;
create trigger prevent_appointment_overlap
before insert or update of responsible_user_id, starts_at, ends_at
on public.appointments
for each row execute function public.prevent_appointment_overlap();

create or replace function public.check_appointment_conflicts(
  target_user uuid,
  target_start date,
  target_end date,
  exclude_appointment uuid default null
)
returns table(id uuid,title text,starts_at date,ends_at date)
language sql stable security definer set search_path=public
as $$
  select a.id,a.title,a.starts_at,a.ends_at
  from public.appointments a
  where a.responsible_user_id=target_user
    and a.id is distinct from exclude_appointment
    and a.starts_at <= target_end
    and a.ends_at >= target_start
    and public.is_workspace_member(a.workspace_id)
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
  order by a.starts_at;
$$;

revoke all on function public.check_appointment_conflicts(uuid,date,date,uuid) from public;
grant execute on function public.check_appointment_conflicts(uuid,date,date,uuid) to authenticated;
