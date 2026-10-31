-- Keep PRD requirement verification truthful at the database boundary.
-- A Verified requirement must always have active Final output evidence.
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

drop trigger if exists projects_guard_prd_verified_requirement_evidence_trg on public.workspace_records;
create trigger projects_guard_prd_verified_requirement_evidence_trg
before insert or update of data, deleted or delete on public.workspace_records
for each row execute function public.projects_guard_prd_verified_requirement_evidence();

revoke all on function public.projects_guard_prd_verified_requirement_evidence() from public, anon, authenticated;
