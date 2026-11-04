-- Consent is explicit, owner-scoped, and contains no record names or content.
create table if not exists public.spiritual_integration_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null,
  allow_today boolean not null default false,
  allow_calendar boolean not null default false,
  allow_notifications boolean not null default false,
  neutral_labels boolean not null default true,
  share_progress_metrics boolean not null default false,
  quiet_hours_start time,
  quiet_hours_end time,
  daily_notification_cap smallint not null default 3 check (daily_notification_cap between 0 and 20),
  updated_at timestamptz not null default now(),
  primary key (user_id, workspace_id),
  check ((quiet_hours_start is null) = (quiet_hours_end is null))
);
alter table public.spiritual_integration_preferences enable row level security;
revoke all on public.spiritual_integration_preferences from public, anon;
grant select, insert, update, delete on public.spiritual_integration_preferences to authenticated;
drop policy if exists spiritual_integration_preferences_owner_select on public.spiritual_integration_preferences;
create policy spiritual_integration_preferences_owner_select on public.spiritual_integration_preferences
 for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists spiritual_integration_preferences_owner_insert on public.spiritual_integration_preferences;
create policy spiritual_integration_preferences_owner_insert on public.spiritual_integration_preferences
 for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists spiritual_integration_preferences_owner_update on public.spiritual_integration_preferences;
create policy spiritual_integration_preferences_owner_update on public.spiritual_integration_preferences
 for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists spiritual_integration_preferences_owner_delete on public.spiritual_integration_preferences;
create policy spiritual_integration_preferences_owner_delete on public.spiritual_integration_preferences
 for delete to authenticated using (user_id = (select auth.uid()));
