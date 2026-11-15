# Projects OS v5 — تقرير حالة المراحل والفجوات المتبقية

**تاريخ التقرير:** 14 نوفمبر 2026  
**المرجع الوظيفي الحاكم:** `Projects_OS_v5_Unified_Refactor_Spec.md` — الإصدار 5.0، §19 للمراحل و§18 لمعايير القبول  
**المستودع:** `koummainc-dot/os-hub`  
**الفرع:** `feat/projects-v5-phase1-navigation`  
**آخر Commit اجتاز التحقق السابق:** `b5f4bd3` (QA/CI evidence below). **Current implementation head:** `21cf488f14b82c674da28e606c56a115603644db` — لم يُختبر بعد؛ لا تخلط بينه وبين آخر Commit متحقق.  
**PR:** #188 — مفتوح، Draft، غير مدمج  
**قاعدة مهمة:** هذا التقرير لا يمنح موافقة على Migration أو نشر Production. لا تغيير إنتاجي ضمن هذه المراجعة.

---

## 1. الخلاصة التنفيذية

**Projects OS v5 لم يصل إلى الاعتماد النهائي بعد.** التنفيذ البرمجي توسّع وأصبحت اختبارات CI وقواعد البيانات ناجحة على آخر Commit، كما أُصلحت مشكلة صلاحيات فعلية في Finance↔Projects واختُبرت على بيئة QA. بعد ذلك أُضيفت ميزات جديدة على رأس الفرع الحالي؛ لم تُشغّل عليها اختبارات القبول أو CI النهائي بعد. لكن القبول اليدوي في Preview، واختبارات الملفات الحقيقية، ومصفوفة الأدوار بالحسابات الحقيقية، ومصالحة Migrations، واختبار التراجع قبل الإنتاج ما زالت مفتوحة.

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


### تنفيذ إضافي بعد آخر Commit متحقق — لم يدخل الاختبار بعد

