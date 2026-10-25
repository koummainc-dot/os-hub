# 👥 Relationships OS — خطة العمل الموحّدة والكاملة (الإصدار 4.0)

**الغرض:** وثيقة بناء **مكتفية بذاتها** لتطبيق **العلاقات الشخصية والمهنية** (ويب + موبايل، عربي RTL، يعمل أوفلاين كاملًا): من هو هذا الشخص؟ ما الذي يهمّه؟ متى آخر مرة تواصلنا؟ ماذا وعدته؟ أي مناسبة قادمة؟ ماذا أهديه؟ ومن اشتقت لأن أطمئن عليه؟ ليس دفتر Contacts، بل **ذاكرة اهتمام** تساعدك على أن تكون حاضرًا لمن تحب وتعمل معه. يعمل **كقسم مستقل تمامًا**، ومرتبط بأنظمتك (Finance، Shopping، Inventory، Travel، Projects، Knowledge، Today، Core) عبر **عقود API/Events فقط** — بلا جداول مشتركة ولا نسخ كيانات. نفس فلسفة وثائق Learning وFinance وNutrition وInventory وShopping ونفس هيكلها، بما يناسب طبيعة العلاقات: **بيانات أطراف ثالثة حسّاسة، لغة بلا لوم، ومؤشرات اهتمام لا أحكام على البشر**.

> **هذه الوثيقة تحلّ محلّ الملفين السابقين بالكامل** (`RELATIONSHIPS_OS_Independent_Build_Spec.md` EN و`RELATIONSHIPS_OS_وثيقة_البناء_المستقلة_العربية.md` AR). كل بند فيهما موجود هنا (انظر **مصفوفة التغطية في §19**) مع حسم التعارضات وسد الفجوات. لا يُرسَل الملفان القديمان لمنفّذ التطبيق.

**ما دخل في المراجعة:**

1. مواصفتا المصدر (EN + AR): 20 قسمًا + «قواعد التنفيذ المشتركة» (9 قواعد).
2. **Notion (قراءة فقط):** لا توجد بيانات علاقات شخصية فعلية مفحوصة؛ وجدت قاعدة **People** تابعة لمشروع Koumma (فريق شركة)، وقوالب في «Company Hub Template» (Personal Contacts، Gift Ideas، Holidays & Special Occasions، Personal Data)، وقاعدة People أخرى على مستوى الجذر **تديرها Notion ولا تُفتح عبر MCP** (§1.2).
3. وثائق **Finance OS v4.1** و**Shopping OS v4.0** (حدود الهدايا) و**Inventory OS v4.0** (القروض/الإعارة) و**Nutrition OS v4.0** كقالب.
4. **القرارات المشتركة CX-01…CX-22** (ملزمة) — وأهمها **CX-01: Relationships هو المالك الوحيد لكيان «الشخص»**.

**المرجع الأعلى عند التعارض:** هذه الوثيقة ← سلوك Notion الفعلي ← مواصفتا المصدر.

> **تنبيه أمانة:** هذه الوثيقة **أداة تنظيم واهتمام** وليست علاجًا نفسيًا ولا نصيحة اجتماعية أو قانونية. «صحة العلاقة» **إشارة اهتمام شفافة** تشرح سببها وتقبل التجاهل والإيقاف؛ لا تصنّف أي إنسان («سام»، «غير مهم»…) ولا تحكم على علاقة. تخزين بيانات أشخاص آخرين مسؤولية حساسة: يُطبَّق مبدأ **أقل بيانات ممكنة** (§14). لا scraping ولا قراءة رسائل أو مكالمات (CX-22): أي ميزة تعتمد على مصدر خارجي غير مفحوص موسومة **«غير مؤكد — يُتحقق قبل البناء»**.

> **مفاتيح القراءة:** `RF` ميزة محفوظة من المصدر · `RC` تعارض محسوم · `RG` فجوة مسدودة · `RE` تحسين مضاف · `RD` قرار يحتاج تأكيدك (بتوصية افتراضية) · `RV` قاعدة تحقق · `RA` أتمتة · `RT` اختبار قبول. (الحرف **R** = Relationships، حسب CX-18.) و`CX-xx` = القرارات المشتركة.

---

## 1) مراجعة المصدر وحكم على كل عنصر

### 1.1 ملخص المراجعة
المصدر جيد البنية (11 كيانًا + Health + Networking) لكنه يحمل **تعارضات داخلية** يجب حسمها قبل البناء:
- **الدور مكرر في ثلاثة أماكن:** `relationship_kind` في People و`type` في Relationships (قائمتان مختلفتان؛ «Important» مثلًا ليست نوع علاقة بل درجة أهمية)، و`importance` في الجدولين.
- **جدول Relationships غامض:** فيه `person_id` و`related_person_id` لكن المستخدم نفسه ليس «شخصًا»؛ هل هي علاقة المستخدم بالشخص أم علاقة شخص بشخص؟
- **الميلاد مكرر:** `People.birthday` وOccasion من نوع Birthday.
- **الدائرة مفردة** (`circle_id`) بينما الواقع: أمي «عائلة» وأيضًا «الدائرة الأقرب».
- **التفاعل مرتبط بشخص واحد** رغم أن معظم اللقاءات جماعية (عشاء عائلي).
- **`next_follow_up_at` داخل Interaction** مع جدول Follow-ups: مكرران.
- **Neglected مثال واحد** (`days > interval`) لا يترك مساحة لـ«Needs Attention»، والـHealth مبني على مدخلات لا وزن لها.
- **الهدايا:** `purchased_at` و`finance_transaction_id` داخل Gift يتصادم مع Shopping (يملك قرار الشراء) ومع Finance (يملك الدفع).
- **Relationship Goals مقابل `default_contact_interval_days`:** «أتصل بأمي أسبوعيًا» هدف أم فاصل؟
- **occupation/organization في People** مقابل Professional Context في Networking.
- **لا توجد قواعد** لتنظيف البيانات (دمج مكررين، أرشفة، شخص متوفى، علاقة منتهية) ولا للخصوصية رغم أن البيانات عن أطراف ثالثة.
- «Finance يستقبل gift purchase» يتعارض مع «Shopping يملك الشراء» إن اشتُري الهدية من Shopping.

### 1.2 ما وجدته في Notion (قراءة فقط)
| العنصر | الموقع | الحقيقة المفحوصة | الأثر |
| :---- | :---- | :---- | :---- |
| **People** (قاعدة) | Koumma / Projects / Databases | **فريق شركة**: Name، Title (CEO/Co Founder)، Role (Consultant/Employees)، **Base Salary**، علاقات Meeting/Project/Team/PRD | **ليست علاقات شخصية.** لا تُستورد افتراضيًا؛ **الراتب لا يُستورد أبدًا**؛ تُعرض كاختيار «جهات مهنية» (§15) |
| **People** (قاعدة جذرية) | جذر مساحة العمل (آخر تعديل 2026-09-15) | **«managed by Notion — غير متاحة عبر MCP»** | لم أستطع فحصها. **غير مؤكد — اسألك هل هي قاعدة أشخاص خاصة بك** (RD-09) |
| **Contacts** | Koumma / Financial & Funding Goals Planner | قاعدة جهات اتصال لمخطط تمويل (لم تُفحص أعمدتها) | مرجّح مهنية (Koumma)؛ **غير مؤكد** |
| **Personal Contacts** | Company Hub Template / Management System | صفحة بها «EMERGENCY CONTACT: الاسم/العلاقة/الهاتف» (فارغة) + قاعدة «List of Stakeholders» (لم تُفحص صفوفها) | قالب شركة؛ أفاد فكرة **جهة اتصال الطوارئ** (RG-14) |
| **Gift Ideas** | نفس القالب | صفحة (لم تُفتح) | قالب؛ لا بيانات مؤكدة |
| **Holidays & Special Occasions** | Calendar Management | قاعدة (لم تُفتح) | قالب مناسبات عامة |
| **Personal Data** | نفس القالب | صفحة بها «Birthday:» | قالب شركة |
| «Muslim Life OS» | Damen's / Home | قالب (يخص Spiritual لا هنا) | خارج النطاق |

> **لم أفحص صفوف أي قاعدة** (تفاديًا لقراءة بيانات أشخاص حقيقيين بلا حاجة)، ولا أحتفظ بأي بيانات شخصية منها. النتيجة الأمينة: **لا توجد بيانات علاقات شخصية مؤكدة** في Notion للهجرة؛ لذلك الهجرة اختيارية (§15) والنظام يبدأ فارغًا أو بـ CSV/vCard.

### 1.3 حكم على كل عنصر من المصدر
| # | العنصر في المصدر | الحكم | المعالجة | أين |
| :---- | :---- | :---- | :---- | :---- |
| 1 | هدف: ليس دفتر Contacts | **اعتماد** | محور النظام: ذاكرة اهتمام | §4 |
| 2 | يملك 11 كيانًا | **اعتماد + تدقيق** | + جداول مساعدة (مشاركون، روابط) | §3.2 |
| 3 | لا يملك Calendar/Tasks/Finance/Meetings/Projects | **اعتماد** | مراجع ناعمة فقط | §3.2، §11 |
| 4 | People: 14 حقلًا | **تعديل** | الهوية فقط؛ الهاتف/البريد جدول؛ الدور والأهمية انتقلا لـ«الرابطة» | RC-01، RC-02 |
| 5 | `last_contact_at` مشتق | **اعتماد** | Cache قابل لإعادة البناء، ولا يُعدَّل يدويًا | §6.1 |
| 6 | Relationships (person/related_person) | **حسم** | رابطة المستخدم↔الشخص + `person_links` شخص↔شخص | RC-03 |
| 7 | type/closeness/status | **اعتماد مع توحيد** | قائمة أدوار موحّدة | RC-01 |
| 8 | منع self-relation والازدواج | **اعتماد** | قيود DB | §5، RV |
| 9 | Interactions (person_id واحد) | **تعديل** | مشاركون متعددون | RC-05 |
| 10 | channel/direction | **اعتماد** | + `counts_as_contact` | RC-06 |
| 11 | `next_follow_up_at` | **حسم** | اختصار واجهة ينشئ Follow-up | RC-07 |
| 12 | Follow-ups Open/Done/Snoozed/Cancelled | **اعتماد** | + `snoozed_until` + Overdue مشتقة | §9.1 |
| 13 | لا Task duplicate | **اعتماد** | `task_ref` اختياري | RC-08 |
| 14 | Occasions | **تعديل** | الميلاد = مناسبة مولَّدة؛ هجري؛ تذكيرات متعددة | RC-04، RC-12 |
| 15 | Interests / Person Facts | **اعتماد + تقييد** | حساسية الفئات | RC-14 |
| 16 | Gifts (Idea→…→Archived) | **تعديل** | مسار شراء واحد (Shopping أو مباشر) | RC-09 |
| 17 | Circles | **تعديل** | دائرة أساسية + عضويات | RC-10 |
| 18 | Relationship Goals | **تعديل** | لا تكرار مع الفاصل | RC-11 |
| 19 | Relationship Health | **تعديل** | سلّم حالات + سبب + إشارات | RC-13 |
| 20 | Networking | **دمج** | الملف المهني يحل محل occupation/organization | RC-15 |
| 21 | Home experience / Person Detail | **اعتماد** | + لوحة «ما بينكم» | §10 |
| 22 | الأتمتة (7) | **اعتماد** | + دورة قبول/تجاهل بلا إزعاج | §12 |
| 23 | التكامل (Today/Calendar/Finance/Knowledge/Projects) | **اعتماد مع حدود** | Calendar بلا أسماء افتراضيًا | §11 |
| 24 | الخدمات (12) | **اعتماد** | + خدمات مساعدة | §17 |
| 25 | الاختبارات العشرة | **اعتماد** | ضمن 60+ اختبارًا | §16 |
| 26 | القواعد التسع المشتركة | **اعتماد + مواءمة** | FK داخل القسم فقط، مراجع ناعمة عبر الأقسام | §3.3 |
| 27 | لا قواعد للدمج/الأرشفة/الوفاة | **إضافة** | RG-01…RG-05 | §8 |
| 28 | لا خصوصية لبيانات الأطراف الثالثة | **إضافة** | طبقات حساسية + تشفير حقول | §14 |

---

## 2) جرد الميزات المحفوظة (RF — كلها)

| ID | الميزة / القاعدة (من المصدر) | أين |
| :---- | :---- | :---- |
| RF-01 | ليس دفتر Contacts: من الشخص، ما يهمه، سجل التواصل، المتابعات، المناسبات، الهدايا، الدوائر، المهنية، من يحتاج إعادة تواصل | §4 |
| RF-02 | يملك: People, Relationships, Interactions, Follow-ups, Occasions, Interests, Person Facts, Gifts, Circles, Relationship Goals, Professional Context | §3.2 |
| RF-03 | لا يملك: Calendar العام، Tasks العامة، Finance Transactions، Meetings/Events الأصلية، Projects الأصلية | §3.2، §11 |
| RF-04 | الرحلة: Person → Profile → Timeline → Follow-up/Occasion/Gift → Relationship Health | §4.3 |
| RF-05 | الشاشات: Home، People، Person Detail، Timeline، Follow-ups، Occasions، Gifts، Circles، Networking، Insights، Settings | §10 |
| RF-06 | People: id, user_id, first_name, last_name, display_name, avatar, birthday, phone, email, location, occupation, organization, relationship_kind, circle_id, importance, notes | §5.2 |
| RF-07 | `last_contact_at` مشتق من أحدث Interaction | §6.1 |
| RF-08 | Relationships: id, user_id, person_id, related_person_id, type, closeness, importance, started_at, status, notes | §5.3 |
| RF-09 | type = Family/Friend/Partner/Colleague/Mentor/Client/Other | §5.12 |
| RF-10 | closeness = Distant/Normal/Close/Very Close | §5.12 |
| RF-11 | status = Active/Paused/Ended | §5.12، §9.1 |
| RF-12 | لا self-relation ولا ازدواج غير مقصود | §5.3، RV |
| RF-13 | Interactions: person_id, relationship_id, occurred_at, channel, direction, subject, summary, sentiment, next_follow_up_at, notes, source | §5.5 |
| RF-14 | Channel: Call/WhatsApp/Message/Email/In Person/Social/Other | §5.12 |
| RF-15 | Direction: Incoming/Outgoing/Mutual | §5.12 |
| RF-16 | كل تعديل يعيد حساب آخر تواصل وSignals العلاقة | §6.1، §6.3 |
| RF-17 | Follow-ups: person_id, interaction_id, title, due_date, status, priority, notes | §5.6 |
| RF-18 | Follow-up status: Open/Done/Snoozed/Cancelled | §9.1 |
| RF-19 | لا Task duplicate؛ يُعرض في Today أو يُربط بمهمة أصلية | §11.6، RC-08 |
| RF-20 | Occasions: person_id, type, date, recurrence, reminder_days, notes | §5.7 |
| RF-21 | Type: Birthday/Anniversary/Important Date/Custom | §5.12 |
| RF-22 | Recurrence: Yearly/Once | §6.6 |
| RF-23 | Interests: person_id, name, category, importance, notes | §5.8 |
| RF-24 | Person Facts: person_id, key, value, importance, last_verified_at | §5.8 |
| RF-25 | الحقائق للمعلومات التي تحتاجها الواجهة/الأتمتة | §5.8، §6.14 |
| RF-26 | Gifts: person_id, occasion_id, name, status, estimated_cost, purchased_at, given_at, finance_transaction_id, notes | §5.9 |
| RF-27 | Gift lifecycle: Idea → Planned → Purchased → Given → Archived | §9.1 |
| RF-28 | Finance يملك الدفع الحقيقي | §11.3 |
| RF-29 | Circles: name, type, priority, description, default_contact_interval_days | §5.4 |
| RF-30 | أمثلة دوائر: Family, Inner Circle, Friends, Professional, Networking, Mentors | §15.3 |
| RF-31 | Relationship Goals: person_id, title, target, status, next_action, target_date, notes | §5.10 |
| RF-32 | لا Global Goals duplicate | §3.2، RC-11 |
| RF-33 | Health مشتق من: أيام منذ آخر تواصل، تكرار التفاعل، متابعة متأخرة، مناسبة فائتة، تقييم يدوي اختياري | §6.3 |
| RF-34 | العرض: Healthy / Needs Attention / Neglected | §6.3 |
| RF-35 | مثال Neglected: importance ≥ Medium AND days > circle interval | §6.3 |
| RF-36 | إشارة اهتمام وليست حكمًا على العلاقة | §3.5 |
| RF-37 | Networking: organization, role, industry, source/event, last interaction, next follow-up, introduction notes | §5.11، §10.3 |
| RF-38 | الربط بـKnowledge Meetings/Events وProjects | §11.5 |
| RF-39 | Home: Important People, Needs Attention, Today's Occasions, Follow-ups, Recent Interactions, Suggested Reconnection | §10.2 |
| RF-40 | Person Detail: Profile, Relationship, Timeline, What Matters, Interests, Follow-ups, Occasions, Gifts, Professional Context | §10.3 |
| RF-41 | أتمتة: تذكير ميلاد/مناسبة | RA-01 |
| RF-42 | أتمتة: تذكير متابعة | RA-03 |
| RF-43 | أتمتة: كشف الإهمال | RA-05 |
| RF-44 | أتمتة: اقتراحات إعادة التواصل | RA-06 |
| RF-45 | أتمتة: تذكير هدية قبل المناسبة | RA-02 |
| RF-46 | تذكير من `next_follow_up_at` | RA-03، RC-07 |
| RF-47 | مراجعة أسبوعية اختيارية | RA-10 |
| RF-48 | Today يسحب follow-ups/occasions/important neglected | §11.6 |
| RF-49 | Calendar يعرض التواريخ دون نسخ | §11.6 |
| RF-50 | Finance يستقبل gift purchase | §11.3، RC-09 |
| RF-51 | Knowledge يربط الأشخاص بالمواعيد والاجتماعات | §11.5 |
| RF-52 | Projects يربط العلاقات المهنية بالمشروعات | §11.5 |
| RF-53 | الخدمات الاثنتا عشرة (Person…Notification) | §17 |
| RF-54 | الاختبارات العشرة | §16 (RT-01…RT-10) |
| RF-55 | القواعد التسع المشتركة | §3.3 |

