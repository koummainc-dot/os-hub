begin;

-- Normalized owner-scoped P2 practice logs. This is additive; the legacy
-- spiritual_private_records collection remains readable during migration.
create table if not exists public.spiritual_practice_logs (
 user_id uuid not null references auth.users(id) on delete cascade,
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 id text not null,
 practice_id text not null,
 log_date date not null,
 slot_key text not null default '_' check (length(slot_key) between 1 and 80),
 status text not null check (status in ('Done','Partial','Excused')),
 actual numeric null check (actual is null or actual >= 0),
 duration_min integer null check (duration_min is null or duration_min between 0 and 1440),
 note_enc bytea null,
 private_reflection_enc bytea null,
 source text not null default 'Manual' check (source in ('Manual','Quick','Import','Proposal')),
 client_op_id text not null check (length(client_op_id) between 1 and 100),
 logged_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key (user_id,id),
 unique (user_id,practice_id,log_date,slot_key),
 unique (user_id,client_op_id)
);

create index if not exists spiritual_practice_logs_owner_date_idx
 on public.spiritual_practice_logs(user_id,workspace_id,log_date desc,practice_id);

alter table public.spiritual_practice_logs enable row level security;
revoke all on public.spiritual_practice_logs from public, anon;
grant select,insert,update,delete on public.spiritual_practice_logs to authenticated;

drop policy if exists spiritual_practice_logs_select_own on public.spiritual_practice_logs;
create policy spiritual_practice_logs_select_own
 on public.spiritual_practice_logs for select to authenticated
 using (user_id=(select auth.uid()));
drop policy if exists spiritual_practice_logs_insert_own on public.spiritual_practice_logs;
create policy spiritual_practice_logs_insert_own
 on public.spiritual_practice_logs for insert to authenticated
 with check (
  user_id=(select auth.uid())
  and exists (
   select 1 from public.spiritual_private_records p
   where p.user_id=(select auth.uid())
    and p.workspace_id=spiritual_practice_logs.workspace_id
    and p.id=spiritual_practice_logs.practice_id
    and p.collection='practices' and p.deleted=false
  )
 );
drop policy if exists spiritual_practice_logs_update_own on public.spiritual_practice_logs;
create policy spiritual_practice_logs_update_own
 on public.spiritual_practice_logs for update to authenticated
 using (user_id=(select auth.uid()))
 with check (
  user_id=(select auth.uid())
  and exists (
   select 1 from public.spiritual_private_records p
   where p.user_id=(select auth.uid())
    and p.workspace_id=spiritual_practice_logs.workspace_id
    and p.id=spiritual_practice_logs.practice_id
    and p.collection='practices' and p.deleted=false
  )
 );
drop policy if exists spiritual_practice_logs_delete_own on public.spiritual_practice_logs;
create policy spiritual_practice_logs_delete_own
 on public.spiritual_practice_logs for delete to authenticated
 using (user_id=(select auth.uid()));

commit;
