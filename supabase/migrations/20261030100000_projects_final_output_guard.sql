-- Server-side guard for immutable final outputs and final-approval authority.
-- The trigger runs for ordinary workspace_records writes and Projects atomic RPC batches.
create or replace function public.projects_guard_final_outputs()
returns trigger
language plpgsql
security definer
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
       or (new.data - 'deleted_at' - 'deleted_by' - 'v' - 'updated_at' - 'created_at' - 'updated_by_member')
          is distinct from (old.data - 'deleted_at' - 'deleted_by' - 'v' - 'updated_at' - 'created_at' - 'updated_by_member') then
      raise exception 'Final outputs are immutable; create a new version instead'
        using errcode = '42501';
    end if;
    return new;
  end if;

  -- Trash/restore and metadata-only updates do not change the artifact or its links.
  -- Permit them even when a linked task is being trashed in the same atomic project batch.
  if tg_op = 'UPDATE'
     and (new.data - 'deleted_at' - 'deleted_by' - 'v' - 'updated_at' - 'created_at' - 'updated_by_member')
         is not distinct from (old.data - 'deleted_at' - 'deleted_by' - 'v' - 'updated_at' - 'created_at' - 'updated_by_member') then
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
     and (p.visible_to is null or auth.uid() = any(p.visible_to))
     and public.ws_access_level(new.workspace_id, 'projects', 'projects') in ('view','edit')
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
       and (t.visible_to is null or auth.uid() = any(t.visible_to))
       and public.ws_access_level(new.workspace_id, 'projects', 'tasks') in ('view','edit')
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
       and (d.visible_to is null or auth.uid() = any(d.visible_to))
       and public.ws_access_level(new.workspace_id, 'projects', 'prds') in ('view','edit')
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
         and p.deleted = false
         and (p.visible_to is null or auth.uid() = any(p.visible_to))
         and public.ws_access_level(new.workspace_id, 'projects', 'projects') in ('view','edit')
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

    -- Do not trust caller-supplied approver metadata.
    new.data := jsonb_set(
      jsonb_set(new.data, '{approved_by}', to_jsonb(auth.uid()::text), true),
      '{approved_at}', to_jsonb(clock_timestamp()::text), true
    );
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
security definer
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
       and (t.visible_to is null or auth.uid() = any(t.visible_to))
       and public.ws_access_level(new.workspace_id, 'projects', 'tasks') in ('view','edit')
     limit 1;

    if task_data is null
       or task_data->>'deleted_at' is not null
       or task_data->>'archived_at' is not null then
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
security definer
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
     and (p.visible_to is null or auth.uid() = any(p.visible_to))
     and public.ws_access_level(new.workspace_id, 'projects', 'projects') in ('view','edit')
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
       and (p.visible_to is null or auth.uid() = any(p.visible_to))
       and public.ws_access_level(new.workspace_id, 'projects', 'tasks') in ('view','edit')
     limit 1;
    if parent_data is null
       or parent_data->>'project_id' is distinct from new.data->>'project_id'
       or parent_data->>'deleted_at' is not null
       or parent_data->>'archived_at' is not null then
      raise exception 'Task parent must be active and belong to the same project' using errcode = '22023';
    end if;

    with recursive ancestors(id, parent_task_id, path, has_repeat) as (
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
         and not a.has_repeat
    )
    select exists (select 1 from ancestors where id = new.id or has_repeat) into has_cycle;
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
       and (d.visible_to is null or auth.uid() = any(d.visible_to))
       and public.ws_access_level(new.workspace_id, 'projects', 'prds') in ('view','edit')
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

-- These trigger functions are intentionally not callable as application RPCs.
revoke execute on function public.projects_guard_final_outputs() from authenticated;
revoke execute on function public.projects_guard_work_sessions() from authenticated;
revoke execute on function public.projects_guard_task_references() from authenticated;


-- PRD review lifecycle enforcement. UI locking is helpful, but the record API and
-- atomic RPC must not allow edits to submitted/approved specifications to bypass it.
create or replace function public.projects_guard_prd_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  project_data jsonb;
  prior_prd_data jsonb;
  can_review boolean := false;
  can_approve boolean := false;
