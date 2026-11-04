-- ═══════════════════════════════════════════════════════════════════════════
-- OS PLATFORM — Supabase schema v1 (Phase 0: Core)
-- شغّله مرة واحدة في: Supabase → SQL Editor → New query → Run
-- آمن لإعادة التشغيل (idempotent).
--
-- النموذج:
--   • كل شخص يفتح حساب ← تتكوّن له "مساحة" workspace خاصة به تلقائياً.
--   • صاحب المساحة يدعو أشخاصاً بالإيميل، ويحدد لكل نظام: بدون / عرض / تعديل
--     (+ صلاحية إدارة النظام + إخفاء/تقييد أقسام معينة).
--   • المدعو يرى الدعوة داخل التطبيق ويقبلها أو يرفضها.
--   • بيانات كل نظام تُحفظ في workspace_data (أو workspace_records للأنظمة كبيرة الحجم)
--     والـ RLS يطبّق الصلاحية على مستوى النظام (view/edit) في السيرفر.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ───────────────────────── 1) الجداول ─────────────────────────

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  name        text,
  color       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.workspaces (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  owner_name  text,
  name        text not null default 'مساحتي',
  created_at  timestamptz not null default now()
);
create index if not exists workspaces_owner_idx on public.workspaces(owner_id);

-- access = { "systems": { "<system_id>": { "level":"view|edit", "manage":bool,
--                                           "sections": { "<section_id>":"none|view|edit" } } } }
create table if not exists public.workspace_members (
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  email         text,
  display_name  text,
  access        jsonb not null default '{}'::jsonb,
  status        text not null default 'active' check (status in ('active','suspended')),
  joined_at     timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index if not exists workspace_members_user_idx on public.workspace_members(user_id);

create table if not exists public.invitations (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  invited_email   text not null check (invited_email = lower(invited_email)),
  invited_by      uuid not null references auth.users(id) on delete cascade,
  inviter_name    text,
  workspace_name  text,
  message         text,
  access          jsonb not null default '{}'::jsonb,
  status          text not null default 'pending'
                  check (status in ('pending','accepted','declined','revoked')),
  created_at      timestamptz not null default now(),
  responded_at    timestamptz,
  expires_at      timestamptz not null default (now() + interval '30 days')
);
create index if not exists invitations_email_idx on public.invitations(invited_email) where status = 'pending';
create index if not exists invitations_ws_idx on public.invitations(workspace_id);
create unique index if not exists invitations_pending_uq
  on public.invitations(workspace_id, invited_email) where status = 'pending';

-- بيانات نظام كامل في صف واحد (ContentOS وأي نظام صغير/متوسط الحجم).
-- part = 'main' افتراضياً. الأنظمة الحساسة تقسّم بياناتها لـ parts مختلفة
-- (مثلاً finance:'ledger') فيستطيع الـ RLS إخفاء جزء بعينه على مستوى السيرفر.
create table if not exists public.workspace_data (
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  system_id     text not null,
  part          text not null default 'main',
  data          jsonb not null default '{}'::jsonb,
  updated_at    timestamptz not null default now(),
  updated_by    uuid references auth.users(id) on delete set null,
  primary key (workspace_id, system_id, part)
);

-- سجلات كبيرة الحجم (حركات مالية، سجل الأكل، جلسات تمرين…) صف لكل سجل.
create table if not exists public.workspace_records (
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  system_id     text not null,
  collection    text not null,
  id            text not null,
  data          jsonb not null default '{}'::jsonb,
  deleted       boolean not null default false,
  updated_at    timestamptz not null default now(),
  updated_by    uuid references auth.users(id) on delete set null,
  primary key (workspace_id, system_id, collection, id)
);
create index if not exists workspace_records_coll_idx
  on public.workspace_records(workspace_id, system_id, collection, updated_at desc);

-- ───────────────────────── 2) دوال مساعدة (security definer) ─────────────────────────

create or replace function public.current_email()
returns text language sql stable security definer set search_path = public as $$
  select lower(email) from auth.users where id = auth.uid()
$$;

-- الإيميل المؤكَّد فقط (يمنع انتحال إيميل شخص آخر لاستلام دعواته)
create or replace function public.my_verified_email()
returns text language sql stable security definer set search_path = public as $$
  select lower(email) from auth.users where id = auth.uid() and email_confirmed_at is not null
$$;

create or replace function public.is_ws_owner(ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.workspaces w where w.id = ws and w.owner_id = auth.uid())
$$;

create or replace function public.is_ws_member(ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.workspace_members m
                 where m.workspace_id = ws and m.user_id = auth.uid() and m.status = 'active')
$$;

