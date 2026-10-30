-- Server-side validation for the bidirectional task ↔ issue reference fields.
-- This validates every referenced record and project boundary without requiring a
-- strict two-row ordering; atomic repair-task writes can safely create both links.
create or replace function public.projects_guard_task_issue_references()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  ref_id text;
  ref_data jsonb;
  refs jsonb;
  refs_changed boolean := false;
begin
  if new.system_id <> 'projects' or new.collection not in ('tasks', 'issues') then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and (new.data - 'deleted_at' - 'deleted_by' - 'v' - 'updated_at' - 'created_at' - 'updated_by_member')
         is not distinct from
         (old.data - 'deleted_at' - 'deleted_by' - 'v' - 'updated_at' - 'created_at' - 'updated_by_member') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    refs_changed := true;
  else
    refs_changed :=
      (new.data->>'project_id') is distinct from (old.data->>'project_id')
      or (case when new.collection = 'tasks' then new.data->'issue_ids' else new.data->'task_ids' end)
         is distinct from
         (case when old.collection = 'tasks' then old.data->'issue_ids' else old.data->'task_ids' end);
  end if;
  if not refs_changed then
    return new;
  end if;

  if new.collection = 'tasks' then
    refs := coalesce(new.data->'issue_ids', '[]'::jsonb);
    if jsonb_typeof(refs) is distinct from 'array' then
      raise exception 'Task issue_ids must be an array' using errcode = '22023';
    end if;
    for ref_id in select value #>> '{}' from jsonb_array_elements(refs)
    loop
      if nullif(ref_id, '') is null then
        raise exception 'Task issue references cannot contain empty ids' using errcode = '22023';
      end if;
      ref_data := null;
      select i.data into ref_data
        from public.workspace_records i
       where i.workspace_id = new.workspace_id
         and i.system_id = 'projects'
         and i.collection = 'issues'
         and i.id = ref_id
         and i.deleted = false
         and (i.visible_to is null or auth.uid() = any(i.visible_to))
         and public.ws_access_level(new.workspace_id, 'projects', 'issues') in ('view','edit')
       limit 1;
      if ref_data is null
         or ref_data->>'project_id' is distinct from new.data->>'project_id'
         or ref_data->>'deleted_at' is not null then
        raise exception 'A task may reference only active visible issues in the same project' using errcode = '22023';
      end if;
    end loop;
  else
    refs := coalesce(new.data->'task_ids', '[]'::jsonb);
    if jsonb_typeof(refs) is distinct from 'array' then
      raise exception 'Issue task_ids must be an array' using errcode = '22023';
    end if;
    for ref_id in select value #>> '{}' from jsonb_array_elements(refs)
    loop
      if nullif(ref_id, '') is null then
        raise exception 'Issue task references cannot contain empty ids' using errcode = '22023';
      end if;
      ref_data := null;
      select t.data into ref_data
        from public.workspace_records t
       where t.workspace_id = new.workspace_id
         and t.system_id = 'projects'
         and t.collection = 'tasks'
         and t.id = ref_id
         and t.deleted = false
         and (t.visible_to is null or auth.uid() = any(t.visible_to))
         and public.ws_access_level(new.workspace_id, 'projects', 'tasks') in ('view','edit')
       limit 1;
      if ref_data is null
         or ref_data->>'project_id' is distinct from new.data->>'project_id'
         or ref_data->>'deleted_at' is not null
         or ref_data->>'archived_at' is not null then
        raise exception 'An issue may reference only active visible tasks in the same project' using errcode = '22023';
      end if;
    end loop;
  end if;

  return new;
end;
$function$;

drop trigger if exists projects_guard_task_issue_references_trg on public.workspace_records;
create trigger projects_guard_task_issue_references_trg
before insert or update of data on public.workspace_records
for each row execute function public.projects_guard_task_issue_references();

revoke all on function public.projects_guard_task_issue_references() from public, anon, authenticated;
