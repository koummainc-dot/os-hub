-- ⚠️ قديم: خاص بنموذج الصف الواحد (content_os_data). لا تشغّله بعد ترحيل المنصة — يعيد فتح الجدول القديم لأي مستخدم مسجّل.
-- ContentOS / Supabase RLS repair
-- Run this once in Supabase -> SQL Editor.
-- This protects the single shared ContentOS row from anonymous access while
-- allowing signed-in team members to read/write it.

begin;

alter table public.content_os_data enable row level security;

grant select, insert, update on table public.content_os_data to authenticated;

drop policy if exists "authenticated read" on public.content_os_data;
drop policy if exists "authenticated insert" on public.content_os_data;
drop policy if exists "authenticated update" on public.content_os_data;

create policy "authenticated read"
on public.content_os_data
for select
to authenticated
using (auth.uid() is not null);

create policy "authenticated insert"
on public.content_os_data
for insert
to authenticated
with check (auth.uid() is not null);

create policy "authenticated update"
on public.content_os_data
for update
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

commit;

-- IMPORTANT:
-- Do NOT create a SELECT policy for anon. The content_os_data row contains
-- your whole ContentOS workspace/team data and must not be publicly readable.
--
-- Also make sure Authentication -> Providers -> Email is enabled.
-- For the current "admin creates teammate account" flow, either disable
-- "Confirm email" or implement email confirmation before telling the member
-- that they can log in.
