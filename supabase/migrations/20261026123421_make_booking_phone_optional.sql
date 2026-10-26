alter table public.booking_requests
  alter column requester_phone drop not null;

create or replace function public.submit_public_booking_request(
  target_token uuid,
  request_data jsonb
)
returns table(id uuid, request_code text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  link_record record;
  created_record record;
  start_value date;
  end_value date;
  quantity_value integer;
  type_value public.appointment_type;
  start_time_value time without time zone;
  end_time_value time without time zone;
  central_value text := nullif(btrim(request_data->>'central'), '');
  requester_name_value text := nullif(btrim(request_data->>'requesterName'), '');
  requester_email_value text := nullif(btrim(request_data->>'requesterEmail'), '');
  requester_phone_value text := nullif(btrim(request_data->>'requesterPhone'), '');
  client_value text := nullif(btrim(request_data->>'clientName'), '');
  farm_value text := nullif(btrim(request_data->>'farmName'), '');
  city_value text := nullif(btrim(request_data->>'city'), '');
  state_value text := upper(nullif(btrim(request_data->>'state'), ''));
  commercial_value text := nullif(btrim(request_data->>'commercialResponsible'), '');
  notes_value text := nullif(btrim(request_data->>'notes'), '');
begin
  if coalesce(btrim(request_data->>'website'), '') <> '' then
    raise exception 'Solicitacao invalida.' using errcode = 'P0001';
  end if;

  select bl.id, bl.workspace_id, bl.owner_user_id
  into link_record
  from public.booking_links bl
  where bl.public_token = target_token and bl.is_active = true;

  if link_record.id is null then
    raise exception 'Link de agendamento invalido ou desativado.' using errcode = 'P0002';
  end if;

  if request_data->>'start' !~ '^\d{4}-\d{2}-\d{2}$'
    or request_data->>'end' !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'Informe um periodo valido.' using errcode = '22007';
  end if;
  start_value := (request_data->>'start')::date;
  end_value := (request_data->>'end')::date;

  if start_value < current_date or end_value < start_value or end_value - start_value > 30 then
    raise exception 'O periodo deve comecar hoje ou depois e ter no maximo 31 dias.' using errcode = '22007';
  end if;

  if request_data->>'quantityCollars' !~ '^[0-9]+$' then
    raise exception 'Informe uma quantidade de colares valida.' using errcode = '22023';
  end if;
  quantity_value := (request_data->>'quantityCollars')::integer;
  if quantity_value <= 0 then
    raise exception 'A quantidade de colares deve ser maior que zero.' using errcode = '22023';
  end if;

  type_value := case request_data->>'appointmentType'
    when 'remote' then 'remoto'::public.appointment_type
    when 'onsite' then 'presencial'::public.appointment_type
    else null
  end;

  if central_value is null or requester_name_value is null
    or client_value is null or farm_value is null or city_value is null or commercial_value is null
    or state_value is null or char_length(state_value) <> 2 or type_value is null then
    raise exception 'Preencha todos os campos obrigatorios.' using errcode = '22023';
  end if;

  if greatest(
    char_length(central_value), char_length(requester_name_value), char_length(coalesce(requester_phone_value, '')),
    char_length(client_value), char_length(farm_value), char_length(city_value), char_length(commercial_value)
  ) > 160 or char_length(coalesce(notes_value, '')) > 1500 then
    raise exception 'Um ou mais campos excedem o tamanho permitido.' using errcode = '22001';
  end if;

  if requester_email_value is not null and requester_email_value !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Informe um e-mail valido.' using errcode = '22023';
  end if;

  if requester_phone_value is not null
    and regexp_replace(requester_phone_value, '[^0-9]', '', 'g') !~ '^[0-9]{10,11}$' then
    raise exception 'Informe um telefone com DDD valido ou deixe o campo vazio.' using errcode = '22023';
  end if;

  if (nullif(request_data->>'preferredStartTime', '') is null)
    <> (nullif(request_data->>'preferredEndTime', '') is null) then
    raise exception 'Informe horario inicial e final ou deixe ambos vazios.' using errcode = '22007';
  end if;

  if type_value = 'remoto' and nullif(request_data->>'preferredStartTime', '') is not null then
    start_time_value := (request_data->>'preferredStartTime')::time;
    end_time_value := (request_data->>'preferredEndTime')::time;
    if end_time_value <= start_time_value then
      raise exception 'O horario final precisa ser posterior ao inicial.' using errcode = '22007';
    end if;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(link_record.workspace_id::text, 0));

  if (
    select count(*)
    from public.booking_requests br
    where br.booking_link_id = link_record.id
      and br.created_at > now() - interval '1 hour'
  ) >= 30 then
    raise exception 'Muitas solicitacoes recentes. Aguarde alguns minutos e tente novamente.' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.appointments a
    where a.responsible_user_id = link_record.owner_user_id
      and a.starts_at <= end_value and a.ends_at >= start_value
  ) or exists (
    select 1 from public.trips t
    where t.workspace_id = link_record.workspace_id
      and t.starts_at <= end_value and t.ends_at >= start_value
  ) or exists (
    select 1 from public.booking_requests br
    where br.workspace_id = link_record.workspace_id
      and br.status = 'pending'
      and br.starts_at <= end_value and br.ends_at >= start_value
  ) then
    raise exception 'Este periodo acabou de ficar indisponivel. Escolha outras datas.' using errcode = 'P0001';
  end if;

  if requester_phone_value is not null and exists (
    select 1 from public.booking_requests br
    where br.booking_link_id = link_record.id
      and br.requester_phone = requester_phone_value
      and br.starts_at = start_value and br.ends_at = end_value
      and br.created_at > now() - interval '10 minutes'
  ) then
    raise exception 'Esta solicitacao ja foi enviada recentemente.' using errcode = 'P0001';
  end if;

  insert into public.booking_requests as created (
    booking_link_id, workspace_id, owner_user_id, central, requester_name,
    requester_email, requester_phone, client_name, farm_name, city, state,
    commercial_responsible, quantity_collars, appointment_type, starts_at, ends_at,
    preferred_start_time, preferred_end_time, notes, holiday_acknowledged
  ) values (
    link_record.id, link_record.workspace_id, link_record.owner_user_id, central_value, requester_name_value,
    requester_email_value, requester_phone_value, client_value, farm_value, city_value, state_value,
    commercial_value, quantity_value, type_value, start_value, end_value,
    start_time_value, end_time_value, notes_value,
    coalesce(request_data->>'holidayAcknowledged', 'false') = 'true'
  )
  returning created.id, created.request_code into created_record;

  insert into public.notifications(workspace_id, user_id, title, body, severity, entity_type, entity_id)
  values (
    link_record.workspace_id,
    link_record.owner_user_id,
    'Nova solicitacao de agenda',
    farm_value || ' - ' || to_char(start_value, 'DD/MM/YYYY') || ' a ' || to_char(end_value, 'DD/MM/YYYY'),
    'info',
    'booking_request',
    created_record.id
  );

  return query select created_record.id, created_record.request_code;
