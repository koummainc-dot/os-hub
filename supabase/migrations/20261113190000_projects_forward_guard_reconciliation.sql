-- Forward-only reconciliation for Projects server-side integrity guards.
-- This repairs known missing function/trigger effects without rewriting legacy rows
-- or replaying historical migrations. It intentionally performs no workspace_records
-- UPDATE/DELETE, no backfill, and no Storage bucket/policy changes.
--
-- Source definitions:
--   20261030100000_projects_final_output_guard
--   20261030110000_projects_task_issue_traceability
--   20261030120000_projects_task_issue_deferred_validation
--   20261031110000_projects_prd_requirement_traceability
--   20261031120000_projects_entity_relationship_integrity
--   20261031130000_projects_prd_verified_evidence_guard
--   20261106230000_projects_atomic_discovery_batch_fix
--   20261107120000_projects_okr_v4_relationship_reconciliation
--
-- The OKR v4 function definition is included, but its legacy Objective data UPDATE
-- is deliberately omitted. A separate no-loss migration is required if legacy
-- Objective.project_ids data is ever found.

begin;

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

create or replace function public.projects_guard_risk_issue_links()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  risk_data jsonb;
  old_risk_data jsonb;
  issue_data jsonb;
  risk_id text;
  issue_id text;
  refs_changed boolean := false;
begin
  if new.system_id <> 'projects' or new.collection not in ('risks','issues') then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if (new.data - 'deleted_at' - 'deleted_by' - 'v' - 'updated_at' - 'created_at' - 'updated_by_member')
       is not distinct from
       (old.data - 'deleted_at' - 'deleted_by' - 'v' - 'updated_at' - 'created_at' - 'updated_by_member') then
      return new;
    end if;
  end if;

  if new.collection = 'issues' then
    risk_id := nullif(new.data->>'from_risk_id', '');
    if tg_op = 'INSERT' then
      refs_changed := risk_id is not null;
    else
      refs_changed := risk_id is distinct from nullif(old.data->>'from_risk_id', '')
        or (new.data->>'project_id') is distinct from (old.data->>'project_id');
    end if;
    if not refs_changed then
      return new;
    end if;
    if risk_id is null then
      if tg_op = 'UPDATE' and nullif(old.data->>'from_risk_id', '') is not null then
        select r.data into risk_data
          from public.workspace_records r
         where r.workspace_id = new.workspace_id
           and r.system_id = 'projects'
           and r.collection = 'risks'
           and r.id = old.data->>'from_risk_id'
           and r.deleted = false
         limit 1;
        if risk_data->>'converted_issue_id' = new.id then
          raise exception 'Remove the risk backlink atomically before unlinking this issue' using errcode = '22023';
        end if;
      end if;
      return new;
    end if;

    if tg_op = 'UPDATE'
       and nullif(old.data->>'from_risk_id', '') is not null
       and nullif(old.data->>'from_risk_id', '') is distinct from risk_id then
      old_risk_data := null;
      select r.data into old_risk_data
        from public.workspace_records r
       where r.workspace_id = new.workspace_id
         and r.system_id = 'projects'
         and r.collection = 'risks'
         and r.id = old.data->>'from_risk_id'
         and r.deleted = false
       limit 1;
      if old_risk_data->>'converted_issue_id' = new.id then
        raise exception 'Remove the previous risk backlink atomically before changing this issue risk' using errcode = '22023';
      end if;
    end if;

    risk_data := null;
    select r.data into risk_data
      from public.workspace_records r
     where r.workspace_id = new.workspace_id
       and r.system_id = 'projects'
       and r.collection = 'risks'
       and r.id = risk_id
       and r.deleted = false
       and (r.visible_to is null or auth.uid() = any(r.visible_to))
       and public.ws_access_level(new.workspace_id, 'projects', 'risks') in ('view','edit')
     limit 1;
    if risk_data is null
       or risk_data->>'project_id' is distinct from new.data->>'project_id'
       or risk_data->>'deleted_at' is not null then
      raise exception 'An issue linked to a risk must reference an active visible risk in the same project' using errcode = '22023';
    end if;
    if nullif(risk_data->>'converted_issue_id', '') is not null
       and risk_data->>'converted_issue_id' is distinct from new.id then
      raise exception 'The risk is already linked to another issue' using errcode = '22023';
    end if;
    if exists (
      select 1 from public.workspace_records other_issue
       where other_issue.workspace_id = new.workspace_id
         and other_issue.system_id = 'projects'
         and other_issue.collection = 'issues'
         and other_issue.id <> new.id
         and other_issue.deleted = false
         and other_issue.data->>'from_risk_id' = risk_id
         and other_issue.data->>'deleted_at' is null
    ) then
      raise exception 'Only one active issue may be linked to a risk' using errcode = '22023';
    end if;
    return new;
  end if;

  risk_id := new.id;
  issue_id := nullif(new.data->>'converted_issue_id', '');
  if new.data->>'status' = 'Materialized' and issue_id is null then
    raise exception 'A materialized risk must reference its converted issue' using errcode = '22023';
  end if;
  if tg_op = 'UPDATE'
     and nullif(old.data->>'converted_issue_id', '') is not null
     and nullif(old.data->>'converted_issue_id', '') is distinct from issue_id then
    if exists (
      select 1 from public.workspace_records linked_issue
       where linked_issue.workspace_id = new.workspace_id
         and linked_issue.system_id = 'projects'
         and linked_issue.collection = 'issues'
         and linked_issue.id = old.data->>'converted_issue_id'
         and linked_issue.deleted = false
         and linked_issue.data->>'deleted_at' is null
         and linked_issue.data->>'from_risk_id' = new.id
    ) then
      raise exception 'Remove the previous issue backlink atomically before changing this risk issue' using errcode = '22023';
    end if;
  end if;

  if issue_id is null then
    if tg_op = 'UPDATE' and nullif(old.data->>'converted_issue_id', '') is not null then
      if exists (
        select 1 from public.workspace_records linked_issue
         where linked_issue.workspace_id = new.workspace_id
           and linked_issue.system_id = 'projects'
           and linked_issue.collection = 'issues'
           and linked_issue.id = old.data->>'converted_issue_id'
           and linked_issue.deleted = false
           and linked_issue.data->>'deleted_at' is null
           and linked_issue.data->>'from_risk_id' = new.id
      ) then
        raise exception 'Remove the issue backlink atomically before unlinking this risk' using errcode = '22023';
      end if;
    end if;
    return new;
  end if;

  issue_data := null;
  select i.data into issue_data
    from public.workspace_records i
   where i.workspace_id = new.workspace_id
     and i.system_id = 'projects'
     and i.collection = 'issues'
     and i.id = issue_id
     and i.deleted = false
     and (i.visible_to is null or auth.uid() = any(i.visible_to))
     and public.ws_access_level(new.workspace_id, 'projects', 'issues') in ('view','edit')
   limit 1;
  if issue_data is null
     or issue_data->>'project_id' is distinct from new.data->>'project_id'
     or issue_data->>'deleted_at' is not null
     or (nullif(issue_data->>'from_risk_id', '') is not null
         and issue_data->>'from_risk_id' is distinct from risk_id) then
    raise exception 'A risk conversion must reference a visible issue in the same project without conflicting risk ownership' using errcode = '22023';
  end if;

  return new;
