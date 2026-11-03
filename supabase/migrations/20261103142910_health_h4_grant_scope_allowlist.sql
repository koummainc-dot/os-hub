-- H4: allow the new daily check-in and tracker scopes in explicit profile grants.
alter table public.health_profile_grants drop constraint if exists health_profile_grants_scope_keys_check;
alter table public.health_profile_grants add constraint health_profile_grants_scope_keys_check
 check (
  cardinality(scope_keys)>0
  and scope_keys <@ array[
   'profile','symptoms','flare_events','medications','measurements','conditions',
   'documents','reports','care_team','checkins','trackers','sensitive_trackers','all'
  ]::text[]
 );
