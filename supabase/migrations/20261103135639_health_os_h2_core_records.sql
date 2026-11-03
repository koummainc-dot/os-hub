-- Health OS H2: normalized conditions, allergies and symptom logging.
-- Access is authenticated and scoped by owner or explicit active grants.

create table if not exists public.health_conditions (
 id uuid primary key default gen_random_uuid(),
 profile_id uuid not null references public.health_profiles(id) on delete cascade,
 name text not null check(char_length(trim(name)) between 1 and 160),
 condition_type text not null default 'unknown' check(condition_type in ('chronic','acute','other','unknown')),
 status text not null default 'active' check(status in ('active','resolved')),
 diagnosed_on date, resolved_on date,
 diagnosed_by text check(diagnosed_by is null or char_length(diagnosed_by)<=160),
 notes text check(notes is null or char_length(notes)<=4000),
 created_by uuid not null references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint health_conditions_profile_id_id_key unique(profile_id,id)
);
create index if not exists health_conditions_profile_status_idx on public.health_conditions(profile_id,status,created_at desc);

create table if not exists public.health_allergies (
 id uuid primary key default gen_random_uuid(),
 profile_id uuid not null references public.health_profiles(id) on delete cascade,
 allergen text not null check(char_length(trim(allergen)) between 1 and 160),
 reaction text check(reaction is null or char_length(reaction)<=1000),
 severity text not null default 'unknown' check(severity in ('mild','moderate','severe','unknown')),
 status text not null default 'active' check(status in ('active','inactive')),
 first_observed_on date,
 notes text check(notes is null or char_length(notes)<=3000),
 created_by uuid not null references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint health_allergies_profile_id_id_key unique(profile_id,id)
);
create index if not exists health_allergies_profile_status_idx on public.health_allergies(profile_id,status,created_at desc);

create table if not exists public.health_symptom_definitions (
 id uuid primary key default gen_random_uuid(),
 profile_id uuid not null references public.health_profiles(id) on delete cascade,
 name text not null check(char_length(trim(name)) between 1 and 120),
 category text check(category is null or char_length(category)<=80),
 is_active boolean not null default true,
 created_by uuid not null references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint health_symptom_definitions_profile_id_id_key unique(profile_id,id)
);
create unique index if not exists health_symptom_definitions_profile_name_lower_uidx on public.health_symptom_definitions(profile_id,lower(name));
create index if not exists health_symptom_definitions_profile_active_idx on public.health_symptom_definitions(profile_id,is_active,name);

create table if not exists public.health_symptom_logs (
 id uuid primary key default gen_random_uuid(),
 profile_id uuid not null references public.health_profiles(id) on delete cascade,
 symptom_definition_id uuid references public.health_symptom_definitions(id) on delete set null,
 symptom_name_snapshot text not null check(char_length(trim(symptom_name_snapshot)) between 1 and 120),
 severity smallint not null check(severity between 1 and 10),
 recorded_at timestamptz not null default now(),
 duration_minutes integer check(duration_minutes is null or duration_minutes between 1 and 10080),
 body_location text check(body_location is null or char_length(body_location)<=120),
 notes text check(notes is null or char_length(notes)<=3000),
 source text not null default 'manual' check(source in ('manual','imported','device','other')),
 created_by uuid not null references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint health_symptom_logs_profile_id_id_key unique(profile_id,id)
);
create index if not exists health_symptom_logs_profile_recorded_idx on public.health_symptom_logs(profile_id,recorded_at desc);
create index if not exists health_symptom_logs_profile_symptom_recorded_idx on public.health_symptom_logs(profile_id,symptom_name_snapshot,recorded_at desc);

alter table public.health_conditions enable row level security;
alter table public.health_allergies enable row level security;
alter table public.health_symptom_definitions enable row level security;
alter table public.health_symptom_logs enable row level security;
revoke all on table public.health_conditions,public.health_allergies,public.health_symptom_definitions,public.health_symptom_logs from anon,public;
grant select,insert,update,delete on table public.health_conditions,public.health_allergies,public.health_symptom_definitions,public.health_symptom_logs to authenticated;