- Saved Views: Core-owned table/service وRLS، شخصية أو مشتركة، مع حفظ الفلاتر والنمط والأعمدة والترتيب.
- Milestones: سجل مستقل وواجهة CRUD/Archive/Restore، Backlinks للمهام، Roadmap وPortfolio Calendar، وحواجز قاعدة البيانات وعمليات Batch/Purge ذرية.
- Move Task/Tree: معاينة وتحديث ذري للمهام والمخرجات والروابط المتأثرة في Governance/KR/Milestones.
- Weekly Reviews: الأصل خاص دائمًا؛ مشاركة جزئية عبر Projection منفصل، مع حجب بيانات المشاريع الخاصة عن النسخة المشتركة.
- Meeting Templates: الخمسة أصبحت Knowledge-owned وقابلة للاختيار في نموذج الاجتماع وتوليد أجندة قابلة للتحرير.
- Offline: تقييد طابور Projects إلى تعديلات الحقول الأساسية لمهمة موجودة فقط، مع واجهة تعرض pending/conflicts وتسمح بإلغاء النسخة المحلية المتعارضة. الإنشاء والعلاقات والعمليات الذرية والملفات Online-only.
- Alerts: تذكيرات PRD review للمراجعين الفعليين، Output review لقائد المشروع، ومخاطر عالية/مشاكل حرجة للمالك، وإشعارات Core للأحداث التي تم تحديد مستلميها.
- Unified Inbox: Core-owned notification table/RLS، dedupe، recipient visibility، read state، وToday Inbox؛ producers للـTask assignment وPRD/Output review وHigh Risk/Critical Issue، وKnowledge linked-meeting → Project lead.
- Finance D-02: Finance-owned primary profile mapping، RPC لتعيين الأساسي، واستهلاك الاختيار في Portfolio وProject Finance.
- Finance Budget Handoff: تمرير اقتراح أولي مع تأكيد Finance صريح ومنع التحويل بين العملات، وD-02 primary profile اختيار صريح.
- لم تُشغّل CI/Preview acceptance أو migrations لهذه الدفعة بعد؛ جميع هذه البنود حالتها **Implemented on branch / Pending QA verification**، لا تعتبر معتمدة.

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
2. Saved Views: تم حسم D-06 وتنفيذ تخزين Core-owned `core_saved_views` مع RLS، طرق شخصية ومشاركة Workspace، وحفظ الفلاتر والنمط والأعمدة وترتيبها. يلزم تطبيق migration على QA واختبار حسابين.
3. **Finance Link Status:** تم تنفيذ قراءة حالة الربط من Finance-owned `fin_projects_get` داخل Portfolio مع حالات Linked / Not linked / Multiple / Currency mismatch / Permission / Error، وإضافة فلتر وعرض الحالة. المتبقي هو القبول الحي فقط.
4. Board status drag موجود. أُضيفت أيضًا Milestones ككيان مستقل مع CRUD وArchive/Restore وروابط المهام، وظهورها في Roadmap وPortfolio Calendar. يلزم اختبار CRUD/الروابط/الحذف والاستعادة بعد migration.
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
7. حُسم D-08: Milestone كيان مستقل لا يدخل في تقدم المهام. أُضيفت integrity guard وatomic batch writer وatomic purge migrations للكيان الجديد؛ يلزم تطبيقها على QA واختبار no-loss.

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
1. اختبار Meeting → Action Item → Task من الواجهة على QA، ثم Reload والتحقق من المصدر والروابط الراجعة؛ المسار الذري server-side مكتمل.
2. **Follow-up server idempotency:** مكتمل برمجيًا عبر RPC ذري `projects_create_followup_task` مع advisory transaction lock على `(workspace, stable_followup_id)` وإعادة السجل الموجود عند التكرار، مع إبقاء `projects_apply_records_batch` ككاتب Projects الوحيد. المتبقي هو القبول الحي تحت Reload/التزامن.
3. Meeting Templates الخمسة أصبحت مملوكة لـKnowledge في ملف واحد، ويمكن اختيار القالب عند إنشاء الاجتماع لتوليد أجندة قابلة للتحرير؛ Projects يستهلك القوالب كمرجع. إثبات exact source backlink من Task إلى اجتماع Knowledge الأصلي ما زال مطلوبًا.
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
1. **مسار إنشاء معاملة Finance:** مكتمل برمجيًا؛ Project Finance يمرر `projectRef` إلى Finance Transactions، وFinance يجهز النموذج باستخدام الملف المالي المملوك له ثم يستخدم `fin_post_transaction_with_splits` و`fin_project_transaction_link`. المتبقي هو القبول الحي من الواجهة/RPC.
2. حسم D-02: هل لكل Project ملف Finance نشط أساسي واحد، أم اختيار Primary Profile صريح؟ لا تضف Unique constraint قبل جرد التكرارات والقرار.
3. حُسم D-10 ونُفّذ handoff أولي: Projects يمرر الميزانية المقترحة والعملة وتاريخ تحديث المصدر إلى Finance، ولا تُحفظ القيمة قبل تأكيد صريح داخل Finance. اختلاف العملة يمنع النقل التلقائي، ولا توجد مزامنة لاحقة. يلزم اختبار migration/واجهة/RPC.
4. حالات Not Linked / Linked / Multiple / Error / Permission Denied / Currency Mismatch / Stale موجودة؛ عقد Finance sync صريح `fin_projects_sync_get` يعيد `as_of`, `last_synced_at`, `sync_status`. QA أكد أن Finance read role يستلم Fresh metadata.
5. Attribution للحركات المالية ومصدر Finance وحالات العملة/القيم غير المقيمة ظاهرة؛ Finance sync metadata أصبح عقدًا versioned ومستهلكًا في Projects وFinance UI. صلاحيات السحب تمسح Snapshot المحفوظ بدل عرضه كـStale.
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

## 4. حالة قرارات المنتج D-01 إلى D-12

**D-02 إلى D-12 حُسمت وسُجلت في `decision-log.md`؛ لم تعد قرارات معلّقة.** اعتماد الواجهة النهائي لـD-01 يظل ضمن بوابة التصميم، وليس سببًا لإيقاف التنفيذ البرمجي.

