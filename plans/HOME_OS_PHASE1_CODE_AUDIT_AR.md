# جرد الكود الحالي — Home OS (الخطوة 1)
تاريخ الجرد: 2026-10-31
الفرع: `feat/home-os-phase1-foundation`
PR: #95 (Draft، غير مدمج)

> هذا الجرد مبني على ملفات الفرع المشار إليه، وليس على افتراضات عن الفرع الافتراضي. لم تُنفّذ أي كتابة على قاعدة Supabase ولم تُطبّق migrations.

## 1. مسارات القراءة والكتابة الحالية

### أ) العقارات والغرف والمخزون والحركات
- واجهة القسم: `src/systems/home/index.jsx`
  - تحمل البيانات عبر `createHomeRepository(api).load()`.
  - تعدّل حالة React محليًا ثم تستدعي `repository.save(next)`.
  - إنشاء صنف يضيف حركة افتتاحية إلى مصفوفة `movements` في نفس الـ snapshot.
- Repository: `src/systems/home/repository.js`
  - يفضّل `api.loadNormalizedHome()` و`api.saveNormalizedHome()` إذا أُتيحتا.
  - رغم اسم `NormalizedHome`، هذه الواجهة ليست CRUD علائقيًا من الواجهة؛ إنها RPC تقرأ/تكتب JSON snapshot وتحوّله داخل PostgreSQL إلى جداول علائقية.
  - إذا أعادت RPC أن الوظيفة غير موجودة (`PGRST202`/`42883`)، يرجع Repository إلى `api.load()`/`api.save()` العامة.
- API: `src/core/core.js`
  - `loadNormalizedHome` يستدعي `home_load_snapshot(p_workspace_id)`.
  - `saveNormalizedHome` يستدعي `home_save_snapshot(p_workspace_id,p_snapshot)`.
  - `load()` يقرأ `workspace_data`، وعند تعذّر القراءة قد يرجع إلى `localStorage`.
  - `save()` يكتب إلى `localStorage` أولًا ثم يكتب إلى `workspace_data` (upsert أو تحديث متفائل باستخدام `updated_at`). هذا مسار حفظ مزدوج عند استخدام API العام.
- Migration: `supabase/migrations/20261031140000_home_os_phase1_foundation.sql`
  - الجداول: `home_settings`, `home_properties`, `home_rooms`, `home_inventory_items`, `home_inventory_movements`, `home_audit_log`.
  - `home_load_snapshot` يجمع هذه الجداول في JSON.
  - `home_save_snapshot` يفكّ JSON ويعمل upsert للسجلات، ويضيف حركات المخزون بمفتاح idempotency.
  - هذا يعني أن الـ RPC وسيط snapshot فوق جداول علائقية، وليس Repository عمليات ذرية لكل أمر نطاقي.

### ب) المهام والصيانة والمشتريات والفواتير ومقدمو الخدمات
- الواجهة: `src/systems/home/operations.jsx`
  - التحميل عبر `api.loadHomeOperations()` والحفظ عبر `api.saveHomeOperations(next)`.
  - تحتفظ الواجهة بكل مجموعات العمليات داخل كائن واحد: `tasks`, `completions`, `providers`, `maintenance`, `purchaseRequests`, `purchaseItems`, `bills`, `events`.
  - وضع Demo يستخدم `localStorage.home_operations_demo` بشكل صريح.
- API: `src/core/core.js`
  - RPCs: `home_operations_load(p_workspace_id)` و`home_operations_save(p_workspace_id,p_data)`.
- Migration: `supabase/migrations/20261031160000_home_os_phase2_operations.sql`
  - جداول علائقية موجودة: `home_tasks`, `home_task_completions`, `home_service_providers`, `home_maintenance_records`, `home_purchase_requests`, `home_purchase_request_items`.
  - صلاحيات RLS على مستوى نظام Home في مساحة العمل.
- Migration: `supabase/migrations/20261031170000_home_os_operations_snapshot.sql`
  - تضيف `home_operations_snapshot` وتخزن مجموعات العمليات الثماني كـ JSONB.
  - دالة الحفظ تعمل upsert للصورة كاملة وتزيد version، لكنها لا تستخدم version متوقعًا لمنع lost update؛ طلبان متزامنان يمكن أن يستبدل أحدهما تغييرات الآخر.
  - الجداول العلائقية في migration السابقة لا تُملأ من `home_operations_save`؛ لذلك واجهة العمليات لا تستخدمها كمصدر الحقيقة حاليًا.

### ج) الاستلام الجزئي للمشتريات
- في `src/systems/home/operations.jsx`, الدالة `receivePurchase`:
  1. تحسب الكمية المتبقية من بيانات الواجهة.
  2. تطلب الكمية من المستخدم.
  3. تستدعي `onReceivePurchase(request, receiptLines)` لتحديث المخزون.
  4. بعدها تحسب حالة البنود والطلب وتحفظ Snapshot العمليات باستدعاء منفصل.
  5. بعدها تنشر أحداث Finance من المتصفح.
