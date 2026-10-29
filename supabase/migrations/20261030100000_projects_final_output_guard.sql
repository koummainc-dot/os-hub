-- Server-side guard for immutable final outputs and final-approval authority.
-- The trigger runs for ordinary workspace_records writes and Projects atomic RPC batches.
create or replace function public.projects_guard_final_outputs()
returns trigger
language plpgsql
security invoker
set search_path = public
as $function$
declare
  project_data jsonb;
  output_task_data jsonb;
  output_prd_data jsonb;
  can_approve boolean := false;
begin
  if new.system_id <> 'projects' or new.collection <> 'outputs' then
    return new;
  end if;

  -- A Final output is immutable. Only the existing trash markers may change so
  -- soft-delete/restore can still work without editing the approved artifact.
  if tg_op = 'UPDATE' and old.data->>'approval' = 'Final' then
    if new.data->>'approval' is distinct from 'Final'
       or (new.data - 'deleted_at' - 'deleted_by')
          is distinct from (old.data - 'deleted_at' - 'deleted_by') then
      raise exception 'Final outputs are immutable; create a new version instead'
        using errcode = '42501';
    end if;
    return new;
  end if;

  -- Validate output project/task/PRD references on the server, not only in the UI.
  if nullif(new.data->>'project_id', '') is null then
    raise exception 'An output must belong to a project' using errcode = '22023';
  end if;
  select p.data into project_data
    from public.workspace_records p
   where p.workspace_id = new.workspace_id
     and p.system_id = 'projects'
     and p.collection = 'projects'
     and p.id = new.data->>'project_id'
     and p.deleted = false
   limit 1;
  if project_data is null
     or project_data->>'deleted_at' is not null
     or project_data->>'is_system' = 'true' then
    raise exception 'Output must reference an active non-system project' using errcode = '22023';
  end if;

  if nullif(new.data->>'task_id', '') is not null then
    output_task_data := null;
    select t.data into output_task_data
      from public.workspace_records t
     where t.workspace_id = new.workspace_id
       and t.system_id = 'projects'
       and t.collection = 'tasks'
       and t.id = new.data->>'task_id'
       and t.deleted = false
     limit 1;
    if output_task_data is null
       or output_task_data->>'project_id' is distinct from new.data->>'project_id'
       or output_task_data->>'deleted_at' is not null
       or output_task_data->>'archived_at' is not null then
      raise exception 'Output task must be active and belong to the selected project' using errcode = '22023';
    end if;
  end if;

  if nullif(new.data->>'prd_id', '') is not null then
    output_prd_data := null;
    select d.data into output_prd_data
      from public.workspace_records d
     where d.workspace_id = new.workspace_id
       and d.system_id = 'projects'
       and d.collection = 'prds'
       and d.id = new.data->>'prd_id'
       and d.deleted = false
     limit 1;
    if output_prd_data is null
       or output_prd_data->>'project_id' is distinct from new.data->>'project_id'
       or output_prd_data->>'deleted_at' is not null then
      raise exception 'Output PRD must be active and belong to the selected project' using errcode = '22023';
    end if;
  end if;

  -- Only workspace owners or the project's Lead/Reviewer may create an output
  -- directly as Final or transition an existing output to Final.
  if new.data->>'approval' = 'Final' then
    can_approve := public.is_ws_owner(new.workspace_id);

    if not can_approve and nullif(new.data->>'project_id', '') is not null then
      select p.data into project_data
        from public.workspace_records p
       where p.workspace_id = new.workspace_id
         and p.system_id = 'projects'
         and p.collection = 'projects'
         and p.id = new.data->>'project_id'
       limit 1;

      if project_data is not null then
        can_approve := project_data->>'lead_id' = auth.uid()::text
          or exists (
            select 1
              from jsonb_array_elements(
                case when jsonb_typeof(project_data->'members') = 'array'
                     then project_data->'members' else '[]'::jsonb end
              ) as member
             where member->>'member_id' = auth.uid()::text
               and member->>'role' in ('Lead', 'Reviewer')
          );
      end if;
    end if;

    if not can_approve then
      raise exception 'Only the workspace owner, project Lead, or Reviewer may approve a final output'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists projects_guard_final_outputs_trg on public.workspace_records;
create trigger projects_guard_final_outputs_trg
before insert or update of data on public.workspace_records
for each row execute function public.projects_guard_final_outputs();

revoke all on function public.projects_guard_final_outputs() from public, anon;

-- Session ownership and task-reference enforcement. The browser validates these
-- rules for usability; this trigger makes them authoritative for direct API writes.
create or replace function public.projects_guard_work_sessions()
returns trigger
language plpgsql
security invoker
set search_path = public
as $function$
declare
  task_data jsonb;
  task_record_id text;
  task_changed boolean := false;
