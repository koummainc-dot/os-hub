begin;

-- Project Milestones are reportable commitments, not Tasks. Keep their project
-- ownership and optional task backlinks validated at the database boundary.
create or replace function public.projects_guard_milestone_relationships()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  project_id text;
begin
  if new.system_id <> 'projects' or new.collection <> 'milestones' then
    return new;
  end if;

  if new.deleted then
    return new;
  end if;

  project_id := nullif(trim(new.data->>'project_id'), '');
  if project_id is null then
    raise exception 'Milestone must belong to a project' using errcode = '22023';
  end if;
  if nullif(trim(new.data->>'title'), '') is null then
    raise exception 'Milestone title is required' using errcode = '22023';
  end if;
  if coalesce(new.data->>'status', 'Planned') not in ('Planned', 'In Progress', 'Completed') then
    raise exception 'Milestone status is invalid' using errcode = '22023';
  end if;

  perform public.projects_assert_linked_records(
    new.workspace_id, null, 'projects', jsonb_build_array(project_id),
    'milestone.project_id', false, false
  );
  perform public.projects_assert_linked_records(
    new.workspace_id, project_id, 'tasks',
    case when jsonb_typeof(new.data->'related_task_ids') = 'array'
      then new.data->'related_task_ids' else '[]'::jsonb end,
    'milestone.related_task_ids', false, false
  );

  return new;
end;
$function$;

drop trigger if exists projects_guard_milestone_relationships_trg on public.workspace_records;
create trigger projects_guard_milestone_relationships_trg
before insert or update of data, deleted on public.workspace_records
for each row execute function public.projects_guard_milestone_relationships();

revoke all on function public.projects_guard_milestone_relationships() from public, anon, authenticated;

commit;
