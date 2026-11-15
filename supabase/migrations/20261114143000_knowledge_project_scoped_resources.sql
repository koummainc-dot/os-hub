begin;

-- Project-scoped, Knowledge-owned resources for the Projects Resource Hub.
-- No new table, no content copy, and no legacy backfill.
create or replace function public.knowledge_list_project_resources(
  p_workspace_id uuid,
  p_project_id text
)
returns table(resource jsonb)
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if auth.uid() is null
     or public.ws_access_level(p_workspace_id, 'knowledge', 'main') not in ('view','edit') then
    raise exception 'Knowledge workspace access denied' using errcode = '42501';
  end if;

  if p_project_id is null
     or public.ws_access_level(p_workspace_id, 'projects', 'projects') not in ('view','edit')
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
     ) then
    raise exception 'Project not found or access denied' using errcode = '42501';
  end if;

  return query
  select
    public.knowledge_item_to_json(i, i.item_type, p_workspace_id)
    || jsonb_build_object(
      'kind', i.item_type,
      'ownerSystem', 'knowledge',
      'relatedSystem', coalesce(link.target_system, i.metadata->>'relatedSystem'),
      'relatedId', coalesce(link.target_id, i.metadata->>'relatedId'),
      'project_ref', p_project_id
    ) as resource
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
    and i.item_type in ('resource','note')
    and not i.is_archived
    and coalesce(link.target_system, i.metadata->>'relatedSystem') = 'projects'
    and coalesce(link.target_id, i.metadata->>'relatedId') = p_project_id
  order by i.updated_at desc, i.created_at desc
  limit 100;
end;
$function$;

revoke all on function public.knowledge_list_project_resources(uuid, text) from public, anon;
grant execute on function public.knowledge_list_project_resources(uuid, text) to authenticated;

commit;
