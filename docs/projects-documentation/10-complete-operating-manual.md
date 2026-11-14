# 10 — دليل التشغيل الكامل لـ Projects OS

> هذا الملف هو دليل الاستخدام التشغيلي التفصيلي لـ Projects OS.  
> الهدف ليس وصف الشاشة فقط، بل شرح **ماذا نُنشئ، لماذا، ماذا نعبئ، بماذا نربطه، ماذا يحدث بعد الحفظ، وكيف نعرف أن السجل اكتمل**.
>
> **قاعدة التوثيق:** الأمثلة أدناه أمثلة تعبئة تعليمية، وليست بيانات إنتاج. أما الحقول والقواعد المذكورة على أنها "موجودة" فهي مبنية على مسارات المصدر الحالية.

---

## 1. كيف تفكر في Projects OS؟

Projects OS ليس مجرد قائمة Projects وTasks.

هو سلسلة تنفيذ واحدة:

~~~
Objective
   ↓
KR
   ↓
Project
   ↓
PRD
   ↓
Requirement
   ↓
Task / Task Group
   ↓
Output
   ↓
Review / Approval
   ↓
Completion
~~~

وبالتوازي توجد طبقة الحوكمة:

~~~
Discovery
   ↓
Decision
   ↓
Risk / Issue
   ↓
Mitigation / Repair Task
   ↓
Output / Resolution
~~~

وطبقة التعاون:

~~~
Knowledge Meeting
   ↓
Follow-up
   ↓
Projects Task
~~~

وطبقة التكامل:

~~~
Project
   ↔ Finance
   ↔ Knowledge
   ↔ OS Events / Notifications
~~~

### القاعدة الذهبية

لا تنشئ السجل لمجرد تسجيل معلومة إذا كان هناك نوع سجل مخصص لها.

- شيء نريد تنفيذه = **Task**
- مشكلة حدثت بالفعل = **Issue**
- شيء قد يحدث = **Risk**
- قرار اتخذناه = **Decision**
- معلومة أو اكتشاف جديد = **Discovery**
- الناتج القابل للاستخدام/المراجعة = **Output**
- وثيقة متطلبات = **PRD**
- شرط قابل للاختبار داخل PRD = **Requirement**
- نتيجة استراتيجية قابلة للقياس = **KR**
- هدف أعلى = **Objective**
- تقدم/حالة = **Update**
- إنجاز مهم = **Win**
- مراجعة دورية = **Review**

---

# 2. قبل إنشاء أي شيء: حدد مكانه

اسأل بالترتيب:

1. هل هذا مرتبط بهدف؟
2. هل هو مشروع مستقل؟
3. هل هو جزء من مشروع؟
4. هل هو متطلب يجب تنفيذه؟
5. هل هو عمل تنفيذي؟
6. هل هو مشكلة أو خطر أو قرار؟
7. هل له ناتج يمكن إثباته؟

مثال:

> "نحتاج صفحة تسجيل دخول جديدة"

هذا ليس Project بالضرورة.

قد يكون:

~~~
Project: إعادة بناء تجربة المصادقة
   ↓
PRD: Authentication UX v2
   ↓
Requirement: المستخدم يستطيع تسجيل الدخول بالبريد
   ↓
Task: تنفيذ نموذج تسجيل الدخول
   ↓
Output: شاشة تسجيل الدخول النهائية
~~~

---

# 3. Project — المشروع

## الوظيفة

Project هو الحاوية التنفيذية الرئيسية التي تجمع:

- الهدف
- النطاق
- الفريق
- المهام
- المواصفات
- المخرجات
- المخاطر
- المشاكل
- القرارات
- الاكتشافات
- الاجتماعات
- الخط الزمني
- المالية المرتبطة

## متى تنشئ Project؟

أنشئ Project عندما يكون لديك **نتيجة كبيرة لها بداية ونهاية ونطاق وتنفيذ متعدد الخطوات**.

### مثال

**اسم المشروع:** إطلاق Content OS MVP

**النوع:** Product / حسب خيارات النظام المتاحة

**الأولوية:** High

**تاريخ البدء:** 2026-11-15

**الموعد المستهدف:** 2026-12-15

**قائد المشروع:** مصطفى

**الرؤية:** Workspace

**الهدف النهائي:**

> إطلاق نسخة MVP من Content OS يستطيع المستخدم من خلالها إنشاء المحتوى وإدارته ونشره.

**الوصف:**

> بناء أول نسخة قابلة للاستخدام من Content OS مع إدارة الأفكار، المحتوى، المخرجات، وجدولة النشر.

**الميزانية المخططة:** 10000

**العملة:** EGP

## ماذا يحدث بعد الحفظ؟

Project يصبح السجل الأب الذي يمكن من خلاله إنشاء أو ربط:

- Tasks
- PRDs
- Outputs
- Risks
- Issues
- Decisions
- Discovery
- Meetings
- Finance references

ويظهر في Portfolio وProject Workspace وباقي العروض التي تعتمد على نفس السجل.

## لا تكرر البيانات

لا تنشئ Project ثانيًا داخل Finance لمجرد وجود مصاريف.

