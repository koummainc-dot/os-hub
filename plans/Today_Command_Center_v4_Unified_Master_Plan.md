# 📅 Today / Command Center — خطة العمل الموحّدة والكاملة (الإصدار 4.0)

**الغرض:** وثيقة بناء **مكتفية بذاتها** لشاشة القيادة اليومية (ويب + موبايل + ودجت، عربي RTL، تعمل أوفلاين) التي تجيب عن سؤال واحد: **ما الذي يحتاج انتباهي أو فعلي اليوم؟** — بربط **ثمانية أنظمة**: **Habit OS · Learning · Home · Knowledge (الاجتماعات والفعاليات) · Projects OS · Finance OS · Content OS · Sports OS**، عبر **عقود API/Events فقط**، **بلا أي قاعدة بيانات للنطاق**.

> **هذه الوثيقة تحلّ محلّ الملفين السابقين** (Independent Build Spec v2.0 EN + وثيقة البناء المستقلة v3.0 AR). كل بند فيهما موجود هنا (**مصفوفة التغطية في §20**) مع حسم تعارضاتهما وسد فجواتهما. لا يُرسَل الملفان القديمان مع هذه الوثيقة.

> **ملاحظة تفسير:** رسالتك الأخيرة وردت بلوحة مفاتيح مختلفة ("بشهىهؤث خس")، وقرأتها **Finance OS** (وهو ما يوافق وجود Finance Module فعليًا في Notion). إن كنت تقصد غير ذلك فأخبرني.

**ما دخل في المراجعة:**
1. صفحة **📅 اليوم (Today) — كل أنظمتي** في Notion بكل ما تحويه (سبع Linked Views) وما كُتب عنها في دليل Projects OS.
2. أنظمة المصدر كما في Notion: **Habit OS** (دليل كامل + قاعدة السجل اليومي)، **Learning** و**Home** و**Knowledge** و**Projects**، و**Finance Module** (Ledger/Recurring/Debts/Goals/Categories…)، وصفحة **Personal & Business OS**.
3. الملفان المرفوعان (EN v2.0 + AR v3.0).
4. خطط **Projects/Home/Learning/Knowledge v4.0** (عقود الـ feeds والأحداث الفعلية).

**المرجع الأعلى عند التعارض:** هذه الوثيقة ← سلوك Notion الفعلي ← الملفان القديمان. (التعارضات في **§21** والفجوات والتحسينات في **§22**.)

> **مفاتيح القراءة:** `TF-xx` ميزة محفوظة · `TC-xx` تعارض محسوم · `TG-xx` فجوة مسدودة · `TE-xx` تحسين مضاف · `TD-xx` قرار يحتاج تأكيدك · `TV-xx` قاعدة تحقق · `TA-xx` أتمتة · `TT-xx` اختبار قبول · `AR-xx` قاعدة Attention.

---

## 1) المراجعة الكاملة لـ Today في Notion

### 1.1 ما الموجود فعليًا
- صفحة واحدة: **"📅 اليوم (Today) — كل أنظمتي"** بوصف: *"كل قسم هو View حيّ من قاعدة النظام المعني"* وعلامة **"جاري بناء الأقسام…"** (أي أنها **غير مكتملة**).
- **سبع Linked Views** فقط، كلها Views ثابتة على قواعد الأنظمة:
  | View | قاعدة المصدر |
  |---|---|
  | عادات اليوم | ⚡ السجل اليومي (Habit OS) |
  | دروس اليوم | 🎥 الدروس (Learning) |
  | حالة الدراسة والسلسلة | 🎛️ لوحة التعلّم (Learning) |
  | مهام البيت المفتوحة | 🧹 مهام البيت (Home) |
  | اجتماعات اليوم | 🤝 الاجتماعات (Knowledge) |
  | مهام المشاريع المفتوحة | 📌 المهام الهرمية (Projects) |
  | المشاريع التي تحتاج انتباه | 🚀 المشاريع (Projects) |
- **لا يوجد:** قسم Finance، ولا Content، ولا **Attention** كقائمة موحّدة، ولا أي إجراء (Actions)، ولا ترتيب بين الأنظمة، ولا تذكير.

### 1.2 قواعد Today كما يشرحها دليل Projects OS (محفوظة)
"Views ثابتة لا تضيف مشاريع/مهام جديدة تلقائيًا: أي إضافة في القواعد الأصلية تظهر هنا تلقائيًا" · كل قسم View حيّ من القاعدة الأصلية · **لا نسخ** للبيانات.

### 1.3 اكتشافات مهمة من المراجعة
1. **Today في Notion Views ثابتة لا خدمة**: لا فلتر على الصيغ (لا "متأخرة فقط")، ولا "اليوم" نسبي حقيقي (يحل بترتيب أو فلتر يدوي)، ولا تجميع عبر الأنظمة. التطبيق يحتاج **خدمة تجميع** (TC-01).
2. **ازدواج التعريف:** "مهام البيت المفتوحة" في Notion تشمل **المتكررة المفتوحة دائمًا** (فتغرق الشاشة)، بينما خطة Home تعرض **المستحق/المتأخر فقط** (TC-16).
3. **عقود الـ feeds التي كتبتُها في الخطط الأربع غير موحَّدة**: مسارات مختلفة (`/feeds/today` غير مسبوقة بنظام في Projects سابقًا، `/home/feeds/today`, `/learning/feeds/today`, `/knowledge/feeds/today`) وأسماء حقول متفاوتة (`id`/`kind`/`due_date`+`due_time`/`actions[]`) → يلزم **عقد قانوني واحد** (TC-03).
4. **أسماء الأحداث في مواصفة Today (`meeting.updated`, `maintenance.due`, `project.task.completed`…) لا تطابق الأحداث الفعلية** في الخطط (`knowledge.meeting.*`، `home.task.*`، `task.completed`…)، و**Habit/Finance/Content بلا أحداث معرَّفة** بعد (TC-04).
5. **Habit OS كما في Notion:** مكتبة عادات بمستويات (🎯 نمو 3–5 / 🔵 صيانة / ⚙️ تلقائي / 🟡 مؤجلة)، سجل يومي بحالات (✅ تم / 🟡 جزئي / ❌ فائت / ⏸️ إجازة)، سلسلة (بسقف 120)، أيام نظيفة للعادات السيئة، تركيز أسبوعي، يوميات، كتب. **لا يوجد Feed ولا أحداث.**
6. **Finance Module موجود فعليًا** (Ledger، Recurring بتاريخ الدفعة التالية وزر "Log Payment"، Debts بـ"Status Check"، Goals بـ"Reached Target؟"، Categories بميزانية شهرية، Exchange Rates وNet Worth History بتذكيرين شهريين)، وكل تنبيهاته اليوم **يدوية** (Remind على كل صف).
7. **Content OS غير موجود في Notion** (لا صفحة ولا قواعد)؛ يوجد مشروع "Personal Content/YouTube" داخل Projects (Master) فقط، وعلاقات "المحتوى/حسابات المحتوى" في المجالات. لذلك **عقد Content في هذه الوثيقة مُلزِم لخطته المستقبلية** وليس مستخرَجًا من نظام قائم.
8. **يوجد "نظام اللياقة بتاعي" في Notion** (تدريب منزلي 12 أسبوعًا) لم تذكره في قائمة الربط؛ عقد المصادر هنا يسمح بإضافته كمحوّل اختياري (TD-07).
9. **ما لم أستطع قراءته:** أكواد صيغ Habit OS نفسها (اعتمدت على نصها في الدليل)، ولم أفتح خطط Habit/Finance/Content لأنها **لم تُكتب بعد** (أحدّد عقودها هنا).

### 1.4 حكم على كل عنصر
| العنصر | الحكم | القرار |
|---|---|---|
| Linked Views الثابتة | **استبدال** | خدمة تجميع + Snapshot مُنمَّط |
| سبعة أقسام | **توسيع** | Habits · Learning · Home · Meetings · Projects · **Finance · Content** + Attention |
| "مهام مفتوحة" | **تعديل** | المخطَّط لليوم في الأقسام، والمتأخر/الحرج في Attention (§6.3) |
| "المشاريع التي تحتاج انتباه" | **دمج** | يصبح جزءًا من Attention (صحة حمراء/برتقالية…) |
| لا إجراءات | **إضافة** | ActionDescriptor + Router (أوامر للأنظمة المالكة) |
| لا تذكيرات | **إضافة** | ملخص صباحي اختياري؛ التذكيرات الفردية تبقى عند المالك |

---

## 2) جرد ميزات Today المطلوبة (كلها محفوظة)

| ID | الميزة | أين تتحقق |
|---|---|---|
| TF-01 | سؤال واحد: ما الذي يحتاج انتباهي اليوم؟ — بلا ملكية للسجلات | §3 |
| TF-02 | لا جداول `today_*` إطلاقًا | §3.4 |
| TF-03 | Habits: 3–5 عادات تركيز، تسجيل بنقرة، السلسلة | §5.1 |
| TF-04 | Learning: دقائق اليوم، الهدف/الحد الأدنى، الدرس التالي/الحالي، السلسلة | §5.2 |
| TF-05 | Home: مهام عاجلة وصيانة مستحقة/متأخرة | §5.3 |
| TF-06 | Meetings: جدول اليوم، التفاصيل، رابط الانضمام | §5.4 |
| TF-07 | Projects: المستحق اليوم، المتأخر، الإجراءات التالية | §5.5 |
| TF-08 | Attention: متأخر/مستحق/قريب/حرج/متعطّل/سلسلة معرّضة/موافقة معلّقة/تنبيه مالي/ضمان/صيانة متأخرة | §6 |
| TF-09 | كل عنصر يحمل `source_module/entity/id` + `title` + وقت + `status` + `primary_action` + `deep_link` | §4.2 |
| TF-10 | TodaySnapshot مُنمَّط ولا يُخزَّن كحقيقة | §4.1 |
| TF-11 | محرك Attention مشتق من قواعد الأنظمة المالكة مع الاحتفاظ بـ source id وقابلية الشرح | §6 |
| TF-12 | توجيه الإجراءات كأوامر للمالك؛ Today لا يكتب بنفسه | §7 |
| TF-13 | التحديث: عند التنقل، بعد تعديل المصدر، بعد حدث، اختياريًا في الخلفية | §8 |
| TF-14 | تفضيلات: إظهار/ترتيب البطاقات، الكثافة، الإشعارات — في User Settings | §9 |
| TF-15 | اليوم المحلي للمستخدم لا UTC | §10 |
| TF-16 | Cache قصير + إبطال عند التعديل | §8.3 |
| TF-17 | حالات فارغة سليمة (لا لوحة مكسورة) | §11.3 |
| TF-18 | `GET /today` · `/today/attention` · `/today/refresh` (ولا `POST /today/tasks`) | §14 |
| TF-19 | الأمان: لا تجاوز لصلاحيات المصدر (Finance الحساس) | §13 |
| TF-20 | ملخص يومي اختياري؛ تذكيرات المصدر تأتي من مالكها | §12 |
| TF-21 | Content approvals عند تفعيل التكامل | §5.7 |

