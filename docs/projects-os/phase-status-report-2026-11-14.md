# Projects OS v5 — تقرير حالة المراحل والفجوات المتبقية

**تاريخ التقرير:** 14 نوفمبر 2026  
**المرجع الوظيفي الحاكم:** `Projects_OS_v5_Unified_Refactor_Spec.md` — الإصدار 5.0، §19 للمراحل و§18 لمعايير القبول  
**المستودع:** `koummainc-dot/os-hub`  
**الفرع:** `feat/projects-v5-phase1-navigation`  
**آخر Commit تمت مراجعته:** `7f5238de018c8d86ddc3cd590a0e23c2ea91d354`  
**PR:** #188 — مفتوح، Draft، غير مدمج  
**قاعدة مهمة:** هذا التقرير لا يمنح موافقة على Migration أو نشر Production. لا تغيير إنتاجي ضمن هذه المراجعة.

---

## 1. الخلاصة التنفيذية

**Projects OS v5 لم يصل إلى الاعتماد النهائي بعد.** التنفيذ البرمجي توسّع وأصبحت اختبارات CI وقواعد البيانات ناجحة على آخر Commit، كما أُصلحت مشكلة صلاحيات فعلية في Finance↔Projects واختُبرت على بيئة QA. لكن القبول اليدوي في Preview، واختبارات الملفات الحقيقية، ومصفوفة الأدوار بالحسابات الحقيقية، ومصالحة Migrations، واختبار التراجع قبل الإنتاج ما زالت مفتوحة.

| المؤشر | الحالة الحالية |
|---|---|
| GitHub CI | SUCCESS |
| Verify app | SUCCESS |
| Finance Family Center | SUCCESS |
| Projects SQL smoke | SUCCESS |
| Finance SQL smoke | SUCCESS |
| Knowledge SQL smoke | SUCCESS |
| Ventures SQL smoke | SUCCESS |
| Vercel Preview للـCommit الحالي | READY |
| PR #188 | مفتوح وDraft وغير مدمج |
| Production migrations / writes | لم تُطبّق في هذه الجولة |
| اعتماد Projects OS النهائي | غير معتمد |

### الأدلة الحديثة على آخر Commit

- CI: `43567959033` — SUCCESS
- Verify app: `43567959090` — SUCCESS
- Finance Family Center Checks: `43567959093` — SUCCESS
- Projects SQL: `43567959054` — SUCCESS
- Finance SQL: `43567959155` — SUCCESS
- Ventures SQL: `43567959026` — SUCCESS
- Knowledge SQL: `43567959036` — SUCCESS
- Vercel Preview: `https://os-m5uq3yrd9-koumma.vercel.app` — READY على Commit `b5f4bd3`.

**تنبيه عزل Preview:** تم إعداد متغيري `VITE_SUPABASE_URL` و`VITE_SUPABASE_ANON_KEY` لهدف Preview وللفرع الحالي فقط، وتعليقات الإعداد تشير إلى قاعدة QA. لكن قراءة Vercel أعادت القيم مشفرة ولم تسمح بالتحقق من عنوان Supabase الفعلي. لذلك حالة العزل **مُعدّة لكن غير متحققة من الوجهة الفعلية**. لا تُجرِ أي كتابة اختبارية من Preview قبل تأكيد أن العنوان الفعلي هو مشروع QA `lvtnyepemoqgmehdqark` وليس Production.

---

## 2. حالة كل Phase حسب المواصفة الأصلية v5 (§19)

### Phase 0 — Inventory & Protect Current State

<badge color="warning">PARTIAL</badge>

**ما تم:**
- جرد مسارات Projects ومكونات الواجهة ومصادر البيانات والعلاقات الأساسية.
- حفظ خط الأساس الحالي للبيانات والإبقاء على IDs والعلاقات القديمة دون حذف.
- تحليل سجل Migrations ومقارنة الملفات بالـMigration History.
- إضافة مسار forward-only لإصلاح حواجز Projects المفقودة وDiscovery batch، واختباره على PostgreSQL معزول.
- إنشاء بيئة QA منفصلة واستخدامها في اختبارات العلاقات وصلاحيات Project visibility.
- إصلاح Finance reference visibility guard في Commit `b5f4bd3`، وتطبيقه على QA فقط.