| القرار | القرار المعتمد |
|---|---|
| D-01 | Accent موحد من Core هو `#EF9F27`؛ القبول البصري النهائي بعد مراجعة RTL والمكونات المشتركة |
| D-02 | Finance يسمح بملفات متعددة حيث يدعم نموذجه، مع اختيار Primary واحد صراحةً؛ لا One-to-One constraint |
| D-03 | Knowledge يملك الاجتماعات والموارد ومرفقاتها؛ Outputs يملك ملفات التسليم؛ Projects يملك روابطه الخارجية وبياناته الخاصة فقط |
| D-04 | Follow-up ID ثابت يصدره Knowledge؛ Projects يستخدم هوية مصدر مركبة ويمنع التكرار |
| D-05 | `knowledge_external_links` هو مرجع الربط canonical لـKnowledge↔Projects |
| D-06 | Saved Views شخصية افتراضيًا؛ Workspace sharing للـOwner/Admin؛ Core يملك التخزين وRLS |
| D-07 | Platform/Core يملك Unified Inbox وقراءة كل مستلم؛ لا Inbox محلي داخل Projects |
| D-08 | Milestone سجل مستقل لا يدخل في Task progress |
| D-09 | Arabic-first/RTL في V1؛ اختيار اللغة ودوامها من Core |
| D-10 | نقل أولي مقترح للميزانية فقط بموافقة صريحة من Finance؛ لا مزامنة لاحقة أو تحويل عملة تلقائي |
| D-11 | موارد Knowledge تقرأ باستعلام Knowledge server-scoped، وتفشل مغلقًا إذا تعذر التحقق |
| D-12 | legacy KR/Task fields تبقى read-only؛ لا Backfill/حذف قبل reader-writer inventory وno-loss dry run |

**Demo/Sandbox:** Demo مؤقت داخل الذاكرة فقط؛ QA مشروع Supabase منفصل. لا تُنشأ مساحة Sandbox دائمة داخل Production أو جداول موازية.

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


---

## Latest implementation continuation — 2026-11-14 (بعد دفعة Finance/Inbox/Discovery)

**هذه الإضافة هي الحالة الأحدث للميزات والقرارات؛ لا تغيّر بوابات الاعتماد النهائية.**

### ما نُفذ على فرع PR #188

- **Finance Sync:** Migration `20261114250000_finance_project_sync_read_model.sql` أضافت `fin_projects_sync_get` من Finance-owned read model. Project Finance وPortfolio وFinance Projects تعرض `as_of` و`last_synced_at` وحالة Fresh/Stale. انقطاع الشبكة يحتفظ بآخر Snapshot ناجح؛ لكن عند رفض Finance للصلاحية يتم مسح البيانات المخزنة فورًا ولا تعرض كـStale.
- **Finance Primary Profile:** إصلاح التحقق في `fin_project_primary_set`: `fin_projects_get` يعيد JSONB array واحدًا، وليس SETOF. Migration مطبقة على QA، وتظل علاقة Primary اختيارًا صريحًا بلا uniqueness constraint على بيانات تاريخية لم تُجرد بالكامل.
- **Unified Inbox:** Platform يعرض Core notifications مع عدّاد غير المقروء، تحديث دوري، mark-read، mark-all-read وDeep Links للسجل الأصلي في Projects/Knowledge. RLS وemit يتحققان من السجل المصدر ومن كل Project داخل `project_ids` قبل إظهار الإشعار.
- **Scheduled Automations:** Core-owned worker يغطي Due/Soon/Overdue Tasks، Project Target Dates، Health Red/Orange، High Risks، Critical Issues، PRD Review، Output Review، Discovery Triage، Contact Follow-ups، Weekly Review Draft وKR Check-in. الـCron يستيقظ كل دقيقة، لكن wrapper سريع لا يشغّل مسح البيانات إلا إذا حان وقت التذكير المحلي لمساحة عمل. إعدادات Automations واحترام خصوصية المصدر والمشاريع المرتبطة جزء من مسار الإنشاء.
- **Published Updates:** نشر Stakeholder Update يرسل إشعارًا مركزيًا لقائد المشروع وأعضائه؛ المصدر الأصلي يظل Update داخل Projects.
- **Discovery traceability:** إضافة عنوان/رابط المصدر الأصلي وObjective references، مع تحقق UI وDB من وجود الهدف ومن مسار Objective→KR→Project. تحويل Discovery إلى Task/PRD/Issue/Project يظل ذريًا ويحافظ على المصدر؛ لا يُضاف Task→Objective مباشر.
- **Demo/Sandbox:** Demo يستخدم store مؤقتًا في الذاكرة؛ Finance فيه read-only ولا تُرسل منه Notifications إلى Core. QA منفصل؛ لا توجد طبقة Sandbox دائمة تختلط ببيانات Production.
- **Knowledge Resources:** Project Resources تعرض Knowledge rows عبر server-scoped query، وعند الطلب تحمل مرفقات Knowledge عبر signed links قصيرة العمر؛ ملفات Outputs تبقى في Output Storage، وروابط المشروع الخارجية تظل Projects-owned. لا يتم نسخ المرفقات إلى Projects.
- **Saved Views D-06:** الحفظ الشخصي والتطبيق والتحديث والحذف موجودة في Core adapter؛ Workspace sharing للـOwner/Admin فقط، مع RLS يمنع عضو Projects العادي من إنشاء/تعديل/حذف Shared View ويحافظ على creator identity.