---

## 3) المبادئ والحدود

### 3.1 حدّ المنتج
Today **لوحة قيادة عبر الأنظمة** لا تملك أي سجل. Today = **Query + Aggregation + Action Routing**. لا تُنشأ: `today_tasks / today_habits / today_learning / today_meetings / today_projects / today_finance / today_content / today_attention`.

### 3.2 من يملك ماذا
| الحقيقة | المالك |
|---|---|
| العادات والسجلات والانتكاسات والسلاسل | **Habit OS** |
| الدروس والجلسات والسلسلة الدراسية | **Learning** |
| مهام البيت والصيانة والمشتريات | **Home** |
| الاجتماعات والمتابعات والإجراءات والفعاليات | **Knowledge** |
| المشاريع والمهام والمخاطر والمشاكل والموافقات | **Projects OS** |
| المعاملات والدفعات المتكررة والديون والأهداف والميزانية | **Finance OS** |
| المحتوى وجدول النشر والموافقات | **Content OS** |
| التفضيلات (إظهار/ترتيب/كثافة/تأجيل التنبيه) | **Core: User Settings** |
| الجلسات والبرامج والأهداف والتعافي الرياضي | **Sports OS** |
| الإشعارات والأحداث والهوية والصلاحيات | **Core** |
| لقطة اليوم وقائمة Attention | **لا أحد** (مشتقتان لحظيتان) |

### 3.3 مصفوفة التدهور (عند غياب نظام مصدر)
| الغائب | سلوك Today |
|---|---|
| أي نظام مصدر | تختفي بطاقته (`source_status = disabled`) ولا تظهر "لوحة مكسورة"؛ يظهر في قائمة "اربط نظامًا" داخل Onboarding |
| نظام بطيء/متعطّل | يظهر آخر Snapshot صالح موسومًا **"قديم · منذ N دقيقة"** مع إعادة محاولة؛ وبقية البطاقات تعمل |
| بلا صلاحية | تُخفى بطاقته وبياناته الحساسة (`no_permission`) |
| Core (إشعارات/أحداث) | تحديث بالسحب/الاستطلاع الدوري بدل الدفع؛ لا ملخص صباحي |
| كل الأنظمة | شاشة ترحيب تشرح كيف تربط أول نظام |

### 3.4 المبادئ الحاكمة (ملزمة)
1. **لا قاعدة بيانات للنطاق.** المسموح: Cache قصير العمر (Redis/ذاكرة) + User Settings في Core. لا جدول يخزّن "ما كان في لوحة اليوم".
2. **Today لا يكتب في أي سجل بنفسه**؛ كل إجراء أمر للنظام المالك (§7).
3. **كل عنصر قابل للتتبع إلى كيان مصدر** (`source_system/entity/id`) وكل Attention قابل للشرح.
4. **قواعد Attention يملكها كل نظام**؛ Today يجمّعها ويرتّبها ويفكّ تكرارها (لا نسخ قواعد منطقية في مكانين).
5. **اليوم = يوم المستخدم المحلي** (لا UTC)، مع دعم ساعة بدء اليوم (§10).
6. **الهدوء أولًا:** شاشة عالية الإشارة (≤ 5 عناصر لكل بطاقة افتراضيًا، Attention أعلى 7)، وليست "شاشة كل شيء".
7. **التحمّل:** فشل مصدر لا يُسقط الشاشة؛ نتائج جزئية + شارة حالة.
8. **Idempotency** لكل أمر وتحديث؛ **الإبطال** عند أي تعديل (لا بيانات قديمة بعد mutation).
9. **الأمان:** Today يستخدم صلاحيات المستخدم لدى المصدر ولا يتجاوزها؛ البيانات الحساسة (المال) مقنَّعة افتراضيًا.
10. **كل شاشة:** Loading / Empty / Error / Success / Stale / Offline.
11. **لا Workaround من Notion:** لا Linked Views، لا صيغ "هل اليوم؟"، لا تذكير يدوي لكل صف.
12. **تعدد النطاقات:** مستخدم واحد، عدة Workspaces (فريق/بيت)، وToday يجمعها على مستوى **المستخدم** مع شارة النطاق ومرشّحات السياق.

---
## 4) لقطة اليوم (TodaySnapshot) والعقد القانوني للعناصر

### 4.1 TodaySnapshot — نتيجة خدمة، لا تُخزَّن كحقيقة
```text
TodaySnapshot
├── meta { date, timezone, generated_at, etag, workspace_scope, day_start_hour }
├── summary { attention_count, counts_by_section{}, next_event_at }
├── sources[]  { system, status: ok | stale | error | disabled | no_permission, latency_ms, fetched_at, cache_age_s }
├── habits[]      (Habit OS)
├── learning[]    (Learning)
├── home[]        (Home)
├── meetings[]    (Knowledge: اجتماعات + فعاليات اليوم)
├── projects[]    (Projects OS)
├── finance[]     (Finance OS — حساس)
├── content[]     (Content OS)
├── sports[]      (Sports OS)
└── attention[]   (من كل الأنظمة)
```
- يُبنى لكل طلب من **Feeds المصادر** بالتوازي (مهلة لكل مصدر 800 مللي ثانية)، ويعيد **نتائج جزئية** عند تعطّل أي مصدر.
- **ممنوع** حفظه في قاعدة بيانات. المسموح: Cache قصير العمر (§8.3).

### 4.2 `TodayItem` — العقد القانوني لكل عنصر (يلتزم به كل مصدر)
```json
{
  "source_system": "habit|learning|home|knowledge|projects|finance|content|sports",
  "source_entity": "habit_log|lesson|task|meeting|event|recurring_payment|content_item|scheduled_workout|…",
  "source_id": "<stable id>",
  "section": "habits|learning|home|meetings|projects|finance|content|sports",
  "kind": "task|log|session|meeting|payment|approval|workout|…",
  "title": "…", "subtitle": "…",
  "start_at": "2026-10-05T09:00:00Z", "end_at": null, "due_date": "2026-10-05", "all_day": false, "timezone": "Africa/Cairo",
  "status": "…", "status_category": "todo|active|done|snoozed|blocked",
  "priority": 0, "importance": 0,
  "attention": { "rule": "AR-P2", "severity": "critical|high|medium|low", "message_ar": "…", "since": "…", "explain": {…} },
  "primary_action": { ActionDescriptor },
  "secondary_actions": [ ActionDescriptor ],
  "deep_link": "app://projects/tasks/<id>",
  "context": { "workspace": "…", "project_ref": "…", "area_ref": "…", "room": "…" },
  "sensitivity": "normal|sensitive",
  "version": "etag", "updated_at": "…"
}
```
**الحقول الإلزامية الدنيا (TF-09):** `source_system, source_entity, source_id, title, status, primary_action, deep_link` + (`start_at` أو `due_date` إن وُجد زمن).
**`priority/importance`** رقم موحّد 0–3 (0 عادي، 3 الأعلى) يترجمه كل مصدر من مقياسه (أولوية/أهمية/حدّة).

### 4.3 `ActionDescriptor` — الإجراء كأمر للمالك
```json
{ "id": "complete_task", "label_ar": "أنجزتها", "label_en": "Done",
  "type": "command|navigate|external",
  "method": "POST", "endpoint": "/projects/tasks/<id>/complete",
  "payload": { "client_op_id": "<generated>" },
  "payload_schema": { … اختياري لإدخال سريع (دقائق، رقم، تاريخ) },
  "optimistic": true, "requires_confirmation": false,
  "undo": { "method": "POST", "endpoint": "/projects/tasks/<id>/reopen" },
  "permission": "projects:task:write" }
```
**Today لا يعرّف منطق الإجراءات**؛ يصله الوصف من المصدر ويعرضه ويوجّهه (§7).

### 4.4 عقد الـ Feed الموحّد لكل مصدر (إلزامي — `feed_contract_version = 1`)
```text
GET /{module}/feeds/today?date=YYYY-MM-DD&tz=<IANA>&limit=…   →  { items: TodayItem[], summary: {…}, generated_at, etag }
GET /{module}/attention                                         →  { items: TodayItem[] (attention != null), etag }
قابل لـ If-None-Match (304) · يلتزم بصلاحيات المستخدم · idempotent القراءة · لا آثار جانبية
```
المسارات الفعلية: `/habits/…` · `/learning/…` · `/home/…` · `/knowledge/…` · `/projects/…` · `/finance/…` · `/content/…` · `/sports/…` (§15).

---

## 5) أقسام Today

> **قاعدة الهدوء:** كل بطاقة تعرض افتراضيًا ≤ 5 عناصر مع "عرض الكل"، وما هو **حرج/متأخر** يُرفع إلى Attention لا يُغرق البطاقات.

### 5.1 Habits (Habit OS) — TF-03
| العنصر | التفاصيل |
|---|---|
| **المصدر** | العادات ذات المستوى 🎯 نمو أو المختارة في **التركيز الأسبوعي** (3–5)، + سجل اليوم لكل منها |
| **الحقول** | الاسم · الحالة اليوم (لم تُسجَّل / ✅ تم / 🟡 جزئي / ❌ فائت / ⏸️ إجازة) · الهدف والوحدة · الفعلي · **السلسلة الحالية** · لعادة سيئة: **أيام نظيفة** |
| **إجراءات** | **سجّل بنقرة** (الحالة) · إدخال رقم سريع (الفعلي) · عادة سيئة: "سجّل انتكاسة" (ثانوي) · افتح العادة |
| **الأمر** | `POST /habits/logs {habit_id, date, status, actual?, client_op_id}` (Habit OS يملك السجل والسلسلة) |
| **ملاحظات** | عادات المستوى ⚙️ تلقائي لا تظهر؛ عادة "تمرين" تتحدّث من حدث `sports.workout.completed` فتظهر ✅ دون تسجيل يدوي مزدوج |

