-- Durable, workspace-scoped OS integration event stream.
-- Source writes and target reads are independently permission-checked.
begin;

create table if not exists public.os_integration_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source_system text not null check (source_system ~ '^[a-z][a-z0-9_]{1,39}$'),
  event_type text not null check (event_type ~ '^[a-z][a-z0-9_.]{2,119}
  entity_type text not null check (length(entity_type) between 1 and 80),
  entity_id text not null check (length(entity_id) between 1 and 160),
  idempotency_key text not null check (length(idempotency_key) between 8 and 200),
  occurred_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object' and pg_column_size(payload) <= 16384),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (workspace_id, source_system, idempotency_key)
);
create index if not exists os_integration_events_recent_idx
  on public.os_integration_events(workspace_id, source_system, created_at desc);

alter table public.os_integration_events enable row level security;
revoke all on public.os_integration_events from anon, authenticated;
grant select, insert on public.os_integration_events to authenticated;

create policy os_integration_events_select on public.os_integration_events
  for select to authenticated
  using (public.ws_access_level(workspace_id,'projects','main') in ('view','edit')
     and public.ws_access_level(workspace_id,source_system,'main') in ('view','edit'));
create policy os_integration_events_insert on public.os_integration_events
  for insert to authenticated
  with check (created_by = auth.uid()
     and public.ws_access_level(workspace_id,source_system,'main') = 'edit');

create or replace function public.os_integration_event_publish(
  p_workspace_id uuid,
  p_source_system text,
  p_event_type text,
  p_entity_type text,
  p_entity_id text,
  p_idempotency_key text,
  p_occurred_at timestamptz,
  p_payload jsonb default '{}'::jsonb
) returns jsonb
language plpgsql security invoker set search_path = public
as $$
declare v_event public.os_integration_events%rowtype;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if p_source_system is null or p_event_type is null or split_part(p_event_type,'.',1) <> p_source_system then
    raise exception 'INTEGRATION_EVENT_SOURCE_MISMATCH' using errcode='22023';
  end if;
  if public.ws_access_level(p_workspace_id,p_source_system,'main') <> 'edit' then
    raise exception 'INTEGRATION_SOURCE_EDIT_DENIED' using errcode='42501';
  end if;
  if coalesce(length(p_entity_type),0) not between 1 and 80
     or coalesce(length(p_entity_id),0) not between 1 and 160
     or coalesce(length(p_idempotency_key),0) not between 8 and 200
     or jsonb_typeof(coalesce(p_payload,'{}'::jsonb)) <> 'object'
     or pg_column_size(coalesce(p_payload,'{}'::jsonb)) > 16384 then
    raise exception 'INTEGRATION_EVENT_INVALID' using errcode='22023';
  end if;

  insert into public.os_integration_events(
    workspace_id,source_system,event_type,entity_type,entity_id,idempotency_key,occurred_at,payload,created_by
  ) values (
    p_workspace_id,p_source_system,p_event_type,p_entity_type,p_entity_id,p_idempotency_key,
    coalesce(p_occurred_at,now()),coalesce(p_payload,'{}'::jsonb),auth.uid()
  )
  on conflict (workspace_id,source_system,idempotency_key) do nothing
  returning * into v_event;

  if not found then
    return jsonb_build_object('duplicate',true,'idempotencyKey',p_idempotency_key);
  end if;
  return jsonb_build_object(
    'id',v_event.id,'workspaceId',v_event.workspace_id,'source',v_event.source_system,
    'type',v_event.event_type,'entityType',v_event.entity_type,'entityId',v_event.entity_id,
    'idempotencyKey',v_event.idempotency_key,'occurredAt',v_event.occurred_at,'payload',v_event.payload
  );
end $$;

create or replace function public.os_integration_events_load(
  p_workspace_id uuid,
  p_source_system text default 'hobbies',
  p_limit integer default 20
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_events jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if public.ws_access_level(p_workspace_id,'projects','main') not in ('view','edit')
     or public.ws_access_level(p_workspace_id,p_source_system,'main') not in ('view','edit') then
    raise exception 'INTEGRATION_EVENT_READ_DENIED' using errcode='42501';
  end if;
  select coalesce(jsonb_agg(x.event order by x.created_at desc),'[]'::jsonb) into v_events
  from (
    select jsonb_build_object(
      'id',e.id,'workspaceId',e.workspace_id,'source',e.source_system,
      'type',e.event_type,'entityType',e.entity_type,'entityId',e.entity_id,
      'idempotencyKey',e.idempotency_key,'occurredAt',e.occurred_at,'payload',e.payload
    ) as event,e.created_at
    from public.os_integration_events e
    where e.workspace_id=p_workspace_id and e.source_system=p_source_system
    order by e.created_at desc limit greatest(1,least(coalesce(p_limit,20),100))
  ) x;
  return v_events;
end $$;

revoke all on function public.os_integration_event_publish(uuid,text,text,text,text,text,timestamptz,jsonb) from public,anon;
revoke all on function public.os_integration_events_load(uuid,text,integer) from public,anon;
grant execute on function public.os_integration_event_publish(uuid,text,text,text,text,text,timestamptz,jsonb) to authenticated;
grant execute on function public.os_integration_events_load(uuid,text,integer) to authenticated;

commit;
 and split_part(event_type,'.',1) = source_system),
  entity_type text not null check (length(entity_type) between 1 and 80),
  entity_id text not null check (length(entity_id) between 1 and 160),
  idempotency_key text not null check (length(idempotency_key) between 8 and 200),
  occurred_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object' and pg_column_size(payload) <= 16384),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (workspace_id, source_system, idempotency_key)
);
create index if not exists os_integration_events_recent_idx
  on public.os_integration_events(workspace_id, source_system, created_at desc);

