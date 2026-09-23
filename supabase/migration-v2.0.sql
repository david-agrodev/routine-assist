-- Routine Assist v2.0
-- Prioridade das demandas para ordenar a fila de trabalho.
-- Não apaga dados existentes.

alter table public.demands add column if not exists priority text not null default 'normal';
alter table public.demands drop constraint if exists demands_priority_check;

alter table public.demands alter column priority drop default;
alter table public.demands alter column priority type integer using (
  case
    when priority is null then 3
    when priority::text ~ '^\d+$' then least(5, greatest(1, priority::text::integer))
    when lower(priority::text) = 'urgent' then 5
    when lower(priority::text) = 'high' then 4
    when lower(priority::text) = 'normal' then 3
    when lower(priority::text) = 'low' then 1
    else 3
  end
);
alter table public.demands alter column priority set default 3;
alter table public.demands alter column priority set not null;
alter table public.demands add constraint demands_priority_check check (priority between 1 and 5);