### 5.2 Learning — TF-04
- **المحتوى:** `minutes_today / goal / minimum` + **حالة اليوم** (✅ هدف · 🟡 السلسلة آمنة · 🟠 تحت الحد · ⚪ لم تدرس) · **السلسلة** · دروس اليوم المجدولة · **أكمل التعلّم** (الدرس الحالي) · عدد المفردات المستحقة.
- **إجراءات:** **سجّل دراسة** (دقائق: 10/15/30 أو مؤقت) · ابدأ مؤقتًا · افتح الدرس.
- **الأمر:** `POST /learning/sessions/quick-log {lesson_id, minutes, client_generated_id}` أو `/learning/timer/start`.

### 5.3 Home — TF-05
- **المحتوى:** مهام **المستحقة اليوم والمتأخرة** (لا كل المفتوحة، فالمتكررة مفتوحة دائمًا) · صيانة مستحقة/متأخرة · عدّاد المشتريات المطلوبة (رابط).
- **إجراءات:** أنجزتها · تخطيتها · افتح · (أصلح → افتح بند الصيانة).
- **الأمر:** `POST /home/tasks/:id/complete {occurrence_date, client_op_id}` / `skip`.

### 5.4 Meetings & Events (Knowledge) — TF-06
- **المحتوى:** جدول اليوم بترتيب الوقت (اجتماعات + فعاليات) · الجاري الآن مميّز · **رابط الانضمام** · متابعات مستحقة اليوم · **إجراءات اجتماع مستحقة** · فعاليات ببدء اليوم.
- **إجراءات:** انضم · افتح · أكمل الاجتماع (بعد الانتهاء) · أعد الجدولة (ينشئ اجتماعًا جديدًا) · أنجزت المتابعة · حوّل إجراء إلى مهمة.
- **الأمر:** `POST /knowledge/meetings/:id/complete|reschedule|follow-up-done` · `/knowledge/action-items/:id/convert-to-task`.

### 5.5 Projects — TF-07
- **المحتوى:** مهامي **المستحقة اليوم** و**المتأخرة** (أوراق فقط) · **الإجراءات التالية** (أعلى أوراق أولوية من مشاريع In Progress) · المتعطّل · تقدم مشروع الأولوية.
- **إجراءات:** أنجزتها · ابدأ مؤقت عمل على المهمة · افتح · (أعد الجدولة).
- **الأمر:** `POST /projects/tasks/:id/complete` · `POST /projects/work-sessions/timer/start`.
- **مشاريع تحتاج انتباه** (صحة 🔴/🟠) تظهر في Attention.

### 5.6 Finance — حساس (TF-19)
- **المحتوى:** دفعات متكررة مستحقة/متأخرة · ديون مستحقة قريبًا · أهداف ادخار بلغت المستهدف (تحتاج تحديث حالة) · تجاوز ميزانية فئة · تذكيرات الشهر (تحديث أسعار الصرف، لقطة صافي الثروة) · فشل مزامنة مشتريات (من Home).
- **الإخفاء:** المبالغ **مقنَّعة افتراضيًا** (`•••`) وتُكشف بنقرة (وبصمة/PIN على الموبايل) — إعداد `finance.mask_amounts=true`.
- **إجراءات:** **سجّل الدفعة** (Log Payment) · افتح التنبيه/الدين/الهدف · أعد المحاولة (مزامنة).
- **الأمر:** `POST /finance/recurring/:id/log-payment` ثم يصدر Finance حدثه؛ أي إجراء مالي يتم داخل Finance نفسه.

### 5.7 Content — TF-21
- **المحتوى:** محتوى **مجدول للنشر اليوم** · متأخر عن موعده · **بانتظار موافقتي** (Approvals) · مواعيد تسليم خلال 48 ساعة.
- **إجراءات:** وافق / ارفض بتعليق · علّم "نُشر" · افتح.
- **الأمر:** `POST /content/items/:id/approve|reject|mark-published`.
- **ملاحظة:** Content OS لم يُكتب له مواصفة بعد؛ هذا القسم **عقد ملزم** له (§15)، ويُخفى تلقائيًا إلى أن يُفعَّل.

### 5.8 Sports
- **المحتوى:** **تمرين اليوم** (الاسم، التركيز، المدة التقديرية، حالة: مجدول/جارٍ/مكتمل/فائت) · التمرين القادم · **تنبيه التعافي** (استعداد منخفض) · موعد هدف رياضي قريب · ملخص الجلسة إن اكتملت.
- **إجراءات:** **ابدأ التمرين** (ينقل لشاشة Today Workout بعد إنشاء الجلسة) · افتح · تخطَّ اليوم · (أكملت: اعرض الملخص).
- **الأمر:** `POST /sports/sessions/start {scheduled_workout_id, client_op_id}` — Sports يملك الجلسة؛ **Today لا ينشئ Session بنفسه** (المواصفة 27).

---

## 6) محرك Attention

### 6.1 المبدأ
**Attention ليس قاعدة بيانات.** يُشتق لحظيًا من **قواعد يملكها كل نظام** (تعرّف شروطها ودرجة حدّتها ورسالتها)، ويقوم Today بـ: **الجمع ← فك التكرار ← الترتيب ← العرض**. لا تُكرَّر قواعد منطقية في Today.

### 6.2 `AttentionItem` (= `TodayItem` بحقل `attention` مكتمل)
`rule` (كود ثابت) · `severity` (critical > high > medium > low) · `message_ar/en` (سبب مفهوم) · `since` (منذ متى) · `due` · `explain` (المدخلات: العدّادات/التواريخ التي أنتجته) · `dedupe_key = {source_system}:{entity}:{id}:{rule}` · `actions[]` من المصدر. **كل عنصر يحتفظ بـ `source_id`** فيكون قابلًا للتنفيذ وقابلًا للشرح ("لماذا يظهر هذا؟").

### 6.3 القواعد المعتمدة (يملكها المصدر)
| الكود | المصدر | الشرط | الحدّة |
|---|---|---|---|
| **AR-H1** | Habit | عادة تركيز بسلسلة ≥ 7 ولم تُسجَّل اليوم بعد `evening_time` (18:00) | high |
| **AR-H2** | Habit | عادة سيئة: أيام نظيفة تقترب من رقم قياسي/أو انتكاسة اليوم | low |
| **AR-L1** | Learning | **السلسلة معرّضة:** `minutes_today < minimum` بعد `nudge_time` وسلسلة ≥ 3 | high |
| **AR-L2** | Learning | درس مخطَّط (`study_date`) فائت وغير مكتمل | medium |
| **AR-L3** | Learning | موعد دورة/هدف مهني خلال ≤ 3 أيام والتقدم متأخر عن الوتيرة | medium |
| **AR-HM1** | Home | مهمة متأخرة | high |
| **AR-HM2** | Home | صيانة/إصلاح متأخر | high |
| **AR-HM3** | Home | مستهلك منتهي الصلاحية بكمية > 0 | high |
| **AR-HM4** | Home | **ضمان ينتهي ≤ 7 أيام** (و≤ 30 منخفضة) | medium / low |
| **AR-K1** | Knowledge | اجتماع يبدأ خلال ≤ 15 دقيقة أو جارٍ الآن | high |
| **AR-K2** | Knowledge | متابعة اجتماع **متأخرة** | medium |
| **AR-K3** | Knowledge | فعالية تسجيلها مطلوب وآخر موعد ≤ 2 يوم (بدون رابط/تسجيل) | medium |
| **AR-K4** | Knowledge | إجراء اجتماع مفتوح تجاوز موعده | medium |
| **AR-K5** | Knowledge | اجتماع انتهى منذ > ساعة ولم يُغلق (قرارات/إجراءات) | low |
| **AR-P1** | Projects | **Critical Issue** مفتوحة (صحة 🔴) | critical |
| **AR-P2** | Projects | مهام متأخرة (صحة 🔴) — تُجمَّع في عنصر واحد لكل مشروع | high |
| **AR-P3** | Projects | تجاوز موعد المشروع | high |
| **AR-P4** | Projects | خطر عالٍ مفتوح (🟠) | medium |
| **AR-P5** | Projects | مهمة **متعطّلة** مسندة إليّ | medium |
| **AR-P6** | Projects | **موافقة معلّقة** (PRD/مخرج في Review وأنا المعتمِد) | high |
| **AR-F1** | Finance | دفعة متكررة مستحقة ≤ 2 يوم/متأخرة | high |
| **AR-F2** | Finance | دين مستحق قريبًا/متأخر | high |
| **AR-F3** | Finance | فئة ميزانية ≥ 90% / تجاوزت | medium |
| **AR-F4** | Finance | هدف ادخار بلغ المستهدف ويحتاج تحديث الحالة | low |
| **AR-F5** | Finance | تذكير شهري (أسعار الصرف/صافي الثروة) | low |
| **AR-F6** | Finance | فشل مزامنة مشتريات/تكلفة من نظام آخر (Failed) | medium |
| **AR-C1** | Content | محتوى مجدول للنشر اليوم/فائت | high |
| **AR-C2** | Content | بانتظار موافقتي | high |
| **AR-C3** | Content | موعد تسليم ≤ 48 ساعة وغير مكتمل | medium |
| **AR-S1** | Sports | تمرين مخطَّط فات اليوم بلا جلسة (Missed) | medium |
| **AR-S2** | Sports | **استعداد منخفض** (`readiness < threshold` أو إرهاق مستمر) | medium |
| **AR-S3** | Sports | هدف رياضي موعده ≤ 7 أيام والتقدم متأخر | medium |
| **AR-S4** | Sports | قفزة حمل تدريبي (رسالة غير طبية) | low |
| **AR-S5** | Sports | برنامج ينتهي ≤ 7 أيام/أسبوع جديد/Deload | low |

