-- Knowledge owns meeting records. Projects consumes them through a server-scoped read
-- and never copies the Knowledge item or its follow-ups into a Projects collection.
--
-- Canonical external project reference:
--   knowledge_external_links(workspace_id, item_id, target_system='projects',
--                             target_id=<workspace_records project id>,
--                             relation_type='related')
-- metadata.relatedSystem/relatedId remains a read-compatibility fallback only.
-- No new table and no legacy backfill are required; current production Knowledge item
-- inventory is empty. The trigger canonicalizes links on the next Knowledge item save.

begin;

create or replace function public.knowledge_sync_external_links()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_target_system text := nullif(trim(new.metadata->>'relatedSystem'), '');
  v_target_id text := nullif(trim(new.metadata->>'relatedId'), '');
begin
  if (v_target_system is null) <> (v_target_id is null) then
    raise exception 'External link requires both target system and target ID'
      using errcode = '22023';
  end if;

  if v_target_system = 'projects' then
    if auth.uid() is null
       or public.ws_access_level(new.workspace_id, 'projects', 'projects') not in ('view','edit')
       or not exists (
         select 1
           from public.workspace_records p
          where p.workspace_id = new.workspace_id
            and p.system_id = 'projects'
            and p.collection = 'projects'
            and p.id = v_target_id
            and p.deleted = false
            and p.data->>'deleted_at' is null
            and (p.visible_to is null or auth.uid() = any(p.visible_to))
       ) then
      raise exception 'The selected project does not exist or is not visible to this member'
        using errcode = '42501';
    end if;
  end if;

  -- The current Knowledge editor exposes one primary external relation per item.
  -- Keep other relation types intact for future Knowledge-owned integrations.
  delete from public.knowledge_external_links l
   where l.workspace_id = new.workspace_id
     and l.item_id = new.id
     and l.relation_type = 'related'
     and (
       v_target_system is null
       or l.target_system is distinct from v_target_system
       or l.target_id is distinct from v_target_id
     );

  if v_target_system is not null then
    insert into public.knowledge_external_links
      (workspace_id, item_id, target_system, target_id, relation_type, created_by)
    values
      (new.workspace_id, new.id, v_target_system, v_target_id, 'related', auth.uid())
    on conflict (workspace_id, item_id, target_system, target_id, relation_type)
    do update set label = excluded.label;
  end if;

  return new;
end;
$function$;

drop trigger if exists knowledge_items_sync_external_links_trg on public.knowledge_items;
create trigger knowledge_items_sync_external_links_trg
after insert or update of metadata on public.knowledge_items
for each row execute function public.knowledge_sync_external_links();

revoke all on function public.knowledge_sync_external_links() from public, anon, authenticated;

-- The table can also be written directly through PostgREST. Apply the same
-- Projects visibility rule in RLS so callers cannot bypass the item trigger.
drop policy if exists knowledge_external_links_insert on public.knowledge_external_links;
create policy knowledge_external_links_insert on public.knowledge_external_links
for insert to authenticated
with check (
  public.ws_access_level(workspace_id, 'knowledge', 'main') = 'edit'
  and (
    target_system <> 'projects'
    or (
      public.ws_access_level(workspace_id, 'projects', 'projects') in ('view','edit')
      and exists (
        select 1
          from public.workspace_records p
         where p.workspace_id = knowledge_external_links.workspace_id
           and p.system_id = 'projects'
           and p.collection = 'projects'
           and p.id = knowledge_external_links.target_id
           and p.deleted = false
           and p.data->>'deleted_at' is null
           and (p.visible_to is null or auth.uid() = any(p.visible_to))
      )
    )
  )
);

drop policy if exists knowledge_external_links_update on public.knowledge_external_links;
create policy knowledge_external_links_update on public.knowledge_external_links
for update to authenticated
using (public.ws_access_level(workspace_id, 'knowledge', 'main') = 'edit')
with check (
  public.ws_access_level(workspace_id, 'knowledge', 'main') = 'edit'
  and (
    target_system <> 'projects'
    or (
      public.ws_access_level(workspace_id, 'projects', 'projects') in ('view','edit')
      and exists (
        select 1
          from public.workspace_records p
         where p.workspace_id = knowledge_external_links.workspace_id
           and p.system_id = 'projects'
           and p.collection = 'projects'
           and p.id = knowledge_external_links.target_id
           and p.deleted = false
           and p.data->>'deleted_at' is null
           and (p.visible_to is null or auth.uid() = any(p.visible_to))
      )
    )
  )
);

create or replace function public.knowledge_list_project_meetings(
  p_workspace_id uuid,
  p_project_id text default null
)
returns table(meeting jsonb)
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if auth.uid() is null
     or public.ws_access_level(p_workspace_id, 'knowledge', 'main') not in ('view','edit') then
    raise exception 'Knowledge workspace access denied' using errcode = '42501';
  end if;

  -- A project-specific read must prove Projects visibility on the server. The
  -- workspace_records RLS/visible_to boundary remains authoritative for the target.
  if p_project_id is not null and (
    public.ws_access_level(p_workspace_id, 'projects', 'projects') not in ('view','edit')
    or not exists (
      select 1
        from public.workspace_records p
       where p.workspace_id = p_workspace_id
         and p.system_id = 'projects'
         and p.collection = 'projects'
         and p.id = p_project_id
         and p.deleted = false
         and p.data->>'deleted_at' is null
         and (p.visible_to is null or auth.uid() = any(p.visible_to))
    )
  ) then
    raise exception 'Project not found or access denied' using errcode = '42501';
  end if;

  return query
  select
    public.knowledge_item_to_json(i, 'meeting', p_workspace_id)
    || jsonb_build_object(
      'relatedSystem', coalesce(link.target_system, i.metadata->>'relatedSystem'),
      'relatedId', coalesce(link.target_id, i.metadata->>'relatedId'),
      'project_ref', case
        when coalesce(link.target_system, i.metadata->>'relatedSystem') = 'projects'
        then coalesce(link.target_id, i.metadata->>'relatedId')
        else null
      end
    ) as meeting
  from public.knowledge_items i
  left join lateral (
    select l.target_system, l.target_id
      from public.knowledge_external_links l
     where l.workspace_id = i.workspace_id
       and l.item_id = i.id
       and l.relation_type = 'related'
     order by l.created_at desc, l.id
     limit 1
  ) link on true
  where i.workspace_id = p_workspace_id
    and i.item_type = 'meeting'
    and (
      p_project_id is null
      or (
        coalesce(link.target_system, i.metadata->>'relatedSystem') = 'projects'
        and coalesce(link.target_id, i.metadata->>'relatedId') = p_project_id
      )
    )
  order by i.item_date desc nulls last, i.created_at desc;
end;
$function$;

revoke all on function public.knowledge_list_project_meetings(uuid, text) from public, anon;
grant execute on function public.knowledge_list_project_meetings(uuid, text) to authenticated;

commit;
