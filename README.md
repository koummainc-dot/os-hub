# OS Hub — منصّة الأنظمة (Vite + React + Supabase)

**المنصّة:** حسابات ذاتية · مساحات · دعوات بالإيميل · صلاحيات لكل نظام وقسم · وضع تجريبي لكل الأنظمة · 14 نظاماً (Content OS جاهز، والباقي يُبنى بالترتيب).
**الخطة:** [`PLATFORM_MASTER_PLAN.md`](PLATFORM_MASTER_PLAN.md) · **التعارضات والقرارات:** [`ARCHITECTURE_CONFLICTS.md`](ARCHITECTURE_CONFLICTS.md) · **خطط الأنظمة:** `plans/`

## التشغيل المحلي
```bash
npm install
cp .env.example .env     # ضع VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY
npm run dev              # التطوير
npm run build            # البناء → dist
npm test                 # اختبارات jsdom (تبني حزمة اختبار ثم تشغّل 4 مجموعات)
npm run lint             # فحص المعرّفات غير المعرّفة
```

## البنية
```
src/core/        supabase · core (التسجيل والصلاحيات وطبقة البيانات) · ui (عناصر مشتركة)
src/platform/    Platform (الغلاف والقائمة الديناميكية) · auth · pages (Today/الفريق/الدعوات/حسابي)
src/systems/<id>/index.jsx   كل نظام وحدة تُحمَّل كسولاً (عقد الوحدة في Platform.jsx → OSSystemHost)
supabase/migrations/         مخطط قاعدة البيانات وسياسات RLS
plans/                       خطط الأنظمة (14) + habit_reference/
tests/                       حزمة jsdom مع Supabase مُحاكى
```

## نشر Vercel
Framework: Vite · Build: `npm run build` · Output: `dist` (مضبوطة في `vercel.json`) · Environment Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

## Supabase
شغّل `supabase/migrations/20261025000000_platform_core.sql` (أو يُطبَّق عبر MCP). ثم Authentication → Providers → Email: مفعّل، **Confirm email: مفعّل**، وURL Configuration: Site URL + نطاق Vercel في Redirect URLs.

## الحالة الحالية (25 أكتوبر 2026)
- Supabase: مشروع `os-hub` (`cvcngvlickozahecgmij` — eu-central-1) مُطبَّق عليه `platform_core`، واختُبرت سياسات RLS فعلياً (30 اختبار: مالك/عضو/غريب/بريد غير مؤكَّد/تخفيض صلاحية/إزالة).
- الملف `.env` يحمل URL والمفتاح العام (آمن). `supabase/legacy/` لترحيل مشروع قديم فقط.