Finance يحتفظ ببياناته المالية، وProjects يحتفظ بمرجع المشروع.

---

# 4. حالات Project

الحالات الموجودة في منطق النظام تشمل:

- Idea
- Planned
- In Progress
- On Hold
- Completed
- Cancelled
- Archived

### مثال انتقال صحيح

~~~
Idea
 ↓
Planned
 ↓
In Progress
 ↓
Completed
 ↓
Archived
~~~

### مثال

إذا كان المشروع:

> إطلاق Content OS MVP

ولم يبدأ العمل بعد:

**Planned**

بعد بدء التنفيذ:

**In Progress**

إذا توقف مؤقتًا:

**On Hold**

إذا اكتملت المهمة المطلوبة:

**Completed**

ثم عند إخفائه من التشغيل:

**Archived**

## قاعدة الإكمال

النظام لا يسمح بإكمال مشروع Planned مباشرة.

كما أن المشروع لا يُكمل بلا مهام، ومسار الإكمال يتعامل مع المهام المفتوحة بدل افتراض أنها منجزة.

---

# 5. Project Workspace — مركز المشروع

بعد فتح المشروع، لا تتعامل معه كصفحة واحدة.

الـWorkspace يجمع مسارات المشروع، ومنها:

- Overview
- Tasks
- Milestones
- PRDs
- Outputs
- Risks
- Issues
- Decisions
- Discovery
- Meetings
- Finance
- Timeline

وقد توجد بيانات مرتبطة أخرى ضمن المحتوى مثل Work / People / OKR / Activity.

## مثال

عند فتح:

> Content OS MVP

تستطيع الانتقال من:

**Overview → Tasks**

لمعرفة التنفيذ.

ثم:

**Tasks → PRDs**

لفهم المتطلبات.

ثم:

**PRD → Requirements**

لمعرفة شروط النجاح.

ثم:

**Requirement → Task**

لمعرفة من ينفذه.

ثم:

**Task → Output**

لرؤية الدليل الناتج.

---

# 6. Project Overview — ماذا أقرأ أولًا؟

Overview ليس مكانًا لنسخ كل البيانات.

هو طبقة قرار.

يُستخدم لمعرفة:

- هل المشروع يتحرك؟
- كم أنجز؟
- ما المتأخر؟
- ما المخاطر؟
- ما المشاكل؟
- ما المخرجات؟
- هل الموعد قريب؟
- هل هناك مشكلة حرجة؟

### مثال

مشروع:

> إطلاق Content OS MVP

يظهر:

- Progress: 62%
- 3 مهام متأخرة
- 2 مخاطر مفتوحة
- 1 مشكلة حرجة
- 5 مخرجات
- Target Date: 2026-12-15

إذا ضغطت على metric للمخاطر، يجب أن ينتقل بك إلى السجلات ذات الصلة بدل إنشاء بيانات جديدة.

---

# 7. Task — المهمة

## الوظيفة

Task هي وحدة التنفيذ.

إذا كان Project يجيب:

> ماذا نبني؟

فالـTask تجيب:

> ماذا سنفعل الآن؟

## أقل Task مفيدة

**العنوان:**

> تنفيذ نموذج تسجيل الدخول

**المشروع:**

> Authentication UX v2

**الأولوية:**

> High

**الموعد:**

> 2026-11-20

**الحالة:**

> Not Started

**المسؤول:**

> مصطفى

---

# 8. حقول Task

## الحقول الأساسية

### title

عنوان المهمة.

مثال:

> تنفيذ نموذج تسجيل الدخول

يجب أن يكون قابلًا للفهم دون فتح Project كامل.

---

### project_id

المشروع الذي تنتمي إليه المهمة.

مثال:

> Authentication UX v2

المهمة لا تكون بلا مشروع صريح وفق validation الحالي.

---

### priority

الأولوية.

مثال:

> High

---

### due_date

الموعد النهائي للمهمة.

مثال:

> 2026-11-20

---

### status

الحالة التشغيلية.

القيم الحالية تشمل:

- Not Started
- In Progress
- On Hold
- Completed
- Cancelled

---

### parent_task_id

المهمة الأب.

مثال:

~~~
Task:
إطلاق Content OS

   ├── كتابة PRD
   ├── تنفيذ الواجهة
   ├── اختبار
   └── إطلاق
~~~

كل مهمة فرعية تحتفظ بعلاقتها بالمهمة الأب عبر parent_task_id.

---

### planning_bucket

قائمة التخطيط.

مثال:

> This Week

أو:

> Inbox

بحسب خيارات النظام الحالية.

---

### assignee_id

المسؤول.

مثال:

> مصطفى

ولا يُورّث تلقائيًا من الأب حسب Form الحالي.

---

### estimated_minutes

الوقت المتوقع.

مثال:

> 180

أي 3 ساعات.

في المهمة الأب قد يكون التقدير مشتقًا من الأبناء.

---

### prd_id

المواصفة التي تنفذها المهمة.

مثال:

> Content OS MVP PRD

---

### prd_requirement_id

المتطلب المحدد داخل PRD.