**المتبقي لإغلاقها:**
1. استكمال مراجعة فروق أسماء/توقيت Migrations ومطابقة أثر SQL الفعلي بدل الاعتماد على أسماء الملفات.
2. مراجعة ملفات Migrations القديمة غير المطابقة في الأنظمة الأخرى مع مالكي تلك الأنظمة؛ لا تُطبّق تلقائيًا.
3. إعداد Production-compatible dry run بخطة no-loss، وعدّادات قبل/بعد، وقياس أثر الأقفال والمدة.
4. اختبار Backup/Restore وRollback وموافقة مالك البيانات قبل أي Production migration.
5. تحديث جرد Readers/Writers للحقول القديمة الخاصة بـKR/Task قبل أي تعديل أو إزالة.

**قرار الإغلاق:** لا Migration إنتاجية ولا Backfill قبل اكتمال المراجعة وخطة التراجع والموافقة.

### Phase 1 — Design System & Navigation

<badge color="warning">PARTIAL</badge>

**ما تم:**
- تجميع التنقل العام حسب رحلة العمل، وتوحيد مدخل Governance.
- الإبقاء على Routes/IDs القديمة لتجنب كسر الروابط الحالية.
- بناء تنقل Project Workspace على Desktop وMobile.
- إضافة/الحفاظ على Deep Links للسجل والمشروع والتبويب، وسلوك الرجوع في المتصفح ضمن عقود الكود.
- محاذاة Accent وحالات focus/selected/hover الأساسية مع لون OS Hub `#EF9F27`.

**المتبقي لإغلاقها:**
1. توحيد المكونات المشتركة بالكامل: Head وTabs وBadge وProgress وEmpty وError وModal وSideSheet بدل تعدد الأنماط.
2. اختبار كل Route وRedirect وDeep Link فعليًا من Preview، مع Browser Back.
3. اختبار RTL على عرض 360px وTablet وDesktop، وليس CSS/Contract tests فقط.
4. اختبار Keyboard navigation وFocus order وContrast وScreen-reader labels.
5. اعتماد القرار D-01 (اللون والمكونات الموحدة) بعد مراجعة الواجهة الفعلية.

### Phase 2 — Project Overview & Portfolio

<badge color="warning">PARTIAL</badge>

**ما تم:**
- Portfolio يدعم Cards / Table / Board / Timeline / Calendar.
- البحث في بيانات المشروع والفلاتر المركبة للحالة والنوع والصحة والقائد والفريق والأولوية والرؤية والتاريخ والتأخير والمخاطر.
- عرض Not Measurable بصورة مستقلة، وعدم تحويله إلى 0%.
- مقاييس Overview قابلة للفتح وتوصل إلى قوائم المشروع المفلترة أو السجل المقصود.
- Project Header يحتوي على سبعة إجراءات إضافة مشروطة بالصلاحية وتفتح النماذج الأصلية مع المشروع محددًا مسبقًا.
- اختبارات عقود للتنقل والاختصارات والصلاحيات.

**المتبقي لإغلاقها:**
1. اختبار إجراءات Project Header السبعة يدويًا داخل Preview، والتأكد من تعبئة Project الصحيح والحفظ.
2. Saved Views — القرار D-06: تحديد هل الحفظ شخصي أم مشترك قبل إضافة تخزين دائم.
3. **Finance Link Status:** تم تنفيذ قراءة حالة الربط من Finance-owned `fin_projects_get` داخل Portfolio مع حالات Linked / Not linked / Multiple / Currency mismatch / Permission / Error، وإضافة فلتر وعرض الحالة. المتبقي هو القبول الحي فقط.
4. تفعيل تغيير حالة Board بالسحب، أو توثيق استبعاده من هذا الإصدار بقرار واضح.
5. **Calendar:** تم إثراؤه بأحداث Risk review / Issue discovery / Decision / Win إضافة إلى Project/Task/PRD/Output/Knowledge Meeting. المتبقي هو القبول الحي فقط.
6. قبول UX فعلي للفلاتر والعدادات والـdrill-down على بيانات QA.

### Phase 3 — Planning & Traceability

<badge color="warning">PARTIAL</badge>

