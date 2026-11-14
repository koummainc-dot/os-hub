begin;

create or replace function public.projects_guard_published_update_and_review_privacy()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_actor uuid := auth.uid();
  v_member uuid;
  v_review_id text;
  v_review_data jsonb;
  v_review_visible uuid[];
  v_share_scope text;
  v_shared_sections jsonb;
  v_payload jsonb;
  v_item jsonb;
  v_project_data jsonb;
  v_project_visible uuid[];
  v_project_id text;
  v_recipients uuid[];
  v_workspace_owner uuid;
  v_key text;
  v_reflection_key text;
  v_old_addenda jsonb;
  v_new_addenda jsonb;
  v_i integer;
  v_contains_private boolean := false;
begin
  if tg_op = 'DELETE' then
    if old.system_id = 'projects' and old.collection in ('reviews','review_shares') then
      v_member := nullif(old.data->>'member_id','')::uuid;
      if v_actor is null or v_actor is distinct from v_member then
        raise exception 'Only the owner may delete a private Review or its shared projection'
          using errcode = '42501';
      end if;
    end if;
    return old;
  end if;

  if new.system_id <> 'projects' then
    return new;
  end if;

  -- A published stakeholder update is an immutable snapshot. The only content
  -- change allowed after publication is appending addenda; soft-delete/restore
  -- metadata and normal version stamps remain allowed.
  if new.collection = 'updates' and tg_op = 'UPDATE'
     and old.data->>'status' = 'Published' then
    if new.data->>'status' is distinct from 'Published' then
      raise exception 'Published Updates cannot be reverted or rewritten'
        using errcode = '42501';
    end if;
    if (new.data - 'addenda' - 'updated_at' - 'updated_by_member' - 'v'
                   - 'deleted_at' - 'deleted_by' - 'archived_at' - 'archived_by')
       is distinct from
       (old.data - 'addenda' - 'updated_at' - 'updated_by_member' - 'v'
                   - 'deleted_at' - 'deleted_by' - 'archived_at' - 'archived_by') then
      raise exception 'Published Update content and snapshot are immutable; append an addendum'
        using errcode = '42501';
    end if;

    v_old_addenda := case when jsonb_typeof(old.data->'addenda')='array' then old.data->'addenda' else '[]'::jsonb end;
    v_new_addenda := case when jsonb_typeof(new.data->'addenda')='array' then new.data->'addenda' else '[]'::jsonb end;
    if jsonb_array_length(v_new_addenda) < jsonb_array_length(v_old_addenda) then
      raise exception 'Published Update addenda are append-only'
        using errcode = '42501';
    end if;
    if jsonb_array_length(v_old_addenda) > 0 then
      for v_i in 0..jsonb_array_length(v_old_addenda)-1 loop
        if v_old_addenda->v_i is distinct from v_new_addenda->v_i then
          raise exception 'Existing Published Update addenda cannot be edited or removed'
            using errcode = '42501';
        end if;
      end loop;
    end if;
    if jsonb_array_length(v_new_addenda) > jsonb_array_length(v_old_addenda) then
      for v_i in jsonb_array_length(v_old_addenda)..jsonb_array_length(v_new_addenda)-1 loop
        v_item := v_new_addenda->v_i;
        if jsonb_typeof(v_item) is distinct from 'object'
           or nullif(trim(v_item->>'text'),'') is null
           or nullif(trim(v_item->>'by'),'') is null
           or nullif(trim(v_item->>'at'),'') is null then
          raise exception 'Each addendum must include author, timestamp and non-empty text'
            using errcode = '22023';
        end if;
      end loop;
    end if;
    return new;
  end if;

  -- Personal Weekly Reviews always belong to the authenticated member and are
  -- visible only to that member. A Closed review freezes its historical snapshot.
  if new.collection = 'reviews' then
    v_member := nullif(new.data->>'member_id','')::uuid;
    if v_actor is null or v_member is distinct from v_actor then
      raise exception 'A Weekly Review may only be written by its owner'
        using errcode = '42501';
    end if;
    if new.data->>'visibility' is distinct from 'private'
       or new.visible_to is null
       or cardinality(new.visible_to) <> 1
       or not (v_actor = any(new.visible_to)) then
      raise exception 'Weekly Review source records must remain private to their owner'
        using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' then
      if old.data->>'member_id' is distinct from new.data->>'member_id'
         or old.visible_to is distinct from new.visible_to then
        raise exception 'Weekly Review owner and privacy boundary are immutable'
          using errcode = '42501';
      end if;
      if old.data->>'status' = 'Closed' then
        if new.data->>'status' is distinct from 'Closed'
           or (new.data - 'updated_at' - 'updated_by_member' - 'v' - 'deleted_at' - 'deleted_by')
              is distinct from
              (old.data - 'updated_at' - 'updated_by_member' - 'v' - 'deleted_at' - 'deleted_by') then
          raise exception 'Closed Weekly Review snapshots are immutable'
            using errcode = '42501';
        end if;
      elsif new.data->>'status' not in ('Draft','Closed') then
        raise exception 'Invalid Weekly Review state'
          using errcode = '22023';
      end if;
    elsif new.data->>'status' not in ('Draft','Closed') then
      raise exception 'New Weekly Reviews must begin as Draft or Closed'
        using errcode = '22023';
    end if;
    return new;
  end if;

  -- A shared review is a separate, explicitly selected projection. It may only
  -- be created/changed by the Review owner and only from that owner's Closed
  -- private source. The projection is checked again against recipient/project
  -- visibility on the server rather than trusting UI filtering.
  if new.collection = 'review_shares' then
    v_member := nullif(new.data->>'member_id','')::uuid;
    v_review_id := nullif(trim(new.data->>'review_id'),'');
    v_share_scope := new.data->>'scope';
    v_shared_sections := new.data->'shared_sections';
    v_payload := new.data->'payload';

    if v_actor is null or v_member is distinct from v_actor then
      raise exception 'Only the Review owner may publish or edit its shared projection'
        using errcode = '42501';
    end if;
    if v_review_id is null or v_share_scope not in ('workspace','members')
       or new.data->>'status' is distinct from 'Published'
       or jsonb_typeof(v_shared_sections) is distinct from 'array'
       or jsonb_typeof(v_payload) is distinct from 'object' then
      raise exception 'Shared Review projection is incomplete or invalid'
        using errcode = '22023';
    end if;
    if jsonb_array_length(v_shared_sections) = 0 then
      raise exception 'Shared Review must explicitly select at least one section'
        using errcode = '22023';
    end if;

    select review.data, review.visible_to
      into v_review_data, v_review_visible
      from public.workspace_records review
     where review.workspace_id = new.workspace_id
       and review.system_id = 'projects'
       and review.collection = 'reviews'
       and review.id = v_review_id
       and review.deleted = false
       and coalesce(review.data->>'deleted_at','') = ''
     limit 1;
    if not found
       or v_review_data->>'member_id' is distinct from v_member::text
       or v_review_data->>'status' is distinct from 'Closed'
       or v_review_visible is null
       or cardinality(v_review_visible) <> 1
       or not (v_member = any(v_review_visible)) then
      raise exception 'Shared Review must reference the owner''s Closed private Review'
        using errcode = '42501';
    end if;

    if tg_op = 'UPDATE' then
      if old.data->>'member_id' is distinct from new.data->>'member_id'
         or old.data->>'review_id' is distinct from new.data->>'review_id' then
        raise exception 'Shared Review owner and source identity are immutable'
          using errcode = '42501';
      end if;
    end if;

    if not (
      v_shared_sections ?| array[
        'metrics','wins','doneTasks','weekTasks','overdueTasks','issues','risks','decisions',
        'relatedProjects','what_worked','what_stumbled','learned','will_change','next_week_focus'
      ]
    ) then
      raise exception 'Shared Review has no recognized section'
        using errcode = '22023';
    end if;
    for v_key in select jsonb_array_elements_text(v_shared_sections)
    loop
      if v_key not in (
        'metrics','wins','doneTasks','weekTasks','overdueTasks','issues','risks','decisions',
        'relatedProjects','what_worked','what_stumbled','learned','will_change','next_week_focus'
      ) then
        raise exception 'Unknown Shared Review section: %', v_key using errcode = '22023';
      end if;
    end loop;
    for v_key in select jsonb_object_keys(v_payload)
    loop
      if v_key not in ('metrics','wins','doneTasks','weekTasks','overdueTasks','issues','risks','decisions','relatedProjects','reflections') then
        raise exception 'Unknown Shared Review payload key: %', v_key using errcode = '22023';
      end if;
      if v_key = 'reflections' then
        if jsonb_typeof(v_payload->v_key) is distinct from 'object' then
          raise exception 'Shared Review reflections must be an object' using errcode = '22023';
        end if;
        for v_reflection_key in select jsonb_object_keys(v_payload->v_key)
        loop
          if not (v_shared_sections ? v_reflection_key) then
            raise exception 'A reflection was included without explicit share consent: %', v_reflection_key using errcode = '42501';
          end if;
        end loop;
      elsif not (v_shared_sections ? v_key) then
        raise exception 'A payload section was included without explicit share consent: %', v_key using errcode = '42501';
      end if;
    end loop;

    select owner_id into v_workspace_owner
      from public.workspaces where id = new.workspace_id;
    if v_share_scope = 'workspace' then
      if new.visible_to is not null then
        raise exception 'Workspace Shared Reviews must use workspace visibility'
          using errcode = '22023';
      end if;
      select array_agg(member_id order by member_id) into v_recipients
        from (
          select v_workspace_owner as member_id
          union
          select m.user_id as member_id from public.workspace_members m
           where m.workspace_id=new.workspace_id and m.status='active'
        ) recipient_rows;
    else
      if new.visible_to is null or cardinality(new.visible_to)=0
         or not (v_member = any(new.visible_to)) then
        raise exception 'Member Shared Reviews must include their owner in visible_to'
          using errcode = '22023';
      end if;
      v_recipients := new.visible_to;
      if exists (
        select 1 from unnest(v_recipients) recipient(user_id)
         where recipient.user_id <> v_workspace_owner
           and not exists (
             select 1 from public.workspace_members m
              where m.workspace_id=new.workspace_id
                and m.user_id=recipient.user_id
                and m.status='active'
           )
      ) then
        raise exception 'Shared Review recipients must be active workspace members'
          using errcode = '42501';
      end if;
    end if;

    -- A workspace-wide aggregate must not contain any private Project facts.
    if v_payload ? 'metrics' then
      if not (v_shared_sections ? 'metrics') then
        raise exception 'Metrics were included without explicit share consent' using errcode = '42501';
      end if;
      for v_item in
        select value from jsonb_array_elements(
          case when jsonb_typeof(v_review_data->'snapshot'->'relatedProjects')='array'
            then v_review_data->'snapshot'->'relatedProjects' else '[]'::jsonb end
        )
      loop
        v_project_id := nullif(v_item->>'id','');
        if v_project_id is null then continue; end if;
        select project.data, project.visible_to into v_project_data, v_project_visible
          from public.workspace_records project
         where project.workspace_id=new.workspace_id and project.system_id='projects'
           and project.collection='projects' and project.id=v_project_id
           and project.deleted=false;
        if not found or (
          v_project_visible is not null and not (v_recipients <@ v_project_visible)
        ) or (
          coalesce(v_project_data->>'visibility','workspace')='private'
          and (v_project_visible is null or not (v_recipients <@ v_project_visible))
        ) then
          v_contains_private := true;
        end if;
      end loop;
      if v_contains_private then
        raise exception 'Shared Review metrics include data from Projects not visible to every recipient'
          using errcode = '42501';
      end if;
    end if;

    -- Verify every project reference embedded in the projection is visible to
    -- every recipient (workspace scope or selected member scope).
    for v_key in select unnest(array['wins','doneTasks','weekTasks','overdueTasks','issues','risks','decisions','relatedProjects'])
    loop
      if jsonb_typeof(v_payload->v_key) is distinct from 'array' then
        if v_payload ? v_key then
          raise exception 'Shared Review list must be an array: %', v_key using errcode = '22023';
        end if;
        continue;
      end if;
      for v_item in select value from jsonb_array_elements(v_payload->v_key)
      loop
        v_project_id := coalesce(nullif(v_item->>'project_id',''), case when v_key='relatedProjects' then nullif(v_item->>'id','') else null end);
        if v_project_id is null then continue; end if;
        select project.data, project.visible_to into v_project_data, v_project_visible
          from public.workspace_records project
         where project.workspace_id=new.workspace_id and project.system_id='projects'
           and project.collection='projects' and project.id=v_project_id
           and project.deleted=false and coalesce(project.data->>'deleted_at','')='';
        if not found then
          raise exception 'Shared Review references a missing Project: %', v_project_id using errcode = '22023';
        end if;
        if (v_project_visible is not null and not (v_recipients <@ v_project_visible))
           or (coalesce(v_project_data->>'visibility','workspace')='private'
               and (v_project_visible is null or not (v_recipients <@ v_project_visible))) then
          raise exception 'Shared Review contains a Project not visible to every recipient: %', v_project_id using errcode = '42501';
        end if;
      end loop;
    end loop;

    return new;
  end if;

  return new;
end;
$function$;

drop trigger if exists projects_guard_published_update_and_review_privacy_trg on public.workspace_records;
create trigger projects_guard_published_update_and_review_privacy_trg
before insert or update or delete on public.workspace_records
for each row execute function public.projects_guard_published_update_and_review_privacy();

revoke all on function public.projects_guard_published_update_and_review_privacy() from public,anon,authenticated;

commit;