---

## 3) المبادئ والحدود بين الأقسام

### 3.1 ما هو Relationships OS
نظام يجيب عن: **من أهتم به؟ متى آخر مرة؟ ما الذي ينتظرني معه؟ ما الذي يسعده؟** ولا يجيب عن: ماذا أفعل في اجتماعي (Knowledge)، ما مهمتي (Tasks)، كم دفعت (Finance).

### 3.2 مصفوفة الملكية
| الكيان | يملكه | غيره يخزّن فقط |
| :---- | :---- | :---- |
| **الشخص** (الاسم، الميلاد، وسائل الاتصال، الصورة) | **Relationships** (CX-01) | Finance (دَيْن)، Travel (رفيق)، Inventory (إعارة)، Projects، Knowledge، Shopping (هدية): `person_ref` + `display_name_snapshot` |
| الرابطة (الدور، القرب، الأهمية، الحالة) | Relationships | — |
| التفاعلات، المتابعات، المناسبات، الاهتمامات، الحقائق، الدوائر | Relationships | — |
| الهدية (الفكرة، الخطة، الإهداء، التاريخ) | Relationships | Shopping: `shopping_purchase_ref` |
| **شراء الهدية** | **Shopping** (قرار وشراء) أو Relationships عند الشراء المباشر | — |
| **الدفع الفعلي** | **Finance** | رابط `relationship_gifts_finance_links` للمسار المباشر فقط |
| المواعيد والاجتماعات | Knowledge/Calendar | `meeting_ref` ناعم |
| المهام | Core Tasks/Today | `task_ref` ناعم |
| المشروعات | Projects | `project_ref` ناعم |
| القروض/الإعارة | Inventory | لوحة قراءة «ما بينكم» |
| الأهداف المالية | Finance | لا تُكرَّر (RC-11) |
| العادات (اتصل بأمي كل جمعة كروتين) | Habit | هذا النظام يحسب الفاصل لا الروتين |

### 3.3 المبادئ (ملزمة)
1. **الشخص واحد في النظام كله** (CX-01): أي قسم آخر يطلب الشخص عبر Picker ويخزّن مرجعًا ناعمًا بحالة Valid/Missing/NoAccess، ويعمل بالاسم الحر إن لم يوجد Relationships.
2. **لا FK عبر الأقسام**؛ داخل القسم FK مركّب `(parent_id, user_id)`.
3. **المشتقات** (آخر تواصل، الحالة، العمر، التالي من المناسبة) Cache يُعاد بناؤه ولا يُحرَّر يدويًا.
4. **التاريخ لا يُمحى:** التفاعلات والتغييرات المهمة إلحاق فقط؛ الأرشفة لا تحذف.
5. **الخادم مرجع الأمان**؛ `user_id` من الجلسة.
6. **لا لوم:** لا «أهملت»، بل «مرّ 45 يومًا — هل تحب أن تطمئن عليه؟».
7. **الإشارات ≠ أحكام:** الحالة تُوقَف لكل شخص أو للنظام كله بنقرة؛ ولا تُصدَّر ولا تُرسَل لأي قسم.
8. **أقل بيانات:** حقول اختيارية، لا إلزام إلا الاسم الظاهر.
9. **تذكيرات هادئة:** ساعات هدوء، سقف يومي، تجميع، شاشة قفل محايدة (CX-12).
10. **الأوفلاين أولًا** (§13).
11. **الإعدادات الافتراضية آمنة:** لا رفع جهات اتصال تلقائي، لا تكامل مفعّل بلا موافقة.

### 3.4 مصفوفة التدهور (Degradation)
| ما يتعطل | ما يستمر | ما يظهر |
| :---- | :---- | :---- |
| Finance | كل العلاقات، الهدايا (الشراء المباشر يبقى `Pending`) | «الدفع قيد المزامنة» |
| Shopping | الهدايا تُدار يدويًا | زر «اطلب من Shopping» معطّل |
| Inventory/Travel/Projects/Knowledge | كل الوظائف الأساسية | لوحة «ما بينكم» تخفي القسم المعطّل |
| Core Notifications | التذكيرات المحلية على الجهاز | تنبيه «قد تتأخر التنبيهات» |
| Core Calendar | يظهر المناسبات داخل التطبيق | ICS اختياري |
| الشبكة | **كل شيء** محليًا | شارة «غير متزامن» |

### 3.5 الخصوصية والصياغة
- **نبرة:** عربية بسيطة، دافئة، بلا لوم، بلا أحكام على أشخاص.
- **ممنوع في الواجهة:** «سام»، «غير مهم»، «خسرته»، «علاقتك ضعيفة»، أو أي تقييم قيمي لإنسان؛ يُفحص بـ CI (RT-60).
- **الحساسية:** كل كيان له Tier (§14.1)؛ ملاحظات وحقائق صحية/دينية/سياسية/مالية عن الغير **Sensitive افتراضيًا** مع تحذير.
- **الأطراف الثالثة:** لا يُرسَل اسم أو ملاحظة لأي قسم آخر؛ مرجع + snapshot اسم فقط.

---

## 4) النموذج المفاهيمي

### 4.1 خريطة الكيانات
```text
Person ──(1:1)── Bond(relationship) ── Circles (primary + memberships)
  │                 │
  │                 └── Health (Cache)
  ├── ContactMethods        ├── Interactions (⇄ participants)
  ├── Facts / Interests     ├── Follow-ups (→ task_ref?)
  ├── Occasions (→ Gift)    ├── Gifts (→ shopping_purchase_ref | finance link)
  ├── ProfessionalProfile / Affiliations / Introductions
  ├── PersonLinks (person↔person)
  └── ExternalRefs (Travel / Projects / Knowledge / Inventory loans)
```

### 4.2 المفاهيم
- **الشخص:** هوية فقط (اسم، ميلاد، وسائل اتصال، صورة، موقع نصي).
- **الرابطة (Bond):** علاقتك أنت به: الدور (متعدد)، القرب، الأهمية، الحالة، منذ متى. لكل شخص رابطة واحدة.
- **الدائرة:** تصنيف يحمل فاصل تواصل افتراضي؛ لكل شخص دائرة **أساسية** تحدد الفاصل، وعضويات إضافية.
- **التفاعل:** حدث تواصل (مكالمة، لقاء…) قد يضم عدة أشخاص.
- **المتابعة:** التزام صغير بتاريخ («أسأله عن الامتحان»).
- **المناسبة:** تاريخ سنوي أو مرة واحدة (ميلاد، ذكرى، تاريخ مهم) بتقويم ميلادي أو هجري.
- **الحقيقة/الاهتمام:** ما يهمّه (يحب القهوة بلا سكر، مقاس الحذاء، فريقه المفضل).
- **الهدية:** فكرة ← خطة ← شراء ← إهداء.
- **الصحة (إشارة اهتمام):** Healthy / Needs Attention / Neglected / NotTracked، مع سببها.

### 4.3 رحلات الاستخدام
1. **إضافة شخص بسرعة (10 ثوانٍ):** الاسم فقط ← يظهر في القائمة ← أضف دورًا ودائرة لاحقًا.
2. **تسجيل تفاعل:** «كلمت أخي» ← زر واحد: القناة + ملاحظة قصيرة ← يتحدث «آخر تواصل» ويُغلق تنبيه الاهتمام ← اقتراح اختياري «تابع في…».
3. **مناسبة قادمة:** يوم الميلاد −7 ← «عيد ميلاد ‹اسم› بعد أسبوع — لسه مفيش هدية» ← فكرة/اختيار من Shopping ← إهداء ← أرشفة.
4. **اشتقت:** بطاقة «اقتراحات إعادة تواصل» (حتى 3) ← رسالة/مكالمة ← تسجيل.
5. **قبل لقاء مهني:** افتح الشخص ← آخر ما قلناه + الاهتمامات + ما وعدت به ← أضف متابعة بعد اللقاء.

---

## 5) نموذج البيانات الكامل

### 5.0 الحقول العامة والقواعد
- كل كيان رئيسي: `id UUID`, `user_id`, `created_at`, `updated_at`, `version int` (للتزامن)، `deleted_at` (حذف ناعم)، `origin_device`.
- كل جدول فرعي يكرّر `user_id` وله FK مركّب `(parent_id, user_id)`؛ RLS على `user_id = auth.uid()`.
- التواريخ: `date` (ميلاد، استحقاق) بلا منطقة زمنية؛ `timestamptz` + `tz` للتفاعلات. اليوم المحلي = `settings.timezone`.
- المراجع الخارجية: `{system, type, id}` + `display_snapshot` + `ref_state {Valid|Missing|NoAccess}` — بلا FK (CX-02).
- المشتقات في `rel_derived_cache` فقط (§5.13) ولا تُحرَّر.
- أسماء الجداول بالبادئة `rel_`.

### 5.1 الإعدادات
**`rel_settings`** (صف لكل مستخدم): `timezone`, `language`, `week_start`, `quiet_hours {from,to}`, `daily_notification_cap` (افتراضي 5), `default_contact_interval_days` (افتراضي 30)، `health_enabled` (افتراضي true), `neglect_grace_days` (7), `reconnect_suggestions_per_day` (3), `suggestions_enabled`, `weekly_review {enabled, day, time}`, `lockscreen_neutral` (true), `calendar_show_names` (false), `hijri_algorithm {umm_al_qura|tabular}` (RD-03), `feb29_rule {Feb28|Mar1}` (Feb28), `mask_names_in_widgets` (true), `integrations {finance, shopping, inventory, travel, projects, knowledge}` (كلها false افتراضيًا), `app_lock`, `import_contacts_consent`.

### 5.2 الأشخاص
**`rel_people`**
| الحقل | النوع | إلزامي | قيد/ملاحظة |
| :---- | :---- | :---- | :---- |
| id, user_id | UUID | نعم | |
| first_name | text | نعم* | *أو `display_name` فقط |
| last_name | text | لا | |
| display_name | text | نعم | يُولَّد من الاسمين ويقبل التعديل (`display_name_manual`) |
| nickname | text | لا | |
| alt_names | text[] | لا | لغات/تهجئات للبحث (≤ 5) |
| name_search | text | نعم | مُطبَّع عربي/إنجليزي (§6.17) |
| avatar_file_ref | ref | لا | Core Files؛ الصورة Sensitive |
| birth_month, birth_day | smallint | لا | معًا أو لا شيء |
| birth_year | smallint | لا | اختياري (سنة مجهولة مسموحة) |
| birth_calendar | enum | لا | `gregorian|hijri` (افتراضي gregorian) |
| location_text | text | لا | نص حر (مدينة/بلد) — لا إحداثيات |
| timezone | IANA | لا | لتوقيت الاتصال المقترح |
| life_state | enum | نعم | `Active|Archived` (افتراضي Active) |
| archive_reason | enum | لا | `Distance|Ended|PassedAway|Duplicate|Other` |
| reminders_paused | bool | نعم | يوقف كل التذكيرات للشخص |
| is_emergency_contact | bool | نعم | افتراضي false (RG-14) |
| merged_into_id | UUID | لا | بعد الدمج (§6.11) |
| notes_enc | bytea | لا | ملاحظة عامة مشفّرة على مستوى الحقل |
| privacy_tier | enum | نعم | `Normal|Sensitive|Secret` (افتراضي Normal؛ Sensitive لو فيه حقائق حساسة) |
| import_source, import_key | text | لا | `UNIQUE(user_id, import_key)` |

**`rel_person_contact_methods`**: `id, user_id, person_id, kind {Phone|WhatsApp|Email|Telegram|Other}, value_raw, value_norm (E.164 أو lowercase)، label {Mobile|Home|Work|Other}, is_primary, UNIQUE(user_id, person_id, kind, value_norm)`.

**الحقول التي أُزيلت من People ولماذا:** `phone/email` → جدول (RC-01)؛ `relationship_kind/importance/circle_id` → `rel_relationships` (RC-02)؛ `occupation/organization` → الملف المهني (RC-15)؛ `birthday` → ثلاثة حقول ميلاد + مناسبة مولَّدة (RC-04).