مثال:

> المستخدم يستطيع إنشاء Content Brief

وهذا أقوى من مجرد ربط المهمة بالـPRD؛ لأنه يحدد **أي شرط بالضبط تنفذه المهمة**.

---

### discovery_ids

الاكتشافات التي تفسر لماذا ظهرت المهمة.

مثال:

> المستخدمون يجدون صعوبة في معرفة حالة المحتوى.

---

### blocked

هل المهمة متعطلة؟

مثال:

> نعم

---

### blocked_reason

لماذا؟

مثال:

> API الخاص بالـPublishing لم يتم توفيره.

---

### description

شرح المهمة.

---

### result_note

النتيجة السريعة أو رابط النتيجة.

---

### custom_fields

الحقول المرنة.

النظام الحالي يسمح مثلًا بـ:

- custom label
- custom URL

وتُحفظ داخل custom_fields بدل تعديل المخطط الأساسي.

---

# 9. Task hierarchy — شجرة المهام

مثال كامل:

~~~
إطلاق Content OS MVP
│
├── 1. التخطيط
│   ├── كتابة PRD
│   └── اعتماد PRD
│
├── 2. التطوير
│   ├── بناء Content Brief
│   ├── بناء Content Calendar
│   └── بناء Publishing Flow
│
└── 3. الإطلاق
    ├── QA
    ├── إصلاح المشاكل
    └── Production Release
~~~

### ماذا يحدث؟

المهمة الأب لا تحتاج أن تكون مجرد checkbox مستقل.

حالة/تقدم الأب يمكن اشتقاقه من الأبناء.

لذلك:

> لا تعدّل حالة المهمة الأب كما لو كانت Leaf Task إذا كان النظام يعتبرها Parent.

---

# 10. كيف تنشئ Task صحيحة؟

ابدأ بـ:

> ماذا يجب أن يحدث؟

بدل:

> اشتغل على المشروع.

### سيئ

> تحسين المشروع

### جيد

> كتابة acceptance criteria للـContent Brief

### أفضل

> كتابة acceptance criteria للـContent Brief وربطها بمتطلب PRD-003

الهدف أن تكون المهمة قابلة للإغلاق والتحقق.

---

# 11. PRD — المواصفة

## الوظيفة

PRD يشرح **ماذا نبني ولماذا وكيف نعرف أنه صحيح** قبل أن تتحول الفكرة إلى تنفيذ.

مثال:

**PRD:**

> Content OS MVP

**TL;DR:**

> أول نسخة من نظام صناعة المحتوى لإدارة الفكرة حتى النشر.

ثم أقسام المواصفة الموجودة في القالب الحالي.

كل قسم يُعبأ في النص المخصص له، ولا نضيف أسماء أقسام من عندنا إذا لم يثبتها القالب.

---

# 12. PRD — lifecycle

المسار:

~~~
Draft / In Progress
       ↓
Ready for Review
       ↓
Approved
~~~

وقد تصبح النسخة:

> Superseded

عند إنشاء نسخة جديدة.

## قبل طلب المراجعة

النظام يتحقق من جاهزية المواصفة.

إذا كانت أجزاء مطلوبة ناقصة، يظهر سبب الرفض بدل السماح بمرور شكلي.

## بعد Approval

النسخة المعتمدة لا تُعامل كمسودة عادية.

إذا أردت تعديلها:

**New Version**

وتُوسم النسخة السابقة وفق lifecycle الحالي.

---

# 13. Requirement — المتطلب

Requirement هو الشرط القابل للتحقق داخل PRD.

### مثال

**العنوان:**

> المستخدم يستطيع إنشاء Content Brief

**معايير القبول:**

> يستطيع المستخدم إدخال العنوان والمنصة ونوع المحتوى وحفظ السجل ثم إعادة تحميل الصفحة دون فقد البيانات.

**الأولوية:**

> High

**الحالة:**

> Active

---

# 14. لماذا Requirement مهم؟

لأن:

~~~
PRD
 ↓
Requirement
 ↓
Task
 ↓
Output
~~~

يمنع أن تكون لدينا مواصفة جميلة بلا تنفيذ.

### مثال

Requirement:

> المستخدم يستطيع إنشاء Content Brief.

Task:

> تنفيذ نموذج Content Brief.

Output:

> Content Brief UI + test evidence.

عندها يمكننا معرفة:

> هل المتطلب نُفذ؟ وما الدليل؟

---

# 15. حالات Requirement

الحالات الحالية تتضمن:

- Active
- Accepted
- Verified
- Deprecated

### قاعدة مهمة

لا يمكن اعتبار Requirement:

> Verified

بدون مخرج نهائي نشط مرتبط به وفق validation الحالي.

أي أن:

~~~
Verified Requirement
       ↓
Final Output required
~~~

---

# 16. Output — المخرج

Output ليس Task.

### Task

> تنفيذ صفحة Content Brief.

### Output

> صفحة Content Brief النهائية.

المخرج هو **الدليل أو النتيجة القابلة للاستخدام/المراجعة**.

## الحقول الأساسية الحالية

