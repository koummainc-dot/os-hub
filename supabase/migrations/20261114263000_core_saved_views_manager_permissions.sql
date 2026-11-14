begin;

create or replace function public.core_saved_views_can_manage(
  p_workspace_id uuid,
  p_user_id uuid,
  p_system_id text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select
    exists (
      select 1
        from public.workspaces w
       where w.id = p_workspace_id
         and w.owner_id = p_user_id
    )
    or exists (
      select 1
        from public.workspace_members m
       where m.workspace_id = p_workspace_id
         and m.user_id = p_user_id
         and m.status = 'active'
         and coalesce(m.access->'systems'->p_system_id->>'manage','false') = 'true'
         and m.access->'systems'->p_system_id->>'level' in ('view','edit')
    );
$function$;

create or replace function public.core_saved_views_guard_identity()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  if new.workspace_id is distinct from old.workspace_id
     or new.system_id is distinct from old.system_id
     or new.owner_id is distinct from old.owner_id
     or new.created_at is distinct from old.created_at then
    raise exception 'Saved View identity is immutable' using errcode = '42501';
  end if;
  return new;
end;
$function$;

drop trigger if exists core_saved_views_guard_identity_trg on public.core_saved_views;
create trigger core_saved_views_guard_identity_trg
before update on public.core_saved_views
for each row execute function public.core_saved_views_guard_identity();

drop policy if exists core_saved_views_insert on public.core_saved_views;
create policy core_saved_views_insert
on public.core_saved_views
for insert
to authenticated
with check (
  owner_id = auth.uid()
  and public.ws_access_level(workspace_id, system_id, 'projects') in ('view','edit')
  and (
    scope = 'personal'
    or public.core_saved_views_can_manage(workspace_id, auth.uid(), system_id)
  )
);

drop policy if exists core_saved_views_update on public.core_saved_views;
create policy core_saved_views_update
on public.core_saved_views
for update
to authenticated
using (
  (
    scope = 'personal'
    and owner_id = auth.uid()
    and public.ws_access_level(workspace_id, system_id, 'projects') in ('view','edit')
  )
  or (
    scope = 'workspace'
    and public.core_saved_views_can_manage(workspace_id, auth.uid(), system_id)
    and public.ws_access_level(workspace_id, system_id, 'projects') in ('view','edit')
  )
)
with check (
  (
    scope = 'personal'
    and owner_id = auth.uid()
    and public.ws_access_level(workspace_id, system_id, 'projects') in ('view','edit')
  )
  or (
    scope = 'workspace'
    and public.core_saved_views_can_manage(workspace_id, auth.uid(), system_id)
    and public.ws_access_level(workspace_id, system_id, 'projects') in ('view','edit')
  )
);

drop policy if exists core_saved_views_delete on public.core_saved_views;
create policy core_saved_views_delete
on public.core_saved_views
for delete
to authenticated
using (
  (
    scope = 'personal'
    and owner_id = auth.uid()
    and public.ws_access_level(workspace_id, system_id, 'projects') in ('view','edit')
  )
  or (
    scope = 'workspace'
    and public.core_saved_views_can_manage(workspace_id, auth.uid(), system_id)
    and public.ws_access_level(workspace_id, system_id, 'projects') in ('view','edit')
  )
);

revoke all on function public.core_saved_views_can_manage(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.core_saved_views_guard_identity() from public,anon,authenticated;

commit;