### 5.3 الرابطة والروابط بين الأشخاص
**`rel_relationships`** (رابطتك بالشخص — واحدة لكل شخص)
| الحقل | النوع | ملاحظة |
| :---- | :---- | :---- |
| person_id | FK | `UNIQUE(user_id, person_id)` |
| roles | enum[] (≥1) | `Family|Partner|Friend|Colleague|Client|Mentor|Mentee|Acquaintance|Professional|Other` + `role_label` نصي حر (أخ، جار…) |
| closeness | enum | `Distant|Normal|Close|VeryClose` (افتراضي Normal) |
| importance | enum | `Low|Medium|High|Critical` (افتراضي Medium) |
| status | enum | `Active|Paused|Ended` |
| status_reason | text | اختياري |
| started_at | date | منذ متى نعرف بعض (اختياري) |
| primary_circle_id | FK | يحدد الفاصل |
| contact_interval_override_days | int | يتفوّق على الدائرة (RC-11) |
| manual_health_rating | smallint 1..5 | اختياري، معلوماتي |
| health_tracking | enum | `Default|Off` (إيقاف لشخص بعينه) |
| suggest_reconnect | bool | افتراضي true؛ false = لا اقتراحات |
| notes_enc | bytea | |

**`rel_person_links`** (شخص ↔ شخص، اختياري): `id, user_id, person_a_id, person_b_id, link_type {SpouseOf|ParentOf|SiblingOf|ColleagueOf|FriendOf|IntroducedBy|Other}, direction, note`؛ قيد `CHECK (person_a_id <> person_b_id)` و`UNIQUE(user_id, least(a,b), greatest(a,b), link_type)`. (يغطي منع الـself-relation والازدواج لـRF-12.)

### 5.4 الدوائر
**`rel_circles`**: `id, user_id, name, type {Family|Inner|Friends|Professional|Networking|Mentors|Custom}, priority smallint, description, default_contact_interval_days int NULL (NULL = غير متتبَّعة), color, is_system bool, archived_at`.
**`rel_person_circles`**: `person_id, circle_id, PRIMARY KEY (person_id, circle_id)` — عضويات إضافية (الأساسية في الرابطة).

### 5.5 التفاعلات
**`rel_interactions`**: `id, user_id, occurred_at timestamptz, tz, channel {Call|WhatsApp|Message|Email|InPerson|Social|Other}, direction {Incoming|Outgoing|Mutual}, subject, summary_enc, sentiment {Positive|Neutral|Difficult} NULL (عن التفاعل لا عن الشخص)، counts_as_contact bool, duration_min, source {Manual|QuickLog|Suggestion|Import|TravelProposal|Calendar}, source_key (UNIQUE مع user_id)، client_op_id, notes_enc, privacy_tier`.
**`rel_interaction_people`**: `interaction_id, person_id, PRIMARY KEY(interaction_id, person_id)` (RC-05؛ ≥1 مشارك).
- لا تفاعل في المستقبل: `occurred_at > now()+5min` → يُرفض ويُقترح «أنشئ متابعة» (RV).

### 5.6 المتابعات
**`rel_follow_ups`**: `id, user_id, person_id, interaction_id NULL, title, due_date, due_time NULL, status {Open|Done|Snoozed|Cancelled}, snoozed_until, priority {Low|Normal|High}, done_at, kind {Promise|Ask|Reminder|Topic}, origin {Manual|Interaction|Suggestion|Gift|Occasion}, origin_key (UNIQUE مع user_id لمنع التكرار)، task_ref {system,id}+snapshot NULL, notes_enc`.

### 5.7 المناسبات
**`rel_occasions`**
| الحقل | ملاحظة |
| :---- | :---- |
| person_id, with_person_id NULL | مثل ذكرى زواج بين شخصين |
| type | `Birthday|Anniversary|ImportantDate|Remembrance|Custom` + `title` |
| origin | `User|PersonBirthday` (المولَّد من الميلاد: لا يُحذف إلا بحذف الميلاد) |
| calendar_system | `gregorian|hijri` |
| month, day, year NULL | `year` = السنة الأصلية (للعمر/ذكرى كم) |
| day_offset | -1,0,+1 (للهجري، CX-15) |
| recurrence | `Yearly|Once` (+ `once_date` عند Once) |
| reminder_days | smallint[] افتراضي `{7,1,0}` للميلاد |
| gift_expected | bool |
| show_in_calendar | bool |
| notes_enc | |
| archived_at | |

### 5.8 الاهتمامات والحقائق
**`rel_interests`**: `id, user_id, person_id, name, category_id, importance {Low|Medium|High}, notes`; `UNIQUE(user_id, person_id, lower(name))`. **`rel_interest_categories`**: `id, user_id, name, is_system`.
**`rel_person_facts`**: `id, user_id, person_id, key, value_enc, value_type {Text|Number|Date|Enum}, category {Preference|Size|Dietary|Family|Work|Other|Sensitive}, importance, last_verified_at, privacy_tier, source`؛ `UNIQUE(user_id, person_id, key)` لغير المتكرّر. مفاتيح جاهزة: `shoe_size`, `clothing_size`, `favorite_drink`, `favorite_food`, `dislikes`, `favorite_team`, `spouse_name`, `children_names`, `address_note`…
- فئة `Sensitive` (حساسية غذائية/طبية، دين، سياسة، مال): `privacy_tier=Sensitive` إجباري، تُشفَّر، تُخفى من البحث والويدجت والمشاركة، وتظهر عليها تحذيرية «بيانات شخص آخر — احفظ فقط ما تحتاجه» (RC-14).

### 5.9 الهدايا
**`rel_gifts`**
| الحقل | ملاحظة |
| :---- | :---- |
| id, user_id | |
| person_id, occasion_id NULL | |
| direction | `Given|Received` (RE-05) |
| name, description | |
| status | `Idea|Planned|Purchased|Given|Archived` |
| archive_reason | `Dropped|Replaced|Done|Other` |
| estimated_cost, currency | نص عشري + ISO-4217 |
| actual_cost, actual_currency | يُملأ من Shopping/Finance أو يدويًا |
| purchase_path | `None|Shopping|Direct` |
| shopping_item_ref / shopping_purchase_ref | `{system:'shopping',…}` + snapshot + state |
| purchased_at, given_at, planned_by_date | |
| surprise | bool (يرفع الحساسية Secret) |
| reaction | `Loved|Liked|Neutral|Unknown` اختياري، ملاحظة الإهداء |
| source_key | UNIQUE (idempotency) |
| privacy_tier | Sensitive افتراضيًا |
**`rel_gift_events`** (إلحاق فقط): `gift_id, event {Created|StatusChanged|Linked|Unlinked|Corrected}, from_status, to_status, at, note`.
**`rel_gifts_finance_links`** (للمسار المباشر فقط): `id, user_id, gift_id, source_type='relationship_gift', source_id, idempotency_key, sync_status {NotRequired|Pending|Synced|Failed|Detached|Legacy}, finance_transaction_ref (cache), amount, currency, attempts, last_error`.

### 5.10 الأهداف
**`rel_goals`**: `id, user_id, person_id NULL (NULL = هدف عام للعلاقات), title, kind {Milestone|Habitual|Text}, target_text, target_date, status {Active|Done|Dropped|Paused}, next_action, next_action_due, notes_enc`. (لا أهداف مالية ولا تكرار لفاصل التواصل — RC-11.)

### 5.11 الملف المهني والتعريفات
**`rel_professional_profiles`**: `person_id (UNIQUE), headline, industry, how_met {Event|Intro|Online|Work|Other}, how_met_detail, met_on date, linkedin_url NULL, intro_notes_enc, next_follow_up_note`.
**`rel_person_affiliations`**: `id, person_id, organization_name, role_title, started_on, ended_on, is_current, note`؛ مؤسسة اسم نصي فقط (لا كيان).
**`rel_introductions`**: `id, user_id, person_a_id, person_b_id, introduced_on, context, outcome {Pending|Connected|NoResponse|Other}, note`.
**`rel_external_refs`**: `id, user_id, person_id, system {knowledge|projects|travel|inventory|finance}, type, ref_id, display_snapshot, ref_state, linked_at, link_kind {Manual|Event}` — روابط ناعمة للوحة «ما بينكم».

### 5.12 القوائم (Enums) والفهارس
| القائمة | القيم |
| :---- | :---- |
| roles | Family, Partner, Friend, Colleague, Client, Mentor, Mentee, Acquaintance, Professional, Other |
| closeness | Distant, Normal, Close, VeryClose |
| importance | Low, Medium, High, Critical |
| relationship status | Active, Paused, Ended |
| channel | Call, WhatsApp, Message, Email, InPerson, Social, Other |
| direction | Incoming, Outgoing, Mutual |
| follow-up status | Open, Done, Snoozed, Cancelled |
| occasion type | Birthday, Anniversary, ImportantDate, Remembrance, Custom |
| gift status | Idea, Planned, Purchased, Given, Archived |
| health state | Healthy, NeedsAttention, Neglected, NotTracked |

**فهارس وقيود رئيسية:** `rel_people(user_id, name_search)` GIN trigram؛ `rel_person_contact_methods(user_id, value_norm)`؛ `rel_interaction_people(person_id, interaction_id)`؛ `rel_interactions(user_id, occurred_at DESC)`؛ `rel_follow_ups(user_id, status, due_date)`؛ `rel_occasions(user_id, month, day)`؛ `rel_gifts(user_id, status, planned_by_date)`؛ `UNIQUE(user_id, source_key)` حيث وُجد.

### 5.13 المشتقات والبنية التحتية
- **`rel_derived_cache`**: `person_id, last_contact_at, days_since_contact, interactions_90d, effective_interval_days, health_state, health_reason jsonb, open_followups, overdue_followups, next_occasion_at, next_occasion_id, age, inputs_hash, computed_at` — يُعاد بناؤه (RA-12).
- **`rel_suggestions`**: `id, user_id, person_id, generated_for date, score, reasons jsonb, status {Shown|Accepted|Dismissed|Snoozed}, dismissed_until`.
- **`rel_inbound_proposals`**: `id, user_id, source_system, source_event_id (UNIQUE), kind {LogInteraction|AddPerson|LinkGift}, payload jsonb, status {Pending|Accepted|Dismissed}`.
- **`rel_relationship_history`** (إلحاق فقط): `id, user_id, person_id, field {roles|closeness|importance|status|primary_circle|interval}, old_value, new_value, changed_at, reason`.
- **`rel_merge_log`**: `id, user_id, from_person_id, to_person_id, merged_at, moved_counts jsonb, undone_at`.
- **`rel_automation_runs`**, **`rel_outbox`** (أحداث بالصيغة `relationships.{entity}.{verb}`)، **`rel_client_ops`** (idempotency)، **`rel_audit_log`**، **`rel_import_jobs`**، **`rel_export_jobs`**، **`rel_tombstones`**، **`rel_integration_state`**، **`rel_system_config`**.

### 5.14 خريطة العلاقات
`people 1—1 relationships`, `people 1—N contact_methods / facts / interests / occasions / gifts / follow_ups / affiliations / external_refs`, `people N—N interactions (interaction_people)`, `people N—N circles (relationships.primary_circle + person_circles)`, `people N—N people (person_links / introductions)`, `occasions 1—N gifts`, `interactions 1—N follow_ups`, `gifts 1—N gift_events`, `gifts 1—0..N finance_links`.

---

## 6) محرّك الحساب (Calculation Engine)

> **قاعدة عامة:** كل المشتقات تُحسب من بيانات الأصل بدالة نقية `f(inputs)` وتُخزَّن في `rel_derived_cache` مع `inputs_hash`؛ نفس الحساب محليًا وعلى الخادم، والخادم هو المرجع عند التعارض. «اليوم» = اليوم المحلي حسب `timezone` المستخدم.

### 6.1 آخر تواصل وعدد الأيام
```text
last_contact_at(person) = MAX(occurred_at)
   FROM interactions i JOIN interaction_people ip
   WHERE ip.person_id = person
     AND i.counts_as_contact = true
     AND i.occurred_at <= now()
     AND i.deleted_at IS NULL
days_since_contact = local_date(today) − local_date(last_contact_at)   -- فرق أيام تقويمية لا ساعات
```
- لا تعديل يدوي لـ`last_contact_at` (RC-18): التصحيح بإضافة/تعديل تفاعل (يُعاد الحساب فورًا، RF-16).
- **لا تفاعل مسجَّل أبدًا:** خط الأساس = `max(relationships.started_at، people.created_at)`؛ تُعرض «لم يُسجَّل تواصل بعد».

### 6.2 الفاصل الفعّال
```text
effective_interval_days =
   relationships.contact_interval_override_days
   ?? primary_circle.default_contact_interval_days
   ?? NULL        -- NULL ⇒ الحالة NotTracked
```
`settings.default_contact_interval_days` (30) قيمة **مقترحة عند إنشاء دائرة** فقط، فلا يصير كل شخص «مُهمَلًا» بمجرد إضافته (RD-04).

### 6.3 حالة الاهتمام (Health)
**المدخلات:** `ratio = days_since / interval`، المتابعات المتأخرة، مناسبة فائتة حديثًا، الأهمية، حالة الرابطة، `health_tracking`، `reminders_paused`.

**شروط الاستبعاد → `NotTracked`:** الرابطة `Paused|Ended`، الشخص `Archived`، `health_tracking=Off`، `health_enabled=false`، لا فاصل فعّال، أو الشخص جديد (عمر الإضافة ≤ `neglect_grace_days` ولا تفاعل).

**السلّم (يُقيَّم من الأعلى):**
| الحالة | الشرط |
| :---- | :---- |
| **Neglected** | `importance ≥ Medium` **و** `days_since > interval` (مثال المصدر RF-35) |
| **NeedsAttention** | `ratio ≥ 0.8` (اقتراب) **أو** متابعة متأخرة **أو** مناسبة فائتة خلال آخر 14 يومًا بلا تفاعل بعدها |
| **Healthy** | غير ذلك |
> لـ`importance = Low` لا تصير Neglected أبدًا (قد تصير NeedsAttention بسبب متابعة/مناسبة فقط).

**السبب (health_reason):** قائمة مرتبة من أسباب مقروءة؛ بلا لوم.
| المثال | الحساب | النتيجة | النص |
| :---- | :---- | :---- | :---- |
| فاصل 30، آخر تواصل قبل 45 يومًا، High | ratio=1.50 | Neglected | «مرّ 45 يومًا (فاصل دائرته 30). هل تحب أن تطمئن عليه؟» |
| فاصل 30، قبل 26 يومًا، High | ratio=0.87 | NeedsAttention | «اقترب موعد التواصل المعتاد (26 من 30)» |
| فاصل 30، قبل 20 يومًا | ratio=0.67 | Healthy | — |
| Low، قبل 90 يومًا، فاصل 30 | — | Healthy | (لا Neglected لـLow) |
| Medium، قبل 10 أيام، متابعة متأخرة 3 أيام | — | NeedsAttention | «عندك متابعة مؤجّلة: ‹العنوان›» |
| الرابطة Paused | — | NotTracked | «الاهتمام متوقف لهذه العلاقة» |

- `manual_health_rating` يُعرض بجانب الحالة ولا يغيّرها (معلوماتي).
- **التحذير الدائم:** «إشارة اهتمام لا حكم على العلاقة» (RF-36).

### 6.4 تكرار التفاعل (معلوماتي)
```text
expected_90d = 90 / interval        ;  actual_90d = عدد التفاعلات (counts_as_contact) في 90 يومًا
frequency_ratio = actual_90d / expected_90d
```
مثال: فاصل 30 ⇒ متوقع 3؛ فعلي 2 ⇒ 0.67. يظهر في صفحة الشخص كـ«تواصلتما 2 من 3 مرات معتادة»، ويدخل ترتيب الاقتراحات فقط، **لا يغيّر الحالة** (RC-13).

