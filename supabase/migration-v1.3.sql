-- Routine Assist v1.3
-- Bloqueio definitivo de sobreposição de atendimentos para o mesmo responsável.
-- Seguro para bases existentes: não apaga dados e não falha por conflitos antigos.

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