> القواعد "قابلة للإضافة": المصدر الجديد يسجّل قواعده في سجل المحوّلات (§15.5) دون تغيير Today.

### 6.4 فك التكرار والترتيب
```text
entity_key = {source_system}:{source_entity}:{source_id}
1) فك التكرار: نفس entity_key من قاعدتين ⇒ يُبقى الأشد ويُدمج التفسير.
2) العنصر الظاهر في بطاقة قسمه:
      · يحمل شارة attention على صفّه في البطاقة.
      · لا يتكرر في قائمة Attention إلا إذا severity ≥ high.
3) الترتيب (score تنازلي):
      score = severity_weight (critical 100 · high 70 · medium 40 · low 10)
            + proximity (كلما اقترب الموعد/تأخر أكثر: +0…30)
            + importance×5 + (مسند إليّ ? +10 : 0)
4) الحدّ الأعلى: 7 عناصر ظاهرة افتراضيًا + "عرض الكل (N)"، وتُجمَّع المتشابهات
   (مثل: "5 مهام متأخرة في مشروع X" ⇒ عنصر واحد قابل للفتح).
5) التعادل: حسب ترتيب الأنظمة المفضَّل في تفضيلات المستخدم.
```

### 6.5 التأجيل والإخفاء
- **تأجيل** عنصر Attention (لليوم/غدًا/أسبوع) وإخفاؤه تفضيلٌ شخصي يُحفظ في **User Settings (Core)** تحت `today.snoozes[dedupe_key]=until` مع تنظيف تلقائي — **لا جدول Today**.
- `critical` لا يُؤجَّل أكثر من يوم؛ ولا يُخفى عنصر `AR-K1` (اجتماع يبدأ قريبًا) أبدًا.
- التأجيل لا يؤثر على المصدر ولا يُلغي تذكيراته.

---

## 7) توجيه الإجراءات (Action Routing)

### 7.1 القاعدة
**Today لا يكتب أي سجل بنفسه.** كل إجراء = **أمر للنظام المالك**، يأتي وصفُه من الـ Feed (`ActionDescriptor`)، وتنفيذه عبر endpoint المالك بصلاحيات المستخدم و`Idempotency-Key`/`client_op_id`.

### 7.2 جدول التوجيه
| الإجراء في Today | الأمر للمالك |
|---|---|
| سجّل عادة | Habit OS: `DailyLog` command |
| سجّل دراسة | Learning: `StudySession` quick-log/timer |
| أنجز مهمة بيت / تخطَّ | Home: `Task complete/skip` |
| أنجز اجتماعًا / أعد جدولته / أغلق متابعة | Knowledge: `Meeting` commands |
| حوّل Action Item إلى مهمة | Knowledge → (Projects `tasks/from-source`) |
| أنجز مهمة مشروع / ابدأ مؤقت عمل | Projects: `Task` / `WorkSession` commands |
| وافق / ارفض (PRD/مخرج) | Projects: `PRD approve` / `Output approve` |
| سجّل الدفعة / افتح تنبيهًا ماليًا | Finance: `Recurring log-payment` / navigate |
| وافق على محتوى / علّم نُشر | Content: `approve` / `mark-published` |
| ابدأ التمرين / تخطَّ اليوم | Sports: `Session start` / `ScheduledWorkout skip` |

### 7.3 دورة تنفيذ الإجراء
```text
اضغط ← (تأكيد إن requires_confirmation) ← تحديث متفائل للواجهة (optimistic) ← استدعاء أمر المالك (+Idempotency-Key)
  ├─ نجاح  → المالك يصدر حدثه → Today يُبطل القسم المعني ويعيد حساب Attention → يختفي/يتغيّر العنصر
  │          + عرض "تراجع" 10 ثوانٍ (undo من الوصف)
  └─ فشل   → تراجع الواجهة + رسالة سبب المالك + زر إعادة المحاولة (نفس المفتاح)
```
- **تعارض الإصدار:** إن تغيّر العنصر عند المالك (version) ⇒ يُعاد جلب العنصر ويُعرض الوضع الحالي.
- **أوفلاين:** تُوضع الأوامر القابلة لذلك في طابور محلي (`client_op_id`) وتُعاد عند الاتصال؛ ما لا يُسمح أوفلاين (اعتمادات، مال) يُعطَّل بوضوح.
- **بلا Router محلي للتنفيذ المنطقي:** يجوز للواجهة استدعاء المالك مباشرة، أو عبر `POST /today/actions/execute` كوسيط **يمرّر الوصف كما هو** (CORS/المصادقة) دون أي كتابة محلية (§14).

---

## 8) التحديث والأحداث والـ Cache

### 8.1 متى يُحدَّث Today
1. عند **التنقل** إلى الشاشة. 2. بعد **تنفيذ إجراء**. 3. عند **حدث نطاق** ذي صلة (دفع فوري). 4. **سحب للتحديث**. 5. **خلفيًا** (كل 5 دقائق والشاشة مرئية: Revalidate بـ ETag؛ على الموبايل بحسب سياسة الخلفية).

### 8.2 خريطة الأحداث → الإبطال
| الحدث (من المصدر) | الأقسام المُبطَلة |
|---|---|
| `habit.log.created|updated|voided` · `habit.relapse.logged` | habits + attention |
| `learning.study_session.created|updated|deleted` · `learning.daily_minimum_met` · `learning.streak_changed` · `learning.lesson.completed` | learning + attention |
| `home.task.completed|skipped|overdue` · `home.maintenance.logged` · `home.item.low_stock|expiring|warranty_expiring` · `home.room.health_changed` | home + attention |
| `knowledge.meeting.created|rescheduled|completed|cancelled` · `knowledge.action_item.*` · `knowledge.event.*` · `knowledge.followup.due` | meetings + attention |
| `task.created|completed|reopened|due_changed|assigned` · `project.health_changed` · `risk.*` · `issue.*` · `prd.approved` · `output.approved` | projects + attention |
| `finance.transaction.created|updated|deleted` · `finance.alert.created|resolved` · `finance.recurring.due` | finance + attention |
| `content.item.status_changed` · `content.approval.requested|decided` | content + attention |
| `sports.session.started|finished|abandoned` · `sports.workout.completed|missed` · `sports.recovery.low_readiness` · `sports.goal.achieved` | sports + attention (+ habits عند الاقتضاء) |
| أي حدث غير معروف من نظام | يُبطل **قسم ذلك النظام** افتراضيًا |
**الغلاف القانوني للحدث:** `{event_id, type, source_system, user_id, occurred_at, entity_ref, payload}` عبر Core Event Bus؛ ويصل المتصفح/التطبيق عبر **SSE/WebSocket** برسالة `today.invalidate {sections[], reason, event_id}`؛ وبديل: استطلاع كل 60 ثانية.

### 8.3 Cache (مسموح، قصير العمر، غير مصدر حقيقة) — TF-16
| البند | القاعدة |
|---|---|
| المكان | ذاكرة/Redis (متطاير) لا قاعدة بيانات |
| المفتاح | `(user_id, date, source)` + `etag` |
| TTL | 30–60 ثانية؛ وللمالية ≤ 60 ثانية مشفَّرًا وبلا حقول حساسة غير ضرورية |
| الإبطال | **فوريًا** عند حدث المصدر أو بعد إجراء من Today |
| Stale-while-revalidate | يعرض القديم موسومًا ثم يحدّث في الخلفية؛ **لا بيانات قديمة بعد mutation** |
| الحدّ | أقصى عمر قديم يُعرض بشارة "منذ N دقيقة" = 10 دقائق ثم "قديم" |

---

## 9) تفضيلات المستخدم

التفضيلات تُحفظ في **Core User Settings** (`user_settings.today` JSON بإصدار)، **لا** في جدول Today:
| الإعداد | الافتراضي |
|---|---|
| إظهار/إخفاء كل بطاقة | الكل ظاهر ما عدا غير المفعّلة |
| ترتيب البطاقات | Attention ثم Meetings ثم Habits… (قابل للسحب) |
| الكثافة | مريحة / مضغوطة |
| عدد عناصر كل بطاقة | 5 |
| الحد الأدنى لحدّة Attention | low |
| عدد عناصر Attention الظاهرة | 7 |
| إخفاء مبالغ Finance | مفعّل |
| `day_start_hour` (بداية اليوم المنطقي) | 0 (يمكن 4 لمن يسهر) |
| `evening_time` لقواعد "سلسلة معرّضة" | 18:00 |
| ترتيب أولوية الأنظمة عند التعادل | قابل للضبط |
| نطاق العمل المعروض (شخصي/فريق/الكل) | الكل مع شارة النطاق |
| تفضيلات الإشعار (الملخص الصباحي) | مغلق حتى يُفعَّل |
| التأجيلات (`snoozes`) | فارغة (تنظَّف تلقائيًا) |
مزامنة بين الأجهزة، وتغييرها لا يُنشئ سجلات Today.

---
## 10) المنطقة الزمنية ويوم المستخدم

- **اليوم = تقويم المستخدم المحلي** (لا UTC)، ومعه `day_start_hour` (افتراضي 0): الساعة 02:00 مع `day_start_hour=4` ما زالت "أمس".
- **قاعدة التناسق:** تُرسل Today إلى **كل مصدر** المعامِلين نفسيهما `?date=YYYY-MM-DD&tz=<IANA>` فتتفق كل البطاقات على "اليوم".
- **الأحداث العابرة لمنتصف الليل** تظهر في اليوم الذي تبدأ فيه (وتبقى "جارية" حتى تنتهي).
- **عناصر "عائمة" (طوال اليوم)** تتبع تاريخ المستخدم المحلي؛ **عناصر "ثابتة"** (اجتماع بمنطقة محددة) تتبع لحظتها المطلقة وتُعرض بتوقيت المستخدم.
- **أسبوع المستخدم** (للتجميعات "هذا الأسبوع") يبدأ يوم `week_start_day` (افتراضي السبت).
- **السفر:** إن اختلفت منطقة الجهاز عن منطقة الملف الشخصي تُعرض مرة واحدة رسالة "استخدم توقيت الجهاز؟"، ولا يُغيَّر شيء بصمت.
- **تغيير التوقيت الصيفي:** يوم من 23 أو 25 ساعة يُعامل طبيعيًا؛ والتذكيرات والملخص الصباحي تبقى على الساعة المحلية.
- الاختبار الإلزامي: عنصر عند 23:50 محلي يُحسب لليوم نفسه، وبعد منتصف الليل ينتقل لليوم التالي دون إعادة تحميل يدوي (انتقال اليوم يُطلق تحديثًا تلقائيًا).

