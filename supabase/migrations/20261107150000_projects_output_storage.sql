-- Projects Outputs private Storage bucket + RLS.
-- No public access, no service-role browser path, and no object UPDATE/upsert.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'projects-outputs',
  'projects-outputs',
  false,
  10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'text/plain',
    'text/csv',
    'application/json',
    'application/zip',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.projects_output_workspace_id(object_name text)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $
declare matched text[];
begin
  matched := regexp_match(coalesce(object_name, ''), '^workspace/([0-9a-fA-F-]{36})/project/[^/]+/output/[^/]+/[^/]+
drop policy if exists projects_outputs_insert on storage.objects;
drop policy if exists projects_outputs_delete on storage.objects;
drop policy if exists projects_outputs_update on storage.objects;

create policy projects_outputs_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'projects-outputs'
  and public.ws_access_level(
    public.projects_output_workspace_id(name),
    'projects',
    'outputs'
  ) in ('view', 'edit')
  and exists (
    select 1
    from public.workspace_records o
    where o.workspace_id = (split_part(name, '/', 2))::uuid
      and o.system_id = 'projects'
      and o.collection = 'outputs'
      and o.id = split_part(name, '/', 6)
      and o.deleted = false
      and o.data->>'project_id' = split_part(name, '/', 4)
      and o.data->>'deleted_at' is null
      and (o.visible_to is null or auth.uid() = any(o.visible_to))
  )
);

create policy projects_outputs_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'projects-outputs'
  and public.ws_access_level(
    (split_part(name, '/', 2))::uuid,
    'projects',
    'outputs'
  ) = 'edit'
  and exists (
    select 1
    from public.workspace_records o
    where o.workspace_id = (split_part(name, '/', 2))::uuid
      and o.system_id = 'projects'
      and o.collection = 'outputs'
      and o.id = split_part(name, '/', 6)
      and o.deleted = false
      and o.data->>'project_id' = split_part(name, '/', 4)
      and o.data->>'deleted_at' is null
      and (o.visible_to is null or auth.uid() = any(o.visible_to))
  )
);

create policy projects_outputs_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'projects-outputs'
  and public.ws_access_level(
    (split_part(name, '/', 2))::uuid,
    'projects',
    'outputs'
  ) = 'edit'
  and exists (
    select 1
    from public.workspace_records o
    where o.workspace_id = (split_part(name, '/', 2))::uuid
      and o.system_id = 'projects'
      and o.collection = 'outputs'
      and o.id = split_part(name, '/', 6)
      and o.deleted = false
      and o.data->>'project_id' = split_part(name, '/', 4)
      and o.data->>'deleted_at' is null
      and (o.visible_to is null or auth.uid() = any(o.visible_to))
  )
);

-- Deliberately no UPDATE policy: clients must upload a new opaque object key
-- and update Output metadata through the normal record path.
);
  if matched is null then return null; end if;
  return matched[1]::uuid;
exception when others then
  return null;
end;
$;

revoke all on function public.projects_output_workspace_id(text) from public, anon;
grant execute on function public.projects_output_workspace_id(text) to authenticated;

drop policy if exists projects_outputs_select on storage.objects;
drop policy if exists projects_outputs_insert on storage.objects;
drop policy if exists projects_outputs_delete on storage.objects;
drop policy if exists projects_outputs_update on storage.objects;

create policy projects_outputs_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'projects-outputs'
  and public.ws_access_level(
    (split_part(name, '/', 2))::uuid,
    'projects',
    'outputs'
  ) in ('view', 'edit')
  and exists (
    select 1
    from public.workspace_records o
    where o.workspace_id = (split_part(name, '/', 2))::uuid
      and o.system_id = 'projects'
      and o.collection = 'outputs'
      and o.id = split_part(name, '/', 6)
      and o.deleted = false
      and o.data->>'project_id' = split_part(name, '/', 4)
      and o.data->>'deleted_at' is null
      and (o.visible_to is null or auth.uid() = any(o.visible_to))
  )
);

create policy projects_outputs_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'projects-outputs'
  and public.ws_access_level(
    (split_part(name, '/', 2))::uuid,
    'projects',
    'outputs'
  ) = 'edit'
  and exists (
    select 1
    from public.workspace_records o
    where o.workspace_id = (split_part(name, '/', 2))::uuid
      and o.system_id = 'projects'
      and o.collection = 'outputs'
      and o.id = split_part(name, '/', 6)
      and o.deleted = false
      and o.data->>'project_id' = split_part(name, '/', 4)
      and o.data->>'deleted_at' is null
      and (o.visible_to is null or auth.uid() = any(o.visible_to))
  )
);

create policy projects_outputs_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'projects-outputs'
  and public.ws_access_level(
    (split_part(name, '/', 2))::uuid,
    'projects',
    'outputs'
  ) = 'edit'
  and exists (
    select 1
    from public.workspace_records o
    where o.workspace_id = (split_part(name, '/', 2))::uuid
      and o.system_id = 'projects'
      and o.collection = 'outputs'
      and o.id = split_part(name, '/', 6)
      and o.deleted = false
      and o.data->>'project_id' = split_part(name, '/', 4)
      and o.data->>'deleted_at' is null
      and (o.visible_to is null or auth.uid() = any(o.visible_to))
  )
);

-- Deliberately no UPDATE policy: clients must upload a new opaque object key
-- and update Output metadata through the normal record path.