alter table public.os_integration_events enable row level security;
revoke all on public.os_integration_events from anon, authenticated;

create or replace function public.os_integration_event_publish(
  p_workspace_id uuid,
  p_source_system text,
  p_event_type text,
  p_entity_type text,
  p_entity_id text,
  p_idempotency_key text,
  p_occurred_at timestamptz,
  p_payload jsonb default '{}'::jsonb
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_event public.os_integration_events%rowtype;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if p_source_system is null or p_event_type is null or split_part(p_event_type,'.',1) <> p_source_system then
    raise exception 'INTEGRATION_EVENT_SOURCE_MISMATCH' using errcode='22023';
  end if;
  if public.ws_access_level(p_workspace_id,p_source_system,'main') <> 'edit' then
    raise exception 'INTEGRATION_SOURCE_EDIT_DENIED' using errcode='42501';
  end if;
  if coalesce(length(p_entity_type),0) not between 1 and 80
     or coalesce(length(p_entity_id),0) not between 1 and 160
     or coalesce(length(p_idempotency_key),0) not between 8 and 200
     or jsonb_typeof(coalesce(p_payload,'{}'::jsonb)) <> 'object'
     or pg_column_size(coalesce(p_payload,'{}'::jsonb)) > 16384 then
    raise exception 'INTEGRATION_EVENT_INVALID' using errcode='22023';
  end if;

  insert into public.os_integration_events(
    workspace_id,source_system,event_type,entity_type,entity_id,idempotency_key,occurred_at,payload,created_by
  ) values (
    p_workspace_id,p_source_system,p_event_type,p_entity_type,p_entity_id,p_idempotency_key,
    coalesce(p_occurred_at,now()),coalesce(p_payload,'{}'::jsonb),auth.uid()
  )
  on conflict (workspace_id,source_system,idempotency_key) do nothing;

  select * into v_event from public.os_integration_events
  where workspace_id=p_workspace_id and source_system=p_source_system and idempotency_key=p_idempotency_key;
  return jsonb_build_object(
    'id',v_event.id,'workspaceId',v_event.workspace_id,'source',v_event.source_system,
    'type',v_event.event_type,'entityType',v_event.entity_type,'entityId',v_event.entity_id,
    'idempotencyKey',v_event.idempotency_key,'occurredAt',v_event.occurred_at,'payload',v_event.payload
  );
end $$;

create or replace function public.os_integration_events_load(
  p_workspace_id uuid,
  p_source_system text default 'hobbies',
  p_limit integer default 20
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_events jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if public.ws_access_level(p_workspace_id,'projects','main') not in ('view','edit')
     or public.ws_access_level(p_workspace_id,p_source_system,'main') not in ('view','edit') then
    raise exception 'INTEGRATION_EVENT_READ_DENIED' using errcode='42501';
  end if;
  select coalesce(jsonb_agg(x.event order by x.created_at desc),'[]'::jsonb) into v_events
  from (
    select jsonb_build_object(
      'id',e.id,'workspaceId',e.workspace_id,'source',e.source_system,
      'type',e.event_type,'entityType',e.entity_type,'entityId',e.entity_id,
      'idempotencyKey',e.idempotency_key,'occurredAt',e.occurred_at,'payload',e.payload
    ) as event,e.created_at
    from public.os_integration_events e
    where e.workspace_id=p_workspace_id and e.source_system=p_source_system
    order by e.created_at desc limit greatest(1,least(coalesce(p_limit,20),100))
  ) x;
  return v_events;
end $$;

revoke all on function public.os_integration_event_publish(uuid,text,text,text,text,text,timestamptz,jsonb) from public,anon;
revoke all on function public.os_integration_events_load(uuid,text,integer) from public,anon;
grant execute on function public.os_integration_event_publish(uuid,text,text,text,text,text,timestamptz,jsonb) to authenticated;
grant execute on function public.os_integration_events_load(uuid,text,integer) to authenticated;

commit;