**ما تم:**
- Discovery داخل سياق المشروع، مع ربط المشروع والـPRD والـRequirements والمهام والمخرجات.
- تحقق علاقات PRD/Requirement/Task/Output ومنع الروابط غير الصحيحة بين مشاريع أو مواصفات مختلفة.
- اختبارات QA لعلاقات Objective → KR → Project → Task، وPRD → Requirement → Task → Output، مع حالات رفض للروابط المخالفة.
- حارس Final Output والتحقق من أن Requirement لا تصبح Verified دون دليل Final صالح.
- Task Sheet وOutputs يستخدمان مسار Storage الخاص الحالي، مع Signed URLs قصيرة العمر للتنزيل.
- حفظ Upload Intent على سجل Output قبل الرفع، بما يسمح بإعادة استخدام نفس `file_id` و`object_path` عند فشل حفظ metadata ثم إعادة التحميل والمحاولة. عقد الاختبار يحاكي الفشل وإعادة التحميل والاسترجاع.

**المتبقي لإغلاقها:**
1. اختبار رفع ملف حقيقي إلى Supabase Storage ثم Reload ثم Retry ثم Signed Download.
2. اختبار Storage RLS بحساب مسموح وحساب ممنوع؛ الاختبار التعاقدي المحاكى لا يكفي.
3. اختبار فشل فعلي بين Storage upload وحفظ metadata، وإثبات إصلاحه على نفس object path بعد Reload.
4. جرد Stale upload intents والملفات اليتيمة ووضع reconciliation آمن قبل اعتماد المسار.
5. اختبار رحلة Discovery → PRD → Requirement → Task → Output من الواجهة مع Backlinks من الطرفين وبعد Reload.
6. استكمال no-loss reader/writer audit لمسارات KR/Task القديمة قبل تغييرها.
7. حسم D-08 لنموذج Milestones: كيان مستقل أم Task type؛ لا تنشئ نموذجين متوازيين.

### Phase 4 — Governance

<badge color="warning">PARTIAL</badge>

**ما تم:**
- Governance Center موحد للمخاطر والمشاكل والقرارات.
- Project-scoped Governance داخل تفاصيل المشروع.
- عقود وروابط Risk → Issue، وIssue → Repair Task، وDecision → Implementation Task، وروابط السجلات المتأثرة.
- اختبارات SQL/domain للحواجز والروابط cross-project والكتابة الذرية وبعض حالات retry وrollback.
- اختبارات قاعدة البيانات الأخيرة نجحت على آخر Commit.

**المتبقي لإغلاقها:**
1. دورة حياة فعلية من الواجهة لكل Risk/Issue/Decision: Create → Reload → Edit → Close/Resolve → Reopen عند السماح → Archive/Restore.
2. التأكد من Backlinks في الاتجاهين وفتح السجل نفسه لا مجرد صفحة المجموعة.
3. اختبار صلاحيات كل إجراء: create/edit/resolve/approve/archive/delete.
4. اختبار المشاريع الخاصة عبر حسابين حقيقيين، بما يشمل البحث والعدادات وروابط السجلات العامة.
5. اختبار Retry والتزامن على بيانات فعلية، وليس الاكتفاء بعقود مصدر الكود.

### Phase 5 — Knowledge & Resources

<badge color="warning">PARTIAL</badge>

**ما تم:**
- الفصل بين Meetings وReferences/Resources داخل سياق المشروع.
- Knowledge يحتفظ بملكية الاجتماعات؛ Projects لا ينشئ قاعدة اجتماعات موازية.
- اعتماد `knowledge_external_links` كمرجع خارجي canonical لعلاقة Knowledge↔Projects.
- إضافة `knowledge_list_project_meetings(workspace_id, project_id)` للاستعلام المقيد على الخادم، مع تحقق من صلاحية Knowledge ورؤية المشروع.
- إزالة الترشيح المحلي لاجتماعات المشروع من لقطة Workspace العامة، وجعل الطلب المقيد يفشل مغلقًا إذا لم يتوفر RPC.
- SQL smoke اختبر مشروعًا خاصًا وآخر مشتركًا بحسابين؛ الحساب الثاني لا يستطيع قراءة أو ربط المشروع الخاص عبر Trigger أو الكتابة المباشرة، ويمكنه التعامل مع المشروع المشترك حسب الصلاحية.
- إصلاح أزرار Refresh/Retry التي كانت تمرر click event إلى دالة refresh.