- النتيجة: لا توجد معاملة قاعدة بيانات واحدة تجمع تحديث كمية المخزون، وتسجيل الاستلام، وتحديث الكمية المستلمة وحالة الطلب، وإنشاء أحداث التكامل. إذا نجح حفظ المخزون وفشل حفظ Snapshot العمليات أو حدث انقطاع، يمكن أن تصبح البيانات غير متسقة. كما أن المفتاح المرسل إلى Finance مبني على الكمية المستلمة سابقًا، لكنه ليس بديلًا عن idempotency في RPC ذرية على الخادم.

## 2. الأحداث والمزامنة
- الناقل الحالي: `src/systems/integrationEvents.js`.
- يستخدم `localStorage` وأحداث المتصفح (`CustomEvent`/نظيرها)؛ ليس Outbox خادميًا دائمًا.
- استدعاءات Home لإكمال المهمة/الصيانة/استلام المشتريات/الفواتير تنشر أحداث Finance أو Today بعد الحفظ المحلي/الـ RPC. لا يضمن هذا التسليم بعد إغلاق المتصفح أو بين الأجهزة، ولا يوفر إعادة محاولة خادمية موثوقة.

## 3. جرد migrations والاختبارات المرتبطة
- `20261031140000_home_os_phase1_foundation.sql`: إعدادات المنزل والعقارات والغرف والمخزون وحركاته وسجل التدقيق وRPCs snapshot.
- `20261031160000_home_os_phase2_operations.sql`: جداول المهام والإنجازات ومقدمي الخدمات والصيانة وطلبات الشراء وبنودها.
- `20261031170000_home_os_operations_snapshot.sql`: Snapshot عمليات JSONB وRPCs التحميل والحفظ.
- `supabase/tests/home_os_smoke.sql` و`tests/home_os_sql_bootstrap.sql`: اختبار SQL في PostgreSQL مؤقت ضمن CI، ويطبق ملفات migrations الثلاثة.
- `tests/t_home_domain.mjs`, `tests/t_home_operations_domain.mjs`: اختبارات منطق المجال، لا تثبت وحدها الذرية أو التزامن متعدد الجلسات أو تسليم الأحداث الخادمي.
- `package.json`: `npm test` يشمل بناء الاختبار واختبارات Home domain. لا يظهر من الجرد وجود اختبار متصفح end-to-end خاص بدورة الاستلام المتزامن.

## 4. الاستنتاجات الحاسمة
1. هناك مساران snapshot منفصلان: `home_save_snapshot` للمخزون/العقار/الغرف، و`home_operations_save` للعمليات. وهناك أيضًا fallback إلى `workspace_data` وlocalStorage في API العام.
2. الجداول العلائقية للعمليات موجودة في migration، لكنها ليست مصدر بيانات واجهة العمليات في الفرع الحالي؛ واجهة العمليات تقرأ وتكتب `home_operations_snapshot`.
3. الاستلام الجزئي ليس ذريًا عبر المخزون والطلب والبنود وحدث Finance.
4. لا يوجد Outbox خادمي دائم في هذه الملفات؛ الأحداث الحالية من المتصفح.
5. عضوية مساحة العمل موجودة على مستوى المنصة، لكن جداول Home الحالية تعتمد `ws_access_level(...,'home','main')`؛ لم يُعثر في الملفات التي جرى فحصها على صلاحيات خاصة بكل عقار/غرفة.
6. التذكيرات في `operations.jsx` تعتمد `setInterval` وإشعارات المتصفح، وبالتالي تتطلب بقاء التطبيق مفتوحًا.

## 5. ترتيب التنفيذ الآمن التالي
- **الخطوة 2:** اعتماد مصدر حقيقة علائقي واحد، بعد إضافة/مراجعة RPCs نطاقية ذرية بدل كتابة snapshot كاملة. إزالة fallback الكتابة إلى `workspace_data`/localStorage لمسارات Home الحية، مع إبقاء Demo معزولًا.
- **الخطوة 3:** RPC واحدة للاستلام الجزئي بمعرّف idempotency ثابت، تقفل طلب الشراء وبنوده وصنف المخزون، وتحدّث الكميات وتضيف حركة/إيصال/Outbox في transaction واحدة.
- **الخطوة 4:** Outbox دائم مع قيد uniqueness على event id/idempotency key، وحالات pending/processing/delivered/retry/dead-letter.
- **الخطوتان 5–6:** نموذج عضويات ونطاقات صلاحيات، ثم جدولة خلفية مستقلة عن المتصفح.
- **الخطوة 7:** اختبارات تزامن وإعادة محاولة وRLS وتسليم متعدد الجلسات، ثم اختبار واجهة متصفح.

## 6. ما لم يُنفذ
هذا الملف جرد فقط. لا يغيّر schema ولا ينقل بيانات ولا ينشئ وظائف جديدة ولا يطبّق migration على أي قاعدة بيانات.
