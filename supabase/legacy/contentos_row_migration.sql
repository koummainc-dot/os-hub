-- يُشغَّل مرة واحدة فقط على مشروع Supabase القديم الذي يحتوي الجدول content_os_data (ليس مطلوباً للمشروع الجديد).
-- يتطلب أن تكون الهجرة الأساسية مطبّقة أولاً.

-- ═══════════════════════════════════════════════════════════════════════════
-- 6) ترحيل بيانات ContentOS القديمة (الجدول content_os_data صف id=1)
--    يُنقل إلى مساحة الأدمن القديم (أول مستخدم role=admin له authUid) كنظام "content".
--    باقي أعضاء الفريق القدامى (لهم authUid) يُضافون كأعضاء: viewer→عرض، editor→تعديل،
--    admin→تعديل + إدارة النظام. الجدول القديم يبقى كما هو كنسخة احتياطية (لا يُحذف).
-- ═══════════════════════════════════════════════════════════════════════════
do $$
declare
  d jsonb; admin_uid uuid; ws uuid; u jsonb; uid uuid; lvl text; mng boolean; em text; nm text;
begin
  if to_regclass('public.content_os_data') is null then return; end if;
  select data into d from public.content_os_data where id = 1;
  if d is null or d = '{}'::jsonb then return; end if;

  select (x->>'authUid')::uuid into admin_uid
    from jsonb_array_elements(coalesce(d->'_users','[]'::jsonb)) x
   where x->>'role' = 'admin' and coalesce(x->>'authUid','') ~* '^[0-9a-f-]{36}$'
   limit 1;
  if admin_uid is null or not exists (select 1 from auth.users where id = admin_uid) then
    raise notice 'لم يُعثر على أدمن قديم له authUid — تم تخطي ترحيل بيانات ContentOS';
    return;
  end if;

  select coalesce(nullif(raw_user_meta_data->>'name',''), split_part(email,'@',1)), lower(email)
    into nm, em from auth.users where id = admin_uid;
  insert into public.profiles(id, email, name, color) values (admin_uid, em, nm, '#EF9F27')
    on conflict (id) do nothing;

  select id into ws from public.workspaces where owner_id = admin_uid order by created_at limit 1;
  if ws is null then
    insert into public.workspaces(owner_id, owner_name, name) values (admin_uid, nm, 'مساحتي') returning id into ws;
  end if;

  insert into public.workspace_data(workspace_id, system_id, part, data, updated_by)
  values (ws, 'content', 'main', d, admin_uid) on conflict do nothing;

  for u in select value from jsonb_array_elements(coalesce(d->'_users','[]'::jsonb)) loop
    begin uid := nullif(u->>'authUid','')::uuid; exception when others then uid := null; end;
    continue when uid is null or uid = admin_uid;
    continue when not exists (select 1 from auth.users where id = uid);
    lvl := case u->>'role' when 'viewer' then 'view' else 'edit' end;
    mng := (u->>'role') = 'admin';
    select lower(email) into em from auth.users where id = uid;
    insert into public.profiles(id, email, name, color)
      values (uid, em, coalesce(u->>'name', split_part(em,'@',1)), coalesce(u->>'color','#3B82F6'))
      on conflict (id) do nothing;
    insert into public.workspace_members(workspace_id, user_id, email, display_name, access)
    values (ws, uid, em, coalesce(u->>'name', split_part(em,'@',1)),
            jsonb_build_object('systems', jsonb_build_object('content',
              jsonb_build_object('level', lvl, 'manage', mng))))
    on conflict do nothing;
  end loop;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7) إغلاق الجدول القديم: السياسات القديمة كانت تسمح لأي مستخدم مسجّل بقراءة
--    كل بيانات الفريق، وهذا غير آمن مع التسجيل المفتوح. التطبيق الجديد لا يقرأه.
-- ═══════════════════════════════════════════════════════════════════════════
do $$
begin
  if to_regclass('public.content_os_data') is not null then
    execute 'alter table public.content_os_data enable row level security';
    execute 'drop policy if exists "authenticated read" on public.content_os_data';
    execute 'drop policy if exists "authenticated insert" on public.content_os_data';
    execute 'drop policy if exists "authenticated update" on public.content_os_data';
    execute 'revoke all on public.content_os_data from anon, authenticated';
  end if;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- إعدادات لازم تعملها يدوياً في لوحة Supabase (مش قابلة للضبط من SQL):
--  1) Authentication → Providers → Email: مفعّل.
--  2) Authentication → Sign In / Providers → "Confirm email": فعّله (مهم!).
--     الدعوات تُطابَق بالإيميل المؤكَّد؛ لو أطفأته يقدر أي شخص يسجّل بإيميل غيره
--     ويستلم دعواته.
--  3) Authentication → URL Configuration: ضع رابط الموقع (Site URL) ورابط Vercel
--     في Redirect URLs — مطلوب لروابط تأكيد الإيميل واستعادة كلمة المرور.
--  4) (موصى به) Authentication → SMTP Settings: SMTP خاص بك؛ الإرسال الافتراضي
--     محدود جداً في عدد الرسائل في الساعة.
--  5) (اختياري) Password length ≥ 8 (التطبيق نفسه يطلب 8 أحرف على الأقل).
-- ═══════════════════════════════════════════════════════════════════════════