**المتبقي لإغلاقها:**
1. اختبار Meeting → Action Item → Task من الواجهة على QA، ثم Reload والتحقق من المصدر والروابط الراجعة.
2. **Follow-up server idempotency:** تم تنفيذ RPC ذري `projects_create_followup_task` مع advisory transaction lock على `(workspace, stable_followup_id)` وإعادة السجل الموجود عند التكرار، مع إبقاء `projects_apply_records_batch` ككاتب Projects الوحيد. المتبقي هو القبول الحي تحت Reload/التزامن.
3. إثبات exact source backlink من Task إلى اجتماع Knowledge الأصلي.
4. اختبار Resources من Knowledge وProjects وOutputs مع إظهار مالك كل مورد دون نسخ محتوى النظام المالك.
5. مراجعة Legacy project references عبر dry run قبل أي backfill؛ لا توجد مبررات لعمل Backfill إنتاجي قبل الجرد.

### Phase 6 — Finance & Reporting

<badge color="warning">PARTIAL</badge>

**ما تم:**
- Finance هو مالك Finance Project Profiles والمعاملات؛ Projects يستخدم handoff ولا ينشئ سجلًا ماليًا موازيًا.
- Finance-owned read model `fin_projects_get(p_ws)` موجود ويعيد ملخصات Finance وفق صلاحية القراءة.
- اكتشاف ثغرة أمنية حقيقية: الدالة `fin_project_save(jsonb)` ذات SECURITY DEFINER كان يمكنها تجاوز RLS الخاص برؤية Projects عند حفظ مرجع مشروع.
- إصلاح ذلك في Migration `20261114123000_finance_projects_reference_visibility_guard.sql`: تتحقق الدالة من Finance edit، وProjects access، ووجود المشروع وعدم حذفه، وكونه مرئيًا للحساب.
- تم تطبيق الإصلاح على QA فقط. إعادة الاختبار بحسابين أثبتت رفض مرجع مشروع خاص برسالة `PROJECT_OS_REFERENCE_FORBIDDEN` وقبول مرجع مشروع مشترك مسموح. صلاحية Finance edit لا تمنح تجاوز خصوصية Projects.
- Finance SQL smoke على آخر Commit ناجح.

**المتبقي لإغلاقها:**
1. **مسار إنشاء معاملة Finance:** تم تنفيذ handoff مباشر من Project Finance إلى Finance Transactions مع تمرير `projectRef`؛ Finance يقرأ الملف المالي الوحيد المرتبط ويجهز نموذج الحركة مسبقًا، ثم يستخدم `fin_post_transaction_with_splits` و`fin_project_transaction_link` كما هو معتمد. المتبقي هو القبول الحي من الواجهة/RPC.
2. حسم D-02: هل لكل Project ملف Finance نشط أساسي واحد، أم اختيار Primary Profile صريح؟ لا تضف Unique constraint قبل جرد التكرارات والقرار.
3. حسم D-10: متى تنتقل الميزانية المخططة من Projects إلى Finance، وما الذي يظل مملوكًا لكل نظام بعد النقل؟
4. إظهار حالات Not Linked / Linked / Stale / Error / Permission Denied / Currency Mismatch بوضوح.
5. إظهار Attribution للمعاملات و`as_of` ووقت آخر مزامنة، ومنع عرض أرقام صفرية مضللة عندما لا يوجد ربط.
6. اختبار اختلاف العملة والصلاحيات والحسابات الحقيقية.
7. استكمال تجميع Activity لكل أنواع السجلات، والتحقق من Wins/Updates وWeekly Review snapshots من المشروع والعرض العام.

### Phase 7 — Global Polish & Release

<badge color="danger">BLOCKED FOR RELEASE</badge>

**ما تم:**
- جميع مسارات CI المذكورة أعلاه ناجحة على آخر Commit.
- Preview الحالي READY وعلى نفس Commit `b5f4bd3`.
- توجد بيئة QA منفصلة وتم استخدامها لاختبارات قواعد البيانات والصلاحيات.
- إصلاحات أمنية وعلاقات مهمة نجحت في الاختبارات المعزولة.

