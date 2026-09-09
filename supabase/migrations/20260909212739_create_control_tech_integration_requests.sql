create table if not exists public.control_tech_integration_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  demand_id uuid not null references public.demands(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete restrict,
  origin text not null default 'routine-assist',
  destination text not null default 'control-tech-assist',
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  attempts integer not null default 0,
  last_error text,
  external_reference text,
  processed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint control_tech_integration_requests_status_check
    check (status in ('pending','processing','completed','failed','cancelled')),
  constraint control_tech_integration_requests_attempts_check check (attempts >= 0),
  constraint control_tech_integration_requests_origin_check check (length(trim(origin)) > 0),
  constraint control_tech_integration_requests_destination_check check (length(trim(destination)) > 0)
);

alter table public.control_tech_integration_requests enable row level security;
grant select, insert, update on table public.control_tech_integration_requests to authenticated;

drop policy if exists "control tech integration requests members read" on public.control_tech_integration_requests;
create policy "control tech integration requests members read"
on public.control_tech_integration_requests
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "control tech integration requests members insert" on public.control_tech_integration_requests;
create policy "control tech integration requests members insert"
on public.control_tech_integration_requests
for insert
with check (
  requested_by = auth.uid()
  and public.is_workspace_member(workspace_id)
  and exists (
    select 1
    from public.demands d
    where d.id = demand_id
      and d.workspace_id = control_tech_integration_requests.workspace_id
  )
);

drop policy if exists "control tech integration requests members update" on public.control_tech_integration_requests;
create policy "control tech integration requests members update"
on public.control_tech_integration_requests
for update
using (
  public.is_workspace_member(workspace_id)
  and exists (
    select 1
    from public.demands d
    where d.id = demand_id
      and d.workspace_id = control_tech_integration_requests.workspace_id
  )
)
with check (
  public.is_workspace_member(workspace_id)
  and exists (
    select 1
    from public.demands d
    where d.id = demand_id
      and d.workspace_id = control_tech_integration_requests.workspace_id
  )
);

create index if not exists control_tech_integration_requests_workspace_status_idx
  on public.control_tech_integration_requests(workspace_id,status,created_at desc);
create index if not exists control_tech_integration_requests_demand_idx
  on public.control_tech_integration_requests(demand_id,created_at desc);
create index if not exists control_tech_integration_requests_requested_by_idx
  on public.control_tech_integration_requests(requested_by,created_at desc);

drop trigger if exists set_updated_at on public.control_tech_integration_requests;
create trigger set_updated_at
before update on public.control_tech_integration_requests
for each row execute function public.set_updated_at();