---

## 11) الواجهة

### 11.1 الهيكل (هادئ وعالي الإشارة)
```text
Today
├── Header      : تاريخ اليوم (+ هجري اختياري) · توقيت السياق · عدّاد Attention · مؤشر آخر تحديث
├── Attention   : أهم 7 عناصر، كل واحد بسببه وإجراؤه الأول (الدرج الكامل بالنقر)
├── Meetings    : جدول اليوم (الجاري مميَّز)
├── Habits      : 3–5 عادات بتسجيل بنقرة
├── Sports      : تمرين اليوم
├── Learning    : دقائق اليوم/الهدف/السلسلة/الدرس التالي
├── Projects    : المستحق/المتأخر/الإجراءات التالية
├── Home        : مستحق/متأخر/صيانة
├── Content     : نشر اليوم/موافقات
└── Finance     : دفعات/ديون/أهداف (مقنَّع)
```
**ترتيب البطاقات** افتراضي وقابل للتخصيص (§9).

### 11.2 الشاشات
| الشاشة | المحتوى الإلزامي |
|---|---|
| **Today Home** | Header + Attention (مختصر) + البطاقات + شريط **إجراءات سريعة** (سجّل دراسة · سجّل عادة · ابدأ التمرين · التقط فكرة/رابط — كلها تفتح أوامر الأنظمة المالكة) |
| **Focus** | وضع مبسّط يعرض "الآن" فقط: العنصر الحالي/القادم + إجراء واحد؛ لا ينشئ سجلات |
| **Attention Drawer** | قائمة كاملة مرتبة؛ لكل عنصر: المشكلة · المصدر (شارة) · **السبب (لماذا؟)** · منذ متى · الإجراء الأول · تأجيل |
| **Source Status** | حالة كل مصدر (ok/قديم/خطأ/معطّل/بلا صلاحية) وزر إعادة المحاولة وربط نظام |
| **Preferences** | §9 (تفضيلات المستخدم في Core) |
| **Morning Brief** (إشعار/ويدجت) | §12 |

### 11.3 الحالات الفارغة والمعطّلة (TF-17)
| الحالة | العرض |
|---|---|
| لا عادات تركيز | "اختر عادات التركيز" + رابط Habit Focus |
| لا اجتماعات اليوم | "لا اجتماعات اليوم" + زر التقاط/إضافة |
| لا تمرين مجدول | "يوم راحة/لا برنامج نشط" + رابط البرامج |
| نظام غير مفعّل | تختفي بطاقته (لا لوحة مكسورة) وتظهر في "اربط نظامًا" |
| مصدر متعطّل | آخر Snapshot صالح بشارة "قديم" + إعادة محاولة |
| لا صلاحية | تُخفى البطاقة وبياناتها الحساسة |
| كل شيء مُنجَز | رسالة هادئة + أهم 3 إنجازات اليوم (من الأحداث) |
| Offline | شارة + آخر مزامنة + الإجراءات المسموحة فقط |
**كل بطاقة:** Loading (skeleton) / Empty / Error / Success / Stale.

### 11.4 سلوك الواجهة
- **تحميل تدريجي:** كل بطاقة تُرسم عند وصول مصدرها (لا انتظار الأبطأ)، مع Skeleton.
- **تحديث متفائل** للإجراءات + "تراجع" 10 ثوانٍ.
- **الكثافة** مريحة/مضغوطة؛ ودجت للشاشة الرئيسية/القفل (Attention count + العنصر القادم + زر إجراء).
- **سهولة الوصول:** لا اعتماد على اللون وحده (أيقونة + نص)، قارئ شاشة، RTL كامل، أهداف لمس ≥ 44px.

---

## 12) الأتمتة والإشعارات

| ID | الأتمتة | التفاصيل | افتراضي |
|---|---|---|:-:|
| TA-01 | تحديث تفاعلي بالأحداث | §8.2 | إلزامي |
| TA-02 | إعادة حساب Attention عند كل إبطال | §6 | إلزامي |
| TA-03 | انتقال اليوم عند منتصف الليل المحلي (أو `day_start_hour`) | يعيد بناء كل البطاقات | إلزامي |
| TA-04 | **ملخص صباحي** (Morning Brief) | إشعار في وقت المستخدم: عدّاد Attention + أهم 3 + تمرين اليوم + أول اجتماع | اختياري (مغلق) |
| TA-05 | **مراجعة مسائية** (Evening nudge) | "تبقّى: تسجيل 2 عادات، دقيقتا دراسة…" قبل `evening_time` | اختياري |
| TA-06 | تنظيف التأجيلات المنتهية | في User Settings | إلزامي |
| TA-07 | إعادة المحاولة للمصادر الفاشلة | Backoff (5ث، 15ث، 60ث) ثم "قديم" | إلزامي |
| TA-08 | إعادة تشغيل الإجراءات المعلّقة أوفلاين | بـ `client_op_id` | إلزامي |
**قاعدة التذكيرات:** تذكيرات العناصر الفردية (اجتماع بعد 15 دقيقة، دفعة، درس…) **تأتي من الأنظمة المالكة** عبر محرك الإشعارات (Core)؛ **Today لا ينشئ تذكيرًا لعنصر** ولا يكرّر إشعار المصدر (الملخص الصباحي يجمع ولا يستبدل). **ممنوع:** إنشاء مهام/سجلات من Today أو تغيير حالة بصمت.

---

## 13) الأمان والصلاحيات (TF-19)

1. **تفويض بصلاحيات المستخدم:** Today يستدعي كل مصدر بـ**رمز المستخدم** (delegated)؛ لا حساب خدمة واسع. **لا يتجاوز Today صلاحيات المصدر**: بلا صلاحية ⇒ تُخفى البطاقة (`no_permission`).
2. **Finance:** مقنَّع افتراضيًا؛ يُكشف بنقرة (بصمة/PIN على الموبايل)؛ لا تظهر في Attention تفاصيل مالية حساسة لمن لا يملك صلاحية Finance؛ لا تُسجَّل المبالغ في سجلات Today؛ الـ Cache المالي ≤ 60 ثانية.
3. **فصل النطاقات:** عناصر Workspace فريق وWorkspace بيت تُجمَّع على مستوى **المستخدم** بشارة النطاق ومرشّحات؛ لا تسرّب بين النطاقات؛ إزالة عضو تُخفي بياناته فورًا.
4. **التدقيق:** تنفيذ الإجراءات يُسجَّل لدى **المالك** (`activity_log`)، وToday يسجّل فقط مؤشرات تشغيلية (زمن، نجاح/فشل) بلا بيانات شخصية.
5. **حماية الحدّ:** Rate limiting على `/today/*`، وتجميع الطلبات، وحماية من التضخيم (لا يجلب Today أكثر من `limit` لكل مصدر).
6. **سلامة الروابط:** روابط `deep_link` من المصدر تُتحقق (مخطط `app://` أو http(s) موثّق) لمنع التوجيه الخبيث.
7. **الجلسة المشتركة/الجهاز المشترك:** قفل المحتوى الحساس بعد خمول 60 ثانية.

---

## 14) الخدمات والواجهات

### 14.1 الخدمات
```text
TodayService              — يبني TodaySnapshot ويعيد الأقسام
TodayAggregationService   — SourceAdapterRegistry: جلب متوازٍ بمهلة، نتائج جزئية، تطبيع
TodayAttentionService     — جمع/فك تكرار/ترتيب/تجميع قواعد المصادر
TodayActionRouter         — يمرّر ActionDescriptor للمالك (بلا كتابة محلية)
TodayCacheService         — Cache قصير + ETag + إبطال
TodayEventSubscriber      — اشتراك أحداث Core ⇒ إبطال/دفع today.invalidate
TodayPreferencesService   — واجهة فوق Core User Settings (إظهار/ترتيب/كثافة/تأجيل)
TodayBriefService         — الملخص الصباحي/المسائي
```

### 14.2 REST API (لا `POST /today/tasks` إطلاقًا)
```text
GET   /today?date=&tz=&sections=&scope=                 → TodaySnapshot (أقسام تدريجية)
GET   /today/attention?min_severity=&limit=             → قائمة Attention مرتبة
POST  /today/refresh        {sections?: []}             → يبطل ويعيد الجلب
GET   /today/sources                                    → حالة المصادر وقواعدها
GET   /today/stream                                     → SSE: today.invalidate / snapshot.updated
GET   /today/preferences    PATCH /today/preferences    → (يمرّر إلى Core User Settings)
POST  /today/attention/:dedupe_key/snooze  {until}      → (User Settings)
POST  /today/actions/execute {action: ActionDescriptor} → وسيط: يمرّر الوصف كما هو للمالك ويعيد استجابته (بلا أي كتابة محلية)
```
**أكواد الأخطاء:** `SOURCE_TIMEOUT` · `SOURCE_FORBIDDEN` · `SOURCE_DISABLED` · `ACTION_UPSTREAM_FAILED` · `ACTION_VERSION_CONFLICT` · `SNOOZE_NOT_ALLOWED` (critical > 1 يوم) · `INVALID_TZ`.
**كل استجابة قراءة تحمل `etag` وتدعم `If-None-Match`.**

---

## 15) عقود التكامل مع المصادر