### 6.5 اقتراحات إعادة التواصل
مؤهَّل: `suggest_reconnect=true`، الرابطة Active، الشخص Active، `reminders_paused=false`، غير مؤجَّل (`dismissed_until`).
```text
S = 0.45·overdue + 0.25·importance + 0.15·closeness + 0.10·occasion_soon + 0.05·last_positive
overdue = min(ratio, 2) / 2          (NULL interval ⇒ 0)
importance: Low .25 | Medium .50 | High .75 | Critical 1.0
closeness : Distant .25 | Normal .50 | Close .75 | VeryClose 1.0
occasion_soon = 1 إن كانت مناسبة خلال 14 يومًا وإلا 0
last_positive = 1 إن كان آخر تفاعل Positive، 0.5 إن Neutral/لا شيء، 0 إن Difficult
```
- **مثال 1:** High، Close، ratio 1.5، لا مناسبة، آخر تفاعل Positive: `0.45·0.75 + 0.25·0.75 + 0.15·0.75 + 0 + 0.05·1 = 0.6875 → 69`.
- **مثال 2:** Medium، Normal، ratio 1.1، مناسبة خلال 10 أيام، Neutral: `0.45·0.55 + 0.25·0.5 + 0.15·0.5 + 0.10 + 0.05·0.5 = 0.5725 → 57`.
- العتبة 40، الحد الأقصى `reconnect_suggestions_per_day` (3)، التجاهل يخفي 14 يومًا، ولا يظهر الشخص نفسه مرتين في الأسبوع. `Difficult` لا يُخفي الشخص (فقط لا يرفع النتيجة) ويُصاغ الاقتراح بلطف.

### 6.6 التكرار السنوي والتواريخ
```text
next_occurrence(occasion, today):
  gregorian: أقرب (month/day) ≥ today؛ إن كان 29 فبراير وليست السنة كبيسة:
             Feb28 (افتراضي) أو Mar1 حسب settings.feb29_rule
  hijri    : حوّل اليوم إلى هجري بالخوارزمية المختارة (RD-03)، ابحث أقرب (month/day هجري) ≥ اليوم،
             إن لم يوجد اليوم 30 في ذلك الشهر استخدم آخر يوم، ثم أضف day_offset (±1) وحوّل لميلادي
  once     : once_date إن كان ≥ today وإلا Past
days_until = next_date − today
turning_age = year(next_date) − birth_year   (فقط إن كانت السنة معروفة)
```
- مثال: ميلاد 15 مارس 1990، اليوم 2026-10-07 ⇒ التالي 2027-03-15 بعد **159 يومًا**، يبلغ 37.
- مثال كبيس: ميلاد 29 فبراير 2000 ⇒ 2027 يُعرض 28 فبراير، 2028 يُعرض 29 فبراير.
- الهجري **تقريبي** ويُعرض «≈» مع `day_offset` يدوي بسبب اختلاف الرؤية (CX-15).

### 6.7 جدولة التذكيرات
```text
لكل d في reminder_days: fire_at = (next_date − d) في reminder_time المحلي (افتراضي 09:00)
dedupe_key = "occ:{occasion_id}:{next_date}:{d}"       -- مرة واحدة لكل تاريخ وبعد
تخطّى: reminders_paused، الشخص مؤرشف (إلا Remembrance)، الرابطة Ended (إلا إن فعّل المستخدم)
ساعات الهدوء: يُؤجَّل لأول وقت مسموح؛ تجاوز السقف اليومي ⇒ يدخل بطاقة Digest
```
الميلاد افتراضيًا `{7,1,0}`، الذكرى `{14,3,0}`، التاريخ المهم `{3,0}`؛ تُجدول **محليًا على الجهاز** أيضًا ليعمل أوفلاين.

### 6.8 المتابعات
```text
Overdue  = status='Open' AND due_date < today_local
DueToday = status='Open' AND due_date = today_local
Snoozed  → يعود Open عند snoozed_until (حتى 90 يومًا)
ترتيب العرض: Overdue (الأقدم) ← DueToday (High أولًا) ← القادمة
```
اختصارات التاريخ: غدًا، بعد 3 أيام، بعد أسبوع، بعد شهر، نهاية الأسبوع.

### 6.9 جاهزية الهدية
```text
lead_days = max(7, gift_buffer_days)     -- gift_buffer_days افتراضي 5 (شحن/وقت تفكير)
days_to = next_date(occasion) − today
readiness:
   Ready   : أي هدية Purchased أو Given للمناسبة
   OnTrack : Planned وdays_to > lead_days
   AtRisk  : (لا هدية أو Idea) وdays_to ≤ lead_days
   NotNeeded: gift_expected=false
```
مثال: ميلاد بعد 9 أيام و`lead_days=10` والهدية Idea ⇒ **AtRisk** ⇒ تذكير RA-02.

### 6.10 ميزانية الهدايا
مجموع `estimated_cost` و`actual_cost` لكل مناسبة/سنة **لكل عملة بلا تحويل**. لا ميزانية إلزامية؛ إن وُجد هدف في Finance يُقرأ فقط. العرض: «هدايا هذه السنة: 3 بتقدير 1,500 EGP (فعلي 1,320 EGP)».

### 6.11 دمج شخصين
1. المختار (Survivor) يحتفظ بالمعرّف؛ الآخر (Loser) يحصل على `merged_into_id` ويُؤرشف `Duplicate`.
2. التفاعلات: تُنقل ويُحدَّث `interaction_people` بلا تكرار الصف نفسه.
3. وسائل الاتصال: اتحاد بحسب `value_norm`. الاهتمامات: اتحاد بالاسم. الحقائق: عند تعارض المفتاح يبقى مفتاح Survivor ويُحفظ الآخر كحقيقة `key_alt` بملاحظة «من السجل المدمج».
4. المناسبات: اتحاد؛ تُدمج المتطابقة (النوع+اليوم+الشهر)؛ الميلاد المولَّد يُعاد توليده من Survivor.
5. الرابطة: يبقى Survivor؛ الأدوار اتحاد؛ الأهمية الأعلى.
6. المتابعات والهدايا والأهداف والروابط الخارجية: تُنقل.
7. يُنشر `relationships.person.merged {from,to}` ليحدّث المستهلكون `person_ref`؛ طلب `GET /relationships/people/{from}` يعيد `301 merged_into`.
8. تراجع خلال 30 يومًا عبر `rel_merge_log` (يُعيد الصفوف بمعرّفاتها).

### 6.12 تحديث الـsnapshot للمستهلكين
عند تغيّر `display_name` أو الأرشفة أو الدمج أو الحذف: أحداث `relationships.person.updated|archived|merged|deleted` بحمولة `{person_id, display_name}` فقط. المستهلك يحدّث `display_name_snapshot` أو يضع المرجع `Missing`. عند الطلب `GET /relationships/people/search?ids=…` يُعاد الاسم الحالي فقط (بلا هاتف/ميلاد).

### 6.13 سير الهدية (Saga)
**المسار أ — عبر Shopping (الافتراضي إن كان مفعّلًا):**
1. هدية `Planned` ← «اطلب من Shopping» ← `POST /shopping/inbox` بـ`source_key = relationships:gift:{gift_id}` وحمولة `{title, purpose:'Gift', person_ref+snapshot, target_date, budget}`.
2. Shopping يقبل ويدير البحث والقرار والشراء. عند `shopping.purchase.completed` بحمولة تحمل `gift_source_key` ⇒ الهدية `Purchased`، `purchase_path=Shopping`، `shopping_purchase_ref`، `actual_cost` من الحدث، `purchased_at`.
3. **لا رابط Finance هنا** (Shopping يملكه) (RC-09).
4. الإرجاع `shopping.purchase.refunded` ⇒ الهدية تعود `Planned` مع ملاحظة.
**المسار ب — مباشر:**
1. «اشتريتها بنفسي» + مبلغ وعملة وتاريخ ⇒ `Purchased`، `purchase_path=Direct`، صف `rel_gifts_finance_links` بحالة `Pending` (أو `NotRequired` إن عُطّل التكامل).
2. `POST /finance/transactions/from-source` بـ`source_type=relationship_gift`، `source_id=gift_id`، `Idempotency-Key = relationships:gift:{id}:payment`، `dimensions={gift_id}`، **بلا اسم أو ملاحظة**.
3. فشل ⇒ `Failed` + إعادة تلقائية محدودة ويدوية؛ الهدية تبقى Purchased.
**الإهداء:** `Given` (يتطلب `given_at`) في المسارين؛ يضيف اقتراح «سجّل تفاعل: لقاء» (اختياري). **الأرشفة** تحفظ كل التاريخ.
**قاعدة:** لا يجوز المساران معًا لهدية واحدة؛ تغيير المسار بعد `Purchased` غير مسموح (يُفصل الرابط `Detached` ثم يُعاد).

### 6.14 قِدَم الحقائق
حقيقة `importance ≥ High` و(`last_verified_at` فارغ أو أقدم من 365 يومًا) ⇒ بطاقة «هل ما زالت صحيحة؟» (حدّ أقصى 3 أسبوعيًا)؛ لا حذف تلقائي.

### 6.15 قائمة القادم
نافذة 30 يومًا (قابلة للضبط): ترتيب بالتاريخ ثم الأهمية ثم الدور؛ يستثني المؤرشفين وغير المفعّلة.

### 6.16 الرؤى (Insights) — معلوماتية
- عدد الأشخاص/التفاعلات في 30/90 يومًا حسب القناة والدائرة.
- **وسيط الفاصل بين التفاعلات** لكل دائرة مقابل فاصلها.
- نسبة الصادر/الوارد **كوصف لا تقييم** («أنت من يبادر في 80% من المرات» — بلا حكم).
- «لم نتواصل منذ أكثر من 90 يومًا»: قائمة قابلة للإخفاء.
- لا ترتيب للأشخاص «بقيمتهم» ولا درجة لإنسان.

### 6.17 تطبيع الأسماء والبحث
```text
NFKC → إزالة التطويل والتشكيل → توحيد الألف (أ إ آ ← ا) → ى←ي → ة←ه (للبحث فقط)
→ ؤ←و، ئ←ي → أرقام عربية-هندية ← ASCII → حروف لاتينية صغيرة → تقليص المسافات
```
أمثلة: «أَحمد» = «احمد»، «مُصطفى» = «مصطفي». البحث: بادئة + trigram + `alt_names` + وسائل الاتصال (آخر 4 أرقام). تحويل الكتابة بين الحروف اللاتينية والعربية (Mostafa/مصطفى) **غير مؤكد** — يُعتمد `alt_names` يدويًا.

### 6.18 كشف التكرار
| الإشارة | الدرجة |
| :---- | :---- |
| نفس `value_norm` لهاتف أو بريد | قوية (يُقترح الدمج) |
| تشابه الاسم ≥ 0.80 **و** نفس يوم/شهر الميلاد أو نفس المؤسسة | محتملة |
| تشابه الاسم ≥ 0.90 وحده | ممكنة |
لا دمج تلقائي أبدًا؛ بطاقة «هل هما نفس الشخص؟» مع «ليسا نفس الشخص» (تُحفظ في `dismissed_duplicate_pairs` ولا تتكرر).

---

## 7) سجل التعارضات (RC) وحلولها

### 7.1 تعارضات داخلية في المصدر
| ID | التعارض | الحل المعتمد | أين |
| :---- | :---- | :---- | :---- |
| RC-01 | `relationship_kind` (7 قيم تتضمن Important) ≠ `type` (7 قيم تتضمن Partner/Client) ؛ phone/email حقل واحد | **قائمة أدوار موحّدة متعددة** + `role_label` حر؛ «Important» تصير `importance`؛ وسائل الاتصال جدول | §5.2، §5.3 |
| RC-02 | `importance` في People وفي Relationships؛ `circle_id` على الشخص | تنتقل الأهمية والدائرة الأساسية إلى **الرابطة**؛ People هوية فقط | §5.3 |
| RC-03 | Relationships فيها `person_id` و`related_person_id`: لمن؟ المستخدم ليس شخصًا | **رابطة واحدة (المستخدم↔الشخص)** + `rel_person_links` لعلاقات شخص↔شخص | §5.3 |
| RC-04 | الميلاد في People وفي Occasion | الميلاد حقول على الشخص + مناسبة **مولَّدة** `origin=PersonBirthday` غير قابلة للحذف منفردة | §5.7 |
| RC-05 | التفاعل مرتبط بشخص واحد | جدول مشاركين؛ لقاء عائلي واحد يحدّث آخر تواصل للجميع | §5.5 |
| RC-06 | أي تفاعل يعدّ تواصلًا؟ (إعجاب Social؟) | `counts_as_contact` افتراضي true إلا `Social` (false) قابل للتعديل | §5.5، §6.1 |
| RC-07 | `next_follow_up_at` في Interaction وجدول Follow-ups | الحقل **اختصار واجهة** ينشئ Follow-up (`origin_key`) ولا يُخزَّن؛ يُقبل اسمًا في الاستيراد | §5.6 |
| RC-08 | «لا تنشئ Task duplicate» لكن Follow-up قابل للإنجاز | المتابعة كيان هنا يظهر في Today؛ `task_ref` اختياري لو أنشأها المستخدم في Tasks؛ لا إنشاء تلقائي لمهمة | §11.6 |
| RC-09 | الهدية: `purchased_at` و`finance_transaction_id` داخلها؛ Shopping يملك الشراء؛ Finance الدفع | **مسار شراء واحد**: Shopping (مرجع شراء، بلا رابط Finance هنا) أو مباشر (رابط `relationship_gift`) | §6.13 |
| RC-10 | `circle_id` واحد للشخص | دائرة **أساسية** تحدد الفاصل + عضويات إضافية | §5.4 |
| RC-11 | Relationship Goals مقابل `default_contact_interval_days` («أتصل أسبوعيًا») ومقابل Habit | الفاصل الشخصي = `contact_interval_override_days`؛ Goals للمعالم/النصوص فقط؛ الروتين المتكرر يبقى في Habit | §5.10 |
| RC-12 | `reminder_days` رقم واحد؛ التكرار سنوي ميلادي فقط؛ 29 فبراير | مصفوفة تذكيرات؛ هجري مع `day_offset`؛ قاعدة 29 فبراير | §6.6، §6.7 |
| RC-13 | مثال Neglected (`days>interval`) لا يترك مكانًا لـNeedsAttention؛ مدخلات Health بلا أوزان | **سلّم صريح** (§6.3)، التكرار معلوماتي، التقييم اليدوي معلوماتي، كل حالة بسببها | §6.3 |
| RC-14 | Person Facts مفتوحة لأي معلومة (صحة/دين/سياسة/مال لطرف ثالث) | فئات؛ الحساسة Sensitive + تشفير + تحذير + استبعاد من البحث والتصدير الافتراضي | §5.8، §14 |
| RC-15 | `occupation/organization` في People والملف المهني | مصدر واحد: الملف المهني + Affiliations (تاريخ العمل) | §5.11 |
| RC-16 | `display_name` «مشتق» و«يدوي» معًا | يُولَّد افتراضيًا ويقبل التعديل (`display_name_manual=true` يوقف التوليد) | §5.2 |
| RC-17 | «علاقات FK حقيقية» مقابل «لا تكرر كيانًا يملكه غيرك» | داخل القسم FK مركّب؛ عبر الأقسام `*_ref` ناعم (CX-02) | §3.3 |
| RC-18 | «Derived لا تُحرَّر» لكن المستخدم يريد تصحيح «آخر تواصل» | التصحيح عبر إضافة/تعديل تفاعل؛ لا تعديل مباشر | §6.1 |
| RC-19 | «History يبقى بعد archive» مقابل حق الحذف | **أرشفة** افتراضيًا (تاريخ كامل)، و**محو** (Erase) خيار صريح بإعادة مصادقة يحذف الأصل والتابع ويُصدر `person.deleted` | §9.1، §14.5 |
| RC-20 | `sentiment` قد يُقرأ كتقييم للشخص | يخص **التفاعل** فقط (Positive/Neutral/Difficult)، لا يُجمَّع كدرجة للشخص ولا يُصدَّر | §5.5 |