### أدلة QA المعزول

تم تطبيق المigrations التالية على مشروع QA `lvtnyepemoqgmehdqark` فقط: Milestone integrity/batch/purge، Core Saved Views، Finance Primary Profile، Core Notifications، Finance Sync read model، Discovery Traceability، Daily Automations، Governance access mapping، Cron schedule gate، Saved Views manager permissions وhelper ACL.

- تشغيل Finance sync تحت حساب QA member أعاد `sync_status=fresh` و`as_of` و`last_synced_at` و`contract_version=1`.
- اختبار Saved Views بحسابين أثبت Personal owner CRUD، رفض Shared View للعضو العادي، وقبول Shared View CRUD لمالك المساحة. نفذت الحالات داخل Transaction ثم `ROLLBACK`.
- اختبار Automation أنشأ إشعار `task_due_today` لمهمة اختبارية للمستلم الصحيح، ثم تحقق من أن الـfixture والـnotification لم يتركا أي بيانات بعد `ROLLBACK`.
- فحص Cron أكد أن `os_hub_projects_daily_notifications` active بجدول `* * * * *`، وأن schedule gate يرجع دون مسح البيانات خارج وقت التذكير المحلي.
- أضيفت عقود JS إلى `npm test` لـSaved Views permissions وDaily Automations وFinance Sync، بالإضافة إلى Demo isolation وDiscovery traceability. لم أشغّل بعد suite القبول النهائي على آخر Head.

### ما لا يزال مفتوحًا (لا يُغلق بمجرد إضافة الواجهة)

1. اختبارات واجهة حية كاملة لإنشاء/تعديل/أرشفة/استعادة كل الكيانات، وكل Backlinks بعد Reload.
2. رفع وتنزيل ملفات حقيقية في Outputs وTask Sheet، وفشل Storage upload ثم retry عبر نفس `object_path`، واختبار Storage RLS بحساب مسموح وآخر ممنوع.
3. اختبار الحسابات الثلاثة وصلاحيات Private Projects في Preview بعد التحقق من وجهة Supabase الفعلية؛ لا تكتب من Preview ما لم يثبت أنه QA.
4. قبول Mobile/Tablet/RTL/Keyboard/Screen Reader/Contrast وBrowser Back/Deep Links.
5. اختبار Offline queue وConflict resolution على واجهة فعلية، وPerformance لتسلسل 5,000 Task.
6. جرد Readers/Writers ومسارات KR/Task القديمة، dry-run no-loss، backup/restore وrollback rehearsal؛ لا حذف أو Backfill تاريخي في هذه الدفعة.
7. مراجعة final Activity/Wins/Updates/Weekly Review دورة البيانات والروابط من Global وProject context.
8. CI/Preview النهائي للـhead الحالي، ثم فقط الانتقال إلى Phase 7 acceptance؛ لا merge ولا Production migration/deploy بدون موافقة صريحة.

**الحالة:** Features batch مستمر / QA SQL المحدد ناجح / Projects OS v5 ما زال PARTIAL وNOT APPROVED. PR #188 يظل Draft.