**المتبقي لإغلاقها:**
1. إثبات وجهة Preview فعليًا قبل أي كتابة؛ متغيرا Preview موجودان ومخصصان للفرع بحسب التعليقات لكن Vercel لم يكشف قيمهما المفكوكة للتحقق من QA URL.
2. تنفيذ قبول يدوي على Preview: 360px / Tablet / Desktop RTL، Keyboard، Focus، Contrast، Screen Reader.
3. Browser Back وDeep Links لكل المسارات والسجلات المطلوبة.
4. اختبارات Offline / Network Retry / Version Conflict / stale update على الواجهة.
5. أداء Task Tree وقوائم المشاريع على حجم بيانات مناسب، وليس افتراض الأداء من unit tests فقط.
6. تشغيل ثلاثة حسابات على الأقل: حسابان مخولان وحساب محدود الصلاحية، مع اختبار خصوصية المشروع والعلاقات والملفات.
7. دورة بيانات حقيقية كاملة: Create → Reload → Edit → Reload → Archive → Restore → Reload.
8. Migration dry run وBackup/Restore وRollback rehearsal ومراجعة أمان شاملة.
9. إغلاق G0–G7، وتوثيق نتائج كل اختبار وقرار المنتج، ثم موافقة المالك وRelease Notes ونشر متدرج.

---

## Latest implementation batch — 2026-11-14

تمت مواصلة التنفيذ بدون Production writes أو migrations، مع إغلاق برمجي لثلاث فجوات كانت في قائمة Features:
- Portfolio أصبح يعرض Finance Link Status من الـFinance-owned read model، بما في ذلك اختلاف العملة وتعدد الملفات وعدم توفر الصلاحية/الخطأ، مع فلتر للحالة.
- Portfolio Calendar أصبح يعرض Risk review وIssue discovery وDecision وWin بالإضافة إلى الأحداث الموجودة سابقًا، وكل حدث يفتح السجل الأصلي داخل النظام المالك.
- Project Finance أصبح يوفّر زر تسجيل حركة مباشر، وFinance Transactions يستقبل `projectRef` ويفتح نموذج الحركة مع `finance_project_id` واسم المشروع، دون إنشاء Finance record من Projects.
- Knowledge Follow-up → Task أصبح يملك مسارًا ذريًا على الخادم يمنع إنشاء نسختين لنفس `stable_followup_id` تحت التزامن.
- تم توضيح تسمية `Portfolio` في Navigation إلى **محفظة المشاريع**، مع وصف صريح أنها ليست المحفظة المالية؛ هي مركز متابعة المشاريع متعدد طرق العرض.

**لا تُعتبر هذه التغييرات مقبولة نهائيًا بعد؛ اختبارات Preview والـQA الحية مؤجلة إلى دفعة الاختبارات النهائية كما تم الاتفاق.**

## 3. بوابات الاعتماد G0–G7

| البوابة | الحالة | المتبقي |
|---|---|---|
| G0 — Code Inventory | PARTIAL | إغلاق migration ledger/effect reconciliation ومطابقة Readers/Writers |
| G1 — UX Architecture | PARTIAL | اختبار الرحلات كاملة واعتماد IA والتنقل من مالك المنتج |
| G2 — Design System | PARTIAL | المكونات المشتركة وRTL/Responsive/Keyboard/Contrast والاعتماد البصري |
| G3 — Relationship Integrity | PARTIAL | اختبارات واجهة وبيانات حقيقية وروابط راجعة بكل الاتجاهات |
| G4 — Finance & Knowledge | PARTIAL | Follow-up server idempotency، Finance transaction attribution، حالات المزامنة والعملة والأدوار |
| G5 — Data Safety | BLOCKED | no-loss dry run، backup/restore، rollback، مراجعة SQL وأثره وموافقة صريحة |
| G6 — QA | PARTIAL | CI ناجح؛ المتبقي Browser/Storage/role matrix/Responsive/Accessibility/Offline/Performance |
| G7 — Release | BLOCKED | قبول بثلاثة حسابات، موافقة مالك المنتج، خطة نشر وتراجع |

**لا توجد بوابة اعتماد نهائية مغلقة بما يكفي لاعتبار Projects OS جاهزًا للإنتاج.**

---

## 4. قرارات المنتج المفتوحة D-01 إلى D-12