### 7.2 تعارضات مع المبادئ المشتركة
| ID | التعارض | الحل | أين |
| :---- | :---- | :---- | :---- |
| RC-21 | «Calendar يعرض بلا نسخ» مقابل خصوصية الأسماء | `GET /relationships/feed/calendar` بعناوين محايدة افتراضيًا («مناسبة»)؛ الأسماء بتفعيل `calendar_show_names`؛ ICS برمز سري قابل للإلغاء | §11.6 |
| RC-22 | Today feed والإشعارات قد تكرران العنصر نفسه | Feed بعدد أقصى؛ الإشعارات بـ`dedupe_key` وDigest | §11.6، §12 |
| RC-23 | «Finance يستقبل gift purchase» مقابل خصوصية الأطراف الثالثة | لا اسم ولا `person_ref` ولا ملاحظة إلى Finance؛ `gift_id` معتم فقط (CX-03) | §6.13 |
| RC-24 | Knowledge/Projects يملكان الاجتماعات والمشروعات لكن «يربط» | Relationships يخزّن `rel_external_refs` ناعمة؛ والعكس `person_ref` عندهم | §11.5 |
| RC-25 | Inventory يسجّل إعارة لشخص | `person_ref` عند Inventory؛ لوحة قراءة هنا؛ لا تفاعل تلقائي | §11.2 |
| RC-26 | Travel يسجّل رفاق الرحلة | `person_ref` عند Travel؛ اقتراح تفاعل `InPerson` عند اكتمال الرحلة (اختياري) | §11.2 |
| RC-27 | Finance يملك الديون بين الناس | Relationships لا يخزّن مبالغ ديون؛ لوحة عدّاد فقط عند موافقة وطلب Finance | §11.3 |
| RC-28 | Habit قد يمتلك «اتصل بأمي كل جمعة» | Habit يملك الروتين؛ هذا النظام يحسب الفاصل لكل شخص؛ لا تكرار؛ حدث `relationships.interaction.logged` يستهلكه Habit اختياريًا | §11.5 |
| RC-29 | Spiritual قد يحتاج «صلة الرحم» | ملخص مجمَّع بلا أسماء `GET /relationships/summary?circle_type=Family`؛ لا بيانات أشخاص | §11.5 |
| RC-30 | Nutrition/Home قد يريدان حساسيات الضيوف | لا مشاركة؛ تبقى حقائق Sensitive هنا | §14 |
| RC-31 | Core Search قد يفهرس الأسماء | اختياري OFF؛ Normal فقط؛ لا حقائق ولا ملاحظات | §11.7 |
| RC-32 | Home قد يحمل «أفراد الأسرة» | مرجع `person_ref` اختياري من Home؛ لا نسخ | §11.5 |
| RC-33 | Notion «People» = فريق شركة وفيه Base Salary | لا استيراد افتراضيًا؛ الراتب لا يُستورد أبدًا؛ اختيار مهني فقط | §15.2 |
| RC-34 | الأحداث الصادرة قد تسرّب أسماء | الأحداث بمعرّفات وأعداد فقط، الأسماء في أحداث `person.*` المحدودة | §11.8 |
| RC-35 | ازدواج وسائل الاتصال مع Contacts الجهاز | استيراد vCard/Contacts **مرة واحدة بموافقة**، لا مزامنة مستمرة | §15.4 |

---

## 8) الفجوات المسدودة (RG) والتحسينات المضافة (RE)

### 8.1 الفجوات (RG)
| ID | الفجوة في المصدر | الإضافة | أين |
| :---- | :---- | :---- | :---- |
| RG-01 | لا قاعدة لدمج المكررين | كشف + بطاقة + دمج قابل للتراجع 30 يومًا | §6.11، §6.18 |
| RG-02 | لا أرشفة/استعادة للأشخاص | `life_state` + سبب + استعادة بكل التاريخ | §9.1 |
| RG-03 | شخص توفي: تذكير ميلاده مؤلم | سبب `PassedAway`؛ يوقف تذكيرات الميلاد ويقترح مناسبة `Remembrance` اختيارية؛ نص هادئ | §9.1، §10.6 |
| RG-04 | علاقة متوقفة أو منتهية | `Paused/Ended`: لا Neglected ولا اقتراحات ولا تذكيرات (إلا باختيار)، والتاريخ يبقى | §6.3، §9.1 |
| RG-05 | لا «محو» حقيقي لطرف ثالث | Erase بإعادة مصادقة + حدث `person.deleted` | §14.5 |
| RG-06 | هاتف/بريد واحد | وسائل اتصال متعددة مع الأساسي | §5.2 |
| RG-07 | لا لقاءات جماعية | مشاركون متعددون | §5.5 |
| RG-08 | لا تاريخ لتغيّر الأهمية/الحالة | `rel_relationship_history` | §5.13 |
| RG-09 | لا تمييز بين وعد وتذكير | `kind` في المتابعة (وعد/طلب/تذكير/موضوع للحديث) | §5.6 |
| RG-10 | استيراد جهات الاتصال | vCard/CSV مرة واحدة بموافقة وحدود | §15.4 |
| RG-11 | لا قاموس جاهز للحقائق | مفاتيح مقترحة + مخصّصة | §5.8 |
| RG-12 | حقائق قديمة | بطاقة تحقق سنوية | §6.14 |
| RG-13 | لا تتبع لـ«ما قلنا في آخر مرة» | حقل `summary` وبطاقة «آخر ما دار» في صفحة الشخص | §10.3 |
| RG-14 | جهة اتصال الطوارئ (فكرة من قالب Notion) | `is_emergency_contact` + قائمة سريعة؛ Sensitive؛ لا يرسل شيئًا لأحد | §10.3 |
| RG-15 | لا ضوابط صياغة لأن البيانات عن بشر | قواعد صياغة + فحص CI | §10.6 |
| RG-16 | لا تعريف للأوفلاين | محلي أولًا، تذكيرات محلية | §13 |
| RG-17 | لا خصوصية للأطراف الثالثة | Tier + تشفير حقول + أقل بيانات + تحذيرات | §14 |
| RG-18 | لا سقف إشعارات | ساعات هدوء وسقف يومي وDigest | §12 |
| RG-19 | المنطقة الزمنية عند السفر | الأيام التقويمية تُعاد حسب المنطقة الحالية؛ التذكيرات لا تتكرر بسبب التبديل (`dedupe_key`) | §6.7 |
| RG-20 | لا تراجع (Undo) عن حذف تفاعل/متابعة | حذف ناعم 14 يومًا + Undo فوري | §9 |
| RG-21 | تسجيل سريع | Quick Log بنقرتين (ويدجت/Share) | §10.4 |
| RG-22 | مناسبة بين شخصين (ذكرى زواج) | `with_person_id` | §5.7 |
| RG-23 | عقد Picker للأقسام الأخرى | `GET /relationships/people/search` ومنشئ سريع | §11.1 |
| RG-24 | حدود النظام | 5000 شخص، 10 وسائل اتصال/شخص، 50 دائرة، 20 هدية نشطة/مناسبة… | §14.2 |
| RG-25 | بحث عربي | تطبيع الأسماء | §6.17 |
| RG-26 | تصدير | JSON/CSV/vCard بإعادة مصادقة، يستثني Secret | §14.5 |
| RG-27 | تعارض الأوفلاين | جدول دمج | §13.4 |

### 8.2 التحسينات (RE)
| ID | التحسين | القيمة |
| :---- | :---- | :---- |
| RE-01 | **بطاقة ما قبل اللقاء**: آخر ما دار + ما وعدت به + اهتماماته + مناسبة قريبة + هدية جارية | تدخل اللقاء حاضرًا |
| RE-02 | **تسجيل سريع** (Quick Log) من الويدجت/المشاركة | تقليل الاحتكاك فيستمر الاستخدام |
| RE-03 | **«ما يهمّه»**: أعلى 5 حقائق/اهتمامات بالأهمية | تخصيص الهدايا والكلام |
| RE-04 | التقاط فكرة هدية من حديث («ذكر أنه يحب…») ← اهتمام + فكرة هدية بنقرة | هدايا أصدق |
| RE-05 | **هدايا مستلَمة** (`direction=Received`) مع ملاحظة شكر | تبادل لطيف بلا حساب |
| RE-06 | لوحة **«ما بينكم»**: إعارات (Inventory)، رحلات مشتركة (Travel)، مشروعات (Projects)، لقاءات (Knowledge) — قراءة فقط | سياق كامل بلا نسخ |
| RE-07 | موضوع للحديث القادم (`kind=Topic`) | لا تنسى ما تريد قوله |
| RE-08 | خط زمني بمعالم (أول لقاء، تغيّر دور) | قصة العلاقة |
| RE-09 | عرض «عائلة/أسرة» يجمع دائرة | رؤية سريعة |
| RE-10 | **تحية جماعية موسمية**: مناسبة لدائرة كاملة (عيد، رمضان) تنتج متابعة لكل فرد (اختيارية) | تواصل واسع بجهد قليل |
| RE-11 | قوالب رسائل خاصة بالمستخدم (نصوص يكتبها هو) | سرعة بلا تدخل خارجي |
| RE-12 | مراجعة أسبوعية هادئة (خمس دقائق) | عادة بلا ضغط |
| RE-13 | **بلا ألعاب**: لا streaks ولا نقاط ولا ترتيب أشخاص | تجنّب تحويل البشر إلى أرقام |
| RE-14 | مؤقِّت «لا تذكّرني بهذا الشخص» (Snooze شخص كامل) | احترام حدود المستخدم |
| RE-15 | وضع «فترة صعبة» عام يوقف الاقتراحات والتنبيهات غير الأساسية أسبوعًا | رعاية الذات |

---

## 9) دورات الحياة (Lifecycles) وقواعد التحقق

### 9.1 دورات الحياة
**الشخص:** `Active ⇄ Archived (سبب)` ← `Erase` (نهائي بإعادة مصادقة). الدمج: `Active → Archived(Duplicate, merged_into)`.
| من | إلى | الشرط/الأثر |
| :---- | :---- | :---- |
| Active | Archived | يوقف الحالة والاقتراحات والتذكيرات (إلا Remembrance)؛ التاريخ يبقى (RT-07) |
| Archived | Active | يعيد كل شيء؛ الحالة تُعاد حسابها |
| Archived | Erased | إعادة مصادقة + كتابة اسم الشخص + حذف نهائي بعد 14 يومًا (RC-19) |

**الرابطة:** `Active ⇄ Paused ⇄ Ended` (يُسجَّل في `rel_relationship_history`). Ended لا تُحذف. العودة Active تبدأ من خط أساس جديد (لا Neglected فورًا: مهلة `neglect_grace_days`).

**المتابعة:** `Open → Done | Snoozed | Cancelled`؛ `Snoozed → Open` تلقائيًا؛ `Done → Open` (إعادة فتح) مسموح.

**المناسبة:** `Active ⇄ Archived`؛ `Once` تنتهي إلى `Past` بعد التاريخ؛ حذف مناسبة لا يحذف الشخص (RT-10) وتبقى الهدايا المرتبطة (`occasion_id` يصير NULL).

**الهدية:**
```text
Idea → Planned → Purchased → Given → Archived
        ↘________ Given (يدوية/مصنوعة، purchase_path=None) ____↗
أي حالة → Archived (Dropped/Replaced)        Archived → Idea (استعادة)
Purchased → Planned (بعد refund من Shopping)
```
| الانتقال | الشرط |
| :---- | :---- |
| Idea→Planned | `planned_by_date` اختياري |
| Planned→Purchased | مسار Shopping: حدث؛ مسار مباشر: مبلغ+عملة+تاريخ |
| Purchased→Given | `given_at` |
| Idea/Planned→Given | `purchase_path=None` (مصنوعة/تجربة) |
| Given→Archived | تلقائيًا بعد 30 يومًا (اختياري) |

**الهدف:** `Active ⇄ Paused → Done | Dropped`.
**الاقتراح:** `Shown → Accepted | Dismissed(14 يومًا) | Snoozed`.
**الوارد (Proposal):** `Pending → Accepted | Dismissed`.

### 9.2 قواعد التحقق (RV)
| ID | القاعدة | الرد |
| :---- | :---- | :---- |
| RV-01 | `display_name` غير فارغ ≤120 حرفًا | 422 |
| RV-02 | `birth_month` و`birth_day` معًا أو لا شيء؛ اليوم صالح للشهر (29 فبراير مسموح) | 422 |
| RV-03 | `birth_year` بين 1900 والسنة الحالية، ليست مستقبلية | 422 |
| RV-04 | الهاتف يُطبَّع E.164 (افتراضي +20)؛ غير الصالح تحذير لا منع | warning |
| RV-05 | البريد بصيغة صالحة | 422 |
| RV-06 | وسيلة الاتصال فريدة داخل الشخص؛ تكرارها عند شخص آخر ⇒ تحذير تكرار (RG-01) | 409/تحذير |
| RV-07 | رابطة واحدة لكل شخص | 409 |
| RV-08 | دور واحد على الأقل | 422 |
| RV-09 | `person_links`: لا self ولا تكرار | 422/409 |
| RV-10 | تفاعل بمشارك واحد على الأقل | 422 |
| RV-11 | `occurred_at` ليس بعد الآن +5 دقائق، ولا أقدم من 50 سنة | 422 (ويُقترح متابعة) |
| RV-12 | القناة/الاتجاه من القوائم؛ `InPerson` الافتراضي Mutual | 422 |
| RV-13 | تعديل/حذف التفاعل يعيد حساب المشتقات (الإدخال الرجعي مسموح) | — |
| RV-14 | عنوان المتابعة مطلوب ≤200؛ التاريخ الماضي مسموح بتحذير | 422/warning |
| RV-15 | التأجيل ≤ 90 يومًا | 422 |
| RV-16 | مناسبة: شهر/يوم صالحان؛ هجري اليوم 1..30؛ `day_offset ∈ {-1,0,1}` | 422 |
| RV-17 | `reminder_days` قيم 0..60 وبحد أقصى 6 | 422 |
| RV-18 | لا ميلاد يدوي ثانٍ للشخص نفسه (المولَّد موجود) | 409 |
| RV-19 | هدية Purchased ⇒ `purchase_path` ≠ None إلا للمصنوعة | 422 |
| RV-20 | مسار Direct ⇒ مبلغ ≥0 وعملة ISO وتاريخ | 422 |
| RV-21 | مسار Shopping ⇒ `shopping_purchase_ref` موجود | 422 |
| RV-22 | لا مساران لهدية واحدة | 409 |
| RV-23 | `Given` ⇒ `given_at` | 422 |
| RV-24 | المبالغ نصوص عشرية بدقة ≤2 وغير سالبة | 422 |
| RV-25 | اسم الدائرة فريد؛ الفاصل 1..730 أو NULL | 422 |
| RV-26 | حذف دائرة مستخدمة ⇒ `409 IN_USE` (تُؤرشف) | 409 |
| RV-27 | الدمج: شخصان مختلفان وغير مدمجين سابقًا | 422 |
| RV-28 | Erase ⇒ إعادة مصادقة + كتابة الاسم | 403 |
| RV-29 | حقيقة بفئة Sensitive ⇒ `privacy_tier` لا يقل عن Sensitive | تلقائي |
| RV-30 | مفتاح الحقيقة فريد للشخص (إلا المتكرر) | 409 |
| RV-31 | الاهتمام فريد بالاسم للشخص | 409 |
| RV-32 | الملاحظات ≤ 10,000 حرف | 422 |
| RV-33 | حدود: 5000 شخص، 10 وسائل اتصال، 50 دائرة | 422 |
| RV-34 | `If-Match: version` على كل تعديل | 409 VERSION_CONFLICT |