begin
  if new.system_id <> 'projects' or new.collection <> 'sessions' then
    return new;
  end if;

  if auth.uid() is null
     or new.data->>'member_id' is distinct from auth.uid()::text then
    raise exception 'A work session must belong to the authenticated member'
      using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' then
    if old.data->>'member_id' is distinct from auth.uid()::text then
      raise exception 'A member cannot take over another member work session'
        using errcode = '42501';
    end if;
  end if;

  -- Validate task existence/lifecycle when creating a session or changing its task.
  if tg_op = 'INSERT' then
    task_changed := true;
  elsif tg_op = 'UPDATE' then
    task_changed := (new.data->>'task_id') is distinct from (old.data->>'task_id');
  end if;

  if task_changed then
    task_record_id := nullif(new.data->>'task_id', '');
    if task_record_id is null then
      raise exception 'A work session requires a task' using errcode = '22023';
    end if;

    select t.data into task_data
      from public.workspace_records t
     where t.workspace_id = new.workspace_id
       and t.system_id = 'projects'
       and t.collection = 'tasks'
       and t.id = task_record_id
       and t.deleted = false
     limit 1;

    if task_data is null
       or task_data->>'deleted_at' is not null
       or task_data->>'archived_at' is not null
       or nullif(task_data->>'parent_task_id', '') is not null then
      raise exception 'A work session must reference an active leaf task'
        using errcode = '22023';
    end if;

    if exists (
      select 1
        from public.workspace_records child
       where child.workspace_id = new.workspace_id
         and child.system_id = 'projects'
         and child.collection = 'tasks'
         and child.deleted = false
         and child.data->>'parent_task_id' = task_record_id
         and child.data->>'deleted_at' is null
         and child.data->>'archived_at' is null
    ) then
      raise exception 'A work session cannot reference a parent task'
        using errcode = '22023';
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists projects_guard_work_sessions_trg on public.workspace_records;
create trigger projects_guard_work_sessions_trg
before insert or update of data on public.workspace_records
for each row execute function public.projects_guard_work_sessions();

revoke all on function public.projects_guard_work_sessions() from public, anon;

-- Keep task hierarchy and PRD references inside the same workspace/project.
-- Validate only when creating a task or changing a relationship; ordinary edits,
-- trash/restore, and lifecycle updates must remain possible for historical records.
create or replace function public.projects_guard_task_references()
returns trigger
language plpgsql
security invoker
set search_path = public
as $function$
declare
  refs_changed boolean := false;
  project_data jsonb;
  parent_data jsonb;
  prd_data jsonb;
  parent_id text;
  has_cycle boolean := false;
begin
  if new.system_id <> 'projects' or new.collection <> 'tasks' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    refs_changed := true;
  elsif tg_op = 'UPDATE' then
    refs_changed :=
      (new.data->>'project_id') is distinct from (old.data->>'project_id')
      or (new.data->>'parent_task_id') is distinct from (old.data->>'parent_task_id')
      or (new.data->>'prd_id') is distinct from (old.data->>'prd_id');
  end if;
  if not refs_changed then
    return new;
  end if;

  if nullif(new.data->>'project_id', '') is null then
    raise exception 'A task must belong to a project' using errcode = '22023';
  end if;
  select p.data into project_data
    from public.workspace_records p
   where p.workspace_id = new.workspace_id
     and p.system_id = 'projects'
     and p.collection = 'projects'
     and p.id = new.data->>'project_id'
     and p.deleted = false
   limit 1;
  if project_data is null or project_data->>'deleted_at' is not null then
    raise exception 'Task project does not exist or is in the trash' using errcode = '22023';
  end if;

  parent_id := nullif(new.data->>'parent_task_id', '');
  if parent_id is not null then
    if parent_id = new.id then
      raise exception 'A task cannot be its own parent' using errcode = '22023';
    end if;
    parent_data := null;
    select p.data into parent_data
      from public.workspace_records p
     where p.workspace_id = new.workspace_id
       and p.system_id = 'projects'
       and p.collection = 'tasks'
       and p.id = parent_id
       and p.deleted = false
     limit 1;
    if parent_data is null
       or parent_data->>'project_id' is distinct from new.data->>'project_id'
       or parent_data->>'deleted_at' is not null
       or parent_data->>'archived_at' is not null then
      raise exception 'Task parent must be active and belong to the same project' using errcode = '22023';
    end if;

    with recursive ancestors(id, parent_task_id, path, cycle) as (
      select p.id, p.data->>'parent_task_id', array[p.id], false
        from public.workspace_records p
       where p.workspace_id = new.workspace_id
         and p.system_id = 'projects'
         and p.collection = 'tasks'
         and p.id = parent_id
         and p.deleted = false
      union all
      select p.id, p.data->>'parent_task_id', a.path || p.id, p.id = any(a.path)
        from ancestors a
        join public.workspace_records p
          on p.workspace_id = new.workspace_id
         and p.system_id = 'projects'
         and p.collection = 'tasks'
         and p.id = a.parent_task_id
         and p.deleted = false
       where a.parent_task_id is not null
         and not a.cycle
    )
    select exists (select 1 from ancestors where id = new.id or cycle) into has_cycle;
    if has_cycle then
      raise exception 'Task hierarchy cannot contain a cycle' using errcode = '22023';
    end if;
  end if;

  if nullif(new.data->>'prd_id', '') is not null then
    prd_data := null;
    select d.data into prd_data
      from public.workspace_records d
     where d.workspace_id = new.workspace_id
       and d.system_id = 'projects'
       and d.collection = 'prds'
       and d.id = new.data->>'prd_id'
       and d.deleted = false
     limit 1;
    if prd_data is null
       or prd_data->>'project_id' is distinct from new.data->>'project_id'
       or prd_data->>'deleted_at' is not null then
      raise exception 'Task PRD must be active and belong to the same project' using errcode = '22023';
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists projects_guard_task_references_trg on public.workspace_records;
create trigger projects_guard_task_references_trg
before insert or update of data on public.workspace_records
for each row execute function public.projects_guard_task_references();

revoke all on function public.projects_guard_task_references() from public, anon;
