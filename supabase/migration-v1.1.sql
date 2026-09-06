-- Routine Assist v1.1
-- Adiciona o nome da fazenda como informação operacional do atendimento.
-- Mantém os campos técnicos VPU/Antena UHF antigos apenas por compatibilidade,
-- mas eles deixam de ser exibidos no app.

alter table public.demands
  add column if not exists farm_name_snapshot text;

alter table public.appointments
  add column if not exists farm_name_snapshot text;

-- Se já houver uma fazenda vinculada, aproveita o nome existente.
update public.demands d
set farm_name_snapshot = f.name
from public.farms f
where d.farm_id = f.id
  and (d.farm_name_snapshot is null or btrim(d.farm_name_snapshot) = '')
  and f.name is not null;

update public.appointments a
set farm_name_snapshot = f.name
from public.farms f
where a.farm_id = f.id
  and (a.farm_name_snapshot is null or btrim(a.farm_name_snapshot) = '')
  and f.name is not null;

-- Corrige registros de teste/futuros que tenham ficado como "done"
-- embora ainda possuam compromisso futuro. A situação visual passa a ser
-- calculada automaticamente pelo app.
update public.demands d
set status = 'scheduled',
    next_step = case
      when exists (
        select 1
        from public.appointments a
        join public.trip_appointments ta on ta.appointment_id = a.id
        where a.demand_id = d.id
      ) then 'Organizar hotel e veículo'
      else 'Organizar viagem'
    end,
    updated_at = now()
where d.status = 'done'
  and exists (
    select 1
    from public.appointments a
    where a.demand_id = d.id
      and a.ends_at >= current_date
  );
