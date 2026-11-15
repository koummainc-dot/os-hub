# 11 — قاموس الحقول والنماذج والإجراءات في Projects OS

هذا الملف هو الطبقة الأكثر حرفية فوق دليل التشغيل.  
لكل نموذج نحدد: **الحقل → نوعه → هل هو مطلوب → مثال تعبئة → ماذا يربط → ماذا يفعل بعد الحفظ**.

> لا نضع قيمة أو validation غير مثبتة في المصدر. عندما يكون الخيار من lookup نكتب "حسب lookup الحالي" بدل اختراع قائمة جديدة.

---

## A. Project Form

المصدر التشغيلي: ProjectForm في parts.jsx.

| الحقل | النوع | مطلوب | مثال | الاستخدام |
|---|---|---|---|---|
| name | نص | نعم | Content OS MVP | اسم المشروع |
| type | select | نعم | Product | نوع المشروع حسب project_type lookup |
| priority | select | نعم | High | أولوية المشروع |
| start_date | date | لا | 2026-11-15 | بداية التنفيذ |
| target_date | date | لا | 2026-12-15 | الموعد المستهدف |
| lead_id | select | نعم في النموذج | مصطفى | قائد المشروع |
| visibility | select | نعم | workspace | نطاق الرؤية |
| final_goal | textarea | لا | إطلاق MVP قابل للاستخدام | النتيجة النهائية |
| description | textarea | لا | بناء Content OS... | شرح المشروع |
| budget_planned | number | لا | 10000 | الميزانية المخططة |
| budget_currency | نص | لا | EGP | عملة الميزانية |

### مثال تعبئة كامل

~~~
name = Content OS MVP
type = Product
priority = High
start_date = 2026-11-15
target_date = 2026-12-15
lead_id = مصطفى
visibility = workspace
final_goal = إطلاق MVP قابل للاستخدام
description = بناء أول نسخة من Content OS
budget_planned = 10000
budget_currency = EGP
~~~

### بعد Save

يُستدعى مسار saveProject canonical. عند إنشاء مشروع جديد يفتح Project Workspace الخاص بالسجل المحفوظ.

---

# B. Task Form

المصدر: TaskForm في parts.jsx.

| الحقل | النوع | مطلوب | مثال |
|---|---|---|---|
| title | نص | نعم | تنفيذ Content Brief |
| project_id | select | نعم | Content OS MVP |
| priority | select | نعم | High |
| due_date | date | لا | 2026-11-22 |
| status | select | نعم | In Progress |
| parent_task_id | select | لا | التطوير |
| cancelled_reason | نص | مشروط | السبب عند Cancelled |
| planning_bucket | select | لا | This Week |
| assignee_id | select | لا | مصطفى |
| estimated_minutes | number | لا | 180 |
| prd_id | select | لا | Content OS MVP PRD |
| prd_requirement_id | select | لا | R1 — Content Brief |
| discovery_ids | multi | لا | Discovery-003 |
| blocked | bool | لا | true |
| blocked_reason | نص | مشروط | API غير جاهز |
| description | textarea | لا | شرح التنفيذ |
| result_note | textarea | لا | رابط/نتيجة |
| custom_label | نص | لا | Feature Area |
| custom_url | URL | لا | رابط المرجع |

### قواعد مهمة

- project_id صريح.
- parent والchild يجب أن يكونا داخل نفس المشروع.
- PRD يجب أن يكون داخل نفس المشروع.
- Requirement يجب أن ينتمي إلى PRD المختار.
- عند Cancelled يصبح cancelled_reason مطلوبًا.
- المهمة الأب لا تعبأ كـLeaf Task؛ بعض قيمها مشتقة من الأبناء.
- assignee لا يُورّث تلقائيًا من الأب.

### مثال

~~~
title = تنفيذ Content Brief
project_id = Content OS MVP
priority = High
due_date = 2026-11-22
status = In Progress
planning_bucket = This Week
assignee_id = مصطفى
estimated_minutes = 180
prd_id = Content OS MVP PRD
prd_requirement_id = R1
discovery_ids = [Discovery-003]
blocked = false
~~~