---

## 10) تجربة المستخدم والشاشات

### 10.1 خريطة الشاشات
| الشاشة | الغرض | الوصول |
| :---- | :---- | :---- |
| Home | ملخص الاهتمام اليومي | التبويب الأول |
| People | قائمة الأشخاص + بحث + فلاتر | تبويب |
| Person Detail | كل شيء عن شخص | من القائمة/البحث |
| Timeline | تفاعلات الشخص أو الكل | من Person/Home |
| Follow-ups | المتابعات (متأخرة/اليوم/قادمة) | تبويب |
| Occasions | قائمة/شهري للمناسبات | تبويب |
| Gifts | لوحة هدايا حسب الحالة | تبويب |
| Circles | إدارة الدوائر والفواصل | من الإعدادات/People |
| Networking | الأشخاص المهنيون والتعريفات | تبويب فرعي |
| Insights | رؤى معلوماتية | من Home |
| Settings | الخصوصية، التذكيرات، التكاملات | شريط جانبي |
| Quick Log | تسجيل تفاعل سريع | زر عائم/ويدجت/مشاركة |
| Merge | مراجعة المكررين والدمج | بطاقة/قائمة |
| Import | استيراد جهات الاتصال/CSV | الإعداد الأول/الإعدادات |

### 10.2 Home
أقسام بالترتيب (كل قسم يُخفى إن كان فارغًا ما عدا الأول):
1. **مناسبات اليوم والقريبة** (اليوم + 7 أيام، حتى 5) مع حالة الهدية (Ready/OnTrack/AtRisk).
2. **متابعات اليوم والمتأخرة** (حتى 5) بزر «تم/أجّل».
3. **يحتاج اهتمامًا** (حتى 5): الحالة + سببها بنص لطيف.
4. **اقتراحات إعادة التواصل** (حتى 3) مع «اتصل/راسل/لاحقًا/ليس الآن».
5. **أهم الأشخاص** (حتى 6، حسب الأهمية ثم آخر تواصل).
6. **آخر التفاعلات** (5).
- **حالات الشاشة:** Loading (هيكل)، Empty («ابدأ بإضافة أول شخص — الاسم فقط يكفي»)، Error (إعادة محاولة)، Offline/Syncing (شارة).
- **وضع «فترة صعبة»** يخفي الأقسام 3 و4 ويُبقي المناسبات والمتابعات (RE-15).

### 10.3 الشاشات بالتفصيل
**People:** بحث فوري (§6.17)، فلاتر: دائرة، دور، أهمية، حالة (Healthy/…)، «بلا تواصل منذ…»، نشط/مؤرشف؛ فرز: الاسم/آخر تواصل/الأهمية/القادم؛ بطاقة الشخص: صورة، الاسم، دور، شارة الحالة، «آخر تواصل منذ 12 يومًا». تحديد متعدد (دائرة، أرشفة، دمج).
**Person Detail (تبويبات/أقسام — RF-40):**
1. **Profile:** الاسم، الميلاد (مع العمر القادم)، وسائل الاتصال (نقرة للاتصال/واتساب)، الموقع، الصورة، جهة طوارئ.
2. **Relationship:** الأدوار، القرب، الأهمية، الدائرة الأساسية والإضافية، الفاصل الفعّال، الحالة، **بطاقة الصحة** (الحالة + السبب + تقييم يدوي اختياري + «إيقاف التتبع لهذا الشخص»).
3. **Timeline:** التفاعلات والمتابعات والمناسبات والهدايا في خط واحد مع فلاتر؛ «آخر ما دار» (RG-13).
4. **What Matters:** أعلى الحقائق والاهتمامات (RE-03) + تحذير الحقائق الحساسة.
5. **Interests / Facts:** إدارة كاملة، علامة «تحقق؟» للقديم.
6. **Follow-ups:** مفتوحة/منتهية، أنواعها (وعد/طلب/تذكير/موضوع).
7. **Occasions:** المولَّدة والمخصصة، تذكيراتها.
8. **Gifts:** أفكار/خطط/مُهدى/مستلَم مع ميزانية.
9. **Professional Context:** الملف المهني، الوظائف، التعريفات، الروابط الخارجية.
10. **ما بينكم:** إعارات/رحلات/مشروعات/لقاءات (قراءة فقط، RE-06).
**Timeline (عام):** تفاعلات الجميع بتجميع يومي، فلتر قناة/دائرة، بحث، Undo للحذف.
**Follow-ups:** أقسام: متأخرة، اليوم، هذا الأسبوع، لاحقًا، مؤجلة؛ إجراءات سريعة؛ إنشاء من تفاعل.
**Occasions:** قائمة «القادم» + عرض شهري (ميلادي/هجري)؛ شارة جاهزية الهدية؛ توليد المناسبات من الميلاد.
**Gifts:** أعمدة Idea / Planned / Purchased / Given؛ زر «اطلب من Shopping»؛ تصفية بالسنة/المناسبة؛ ملخص الميزانية لكل عملة.
**Circles:** قائمة الدوائر بفاصل كل منها وعدد الأعضاء، سحب لتغيير الترتيب؛ **قوالب الإعداد الأول** (§15.3).
**Networking:** أشخاص بدور مهني: المؤسسة، الدور، آخر تفاعل، المتابعة، التعريفات (من عرّفتهم)، «كيف التقينا».
**Insights:** كروت §6.16 مع تنبيه «معلومات لا أحكام».
**Settings:** الأمان (قفل التطبيق، إخفاء الأسماء)، التذكيرات (الساعة، الهدوء، السقف)، الصحة (تفعيل/إيقاف)، الدوائر، التكاملات (مع شرح ما يُرسَل)، التقويم الهجري، التصدير/الحذف.
**Quick Log:** اختر الشخص (أو أكثر) ← القناة ← (اختياري) ملاحظة/متابعة؛ تقدر تكمله في 3 ثوانٍ.
**Merge:** مقارنة جنبًا إلى جنب، اختيار الناجي، معاينة ما سيُنقل، زر تراجع 30 يومًا.

### 10.4 الموبايل والسرعة
- Quick Log من ويدجت/زر عائم/مشاركة رقم من الاتصالات.
- فتح Person Detail أقل من 200ms من الكاش المحلي؛ قوائم افتراضية (Virtualized) حتى 5000 شخص.
- لمسات: تمرير «تم/أجّل» للمتابعات؛ اتصال/واتساب بنقرة (فتح التطبيق الخارجي فقط بلا قراءة).
- ويدجت يخفي الأسماء افتراضيًا (`mask_names_in_widgets`).

### 10.5 الوصول واللغة
RTL كامل؛ أرقام عربية/لاتينية حسب الإعداد؛ تواريخ ميلادية/هجرية؛ تباين WCAG AA؛ دعم قارئ الشاشة؛ لا اعتماد على اللون وحده لحالة الصحة (أيقونة + نص).

### 10.6 قواعد الصياغة (ملزمة)
| بدل | قل |
| :---- | :---- |
| «أهملت أمك» | «مرّ 45 يومًا منذ آخر تواصل — حابب تطمئن عليها؟» |
| «علاقة ضعيفة/سامة» | (غير مسموح) |
| «شخص غير مهم» | «أهمية: منخفضة» |
| «فاتتك مناسبة» | «عدّى عيد ميلاد ‹…› قبل 3 أيام — يمكنك تهنئته متأخرًا» |
| «توفي» (إجبارًا) | «أرشفة — سبب: رحيل» ويُسأل بلطف إن كان يريد «ذكرى» |
- لا درجات ولا نسب مئوية لإنسان؛ لا مقارنة بين شخصين؛ لا ألوان حمراء قاسية (استخدم ألوانًا محايدة للحالة).
- فحص CI للنصوص المحظورة (RT-60).
- شاشة القفل: «لديك تذكير في العلاقات» دون اسم (CX-12) ما لم يفعّل المستخدم الأسماء.

---

## 11) التكاملات وعقود API

### 11.1 المبادئ وعقد «منتقي الأشخاص»
- كل تكامل اختياري ويُفعَّل من الإعدادات؛ الأحداث `{system}.{entity}.{verb}` مع outbox ومرة-على-الأقل (CX).
- **عقد Picker** (للأقسام الأخرى، RG-23):
  - `GET /relationships/people/search?q=&limit=&ids=` ⇒ `[{id, display_name, avatar_thumb_url?, role_label?}]` — **بلا هاتف أو ميلاد أو ملاحظات**.
  - `POST /relationships/people/quick-create` `{display_name}` ⇒ `{id}` (idempotent بـ`Idempotency-Key`).
  - المستهلك يخزّن `person_ref {system:'relationships', type:'person', id}` + `display_name_snapshot` ويعمل بلا هذا القسم (اسم حر).
- الصلاحية: Picker يعيد الأشخاص بـ`privacy_tier=Normal|Sensitive` فقط؛ **Secret لا يظهر.**

### 11.2 Inventory وTravel
| القسم | الاتجاه | العقد |
| :---- | :---- | :---- |
| Inventory | يقرأ منه | `GET /inventory/loans?person_ref=` (**طلب** على Inventory) لتعبئة «ما بينكم»؛ `inventory.loan.created/returned` لتحديث العدّاد؛ لا تفاعل تلقائي |
| Travel | يقرأ منه | `GET /travel/trips?person_ref=`؛ `travel.trip.completed` بقائمة `person_ref` للرفاق ⇒ **اقتراح** تفاعل `InPerson` (RA-09) بعد موافقة |

### 11.3 Finance
- **المسار المباشر فقط** للهدايا (§6.13): `POST /finance/transactions/from-source` (Finance v4.1) بـ`source_type=relationship_gift` (**طلب**: قيمة جديدة)، `dimensions={gift_id}`، تصنيف افتراضي «هدايا»، بلا اسم/ملاحظة.
- حالات الربط `NotRequired|Pending|Synced|Failed|Detached|Legacy`؛ استرداد/إلغاء عبر عقد Finance العكسي.
- **ديون الأشخاص:** Finance يملكها؛ لوحة «ما بينكم» قد تعرض **عدد** الديون المفتوحة فقط عبر `GET /finance/debts/summary?person_ref=` (**طلب اختياري**) — لا مبالغ ولا تفاصيل هنا (RC-27).
- Finance لا يستقبل `person_ref` ولا اسمًا.

### 11.4 Shopping
- من الهدية: `POST /shopping/inbox` بـ`source_key = relationships:gift:{id}` وحمولة `{title, purpose:'Gift', person_ref+snapshot, target_date, budget, currency}` (عقد Shopping §11).
- يستهلك: `shopping.purchase.completed` (يحمل `inbox_source_key`/`gift_source_key`، مبلغ، عملة، `purchase_id`) و`shopping.purchase.refunded`.
- **طلب على Shopping:** تضمين `source_key` الأصلي للمقترح في حمولة `purchase.completed`.
- الهدية تحمل `shopping_purchase_ref` فقط؛ لا رابط Finance (RC-09).

### 11.5 Knowledge وProjects وHabit وSpiritual وHome
| القسم | العقد |
| :---- | :---- |
| Knowledge | `GET /knowledge/meetings?person_ref=` لتعبئة الروابط؛ `knowledge.meeting.ended` بحاضرين `person_ref` ⇒ اقتراح تفاعل `InPerson/Call` (اختياري) |
| Projects | `GET /projects?person_ref=`؛ الملف المهني يعرض روابط المشروعات (قراءة) |
| Habit | يستهلك `relationships.interaction.logged` لإتمام عادة «تواصل» اختياريًا؛ لا يخزّن أشخاصًا |
| Spiritual | `GET /relationships/summary?circle_type=Family&days=30` ⇒ **أعداد فقط** (RC-29) |
| Home | يربط أفراد الأسرة بـ`person_ref` (RC-32) |

### 11.6 Today وCalendar والإشعارات
- **`GET /relationships/feed/today`** (حد أقصى 7): ترتيب: متابعات متأخرة ← مناسبات اليوم ← متابعات اليوم ← مناسبة غدًا مع هدية AtRisk ← أعلى اقتراح؛ الأسماء ظاهرة داخل التطبيق فقط؛ لا Secret.
- **`GET /relationships/feed/calendar?from&to`**: أحداث `{source_id, date, title_neutral, kind}`؛ العنوان الحقيقي بتفعيل `calendar_show_names`؛ ICS رمز سري قابل للإلغاء. Calendar يعرض ولا يستنسخ.
- **المتابعة وTasks:** لا مهمة تلقائية؛ زر «أرسل إلى مهامي» ينشئ مهمة في Core (إن وُجد) ويحفظ `task_ref` (RC-08).
- **الإشعارات عبر Core:** ساعات هدوء، سقف، Digest، نص محايد لشاشة القفل.

### 11.7 Core Files والبحث
- الصور والمرفقات عبر `file_ref` (Sensitive للصور). الإيصالات لا تُخزَّن هنا.
- البحث العام: تفعيل اختياري `search_index_optin` (OFF)، يفهرس الاسم فقط للمستوى Normal.

### 11.8 الأحداث
**صادرة** (حمولات معتمة بلا ملاحظات):
| الحدث | الحمولة |
| :---- | :---- |
| `relationships.person.created/updated/archived/merged/deleted` | `{person_id, display_name}` (+ `{from,to}` للدمج) |
| `relationships.interaction.logged` | `{interaction_id, person_ids[], channel, occurred_at}` |
| `relationships.followup.completed` | `{follow_up_id, person_id}` |
| `relationships.gift.status_changed` | `{gift_id, status}` (بلا اسم الهدية) |
| `relationships.gift.given` | `{gift_id, given_at}` |
**لا تُرسَل أبدًا:** حالة الصحة، الحقائق، الملاحظات، التقييمات.
**واردة:** `shopping.purchase.completed/refunded`، `travel.trip.completed`، `inventory.loan.*`، `knowledge.meeting.ended`، `finance.transaction.synced/failed` (لحالة رابط الهدية).