-- مستوى الوصول الفعلي لنظام/جزء داخل مساحة: 'none' | 'view' | 'edit'
create or replace function public.ws_access_level(ws uuid, sys text, part text default 'main')
returns text language plpgsql stable security definer set search_path = public as $$
declare a jsonb; lvl text; sec text;
begin
  if auth.uid() is null then return 'none'; end if;
  if exists (select 1 from public.workspaces w where w.id = ws and w.owner_id = auth.uid()) then
    return 'edit';
  end if;
  select m.access into a from public.workspace_members m
   where m.workspace_id = ws and m.user_id = auth.uid() and m.status = 'active';
  if a is null then return 'none'; end if;
  lvl := coalesce(a->'systems'->sys->>'level', 'none');
  if lvl not in ('view','edit') then return 'none'; end if;
  sec := a->'systems'->sys->'sections'->>part;
  -- القسم يقدر يقيّد فقط، لا يرفع فوق مستوى النظام
  if sec = 'none' then return 'none'; end if;
  if sec = 'view' and lvl = 'edit' then return 'view'; end if;
  return lvl;
end $$;

-- ───────────────────────── 3) RPCs ─────────────────────────

-- يُستدعى بعد كل تسجيل دخول: ينشئ المساحة الشخصية والبروفايل إن لم يوجدا،
-- ويزامن الاسم/الإيميل. يرجع id المساحة الشخصية.
create or replace function public.ensure_my_workspace()
returns uuid language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); ws uuid; em text; nm text; palette text[] :=
  array['#EF9F27','#E8455A','#3B82F6','#10B981','#F97316','#06B6D4','#EC4899','#14B8A6','#A78BFA'];
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select lower(u.email), coalesce(nullif(u.raw_user_meta_data->>'name',''), split_part(u.email,'@',1))
    into em, nm from auth.users u where u.id = uid;

  insert into public.profiles(id, email, name, color)
  values (uid, em, nm, palette[1 + (abs(hashtext(uid::text)) % array_length(palette,1))])
  on conflict (id) do update set email = excluded.email, updated_at = now();

  select id into ws from public.workspaces where owner_id = uid order by created_at limit 1;
  if ws is null then
    insert into public.workspaces(owner_id, owner_name, name) values (uid, nm, 'مساحتي') returning id into ws;
  end if;

  update public.workspaces set owner_name = (select p.name from public.profiles p where p.id = uid)
   where owner_id = uid;
  update public.workspace_members m set email = em,
         display_name = (select p.name from public.profiles p where p.id = uid)
   where m.user_id = uid;
  return ws;
end $$;

create or replace function public.accept_invitation(inv uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare i public.invitations%rowtype; em text; nm text;
begin
  em := public.my_verified_email();
  if em is null then raise exception 'EMAIL_NOT_VERIFIED'; end if;
  select * into i from public.invitations
   where id = inv and status = 'pending' and invited_email = em and expires_at > now() for update;
  if not found then raise exception 'INVITATION_NOT_FOUND'; end if;
  if public.is_ws_owner(i.workspace_id) then raise exception 'OWNER_CANNOT_JOIN_OWN_WORKSPACE'; end if;
  select p.name into nm from public.profiles p where p.id = auth.uid();
  insert into public.workspace_members(workspace_id, user_id, email, display_name, access)
  values (i.workspace_id, auth.uid(), em, coalesce(nm, split_part(em,'@',1)), i.access)
  on conflict (workspace_id, user_id)
  do update set access = excluded.access, status = 'active', email = excluded.email;
  update public.invitations set status = 'accepted', responded_at = now() where id = inv;
  return i.workspace_id;
end $$;

create or replace function public.decline_invitation(inv uuid)
returns void language plpgsql security definer set search_path = public as $$
declare em text := public.my_verified_email();
begin
  if em is null then raise exception 'EMAIL_NOT_VERIFIED'; end if;
  update public.invitations set status = 'declined', responded_at = now()
   where id = inv and status = 'pending' and invited_email = em;
end $$;

-- ───────────────────────── 4) RLS ─────────────────────────

alter table public.profiles          enable row level security;
alter table public.workspaces        enable row level security;
alter table public.workspace_members enable row level security;
alter table public.invitations       enable row level security;
alter table public.workspace_data    enable row level security;
alter table public.workspace_records enable row level security;

-- profiles: كل شخص يرى/يعدّل بروفايله فقط
drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_update on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- workspaces: يراها المالك والأعضاء؛ يعدّلها المالك
drop policy if exists ws_select on public.workspaces;
drop policy if exists ws_update on public.workspaces;
create policy ws_select on public.workspaces for select to authenticated
  using (owner_id = auth.uid() or public.is_ws_member(id));
create policy ws_update on public.workspaces for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- members: المالك والأعضاء يرون القائمة؛ المالك يعدّل ويزيل؛ العضو يستطيع المغادرة
drop policy if exists wm_select on public.workspace_members;
drop policy if exists wm_update on public.workspace_members;
drop policy if exists wm_delete on public.workspace_members;
create policy wm_select on public.workspace_members for select to authenticated
  using (user_id = auth.uid() or public.is_ws_owner(workspace_id) or public.is_ws_member(workspace_id));