---

# C. Output Form

المصدر: OutputsView في entities.jsx.

| الحقل | النوع | مثال |
|---|---|---|
| name | نص، مطلوب | Content Brief v1 |
| project_id | select، مطلوب | Content OS MVP |
| type | select | UI / حسب lookup |
| task_id | select | تنفيذ Content Brief |
| prd_id | select | Content OS MVP PRD |
| prd_requirement_id | select | R1 |
| approval | select | Draft |
| url | URL | رابط Preview |
| notes | textarea | أول نسخة للاختبار |
| files | ملفات | content-brief.pdf |

### قاعدة الربط

Task وPRD وRequirement كلها تُختار من نفس project_id.

### الملفات

الواجهة الحالية تسمح بملفات متعددة وتتحقق من الملف قبل الإضافة. أنواع الملفات المقبولة في المسار الحالي تشمل:

- pdf
- jpg/jpeg
- png
- webp
- gif
- txt
- csv
- json
- zip
- docx
- xlsx
- pptx

إذا كان هناك upload_intent سابق، إعادة اختيار الملف نفسه يمكن أن تستخدم file_id/path المحفوظين.

---

# D. Risk Form

المصدر: RisksView في entities.jsx.

| الحقل | النوع | مطلوب | مثال |
|---|---|---|---|
| title | نص | نعم | API قد يتأخر |
| project_id | select | نعم | Content OS MVP |
| owner_id | select | لا | مصطفى |
| probability | number 1–5 | نعم | 4 |
| impact | number 1–5 | نعم | 5 |
| review_date | date | لا | 2026-11-25 |
| prd_id | select | لا | Content OS MVP PRD |
| mitigation | textarea | لا | تجهيز Mock API |
| mitigation_task_ids | multi | لا | TASK-17 |
| notes | textarea | لا | يحتاج متابعة |

### الحساب

~~~
score = probability × impact
~~~

### مثال

~~~
probability = 4
impact = 5
score = 20
~~~

---

# E. Issue Form

المصدر: IssuesView في entities.jsx.

| الحقل | النوع | مطلوب | مثال |
|---|---|---|---|
| title | نص | نعم | Output upload يفشل |
| project_id | select | نعم | Projects v5 |
| severity | select | نعم | High |
| owner_id | select | لا | مصطفى |
| discovered_at | date | لا | 2026-11-20 |
| task_ids | multi | لا | Repair Upload |
| description | textarea | لا | وصف المشكلة |

### عند الحل

يُفتح Form منفصل:

| الحقل | مطلوب |
|---|---|
| resolution | نعم |

مثال:

> استعادة upload intent وإعادة ربط metadata.

بعدها:

~~~
status = Resolved
resolved_at = now
resolution = النص المدخل
~~~

---

# F. Decision Form

المصدر: DecisionsView في entities.jsx.

| الحقل | مثال |
|---|---|
| title | اعتماد Supabase Storage |
| project_id | Projects v5 |
| status | Approved |
| decided_at | 2026-11-20 |
| decision_maker_id | مصطفى |
| superseded_by_id | قرار أحدث عند Superseded |
| prd_id | Outputs Upload PRD |
| related_task_ids | إعداد Storage |
| related_issue_ids | Upload metadata failure |
| related_risk_ids | Storage metadata risk |
| related_discovery_ids | Upload recovery discovery |
| rationale | لماذا؟ |
| rejected_alternatives | البدائل المرفوضة |
| expected_impact | الأثر المتوقع |

### مثال

**لماذا؟**

> نحتاج Storage مع recovery وRLS.

**البدائل المرفوضة:**

> تخزين الملفات داخل Postgres.

**الأثر المتوقع:**

> رفع الملفات مع الاحتفاظ بمرجع metadata قابل للاسترجاع.

---

# G. Discovery Form

المصدر: DiscoveryView في entities.jsx.