end;
$$;

revoke all on function public.submit_public_booking_request(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.submit_public_booking_request(uuid,jsonb) to anon, authenticated;

create or replace function public.review_public_booking_request(
  target_request uuid,
  decision text,
  reviewer_notes text default null
)
returns table(
  reviewed_request_id uuid,
  new_status public.booking_request_status,
  created_demand_id uuid,
  created_appointment_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_record record;
  company_record record;
  demand_value uuid;
  appointment_value uuid;
  raw_value text;
begin
  if (select auth.uid()) is null then
    raise exception 'Autenticacao obrigatoria.' using errcode = '42501';
  end if;
  if decision not in ('approved', 'rejected') then
    raise exception 'Decisao invalida.' using errcode = '22023';
  end if;

  select br.* into request_record
  from public.booking_requests br
  where br.id = target_request
    and public.is_workspace_member(br.workspace_id)
  for update;

  if request_record.id is null then
    raise exception 'Solicitacao nao encontrada ou sem permissao.' using errcode = 'P0002';
  end if;
  if request_record.status <> 'pending' then
    raise exception 'Esta solicitacao ja foi analisada.' using errcode = 'P0001';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(request_record.workspace_id::text, 0));

  if decision = 'rejected' then
    update public.booking_requests
    set status = 'rejected', reviewed_by = (select auth.uid()), reviewed_at = now(),
        review_notes = nullif(btrim(reviewer_notes), '')
    where id = target_request;

    return query select target_request, 'rejected'::public.booking_request_status, null::uuid, null::uuid;
    return;
  end if;

  if exists (
    select 1 from public.appointments a
    where a.responsible_user_id = request_record.owner_user_id
      and a.starts_at <= request_record.ends_at and a.ends_at >= request_record.starts_at
  ) or exists (
    select 1 from public.trips t
    where t.workspace_id = request_record.workspace_id
      and t.starts_at <= request_record.ends_at and t.ends_at >= request_record.starts_at
  ) or exists (
    select 1 from public.booking_requests br
    where br.workspace_id = request_record.workspace_id
      and br.id <> request_record.id
      and br.status = 'pending'
      and br.starts_at <= request_record.ends_at and br.ends_at >= request_record.starts_at
  ) then
    raise exception 'O periodo possui outro compromisso. Rejeite ou ajuste a solicitacao.' using errcode = 'P0001';
  end if;

  select c.id, c.name, c.product_name into company_record
  from public.companies c
  where c.workspace_id = request_record.workspace_id
    and (
      lower(c.name) = lower(request_record.central)
      or (lower(request_record.central) like '%alta%' and lower(c.name) like '%alta%')
      or (lower(request_record.central) like '%genex%' and lower(c.name) like '%genex%')
    )
  order by (lower(c.name) = lower(request_record.central)) desc
  limit 1;

  raw_value := 'Solicitacao publica ' || request_record.request_code
    || E'\nSolicitante: ' || request_record.requester_name
    || case when request_record.requester_phone is not null then E'\nContato: ' || request_record.requester_phone else '' end
    || case when request_record.requester_email is not null then E'\nE-mail: ' || request_record.requester_email else '' end
    || case when request_record.notes is not null then E'\nObservacoes: ' || request_record.notes else '' end;

  update public.booking_requests
  set status = 'approved', reviewed_by = (select auth.uid()), reviewed_at = now(),
      review_notes = nullif(btrim(reviewer_notes), '')
  where id = target_request;

  insert into public.demands (
    workspace_id, company_id, created_by, client_name_snapshot, company_name_snapshot,
    product_name_snapshot, regional_snapshot, farm_name_snapshot, city_snapshot, state_snapshot,
    quantity_collars, priority, raw_information, next_step, status
  ) values (
    request_record.workspace_id, company_record.id, (select auth.uid()), request_record.client_name,
    coalesce(company_record.name, request_record.central),
    coalesce(company_record.product_name,
      case when lower(request_record.central) like '%alta%' then 'Alta Cow Watch'
           when lower(request_record.central) like '%genex%' then 'Herd Monitor'
           else '' end),
    request_record.commercial_responsible, request_record.farm_name, request_record.city, request_record.state,
    request_record.quantity_collars, 3, raw_value,
    case when request_record.appointment_type = 'presencial' then 'Organizar viagem' else 'Atendimento agendado' end,
    'scheduled'
  ) returning id into demand_value;

  insert into public.appointments (
    workspace_id, demand_id, responsible_user_id, title, farm_name_snapshot,
    city_snapshot, state_snapshot, appointment_type, starts_at, ends_at, all_day,
    start_time, end_time, client_confirmed, notes
  ) values (
    request_record.workspace_id, demand_value, request_record.owner_user_id, request_record.client_name,
    request_record.farm_name, request_record.city, request_record.state, request_record.appointment_type,
    request_record.starts_at, request_record.ends_at,
    request_record.preferred_start_time is null,
    request_record.preferred_start_time, request_record.preferred_end_time, true,
    'Criado a partir da solicitacao ' || request_record.request_code
  ) returning id into appointment_value;

  update public.booking_requests
  set demand_id = demand_value, appointment_id = appointment_value
  where id = target_request;

  return query select target_request, 'approved'::public.booking_request_status, demand_value, appointment_value;
end;
$$;

revoke all on function public.review_public_booking_request(uuid,text,text) from public, anon;
grant execute on function public.review_public_booking_request(uuid,text,text) to authenticated;
