-- Routine Assist v0.3 — Supabase setup
-- Execute este arquivo UMA VEZ no SQL Editor do projeto Routine Assist.
-- Ele cria estrutura multiusuário, RLS, empresas padrão, agenda, viagens,
-- hospedagem, veículo, notificações e vínculos futuros com Control Tech.

create extension if not exists pgcrypto;

DO $$ BEGIN CREATE TYPE public.member_role AS ENUM ('admin','member'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.demand_status AS ENUM ('received','waiting_info','contact','scheduled','done','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.appointment_type AS ENUM ('presencial','remoto','a_definir'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.vehicle_status AS ENUM ('not_required','not_requested','requested','confirmed','picked_up','returned'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.price_mode AS ENUM ('daily','total'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Routine Assist',
  owner_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.member_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (workspace_id,user_id)
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  product_name text,
  created_at timestamptz not null default now(),
  unique(workspace_id,name)
);

create table if not exists public.commercial_contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  name text not null,
  role text,
  phone text,
  email text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.farms (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  name text,
  city text,
  state text,
  address text,
  latitude numeric,
  longitude numeric,
  control_tech_farm_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.demands (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  farm_id uuid references public.farms(id) on delete set null,
  commercial_contact_id uuid references public.commercial_contacts(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  client_name_snapshot text not null,
  company_name_snapshot text,
  product_name_snapshot text,
  regional_snapshot text,
  farm_name_snapshot text,
  city_snapshot text,
  state_snapshot text,
  quantity_collars integer check (quantity_collars is null or quantity_collars >= 0),
  vpu_count integer check (vpu_count is null or vpu_count >= 0),
  uhf_antenna_count integer check (uhf_antenna_count is null or uhf_antenna_count >= 0),
  extra_antenna_count integer check (extra_antenna_count is null or extra_antenna_count >= 0),
  raw_information text,
  notes text,
  next_step text not null default 'Completar informações',
  priority integer not null default 3 check (priority between 1 and 5),
  status public.demand_status not null default 'received',
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  demand_id uuid references public.demands(id) on delete set null,
  farm_id uuid references public.farms(id) on delete set null,
  responsible_user_id uuid not null references public.profiles(id) on delete restrict,
  title text not null,
  farm_name_snapshot text,
  city_snapshot text,
  state_snapshot text,
  appointment_type public.appointment_type not null default 'a_definir',
  starts_at date not null,
  ends_at date not null,
  client_confirmed boolean not null default false,
  pre_install_status text not null default 'not_sent',
  allow_conflict boolean not null default false,
  notes text,
  control_tech_external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointment_valid_range check (ends_at >= starts_at)
);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  title text not null,
  origin text,
  starts_at date not null,
  ends_at date not null,
  hotel_required boolean not null default true,
  vehicle_required boolean not null default true,
  status text not null default 'planned' check (status in ('planned','completed')),
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trip_valid_range check (ends_at >= starts_at)
);

create table if not exists public.trip_appointments (
  trip_id uuid not null references public.trips(id) on delete cascade,
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  sort_order integer not null default 0,
  primary key (trip_id,appointment_id)
);

create table if not exists public.hotels (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  address text,
  city text,
  state text,
  phone text,
  latitude numeric,
  longitude numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lodging_reservations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  trip_id uuid not null references public.trips(id) on delete cascade,
  hotel_id uuid references public.hotels(id) on delete set null,
  check_in date not null,
  check_out date not null,
  price_mode public.price_mode not null default 'daily',
  daily_value numeric(12,2),
  total_value numeric(12,2),
  reservation_code text,
  confirmed boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lodging_valid_range check (check_out >= check_in)
);

create table if not exists public.vehicle_reservations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  trip_id uuid not null references public.trips(id) on delete cascade,
  status public.vehicle_status not null default 'not_requested',
  rental_company text check (rental_company is null or rental_company in ('Localiza','Unidas')),
  requested_at timestamptz,
  pickup_at date,
  return_at date,
  pickup_location text,
  locator text,
  form_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  assigned_to uuid references public.profiles(id) on delete set null,
  demand_id uuid references public.demands(id) on delete cascade,
  trip_id uuid references public.trips(id) on delete cascade,
  title text not null,
  due_at timestamptz,
  completed_at timestamptz,
  auto_generated boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  alert_days integer[] not null default array[14,7,3,1],
  in_app_enabled boolean not null default true,
  push_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  severity text not null default 'info',
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text,
  auth text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  title text not null,
  starts_at date not null,
  ends_at date not null,
  category text not null default 'reminder',
  notes text,
  created_at timestamptz not null default now(),
  constraint calendar_event_valid_range check (ends_at >= starts_at)
);

create table if not exists public.integration_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  provider text not null,
  external_user_id text,
  external_email text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id,user_id,provider)
);

