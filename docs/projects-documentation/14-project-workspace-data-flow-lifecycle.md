# 14 — Project Workspace Data Flow & Lifecycle Acceptance

هذا الجزء هو آخر طبقة توثيق قبل التوقف: لا يشرح أسماء التبويبات، بل يوضح **كيف تتحرك البيانات بينها** ومتى يجب أن تظهر العلاقة وماذا يجب أن يبقى بعد Reload أو Archive/Restore.

## 1. المبدأ

Project Workspace ليس مجموعة سجلات مستقلة.

المشروع هو السياق، وكل سجل متخصص يحتفظ بهويته وعلاقته بالمشروع، ثم تظهر الروابط في التبويبات الأخرى.

القاعدة:

**Create → Link → Save → Reload → Navigate → Verify**

وأي علاقة لا تعود بعد Reload لا تُعتبر علاقة مكتملة.

---

## 2. Project كـ Root Context

عند فتح Project Workspace يكون `project_id` هو السياق الأساسي.

منه يمكن إنشاء:
- Task
- Output
- PRD
- Risk
- Issue
- Decision
- Resource

ويجب ألا يؤدي إنشاء السجل من Workspace إلى فقدان هوية المشروع.

### مثال

Project:
**Projects v5 Acceptance**

ثم:
- Task: اختبار دورة البيانات
- PRD: Data Lifecycle
- Risk: فشل Storage
- Issue: Reload لا يعرض السجل
- Output: تقرير الاختبار

كلها تعود للمشروع نفسه.

---

# 3. Task Flow

المسار:

**Project → Task → Task Sheet → Output / Links / Activity**

ويمكن أن يكون:

**Parent Task → Child Task**

### عند إنشاء Task

يجب تثبيت:
- `project_id`
- العنوان
- الحالة
- الأولوية
- الموعد
- المسؤول
- parent_task_id عند الحاجة
- PRD/Requirement عند الحاجة
- Discovery IDs عند الحاجة

### بعد الحفظ

يجب أن تظهر المهمة:
- في Tasks.
- في Overview metrics.
- في My Work إذا كانت للمستخدم.
- في Today/Week وفق التاريخ والحالة.
- في Activity حسب الحدث.

### بعد Reload

يجب أن تبقى:
- الهوية.
- المشروع.
- العلاقات.
- الحالة.
- التعيين.
- التواريخ.

---

# 4. PRD → Requirement → Task → Output

هذه أهم سلسلة تنفيذية.

## PRD

يحدد ما يجب بناؤه.

## Requirement

يحدد شرطًا يمكن التحقق منه.

## Task

تقوم بتنفيذ الشرط.

## Output

تقدم الدليل أو النتيجة.

### مثال

PRD:
**Storage Acceptance**

Requirement:
> يمكن للمستخدم رفع Output واستعادته بعد Reload.

Task:
**اختبار Upload → Reload**

Output:
**Storage Acceptance Report**

### القاعدة

إذا تم إنشاء Requirement بلا Task، فهناك تعريف بلا تنفيذ.

إذا تم إنشاء Task بلا Requirement في مشروع يتطلب traceability، تظهر فجوة التتبع.

إذا تم إنشاء Output بلا Task/PRD عندما يتطلب السياق دليلًا، يصبح الدليل أقل قابلية للتفسير.

---

# 5. Risk → Mitigation → Task

المخاطر لا تنفذ نفسها.

المسار:

**Risk → Mitigation → Task**

مثال:

Risk:
**Storage RLS قد يمنع الوصول الصحيح**

Mitigation:
**اختبار owner-only access**

Task:
**تشغيل اختبار حسابين**

Output:
**RLS test evidence**

هنا ينتقل النظام من:

**احتمال → إجراء → تنفيذ → دليل**

---

# 6. Issue → Repair Task → Output

Issue تعني أن المشكلة أصبحت واقعة.

المسار:

**Issue → Repair Task → Output**

مثال:

Issue:
**المهمة تختفي بعد Reload**

Repair Task:
**إصلاح persistence**

Output:
**Persistence regression test**

عند إغلاق Issue يجب أن يكون هناك أثر يمكن مراجعته.

---

# 7. Discovery Flow

Discovery يبدأ كمعلومة غير محسومة.

المسار:

**Discovery → Resolution → Task / PRD / Decision / Issue**

مثال:

Discovery:
> المستخدم يحتاج ربط Requirement بالمهمة مباشرة.

بعد التحقق:
- إذا كان تنفيذًا → Task.
- إذا كان تغييرًا في المواصفة → PRD/Requirement.
- إذا كان اختيارًا معماريًا → Decision.
- إذا كشف خللًا → Issue.

### قاعدة

التحويل يجب أن يحافظ على مصدر Discovery، ولا ينشئ نسخة مجهولة المصدر.

---

# 8. Meeting → Follow-up → Task

Knowledge يملك الاجتماع.

Projects يملك تنفيذ المتابعة داخل المشروع.

المسار:

**Knowledge Meeting → Follow-up → Project Task**

مثال:

Meeting:
**Projects Weekly Review**

Follow-up:
> اختبار صلاحيات Viewer.

Task:
**Real two-account Viewer acceptance**

يجب الحفاظ على هوية الاجتماع المصدر حتى يمكن الرجوع إلى سبب إنشاء المهمة.

---

# 9. Objective → KR → Project → Task

المسار الأعلى:

**Objective → KR → Project → Task**

مثال:

Objective:
**Projects v5 جاهز للاعتماد**

KR:
**كل دورة البيانات الأساسية ناجحة**

Project:
**Projects v5 Acceptance**

Tasks:
- Create → Reload
- Edit → Reload
- Archive → Restore
- Permission acceptance

