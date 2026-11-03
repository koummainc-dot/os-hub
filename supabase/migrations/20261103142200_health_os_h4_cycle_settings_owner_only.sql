-- H4 privacy hardening: keep cycle-tracking enablement in an owner-only relation, not on shareable profile rows.
create table if not exists public.health_cycle_settings (
 profile_id uuid primary key references public.health_profiles(id) on delete cascade,
 enabled boolean not null default false,
 created_by uuid not null references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.health_cycle_settings enable row level security;
revoke all on table public.health_cycle_settings from anon,public;
grant select,insert,update on table public.health_cycle_settings to authenticated;
drop policy if exists h4_cycle_settings_select_owner on public.health_cycle_settings;
create policy h4_cycle_settings_select_owner on public.health_cycle_settings for select to authenticated using (
 exists(select 1 from public.health_profiles hp where hp.id=health_cycle_settings.profile_id and hp.owner_user_id=(select auth.uid()))
);
drop policy if exists h4_cycle_settings_insert_owner on public.health_cycle_settings;
create policy h4_cycle_settings_insert_owner on public.health_cycle_settings for insert to authenticated with check (
 created_by=(select auth.uid()) and exists(select 1 from public.health_profiles hp where hp.id=health_cycle_settings.profile_id and hp.owner_user_id=(select auth.uid()))
);
drop policy if exists h4_cycle_settings_update_owner on public.health_cycle_settings;
create policy h4_cycle_settings_update_owner on public.health_cycle_settings for update to authenticated using (
 exists(select 1 from public.health_profiles hp where hp.id=health_cycle_settings.profile_id and hp.owner_user_id=(select auth.uid()))
) with check (
 exists(select 1 from public.health_profiles hp where hp.id=health_cycle_settings.profile_id and hp.owner_user_id=(select auth.uid()))
);
drop policy if exists h4_cycle_entries_select on public.health_cycle_entries;
create policy h4_cycle_entries_select on public.health_cycle_entries for select to authenticated using (
 exists(select 1 from public.health_profiles hp join public.health_cycle_settings cs on cs.profile_id=hp.id
   where hp.id=health_cycle_entries.profile_id and hp.owner_user_id=(select auth.uid()) and cs.enabled)
);
drop policy if exists h4_cycle_entries_insert on public.health_cycle_entries;
create policy h4_cycle_entries_insert on public.health_cycle_entries for insert to authenticated with check (
 created_by=(select auth.uid()) and exists(select 1 from public.health_profiles hp join public.health_cycle_settings cs on cs.profile_id=hp.id
   where hp.id=health_cycle_entries.profile_id and hp.owner_user_id=(select auth.uid()) and cs.enabled)
);
drop policy if exists h4_cycle_entries_update on public.health_cycle_entries;
create policy h4_cycle_entries_update on public.health_cycle_entries for update to authenticated using (
 exists(select 1 from public.health_profiles hp join public.health_cycle_settings cs on cs.profile_id=hp.id
   where hp.id=health_cycle_entries.profile_id and hp.owner_user_id=(select auth.uid()) and cs.enabled)
) with check (
 exists(select 1 from public.health_profiles hp join public.health_cycle_settings cs on cs.profile_id=hp.id
   where hp.id=health_cycle_entries.profile_id and hp.owner_user_id=(select auth.uid()) and cs.enabled)
);
drop policy if exists h4_cycle_entries_delete on public.health_cycle_entries;
create policy h4_cycle_entries_delete on public.health_cycle_entries for delete to authenticated using (
 exists(select 1 from public.health_profiles hp join public.health_cycle_settings cs on cs.profile_id=hp.id
   where hp.id=health_cycle_entries.profile_id and hp.owner_user_id=(select auth.uid()) and cs.enabled)
);
alter table public.health_profiles drop column if exists cycle_tracking_enabled;
