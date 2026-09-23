alter table public.flight_reservations
  add column if not exists segments jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'flight_reservations_segments_array_check'
      and conrelid = 'public.flight_reservations'::regclass
  ) then
    alter table public.flight_reservations
      add constraint flight_reservations_segments_array_check
      check (jsonb_typeof(segments) = 'array');
  end if;
end $$;