- name
- project_id
- type
- task_id
- prd_id
- prd_requirement_id
- approval
- url
- notes
- files

### مثال

**الاسم:**

> Content Brief v1

**المشروع:**

> Content OS MVP

**النوع:**

> حسب output_type الحالي

**المهمة:**

> تنفيذ Content Brief

**PRD:**

> Content OS MVP

**Requirement:**

> المستخدم يستطيع إنشاء Content Brief

**Approval:**

> Draft

**الرابط:**

> رابط Preview

**Notes:**

> أول نسخة للاختبار.

---

# 17. Output approval

المخرج يمكن أن يكون:

> Draft

ثم بعد المراجعة:

> Final

عند Final يصبح دليلًا أقوى على اكتمال العمل.

مثال:

~~~
Requirement
"المستخدم يستطيع إنشاء Content Brief"
          ↓
Task Completed
          ↓
Output Draft
          ↓
QA
          ↓
Output Final
          ↓
Requirement Verified
~~~

---

# 18. ملفات Output

النظام الحالي لا يتعامل مع الملف كاسم فقط.

هناك metadata مثل:

- file_id
- object_path
- name
- type
- size
- last-modified
- upload timestamp

وتوجد آلية upload intent/recovery.

إذا فشل الربط بعد رفع الملف، لا يجب أن نفترض أن الملف ضاع.

يظهر intent pending، وبعد reload يمكن استكمال العملية بإعادة اختيار الملف نفسه.

**لكن القبول الحقيقي لـSupabase Storage/RLS ما زال release gate منفصلًا عن هذا التوثيق.**

---

# 19. Risk — الخطر

Risk = شيء **قد يحدث**.

### مثال

> تأخر إطلاق Content OS بسبب اعتماد API خارجي.

## الحقول الحالية

- title
- project_id
- owner_id
- probability
- impact
- review_date
- prd_id
- mitigation
- mitigation_task_ids
- notes

### مثال تعبئة

**العنوان:**

> تأخر API النشر

**المشروع:**

> Content OS MVP

**المسؤول:**

> مصطفى

**الاحتمال:**

> 4 / 5

**التأثير:**

> 5 / 5

**تاريخ المراجعة:**

> 2026-11-25

**خطة التخفيف:**

> تجهيز mock API يسمح بإكمال الواجهة دون انتظار المزود.

**مهمة التخفيف:**

> إنشاء Publishing Mock API.

---

# 20. Risk score

الحساب الحالي يعتمد على:

~~~
Risk Score = Probability × Impact
~~~

مثال:

4 × 5 = 20

ويُعرض في مصفوفة 5×5.

---

# 21. Risk → Mitigation Task

لا تكتب خطة تخفيف فقط وتتركها نصًا.

إذا كانت الخطة تحتاج تنفيذًا:

**Create Mitigation Task**

مثال:

~~~
Risk
API قد يتأخر
   ↓
Mitigation
Mock API
   ↓
Task
إنشاء Mock API
   ↓
Output
Mock API يعمل
~~~

وهذا يحول الحوكمة إلى تنفيذ حقيقي.

---

# 22. Risk → Issue

إذا تحقق الخطر فعلًا، يمكن تحويله إلى Issue.

مثال:

قبل:

> احتمال تأخر API

بعد حدوثه:

> API تأخر بالفعل

المسار:

~~~
Risk
 ↓
Materialized
 ↓
Issue
~~~

والنظام يمنع إنشاء نسخة مشكلة مكررة إذا كانت هناك مشكلة مرتبطة بالفعل.

---

# 23. Issue — المشكلة

Issue = مشكلة حدثت بالفعل.

### مثال

> رفع ملف Output يفشل بعد Reload.

## الحقول التشغيلية

- title
- project_id
- severity
- status
- description
- resolution
- task_ids / روابط الإصلاح بحسب السجل

### مثال

**العنوان:**

> Output upload يفشل بعد Reload

**الشدة:**

> High

**الوصف:**

> الملف تم رفعه لكن metadata لم تكتمل بعد إعادة تحميل الصفحة.

**الحل:**

> استعادة upload intent وإعادة ربط metadata.

---

# 24. Issue → Repair Task

إذا كانت المشكلة تحتاج تنفيذًا:

> Create Repair Task

مثال:

~~~
Issue
Output upload fails
       ↓
Repair Task
Implement upload intent recovery
       ↓
Output
Contract test + successful upload
       ↓
Issue
Resolved
~~~

---

# 25. Issue lifecycle

المشكلة يمكن أن تنتقل بين حالات lifecycle وفق قواعد النظام.

عند Resolve، يوجد Form منفصل لكتابة:

> الحل — إلزامي

ولا يكفي تغيير الحالة إلى Resolved بلا تفسير.

---

# 26. Decision — القرار

Decision = قرار تم اتخاذه.

### مثال

> استخدام Supabase Storage للمخرجات.

## الحقول المهمة

- title
- project_id
- status
- decided_at
- decision_maker_id
- rationale
- rejected_alternatives
- expected_impact
- related discovery IDs
- related PRD / affected PRDs بحسب النموذج

### مثال

**العنوان:**

