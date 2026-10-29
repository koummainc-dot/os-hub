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