end;
$function$;

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

create or replace function public.projects_assert_linked_records(
  p_workspace_id uuid,
  p_project_id text,
  p_collection text,
  p_ids jsonb,
  p_label text,
  p_allow_global boolean default false,
  p_require_final boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  linked_id text;
  target_data jsonb;
  project_list jsonb;
begin
  if p_ids is null or p_ids = 'null'::jsonb then
    return;
  end if;
  if jsonb_typeof(p_ids) <> 'array' then
    raise exception '% must be an array of IDs', p_label using errcode = '22023';
  end if;
  if (select count(*) from jsonb_array_elements_text(p_ids))
     <> (select count(distinct value) from jsonb_array_elements_text(p_ids)) then
    raise exception '% contains duplicate IDs', p_label using errcode = '22023';
  end if;

  for linked_id in select value from jsonb_array_elements_text(p_ids)
  loop
    target_data := null;
    select r.data into target_data
      from public.workspace_records r
     where r.workspace_id = p_workspace_id
       and r.system_id = 'projects'
       and r.collection = p_collection
       and r.id = linked_id
       and r.deleted = false
       and (r.visible_to is null or auth.uid() = any(r.visible_to))
       and public.ws_access_level(p_workspace_id, 'projects', p_collection) in ('view','edit')
     limit 1;

    if target_data is null
       or target_data->>'deleted_at' is not null
       or target_data->>'archived_at' is not null then
      raise exception '% references a missing, deleted, archived, or inaccessible % record: %',
        p_label, p_collection, linked_id using errcode = '22023';
    end if;

    if p_collection <> 'projects' and target_data->>'project_id' is distinct from p_project_id then
      if not p_allow_global then
        raise exception '% references a record outside the same project: %', p_label, linked_id using errcode = '22023';
      end if;
      project_list := case
        when jsonb_typeof(target_data->'project_ids') = 'array' then target_data->'project_ids'
        else '[]'::jsonb
      end;
      if p_project_id is not null and jsonb_array_length(project_list) > 0 and not exists (
        select 1 from jsonb_array_elements_text(project_list) as project_ref(value)
        where value = p_project_id
      ) then
        raise exception '% references a record not associated with this project: %', p_label, linked_id using errcode = '22023';
      end if;
    end if;

    if p_require_final and target_data->>'approval' is distinct from 'Final' then
      raise exception '% must reference Final outputs only: %', p_label, linked_id using errcode = '22023';
    end if;
  end loop;
end;
$function$;

create or replace function public.projects_guard_entity_relationships()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  project_id text;
  target_data jsonb;
  linked_id text;
  project_list jsonb;
  refs_changed boolean := true;
begin
  if new.system_id <> 'projects'
     or new.collection not in ('tasks','decisions','risks','wins','updates','objectives','krs','discovery','issues') then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    refs_changed :=
      (new.data->>'project_id') is distinct from (old.data->>'project_id')
      or (new.data->'project_ids') is distinct from (old.data->'project_ids')
      or (new.data->'task_ids') is distinct from (old.data->'task_ids')
      or (new.data->>'task_id') is distinct from (old.data->>'task_id')
      or (new.data->'output_ids') is distinct from (old.data->'output_ids')
      or (new.data->'objective_id') is distinct from (old.data->'objective_id')
      or (new.data->'kr_id') is distinct from (old.data->'kr_id')
      or (new.data->'prd_id') is distinct from (old.data->'prd_id')
      or (new.data->'converted_issue_id') is distinct from (old.data->'converted_issue_id')
      or (new.data->'superseded_by_id') is distinct from (old.data->'superseded_by_id')
      or (new.data->'affected_task_ids') is distinct from (old.data->'affected_task_ids')
      or (new.data->'implementation_task_ids') is distinct from (old.data->'implementation_task_ids')
      or (new.data->'affected_prd_ids') is distinct from (old.data->'affected_prd_ids')
      or (new.data->'affected_risk_ids') is distinct from (old.data->'affected_risk_ids')
      or (new.data->'affected_issue_ids') is distinct from (old.data->'affected_issue_ids')
      or (new.data->'affected_discovery_ids') is distinct from (old.data->'affected_discovery_ids')
      or (new.data->'related_task_ids') is distinct from (old.data->'related_task_ids')
      or (new.data->'related_risk_ids') is distinct from (old.data->'related_risk_ids')
      or (new.data->'related_issue_ids') is distinct from (old.data->'related_issue_ids')
      or (new.data->'related_decision_ids') is distinct from (old.data->'related_decision_ids')
      or (new.data->'related_prd_ids') is distinct from (old.data->'related_prd_ids')
      or (new.data->'related_output_ids') is distinct from (old.data->'related_output_ids')
      or (new.data->'related_win_ids') is distinct from (old.data->'related_win_ids')
      or (new.data->'discovery_ids') is distinct from (old.data->'discovery_ids')
      or (new.data->'issue_ids') is distinct from (old.data->'issue_ids')
      or (new.data->>'parent_task_id') is distinct from (old.data->>'parent_task_id');
  end if;
  if not refs_changed then
    return new;
  end if;

  project_id := nullif(new.data->>'project_id','');

  if new.collection = 'tasks' then
    if project_id is null then raise exception 'Task must belong to a project' using errcode = '22023'; end if;
    if nullif(new.data->>'parent_task_id','') is not null then
      if new.data->>'parent_task_id' = new.id then raise exception 'A task cannot be its own parent' using errcode = '22023'; end if;
      perform public.projects_assert_linked_records(new.workspace_id, project_id, 'tasks', jsonb_build_array(new.data->>'parent_task_id'), 'task.parent_task_id');
    end if;
    perform public.projects_assert_linked_records(new.workspace_id, project_id, 'issues', new.data->'issue_ids', 'task.issue_ids');
    perform public.projects_assert_linked_records(new.workspace_id, project_id, 'discovery', new.data->'discovery_ids', 'task.discovery_ids', true);

  elsif new.collection = 'decisions' then
    if project_id is null then raise exception 'Decision must belong to a project' using errcode = '22023'; end if;
    perform public.projects_assert_linked_records(new.workspace_id, project_id, 'tasks', new.data->'affected_task_ids', 'affected_task_ids');
    perform public.projects_assert_linked_records(new.workspace_id, project_id, 'tasks', new.data->'implementation_task_ids', 'implementation_task_ids');
    perform public.projects_assert_linked_records(new.workspace_id, project_id, 'prds', new.data->'affected_prd_ids', 'affected_prd_ids');
    perform public.projects_assert_linked_records(new.workspace_id, project_id, 'risks', new.data->'affected_risk_ids', 'affected_risk_ids');
    perform public.projects_assert_linked_records(new.workspace_id, project_id, 'issues', new.data->'affected_issue_ids', 'affected_issue_ids');
    perform public.projects_assert_linked_records(new.workspace_id, project_id, 'discovery', new.data->'affected_discovery_ids', 'affected_discovery_ids', true);
    if nullif(new.data->>'prd_id','') is not null then
      perform public.projects_assert_linked_records(new.workspace_id, project_id, 'prds', jsonb_build_array(new.data->>'prd_id'), 'prd_id');
    end if;
    if nullif(new.data->>'superseded_by_id','') is not null then
      if new.data->>'superseded_by_id' = new.id then raise exception 'A decision cannot supersede itself' using errcode = '22023'; end if;
      perform public.projects_assert_linked_records(new.workspace_id, project_id, 'decisions', jsonb_build_array(new.data->>'superseded_by_id'), 'superseded_by_id');
    end if;

  elsif new.collection = 'risks' then
    if project_id is null then raise exception 'Risk must belong to a project' using errcode = '22023'; end if;
    perform public.projects_assert_linked_records(new.workspace_id, project_id, 'tasks', new.data->'task_ids', 'risk.task_ids');
    if nullif(new.data->>'prd_id','') is not null then
      perform public.projects_assert_linked_records(new.workspace_id, project_id, 'prds', jsonb_build_array(new.data->>'prd_id'), 'risk.prd_id');
    end if;
    if nullif(new.data->>'converted_issue_id','') is not null then
      perform public.projects_assert_linked_records(new.workspace_id, project_id, 'issues', jsonb_build_array(new.data->>'converted_issue_id'), 'risk.converted_issue_id');
    end if;

  elsif new.collection = 'wins' then
    if project_id is null and (
      coalesce(jsonb_array_length(case when jsonb_typeof(new.data->'task_ids')='array' then new.data->'task_ids' else '[]'::jsonb end),0) > 0
      or nullif(new.data->>'task_id','') is not null
      or coalesce(jsonb_array_length(case when jsonb_typeof(new.data->'output_ids')='array' then new.data->'output_ids' else '[]'::jsonb end),0) > 0
    ) then raise exception 'A win with task/output evidence must belong to a project' using errcode = '22023'; end if;
    if project_id is not null then
      perform public.projects_assert_linked_records(new.workspace_id, project_id, 'tasks', new.data->'task_ids', 'win.task_ids');
      if nullif(new.data->>'task_id','') is not null then
        perform public.projects_assert_linked_records(new.workspace_id, project_id, 'tasks', jsonb_build_array(new.data->>'task_id'), 'win.task_id');
      end if;
      perform public.projects_assert_linked_records(new.workspace_id, project_id, 'outputs', new.data->'output_ids', 'win.output_ids', false, true);
    end if;
    if nullif(new.data->>'objective_id','') is not null then
      perform public.projects_assert_linked_records(new.workspace_id, project_id, 'objectives', jsonb_build_array(new.data->>'objective_id'), 'win.objective_id', true);
    end if;
    if nullif(new.data->>'kr_id','') is not null then
      perform public.projects_assert_linked_records(new.workspace_id, project_id, 'krs', jsonb_build_array(new.data->>'kr_id'), 'win.kr_id', true);
      select k.data into target_data from public.workspace_records k
       where k.workspace_id = new.workspace_id and k.system_id = 'projects' and k.collection = 'krs' and k.id = new.data->>'kr_id' and k.deleted = false limit 1;
      if new.data->>'objective_id' is distinct from target_data->>'objective_id' then
        raise exception 'The selected KR must belong to the selected objective' using errcode = '22023';
      end if;
    end if;

  elsif new.collection = 'updates' then
    if project_id is null then raise exception 'Update must belong to a project' using errcode = '22023'; end if;
    perform public.projects_assert_linked_records(new.workspace_id, project_id, 'tasks', new.data->'related_task_ids', 'update.related_task_ids');
    perform public.projects_assert_linked_records(new.workspace_id, project_id, 'risks', new.data->'related_risk_ids', 'update.related_risk_ids');
    perform public.projects_assert_linked_records(new.workspace_id, project_id, 'issues', new.data->'related_issue_ids', 'update.related_issue_ids');
    perform public.projects_assert_linked_records(new.workspace_id, project_id, 'decisions', new.data->'related_decision_ids', 'update.related_decision_ids');
    perform public.projects_assert_linked_records(new.workspace_id, project_id, 'prds', new.data->'related_prd_ids', 'update.related_prd_ids');
    perform public.projects_assert_linked_records(new.workspace_id, project_id, 'outputs', new.data->'related_output_ids', 'update.related_output_ids');
    perform public.projects_assert_linked_records(new.workspace_id, project_id, 'wins', new.data->'related_win_ids', 'update.related_win_ids');

  elsif new.collection = 'objectives' then
    -- OKR v4: Objective has no direct Project relation. Supporting Projects belong to KR.project_ids.
    if new.data ? 'project_ids' then
      raise exception 'Objective.project_ids is deprecated; link supporting Projects through KR.project_ids' using errcode = '22023';
    end if;

  elsif new.collection = 'krs' then
    perform public.projects_assert_linked_records(new.workspace_id, null, 'projects', new.data->'project_ids', 'kr.project_ids');
    if nullif(new.data->>'objective_id','') is not null then
      perform public.projects_assert_linked_records(new.workspace_id, null, 'objectives', jsonb_build_array(new.data->>'objective_id'), 'kr.objective_id', true);
    end if;
    -- Task groups may span projects. When project_ids is specified, every linked task
    -- must belong to one of those explicitly linked projects.
    if jsonb_typeof(new.data->'task_ids') = 'array' then
      for linked_id in select value from jsonb_array_elements_text(new.data->'task_ids')
      loop
        target_data := null;
        select t.data into target_data from public.workspace_records t
         where t.workspace_id = new.workspace_id and t.system_id = 'projects' and t.collection = 'tasks'
           and t.id = linked_id and t.deleted = false
           and (t.visible_to is null or auth.uid() = any(t.visible_to))
           and public.ws_access_level(new.workspace_id, 'projects', 'tasks') in ('view','edit')
         limit 1;
        if target_data is null or target_data->>'deleted_at' is not null or target_data->>'archived_at' is not null then
          raise exception 'KR task link references a missing or inactive task: %', linked_id using errcode = '22023';
        end if;
        project_list := case when jsonb_typeof(new.data->'project_ids')='array' then new.data->'project_ids' else '[]'::jsonb end;
        if jsonb_array_length(project_list) > 0 and not exists (
          select 1 from jsonb_array_elements_text(project_list) as project_ref(value)
          where value = target_data->>'project_id'
        ) then
          raise exception 'KR task must belong to one of the KR linked projects: %', linked_id using errcode = '22023';
        end if;
      end loop;
    end if;

  elsif new.collection = 'discovery' then
    perform public.projects_assert_linked_records(new.workspace_id, null, 'projects', new.data->'project_ids', 'discovery.project_ids');

  elsif new.collection = 'issues' then
    if project_id is null then raise exception 'Issue must belong to a project' using errcode = '22023'; end if;
    perform public.projects_assert_linked_records(new.workspace_id, project_id, 'tasks', new.data->'task_ids', 'issue.task_ids');
  end if;

  return new;
end;
$function$;

create or replace function public.projects_guard_prd_verified_requirement_evidence()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  req jsonb;
  prd_data jsonb;
  old_output jsonb;
  new_output jsonb;
  old_is_final boolean := false;
  new_is_final boolean := false;
  old_is_active boolean := false;
  new_is_active boolean := false;
  lost_prd_id text;
  lost_requirement_id text;
  lost_project_id text;
  lost_workspace_id uuid;
  lost_output_id text;
begin
  if tg_table_name <> 'workspace_records' then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.system_id = 'projects' and old.collection = 'prds' then
      if exists (
        select 1 from public.workspace_records linked
         where linked.workspace_id = old.workspace_id
           and linked.system_id = 'projects'
           and linked.collection in ('tasks','outputs')
           and linked.deleted = false
           and linked.data->>'deleted_at' is null
           and linked.data->>'archived_at' is null
           and linked.data->>'prd_id' = old.id
      ) then
        raise exception 'Cannot delete a PRD while active tasks or outputs still reference it'
          using errcode = '22023';
      end if;
      return old;
    end if;
    if old.system_id <> 'projects' or old.collection <> 'outputs' then
      return old;
    end if;
    old_output := old.data;
    old_is_final := old_output->>'approval' = 'Final';
    old_is_active := not old.deleted
      and old_output->>'deleted_at' is null
      and old_output->>'archived_at' is null;
    lost_output_id := old.id;
    lost_prd_id := nullif(old_output->>'prd_id','');
    lost_requirement_id := nullif(old_output->>'prd_requirement_id','');
    lost_project_id := nullif(old_output->>'project_id','');
    lost_workspace_id := old.workspace_id;
  elsif tg_op = 'UPDATE' then
    if new.system_id <> 'projects' or new.collection <> 'outputs' or old.system_id <> 'projects' or old.collection <> 'outputs' then
      -- PRD updates are handled below; unrelated collections do not need evidence checks.
      if new.system_id = 'projects' and new.collection = 'prds' then
        if new.deleted or new.data->>'deleted_at' is not null or new.data->>'archived_at' is not null then
          if exists (
            select 1 from public.workspace_records linked
             where linked.workspace_id = new.workspace_id
               and linked.system_id = 'projects'
               and linked.collection in ('tasks','outputs')
               and linked.deleted = false
               and linked.data->>'deleted_at' is null
               and linked.data->>'archived_at' is null
               and linked.data->>'prd_id' = new.id
          ) then
            raise exception 'Cannot archive or delete a PRD while active tasks or outputs still reference it'
              using errcode = '22023';
          end if;
        end if;

        if tg_op = 'UPDATE' then
          for req in
            select value
              from jsonb_array_elements(
                case when jsonb_typeof(old.data->'requirements') = 'array'
                     then old.data->'requirements' else '[]'::jsonb end
              )
          loop
            if not exists (
              select 1
                from jsonb_array_elements(
                  case when jsonb_typeof(new.data->'requirements') = 'array'
                       then new.data->'requirements' else '[]'::jsonb end
                ) next_req(value)
               where next_req.value->>'id' = req->>'id'
            ) and exists (
              select 1 from public.workspace_records linked
               where linked.workspace_id = new.workspace_id
                 and linked.system_id = 'projects'
                 and linked.collection in ('tasks','outputs')
                 and linked.deleted = false
                 and linked.data->>'deleted_at' is null
                 and linked.data->>'archived_at' is null
                 and linked.data->>'prd_id' = new.id
                 and linked.data->>'prd_requirement_id' = req->>'id'
            ) then
              raise exception 'Cannot remove a PRD requirement while active tasks or outputs still reference it: %', req->>'id'
                using errcode = '22023';
            end if;
          end loop;
        end if;

        for req in
          select value
            from jsonb_array_elements(
              case when jsonb_typeof(new.data->'requirements') = 'array'
                   then new.data->'requirements' else '[]'::jsonb end
            )
        loop
          if req->>'status' = 'Verified' then
            if not exists (
              select 1
                from public.workspace_records o
               where o.workspace_id = new.workspace_id
                 and o.system_id = 'projects'
                 and o.collection = 'outputs'
                 and o.deleted = false
                 and o.data->>'deleted_at' is null
                 and o.data->>'archived_at' is null
                 and o.data->>'approval' = 'Final'
                 and o.data->>'project_id' = new.data->>'project_id'
                 and o.data->>'prd_id' = new.id
                 and o.data->>'prd_requirement_id' = req->>'id'
            ) then
              raise exception 'A PRD requirement cannot be Verified without active Final output evidence: %', req->>'id'
                using errcode = '22023';
            end if;
          end if;
        end loop;
      end if;
      return new;
    end if;

    old_output := old.data;
    new_output := new.data;
    old_is_final := old_output->>'approval' = 'Final';
    new_is_final := new_output->>'approval' = 'Final';
    old_is_active := not old.deleted
      and old_output->>'deleted_at' is null
      and old_output->>'archived_at' is null;
    new_is_active := not new.deleted
      and new_output->>'deleted_at' is null
      and new_output->>'archived_at' is null;

    if old_is_final and old_is_active and (
      not new_is_final or not new_is_active
      or old_output->>'prd_id' is distinct from new_output->>'prd_id'
      or old_output->>'prd_requirement_id' is distinct from new_output->>'prd_requirement_id'
      or old_output->>'project_id' is distinct from new_output->>'project_id'
    ) then
      lost_output_id := old.id;
      lost_prd_id := nullif(old_output->>'prd_id','');
      lost_requirement_id := nullif(old_output->>'prd_requirement_id','');
      lost_project_id := nullif(old_output->>'project_id','');
      lost_workspace_id := old.workspace_id;
    end if;
  else
    -- INSERT cannot remove evidence; a newly inserted PRD is validated on its own update.
    if new.system_id = 'projects' and new.collection = 'prds' then
      for req in
        select value
          from jsonb_array_elements(
            case when jsonb_typeof(new.data->'requirements') = 'array'
                 then new.data->'requirements' else '[]'::jsonb end
          )
      loop
        if req->>'status' = 'Verified' and not exists (
          select 1 from public.workspace_records o
           where o.workspace_id = new.workspace_id
             and o.system_id = 'projects' and o.collection = 'outputs'
             and o.deleted = false
             and o.data->>'deleted_at' is null and o.data->>'archived_at' is null
             and o.data->>'approval' = 'Final'
             and o.data->>'project_id' = new.data->>'project_id'
             and o.data->>'prd_id' = new.id
             and o.data->>'prd_requirement_id' = req->>'id'
        ) then
          raise exception 'A PRD requirement cannot be Verified without active Final output evidence: %', req->>'id'
            using errcode = '22023';
        end if;
      end loop;
    end if;
    return new;
  end if;

  if lost_prd_id is not null and lost_requirement_id is not null then
    select p.data into prd_data
      from public.workspace_records p
     where p.workspace_id = lost_workspace_id
       and p.system_id = 'projects'
       and p.collection = 'prds'
       and p.id = lost_prd_id
       and p.deleted = false
     limit 1;

    if prd_data is not null and exists (
      select 1
        from jsonb_array_elements(
          case when jsonb_typeof(prd_data->'requirements') = 'array'
               then prd_data->'requirements' else '[]'::jsonb end
        ) req(value)
       where req.value->>'id' = lost_requirement_id
         and req.value->>'status' = 'Verified'
    ) and not exists (
      select 1
        from public.workspace_records o
       where o.workspace_id = lost_workspace_id
         and o.system_id = 'projects'
         and o.collection = 'outputs'
         and o.id <> lost_output_id
         and o.deleted = false
         and o.data->>'deleted_at' is null
         and o.data->>'archived_at' is null
         and o.data->>'approval' = 'Final'
         and o.data->>'project_id' = lost_project_id
         and o.data->>'prd_id' = lost_prd_id
         and o.data->>'prd_requirement_id' = lost_requirement_id
    ) then
      raise exception 'Cannot remove the last active Final output evidence for a Verified PRD requirement: %', lost_requirement_id
        using errcode = '22023';
    end if;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$function$;

create or replace function public.projects_apply_records_batch(
  p_workspace_id uuid,
  p_changes jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $function$
declare
  item jsonb;
  collection_name text;
  record_id text;
  expected_ts timestamptz;
  actual_ts timestamptz;
  record_data jsonb;
  visibility uuid[];
  is_deleted boolean;
  affected integer;
  result jsonb := '[]'::jsonb;
  seen_keys text[] := array[]::text[];
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_workspace_id is null then
    raise exception 'Workspace is required' using errcode = '22023';
  end if;
  if jsonb_typeof(p_changes) is distinct from 'array'
     or jsonb_array_length(p_changes) = 0
     or jsonb_array_length(p_changes) > 1000 then
    raise exception 'Changes must be a non-empty array of at most 1000 records' using errcode = '22023';
  end if;

  for item in select value from jsonb_array_elements(p_changes)
  loop
    if jsonb_typeof(item) is distinct from 'object' then
      raise exception 'Invalid batch item' using errcode = '22023';
    end if;
    collection_name := item->>'collection';
    record_id := item->>'id';
    record_data := item->'data';
    if collection_name not in ('tasks','outputs','projects','risks','issues','decisions','prds','updates','discovery')
       or nullif(record_id, '') is null
       or jsonb_typeof(record_data) is distinct from 'object'
       or (item ? 'visible_to' and jsonb_typeof(item->'visible_to') not in ('array','null'))
       or jsonb_typeof(item->'deleted') is distinct from 'boolean' then
      raise exception 'Invalid Projects batch item' using errcode = '22023';
    end if;
    if public.ws_access_level(p_workspace_id, 'projects', collection_name) is distinct from 'edit' then
      raise exception 'Edit access required for Projects collection %', collection_name using errcode = '42501';
    end if;
    if (collection_name || '/' || record_id) = any(seen_keys) then
      raise exception 'Duplicate record in batch: %/%', collection_name, record_id using errcode = '22023';
    end if;
    seen_keys := array_append(seen_keys, collection_name || '/' || record_id);

    expected_ts := nullif(item->>'expected_updated_at', '')::timestamptz;
    select wr.updated_at into actual_ts
      from public.workspace_records wr
     where wr.workspace_id = p_workspace_id
       and wr.system_id = 'projects'
       and wr.collection = collection_name
       and wr.id = record_id
     for update;

    if expected_ts is null then
      if actual_ts is not null then
        raise exception 'Concurrent insert detected for %/%; reload and retry', collection_name, record_id using errcode = '40001';
      end if;
    elsif actual_ts is distinct from expected_ts then
      raise exception 'Record %/% changed since it was loaded; reload and retry', collection_name, record_id using errcode = '40001';
    end if;
  end loop;

  for item in select value from jsonb_array_elements(p_changes)
  loop
    collection_name := item->>'collection';
    record_id := item->>'id';
    record_data := item->'data';
    expected_ts := nullif(item->>'expected_updated_at', '')::timestamptz;
    is_deleted := (item->>'deleted')::boolean;
    visibility := null;

    if jsonb_typeof(item->'visible_to') = 'array' then
      select array_agg(value::uuid) into visibility
        from jsonb_array_elements_text(item->'visible_to') as values(value);
    end if;

    if expected_ts is null then
      insert into public.workspace_records
        (workspace_id, system_id, collection, id, data, deleted, visible_to, updated_at, updated_by)
      values
        (p_workspace_id, 'projects', collection_name, record_id, record_data, is_deleted, visibility, clock_timestamp(), auth.uid())
      returning updated_at into actual_ts;
    else
      update public.workspace_records
         set data = record_data,
             deleted = is_deleted,
             visible_to = visibility,
             updated_at = clock_timestamp(),
             updated_by = auth.uid()
       where workspace_id = p_workspace_id
         and system_id = 'projects'
         and collection = collection_name
         and id = record_id
         and updated_at = expected_ts
      returning updated_at into actual_ts;
      get diagnostics affected = row_count;
      if affected <> 1 then
        raise exception 'Record %/% changed during batch; retry', collection_name, record_id using errcode = '40001';
      end if;
    end if;

    result := result || jsonb_build_array(jsonb_build_object(
      'collection', collection_name, 'id', record_id, 'updated_at', actual_ts
    ));
  end loop;

  return result;
end;
$function$;

-- Reattach the complete guard set. The task/issue cross-reference check remains
-- DEFERRABLE INITIALLY DEFERRED so atomic two-record relationship updates can settle
-- before validation at transaction end.
drop trigger if exists projects_guard_final_outputs_trg on public.workspace_records;
create trigger projects_guard_final_outputs_trg
before insert or update of data on public.workspace_records
for each row execute function public.projects_guard_final_outputs();

drop trigger if exists projects_guard_work_sessions_trg on public.workspace_records;
create trigger projects_guard_work_sessions_trg
before insert or update of data on public.workspace_records
for each row execute function public.projects_guard_work_sessions();

drop trigger if exists projects_guard_task_references_trg on public.workspace_records;
create trigger projects_guard_task_references_trg
before insert or update of data on public.workspace_records
for each row execute function public.projects_guard_task_references();

drop trigger if exists projects_guard_prd_review_trg on public.workspace_records;
create trigger projects_guard_prd_review_trg
before insert or update of data on public.workspace_records
for each row execute function public.projects_guard_prd_review();

drop trigger if exists projects_guard_risk_issue_links_trg on public.workspace_records;
create trigger projects_guard_risk_issue_links_trg
before insert or update of data on public.workspace_records
for each row execute function public.projects_guard_risk_issue_links();

drop trigger if exists projects_guard_task_issue_references_trg on public.workspace_records;
create constraint trigger projects_guard_task_issue_references_trg
after insert or update of data on public.workspace_records
deferrable initially deferred
for each row execute function public.projects_guard_task_issue_references();

drop trigger if exists projects_guard_prd_requirement_links_trg on public.workspace_records;
create trigger projects_guard_prd_requirement_links_trg
before insert or update of data on public.workspace_records
for each row execute function public.projects_guard_prd_requirement_links();

drop trigger if exists projects_guard_entity_relationships_trg on public.workspace_records;
create trigger projects_guard_entity_relationships_trg
before insert or update of data on public.workspace_records
for each row execute function public.projects_guard_entity_relationships();

drop trigger if exists projects_guard_prd_verified_requirement_evidence_trg on public.workspace_records;
create trigger projects_guard_prd_verified_requirement_evidence_trg
before insert or update of data, deleted or delete on public.workspace_records
for each row execute function public.projects_guard_prd_verified_requirement_evidence();

-- Trigger functions are not callable as user RPCs. Only the atomic batch RPC is
-- granted to authenticated clients; discovery is included in its allowlist.
revoke all on function public.projects_guard_final_outputs() from public, anon, authenticated;
revoke all on function public.projects_guard_work_sessions() from public, anon, authenticated;
revoke all on function public.projects_guard_task_references() from public, anon, authenticated;
revoke all on function public.projects_guard_prd_review() from public, anon, authenticated;
revoke all on function public.projects_guard_risk_issue_links() from public, anon, authenticated;
revoke all on function public.projects_guard_task_issue_references() from public, anon, authenticated;
revoke all on function public.projects_guard_prd_requirement_links() from public, anon, authenticated;
revoke all on function public.projects_assert_linked_records(uuid,text,text,jsonb,text,boolean,boolean) from public, anon, authenticated;
revoke all on function public.projects_guard_entity_relationships() from public, anon, authenticated;
revoke all on function public.projects_guard_prd_verified_requirement_evidence() from public, anon, authenticated;
revoke all on function public.projects_apply_records_batch(uuid, jsonb) from public, anon;
grant execute on function public.projects_apply_records_batch(uuid, jsonb) to authenticated;

commit;
