# 07 — الحالات والصلاحيات والأخطاء

## الصلاحيات
الوصول العام للقسم يمر عبر Projects access الحالي و`osSectionLevel`. الكتابة على السجلات تمر أيضًا عبر `ctx.can(...)` حيث يثبت المصدر ذلك.

## Viewer
Router يخفي reviews وcontacts من القائمة لـViewer وفق التنفيذ الحالي؛ هذا لا يعني أن كل record-level permissions تُختزل في إخفاء القائمة.

## Loading / Error / Empty
Projects يحتوي حالات readiness/error على مستوى Router، وحالات فارغة/filtered empty states داخل الشاشات. لا تُعتبر الحالة الفارغة فشلًا.

## Offline
Offline queue تعرض عدد التعديلات والتعارضات، وتوفر retry/rebase/discard/reload. إنشاء العلاقات والملفات والعمليات الذرية تحتاج اتصالًا بحسب النص الظاهر في التنفيذ.

## Output pending
الموافقة النهائية على Output محجوبة عندما توجد ملفات أو upload intents pending.

## Needs verification
- real two-account/three-account privacy
- real Supabase Storage/RLS
- mobile/tablet/RTL/accessibility
- offline/conflict acceptance الحقيقي
- no-loss migration/rollback
- production verification and owner approval