### 11.9 واجهة API (REST)
**اتفاقيات:** جلسة المستخدم؛ `Idempotency-Key` على POST/PUT؛ `If-Match: version`؛ أرقام نصية؛ Cursor؛ أخطاء `{code, message_ar, details}`.
| المجموعة | المسارات | أخطاء |
| :---- | :---- | :---- |
| الأشخاص | `GET/POST /relationships/people` · `GET/PATCH …/{id}` · `POST …/{id}/archive|restore` · `POST …/{id}/erase` | `409 DUPLICATE_SUSPECTED` · `301 MERGED` |
| Picker | `GET /relationships/people/search` · `POST …/quick-create` | |
| وسائل الاتصال | `GET/POST /relationships/people/{id}/contact-methods` · `PATCH/DELETE …/{mid}` | `409 METHOD_EXISTS` |
| الرابطة | `GET/PATCH /relationships/people/{id}/relationship` · `GET …/history` | |
| الروابط | `GET/POST /relationships/person-links` · `DELETE …/{id}` | `422 SELF_LINK` |
| الدوائر | `GET/POST/PATCH /relationships/circles` · `PUT /relationships/people/{id}/circles` | `409 IN_USE` |
| التفاعلات | `GET/POST /relationships/interactions` · `PATCH/DELETE …/{id}` · `POST /relationships/interactions/quick` | `422 FUTURE_DATE` |
| المتابعات | `GET/POST /relationships/follow-ups` · `PATCH …/{id}` · `POST …/{id}/done|snooze|cancel|reopen` | |
| المناسبات | `GET/POST /relationships/occasions` · `PATCH/DELETE …/{id}` · `GET /relationships/occasions/upcoming` | `409 BIRTHDAY_EXISTS` |
| الاهتمامات/الحقائق | `GET/POST/PATCH/DELETE /relationships/interests|facts` · `POST …/facts/{id}/verify` | |
| الهدايا | `GET/POST /relationships/gifts` · `PATCH …/{id}` · `POST …/{id}/status` · `POST …/{id}/send-to-shopping` · `POST …/{id}/purchase-direct` · `POST …/{id}/retry-finance` | `409 PATH_CONFLICT` · `422 REF_REQUIRED` |
| الأهداف | `GET/POST/PATCH /relationships/goals` | |
| المهني | `GET/PUT /relationships/people/{id}/professional` · `GET/POST /relationships/affiliations|introductions` | |
| الروابط الخارجية | `GET /relationships/people/{id}/between` · `POST/DELETE /relationships/external-refs` | |
| الصحة والاقتراحات | `GET /relationships/health?state=` · `GET /relationships/suggestions` · `POST …/{id}/dismiss|accept|snooze` | |
| التكرار والدمج | `GET /relationships/duplicates` · `POST /relationships/merge` · `POST /relationships/merge/{id}/undo` | `422 INVALID_MERGE` |
| Today/Calendar | `GET /relationships/feed/today` · `GET /relationships/feed/calendar` · `GET /relationships/calendar.ics?token=` | |
| الرؤى | `GET /relationships/insights?from=&to=` · `GET /relationships/summary` | |
| الاستيراد/التصدير | `POST /relationships/import` (dry-run/apply) · `POST /relationships/export` | `413` |
| المزامنة | `POST /relationships/sync/push` · `GET /relationships/sync/pull?since=` | `409` لكل عملية |
| الإعدادات | `GET/PATCH /relationships/settings` · `GET /relationships/capabilities` | |
| إعادة البناء | `POST /relationships/rebuild` | |

---

## 12) الأتمتة (Automations)

| ID | الاسم | المحفّز | مفتاح عدم التكرار | افتراضي |
| :---- | :---- | :---- | :---- | :---- |
| RA-01 | تذكير الميلاد/المناسبة | `fire_at` من §6.7 | `occ:{id}:{date}:{d}` | ON |
| RA-02 | تذكير الهدية قبل المناسبة | AtRisk (§6.9) | `gift:{occasion}:{date}` | ON |
| RA-03 | تذكير المتابعة | `due_date`/`due_time` | `fu:{id}:{due}` | ON |
| RA-04 | إعادة المؤجَّل | `snoozed_until` | `snooze:{id}:{until}` | ON |
| RA-05 | كشف الإهمال (تحديث الحالة) | يوميًا + عند تعديل تفاعل | `inputs_hash` | ON |
| RA-06 | اقتراحات إعادة التواصل | يوميًا 08:00 محلي | `sug:{date}:{person}` | ON |
| RA-07 | فحص التكرار | عند إضافة/استيراد + أسبوعيًا | زوج الأشخاص | ON |
| RA-08 | بطاقات التحقق من الحقائق | شهريًا | `fact:{id}:{month}` | ON |
| RA-09 | معالجة الواردات (رحلة/اجتماع) | حدث وارد | `source_event_id` | ON (كاقتراح) |
| RA-10 | المراجعة الأسبوعية | يوم/وقت المستخدم | `wk:{iso_week}` | OFF |
| RA-11 | إعادة محاولة ربط Finance للهدية | فشل/Pending | `relationships:gift:{id}:payment` | ON |
| RA-12 | إعادة بناء المشتقات | تغيّر مدخل | `inputs_hash` | ON |
| RA-13 | إعادة حساب الهجري | تغيير الخوارزمية/سنويًا | `hijri:{algo}:{year}` | ON |
| RA-14 | أرشفة الهدايا المُهداة | 30 يومًا بعد `given_at` | `gift-arch:{id}` | OFF |
| RA-15 | إنهاء المناسبات `Once` | بعد التاريخ | `occ-past:{id}` | ON |
| RA-16 | تطهير المحذوف | بعد 14 يومًا | `purge:{id}` | ON |
| RA-17 | إعادة الجدولة عند تغيير المنطقة الزمنية | تغيّر `timezone` | `tz:{from}:{to}` | ON |
| RA-18 | تجميع الـDigest | تجاوز السقف/ساعات الهدوء | `digest:{date}` | ON |

**قواعد الإشعارات:** سقف يومي (5)، ساعات هدوء، نص محايد، إشعار Neglected فقط لـHigh/Critical مرة كل 14 يومًا للشخص ولا يُرسَل للمؤرشف/المتوقف، وكل إشعار قابل لـ«أوقف لهذا الشخص». كل أتمتة قابلة لإعادة التشغيل بلا تكرار وتُسجَّل في `rel_automation_runs`.

---

## 13) العمل أوفلاين والمزامنة

### 13.1 المبدأ
كل شيء يعمل محليًا أولًا: إضافة الأشخاص، تسجيل التفاعلات، المتابعات، المناسبات، الهدايا، الصحة، الاقتراحات، البحث. المزامنة خلفية، وكل عملية لها `client_op_id` (`rel_client_ops`) فلا تتكرر عند الإعادة. حالة كل سجل: `Synced | Pending | Conflict`.

### 13.2 التخزين المحلي
- قاعدة محلية **مشفّرة** (SQLCipher/IndexedDB مشفّر) بمفتاح مرتبط بقفل الجهاز؛ الحقول `*_enc` تُفك بعد فتح قفل التطبيق.
- المشتقات تُحسب محليًا بنفس خوارزميات §6؛ الخادم المرجع عند التعارض.
- **التذكيرات تُجدول محليًا** على الجهاز (المناسبات، المتابعات) فتصل بلا اتصال، ثم تُنسَّق مع الخادم بـ`dedupe_key` فلا تتكرر.
- الصور: نسخة مصغّرة محليًا، الأصل عبر Core Files عند الاتصال.

### 13.3 طابور العمليات
| النوع | الترتيب | ملاحظة |
| :---- | :---- | :---- |
| إنشاء/تعديل شخص أو رابطة | حسب `client_ts` ثم `seq` | `version` للتحقق |
| تفاعل | إلحاق | `source_key` أو `client_op_id` يمنع التكرار |
| متابعة/مناسبة/هدية | حسب الترتيب | الهدية: انتقال حالة كحدث في `rel_gift_events` |
| دمج أشخاص | **على الخادم فقط** | يتطلب اتصالًا لتجنّب تعارض مرجعي |
| استدعاءات Finance/Shopping | ليست من الطابور؛ على الخادم بعد المزامنة | لا اتصال مباشر من الجهاز |

### 13.4 جدول التعارض والدمج
| الحالة | القرار |
| :---- | :---- |
| تعديل حقلين مختلفين لنفس الشخص من جهازين | دمج على مستوى الحقل |
| تعديل نفس الحقل | `Conflict` ⇒ شاشة «نسختي / النسخة الأخرى» |
| تفاعل نفسه من جهازين (نفس `client_op_id`) | سجل واحد |
| تفاعلان متشابهان بمفتاحين مختلفين (نفس الشخص/القناة/±10 دقائق) | يُحفظان مع بطاقة «هل هما نفس التفاعل؟» |
| حذف شخص على جهاز وتعديله على آخر | **التعديل يربح** ويُسترجع الشخص (الأرشفة لا الحذف) |
| دمج شخصين أثناء إضافة تفاعل لأحدهما أوفلاين | يُعاد توجيه التفاعل إلى الناجي (`merged_into`) |
| متابعة أُنجزت على جهازين | تُحفظ أقدم `done_at` |
| انتقال هدية متعارض (Purchased على جهاز وArchived على آخر) | الانتقال الأحدث بالخادم يربح بشرط توافق جدول §9.1 وإلا `Conflict` |
| ساعة جهاز خاطئة (>10 دقائق) | ترتيب بـ`server_received_at` وعرض `client_ts` + تحذير |
| تغيير المنطقة الزمنية | إعادة جدولة بـ`dedupe_key` بلا تكرار (RA-17) |

### 13.5 ما لا يعمل أوفلاين
الدمج، الربط مع Finance/Shopping، عدّاد «ما بينكم» من الأقسام الأخرى، تنزيل صور جديدة، تصدير ICS. ما عدا ذلك يعمل كاملًا بشارة «غير متزامن».

---

## 14) الأمان والخصوصية

### 14.1 مستويات الحساسية (CX-16)
| البيانات | المستوى | المعاملة |
| :---- | :---- | :---- |
| الاسم، الدور، الدائرة، المناسبات العادية | Normal | بحث داخلي، Picker، Feed |
| الميلاد الكامل، وسائل الاتصال، العنوان، الصور، الهدايا، الملاحظات، التفاعلات | Sensitive | مشفّرة الحقول؛ خارج البحث العام والويدجت بالاسم؛ إخفاء بالتحكم |
| حقائق صحية/غذائية-طبية، دين، سياسة، مال عن الغير؛ هدايا المفاجآت؛ أشخاص موسومون «خاص» | Secret | إعادة مصادقة للعرض؛ خارج Feed والتصدير الافتراضي والـPicker؛ لا أحداث |

### 14.2 الضوابط
- **أقل بيانات:** كل الحقول اختيارية عدا الاسم؛ لا طلب ميلاد أو هاتف؛ نصائح «احفظ فقط ما تحتاجه» عند إضافة حقيقة حساسة.
- تشفير الحقول `*_enc` في الراحة، TLS أثناء النقل؛ قفل التطبيق (Biometric/PIN) وإخفاء الأسماء في مبدّل التطبيقات.
- RLS على `user_id` + FK مركّب؛ لا يُقبل `user_id` من العميل.
- **حدود:** 5000 شخص، 10 وسائل اتصال/شخص، 50 دائرة، 20 هدية نشطة/مناسبة، 200 تفاعل/يوم، 10k حرف للملاحظة.
- Rate limit على الاستيراد والبحث والـAPI؛ `rel_audit_log` للتصدير والمحو وتغيير الخصوصية (بلا بيانات الأشخاص).
- **لا قراءة رسائل ولا مكالمات ولا مزامنة جهات اتصال مستمرة** (CX-22): كل التسجيل يدوي أو باقتراح بموافقة.
- **أحداث وتكاملات بلا بيانات شخصية** (§11.8)؛ الصحة والحقائق والتقييمات لا تغادر القسم.
- إشعارات شاشة القفل محايدة؛ ويدجت يخفي الأسماء افتراضيًا.

### 14.3 موافقة التكامل
كل تكامل له مفتاح مستقل في الإعدادات مع عرض «ما يُرسَل بالضبط». الإيقاف يجعل المراجع الخارجية `Detached` دون حذف.

### 14.4 الامتثال
يُرجع إلى مبادئ القانون المصري 151 لسنة 2020 لحماية البيانات الشخصية كمرجع عام (الغرض المحدد، تقليل البيانات، الحذف). **ليست استشارة قانونية**، وانطباق استثناء «الاستخدام الشخصي» على تخزين بيانات أشخاص آخرين **غير مؤكد — يُراجَع مع مختص قبل الإطلاق التجاري**.

### 14.5 التصدير والمحو
- **التصدير** JSON/CSV/vCard بإعادة مصادقة، يستثني Secret ما لم يُختَر صراحة؛ ملف مؤقت يُحذف بعد 24 ساعة.
- **الأرشفة** هي الافتراضي (تاريخ كامل). **المحو (Erase):** بإعادة مصادقة وكتابة الاسم؛ يحذف الشخص وكل تابعه (تفاعلات يخصه وحده، وفي الجماعية يُزال من المشاركين)، تُبقي الهدية المسجَّلة في Finance كما هي، يُصدَر `relationships.person.deleted` فتُوسَم المراجع `Missing`، مع فترة تراجع 14 يومًا (RA-16).
- حذف الحساب كله: `POST /relationships/data/delete` بنفس الضوابط.

---

## 15) الهجرة والاستيراد

### 15.1 الواقع
لا توجد بيانات علاقات شخصية مؤكدة في Notion (§1.2). الهجرة اختيارية، والنظام يبدأ فارغًا أو باستيراد.

### 15.2 استيراد Notion (اختياري)
| المصدر | القرار |
| :---- | :---- |
| **People** (فريق Koumma: Name/Title/Role/Team) | **لا يُستورد افتراضيًا** (فريق شركة). اختياريًا: `Name`→اسم، `Title/Role`→ملف مهني (`headline`)، `Team/Meeting/Project/PRD` تُهمَل أو تصير روابط ناعمة لاحقًا |
| **Base Salary** | **لا يُستورد أبدًا** (بيانات مالية عن طرف ثالث) |
| People الجذرية (Notion-managed) | **غير مؤكد — لا يمكن فحصها**؛ يُطلب CSV منك (RD-09) |
| Personal Contacts / Gift Ideas / Holidays | قوالب؛ يدويًا/CSV إن كانت فيها بيانات حقيقية |
| EMERGENCY CONTACT | يُدخَل يدويًا كشخص `is_emergency_contact` |
القالب المقترح للاستيراد: `display_name, role_label, roles, circle, importance, phone, email, birthday(YYYY-MM-DD أو MM-DD), notes`.

### 15.3 الإعداد الأول
1. اللغة والمنطقة الزمنية والتقويم الهجري (إن أردت).
2. **دوائر مقترحة** (قابلة للتعديل/الحذف): عائلة (فاصل 7)، الدائرة الأقرب (14)، أصدقاء (30)، مهنية (60)، شبكة معارف (90)، مرشدون (60)، بلا فاصل لـ«معارف».
3. «ابدأ بإضافة 3 أشخاص تهتم بهم» (الاسم فقط).
4. التذكيرات: الساعة، الهدوء، السقف؛ التكاملات كلها OFF.
5. تفعيل/إيقاف «صحة العلاقة» (افتراضي ON مع شرح بلا لوم).

### 15.4 الاستيراد (CSV/vCard/جهات الاتصال)
- **Dry-run ثم تطبيق:** صفوف سليمة، مكررة (هاتف/بريد/اسم)، أخطاء؛ لا تغيير قبل التأكيد.
- `import_key = {job_id}:{row_no}` يمنع التكرار؛ نسخة احتياطية قبل التطبيق؛ تراجع 7 أيام.
- **جهات الاتصال من الجهاز:** على الموبايل بموافقة صريحة، **قراءة مرة واحدة** بانتقاء المستخدم للأسماء (لا استيراد جماعي صامت)؛ الويب عبر vCard.
- حدود: 5000 صف، 50 عمودًا؛ لا استيراد لحقول Secret تلقائيًا.