-- ============================================================
-- Helpers de autenticação / workspace
-- ============================================================
create or replace function public.is_workspace_member(target_workspace uuid)
returns boolean
language sql stable security definer set search_path=public
as $$
  select exists(
    select 1 from public.workspace_members wm
    where wm.workspace_id=target_workspace and wm.user_id=auth.uid()
  );
$$;

create or replace function public.is_workspace_admin(target_workspace uuid)
returns boolean
language sql stable security definer set search_path=public
as $$
  select exists(
    select 1 from public.workspace_members wm
    where wm.workspace_id=target_workspace
      and wm.user_id=auth.uid()
      and wm.role='admin'
  );
$$;

create or replace function public.ensure_default_companies(target_workspace uuid)
returns void
language plpgsql security definer set search_path=public
as $$
begin
  insert into public.companies(workspace_id,name,product_name)
  values
    (target_workspace,'Alta','Alta Cow Watch'),
    (target_workspace,'GENEX','Herd Monitor')
  on conflict (workspace_id,name) do update set product_name=excluded.product_name;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path=public
as $$
declare
  ws uuid;
begin
  insert into public.profiles(id,full_name)
  values(new.id,coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;

  insert into public.notification_preferences(user_id)
  values(new.id)
  on conflict (user_id) do nothing;

  -- Primeiro acesso cria um workspace próprio. Usuários convidados poderão
  -- ser associados a outro workspace no módulo de equipe futuramente.
  if not exists(select 1 from public.workspace_members where user_id=new.id) then
    insert into public.workspaces(name,owner_id)
    values('Routine Assist',new.id)
    returning id into ws;

    insert into public.workspace_members(workspace_id,user_id,role)
    values(ws,new.id,'admin');

    perform public.ensure_default_companies(ws);
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Garante que uma conta já existente antes deste setup também seja preparada.
create or replace function public.bootstrap_current_user()
returns uuid
language plpgsql security definer set search_path=public
as $$
declare
  uid uuid := auth.uid();
  ws uuid;
  display_name text;
begin
  if uid is null then
    raise exception 'Usuário não autenticado';
  end if;

  select coalesce(raw_user_meta_data->>'full_name', split_part(email,'@',1))
    into display_name
  from auth.users where id=uid;

  insert into public.profiles(id,full_name)
  values(uid,coalesce(display_name,'Usuário'))
  on conflict (id) do nothing;

  insert into public.notification_preferences(user_id)
  values(uid)
  on conflict (user_id) do nothing;

  select workspace_id into ws
  from public.workspace_members
  where user_id=uid
  order by created_at
  limit 1;

  if ws is null then
    insert into public.workspaces(name,owner_id)
    values('Routine Assist',uid)
    returning id into ws;

    insert into public.workspace_members(workspace_id,user_id,role)
    values(ws,uid,'admin');
  end if;

  perform public.ensure_default_companies(ws);
  return ws;
end;
$$;

revoke all on function public.bootstrap_current_user() from public;
grant execute on function public.bootstrap_current_user() to authenticated;

-- Conflito de agenda: sobreposição inclusiva de datas para o mesmo responsável.
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
  order by a.starts_at;
$$;

revoke all on function public.check_appointment_conflicts(uuid,date,date,uuid) from public;
grant execute on function public.check_appointment_conflicts(uuid,date,date,uuid) to authenticated;

-- ============================================================
-- updated_at automático
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles','farms','demands','appointments','trips','hotels',
    'lodging_reservations','vehicle_reservations','notification_preferences','integration_links'
  ]
  LOOP
    EXECUTE format('drop trigger if exists set_updated_at on public.%I', t);
    EXECUTE format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  END LOOP;
END $$;

-- ============================================================
-- RLS
-- ============================================================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles','workspaces','workspace_members','companies','commercial_contacts','clients','farms','demands',
    'appointments','trips','trip_appointments','hotels','lodging_reservations','vehicle_reservations','tasks',
    'notification_preferences','notifications','push_subscriptions','calendar_events','integration_links'
  ]
  LOOP
    EXECUTE format('alter table public.%I enable row level security', t);
  END LOOP;
END $$;

-- policies básicas
DROP POLICY IF EXISTS "profiles own read" ON public.profiles;
CREATE POLICY "profiles own read" ON public.profiles FOR SELECT USING (id=auth.uid());
DROP POLICY IF EXISTS "profiles own update" ON public.profiles;
CREATE POLICY "profiles own update" ON public.profiles FOR UPDATE USING (id=auth.uid()) WITH CHECK (id=auth.uid());

DROP POLICY IF EXISTS "workspaces members read" ON public.workspaces;
CREATE POLICY "workspaces members read" ON public.workspaces FOR SELECT USING (public.is_workspace_member(id) OR owner_id=auth.uid());
DROP POLICY IF EXISTS "workspaces admin update" ON public.workspaces;
CREATE POLICY "workspaces admin update" ON public.workspaces FOR UPDATE USING (public.is_workspace_admin(id)) WITH CHECK (public.is_workspace_admin(id));