### 15.1 جدول العقود (ما يجب أن يوفّره كل نظام)
| النظام | Feed | Attention | الأحداث المطلوبة | الحالة |
|---|---|---|---|---|
| **Habit OS** | `GET /habits/feeds/today` | `GET /habits/attention` | `habit.log.created|updated|voided` · `habit.relapse.logged` · `habit.streak_changed` | **جديد: يُضاف لخطة Habit OS** |
| **Learning** | `GET /learning/feeds/today` ✔ | `GET /learning/attention` (يُضاف) | `learning.study_session.*` · `learning.daily_minimum_met` · `learning.streak_changed` ✔ | موجود جزئيًا (تُحدَّث الخطة) |
| **Home** | `GET /home/feeds/today` ✔ | `GET /home/attention` (يُضاف) | `home.task.*` · `home.maintenance.logged` · `home.item.*` · `home.room.health_changed` ✔ | موجود جزئيًا |
| **Knowledge** | `GET /knowledge/feeds/today` ✔ | `GET /knowledge/attention` (يُضاف) | `knowledge.meeting.*` · `knowledge.action_item.*` · `knowledge.event.*` ✔ | موجود جزئيًا |
| **Projects OS** | `GET /projects/feeds/today` ✔ | `GET /projects/attention` ✔ | `task.*` · `project.health_changed` · `risk.*` · `issue.*` · `prd.approved` ✔ | موجود |
| **Finance OS** | `GET /finance/feeds/today` | `GET /finance/attention` | `finance.transaction.*` · `finance.alert.created|resolved` · `finance.recurring.due` | **جديد: يُضاف لخطة Finance** |
| **Content OS** | `GET /content/feeds/today` | `GET /content/attention` | `content.item.status_changed` · `content.approval.requested|decided` | **جديد: يُضاف لخطة Content** |
| **Sports OS** | `GET /sports/feeds/today` | `GET /sports/attention` | `sports.session.*` · `sports.workout.completed|missed` · `sports.recovery.low_readiness` · `sports.goal.achieved` | **في خطة Sports v4** |

> تم تحديث خطط Home/Learning/Knowledge بإضافة مسار `attention` وتوحيد الغلاف (يُراجَع في المصفوفة §20).

### 15.2 ما يوفّره كل مصدر لكل قسم
| القسم | عناصر الـ Feed | مصدر الحقيقة |
|---|---|---|
| Habits | `habit_log` للعادات المركّزة (الحالة/السلسلة/الأيام النظيفة) | Habit OS |
| Learning | `lesson` المخطَّطة، `session summary` (دقائق/هدف/حد/سلسلة/حالة)، `vocabulary_due` | Learning |
| Home | `task`, `maintenance`, `purchase_needed` (عدّاد) | Home |
| Meetings | `meeting`, `event`, `follow_up`, `action_item`, `registration` | Knowledge |
| Projects | `task`, `project_attention`, `approval`, `blocked_task` | Projects OS |
| Finance | `recurring_payment`, `debt`, `goal`, `budget_alert`, `monthly_reminder`, `sync_failure` | Finance |
| Content | `content_item` (نشر/تسليم)، `approval` | Content |
| Sports | `scheduled_workout`, `recovery_alert`, `goal_deadline`, `load_notice` | Sports |

### 15.3 توحيد الأسماء والأحداث (يحل TC-03/TC-04)
- المسار القانوني `/{module}/feeds/today` و`/{module}/attention` (وليس `/feeds/today` الجذر).
- أحداث بصيغة `<system>.<entity>.<verb>`؛ الاستثناء التاريخي في Projects (`task.*`) يُعاد تسميته إلى `projects.task.*` في Core مع إبقاء الاسم القديم كـ alias.
- حدود الاسم: `source_system` ∈ القيم الثمانية؛ أي نظام جديد يسجّل نفسه في **SourceAdapterRegistry**.

### 15.4 المحوّلات الاختيارية
نظام جديد (مثل "اللياقة" القديم أو "المركبات") يُضاف بمحوّل يطبّق العقد §4.4 دون تغيير Today: `register({system, section, feed_url, attention_url, events[], icon, order})`.

### 15.5 ترحيل صفحة Today من Notion
| Notion | التطبيق |
|---|---|
| Linked View "عادات اليوم" (السجل اليومي) | قسم Habits عبر Feed Habit OS |
| "دروس اليوم" + "حالة الدراسة والسلسلة" | قسم Learning (جلسات + دروس + ملخص) |
| "مهام البيت المفتوحة" | قسم Home (**المستحق/المتأخر فقط**) |
| "اجتماعات اليوم" | قسم Meetings (Knowledge) |
| "مهام المشاريع المفتوحة" + "المشاريع التي تحتاج انتباه" | قسم Projects + Attention |
| (غير موجود) | Finance وContent وSports وAttention والإجراءات: **جديدة** |
لا بيانات تُرحَّل (Today بلا بيانات)؛ التفضيلات الافتراضية تُنشأ عند أول دخول.

---

## 16) المنصات: ويب + موبايل + ودجت

| المحور | القرار |
|---|---|
| المنصات | ويب Responsive + تطبيق موبايل (iOS/Android) + ودجت الشاشة الرئيسية/القفل |
| اللغة | عربي RTL افتراضي + إنجليزي؛ نصوص مختلطة (Bidi) تُختبر |
| الأداء | **p95 ≤ 1.2 ثانية** لأول لوحة كاملة مع 8 مصادر؛ أول بطاقة ≤ 400 مللي ثانية؛ مهلة المصدر 800 مللي ثانية؛ تحميل تدريجي |
| أوفلاين | آخر Snapshot صالح للقراءة (مشفَّر محليًا للمالية بلا حقول حساسة)، وطابور إجراءات مسموح (عادة/دراسة/مهمة)؛ لا اعتمادات ولا مالية أوفلاين |
| الدفع الفوري | SSE/WebSocket على الويب؛ FCM/APNs "صامت" لإبطال القسم على الموبايل |
| الخلفية | تحديث دوري محدود بحسب نظام التشغيل؛ يعتمد ETag لتقليل البيانات |
| الودجت | Attention count + العنصر القادم + زر إجراء واحد (تسجيل عادة/ابدأ التمرين) |
| إمكانية الوصول | تباين، أيقونة مع اللون، قارئ شاشة، RTL |
| الأمان | رمز مفوَّض، تشفير النقل، قفل الحساس، Rate limiting |

---

## 17) خطة التنفيذ

> الحجم: S (أيام) · M (1–2 أسبوع) · L (2–4 أسابيع). تعتمد على **جاهزية عقود المصادر**؛ يمكن البناء بمحوّلات وهمية (mock) لكل مصدر ريثما يكتمل.

| المرحلة | المحتوى | الحجم | معيار الخروج |
|---|---|---|---|
| **0 — العقود** | `TodayItem`, `ActionDescriptor`, `feed/attention`, الغلاف القانوني للأحداث، SourceAdapterRegistry، محوّلات Mock لكل مصدر | M | TT-01…TT-06 |
| **1 — الخدمة والأقسام** | TodayService + AggregationService + TodaySnapshot + تحميل متوازٍ بنتائج جزئية + الأقسام الثمانية (بمحوّلات حقيقية كلما توفرت) | L | TT-07…TT-24 |
| **2 — Attention** | TodayAttentionService (جمع/فك تكرار/ترتيب/تجميع) + الشرح + التأجيل | M | TT-25…TT-40 |
| **3 — الإجراءات** | ActionRouter + optimistic + undo + أوفلاين + Idempotency | L | TT-41…TT-56 |
| **4 — التحديث الحي** | Event subscriber + SSE + Cache + ETag + إبطال | M | TT-57…TT-70 |
| **5 — التفضيلات والواجهة** | User Settings + الإخفاء/الترتيب/الكثافة + Focus + Source Status + حالات فارغة + الودجت | M | TT-71…TT-84 |
| **6 — الملخصات والأمان** | Morning/Evening Brief + تقنيع المالية + اختبارات الصلاحيات + قفل الحساس | M | TT-85…TT-96 |
| **7 — الإغلاق** | E2E مع كل الأنظمة + أداء + أمان + Beta | M | كل §18 |

**مخاطر المشروع:** (1) اعتماد على أنظمة لم تُبنَ (Habit/Finance/Content) ← Mock + عقد مجمَّد. (2) بطء مصدر يسحب الشاشة ← مهلة ونتائج جزئية. (3) تكرار Attention عبر الأنظمة ← فك تكرار بـ `entity_key`. (4) تسرّب بيانات مالية ← تقنيع وCache قصير. (5) فوضى الأحداث ← غلاف قانوني + إبطال افتراضي بحسب النظام.

---

## 18) اختبارات القبول

**العقود والـ Snapshot**
- TT-01 كل `TodayItem` يحمل الحقول الإلزامية (§4.2).
- TT-02 `ActionDescriptor` يُمرَّر من المصدر ولا يُولَّد في Today.
- TT-03 كل Feed يدعم `date/tz` وETag/304.
- TT-04 Feed بحقول ناقصة يُرفض ويُوسم المصدر `error` بلا إسقاط الشاشة.
- TT-05 `source_system` قيمة من القائمة أو من السجل.
- TT-06 الغلاف القانوني للحدث يُقبل؛ وحدث مجهول يُبطل قسم نظامه.
- TT-07 `GET /today` لا ينشئ أي سجل ولا جدول `today_*` موجود (فحص المخطط).
- TT-08 الجلب متوازٍ بمهلة 800 مللي ثانية لكل مصدر.
- TT-09 تعطّل مصدر ⇒ نتيجة جزئية + `source.status=error/stale`.
- TT-10 مصدر غير مفعّل ⇒ البطاقة تختفي (لا لوحة مكسورة).
- TT-11 بلا صلاحية ⇒ تُخفى البطاقة وبياناتها (`no_permission`).
- TT-12 أول بطاقة ≤ 400 مللي ثانية، واللوحة الكاملة p95 ≤ 1.2 ث.

**الأقسام**
- TT-13 **إكمال عادة من Today يحدّث Habit OS** (سجل واحد، idempotent).
- TT-14 عادة "تمرين" تظهر ✅ بعد `sports.workout.completed` دون تسجيل يدوي ولا سجل مزدوج.
- TT-15 **تسجيل دراسة من Today يحدّث Learning** (جلسة واحدة، `client_generated_id`).
- TT-16 قسم Learning يعرض الدقائق/الهدف/الحد/السلسلة/حالة اليوم بالقيم نفسها في Learning.
- TT-17 **إكمال مهمة بيت من Today يحدّث Home** (سجل إنجاز واحد لـ `occurrence_date`).
- TT-18 Home يعرض المستحق/المتأخر فقط (المتكررة غير المستحقة لا تظهر).
- TT-19 تغيير الاجتماع **يظهر فورًا** في Today.
- TT-20 رابط الانضمام يظهر ويعمل عند وجوده.
- TT-21 **إكمال مهمة مشروع من Today يحدّث Projects OS** ويعيد حساب تقدمه وصحته.
- TT-22 تنبيه مالي **يفتح Finance** على العنصر المصدر؛ و"سجّل الدفعة" ينشئ معاملة واحدة.
- TT-23 موافقة محتوى من Today تحدّث Content OS.
- TT-24 **ابدأ التمرين** من Today ينشئ جلسة In Progress في Sports **مرة واحدة** ولا ينشئ Today سجلًا.

