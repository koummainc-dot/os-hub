-- Enforce PRD requirement traceability for task and output records.
-- Requirement IDs live inside the owning PRD JSON document; no duplicate table is introduced.
create or replace function public.projects_guard_prd_requirement_links()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  prd_data jsonb;
  task_data jsonb;
  prd_id text;
  requirement_id text;
  task_id text;
  refs_changed boolean := true;
begin
  if new.system_id <> 'projects' or new.collection not in ('tasks', 'outputs') then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    refs_changed :=
      (new.data->>'project_id') is distinct from (old.data->>'project_id')
      or (new.data->>'prd_id') is distinct from (old.data->>'prd_id')
      or (new.data->>'prd_requirement_id') is distinct from (old.data->>'prd_requirement_id')
      or (new.data->>'task_id') is distinct from (old.data->>'task_id');
  end if;
  if not refs_changed then
    return new;
  end if;

  prd_id := nullif(new.data->>'prd_id', '');
  requirement_id := nullif(new.data->>'prd_requirement_id', '');
  task_id := nullif(new.data->>'task_id', '');

  if requirement_id is not null and prd_id is null then
    raise exception 'A PRD requirement must reference its parent PRD' using errcode = '22023';
  end if;

  if prd_id is not null then
    prd_data := null;
    select p.data into prd_data
      from public.workspace_records p
     where p.workspace_id = new.workspace_id
       and p.system_id = 'projects'
       and p.collection = 'prds'
       and p.id = prd_id
       and p.deleted = false
       and (p.visible_to is null or auth.uid() = any(p.visible_to))
       and public.ws_access_level(new.workspace_id, 'projects', 'prds') in ('view','edit')
     limit 1;

    if prd_data is null
       or prd_data->>'project_id' is distinct from new.data->>'project_id'
       or prd_data->>'deleted_at' is not null then
      raise exception 'The linked PRD must be active and belong to the same project' using errcode = '22023';
    end if;

    if requirement_id is not null then
      if not exists (
           select 1
             from jsonb_array_elements(
               case when jsonb_typeof(prd_data->'requirements') = 'array'
                    then prd_data->'requirements' else '[]'::jsonb end
             ) as req(value)
            where value->>'id' = requirement_id
         ) then
        raise exception 'The linked requirement does not belong to the selected PRD' using errcode = '22023';
      end if;
    end if;
  end if;

  if new.collection = 'outputs' and task_id is not null then
    task_data := null;
    select t.data into task_data
      from public.workspace_records t
     where t.workspace_id = new.workspace_id
       and t.system_id = 'projects'
       and t.collection = 'tasks'
       and t.id = task_id
       and t.deleted = false
       and (t.visible_to is null or auth.uid() = any(t.visible_to))
       and public.ws_access_level(new.workspace_id, 'projects', 'tasks') in ('view','edit')
     limit 1;

    if task_data is null
       or task_data->>'project_id' is distinct from new.data->>'project_id'
       or task_data->>'deleted_at' is not null
       or task_data->>'archived_at' is not null then
      raise exception 'The linked task must be active and belong to the same project' using errcode = '22023';
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists projects_guard_prd_requirement_links_trg on public.workspace_records;
create trigger projects_guard_prd_requirement_links_trg
before insert or update of data on public.workspace_records
for each row execute function public.projects_guard_prd_requirement_links();

revoke all on function public.projects_guard_prd_requirement_links() from public, anon, authenticated;