- **D-01:** اعتماد Accent ومكونات التصميم الموحدة بعد المراجعة الفعلية.
- **D-02:** عدد Finance Profiles الأساسية وعلاقة الملف المالي بالمشروع.
- **D-03:** حدود ملكية Resources والملفات بين Projects وKnowledge وOutputs.
- **D-04:** تثبيت الهوية المستقرة لكل Knowledge Follow-up وتخزينها على جانب Knowledge.
- **D-05:** اعتماد canonical `project_ref` وعقد الربط النهائي.
- **D-06:** Saved Views شخصية أم مشتركة، وعقد تخزينها.
- **D-07:** Unified Inbox يتبع Platform Notification ولا تنشأ نسخة داخل Projects.
- **D-08:** Milestones مستقلة أم Task type واحد؛ يمنع ازدواج النموذج.
- **D-09:** نطاق اللغة الإنجليزية وتبديل اللغة في V1.
- **D-10:** سياسة نقل planned budget من Projects إلى Finance.
- **D-11:** عقد استعلام موارد Knowledge وصلاحياته.
- **D-12:** إغلاق جرد Readers/Writers والبيانات القديمة الخاصة بـKR/Task قبل تعديل المسارات.

العناصر الاختيارية/المؤجلة لا تتحول تلقائيًا إلى عمل جديد: أي عنصر مؤجل يظل خارج النطاق حتى يُعتمد صراحةً.

---

## 5. ربط طريقة العمل ذات المراحل الست بالمراحل الأصلية

طريقة المراجعة التشغيلية ذات المراحل الست تظل مستخدمة داخل كل Phase، لكنها ليست بديلًا عن مراحل المصدر الثماني:

| منهج العمل الستّي | موضعه الأساسي في خطة v5 | الحالة |
|---|---|---|
| 1. Information Architecture | Phase 1 وPhase 2 وProject Workspace | منفذ جزئيًا؛ اعتماد الرحلات والتنقل والاختبار اليدوي مفتوح |
| 2. User Flows | Phases 2–6 | كثير من العقود موجود؛ دورات الواجهة والرفض/الإلغاء/التكرار/التزامن غير مغلقة بالكامل |
| 3. Wireframes & Navigation | Phase 1 وProject Workspace | التجميع والتنقل موجود؛ responsive/accessibility والاعتماد البشري مفتوح |
| 4. Data Model & Permissions | Phases 0 و3–6 | علاقات وحواجز QA موجودة؛ Production reconciliation وrole matrix الحقيقية مفتوحة |
| 5. Implementation | Phases 1–6 | تنفيذ كبير قائم؛ التكاملات والـStorage والـFinance UI ما زالت جزئية |
| 6. Testing & Approval | Phase 7 وكل Exit Criteria | CI وSQL ناجحان؛ القبول الحي وموافقة المنتج والنشر غير مكتملة |

---

## 6. الخطوة التالية الواحدة الموصى بها

**إغلاق قبول Outputs الحقيقي على QA قبل إضافة أي Feature جديدة:**

1. تثبيت أن Preview الخاص بالفرع يقرأ فعلًا من QA URL، لا Production.
2. استخدام ملف حقيقي صغير: Upload من Outputs وTask Sheet.
3. إعادة تحميل الصفحة بعد الرفع، ثم تنزيل الملف عبر Signed URL.
4. محاكاة انقطاع/فشل حفظ metadata وإعادة اختيار الملف نفسه، والتأكد من استعادة نفس `file_id` و`object_path`.
5. إعادة الاختبار بحساب مسموح وحساب غير مسموح للتحقق من Storage RLS.
6. تسجيل نتيجة كل حالة في تقرير القبول وربطها بالـCommit الحالي.

بعد إغلاق هذا المسار نكمل دورة البيانات الحقيقية ولقطة الصلاحيات، ثم ننتقل إلى Finance transaction lifecycle. لا نضيف Saved Views أو Milestones أو نماذج موازية في هذه الدفعة؛ تُحسم قراراتها أولًا.

---

**الحالة النهائية في 14 نوفمبر 2026:** العمل البرمجي الحالي ناجح آليًا على آخر Commit، لكن Projects OS v5 ما زال **PARTIAL / NOT APPROVED**. لا دمج لـPR #188 ولا Migration أو نشر Production قبل إغلاق G0–G7 وتوثيق الأدلة والموافقة.