begin
  if new.system_id <> 'projects' or new.collection <> 'prds' then
    return new;
  end if;

  if auth.uid() is null then
    raise exception 'Authentication required to write PRDs' using errcode = '42501';
  end if;

  if nullif(new.data->>'project_id', '') is null then
    raise exception 'A PRD must belong to a project' using errcode = '22023';
  end if;

  -- Generic store writes update version/timestamps even when the only logical
  -- change is record visibility metadata. Allow those no-op data updates in every
  -- lifecycle state; all actual PRD content/status changes remain guarded below.
  if tg_op = 'UPDATE'
     and (new.data - 'deleted_at' - 'deleted_by' - 'v' - 'updated_at' - 'created_at' - 'updated_by_member')
         is not distinct from (old.data - 'deleted_at' - 'deleted_by' - 'v' - 'updated_at' - 'created_at' - 'updated_by_member') then
    return new;
  end if;

  select p.data into project_data
    from public.workspace_records p
   where p.workspace_id = new.workspace_id
     and p.system_id = 'projects'
     and p.collection = 'projects'
     and p.id = new.data->>'project_id'
     and p.deleted = false
     and (p.visible_to is null or auth.uid() = any(p.visible_to))
     and public.ws_access_level(new.workspace_id, 'projects', 'projects') in ('view','edit')
   limit 1;

  if project_data is null
     or project_data->>'deleted_at' is not null
     or project_data->>'is_system' = 'true' then
    raise exception 'PRD must reference an active visible non-system project' using errcode = '22023';
  end if;

  can_approve := public.is_ws_owner(new.workspace_id)
    or project_data->>'lead_id' = auth.uid()::text
    or exists (
      select 1
        from jsonb_array_elements(
          case when jsonb_typeof(project_data->'members') = 'array'
               then project_data->'members' else '[]'::jsonb end
        ) as member
       where member->>'member_id' = auth.uid()::text
         and member->>'role' in ('Lead', 'Reviewer')
    );
  can_review := can_approve
    or exists (
      select 1
        from jsonb_array_elements(
          case when jsonb_typeof(new.data->'reviewer_ids') = 'array'
               then new.data->'reviewer_ids' else '[]'::jsonb end
        ) as reviewer(value)
       where reviewer.value #>> '{}' = auth.uid()::text
    );

  if tg_op = 'INSERT' then
    if new.data->>'status' in ('Ready for Review', 'Approved', 'Superseded') then
      raise exception 'A new PRD version must start as a draft' using errcode = '42501';
    end if;
    if new.data->>'supersedes_id' is not null then
      prior_prd_data := null;
      select prior.data into prior_prd_data
        from public.workspace_records prior
       where prior.workspace_id = new.workspace_id
         and prior.system_id = 'projects'
         and prior.collection = 'prds'
         and prior.id = new.data->>'supersedes_id'
         and prior.data->>'status' = 'Approved'
         and prior.data->>'project_id' = new.data->>'project_id'
         and prior.deleted = false
       limit 1;
      if prior_prd_data is null
         or not can_approve
         or coalesce((new.data->>'version')::integer, 0) <>
            coalesce((prior_prd_data->>'version')::integer, 1) + 1 then
        raise exception 'A new PRD version must be created by an authorized lead/reviewer and supersede the immediately preceding approved version in the same project' using errcode = '22023';
      end if;
    end if;
    return new;
  end if;

  -- Approved/Superseded records are immutable; the only permitted edit is the
  -- status-only transition Approved -> Superseded when a new version is created.
  if old.data->>'status' in ('Approved', 'Superseded') then
    if old.data->>'status' = 'Approved'
       and new.data->>'status' = 'Superseded'
       and can_approve
       and (new.data - 'status' - 'updated_by_member' - 'v' - 'updated_at' - 'created_at')
           is not distinct from (old.data - 'status' - 'updated_by_member' - 'v' - 'updated_at' - 'created_at') then
      return new;
    end if;
    raise exception 'Approved or superseded PRDs are immutable; only the project lead, reviewer, or workspace owner may supersede an approved version' using errcode = '42501';
  end if;

  -- A submitted PRD cannot be edited while under review. Reviewers may change
  -- only their own current-version approval; the lead may return it to draft or approve it.
  if old.data->>'status' = 'Ready for Review' then
    if new.data->>'status' = 'In Progress' then
      if not can_approve
         or (new.data - 'status' - 'submitted_for_review_at' - 'updated_by_member' - 'v' - 'updated_at' - 'created_at')
            is distinct from (old.data - 'status' - 'submitted_for_review_at' - 'updated_by_member' - 'v' - 'updated_at' - 'created_at') then
        raise exception 'Only the project lead or workspace owner may return an unchanged PRD to draft' using errcode = '42501';
      end if;
      return new;
    elsif new.data->>'status' = 'Approved' then
      if not can_approve then
        raise exception 'Only the project lead, reviewer, or workspace owner may approve a PRD' using errcode = '42501';
      end if;
      if (new.data - 'status' - 'approved_at' - 'updated_by_member' - 'v' - 'updated_at' - 'created_at')
         is distinct from (old.data - 'status' - 'approved_at' - 'updated_by_member' - 'v' - 'updated_at' - 'created_at') then
        raise exception 'A PRD cannot be edited while it is being approved' using errcode = '42501';
      end if;
      if coalesce(trim(new.data->>'tldr'), '') = ''
         or not exists (
           select 1 from jsonb_array_elements(
             case when jsonb_typeof(coalesce(new.data->'sections','[]'::jsonb)) = 'array'
                  then coalesce(new.data->'sections','[]'::jsonb) else '[]'::jsonb end
           ) s(value)
           where s.value->>'key' = 'problem_overview' and coalesce(trim(s.value->>'content'), '') <> ''
         )
         or not exists (
           select 1 from jsonb_array_elements(
             case when jsonb_typeof(coalesce(new.data->'sections','[]'::jsonb)) = 'array'
                  then coalesce(new.data->'sections','[]'::jsonb) else '[]'::jsonb end
           ) s(value)
           where s.value->>'key' = 'proposed_solution' and coalesce(trim(s.value->>'content'), '') <> ''
         )
         or not exists (
           select 1 from jsonb_array_elements(
             case when jsonb_typeof(coalesce(new.data->'sections','[]'::jsonb)) = 'array'
                  then coalesce(new.data->'sections','[]'::jsonb) else '[]'::jsonb end
           ) s(value)
           where s.value->>'key' = 'success_metrics' and coalesce(trim(s.value->>'content'), '') <> ''
         )
         or exists (
           select 1 from jsonb_array_elements(
             case when jsonb_typeof(coalesce(new.data->'reviewer_ids','[]'::jsonb)) = 'array'
                  then coalesce(new.data->'reviewer_ids','[]'::jsonb) else '[]'::jsonb end
           ) r(value)
           where not exists (
             select 1 from jsonb_array_elements(
               case when jsonb_typeof(coalesce(new.data->'approvals','[]'::jsonb)) = 'array'
                    then coalesce(new.data->'approvals','[]'::jsonb) else '[]'::jsonb end
             ) a(value)
             where a.value->>'reviewer_id' = r.value #>> '{}'
               and a.value->>'decision' = 'approve'
               and a.value->>'version' = coalesce(new.data->>'version', '1')
           )
         ) then
        raise exception 'PRD cannot be approved until required content and current-version reviewer approvals are complete' using errcode = '22023';
      end if;
      new.data := jsonb_set(new.data, '{approved_at}', to_jsonb(clock_timestamp()::text), true);
    elsif new.data->>'status' = 'Ready for Review' then
      if not can_review
         or (new.data - 'approvals' - 'updated_by_member' - 'v' - 'updated_at' - 'created_at')
            is distinct from (old.data - 'approvals' - 'updated_by_member' - 'v' - 'updated_at' - 'created_at') then
        raise exception 'A submitted PRD is locked; assigned reviewers may change only their own approval' using errcode = '42501';
      end if;

      if exists (
        select 1 from jsonb_array_elements(
          case when jsonb_typeof(coalesce(old.data->'approvals','[]'::jsonb)) = 'array'
               then coalesce(old.data->'approvals','[]'::jsonb) else '[]'::jsonb end
        ) a(value)
        where a.value->>'reviewer_id' <> auth.uid()::text
          and not coalesce(new.data->'approvals','[]'::jsonb) @> jsonb_build_array(a.value)
      ) or exists (
        select 1 from jsonb_array_elements(
          case when jsonb_typeof(coalesce(new.data->'approvals','[]'::jsonb)) = 'array'
               then coalesce(new.data->'approvals','[]'::jsonb) else '[]'::jsonb end
        ) a(value)
        where a.value->>'reviewer_id' <> auth.uid()::text
          and not coalesce(old.data->'approvals','[]'::jsonb) @> jsonb_build_array(a.value)
      ) then
        raise exception 'A reviewer cannot modify another reviewer approval' using errcode = '42501';
      end if;

      if not exists (
        select 1 from jsonb_array_elements(
          case when jsonb_typeof(coalesce(new.data->'approvals','[]'::jsonb)) = 'array'
               then coalesce(new.data->'approvals','[]'::jsonb) else '[]'::jsonb end
        ) a(value)
        where a.value->>'reviewer_id' = auth.uid()::text
          and a.value->>'version' = coalesce(new.data->>'version', '1')
      ) then
        raise exception 'The assigned reviewer may update only their own current-version approval' using errcode = '42501';
      end if;
      return new;
    else
      raise exception 'Invalid PRD review lifecycle transition' using errcode = '42501';
    end if;
  elsif old.data->>'status' = 'Approved' then
    raise exception 'Approved PRDs cannot be edited' using errcode = '42501';
  end if;

  -- Drafts may be edited normally, but they cannot jump straight to Approved or Superseded.
  if new.data->>'status' = 'Approved' then
    raise exception 'Submit a PRD for review before approval' using errcode = '42501';
  end if;
  if new.data->>'status' = 'Superseded' then
    raise exception 'Only an approved PRD can be superseded' using errcode = '42501';
  end if;

  if new.data->>'status' = 'Ready for Review' then
    if coalesce(trim(new.data->>'tldr'), '') = ''
       or not exists (
         select 1 from jsonb_array_elements(
           case when jsonb_typeof(coalesce(new.data->'sections','[]'::jsonb)) = 'array'
                then coalesce(new.data->'sections','[]'::jsonb) else '[]'::jsonb end
         ) s(value)
         where s.value->>'key' = 'problem_overview' and coalesce(trim(s.value->>'content'), '') <> ''
       )
       or not exists (
         select 1 from jsonb_array_elements(
           case when jsonb_typeof(coalesce(new.data->'sections','[]'::jsonb)) = 'array'
                then coalesce(new.data->'sections','[]'::jsonb) else '[]'::jsonb end
         ) s(value)
         where s.value->>'key' = 'proposed_solution' and coalesce(trim(s.value->>'content'), '') <> ''
       )
       or not exists (
         select 1 from jsonb_array_elements(
           case when jsonb_typeof(coalesce(new.data->'sections','[]'::jsonb)) = 'array'
                then coalesce(new.data->'sections','[]'::jsonb) else '[]'::jsonb end
         ) s(value)
         where s.value->>'key' = 'success_metrics' and coalesce(trim(s.value->>'content'), '') <> ''
       ) then
      raise exception 'Complete TLDR, problem overview, proposed solution, and success metrics before review' using errcode = '22023';
    end if;
    new.data := jsonb_set(new.data, '{submitted_for_review_at}', to_jsonb(clock_timestamp()::text), true);
  end if;

  return new;
end;
$function$;

drop trigger if exists projects_guard_prd_review_trg on public.workspace_records;
create trigger projects_guard_prd_review_trg
before insert or update of data on public.workspace_records
for each row execute function public.projects_guard_prd_review();

revoke all on function public.projects_guard_prd_review() from public, anon, authenticated;