> اعتماد Supabase Storage

**لماذا؟**

> نحتاج Storage مرتبطًا بصلاحيات Workspace مع مسار استرجاع للرفع.

**البدائل المرفوضة:**

> تخزين الملفات داخل قاعدة البيانات.

**الأثر المتوقع:**

> تخزين ملفات أكبر مع الحفاظ على metadata داخل Projects.

---

# 27. Decision → Task

إذا كان القرار يحتاج تنفيذًا:

~~~
Decision
اعتماد Supabase Storage
      ↓
Execution Task
إعداد bucket + policies + recovery
~~~

هذا يمنع القرارات من البقاء مجرد ملاحظات.

---

# 28. Discovery — الاكتشاف

Discovery = شيء تعلمناه أو اكتشفناه أثناء العمل.

مثال:

> اكتشفنا أن المستخدم يحتاج معرفة حالة الملف حتى بعد Reload.

ثم يمكن ربط الاكتشاف بـ:

- Project
- Issue
- Task
- PRD
- Decision

### مثال

~~~
Discovery
"Upload يحتاج persistent intent"
       ↓
Decision
"نحتفظ بـ upload intent"
       ↓
Task
"Implement recovery"
       ↓
Output
"Recovery contract"
~~~

---

# 29. Meetings — الاجتماعات

الاجتماع نفسه مملوك لمسار Knowledge عند التكامل.

Projects لا يحتاج أن يصبح نسخة ثانية من Knowledge.

عندما تنتج عن الاجتماع متابعة:

~~~
Knowledge Meeting
      ↓
Follow-up
      ↓
Projects Task
~~~

ويستخدم التحويل هوية ثابتة مثل:

> source_followup_id

لمنع إنشاء Task مكررة عند إعادة إرسال الحدث.

---

# 30. مثال Meeting → Task

اجتماع:

> Product Review — 2026-11-20

متابعة:

> اختبار Output recovery

Project:

> Projects v5

Task:

> اختبار Create → Reload → Retry → Final Output

بعد التحويل:

- Task يصبح جزءًا من Projects.
- يحتفظ بمرجع الاجتماع.
- يمكن الرجوع للمصدر.
- إعادة إرسال نفس المتابعة لا تنشئ نسخة ثانية.

---

# 31. Objective — الهدف

Objective يحدد الاتجاه.

مثال:

> بناء نظام تشغيل شخصي متكامل.

لا يجب أن يكون Objective مجرد Task كبير.

هو مستوى أعلى من التنفيذ.

---

# 32. KR — النتيجة الرئيسية

KR يقيس النجاح.

مثال:

**Objective:**

> بناء نظام تشغيل شخصي متكامل.

**KR:**

> إغلاق 90% من أنظمة OS الأساسية قبل نهاية الربع.

ثم:

~~~
Objective
 ↓
KR
 ↓
Projects
 ↓
Tasks
~~~

---

# 33. Objective → KR → Project → Task

مثال كامل:

~~~
Objective:
إطلاق OS Hub قابل للاستخدام

        ↓

KR:
إغلاق Projects OS بنسبة 100%

        ↓

Project:
Projects v5

        ↓

Task Group:
إغلاق Release Gates

        ↓

Task:
اختبار Storage/RLS

        ↓

Task:
اختبار حسابين

        ↓

Task:
اختبار lifecycle

        ↓

Output:
Release Acceptance Evidence
~~~

وهذه هي السلسلة التي يجب أن تستخدم عند ربط التنفيذ بالهدف.

---

# 34. Milestones

Milestone يمثل نقطة مهمة في المشروع، وليس مجرد Task عادي.

مثال:

> PRD Approved

ثم:

> MVP Complete

ثم:

> Production Acceptance

وتظهر ضمن Workspace/Timeline وفق المسار الحالي.

---

# 35. Timeline / Calendar

هناك فرق بين:

- Task due_date
- Project target_date

### Task

> QA Storage

Due:

> 2026-11-22

### Project

Target:

> 2026-11-30

التقويم يتعامل مع target_date للمشروع، والمهام مع مواعيدها الخاصة.

---

# 36. Portfolio

Portfolio ليس مكانًا لإنشاء نسخة ثانية من Project.

هو View أعلى المستوى.

يستخدم:

- Cards
- Table
- Board
- Timeline
- Calendar
- Filters
- Search

مثال:

إذا لديك:

- Projects v5
- Content OS
- Finance OS

فالـPortfolio يعرضهم من منظور المحفظة.

وعند الضغط على مشروع:

> افتح Project Workspace الأصلي.

---

# 37. My Work

My Work هو منظور الشخص.

لا تنشئ Tasks جديدة داخله كنسخة منفصلة.

بل يعرض المهام الموجودة أصلًا حسب:

- المسؤول
- الموعد
- الحالة
- التخطيط

مثال:

> مصطفى

يرى:

- Task A — اليوم
- Task B — متأخر
- Task C — هذا الأسبوع

لكن كل Task ما زالت في Project الأصلي.

---

# 38. Today

Today هو View زمني.

ليس قاعدة بيانات جديدة.

مثال:

اليوم:

> 2026-11-20

يعرض:

- Tasks المستحقة
- Events
- Notifications
- الإنجازات/العناصر ذات الصلة

والضغط على Task يعيدك إلى السجل الأصلي.

---

# 39. Week

Week هو التخطيط الأسبوعي.

يستخدم:

- planning_bucket
- due_date
- المهام المفتوحة
- الإنجاز

مثال:

> This Week

يضم:

- إنهاء PRD
- اختبار Storage
- مراجعة Output

---

# 40. Weekly Review

Weekly Review ليس مجرد تقرير ثابت.

هو مساحة لمراجعة:

- Wins
- Done Tasks
- Overdue Tasks
- Issues
- Risks
- Decisions
- Time
- Related Projects

مثال:

> لماذا لم يتحرك Projects v5 هذا الأسبوع؟

يمكن أن تجد:

- 4 مهام منجزة
- 2 متأخرة
- Risk عالي
- Issue حرجة
- Decision جديد

فتصبح المراجعة أداة قرار.

---

# 41. Updates

Update = تحديث حالة.

مثال:

> تم الانتهاء من contract tests، وما زال live Storage acceptance متبقيًا.

لا تحول كل Update إلى Task.

إذا كان هناك عمل مطلوب:

> أنشئ Task.

---

# 42. Wins

Win = إنجاز مهم.

مثال:

> نجح أول اختبار كامل Create → Reload → Edit → Reload → Archive → Restore → Reload.

هذا ليس مجرد status.

هو milestone/achievement يمكن عرضه في المراجعة.

---

# 43. Contacts / Team

Team = الأشخاص المشاركون في Projects.

Contacts = جهات الاتصال.

لا تستخدم Contacts لتكرار User account.

إذا كان الشخص عضوًا في Workspace ويملك صلاحيات Projects، فمسار Team هو المرجع التشغيلي المناسب.

---

# 44. Permissions

الوصول ليس مجرد إخفاء زر.

Projects يعتمد على:

- OS section level
- role
- can(permission, project)

مثال:

Viewer قد يستطيع:

> مشاهدة المشروع

لكن لا يستطيع:

> إنشاء Task

لذلك:

~~~
UI hides action
+
permission check
+
server/database enforcement where applicable
~~~

ولا نعتبر إخفاء الزر وحده حماية.

---

# 45. Visibility

Project لديه visibility.

مثال:

> Workspace

يعني متاح ضمن نطاق Workspace حسب صلاحياته.

ويوجد مسار:

> Private

بحسب خيارات النموذج، ويطبق نطاق الرؤية عبر قاعدة البيانات وفق التصميم الحالي.

---

# 46. Archive vs Delete

لا تخلط بينهما.

### Archive

السجل لم يعد جزءًا من العمل النشط لكنه يحتفظ به.

### Delete

يمر عبر مسار الحذف/سلة المحذوفات بحسب السجل.

### المثال

Project مكتمل منذ سنة:

> Archive

مشكلة أُنشئت بالخطأ:

> Delete

ولا يجب استخدام CSS لإخفاء سجل على أنه "محذوف".

---

# 47. Unlink

فك الارتباط لا يعني حذف السجل.

مثال:

Task مرتبطة بـPRD.

إذا أردت إزالة PRD:

> Unlink PRD

ولا تحذف Task.

العلاقة canonical ويجب أن تمر عبر المسار الرسمي للسجل.

---

# 48. Offline

في Projects يوجد Offline queue محدود.

المسموح حاليًا:

> تعديل حقول أساسية لمهمة موجودة.

ليس المقصود:

> إنشاء كل أنواع السجلات دون اتصال.

عمليات مثل:

- إنشاء
- العلاقات
- نقل الأشجار
- الملفات
- العمليات الذرية

تحتاج اتصالًا وفق السلوك الحالي.

---

# 49. Offline Conflict

مثال:

الجهاز A:

> title = "اختبار Storage"

الجهاز B:

> title = "اختبار Storage + RLS"

ثم حصل اتصال.

النظام لا يفترض أن يكتب نسخة واحدة فوق الأخرى تلقائيًا.

إذا كان هناك تعارض:

- يعرض Server version
- يعرض Local version
- يسمح بدمج الحقول غير المتعارضة
- أو تجاهل المحلي والعودة لنسخة الخادم

---

# 50. Deep Links

يمكن فتح:

- Project
- Project Tab
- Task
- Record Focus

مثال:

> افتح Project X → Tasks → Task Y

ويجب أن يفتح السجل الصحيح بدل العودة إلى Dashboard.

Browser Back يعيد المستخدم للمسار السابق.

---

# 51. Notifications / Automations

الأتمتة ليست قاعدة بيانات مستقلة.

هي أحداث مشتقة من المصدر المركزي.

أمثلة التغطية الحالية تشمل:

- Task due
- Task soon
- Task overdue
- Project target/update due
- PRD review
- Output review
- Meeting follow-up
- Contacts follow-up
- Weekly review
- Health transition
- High-risk review
- Long-running timer
- Integration failure/staleness

لكن يجب التفريق بين:

**Contract verified**

و:

**Live production acceptance**

---

# 52. Finance Integration

Projects لا يصبح Finance.

إذا كان للمشروع أثر مالي:

~~~
Projects Project
      ↓
Finance Project Reference
      ↓
Finance-owned financial records
~~~

Finance يملك:

- Transactions
- Financial profile
- Ledger/financial truth

Projects يملك:

- project execution
- budget planned/reference
- project context

---

# 53. Knowledge Integration

Knowledge يملك:

> Meeting

Projects يستهلك:

> Follow-up Task

وبالتالي لا نكرر الاجتماع في Projects ككيان مستقل غير مرتبط.

---

# 54. مثال كامل من البداية للنهاية

## السيناريو

نريد إطلاق:

> Content OS MVP

### Step 1 — Objective

> بناء نظام صناعة محتوى قابل للاستخدام.

### Step 2 — KR

> إطلاق MVP قبل 2026-12-15.

### Step 3 — Project

**Name:** Content OS MVP  
**Priority:** High  
**Start:** 2026-11-15  
**Target:** 2026-12-15  
**Lead:** مصطفى  
**Goal:** إطلاق MVP.

### Step 4 — PRD

**Title:** Content OS MVP PRD

يتم تعبئة الأقسام المطلوبة في القالب.

### Step 5 — Requirements

**R1**

> المستخدم يستطيع إنشاء Content Brief.

Acceptance:

> إنشاء السجل، حفظه، Reload، وظهوره دون فقد البيانات.

**R2**

> المستخدم يستطيع متابعة المحتوى من التخطيط إلى النشر.

### Step 6 — Tasks

~~~
Content OS MVP
│
├── كتابة PRD
├── تنفيذ Content Brief
├── تنفيذ Content Calendar
├── تنفيذ Publishing Flow
├── QA
└── Production Acceptance
~~~

### Step 7 — ربط Task

Task:

> تنفيذ Content Brief

ترتبط بـ:

- Project
- PRD
- Requirement R1

### Step 8 — Output

> Content Brief v1

يرتبط بـ:

- Project
- Task
- PRD
- Requirement R1

### Step 9 — QA

إذا نجح:

> Output = Final

ثم:

> Requirement = Verified

### Step 10 — Completion

عندما لا توجد Leaves مفتوحة، يتم اتخاذ قرار الإكمال.

### النتيجة

لدينا Traceability كاملة:

~~~
Objective
 ↓
KR
 ↓
Project
 ↓
PRD
 ↓
Requirement
 ↓
Task
 ↓
Output
 ↓
Verification
 ↓
Project Completion
~~~

---

# 55. مثال Governance كامل

المشروع:

> Projects v5

Discovery:

> Upload recovery يحتاج intent دائم.

Decision:

> حفظ upload intent قبل/حول Storage.

Risk:

> قد يفقد المستخدم الملف بعد فشل metadata.

Mitigation:

> Retry باستخدام file_id/object_path.

Task:

> تنفيذ recovery.

Output:

> Contract test.

Issue:

> Upload metadata فشل بعد Reload.

Repair Task:

> إصلاح retry.

Output:

> اختبار ناجح.

Issue:

> Resolved.

Requirement:

> Verified.

هذه هي الطريقة الصحيحة لاستخدام Governance كجزء من التنفيذ، وليس كـnotes منفصلة.

---

# 56. مثال PRD كامل

## PRD

> Projects Outputs Upload

### TL;DR

> السماح للمستخدم بإرفاق ملفات بالمخرجات مع recovery بعد فشل جزئي.

### Requirement

> يمكن للمستخدم اختيار ملف وربطه بالمخرج.

### Acceptance

> بعد Reload يظهر الملف أو intent pending ولا تضيع هوية الرفع.

### Task

> Implement upload intent recovery.

### Output

> Recovery contract test.

### Risk

> Storage success + metadata failure.

### Decision

> الاحتفاظ بـfile_id/object_path.

### Discovery

> إعادة اختيار نفس الملف يمكن أن تستعيد intent.

وهنا نرى أن **كل عنصر له مكانه**.

---

# 57. ماذا تعبئ في كل نوع؟ — مرجع سريع

| النوع | السؤال الذي يجيب عنه | مثال |
|---|---|---|
| Objective | لماذا؟ | بناء OS Hub |
| KR | كيف نقيس النجاح؟ | 90% إغلاق |
| Project | ماذا سننجز كنطاق؟ | Projects v5 |
| Milestone | ما نقطة الإنجاز؟ | PRD Approved |
| PRD | ماذا نبني ولماذا؟ | Projects v5 PRD |
| Requirement | ما الشرط القابل للاختبار؟ | المستخدم يستطيع رفع ملف |
| Task | ماذا سنفعل؟ | Implement upload |
| Output | ماذا أنتجنا؟ | Recovery Test |
| Discovery | ماذا اكتشفنا؟ | intent مطلوب |
| Decision | ماذا قررنا؟ | حفظ intent |
| Risk | ماذا قد يحدث؟ | metadata failure |
| Issue | ماذا حدث؟ | upload failed |
| Update | ما الحالة الحالية؟ | recovery implemented |
| Win | ما الإنجاز المهم؟ | test passed |
| Meeting | أين تمت المناقشة؟ | Product Review |
| Review | ماذا راجعنا؟ | Weekly Review |

