-- Append-only, privacy-aware audit history for Hobbies Journal records.
-- Content bodies and attachment paths are intentionally excluded from snapshots.
begin;

create table if not exists public.hobbies_journal_audit_events (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  record_id text not null,
  action text not null check (action in ('created','updated','deleted','restored')),
  actor_id uuid not null references auth.users(id) on delete restrict,
  occurred_at timestamptz not null default clock_timestamp(),
  visible_to uuid[],
  before_state jsonb,
  after_state jsonb
);

create index if not exists hobbies_journal_audit_record_idx
  on public.hobbies_journal_audit_events(workspace_id, record_id, occurred_at desc);

alter table public.hobbies_journal_audit_events enable row level security;
revoke all on public.hobbies_journal_audit_events from anon, authenticated;
grant select on public.hobbies_journal_audit_events to authenticated;
revoke all on sequence public.hobbies_journal_audit_events_id_seq from anon, authenticated;

create policy hobbies_journal_audit_select on public.hobbies_journal_audit_events
  for select to authenticated
  using (
    public.ws_access_level(workspace_id,'hobbies','journal') in ('view','edit')
    and (visible_to is null or (select auth.uid()) = any(visible_to))
  );

create or replace function public.hobbies_journal_audit_snapshot(p_data jsonb)
returns jsonb
language sql immutable
set search_path = pg_catalog
as $function$
  select jsonb_build_object(
    'title', left(coalesce(p_data->>'title',''),200),
    'entryType', p_data->'entryType',
    'localDate', p_data->'localDate',
    'mood', p_data->'mood',
    'tags', case when jsonb_typeof(p_data->'tags')='array' then p_data->'tags' else '[]'::jsonb end,
    'hobbyId', p_data->'hobbyId',
    'sessionId', p_data->'sessionId',
    'skillId', p_data->'skillId',
    'milestoneId', p_data->'milestoneId',
    'attachmentCount', case when jsonb_typeof(p_data->'attachments')='array'
      then jsonb_array_length(p_data->'attachments') else 0 end
  )
$function$;

-- A SECURITY DEFINER trigger is used only for trusted event insertion: clients
-- receive SELECT but no INSERT/UPDATE/DELETE privileges on the audit table.
-- Actor identity and visibility are derived from the triggering row and auth.uid().
create or replace function public.hobbies_journal_write_audit_event()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_action text;
  v_before jsonb;
  v_after jsonb;
  v_visibility uuid[];
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception 'HOBBIES_JOURNAL_AUDIT_AUTH_REQUIRED' using errcode='42501';
  end if;

  if tg_op = 'INSERT' then
    v_action := 'created';
    v_after := public.hobbies_journal_audit_snapshot(new.data);
    v_visibility := new.visible_to;
  else
    v_before := public.hobbies_journal_audit_snapshot(old.data);
    v_after := public.hobbies_journal_audit_snapshot(new.data);

    if coalesce(old.data->>'deleted_at','') = ''
       and coalesce(new.data->>'deleted_at','') <> '' then
      v_action := 'deleted';
    elsif coalesce(old.data->>'deleted_at','') <> ''
       and coalesce(new.data->>'deleted_at','') = '' then
      v_action := 'restored';
    elsif v_before is distinct from v_after then
      v_action := 'updated';
    else
      return new;
    end if;

    -- When a legacy shared row is made private, new audit events become private
    -- too. Existing audit events retain the visibility they had when written.
    v_visibility := case when old.visible_to is null then new.visible_to else old.visible_to end;
  end if;

  insert into public.hobbies_journal_audit_events(
    workspace_id,record_id,action,actor_id,visible_to,before_state,after_state
  ) values (
    new.workspace_id,new.id,v_action,v_actor,v_visibility,v_before,v_after
  );

  return new;
end
$function$;

revoke all on function public.hobbies_journal_write_audit_event() from public, anon, authenticated;
drop trigger if exists hobbies_journal_audit_after_write on public.workspace_records;
create trigger hobbies_journal_audit_after_write
after insert or update on public.workspace_records
for each row
when (new.system_id = 'hobbies' and new.collection = 'journalEntries')
execute function public.hobbies_journal_write_audit_event();

create or replace function public.hobbies_journal_audit_immutable()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $function$
begin
  raise exception 'HOBBIES_JOURNAL_AUDIT_IMMUTABLE' using errcode='42501';
end
$function$;

drop trigger if exists hobbies_journal_audit_no_mutation on public.hobbies_journal_audit_events;
create trigger hobbies_journal_audit_no_mutation
before update or delete on public.hobbies_journal_audit_events
for each row execute function public.hobbies_journal_audit_immutable();

commit;