| الحقل | النوع | شرط |
|---|---|---|
| title | نص | مطلوب |
| type | select | lookup discoveryType |
| status | select | lookup discoveryStatus |
| impact_level | select | lookup severity |
| owner_id | select | مطلوب إذا Working On |
| project_ids | multi | اختياري |
| objective_ids | multi | اختياري لكن يجب أن تكون أهدافًا صالحة |
| source_title | نص | اختياري |
| source_url | URL | اختياري |
| dropped_reason | textarea | مطلوب عند Dropped |
| resolution_note | textarea | مطلوب عند Completed |
| description | textarea | اختياري |
| insights | textarea | اختياري |
| proposed_solution | textarea | اختياري |

### قواعد traceability

إذا تم ربط Objective بالاكتشاف، يجب أن يكون للهدف KR مرتبط بأحد مشاريع الاكتشاف.

إذا وُجد source_url يجب أن يبدأ بـ:

~~~
http://
أو
https://
~~~

### تحويل Discovery

الاكتشاف يمكن تحويله إلى:

- Task
- PRD
- Project
- Issue

لكن التحويل ليس Copy/Paste عشوائيًا.

يحفظ النظام resolution link ويمنع إنشاء نسخة من نفس النوع إذا كان الرابط موجودًا بالفعل.

---

# H. Requirement Form

المصدر: PRD detail في entities.jsx.

| الحقل | النوع | مطلوب | مثال |
|---|---|---|---|
| title | نص | نعم | المستخدم يستطيع إنشاء Content Brief |
| acceptance_criteria | textarea | نعم | يستطيع الحفظ ثم Reload دون فقد |
| priority | select | نعم | High |
| status | select | نعم | Active |

الحالات:

- Active
- Accepted
- Verified
- Deprecated

### قاعدة Verified

إذا كانت الحالة Verified، يجب أن يوجد Output نشط:

~~~
prd_requirement_id = requirement.id
approval = Final
~~~

---

# I. PRD Detail

المواصفة نفسها لا تعتمد على Form بسيط فقط.

داخل التفاصيل توجد:

### Doc

- TLDR
- أقسام PRD_TEMPLATE الحالية

### Requirements

- إنشاء Requirement
- تعديل Requirement
- إيقاف Requirement
- إنشاء Task مباشرة من Requirement

### Tasks

عرض المهام المرتبطة.

### Risks

عرض المخاطر المرتبطة.

### Decisions

عرض القرارات المؤثرة.

### Meta

- lead_id
- target_ship_date
- reviewer_ids
- kr_ids
- discovery_ids
- approvals

### إجراءات PRD

- Save
- Request Review
- Approve
- New Version
- Convert Risks to Records
- Return to Draft
- Delete عندما تسمح الصلاحية والحالة

---

# J. PRD Approval

المسار:

~~~
In Progress
   ↓
Request Review
   ↓
Ready for Review
   ↓
Reviewer approvals
   ↓
Approved
~~~

إذا كان هناك قسم مطلوب ناقص أو مراجِع مطلوب لم يوافق:

> لا يتم الاعتماد.

إذا أصبحت النسخة Approved:

> لا تُعامل كمسودة قابلة للتعديل مباشرة.

يتم إنشاء:

> New Version

عند الحاجة للتعديل.

---

# K. Update Form

المصدر: Updates في screens_c.jsx.

الحقول الأساسية عند الإنشاء:

| الحقل | مثال |
|---|---|
| project_id | Projects v5 |
| audience | Management |
| title | تحديث Projects v5 — أسبوع 47 |

النظام يستطيع بناء Draft من بيانات المشروع الحالية، مثل:

- progress
- wins
- completed tasks
- delayed tasks
- next tasks
- issues
- risks
- decisions

### Publish

عند النشر يتم حفظ snapshot يتضمن أرقامًا وحالات مرتبطة باللحظة التي نُشر فيها التحديث.

بعد Publish:

> التحديث يصبح مجمدًا.

ويمكن إضافة:

> Addendum

بدل تعديل النسخة المنشورة.

---

# L. Weekly Review

المراجعة الأسبوعية خاصة بالمستخدم افتراضيًا.