DROP POLICY IF EXISTS "workspace members read" ON public.workspace_members;
CREATE POLICY "workspace members read" ON public.workspace_members FOR SELECT USING (public.is_workspace_member(workspace_id) OR user_id=auth.uid());
DROP POLICY IF EXISTS "workspace members admin insert" ON public.workspace_members;
CREATE POLICY "workspace members admin insert" ON public.workspace_members FOR INSERT WITH CHECK (public.is_workspace_admin(workspace_id));
DROP POLICY IF EXISTS "workspace members admin update" ON public.workspace_members;
CREATE POLICY "workspace members admin update" ON public.workspace_members FOR UPDATE USING (public.is_workspace_admin(workspace_id)) WITH CHECK (public.is_workspace_admin(workspace_id));
DROP POLICY IF EXISTS "workspace members admin delete" ON public.workspace_members;
CREATE POLICY "workspace members admin delete" ON public.workspace_members FOR DELETE USING (public.is_workspace_admin(workspace_id) AND user_id<>auth.uid());

-- Tabelas com workspace_id: membros podem CRUD por enquanto.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'companies','commercial_contacts','clients','farms','demands','appointments','trips','hotels',
    'lodging_reservations','vehicle_reservations','tasks','notifications','calendar_events','integration_links'
  ]
  LOOP
    EXECUTE format('drop policy if exists %I on public.%I', t||'_members_all', t);
    EXECUTE format(
      'create policy %I on public.%I for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id))',
      t||'_members_all', t
    );
  END LOOP;
END $$;

DROP POLICY IF EXISTS "trip appointment members" ON public.trip_appointments;
CREATE POLICY "trip appointment members" ON public.trip_appointments FOR ALL
USING (
  exists(select 1 from public.trips t where t.id=trip_id and public.is_workspace_member(t.workspace_id))
)
WITH CHECK (
  exists(select 1 from public.trips t where t.id=trip_id and public.is_workspace_member(t.workspace_id))
);

DROP POLICY IF EXISTS "notification prefs own" ON public.notification_preferences;
CREATE POLICY "notification prefs own" ON public.notification_preferences FOR ALL
USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());

DROP POLICY IF EXISTS "push subscriptions own" ON public.push_subscriptions;
CREATE POLICY "push subscriptions own" ON public.push_subscriptions FOR ALL
USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());

-- ============================================================
-- Índices
-- ============================================================
create index if not exists demands_workspace_status_idx on public.demands(workspace_id,status);
create index if not exists demands_created_idx on public.demands(workspace_id,created_at desc);
create index if not exists appointments_user_dates_idx on public.appointments(responsible_user_id,starts_at,ends_at);
create index if not exists trips_workspace_dates_idx on public.trips(workspace_id,starts_at,ends_at);
create index if not exists tasks_open_idx on public.tasks(assigned_to,due_at) where completed_at is null;
create index if not exists notifications_user_idx on public.notifications(user_id,read_at,created_at desc);

-- Final: se houver uma sessão autenticada no SQL editor não é necessário fazer nada.
-- O app chamará bootstrap_current_user() no primeiro login.

-- ============================================================
-- v1.3: bloqueio definitivo de sobreposição por responsável
-- ============================================================
create or replace function public.prevent_appointment_overlap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.appointments a
    where a.responsible_user_id = new.responsible_user_id
      and a.id is distinct from new.id
      and a.starts_at <= new.ends_at
      and a.ends_at >= new.starts_at
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

-- v1.9 additions: passenger profile and flight reservations
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
create policy "flight reservations workspace read" on public.flight_reservations for select using (exists(select 1 from public.trips t where t.id=trip_id and public.is_workspace_member(t.workspace_id)));
drop policy if exists "flight reservations workspace insert" on public.flight_reservations;
create policy "flight reservations workspace insert" on public.flight_reservations for insert with check (public.is_workspace_member(workspace_id) and exists(select 1 from public.trips t where t.id=trip_id and t.workspace_id=workspace_id));
drop policy if exists "flight reservations workspace update" on public.flight_reservations;
create policy "flight reservations workspace update" on public.flight_reservations for update using (exists(select 1 from public.trips t where t.id=trip_id and public.is_workspace_member(t.workspace_id))) with check (public.is_workspace_member(workspace_id) and exists(select 1 from public.trips t where t.id=trip_id and t.workspace_id=workspace_id));
drop policy if exists "flight reservations workspace delete" on public.flight_reservations;
create policy "flight reservations workspace delete" on public.flight_reservations for delete using (exists(select 1 from public.trips t where t.id=trip_id and public.is_workspace_member(t.workspace_id)));

-- v1.9: updated_at automático da passagem.
drop trigger if exists set_updated_at on public.flight_reservations;
create trigger set_updated_at before update on public.flight_reservations for each row execute function public.set_updated_at();

-- Em uma viagem unificada, atendimentos da mesma viagem podem compartilhar datas.
-- Sobreposições entre compromissos fora da mesma viagem continuam bloqueadas.
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