**Attention**
- TT-25 Attention **ليس جدولًا**؛ يُشتق لحظيًا.
- TT-26 كل عنصر Attention يحتفظ بـ `source_id` ويفتح كيان المصدر.
- TT-27 **متأخر/حرج** من المصادر (AR-P1/P2، AR-HM1/2، AR-F1/2…) يظهر مع سببه.
- TT-28 فك التكرار: نفس `entity_key` من قاعدتين ⇒ عنصر واحد بأشد حدّة وتفسير مدمج.
- TT-29 عنصر ظاهر في بطاقته يحمل شارة attention ولا يتكرر في Attention إلا إن severity ≥ high.
- TT-30 الترتيب حسب `score` (الحدّة + القرب + الأهمية + مسند لي).
- TT-31 تجميع "N مهام متأخرة في مشروع X" عنصرًا واحدًا قابلًا للفتح.
- TT-32 حدّ العرض 7 + "عرض الكل (N)".
- TT-33 زر "لماذا؟" يعرض `explain` (القاعدة والمدخلات).
- TT-34 تأجيل عنصر يحفظ في User Settings ويُنظَّف عند الانتهاء؛ و`critical` ≤ يوم.
- TT-35 AR-K1 (اجتماع خلال 15 دقيقة) لا يُؤجَّل.
- TT-36 AR-L1 (سلسلة معرّضة) يظهر بعد `nudge_time` فقط وسلسلة ≥ 3.
- TT-37 AR-H1 بعد `evening_time` وسلسلة ≥ 7.
- TT-38 عنصر مالي لمن لا يملك صلاحية Finance لا يظهر.
- TT-39 حذف/إنجاز العنصر في المصدر يزيله من Attention.
- TT-40 قاعدة جديدة من مصدر جديد تظهر دون تعديل Today.

**الإجراءات**
- TT-41 كل إجراء معروض يشير إلى كيان المصدر الأصلي (`endpoint` من الوصف).
- TT-42 Today لا يكتب أي سجل بنفسه (لا endpoint كتابة محلي سوى الوسيط).
- TT-43 `POST /today/actions/execute` يمرّر الوصف كما هو ولا يغيّر الحمولة.
- TT-44 إعادة الضغط بنفس `client_op_id` لا تكرر الأثر.
- TT-45 تحديث متفائل ثم تراجع عند الفشل مع سبب المالك.
- TT-46 "تراجع" 10 ثوانٍ يعيد الحالة عبر وصف `undo`.
- TT-47 تعارض الإصدار ⇒ إعادة جلب العنصر وعرض الوضع الحالي.
- TT-48 أوفلاين: عادة/دراسة/مهمة تُوضع في الطابور وتُنفَّذ مرة واحدة عند الاتصال.
- TT-49 الاعتمادات والعمليات المالية معطَّلة أوفلاين بوضوح.
- TT-50 `requires_confirmation` يُعرض ويُحترم.
- TT-51 نجاح الإجراء يُبطل القسم + Attention فيختفي/يتغيّر العنصر.
- TT-52 فشل المالك لا يترك العنصر في حالة معلّقة.
- TT-53 الإجراء بلا صلاحية يُرفض برسالة المالك.
- TT-54 الإجراء على عنصر محذوف يعيد `404` مفهومة ويحدّث القسم.
- TT-55 إجراءات "ثانوية" (انتكاسة، أعد الجدولة) تعمل بنفس الضمانات.
- TT-56 لا إجراء يُنفَّذ على نظام معطّل.

**التحديث الحي والكاش**
- TT-57 حدث من المصدر يُبطل قسمه ويُعيد حساب Attention.
- TT-58 أحداث §8.2 كلها تُبطل الأقسام الصحيحة.
- TT-59 `today.invalidate` يصل المتصفح عبر SSE ويحدّث القسم فقط.
- TT-60 بديل الاستطلاع 60 ثانية يعمل عند فقدان الدفع.
- TT-61 ETag/304 يمنع إعادة نقل بيانات غير متغيّرة.
- TT-62 **cache لا يُبقي بيانات قديمة بعد mutation** (إبطال فوري).
- TT-63 stale-while-revalidate يعرض "قديم" ثم يحدّث.
- TT-64 الكاش المالي ≤ 60 ثانية ولا يُخزَّن في قاعدة بيانات.
- TT-65 إزالة العنصر من المصدر تزيله من Today.
- TT-66 **Today لا ينشئ سجلًا مكررًا للمصدر**.
- TT-67 انتقال منتصف الليل يُعيد بناء الأقسام تلقائيًا.
- TT-68 `day_start_hour=4` يُبقي الساعة 02:00 ضمن "أمس".
- TT-69 **المنطقة الزمنية صحيحة** (اليوم محلي لا UTC) في كل المصادر بنفس `date/tz`.
- TT-70 يوم التوقيت الصيفي (23/25 ساعة) سليم.

**التفضيلات والواجهة**
- TT-71 إخفاء/ترتيب بطاقة يُحفظ في Core ويتزامن بين الأجهزة.
- TT-72 لا جدول Today للتفضيلات (فحص المخطط).
- TT-73 الكثافة تغيّر العرض فقط.
- TT-74 الحالات الفارغة §11.3 كلها صحيحة.
- TT-75 وضع Focus يعرض "الآن" فقط ولا ينشئ سجلات.
- TT-76 شاشة Source Status تعكس حالات المصادر.
- TT-77 الودجت يعرض العدّاد والعنصر القادم.
- TT-78 RTL/عربي بلا قصّ وبنصوص مختلطة.
- TT-79 حدّ العناصر لكل بطاقة 5 + "عرض الكل".
- TT-80 `evening_time` و`nudge_time` قابلة للضبط وتؤثر على AR-H1/L1.
- TT-81 نطاق العمل (شخصي/فريق/الكل) يرشّح بلا تسريب.
- TT-82 شارة النطاق تظهر على عناصر الفريق/البيت.
- TT-83 تحميل تدريجي: لا تنتظر البطاقة الأبطأ.
- TT-84 قسم نظام جديد من المحوّلات يظهر دون تعديل الكود الأساسي.

**الملخصات والأمان**
- TT-85 الملخص الصباحي يُرسل في الوقت المحلي ولا يكرّر تذكيرات العناصر.
- TT-86 المراجعة المسائية تذكر المتبقي فقط.
- TT-87 المبالغ المالية مقنَّعة افتراضيًا وتُكشف بنقرة/بصمة.
- TT-88 بلا صلاحية Finance لا يظهر أي أثر مالي (بطاقة أو Attention أو ملخص).
- TT-89 قفل الحساس بعد خمول 60 ثانية.
- TT-90 رمز مفوَّض: Today لا يتجاوز صلاحيات المصدر.
- TT-91 `deep_link` غير موثوق يُرفض.
- TT-92 Rate limiting على `/today/*`.
- TT-93 إزالة عضو من Workspace تُخفي عناصره فورًا.
- TT-94 لا تسرّب بين نطاقات الفريق والبيت.
- TT-95 سجلات Today التشغيلية بلا بيانات شخصية.
- TT-96 كل إجراء يُسجَّل في `activity_log` لدى المالك.

---

## 19) قرارات تحتاج تأكيدك (لكل منها افتراضي مقترح)

| ID | القرار | الافتراضي | الأثر إن تغيّر |
|---|---|---|---|
| **TD-01** | قراءة "Finance OS" في رسالتك (لوحة مفاتيح مختلفة) | نعم، Finance | إن قصدت غيره أُعدّل القسم |
| **TD-02** | Today يضم **Sports** كمصدر ثامن | نعم | حذف البطاقة |
| **TD-03** | المبالغ المالية مقنَّعة افتراضيًا | نعم | إظهارها مباشرة |
| **TD-04** | تأجيل Attention وتفضيلاته في Core User Settings (لا جدول Today) | نعم | لا بديل مقبول بالمواصفة |
| **TD-05** | Home في Today = المستحق/المتأخر فقط | نعم | بديل: كل المفتوح (يغرق الشاشة) |
| **TD-06** | الإجراء عبر وسيط `POST /today/actions/execute` بجانب الاستدعاء المباشر | نعم | الاستدعاء المباشر فقط |
| **TD-07** | محوّل اختياري لـ"اللياقة" القديم/أنظمة أخرى | متاح بلا تفعيل | يُفعَّل لاحقًا |
| **TD-08** | الملخص الصباحي والمسائي مغلقان افتراضيًا | نعم | تفعيلهما |
| **TD-09** | `day_start_hour` = 0 | نعم | 4 للساهرين |
| **TD-10** | إعادة تسمية أحداث Projects إلى `projects.task.*` مع alias قديم | نعم | إبقاء `task.*` |
| **TD-11** | Content OS: العقد §15 ملزم له (لا مواصفة بعد) | نعم | يُعدَّل عند كتابة خطته |
| **TD-12** | حدّ Attention الظاهر 7 وفك التكرار بشارة | نعم | تغيير الأرقام |

---

## 20) مصفوفة التغطية — إثبات أن هذه الوثيقة تغني عن الملفين

### 20.1 الملف الإنجليزي (Independent Build Specification v2.0)
| بند الملف | أين في هذه الوثيقة |
|---|---|
| §1 حدّ المنتج، وما **لا** يُنشأ (Tasks/Habits/Learning/Meetings/Projects/Finance DB) | §3.1، §3.4 (1)، TT-07 |
| §2 Navigation (Header, Habits, Learning, Home, Meetings, Projects, Attention) | §11.1 (+Sports/Finance/Content) |
| §3 خريطة المصادر | §5، §15.1–15.2 |
| §4 Today Query Service و`TodaySnapshot` وخصائص كل عنصر وعدم تخزينه | §4.1–4.2، §14.1 |
| §5 Attention Engine (الشروط، الاحتفاظ بـ source ID) | §6 |
| §6 UI (Header, Habits, Learning, Home, Meetings, Projects, Attention) | §5، §11 |
| §7 توجيه الإجراءات | §7 |
| §8 التحديث/الأحداث | §8 |
| §9 تفضيلات المستخدم | §9 |
| §10 ترتيب التنفيذ | §17 |
| §11 تحسينات Notion→App | §1.3–1.4، §15.5، §21 |
| §12 الاختبارات (12) | TT-13…TT-24، TT-27، TT-65، TT-66، TT-69، TT-41 (وتشملها كلها) |

