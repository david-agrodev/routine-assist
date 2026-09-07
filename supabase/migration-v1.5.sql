-- Routine Assist v1.5 — conclusão de viagens e histórico
-- Execute uma vez no SQL Editor do Supabase.

alter table public.trips
  add column if not exists status text not null default 'planned';

alter table public.trips
  add column if not exists completed_at timestamptz;

DO $$
BEGIN
  ALTER TABLE public.trips
    ADD CONSTRAINT trips_status_check CHECK (status in ('planned','completed'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

update public.trips set status = 'planned' where status is null;