create or replace function public.health_has_access(p_profile_id uuid,p_scope text,p_action text)
returns boolean language sql stable security invoker set search_path=public as $$
 select exists(select 1 from public.health_profiles hp where hp.id=p_profile_id and (
  hp.owner_user_id=(select auth.uid()) or exists(select 1 from public.health_profile_grants g where g.profile_id=hp.id and g.grantee_user_id=(select auth.uid()) and g.revoked_at is null and g.starts_at<=now() and (g.expires_at is null or g.expires_at>now()) and g.actions @> array[p_action]::text[] and (g.scope_keys @> array[p_scope]::text[] or g.scope_keys @> array['all']::text[])
 ));
$$;
revoke all on function public.health_has_access(uuid,text,text) from public,anon;
grant execute on function public.health_has_access(uuid,text,text) to authenticated;

do $$
declare tbl text; scp text;
begin
 foreach tbl in array array['health_conditions','health_allergies'] loop
  scp:='conditions';
  execute format('drop policy if exists %I on public.%I','h2_'||tbl||'_select',tbl);
  execute format('create policy %I on public.%I for select to authenticated using (public.health_has_access(profile_id,%L,''read''))','h2_'||tbl||'_select',tbl,scp);
  execute format('drop policy if exists %I on public.%I','h2_'||tbl||'_insert',tbl);
  execute format('create policy %I on public.%I for insert to authenticated with check (created_by=(select auth.uid()) and public.health_has_access(profile_id,%L,''create''))','h2_'||tbl||'_insert',tbl,scp);
  execute format('drop policy if exists %I on public.%I','h2_'||tbl||'_update',tbl);
  execute format('create policy %I on public.%I for update to authenticated using (public.health_has_access(profile_id,%L,''update'')) with check (public.health_has_access(profile_id,%L,''update''))','h2_'||tbl||'_update',tbl,scp,scp);
  execute format('drop policy if exists %I on public.%I','h2_'||tbl||'_delete',tbl);
  execute format('create policy %I on public.%I for delete to authenticated using (public.health_has_access(profile_id,%L,''delete''))','h2_'||tbl||'_delete',tbl,scp);
 end loop;
 foreach tbl in array array['health_symptom_definitions','health_symptom_logs'] loop
  scp:='symptoms';
  execute format('drop policy if exists %I on public.%I','h2_'||tbl||'_select',tbl);
  execute format('create policy %I on public.%I for select to authenticated using (public.health_has_access(profile_id,%L,''read''))','h2_'||tbl||'_select',tbl,scp);
  execute format('drop policy if exists %I on public.%I','h2_'||tbl||'_insert',tbl);
  execute format('create policy %I on public.%I for insert to authenticated with check (created_by=(select auth.uid()) and public.health_has_access(profile_id,%L,''create''))','h2_'||tbl||'_insert',tbl,scp);
  execute format('drop policy if exists %I on public.%I','h2_'||tbl||'_update',tbl);
  execute format('create policy %I on public.%I for update to authenticated using (public.health_has_access(profile_id,%L,''update'')) with check (public.health_has_access(profile_id,%L,''update''))','h2_'||tbl||'_update',tbl,scp,scp);
  execute format('drop policy if exists %I on public.%I','h2_'||tbl||'_delete',tbl);
  execute format('create policy %I on public.%I for delete to authenticated using (public.health_has_access(profile_id,%L,''delete''))','h2_'||tbl||'_delete',tbl,scp);
 end loop;
end $$;

drop policy if exists h2_health_symptom_logs_insert on public.health_symptom_logs;
create policy h2_health_symptom_logs_insert on public.health_symptom_logs for insert to authenticated with check (
 created_by=(select auth.uid()) and public.health_has_access(profile_id,'symptoms','create')
 and (symptom_definition_id is null or exists(select 1 from public.health_symptom_definitions d where d.id=symptom_definition_id and d.profile_id=health_symptom_logs.profile_id))
);
drop policy if exists h2_health_symptom_logs_update on public.health_symptom_logs;
create policy h2_health_symptom_logs_update on public.health_symptom_logs for update to authenticated using (public.health_has_access(profile_id,'symptoms','update')) with check (
 public.health_has_access(profile_id,'symptoms','update')
 and (symptom_definition_id is null or exists(select 1 from public.health_symptom_definitions d where d.id=symptom_definition_id and d.profile_id=health_symptom_logs.profile_id))
);

alter table public.health_audit_events drop constraint if exists health_audit_events_action_check;
alter table public.health_audit_events add constraint health_audit_events_action_check check(action in (
 'profile_created','profile_updated','grant_created','grant_updated','grant_revoked','document_uploaded','document_deleted','export_requested','export_completed',
 'condition_created','condition_updated','condition_deleted','allergy_created','allergy_updated','allergy_deleted',
 'symptom_definition_created','symptom_definition_updated','symptom_definition_deleted','symptom_log_created','symptom_log_updated','symptom_log_deleted'
));
drop policy if exists health_audit_events_insert_authorized_actor on public.health_audit_events;
create policy health_audit_events_insert_authorized_actor on public.health_audit_events for insert to authenticated with check (
 actor_user_id=(select auth.uid()) and (
  exists(select 1 from public.health_profiles hp where hp.id=health_audit_events.profile_id and hp.owner_user_id=(select auth.uid()))
  or public.health_has_access(profile_id,
   case when resource_type in ('condition','allergy') then 'conditions' when resource_type in ('symptom_definition','symptom_log') then 'symptoms' else 'profile' end,
   case when action like '%_created' then 'create' when action like '%_deleted' then 'delete' else 'update' end)
 )
);
