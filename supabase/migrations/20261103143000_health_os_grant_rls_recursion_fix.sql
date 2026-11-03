-- H1/H4 security fix: remove recursive RLS evaluation from grant mutations.
create schema if not exists health_private;
revoke all on schema health_private from public,anon,authenticated;
grant usage on schema health_private to authenticated;
create or replace function health_private.is_profile_owner(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
 select (select auth.uid()) is not null and exists(
   select 1 from public.health_profiles hp
   where hp.id=p_profile_id and hp.owner_user_id=(select auth.uid())
 );
$$;
revoke all on function health_private.is_profile_owner(uuid) from public,anon;
grant execute on function health_private.is_profile_owner(uuid) to authenticated;

drop policy if exists health_profile_grants_insert_owner_only on public.health_profile_grants;
create policy health_profile_grants_insert_owner_only on public.health_profile_grants
 for insert to authenticated
 with check (granted_by=(select auth.uid()) and health_private.is_profile_owner(profile_id));

drop policy if exists health_profile_grants_update_owner_only on public.health_profile_grants;
create policy health_profile_grants_update_owner_only on public.health_profile_grants
 for update to authenticated
 using (granted_by=(select auth.uid()) and health_private.is_profile_owner(profile_id))
 with check (granted_by=(select auth.uid()) and health_private.is_profile_owner(profile_id));