يتم إنشاء سجل الأسبوع الحالي إذا لم يكن موجودًا.

الحقول الحالية تشمل:

- rating
- energy
- what_worked
- what_stumbled
- learned
- will_change
- next_week_focus
- next_week_task_ids

### مثال

**What worked**

> إغلاق contract tests.

**What stumbled**

> Live Storage acceptance متأخر.

**Learned**

> upload intent يجب أن يبقى بعد reload.

**Will change**

> إضافة اختبار recovery قبل أي deployment.

**Next week focus**

> إغلاق release gates.

---

# M. Contacts

Contacts مخصصة للخارجيين، بينما أعضاء الفريق يظهرون في Team.

المعلومات التي تظهر في السجل تشمل:

- name
- role
- organization
- email
- phone
- last_contact_at
- follow_up_date
- project_ids

### مثال

~~~
name = Ahmed Ali
role = API Partner
organization = Vendor X
email = ahmed@example.com
follow_up_date = 2026-11-25
project_ids = [Projects-v5]
~~~

ومن الإجراءات:

> تم التواصل اليوم

وهذا يحدث last_contact_at.

---

# N. OKR

OKR يتكون من:

~~~
Objective
   ↓
KR
   ↓
Projects
   ↓
Tasks
~~~

### قاعدة مهمة من الكود الحالي

عند إنشاء Task من Objective، لا يتم اختراع project_id من Objective نفسه.

يجب أولًا ربط KR بمشروع، ثم تُشتق مشاريع المهام من KRs المرتبطة.

إذا لم يكن هناك Project مرتبط:

> اربط مشروعًا بنتيجة رئيسية أولًا.

---

# O. Project Header Quick Create

من Project Header يمكن فتح نماذج السجلات المرتبطة.

الفكرة:

~~~
Project
 ↓
＋ Task
＋ Output
＋ PRD
＋ Risk
＋ Issue
＋ Decision
＋ Resource
~~~

ويتم prefill للمشروع بدل مطالبة المستخدم باختيار مشروع مختلف دون سبب.

---

# P. Project Metrics

Metric في Overview ليس مجرد رقم.

عند الضغط عليه:

~~~
Metric
 ↓
Canonical View
 ↓
Project filter
 ↓
Exact records
~~~

مثال:

> 3 مخاطر

يفتح:

> Risks filtered to this project

وليس صفحة مخاطر عامة بلا سياق.

---

# Q. Task Actions

من Task Sheet / Task Tree توجد إجراءات مثل:

- تعديل
- إضافة مهمة فرعية
- نقل الشجرة
- جعل المهمة مستوى أعلى
- إكمال الفروع
- أرشفة
- حذف
- فتح Output
- فتح روابط السجل
- Activity
- Time

### مثال

Task:

> تنفيذ Content Brief

اضغط:

> ＋ فرعية

ثم:

> اختبار حفظ Content Brief

فتصبح:

~~~
تنفيذ Content Brief
   └── اختبار حفظ Content Brief
~~~

---

# R. Governance Actions

### Risk

- إنشاء
- تعديل
- مراجعة
- إغلاق
- إعادة فتح مع سبب
- تحويل إلى Issue
- إنشاء Mitigation Task

### Issue

- إنشاء
- تعديل
- تغيير الحالة
- Resolve مع resolution إلزامي
- إعادة فتح حسب lifecycle
- إنشاء Repair Task

### Decision

- إنشاء
- تعديل
- Supersede
- إنشاء Execution Task عند الحاجة

---

# S. Discovery Actions

- إنشاء
- تعديل
- نقل بين حالات
- تحويل إلى Task
- تحويل إلى PRD
- تحويل إلى Project
- تحويل إلى Issue
- حذف

### مثال

Discovery:

> المستخدم لا يعرف هل الملف تم رفعه أم لا.

تحويل:

> Task

ينتج:

> Improve upload state.

أو:

> Issue

إذا ثبت أن هناك عطلًا بالفعل.

---

# T. What Save Means

الحفظ ليس مجرد إغلاق Modal.

في المسار الصحيح:

~~~
Form
 ↓
Validation
 ↓
Permission check
 ↓
Reference validation
 ↓
Canonical save
 ↓
Activity / event where applicable
 ↓
View refresh
 ↓
Reload persistence test
~~~

مثال Task:

إذا ربطت Task بـPRD من مشروع مختلف، validation يرفضها.

إذا كان Requirement لا ينتمي إلى PRD:

validation يرفضها.

إذا لم يكن Project موجودًا:

validation يرفضها.

---

# U. What Reload Means

بعد Create لا نعتبر السجل محفوظًا فقط لأنه ظهر في UI.

يجب:

~~~
Create
 ↓
Reload
 ↓
Find same ID
 ↓
Check fields
 ↓
Check relations
~~~

مثال:

أنشأت Task:

> task_123

بعد Reload:

يجب أن تجد task_123 بنفس:

- title
- project_id
- prd_id
- prd_requirement_id
- due_date
- assignee_id

---

# V. Relationship Rules

## Project → Task

Task يجب أن تتبع Project.

## Task → Parent Task

الأب والابن داخل نفس Project.

## Task → PRD

PRD داخل نفس Project.

## Task → Requirement

Requirement داخل PRD المرتبط.

## Output → Task

Task داخل نفس Project.

## Output → PRD

PRD داخل نفس Project.

## Output → Requirement

Requirement داخل PRD المحدد.

## Risk → Mitigation Task

Task داخل نفس Project.

## Issue → Repair Task

Task داخل نفس Project.

---

# W. مثال خطأ يجب أن يرفضه النظام

لدينا:

Project A = Content OS

Project B = Finance OS

Task:

> تنفيذ Financial Report

إذا حاولت ربطها بـPRD من Content OS:

> يجب رفض الحفظ.

لأن:

~~~
task.project_id !== prd.project_id
~~~

وبالمثل:

Requirement من PRD آخر لا يمكن ربطها بالمهمة.

---

# X. دليل تعبئة سريع للمستخدم

### عندما تبدأ مشروعًا:

**Project**

> الاسم + الهدف + المواعيد + القائد + الرؤية.

### عندما تعرف ماذا يجب بناؤه:

**PRD**

> TLDR + أقسام المواصفة + المتطلبات.

### عندما تقسم المواصفة:

**Requirement**

> عنوان + Acceptance Criteria + Priority.

### عندما تبدأ التنفيذ:

**Task**

> ماذا + مشروع + موعد + مسؤول + PRD/Requirement إن كان مرتبطًا.

### عندما تنتج شيئًا:

**Output**

> ماذا أنتجت + Task + Requirement + Approval + file/url.

### عندما تواجه احتمالًا:

**Risk**

> احتمال + تأثير + خطة تخفيف + مراجعة.

### عندما تحدث مشكلة:

**Issue**

> شدة + وصف + إصلاح.

### عندما تتخذ قرارًا:

**Decision**

> لماذا + البدائل + الأثر + العلاقات.

### عندما تكتشف معلومة:

**Discovery**

> ماذا اكتشفت + مصدر + أثر + ما الذي ستفعله به.

---

# Y. الاختبار النهائي لكل قسم

لكي نقول إن القسم يعمل فعليًا، نحتاج إثبات:

1. Create
2. Reload
3. Edit
4. Reload
5. Relation
6. Unlink/Edit relation
7. Archive
8. Restore
9. Permission boundary
10. Error path

ولا يكفي أن يفتح Modal أو يظهر Card.

---

# Z. أهم قاعدة

**Projects OS لا يجب أن يجبرك على التفكير في قاعدة البيانات أثناء الاستخدام.**

المستخدم يفكر:

> ماذا أريد أن أنجز؟

والنظام يحول ذلك إلى:

~~~
Goal
 ↓
Project
 ↓
Plan
 ↓
Execution
 ↓
Evidence
 ↓
Governance
 ↓
Result
~~~

أما العلاقات والـIDs والـRLS والـevents فهي طبقة النظام التي تحافظ على هذه السلسلة دون إنشاء نسخ موازية.
