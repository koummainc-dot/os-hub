-- Hobbies Journal attachment lifecycle: reference-safe cleanup queue and 30-day trash retention.
-- Storage objects are always removed through the Storage API, never by deleting storage.objects rows.

create table if not exists public.hobbies_journal_attachment_cleanup (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  record_id text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  object_path text not null,
  reason text not null check (reason in ('attachment_removed','journal_permanent_delete','upload_rollback')),
  status text not null default 'pending' check (status in ('pending','completed')),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (workspace_id, object_path)
);

create index if not exists hobbies_journal_attachment_cleanup_pending_idx
  on public.hobbies_journal_attachment_cleanup(workspace_id, owner_id, created_at)
  where status = 'pending';

alter table public.hobbies_journal_attachment_cleanup enable row level security;
revoke all on public.hobbies_journal_attachment_cleanup from anon, authenticated;
grant select on public.hobbies_journal_attachment_cleanup to authenticated;

drop policy if exists hobbies_journal_attachment_cleanup_select_own
  on public.hobbies_journal_attachment_cleanup;
create policy hobbies_journal_attachment_cleanup_select_own
  on public.hobbies_journal_attachment_cleanup
  for select to authenticated
  using (owner_id = (select auth.uid()));

create or replace function public.hobbies_journal_enqueue_attachment_cleanup(
  p_workspace_id uuid,
  p_record_id text,
  p_object_path text,
  p_reason text default 'upload_rollback'
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_owner uuid;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'HOBBIES_JOURNAL_CLEANUP_AUTH_REQUIRED' using errcode='42501';
  end if;
  if p_reason not in ('attachment_removed','journal_permanent_delete','upload_rollback') then
    raise exception 'HOBBIES_JOURNAL_CLEANUP_REASON_INVALID' using errcode='22023';
  end if;
  if p_object_path is null
     or split_part(p_object_path,'/',1) <> auth.uid()::text
     or split_part(p_object_path,'/',2) <> p_workspace_id::text
     or split_part(p_object_path,'/',3) <> p_record_id
     or p_object_path like '%..%'
     or p_object_path like '/%' then
    raise exception 'HOBBIES_JOURNAL_CLEANUP_PATH_INVALID' using errcode='22023';
  end if;
  if public.ws_access_level(p_workspace_id,'hobbies','journalEntries') <> 'edit' then
    raise exception 'HOBBIES_JOURNAL_CLEANUP_FORBIDDEN' using errcode='42501';
  end if;

  -- Never queue a file while any Journal row (including trashed rows) still references it.
  if exists (
    select 1
    from public.workspace_records wr
    cross join lateral jsonb_array_elements(coalesce(wr.data->'attachments','[]'::jsonb)) a
    where wr.workspace_id = p_workspace_id
      and wr.system_id = 'hobbies'
      and wr.collection = 'journalEntries'
      and a->>'kind' = 'storage'
      and a->>'path' = p_object_path
  ) then
    return null;
  end if;

  v_owner := split_part(p_object_path,'/',1)::uuid;
  insert into public.hobbies_journal_attachment_cleanup(
    workspace_id, record_id, owner_id, object_path, reason
  ) values (
    p_workspace_id, p_record_id, v_owner, p_object_path, p_reason
  )
  on conflict (workspace_id, object_path) do update
    set attempts = public.hobbies_journal_attachment_cleanup.attempts
  returning id into v_id;
  return v_id;
end;
$function$;

revoke all on function public.hobbies_journal_enqueue_attachment_cleanup(uuid,text,text,text) from public, anon;
grant execute on function public.hobbies_journal_enqueue_attachment_cleanup(uuid,text,text,text) to authenticated;

create or replace function public.hobbies_journal_attachment_lifecycle_guard()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
declare
  v_path text;
begin
  for v_path in
    select a->>'path'
    from jsonb_array_elements(coalesce(new.data->'attachments','[]'::jsonb)) a
    where a->>'kind' = 'storage'
  loop
    if exists (
      select 1 from public.hobbies_journal_attachment_cleanup q
      where q.workspace_id = new.workspace_id
        and q.object_path = v_path
    ) then
      raise exception 'HOBBIES_JOURNAL_ATTACHMENT_ALREADY_QUEUED' using errcode='23514';
    end if;
  end loop;
  return new;
end;
$function$;

revoke all on function public.hobbies_journal_attachment_lifecycle_guard() from public, anon, authenticated;
drop trigger if exists hobbies_journal_attachment_lifecycle_guard
  on public.workspace_records;
create trigger hobbies_journal_attachment_lifecycle_guard
before insert or update of data on public.workspace_records
for each row
when (new.system_id = 'hobbies' and new.collection = 'journalEntries')
execute function public.hobbies_journal_attachment_lifecycle_guard();

create or replace function public.hobbies_journal_capture_removed_attachments()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_attachment jsonb;
  v_path text;
  v_reason text;
begin
  if auth.uid() is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  v_reason := case when tg_op = 'DELETE'
    then 'journal_permanent_delete'
    else 'attachment_removed'
  end;

  for v_attachment in
    select a
    from jsonb_array_elements(coalesce(old.data->'attachments','[]'::jsonb)) a
    where a->>'kind' = 'storage'
  loop
    v_path := v_attachment->>'path';
    if v_path is null or split_part(v_path,'/',1) <> auth.uid()::text then
      continue;
    end if;

    if tg_op = 'UPDATE' and exists (
      select 1
      from jsonb_array_elements(coalesce(new.data->'attachments','[]'::jsonb)) a
      where a->>'kind' = 'storage' and a->>'path' = v_path
    ) then
      continue;
    end if;

    if exists (
      select 1
      from public.workspace_records wr
      cross join lateral jsonb_array_elements(coalesce(wr.data->'attachments','[]'::jsonb)) a
      where wr.workspace_id = old.workspace_id
        and wr.system_id = 'hobbies'
        and wr.collection = 'journalEntries'
        and (tg_op = 'DELETE' or wr.id <> old.id)
        and a->>'kind' = 'storage'
        and a->>'path' = v_path
    ) then
      continue;
    end if;

    perform public.hobbies_journal_enqueue_attachment_cleanup(
      old.workspace_id, old.id, v_path, v_reason
    );
  end loop;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$function$;

revoke all on function public.hobbies_journal_capture_removed_attachments() from public, anon, authenticated;
drop trigger if exists hobbies_journal_capture_removed_attachments
  on public.workspace_records;
create trigger hobbies_journal_capture_removed_attachments
after update of data or delete on public.workspace_records
for each row
when (old.system_id = 'hobbies' and old.collection = 'journalEntries')
execute function public.hobbies_journal_capture_removed_attachments();

create or replace function public.hobbies_journal_cleanup_mark(
  p_cleanup_id uuid,
  p_success boolean,
  p_error text default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  if auth.uid() is null then
    raise exception 'HOBBIES_JOURNAL_CLEANUP_AUTH_REQUIRED' using errcode='42501';
  end if;
  update public.hobbies_journal_attachment_cleanup
  set status = case when p_success then 'completed' else 'pending' end,
      attempts = attempts + case when p_success then 0 else 1 end,
      last_error = case when p_success then null else left(coalesce(p_error,'Storage removal failed'),500) end,
      processed_at = case when p_success then now() else null end
  where id = p_cleanup_id
    and owner_id = auth.uid();
  return found;
end;
$function$;

revoke all on function public.hobbies_journal_cleanup_mark(uuid,boolean,text) from public, anon;
grant execute on function public.hobbies_journal_cleanup_mark(uuid,boolean,text) to authenticated;

create or replace function public.hobbies_journal_purge_entry(
  p_workspace_id uuid,
  p_record_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_record public.workspace_records%rowtype;
  v_deleted_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'HOBBIES_JOURNAL_PURGE_AUTH_REQUIRED' using errcode='42501';
  end if;
  if public.ws_access_level(p_workspace_id,'hobbies','journalEntries') <> 'edit' then
    raise exception 'HOBBIES_JOURNAL_PURGE_FORBIDDEN' using errcode='42501';
  end if;

  select * into v_record
  from public.workspace_records
  where workspace_id = p_workspace_id
    and system_id = 'hobbies'
    and collection = 'journalEntries'
    and id = p_record_id
  for update;

  if not found then
    raise exception 'HOBBIES_JOURNAL_RECORD_NOT_FOUND' using errcode='P0002';
  end if;
  if v_record.visible_to is not null and not (auth.uid() = any(v_record.visible_to)) then
    raise exception 'HOBBIES_JOURNAL_PURGE_FORBIDDEN' using errcode='42501';
  end if;
  if coalesce(v_record.data->>'deleted_at','') = '' then
    raise exception 'HOBBIES_JOURNAL_RECORD_NOT_TRASHED' using errcode='22023';
  end if;

  begin
    v_deleted_at := (v_record.data->>'deleted_at')::timestamptz;
  exception when others then
    raise exception 'HOBBIES_JOURNAL_DELETED_AT_INVALID' using errcode='22023';
  end;

  if v_deleted_at > now() - interval '30 days' then
    raise exception 'HOBBIES_JOURNAL_RETENTION_NOT_ELAPSED' using errcode='22023';
  end if;

  delete from public.workspace_records
  where workspace_id = p_workspace_id
    and system_id = 'hobbies'
    and collection = 'journalEntries'
    and id = p_record_id;

  return jsonb_build_object('deleted',true,'cleanupQueued',true,'retentionDays',30);
end;
$function$;

revoke all on function public.hobbies_journal_purge_entry(uuid,text) from public, anon;
grant execute on function public.hobbies_journal_purge_entry(uuid,text) to authenticated;
