-- Enforce project-scoped relationships for Projects OS records stored as JSONB.
-- Relationships remain canonical on their owning record; this trigger validates IDs
-- against the same workspace and project without duplicating relationship rows.

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
     or new.collection not in ('decisions','risks','wins','updates','objectives','krs','discovery','issues') then
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
      or (new.data->'related_win_ids') is distinct from (old.data->'related_win_ids');
  end if;
  if not refs_changed then
    return new;
  end if;

  project_id := nullif(new.data->>'project_id','');

  if new.collection = 'decisions' then
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
    perform public.projects_assert_linked_records(new.workspace_id, null, 'projects', new.data->'project_ids', 'objective.project_ids');

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

drop trigger if exists projects_guard_entity_relationships_trg on public.workspace_records;
create trigger projects_guard_entity_relationships_trg
before insert or update of data on public.workspace_records
for each row execute function public.projects_guard_entity_relationships();

revoke all on function public.projects_assert_linked_records(uuid,text,text,jsonb,text,boolean,boolean) from public, anon, authenticated;
revoke all on function public.projects_guard_entity_relationships() from public, anon, authenticated;