وبذلك يمكن الانتقال من النتيجة المطلوبة إلى العمل الفعلي.

---

# 10. Milestone ↔ Task

Milestone ليس Task.

لكنه يمكن أن يشير إلى مجموعة Tasks.

المسار:

**Milestone → Related Tasks**

مثال:

Milestone:
**Release Candidate Ready**

Tasks:
- Build.
- Contract tests.
- Browser acceptance.

Timeline يعرض الاثنين معًا عندما تكون التواريخ متاحة.

---

# 11. Overview كمشتق

Overview لا ينبغي أن يكون مصدرًا ثانيًا للبيانات.

هو يحسب ويعرض من السجلات الأصلية:

- Progress ← Tasks
- Health ← مؤشرات المشروع
- Overdue ← Tasks
- Risks ← Risks
- Issues ← Issues
- Time ← Work/Tasks
- Budget ← Project/Finance context
- Traceability ← العلاقات

لذلك إصلاح Overview يجب أن يبدأ من مصدر البيانات وليس من بطاقة العرض.

---

# 12. Timeline كمشتق

Timeline يعتمد على:

**Tasks + Milestones + Dates**

إذا لم يوجد تاريخ، لا يمكن اختراع عنصر زمني.

لذلك:

> عدم ظهور عنصر في Timeline لا يعني أن العنصر غير موجود.

يعني غالبًا أنه لا توجد بيانات زمنية صالحة لعرضه.

---

# 13. Finance Boundary

Projects يعرف المشروع والميزانية المخططة والسياق.

Finance OS يملك المال الفعلي.

المسار:

**Project → Finance OS**

ولا يجب إنشاء Ledger بديل داخل Projects.

مثال:

Project Budget:
10,000 EGP

Finance:
- Transaction 1
- Transaction 2
- Actual spend
- Reports

Projects يعرض السياق/الرابط، ولا يصبح نظامًا ماليًا ثانيًا.

---

# 14. Activity Boundary

Activity يسجل الأحداث.

مثال:

**Task created**

**Risk updated**

**Milestone archived**

لكن Activity لا يصبح مكانًا لتخزين بيانات Task أو Risk نفسها.

المصدر الحقيقي يبقى الكيان الأصلي.

---

# 15. Archive / Restore

الأرشفة ليست حذفًا.

عند Archive:
- يبقى السجل موجودًا.
- يخرج من القوائم النشطة وفق السياسة.
- تبقى هويته وروابطه محفوظة.

عند Restore:
- يعود للسياق النشط.
- يجب ألا يُنشأ سجل جديد.
- يجب الحفاظ على ID والعلاقات.

### اختبار القبول

**Create → Reload → Archive → Reload → Restore → Reload**

ثم تحقق:
- نفس ID.
- نفس Project.
- نفس العلاقات.
- ظهور السجل في السياق النشط بعد Restore.

---

# 16. Edit / Reload

أي تعديل مهم يجب اختباره هكذا:

**Create → Reload → Edit → Save → Reload**

مثال:
Task title:
**اختبار Storage**

بعد Edit:
**اختبار Storage + RLS**

بعد Reload يجب أن يظهر الاسم الجديد، وليس القيمة القديمة.

---

# 17. Navigation Acceptance

العلاقة ليست مكتملة إذا كانت موجودة في DB فقط.

يجب أن يستطيع المستخدم الوصول إليها.

مثال:

Overview → Risk

Risk → Mitigation Task

Task → Output

Output → PRD/Requirement

وبالعكس عندما يوفر UI هذا المسار.

---

# 18. Permission Boundary

نفس العلاقة يجب ألا تكسر حدود الصلاحيات.

مثال:

Owner يرى السجل.

Viewer لا يرى سجلًا Private ليس له حق الوصول إليه.

ولا يجب أن تكشف Navigation عن سجل مخفي لمجرد أن ID معروف.

---

# 19. Six Acceptance Cycles

هذه هي الدورات التي يجب تنفيذها قبل Release Acceptance:

### Cycle 1
**Objective → KR → Project → Task**

### Cycle 2
**PRD → Requirement → Task → Output**

### Cycle 3
**Risk → Mitigation → Task → Output**

### Cycle 4
**Discovery → Decision → Task**

### Cycle 5
**Issue → Repair Task → Output**

### Cycle 6
**Meeting → Follow-up → Task**

لكل دورة:

**Create → Reload → Navigate → Verify → Edit → Reload**

وعند الحاجة:

**Archive → Restore → Reload**

---

# 20. Release Gate

التوثيق وحده لا يغلق Projects v5.

الإغلاق النهائي يحتاج:

- Code
- Contract Tests
- Database Gates
- Live Data Cycle
- Relationship Acceptance
- Permissions Acceptance
- Responsive/Accessibility
- Production Verification

وبالتالي هذا الملف يحدد **ما الذي يجب إثباته**؛ ولا يعلن أن كل Release Gate قد تم اجتيازه.

---

# 21. قاعدة التشغيل المختصرة

إذا سألت:

> أين أضع هذه المعلومة؟

استخدم:

**Work → Task**

**Definition → PRD / Requirement**

**Evidence → Output**

**Potential Problem → Risk**

**Actual Problem → Issue**

**Choice → Decision**

**New Finding → Discovery**

**Major Date → Milestone**

**Goal → Objective / KR**

**Time → Work**

**Money → Finance OS**

**Communication → Meeting / Update**

**History → Activity**

ثم اربطها بالمشروع والسجل الأب المناسب.

هذه هي طبقة Data Flow الأخيرة التي تجعل Project Workspace نظامًا مترابطًا بدل مجموعة شاشات منفصلة.