create policy wm_update on public.workspace_members for update to authenticated
  using (public.is_ws_owner(workspace_id)) with check (public.is_ws_owner(workspace_id));
create policy wm_delete on public.workspace_members for delete to authenticated
  using (user_id = auth.uid() or public.is_ws_owner(workspace_id));
-- لا توجد policy للـ insert: الانضمام يتم فقط عبر accept_invitation()

-- invitations: المالك يرى/ينشئ/يعدّل دعوات مساحته؛ المدعو (بإيميل مؤكَّد) يرى دعواته فقط
drop policy if exists inv_select on public.invitations;
drop policy if exists inv_insert on public.invitations;
drop policy if exists inv_update on public.invitations;
drop policy if exists inv_delete on public.invitations;
create policy inv_select on public.invitations for select to authenticated
  using (public.is_ws_owner(workspace_id) or invited_email = public.my_verified_email());
create policy inv_insert on public.invitations for insert to authenticated
  with check (public.is_ws_owner(workspace_id) and invited_by = auth.uid()
              and invited_email <> coalesce(public.current_email(), ''));
create policy inv_update on public.invitations for update to authenticated
  using (public.is_ws_owner(workspace_id)) with check (public.is_ws_owner(workspace_id));
create policy inv_delete on public.invitations for delete to authenticated
  using (public.is_ws_owner(workspace_id));

-- workspace_data / workspace_records: الصلاحية من ws_access_level (view للقراءة، edit للكتابة)
drop policy if exists wd_select on public.workspace_data;
drop policy if exists wd_insert on public.workspace_data;
drop policy if exists wd_update on public.workspace_data;
drop policy if exists wd_delete on public.workspace_data;
create policy wd_select on public.workspace_data for select to authenticated
  using (public.ws_access_level(workspace_id, system_id, part) in ('view','edit'));
create policy wd_insert on public.workspace_data for insert to authenticated
  with check (public.ws_access_level(workspace_id, system_id, part) = 'edit');
create policy wd_update on public.workspace_data for update to authenticated
  using (public.ws_access_level(workspace_id, system_id, part) = 'edit')
  with check (public.ws_access_level(workspace_id, system_id, part) = 'edit');
create policy wd_delete on public.workspace_data for delete to authenticated
  using (public.is_ws_owner(workspace_id));

drop policy if exists wr_select on public.workspace_records;
drop policy if exists wr_insert on public.workspace_records;
drop policy if exists wr_update on public.workspace_records;
drop policy if exists wr_delete on public.workspace_records;
create policy wr_select on public.workspace_records for select to authenticated
  using (public.ws_access_level(workspace_id, system_id, collection) in ('view','edit'));
create policy wr_insert on public.workspace_records for insert to authenticated
  with check (public.ws_access_level(workspace_id, system_id, collection) = 'edit');
create policy wr_update on public.workspace_records for update to authenticated
  using (public.ws_access_level(workspace_id, system_id, collection) = 'edit')
  with check (public.ws_access_level(workspace_id, system_id, collection) = 'edit');
create policy wr_delete on public.workspace_records for delete to authenticated
  using (public.is_ws_owner(workspace_id));

-- ───────────────────────── 5) الصلاحيات (grants) ─────────────────────────

revoke all on public.profiles, public.workspaces, public.workspace_members,
              public.invitations, public.workspace_data, public.workspace_records from anon;

grant select, update                 on public.profiles          to authenticated;
grant select, update                 on public.workspaces        to authenticated;
grant select, update, delete         on public.workspace_members to authenticated;
grant select, insert, update, delete on public.invitations       to authenticated;
grant select, insert, update, delete on public.workspace_data    to authenticated;
grant select, insert, update, delete on public.workspace_records to authenticated;

revoke execute on function public.ensure_my_workspace()    from public, anon;
revoke execute on function public.accept_invitation(uuid)  from public, anon;
revoke execute on function public.decline_invitation(uuid) from public, anon;
revoke execute on function public.current_email()          from public, anon;
revoke execute on function public.my_verified_email()      from public, anon;
revoke execute on function public.is_ws_owner(uuid)        from public, anon;
revoke execute on function public.is_ws_member(uuid)       from public, anon;
revoke execute on function public.ws_access_level(uuid, text, text) from public, anon;
grant execute on function public.ensure_my_workspace()    to authenticated;
grant execute on function public.accept_invitation(uuid)  to authenticated;
grant execute on function public.decline_invitation(uuid) to authenticated;
grant execute on function public.current_email()          to authenticated;
grant execute on function public.my_verified_email()      to authenticated;
grant execute on function public.is_ws_owner(uuid)        to authenticated;
grant execute on function public.is_ws_member(uuid)       to authenticated;
grant execute on function public.ws_access_level(uuid, text, text) to authenticated;

commit;
