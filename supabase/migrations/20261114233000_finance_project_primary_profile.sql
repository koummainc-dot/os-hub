begin;

create table if not exists public.finance_project_primary_profiles (
  workspace_id uuid not null,
  project_ref text not null,
  finance_project_id text not null,
  selected_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, project_ref)
);

alter table public.finance_project_primary_profiles enable row level security;
drop policy if exists finance_project_primary_profiles_select on public.finance_project_primary_profiles;
create policy finance_project_primary_profiles_select
on public.finance_project_primary_profiles
for select
to authenticated
using (
  public.ws_access_level(workspace_id, 'finance', 'projects') in ('view','edit')
  and public.ws_access_level(workspace_id, 'projects', 'projects') in ('view','edit')
);

grant select on public.finance_project_primary_profiles to authenticated;
revoke insert, update, delete on public.finance_project_primary_profiles from anon, authenticated, public;

create or replace function public.fin_project_primary_list(p_ws uuid)
returns table(project_ref text, finance_project_id text, selected_by uuid, updated_at timestamptz)
language sql
security invoker
set search_path = public
as $function$
  select primary_row.project_ref, primary_row.finance_project_id, primary_row.selected_by, primary_row.updated_at
    from public.finance_project_primary_profiles primary_row
   where primary_row.workspace_id = p_ws
     and public.ws_access_level(p_ws, 'finance', 'projects') in ('view','edit')
     and public.ws_access_level(p_ws, 'projects', 'projects') in ('view','edit');
$function$;

create or replace function public.fin_project_primary_set(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_ws uuid := nullif(p->>'workspace_id','')::uuid;
  v_project_ref text := nullif(trim(p->>'project_ref'),'');
  v_finance_project_id text := nullif(trim(p->>'finance_project_id'),'');
  v_project_data jsonb;
  v_project_visibility uuid[];
  v_profiles jsonb;
  v_match boolean := false;
  v_result jsonb;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED' using errcode = '42501'; end if;
  if v_ws is null or v_project_ref is null or v_finance_project_id is null then
    raise exception 'WORKSPACE_PROJECT_AND_FINANCE_PROFILE_REQUIRED' using errcode = '22023';
  end if;
  if public.ws_access_level(v_ws, 'finance', 'projects') is distinct from 'edit'
     or public.ws_access_level(v_ws, 'projects', 'projects') not in ('view','edit') then
    raise exception 'FINANCE_PROJECT_PRIMARY_FORBIDDEN' using errcode = '42501';
  end if;

  select wr.data, wr.visible_to
    into v_project_data, v_project_visibility
    from public.workspace_records wr
   where wr.workspace_id = v_ws
     and wr.system_id = 'projects'
     and wr.collection = 'projects'
     and wr.id = v_project_ref
     and wr.deleted = false
     and coalesce(wr.data->>'deleted_at','') = ''
     and coalesce(wr.data->>'archived_at','') = '';
  if not found then raise exception 'PROJECT_OS_REFERENCE_NOT_FOUND' using errcode = 'P0001'; end if;
  if v_project_visibility is not null and not (auth.uid() = any(v_project_visibility)) then
    raise exception 'PROJECT_OS_REFERENCE_FORBIDDEN' using errcode = '42501';
  end if;

  -- fin_projects_get returns one JSONB array, not SETOF rows.
  -- Keep the canonical Finance read model as the only validation source.
  v_profiles := coalesce(public.fin_projects_get(v_ws), '[]'::jsonb);
  if jsonb_typeof(v_profiles) is distinct from 'array' then
    raise exception 'FINANCE_PROJECT_READ_MODEL_INVALID' using errcode = '22023';
  end if;
  select exists(
    select 1 from jsonb_array_elements(v_profiles) as item(value)
     where item.value->>'id' = v_finance_project_id
       and item.value->>'project_ref' = v_project_ref
  ) into v_match;
  if not v_match then raise exception 'FINANCE_PROFILE_PROJECT_REFERENCE_MISMATCH' using errcode = '22023'; end if;

  insert into public.finance_project_primary_profiles(workspace_id,project_ref,finance_project_id,selected_by,created_at,updated_at)
  values(v_ws,v_project_ref,v_finance_project_id,auth.uid(),now(),now())
  on conflict(workspace_id,project_ref) do update
    set finance_project_id = excluded.finance_project_id,
        selected_by = excluded.selected_by,
        updated_at = now()
  returning jsonb_build_object('project_ref',project_ref,'finance_project_id',finance_project_id,'selected_by',selected_by,'updated_at',updated_at)
    into v_result;
  return v_result;
end;
$function$;

revoke all on function public.fin_project_primary_list(uuid) from public, anon;
grant execute on function public.fin_project_primary_list(uuid) to authenticated;
revoke all on function public.fin_project_primary_set(jsonb) from public, anon;
grant execute on function public.fin_project_primary_set(jsonb) to authenticated;

commit;
