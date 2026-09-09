-- Routine Assist v2.0
-- Prioridade das demandas para ordenar a fila de trabalho.
-- Não apaga dados existentes.

alter table public.demands add column if not exists priority text not null default 'normal';
alter table public.demands drop constraint if exists demands_priority_check;

alter table public.demands alter column priority drop default;
alter table public.demands alter column priority type integer using (
	case priority
		when 'urgent' then 5
		when 'high' then 4
		when 'normal' then 3
		when 'low' then 1
		else 3
	end
);
alter table public.demands alter column priority set default 3;
alter table public.demands alter column priority set not null;
alter table public.demands add constraint demands_priority_check check (priority between 1 and 5);