---

# 58. أخطاء الاستخدام التي يجب منعها

## خطأ 1

إنشاء Task:

> مشكلة في Storage

الصحيح:

> Issue: Storage failure

ثم:

> Repair Task: Fix Storage failure

---

## خطأ 2

كتابة Requirement داخل Description فقط.

الصحيح:

> PRD → Requirement

---

## خطأ 3

إغلاق Requirement كـVerified بدون Output Final.

هذا مرفوض في المسار الحالي.

---

## خطأ 4

إنشاء Project جديد لكل View.

Portfolio وMy Work وToday ليست Projects جديدة.

---

## خطأ 5

تكرار Finance data داخل Projects.

Projects يحتفظ بمرجع/سياق المشروع.

Finance يحتفظ بالبيانات المالية.

---

## خطأ 6

تحويل Risk إلى Issue بدون تسجيل التحول.

المسار الحالي يدعم التحويل وربط المشكلة الناتجة.

---

## خطأ 7

إنشاء Task من Knowledge Meeting عدة مرات.

استخدم الهوية الثابتة للـfollow-up لمنع duplicate.

---

# 59. دورة العمل المثالية

عند بدء مشروع جديد:

~~~
1. Objective
2. KR
3. Project
4. PRD
5. Requirements
6. Tasks
7. Risks
8. Decisions
9. Outputs
10. QA
11. Review
12. Completion
13. Archive
~~~

لكن ليس كل مشروع يحتاج كل نوع سجل.

استخدم السجل عندما توجد حاجة حقيقية له.

---

# 60. Release Acceptance

لا نعتبر Projects مكتملًا لمجرد أن الواجهات تعمل.

يجب إثبات:

### Data lifecycle

~~~
Create
 ↓
Reload
 ↓
Edit
 ↓
Reload
 ↓
Archive
 ↓
Restore
 ↓
Reload
~~~

### Relationship lifecycle

~~~
Objective
 ↓
KR
 ↓
Project
 ↓
Task
 ↓
PRD
 ↓
Requirement
 ↓
Output
~~~

### Governance lifecycle

~~~
Risk
 ↓
Mitigation Task
 ↓
Output
 ↓
Review
~~~

### Cross-OS lifecycle

~~~
Knowledge Meeting
 ↓
Follow-up
 ↓
Projects Task
~~~

و:

~~~
Projects Project
 ↓
Finance Reference
 ↓
Finance-owned data
~~~

---

# 61. ما الذي لا ندّعي أنه Verified بعد؟

حتى مع اكتمال هذا الدليل، لا يعني ذلك أن كل release gate أصبح مقبولًا.

ما زال يجب إثباته بشكل حي عندما لا يوجد دليل كافٍ:

- Real Supabase Storage/RLS acceptance
- Real multi-account privacy
- Responsive/mobile/tablet
- RTL/accessibility acceptance
- migration reconciliation/no-loss
- backup/rollback
- offline/conflict acceptance النهائي
- production acceptance
- Vercel Preview acceptance عند توفر quota

التوثيق لا يحول هذه الأشياء إلى "Verified" تلقائيًا.

---

# 62. قاعدة Single Source of Truth

أي معلومة تشغيلية يجب أن يكون لها مالك واحد.

### Projects

يملك:

- Projects
- Tasks
- PRDs
- Requirements
- Outputs
- Risks
- Issues
- Decisions
- Discovery
- Project execution context

### Knowledge

يملك:

- Meetings
- Knowledge records

### Finance

يملك:

- Financial records

### Projects يربط، ولا يكرر.

---

# 63. الخلاصة العملية

إذا سألك شخص:

> "أنا عندي فكرة جديدة، أعمل إيه؟"

الجواب:

1. حدد Objective/KR إن كان لها هدف استراتيجي.
2. أنشئ Project إذا كانت مبادرة حقيقية.
3. اكتب PRD إذا كان هناك نطاق/متطلبات تحتاج توثيقًا.
4. قسّم PRD إلى Requirements.
5. أنشئ Tasks لكل عمل حقيقي.
6. اربط كل Task بالـProject.
7. اربطها بالـPRD/Requirement عندما تنفذ متطلبًا.
8. أنشئ Risks لما قد يحدث.
9. أنشئ Issues لما حدث.
10. سجّل Decisions للقرارات المهمة.
11. سجّل Discoveries للاكتشافات.
12. اربط Outputs بالأعمال التي أنتجتها.
13. اجعل Output Final دليلًا على الإنجاز.
14. استخدم Reviews وUpdates وWins لمتابعة التقدم.
15. لا تنشئ نسخًا موازية من Finance/Knowledge.
16. اختبر Create → Reload → Edit → Reload قبل اعتبار السجل موثوقًا.

**بهذه الطريقة Projects OS يصبح نظام تشغيل للمشروع، وليس مجرد Task Manager.**
