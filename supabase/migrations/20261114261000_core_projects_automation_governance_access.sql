begin;

-- Governance is presented as one navigation section in Projects. Match the
-- same collection-to-section mapping used by ws_access_level and RLS.
create or replace function public.core_projects_member_has_section(
  p_workspace_id uuid,
  p_user_id uuid,
  p_section text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select
    exists (
      select 1 from public.workspaces w
       where w.id = p_workspace_id and w.owner_id = p_user_id
    )
    or exists (
      select 1
        from public.workspace_members m
       where m.workspace_id = p_workspace_id
         and m.user_id = p_user_id
         and m.status = 'active'
         and m.access->'systems'->'projects'->>'level' in ('view','edit')
         and coalesce(
           m.access->'systems'->'projects'->'sections'->>
             case when p_section in ('issues','decisions') then 'risks' else p_section end,
           'view'
         ) <> 'none'
    );
$function$;

revoke all on function public.core_projects_member_has_section(uuid,uuid,text) from public,anon,authenticated;

commit;
