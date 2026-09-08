-- Routine Assist v1.9
-- Perfil do passageiro + controle de passagem aérea.
-- Não apaga dados existentes.

alter table public.profiles add column if not exists cpf text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists birth_date date;

alter table public.trips add column if not exists flight_required boolean not null default false;

create table if not exists public.flight_reservations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  trip_id uuid not null references public.trips(id) on delete cascade,
  status text not null default 'not_requested' check (status in ('not_requested','requested','confirmed')),
  outbound_origin text,
  outbound_destination text,
  outbound_date date,
  outbound_time time,
  return_origin text,
  return_destination text,
  return_date date,
  return_time time,
  airline text,
  locator text,
  outbound_flight_number text,
  return_flight_number text,
  requested_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(trip_id)
);

alter table public.flight_reservations enable row level security;

drop policy if exists "flight reservations workspace read" on public.flight_reservations;
create policy "flight reservations workspace read" on public.flight_reservations
for select using (
  exists(select 1 from public.trips t where t.id=trip_id and public.is_workspace_member(t.workspace_id))
);

drop policy if exists "flight reservations workspace insert" on public.flight_reservations;
create policy "flight reservations workspace insert" on public.flight_reservations
for insert with check (
  public.is_workspace_member(workspace_id)
  and exists(select 1 from public.trips t where t.id=trip_id and t.workspace_id=workspace_id)
);

drop policy if exists "flight reservations workspace update" on public.flight_reservations;
create policy "flight reservations workspace update" on public.flight_reservations
for update using (
  exists(select 1 from public.trips t where t.id=trip_id and public.is_workspace_member(t.workspace_id))
) with check (
  public.is_workspace_member(workspace_id)
  and exists(select 1 from public.trips t where t.id=trip_id and t.workspace_id=workspace_id)
);

drop policy if exists "flight reservations workspace delete" on public.flight_reservations;
create policy "flight reservations workspace delete" on public.flight_reservations
for delete using (
  exists(select 1 from public.trips t where t.id=trip_id and public.is_workspace_member(t.workspace_id))
);

create index if not exists flight_reservations_workspace_idx on public.flight_reservations(workspace_id);
create index if not exists flight_reservations_trip_idx on public.flight_reservations(trip_id);

-- Mantém updated_at da passagem sincronizado.
drop trigger if exists set_updated_at on public.flight_reservations;
create trigger set_updated_at
before update on public.flight_reservations
for each row execute function public.set_updated_at();