### 20.2 الملف العربي (وثيقة البناء المستقلة v3.0)
| بند الملف | أين في هذه الوثيقة |
|---|---|
| §1–2 المهمة والقرار المعماري (Query + Aggregation + Action Routing) | §3.1، §3.4 |
| §3 Navigation | §11.1 |
| §4 مصادر البيانات (الأعمدة: المصدر/ما يعرضه/Action) | §5، §15.2، §7.2 |
| §5 Today Snapshot (الحقول المحمولة) | §4.1–4.2 |
| §6 Attention Engine (+Content approvals) | §6.3 (AR-C2) |
| §7 Actions + invalidate بعد النجاح | §7.3 |
| §8 Screens (Today Home, Focus, Attention Drawer, Preferences) | §11.2 |
| §9 Event Model (أمثلة الأحداث) | §8.2 (مع توحيد الأسماء §15.3) |
| §10 Timezone (يوم محلي لا UTC) | §10 |
| §11 Cache القصير + الإبطال | §8.3 |
| §12 Empty States | §11.3 |
| §13 APIs (`GET /today`, `/today/attention`, `POST /today/refresh`، لا `POST /today/tasks`) | §14.2 |
| §14 Services (5) | §14.1 (تشملها كلها وتزيد) |
| §15 Security (لا يتجاوز صلاحيات المصدر؛ Finance) | §13 |
| §16 Automation (event-driven، recalculation، daily brief، reminders من المالك) | §12 |
| §17 الاختبارات (11) | TT-13…TT-24، TT-62، TT-65/66/69 |
| §18 ترتيب البناء | §17 |
| "قواعد التنفيذ المشتركة" (الحقول العامة + 8 قواعد) | §3.4 (Today بلا كيانات: لا حقول عامة سوى تفضيلات في Core) |

### 20.3 ما تضيفه هذه الوثيقة فوق الملفين
حسم التعارضات (§21) · سد الفجوات (§22) · **ثمانية مصادر** (Habit/Learning/Home/Knowledge/Projects/Finance/Content/Sports) · عقد `TodayItem`/`ActionDescriptor`/`feeds`/`attention` موحّد · 33 قاعدة Attention مسمّاة · خريطة أحداث · سياسة Cache · أمان المالية · خطة ترحيل صفحة Notion · 96 اختبارًا.

---

## 21) سجل التعارضات وكيف حُسمت

| ID | التعارض | المصادر | الحل |
|---|---|---|---|
| TC-01 | Today في Notion = Linked Views ثابتة لا تجميع ولا فلاتر نسبية | Notion | خدمة تجميع + Snapshot مُنمَّط |
| TC-02 | الملفان يسردان ستة أقسام؛ المطلوب الآن Finance وContent (وSports) | EN/AR/الطلب | ثمانية أقسام + Attention |
| TC-03 | مسارات/حقول الـ feeds في الخطط الأربع غير موحّدة (`/feeds/today` بلا نظام، `due_date` vs `due_time`، `actions[]`) | خطط v4 | عقد `TodayItem` + مسارات `/{module}/feeds/today` |
| TC-04 | أحداث المواصفة (`meeting.updated`, `maintenance.due`…) ≠ الأحداث الفعلية؛ وHabit/Finance/Content بلا أحداث | EN/AR/خطط | غلاف قانوني + جدول §8.2 + أحداث مطلوبة §15.1 |
| TC-05 | "Attention": الملفان يعدّدان شروطًا عامة؛ لا قواعد ولا ملكية | EN/AR | 33 قاعدة مسمّاة، **يملكها المصدر** |
| TC-06 | تكرار العنصر بين بطاقته وAttention (مهمة متأخرة في Projects وفي Attention) | الملفان | فك تكرار بـ`entity_key` + شارة |
| TC-07 | Content approvals: AR فقط، EN لا (وContent OS بلا مواصفة) | AR/EN | AR-C2 + عقد ملزم لـ Content |
| TC-08 | التفضيلات "في User Settings" لكن التأجيل لا مكان له | EN/AR | `today.snoozes` في Core User Settings |
| TC-09 | Cache "مسموح" لكن لا مدة ولا سياسة إبطال | AR | §8.3 (TTL 30–60ث + إبطال فوري + SWR) |
| TC-10 | `POST /today/refresh` موجود وبلا تعريف؛ وأوامر الإجراءات "لا كتابة محلية" | AR | وسيط بلا كتابة محلية + إبطال |
| TC-11 | الاختبارات: 12 (EN) مقابل 11 (AR) | EN/AR | 96 اختبارًا موحّدة |
| TC-12 | Finance: "لا تعرض بيانات حساسة" بلا تعريف الحساس | AR | `sensitivity` + تقنيع + صلاحيات |
| TC-13 | "Meetings" في Today = Knowledge؛ خطتي السابقة لـ Projects أنشأت اجتماعات | Projects/Knowledge | Knowledge يملكها (محسوم) |
| TC-14 | الملفان يقولان "اليوم محلي" بلا `day_start_hour` أو سفر أو DST | EN/AR | §10 |
| TC-15 | "Habits: 3–5 عادات" بلا تعريف الاختيار | EN | التركيز الأسبوعي + مستوى نمو |
| TC-16 | "مهام البيت المفتوحة" في Notion تُغرق Today بالمتكررة | Notion/Home | المستحق/المتأخر فقط |
| TC-17 | Today قد يُنشئ Session رياضية؟ (المواصفة الرياضية: لا) | Sports | الأمر `sessions/start` لدى Sports فقط |
| TC-18 | عادات اللياقة (تنفس/كيجل/فك/يوجا) في Notion Fitness تتكرر مع Habit OS | Notion | تُنقل لـ Habit OS؛ Today يقرأ منه |
| TC-19 | أحداث Projects بلا نطاق اسم (`task.*`) | خطة Projects | `projects.task.*` + alias |
| TC-20 | "Refresh" يدوي (Notion) مقابل تفاعلي | Notion | أحداث + SSE + استطلاع بديل |

---

## 22) سجل الفجوات والتحسينات

### 22.1 فجوات
| ID | الفجوة | الحل |
|---|---|---|
| TG-01 | لا عقد موحّد للـ feeds/attention | §4.4، §15 |
| TG-02 | لا ترتيب ولا فك تكرار للـ Attention | §6.4 |
| TG-03 | لا شرح "لماذا؟" لكل تنبيه | `explain` |
| TG-04 | لا تأجيل/إخفاء | §6.5 |
| TG-05 | لا سياسة لمصدر بطيء/معطّل | نتائج جزئية + stale |
| TG-06 | لا تعريف للإجراءات (descriptor، undo، optimistic) | §4.3، §7.3 |
| TG-07 | لا أوفلاين | §16 |
| TG-08 | لا خريطة أحداث → إبطال | §8.2 |
| TG-09 | لا سياسة أمان للمالية | §13 |
| TG-10 | لا تعامل مع نطاقات متعددة (فريق/بيت) | شارة نطاق + مرشّحات |
| TG-11 | لا تعريف لبداية اليوم/السفر/DST | §10 |
| TG-12 | لا حالات فارغة/مختلة | §11.3 |
| TG-13 | لا ودجت/إشعار صباحي | §12، §16 |
| TG-14 | لا إضافة مصادر جديدة بلا تعديل | SourceAdapterRegistry |
| TG-15 | لا تدقيق للإجراءات | `activity_log` عند المالك |
| TG-16 | لا حدود أداء | p95 ≤ 1.2 ث |

### 22.2 تحسينات مضافة (TE)
| ID | التحسين | الفائدة |
|---|---|---|
| TE-01 | **Focus mode** ("الآن" فقط) | هدوء |
| TE-02 | **إجراءات سريعة موحّدة** (سجّل دراسة/عادة/ابدأ تمرين/التقط) | سرعة |
| TE-03 | تجميع Attention (مهام متأخرة بمشروع) | إشارة بلا ضجيج |
| TE-04 | **ملخص صباحي/مسائي** اختياري | عادة يومية |
| TE-05 | تحميل تدريجي وبطاقات مستقلة | سرعة محسوسة |
| TE-06 | ودجت الشاشة الرئيسية/القفل | وصول فوري |
| TE-07 | محوّلات لمصادر جديدة | قابلية التوسع |
| TE-08 | ملخص "ما أنجزته اليوم" عند الفراغ | تحفيز |
| TE-09 | مبدّل نطاق العمل (شخصي/فريق/بيت) | تركيز |
| TE-10 | `day_start_hour` للساهرين | واقعية |

---

## ملحق أ) إعدادات المستخدم (في Core، لا في Today)
`today.cards.visibility/order/density` · `today.items_per_card=5` · `today.attention.min_severity/limit` · `today.finance.mask_amounts=true` · `today.day_start_hour=0` · `today.evening_time=18:00` · `today.source_priority[]` · `today.scope` · `today.brief.morning/evening` · `today.snoozes{}` · القنوات والإشعارات (Core).

## ملحق ب) اتساق العقود مع بقية الأقسام
| البند | العقد المشترك |
|---|---|
| الهوية والصلاحيات | Core؛ رمز مفوَّض لكل مصدر |
| الأحداث | غلاف قانوني `{event_id,type,source_system,user_id,occurred_at,entity_ref,payload}` عبر Outbox |
| Idempotency | `Idempotency-Key` و`client_op_id` لكل أمر |
| المراجع | `*_ref = {system,type,id}` |
| التوقيت | `date` و`tz` يُمرَّران لكل مصدر |
| الأرشفة | المصدر يستثني المؤرشف من feeds |
| Finance | حساس + `from-source` عند المالك |
| Today/Calendar | `feeds/today` و`attention` و`calendar-items` موحّدة |

*— نهاية الوثيقة (الإصدار 4.0) —*
