begin;

-- Client-side envelope encryption: only a passphrase-wrapped DEK is stored.
-- The unwrapped AES key is created/unlocked in the browser and never sent to Postgres.
create table if not exists public.spiritual_user_keyrings (
 user_id uuid primary key references auth.users(id) on delete cascade,
 version integer not null check (version=1),
 kdf text not null check (kdf='PBKDF2-SHA-256'),
 iterations integer not null check (iterations between 100000 and 2000000),
 salt text not null check (length(salt) between 20 and 128),
 wrap_iv text not null check (length(wrap_iv) between 12 and 64),
 wrapped_key text not null check (length(wrapped_key) between 40 and 256),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.spiritual_user_keyrings enable row level security;
revoke all on public.spiritual_user_keyrings from public, anon;
grant select,insert,update,delete on public.spiritual_user_keyrings to authenticated;
drop policy if exists spiritual_user_keyrings_select_own on public.spiritual_user_keyrings;
create policy spiritual_user_keyrings_select_own on public.spiritual_user_keyrings
 for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists spiritual_user_keyrings_insert_own on public.spiritual_user_keyrings;
create policy spiritual_user_keyrings_insert_own on public.spiritual_user_keyrings
 for insert to authenticated with check(user_id=(select auth.uid()));
drop policy if exists spiritual_user_keyrings_update_own on public.spiritual_user_keyrings;
create policy spiritual_user_keyrings_update_own on public.spiritual_user_keyrings
 for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop policy if exists spiritual_user_keyrings_delete_own on public.spiritual_user_keyrings;
create policy spiritual_user_keyrings_delete_own on public.spiritual_user_keyrings
 for delete to authenticated using(user_id=(select auth.uid()));

-- New encrypted envelope is JSON metadata only; encrypted payload is opaque AES-GCM ciphertext.
-- Existing legacy data remains untouched until the client can decrypt and migrate it safely.
alter table public.spiritual_private_records
 add column if not exists encrypted_data jsonb null,
 add column if not exists encryption_version integer null check (encryption_version is null or encryption_version=1);
create index if not exists spiritual_private_records_encrypted_owner_idx
 on public.spiritual_private_records(user_id,workspace_id,collection,updated_at desc)
 where deleted=false and encrypted_data is not null;

commit;