---

## 16) اختبارات القبول (RT)

### 16.1 الاختبارات العشرة من المصدر
| # | الاختبار | المتوقع |
| :---- | :---- | :---- |
| RT-01 | تفاعل يغيّر آخر تواصل | بعد تسجيل تفاعل اليوم: `days_since=0` |
| RT-02 | فاصل الدائرة يؤثر في Neglected | نفس الأيام: دائرة 30 ⇒ Neglected، دائرة 90 ⇒ Healthy |
| RT-03 | تكرار الميلاد السنوي | الميلاد 15 مارس: التالي 2027-03-15، وبعده 2028-03-15 |
| RT-04 | المتابعة تظهر في Today | `feed/today` تحوي المتابعة المستحقة |
| RT-05 | شراء هدية ينتج رابط Finance واحدًا (المسار المباشر) | رابط واحد؛ وفي مسار Shopping لا رابط هنا |
| RT-06 | self-relation مرفوضة | `person_links` بنفس الشخص ⇒ `422 SELF_LINK` |
| RT-07 | History يبقى بعد الأرشفة | التفاعلات والهدايا باقية ومبحوث فيها |
| RT-08 | Health يوضح السبب | كل حالة تحمل `health_reason` مقروءًا |
| RT-09 | عزل المستخدمين | طلب شخص مستخدم آخر ⇒ 404 |
| RT-10 | حذف مناسبة لا يحذف الشخص | الشخص والهدايا باقية والهدية `occasion_id=NULL` |

### 16.2 الأشخاص والبحث والدمج
| # | الاختبار | المتوقع |
| :---- | :---- | :---- |
| RT-11 | إنشاء شخص بالاسم فقط | ينجح ويظهر فورًا |
| RT-12 | ميلاد بشهر بلا يوم | `422` |
| RT-13 | ميلاد بلا سنة | مقبول؛ لا عمر معروض |
| RT-14 | ميلاد 29 فبراير في سنة غير كبيسة | يظهر 28 فبراير (الافتراضي) |
| RT-15 | وسائل اتصال متعددة وأساسية واحدة | الثانية الأساسية تُلغي الأولى |
| RT-16 | تطبيع الهاتف | `01012345678` ⇒ `+201012345678` |
| RT-17 | بحث «احمد» يجد «أَحمد» | تطبيع عربي |
| RT-18 | بحث بآخر 4 أرقام | يجد الشخص |
| RT-19 | كشف تكرار بهاتف مطابق | بطاقة دمج قوية |
| RT-20 | «ليسا نفس الشخص» | لا تتكرر البطاقة |
| RT-21 | دمج شخصين | التفاعلات والمناسبات والهدايا عند الناجي، `301 MERGED` للقديم |
| RT-22 | تراجع الدمج خلال 30 يومًا | تعود الصفوف بمعرّفاتها |
| RT-23 | حدث `person.merged` | المستهلك يحدّث `person_ref` |
| RT-24 | Picker لا يعيد Secret | صحيح |
| RT-25 | Picker لا يعيد هاتفًا أو ميلادًا | صحيح |

### 16.3 التفاعلات والصحة والاقتراحات
| # | الاختبار | المتوقع |
| :---- | :---- | :---- |
| RT-26 | تفاعل جماعي بثلاثة | يحدّث آخر تواصل للثلاثة |
| RT-27 | تفاعل Social | لا يحدّث آخر تواصل (الافتراضي) |
| RT-28 | تفاعل مستقبلي | `422 FUTURE_DATE` مع اقتراح متابعة |
| RT-29 | تفاعل رجعي | يعيد حساب الحالة |
| RT-30 | فاصل 30، قبل 45 يومًا، High | Neglected بسببها |
| RT-31 | فاصل 30، قبل 26 يومًا | NeedsAttention (0.87) |
| RT-32 | فاصل 30، قبل 20 يومًا | Healthy |
| RT-33 | Low بعد 90 يومًا | Healthy (لا Neglected) |
| RT-34 | الرابطة Paused | NotTracked |
| RT-35 | `health_tracking=Off` لشخص | NotTracked |
| RT-36 | لا فاصل (دائرة بلا فاصل) | NotTracked |
| RT-37 | شخص جديد بلا تفاعل خلال المهلة | NotTracked |
| RT-38 | متابعة متأخرة | NeedsAttention |
| RT-39 | `contact_interval_override_days` | يتفوّق على الدائرة |
| RT-40 | اقتراحات: مثالا §6.5 | 69 و57 |
| RT-41 | الحد الأقصى 3 يوميًا | لا أكثر |
| RT-42 | تجاهل اقتراح | يختفي 14 يومًا |
| RT-43 | `Difficult` لا يخفي الشخص | يظهر الاقتراح بصياغة لطيفة |

### 16.4 المتابعات والمناسبات والتذكيرات
| # | الاختبار | المتوقع |
| :---- | :---- | :---- |
| RT-44 | اختصار `next_follow_up_at` | ينشئ متابعة واحدة (idempotent) |
| RT-45 | أجّل متابعة 7 أيام | تعود Open في موعدها |
| RT-46 | تأجيل > 90 يومًا | `422` |
| RT-47 | الميلاد ينتج مناسبة مولَّدة | واحدة، ومنع ثانٍ يدوي `409 BIRTHDAY_EXISTS` |
| RT-48 | مناسبة هجرية بـ`day_offset=+1` | التاريخ الميلادي يُزاح يومًا |
| RT-49 | مناسبة `Once` بعد انقضائها | `Past` |
| RT-50 | تذكير `{7,1,0}` | ثلاثة تذكيرات بلا تكرار عند إعادة الجدولة |
| RT-51 | ساعات الهدوء | يتأجل للوقت المسموح |
| RT-52 | تجاوز السقف | يدخل Digest |
| RT-53 | شخص مؤرشف | لا تذكيرات (إلا Remembrance) |
| RT-54 | تغيير المنطقة الزمنية | لا تذكير مكرر |

### 16.5 الهدايا والتكامل
| # | الاختبار | المتوقع |
| :---- | :---- | :---- |
| RT-55 | جاهزية AtRisk | مناسبة بعد 9 أيام وهدية Idea وlead=10 ⇒ AtRisk |
| RT-56 | مسار Shopping | `purchase.completed` ⇒ Purchased وبلا رابط Finance |
| RT-57 | `purchase.refunded` | تعود Planned |
| RT-58 | مسار مباشر + إعادة المحاولة | رابط Finance واحد (Idempotency) |
| RT-59 | Finance لا يستقبل اسمًا أو `person_ref` | الحمولة `gift_id` ومبلغ فقط |
| RT-60 | **فحص الصياغة في CI** | لا عبارات لوم/حكم على أشخاص («سام»، «غير مهم»، «أهملت») |
| RT-61 | مساران لهدية واحدة | `409 PATH_CONFLICT` |
| RT-62 | هدية مصنوعة Idea→Given | مقبول بـ`purchase_path=None` |
| RT-63 | تدهور: Shopping معطّل | الهدايا تعمل يدويًا |
| RT-64 | تدهور: لوحة «ما بينكم» | تخفي الأقسام المعطّلة بلا خطأ |

### 16.6 الخصوصية والأوفلاين والاستيراد
| # | الاختبار | المتوقع |
| :---- | :---- | :---- |
| RT-65 | إشعار شاشة القفل | نص محايد بلا اسم |
| RT-66 | `feed/calendar` | عناوين محايدة افتراضيًا |
| RT-67 | حقيقة Sensitive | تُشفَّر، خارج البحث، تظهر عليها التحذير |
| RT-68 | تصدير | يستثني Secret افتراضيًا |
| RT-69 | Erase | بإعادة مصادقة؛ `person.deleted`؛ المراجع `Missing`؛ تراجع 14 يومًا |
| RT-70 | عمل أوفلاين كامل ثم مزامنة | لا فقد ولا تكرار |
| RT-71 | تعديل/حذف متعارضان | التعديل يربح |
| RT-72 | CSV Dry-run | لا تغيير قبل التأكيد؛ إعادة التطبيق لا تكرر |
| RT-73 | استيراد Notion People | لا Base Salary أبدًا |
| RT-74 | إعادة بناء المشتقات | نفس النتائج بعد `POST /relationships/rebuild` |

---

## 17) الخدمات وترتيب البناء

### 17.1 الخدمات
| الخدمة | المسؤولية |
| :---- | :---- |
| PersonService | الأشخاص، وسائل الاتصال، الأرشفة، الدمج، المحو |
| RelationshipService | الرابطة، الأدوار، التاريخ، روابط الأشخاص |
| InteractionService | التفاعلات والمشاركون وQuick Log |
| FollowUpService | المتابعات والتأجيل |
| OccasionService | المناسبات والتقويمان والتذكيرات |
| InterestService / PersonFactService | الاهتمامات والحقائق والحساسية |
| GiftService | الهدايا، المسارين، الحالة |
| CircleService | الدوائر والفواصل |
| RelationshipGoalService | الأهداف |
| NetworkingService | الملف المهني والتعريفات |
| RelationshipInsightService | الصحة، الاقتراحات، الرؤى |
| RelationshipNotificationService | الجدولة، الهدوء، السقف، Digest |
| DuplicateService / MergeService | كشف التكرار والدمج |
| RelationshipFinanceIntegrationService | رابط الهدية المباشر |
| RelationshipShoppingIntegrationService | Inbox والأحداث الواردة |
| PickerService / SearchService | عقد Picker والبحث العربي |
| ImportService / ExportService | CSV/vCard/جهات الاتصال |
| SyncService / PrivacyService | المزامنة والخصوصية |

### 17.2 مراحل البناء
| المرحلة | المحتوى | اختبارات |
| :---- | :---- | :---- |
| P0 | الهيكل، RLS، التشفير، الإعدادات، المزامنة الأساسية | RT-09، RT-70 |
| P1 | الأشخاص ووسائل الاتصال والبحث والرابطة والدوائر | RT-11–18 |
| P2 | التفاعلات والصحة والمشتقات | RT-01، 02، 26–39 |
| P3 | المتابعات والمناسبات والتذكيرات | RT-03، 04، 44–54 |
| P4 | الاهتمامات والحقائق والملف المهني | RT-67 |
| P5 | الهدايا والتكاملات (Shopping/Finance) | RT-05، 55–64 |
| P6 | التكرار والدمج والأرشفة والمحو | RT-06، 07، 19–25، 69 |
| P7 | الاقتراحات والرؤى والمراجعة الأسبوعية | RT-40–43 |
| P8 | الاستيراد والتصدير والخصوصية الكاملة وتثبيت الجودة | RT-60، 65–68، 71–74 |

---

## 18) القرارات المفتوحة (RD)

| # | القرار | التوصية الافتراضية |
| :---- | :---- | :---- |
| RD-01 | هل تفاعل `Social` (إعجاب/تعليق) يحسب تواصلًا؟ | لا (قابل للتعديل لكل تفاعل) |
| RD-02 | عتبة Neglected = الفاصل نفسه (كما المصدر) أم 1.5× | الفاصل نفسه، مع Needs Attention عند 0.8 |
| RD-03 | خوارزمية الهجري: Umm al-Qura أم الجدولي | Umm al-Qura **غير مؤكد — يُتحقق قبل البناء**، مع `day_offset` |
| RD-04 | الفاصل الافتراضي للدوائر الجديدة | 30 يومًا كاقتراح؛ بلا فاصل ⇒ NotTracked |
| RD-05 | 29 فبراير في السنة غير الكبيسة | 28 فبراير |
| RD-06 | أسماء المناسبات في Calendar | مخفية افتراضيًا |
| RD-07 | مهلة التراجع بعد Erase | 14 يومًا |
| RD-08 | السماح بحقائق حساسة عن الغير (حساسية غذائية، دين…) | مسموح كـSensitive/Secret بتحذير؛ يمكن تعطيل الفئة كليًا |
| RD-09 | قاعدة People الجذرية في Notion (غير مفحوصة) | تعطيني CSV منها إن كانت أشخاصك |
| RD-10 | استيراد «People» الخاصة بـKoumma كجهات مهنية | لا افتراضيًا؛ اختيار صريح |
| RD-11 | استيراد جهات اتصال الجهاز | مرة واحدة بانتقاء، لا مزامنة |
| RD-12 | المسار الافتراضي لشراء الهدية | Shopping إن كان مفعّلًا |
| RD-13 | إشعار Neglected | High/Critical فقط، مرة كل 14 يومًا |
| RD-14 | فهرسة الأسماء في Core Search | OFF |
| RD-15 | الافتراضي: أرشفة لا حذف | أرشفة |
| RD-16 | تفعيل «صحة العلاقة» افتراضيًا | ON مع إمكانية الإيقاف الكلي |

---

## 19) مصفوفة التغطية والخلاصة

### 19.1 مصفوفة التغطية
| قسم المصدر | موضعه هنا |
| :---- | :---- |
| 1 الهدف | الرأس، §4 |
| 2 حدود الملكية | §3.2، §11 |
| 3 رحلة الاستخدام والشاشات | §4.3، §10 |
| 4 People | §5.2، §6.17 |
| 5 Relationships | §5.3، RC-03 |
| 6 Interactions | §5.5، §6.1 |
| 7 Follow-ups | §5.6، §6.8 |
| 8 Occasions | §5.7، §6.6–6.7 |
| 9 Interests + Facts | §5.8، §6.14 |
| 10 Gifts | §5.9، §6.13 |
| 11 Circles | §5.4، §6.2 |
| 12 Relationship Goals | §5.10 |
| 13 Relationship Health | §6.3–6.5 |
| 14 Networking | §5.11، §10.3 |
| 15 Home | §10.2 |
| 16 Person Detail | §10.3 |
| 17 Automation | §12 |
| 18 التكامل | §11 |
| 19 Services | §17 |
| 20 Acceptance Tests | §16 (RT-01…RT-10) |
| القواعد التسع المشتركة | §3.3، §5.0، §13، §14 |

### 19.2 الخلاصة
**ما يحتاج قرارك:** RD-09 (قاعدة People في Notion التي لم أستطع فتحها)، RD-03 (خوارزمية الهجري)، RD-08 (السماح بحقائق حساسة عن الغير)، RD-02 (عتبة الإهمال)، ثم الباقي بتوصياته.

**طلبات التغيير على الأنظمة الأخرى:**
- **Finance:** `source_type=relationship_gift` وبُعد `gift_id`؛ اختياري: `GET /finance/debts/summary?person_ref=` (عدّاد فقط).
- **Shopping:** تضمين `source_key` الأصلي للمقترح في `purchase.completed`.
- **Inventory:** `GET /inventory/loans?person_ref=`.
- **Travel:** `GET /travel/trips?person_ref=` و`travel.trip.completed` بالرفاق.
- **Knowledge/Projects:** `GET …?person_ref=` وحدث `knowledge.meeting.ended` بالحاضرين.
- **Core:** عقد Picker للأشخاص، وإشعارات محايدة، وفهرسة اختيارية.
- **Habit:** يستهلك `relationships.interaction.logged` اختياريًا؛ **Spiritual:** `GET /relationships/summary` أعداد فقط.

**غير مؤكد:** قاعدة People الجذرية في Notion، خوارزمية الهجري، انطباق قانون 151 على بيانات الأطراف الثالثة، وتحويل الأسماء بين الحروف.
