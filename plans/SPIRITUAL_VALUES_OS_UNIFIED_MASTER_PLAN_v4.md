# 🙏 Spiritual & Values OS — خطة العمل الموحّدة والكاملة (الإصدار 4.0)

**الغرض:** وثيقة بناء **مكتفية بذاتها** لتطبيق **القيم والممارسات الشخصية** (ويب + موبايل، عربي RTL، يعمل أوفلاين كاملًا): ما الذي يهمّني حقًا؟ كيف أحوّله إلى قواعد وممارسات صغيرة؟ كيف أتأمل وأمتنّ وأراجع نفسي **برفق**؟ نظام **اختياري بالكامل** و**محايد المعتقد**: أنت تحدّد قيمك وممارساتك (دينية أو فلسفية أو إنسانية أو مهنية أو غيرها)، والنظام لا يفرض دينًا ولا تصنيفًا ولا حكمًا أخلاقيًا. يعمل **كقسم مستقل تمامًا**، ومرتبط بأنظمتك (Habit، Today، Calendar، Learning، Nutrition، Relationships، Core) عبر **عقود API/Events فقط** — بلا جداول مشتركة ولا نسخ كيانات. نفس فلسفة وثائق Learning وFinance وNutrition وInventory وShopping وRelationships ونفس هيكلها، بما يناسب طبيعة هذا القسم: **بيانات معتقد شديدة الحساسية، لغة بلا لوم، لا درجات أخلاقية، وخصوصية افتراضية قصوى**.

> **هذه الوثيقة تحلّ محلّ الملفين السابقين بالكامل** (`SPIRITUAL_VALUES_OS_Independent_Build_Spec.md` EN و`SPIRITUAL_VALUES_OS_وثيقة_البناء_المستقلة_العربية.md` AR). كل بند فيهما موجود هنا (انظر **مصفوفة التغطية في §19**) مع حسم التعارضات وسد الفجوات. لا يُرسَل الملفان القديمان لمنفّذ التطبيق.

**ما دخل في المراجعة:**

1. مواصفتا المصدر (EN + AR): 18 قسمًا + «قواعد التنفيذ المشتركة» (9 قواعد).
2. **Notion (قراءة فقط):** وجدت قالبًا جاهزًا باسم **«Muslim Life OS | Free Version»** (ضمن Damen's/Home)، و«Core Values, Mission, and Vision» وقوالب Reflection ضمن «Company Hub Template»، وقوالب Gratitude/Daily Journal ضمن «Personal Growth» (§1.2). **وجود قالب لا يعني افتراض معتقدك:** النظام يبدأ فارغًا ومحايدًا.
3. وثائق **Nutrition OS v4.0** (قرار ND-15: ربط الصيام مؤجَّل) و**Relationships OS v4.0** (ملخص صلة الأرحام) و**Finance OS v4.1** كقالب.
4. **القرارات المشتركة CX-01…CX-22** (ملزمة) — وأهمها CX-09 (اليوميات ملك Habit) وCX-10 (السجلات والسلاسل ملك Habit) وCX-15 (الهجري بلا قوائم دينية مبرمجة) وCX-16 (فئات الحساسية).

**المرجع الأعلى عند التعارض:** هذه الوثيقة ← سلوك Notion الفعلي ← مواصفتا المصدر.

> **تنبيه أمانة:** هذه الوثيقة **أداة تنظيم وتأمل شخصي** وليست فتوى ولا إرشادًا دينيًا أو روحيًا أو علاجًا نفسيًا. النظام **لا يقول لك ما تعتقد ولا كيف تمارس**، ولا يحسب «درجة أخلاقية» ولا «نسبة إيمان» ولا «نقاط ذنوب». كل ما يُحسب (عدد الأيام، الاتساق، التقدم نحو هدف) **وصف رقمي محايد** بيدك إخفاؤه. لا قوائم دينية مبرمجة ولا حساب مواقيت صلاة في هذا الإصدار (§6، PD-03). أي ادعاء عن مزوّد أو مصدر خارجي غير مفحوص موسوم **«غير مؤكد — يُتحقق قبل البناء»**.

> **مفاتيح القراءة:** `PF` ميزة محفوظة من المصدر · `PC` تعارض محسوم · `PG` فجوة مسدودة · `PE` تحسين مضاف · `PD` قرار يحتاج تأكيدك (بتوصية افتراضية) · `PV` قاعدة تحقق · `PA` أتمتة · `PT` اختبار قبول. (الحرف **P** = Spiritual، حسب CX-18 — والاسم `Spiritual & Values` لا يعني أي معتقد محدّد.) و`CX-xx` = القرارات المشتركة.

---

## 1) مراجعة المصدر وحكم على كل عنصر

### 1.1 ملخص المراجعة
المصدر قصير لكنه **يحمل أخطر التعارضات في السلسلة** لأنه يمسّ الكرامة والخصوصية:
- **«لا تصنيف معتقد»** مع أمثلة تبدأ بـ`Prayer`؛ والمطلوب ممارسات قابلة للتخصيص بلا قائمة دينية مبرمجة.
- **الحالة `Missed`** ومعها **«ممنوع guilt automation»**: غياب سجل ليس «تفويتًا».
- **«optional streak»** مع **«ممنوع moral scoring»** ومع أن **Habit يملك السلاسل** (CX-10).
- **`violation_signals`** في Principles: حقل اسمه «إشارات المخالفة» يفتح باب الذنب.
- **Practice Logs مقابل Habit Logs:** «استخدم relation ولا تكرر Daily Log» دون تحديد كيف.
- **Reflections مقابل Journal:** «يفضَّل الربط» دون قرار (حُسم في CX-09).
- **Values بـ`importance` و`rank` معًا** وفي الوقت نفسه «لا Score أخلاقيًا إلزاميًا».
- **Commitments:** لا حالة تحفظ الكرامة عند عدم الإكمال (لا «فشل»).
- **Important Dates:** «القائمة الدينية ليست hardcoded» لكن التكرار الهجري والشهري غير محدَّدين.
- **الخصوصية:** «Private by default» دون تحديد كيف تتعايش مع Today وCalendar والإشعارات والبحث والـAdmin والتصدير.
- **Reviews:** «document/entity» دون قرار.
- **ممارسة بعدة أوقات يوميًا** (أكثر من مرة في اليوم) غير مدعومة في `Practice Logs`.
- **الصيام/الامتناع** تحتاجه Nutrition كإشارة (ND-15) والمصدر لا يتحدث عنه.

### 1.2 ما وجدته في Notion (قراءة فقط)
| العنصر | الموقع | الحقيقة المفحوصة | الأثر |
| :---- | :---- | :---- | :---- |
| **Muslim Life OS \| Free Version** | Damen's / Home | **قالب جاهز مستورد (آخر تعديل 2024-04-07)** يضم صفحات: Salah Tracker، Quran Journaling، Surah & Juz Tracker، Du'a & Tasbih، Hadith، The Prophets، 99 Names… (وRamadan Tracker ورد في فحص Nutrition) | **ليس دليلًا على معتقدك ولا على بياناتك.** يُعرض كمصدر استيراد اختياري (§15.2) |
| **Salah Tracker** (قاعدة) | داخل القالب | أعمدة: Fajr/Dhuhur/Asr/Maghrib/Isha/Duha/Tahajjud/Witr (checkbox) + «Sunnah Prayers» (رقم) + Notes + Date (وقت الإنشاء) + 3 صيغ (Day/Today/progress) | يكشف نمط **«ممارسة بعدة خانات يوميًا»** (PG-25) |
| **Quran Journaling** (قاعدة) | داخل القالب | Name، Ayah (رقم)، Surah (select بقيمتين مؤقتتين «Home/Work» من القالب)، Topic (Prophets/Akhlaq/Character)، Created | يطابق **Reflection + مرجع قراءة + وسوم** (§15.2) |
| Surah & Juz Tracker، Du'a & Tasbih، Hadith، The Prophets، 99 Names | داخل القالب | صفحات **محتوى مرجعي ثابت** | **خارج النطاق:** مكتبة محتوى لا تُبنى هنا (PG-24)، تذهب إلى Knowledge/Learning إن أردت |
| **Core Values, Mission, and Vision** | Company Hub Template | قالب شركة، نصه «CORE VALUES: Add Core Values Here!» (فارغ) | قيم **مؤسسية** (Projects/Koumma) لا شخصية؛ لا تُستورد افتراضيًا |
| **Daily Reflection / Reflections** | Company Hub Template | قوالب تأمل يومي للشركة (لم تُفحص صفوفها) | مرجع صياغة فقط |
| **Gratitude / Reflection / Daily Journal Entries** | Damen's / Home / Personal Growth | قوالب يوميات بأسئلة شكر («كيف أدع هذا الامتنان يؤثر في أفعالي؟») | **اليوميات ملك Habit (CX-09)**؛ هذا القسم يربطها بـ`journal_ref` |

> **لم أقرأ محتوى أي صفحة أو صف** (بيانات المعتقد شديدة الحساسية)، ولم أحتفظ بشيء منها. النتيجة الأمينة: **لا توجد بيانات روحية/قيمية مؤكدة تخصك للهجرة**؛ الهجرة اختيارية بخريطة جاهزة (§15).

### 1.3 حكم على كل عنصر من المصدر
| # | العنصر في المصدر | الحكم | المعالجة | أين |
| :---- | :---- | :---- | :---- | :---- |
| 1 | نظام اختياري + حياد المعتقد إلزامي | **اعتماد (مبدأ حاكم)** | لا أسئلة معتقد، لا قوائم دينية مبرمجة | §3.3 |
| 2 | يملك 9 كيانات | **اعتماد + تدقيق** | + جداول مساعدة (مواسم، شكر، خانات) | §3.2 |
| 3 | لا يملك Journal/Habit Logs/Calendar/Global Goals | **اعتماد** | مراجع ناعمة فقط | §3.2، §11 |
| 4 | الشاشات (11) | **اعتماد + إضافة** | + مواسم، رؤية الاتساق، قفل | §10 |
| 5 | Values (name…notes) | **تعديل** | `rank` ترتيب فقط، `importance` اختياري، بلا مجموع | PC-07 |
| 6 | لا Score أخلاقي | **اعتماد صارم** | يُختبر | PT-09 |
| 7 | Principles | **تعديل** | `violation_signals` → `drift_signals` يكتبها المستخدم | PC-06 |
| 8 | Practices + أنواع قابلة للتخصيص | **تعديل** | أنواع حرة؛ خانات يومية؛ إصدارات للتكرار | PC-01، PG-25 |
| 9 | Practice Logs + Done/Partial/Missed/Excused | **تعديل** | غياب السجل ≠ Missed | PC-02 |
| 10 | ربط Habit بلا تكرار | **حسم** | `log_mode` | PC-04 |
| 11 | Spiritual Goals + `current` مشتق | **اعتماد مع حساب** | §6.7 | PC-14 |
| 12 | Reflections + ربط Journal | **حسم** | تبقى هنا خاصة + `journal_ref` | PC-05 |
| 13 | Commitments + `progress` مشتق | **تعديل** | حالات بلا «فشل»؛ check-ins | PC-08 |
| 14 | Important Dates بلا قائمة دينية | **اعتماد + توسيع** | هجري/شهري/استيراد | PC-10 |
| 15 | Reviews (أسبوعي/شهري/سنوي) | **حسم** | كيان + أقسام | PC-11 |
| 16 | Private by default | **اعتماد + تفصيل** | طبقات + قفل + تشفير | §14 |
| 17 | أتمتة (تذكيرات، مراجعات، streak) | **اعتماد مع قيود** | بلا ذنب؛ streak محايد اختياري | PC-03 |
| 18 | ممنوع guilt/moral scoring | **اعتماد صارم** | CI على النصوص | PT-60 |
| 19 | التكاملات (5) | **اعتماد مع حدود** | الأحداث الصادرة OFF افتراضيًا | §11 |
| 20 | الخدمات (10) | **اعتماد** | + خدمات مساعدة | §17 |
| 21 | الاختبارات العشرة | **اعتماد** | ضمن 60+ اختبارًا | §16 |
| 22 | القواعد التسع المشتركة | **اعتماد + مواءمة** | FK داخل القسم، مراجع ناعمة خارجه | §3.3 |
| 23 | لا تعريف لإشارة الصيام/الامتناع لـNutrition | **إضافة** | عقد اختياري مغلق افتراضيًا | PC-18 |
| 24 | لا قواعد لتغيّر الظروف (سفر/مرض/موسم) | **إضافة** | وضع الإيقاف + المواسم | PG-04، PE-10 |

---

## 2) جرد الميزات المحفوظة (PF — كلها)

| ID | الميزة / القاعدة (من المصدر) | أين |
| :---- | :---- | :---- |
| PF-01 | نظام شخصي **اختياري** للقيم والمبادئ والممارسات والأهداف والالتزامات والتأمل والمراجعات | §4 |
| PF-02 | **حياد المعتقد إلزامي**: المستخدم يحدد معتقداته وممارساته؛ لا فرض دين أو تصنيف أو حكم | §3.3، §10.6 |
| PF-03 | يملك: Values, Principles, Practices, Practice Logs, Spiritual Goals, Reflections, Commitments, Important Dates, Reviews | §3.2 |
| PF-04 | لا يملك: General Journal، Habit Logs، Calendar، Global Goals | §3.2، §11 |
| PF-05 | الشاشات: Home, Values, Principles, Practices, Daily Log, Reflections, Goals, Commitments, Important Dates, Reviews, Settings | §10 |
| PF-06 | Values: id, user_id, name, description, category, importance, rank, active, meaning_source, notes | §5.2 |
| PF-07 | لا تجعل القيمة Score أخلاقيًا إلزاميًا | §3.5، PC-07 |
| PF-08 | Principles: id, user_id, title, statement, related_value_id, context, examples, violation_signals, active | §5.3 |
| PF-09 | Principle = تحويل Value إلى قاعدة عملية | §4.2 |
| PF-10 | Practices: id, user_id, name, type, category, frequency_config, target, minimum, preferred_time, active, why, notes | §5.4 |
| PF-11 | أمثلة قابلة للتخصيص: Prayer/Reading/Reflection/Meditation/Service/Study/Gratitude/Custom | §5.4، PC-01 |
| PF-12 | Practice Logs: practice_id, date, status, actual, duration, note, private_reflection | §5.5 |
| PF-13 | Status: Done/Partial/Missed/Excused | §5.5، §6.3 |
| PF-14 | ممارسة مرتبطة بـHabit ⇒ relation ولا تكرار Daily Log | §5.5، §6.14، PC-04 |
| PF-15 | Spiritual Goals: id, user_id, name, description, type, start_date, target_date, status, target, current, notes | §5.7 |
| PF-16 | `current` مشتق | §6.7 |
| PF-17 | Reflections: date, prompt, reflection, gratitude, lesson, concern, next_commitment, tags | §5.8 |
| PF-18 | يفضَّل الربط مع Journal الأساسي بدل نسخة يوميات ثانية | §11.2، PC-05 |
| PF-19 | Commitments: title, description, related_value_id, related_principle_id, start_date, review_date, status, progress, notes | §5.9 |
| PF-20 | `progress` مشتق | §6.8 |
| PF-21 | Important Dates: name, type, date, recurrence, reminder_days, notes, private | §5.10 |
| PF-22 | القائمة الدينية ليست hardcoded؛ يضيفها المستخدم | §5.10، PC-10 |
| PF-23 | Reviews: Weekly/Monthly/Annual (period, values_reflection, practices_review, lessons, gratitude, commitments, notes) | §5.11 |
| PF-24 | Review يمكن أن تكون document/entity؛ لا DB جديدة إن كفى document model | §5.11، PC-11 |
| PF-25 | Private by default | §14 |
| PF-26 | Reflections والالتزامات الحساسة لا تدخل Global Search أو Admin بدون صلاحية | §14 |
| PF-27 | أتمتة: تذكير ممارسات | PA-01 |
| PF-28 | أتمتة: تذكير تواريخ مهمة | PA-02 |
| PF-29 | أتمتة: مراجعة الالتزام | PA-03 |
| PF-30 | أتمتة: مواعيد الأهداف | PA-04 |
| PF-31 | أتمتة: تحفيز تأمل أسبوعي/شهري | PA-05، PA-06 |
| PF-32 | streak اختياري | §6.6، PC-03 |
| PF-33 | ممنوع guilt automation أو moral scoring | §3.5، §10.6 |
| PF-34 | التكامل: Habit، Journal، Today، Calendar، Learning | §11 |
| PF-35 | الخدمات العشر (Value…SpiritualNotification) | §17 |
| PF-36 | APIs الثمانية | §11.9 |
| PF-37 | الاختبارات العشرة | §16 (PT-01…PT-10) |
| PF-38 | القواعد التسع المشتركة | §3.3 |

---

## 3) المبادئ والحدود بين الأقسام

### 3.1 ما هو Spiritual & Values OS
نظام يجيب عن: **ما قيمي؟ ما القواعد التي أعيش بها؟ ما الممارسات التي أحافظ عليها؟ ما الذي أتأمله وأمتنّ له؟ ما التزاماتي مع نفسي؟** ولا يجيب عن: كم عندك «حسنات»، أو هل أنت «على الطريق الصحيح»، أو ما الحكم الشرعي/الأخلاقي لشيء.

### 3.2 مصفوفة الملكية
| الكيان | يملكه | غيره يخزّن فقط |
| :---- | :---- | :---- |
| القيم، المبادئ، الممارسات (التعريف والجدول) | **Spiritual** | — |
| سجل الممارسة | **Spiritual** (وضع `Own`) أو **Habit** (وضع `HabitLinked`) | Spiritual يقرأ الحالة من Habit ويحتفظ بملاحظاته الخاصة |
| الأهداف الروحية، الالتزامات، المراجعات، المواسم | Spiritual | `core_goal_ref` اختياري للأهداف العامة |
| **التأملات والامتنان** | Spiritual (خاصة) | `journal_ref` إلى يوميات Habit (CX-09) |
| التواريخ المهمة | Spiritual | Calendar يعرض فقط (CX-12) |
| **اليوميات العامة، السلاسل، السجلات اليومية للعادات** | **Habit** (CX-09، CX-10) | `habit_ref` |
| التقويم، المهام، الأهداف العامة | Core | مراجع ناعمة |
| الدروس والدورات | Learning | `learning_ref` |
| الأكل والصيام كنوافذ | Nutrition (نوافذ يحددها المستخدم بلا قيم دينية، ND-15) | إشارة اختيارية مغلقة (PC-18) |
| صلة الأرحام (عدّاد تواصل) | Relationships | ملخص أعداد فقط |
| المال والعطاء | **Finance** | لا شيء هنا (PC-20) |

### 3.3 المبادئ (ملزمة)
1. **الحياد:** لا سؤال عن المعتقد، لا قائمة دينية مبرمجة، لا تصنيف تلقائي، لا اقتراح «ممارسة مناسبة لدينك». الأنواع والأسماء والأوقات كلها من المستخدم.
2. **لا حكم ولا درجة:** لا «أخلاقية»، لا «إيمان»، لا ترتيب بين شخصين أو بين أسبوعين بالأحمر والأخضر.
3. **الغياب ليس تقصيرًا:** عدم تسجيل يوم ≠ «فوّتّ»؛ الحالة `Missed` اختيارية ومعطّلة افتراضيًا (PD-04).
4. **الخصوصية أولًا:** قفل القسم، تشفير النصوص، لا بحث عام، لا Admin، لا أحداث صادرة افتراضيًا، إشعارات محايدة.
5. **الأقل بيانات:** لا حقول معتقد في الهوية، ولا اسم ممارسة في أي إشعار أو حدث ما لم تُفعّله.
6. **المشتقات** (الاتساق، تقدم الهدف، التقدم نحو الالتزام) Cache قابل لإعادة البناء، **وصفية** ولا تُحرَّر.
7. **لا تكرار:** السجلات اليومية والسلاسل ملك Habit عند الربط؛ اليوميات ملك Habit؛ المال ملك Finance.
8. **لا FK عبر الأقسام**؛ داخل القسم FK مركّب `(parent_id, user_id)`.
9. **الأوفلاين أولًا** (§13).
10. **البداية الجديدة مجانية:** أي انقطاع يُستقبل بـ«أهلًا بعودتك» لا بتصفير أو لوم (PE-03).
11. **بلا ألعاب:** لا نقاط ولا شارات ولا مقارنات بين الناس (PE-13).

### 3.4 مصفوفة التدهور (Degradation)
| ما يتعطل | ما يستمر | ما يظهر |
| :---- | :---- | :---- |
| Habit | الممارسات بوضع `Own` والممارسات المرتبطة تُعرض بآخر نسخة محفوظة | «آخر مزامنة مع Habit: …» |
| Learning/Relationships/Nutrition/Core Goals | كل الوظائف الأساسية | الروابط تُخفى أو تُعلَّم `NoAccess/Missing` |
| Core Notifications | التذكيرات المحلية على الجهاز | تنبيه «قد تتأخر التنبيهات» |
| Core Calendar/Today | كل شيء داخل القسم | لا عناصر في Today |
| الشبكة | **كل شيء** محليًا | شارة «غير متزامن» |

### 3.5 الخصوصية والصياغة
- **نبرة:** هادئة، محترمة، غير واعظة، لا تفترض خلفية المستخدم.
- **ممنوع في الواجهة:** «فاتتك»، «قصّرت»، «ذنب»، «خطيئة»، «فشلت»، «انقطع سلسلتك»، «ضعيف إيمانيًا»، «أنت متأخر»، أي ترتيب أو لون أحمر عقابي؛ يُفحص بـCI (PT-60).
- **الإشعارات:** نص محايد افتراضيًا («تذكيرك الهادئ»)؛ اسم الممارسة لا يظهر إلا بتفعيل صريح.
- **الأحداث الصادرة:** معطّلة افتراضيًا، وإن فُعّلت تحمل معرّفات وأعدادًا فقط (CX-17).

---

## 4) النموذج المفاهيمي

### 4.1 خريطة الكيانات
```text
Value ──< Principle ──< Commitment ──< CheckIn
  │           │              │
  └───────────┴──── Practice ──< Log (slot) ──── (HabitLinked: يقرأ من Habit)
                        │  └──< Version (frequency history)
                        ├── Season (مجموعة ممارسات مؤقتة)
                        └── Goal ──< Milestone / Adjustment
Reflection ──< Gratitude  ──(journal_ref)──► Habit Journal
ImportantDate     Review ──< Section (من القالب)
```

### 4.2 المفاهيم
- **القيمة (Value):** ما يهمك (أمانة، رحمة، علم، صبر…). **اسم ووصف فقط**، لا مقياس.
- **المبدأ (Principle):** قاعدة عملية مشتقة من قيمة («أقول الحقيقة بلطف»).
- **الممارسة (Practice):** فعل متكرر تحافظ عليه (قراءة، تأمل، خدمة، صلاة بأوقاتها، ذكر…) بإعدادك أنت.
- **الخانة (Slot):** ممارسة بعدة مرات يوميًا (صباح/مساء، أو خمس مرات) تُسجَّل كل مرة بخانتها.
- **السجل (Log):** ما حدث فعلًا في يوم/خانة؛ الغياب ببساطة «غير مسجَّل».
- **الحدّ الأدنى (Minimum):** أصغر نسخة تحتسب «يومًا محافظًا عليه».
- **الموسم (Season):** فترة باسمك (شهر خاص، فترة امتحانات، سفر) بمجموعة ممارسات وتكرارات مؤقتة.
- **الهدف (Goal):** نتيجة ممتدة نحو تاريخ (إتمام كتاب، حفظ، خدمة عدد ساعات).
- **الالتزام (Commitment):** وعد لنفسك بتاريخ مراجعة، مع Check-ins اختيارية.
- **التأمل والامتنان:** نص خاص بتاريخ؛ الامتنان يُلتقط سريعًا ويُعاد عرضه أحيانًا.
- **المراجعة (Review):** وقفة أسبوعية/شهرية/سنوية بأسئلتك، بنص حر وأرقام وصفية.

### 4.3 رحلات الاستخدام
1. **بداية بلا أسئلة:** افتح القسم ← «ابدأ بقيمة واحدة أو ممارسة واحدة أو اترك فارغًا» ← لا شيء إلزامي.
2. **من قيمة إلى فعل:** قيمة «الصبر» ← مبدأ «أتنفس قبل أن أرد» ← ممارسة «تأمل 3 دقائق» بحد أدنى «نفس واحد» ← التزام «أسبوع تجربة».
3. **يوم عادي:** Today يعرض ممارسة اليوم (عنوان محايد) ← تسجيل بنقرة أو بكمية ← لا حساب عقابي.
4. **انقطاع ثم عودة:** بعد أسبوعين «أهلًا بعودتك، تحب تبدأ من الممارسة الأخف؟» ← لا تصفير ولا لوم.
5. **مراجعة أسبوعية خمس دقائق:** ملخص وصفي ← ثلاثة أسئلة ← «ما الذي أريد أخذه للأسبوع القادم؟» ← التزام اختياري.
6. **موسم خاص:** أنشئ «موسم» بتاريخ بداية ونهاية ← اختر الممارسات ← تُطبَّق تكراراته ثم تعود الأصلية تلقائيًا (PE-10).

---

## 5) نموذج البيانات الكامل

### 5.0 الحقول العامة والقواعد
- كل كيان رئيسي: `id UUID`, `user_id`, `created_at`, `updated_at`, `version int`, `deleted_at` (حذف ناعم)، `origin_device`.
- كل جدول فرعي يكرّر `user_id` وله FK مركّب `(parent_id, user_id)`؛ RLS على `user_id = auth.uid()`.
- **التواريخ:** `date` محلي يتبع **«يوم الممارسة»** (§6.1: اليوم ينتهي عند `day_cutoff_time` لا عند منتصف الليل)؛ `timestamptz` + `tz` للأحداث.
- **حقول مشفّرة** (`*_enc`) لكل نص حر: الوصف، الملاحظات، التأمل، الدرس، القلق…
- **المراجع الخارجية:** `{system, type, id}` + `display_snapshot` + `ref_state {Valid|Missing|NoAccess}` — بلا FK (CX-02). **لا تُخزَّن عناوين ممارسات أو قيم داخل مرجع خارجي.**
- **Privacy Tier (CX-16)** لكل كيان: `Sensitive` أو `Secret` (لا يوجد `Normal` في هذا القسم)؛ الافتراضي في كل جدول مذكور أدناه.
- المشتقات في `sp_derived_cache` فقط (§5.14).
- أسماء الجداول بالبادئة `sp_`.

### 5.1 الإعدادات
**`sp_settings`** (صف لكل مستخدم): `timezone`, `language`, `week_start`, `day_cutoff_time` (افتراضي 03:00، PD-01), `hijri_algorithm {umm_al_qura|tabular}` (PD-02), `use_missed_status` (افتراضي false، PD-04), `continuity_enabled` (false، PD-05), `continuity_grace_per_7` (1), `show_percentages` (false), `show_period_comparison` (false), `quiet_hours {from,to}`, `daily_notification_cap` (3), `notification_titles {Neutral|Names}` (Neutral، PD-08), `today_feed {Off|Neutral|Names}` (Neutral), `calendar_feed {Off|Neutral|Names}` (Off), `section_label` (اسم القسم الظاهر، PE-11)، `section_lock {None|AppLock|SeparatePin}` (AppLock), `hide_in_app_switcher` (true), `pause_all_until` (NULL), `outbound_events` (false، PD-15), `signals {nutrition: false}` (PD-06), `weekly_review {enabled, day, time}` (OFF), `monthly_review {enabled, day}` (OFF), `annual_review {enabled, month, day}` (OFF), `reentry_prompt_days` (14), `adaptive_reminders` (true), `integrations {habit, learning, relationships, core_goals}` (كلها false).

### 5.2 القيم
**`sp_values`** (Tier: Sensitive)
| الحقل | النوع | إلزامي | ملاحظة |
| :---- | :---- | :---- | :---- |
| name | text | نعم | `UNIQUE(user_id, lower(name))` بين النشطة |
| description_enc | bytea | لا | معنى القيمة عندك |
| tags | text[] | لا | وسوم حرة (يحل محل `category`، PC-01) |
| importance | enum | لا | `Low|Medium|High|Core` اختياري؛ **ترتيب لا درجة** |
| rank | int | لا | ترتيب السحب بين النشطة؛ لا يعني قيمة أخلاقية |
| active | bool | نعم | أرشفة لا حذف |
| meaning_source | text | لا | نص حر («أسرتي»، «قراءاتي»…) — **بلا قائمة** |
| notes_enc | bytea | لا | |
**لا يوجد** `score` ولا `weight` ولا أي مجموع (PC-07).

### 5.3 المبادئ
**`sp_principles`** (Tier: Sensitive): `id, user_id, title, statement_enc, related_value_id FK NULL, context_enc, examples_enc, drift_signals_enc, active` — حيث `drift_signals` نص **تكتبه لنفسك** («أعرف أنني بعيد عن هذا المبدأ حين…») ولا يُكتشف آليًا ولا يُحسب ولا يظهر إلا في صفحة المبدأ وفي مراجعتك إن اخترت (PC-06).
**`sp_practice_values`**: `practice_id, value_id` (M:N لرؤية الاتساق §6.12).

### 5.4 الممارسات
**`sp_practices`** (Tier: Sensitive)
| الحقل | ملاحظة |
| :---- | :---- |
| name | نص حر |
| type | **نص حر مع اقتراحات** (قراءة، تأمل، خدمة، دراسة، امتنان، ذكر، صلاة، صيام/امتناع، …) — لا enum (PC-01) |
| tags | text[] |
| kind | `Done` (أنجزتها) / `Abstain` (امتناع) / `Quantity` (كمية) / `Duration` (مدة) / `Count` (عدد مرات) |
| unit | نص (صفحة، دقيقة، مرة…) |
| target | رقم اختياري (الهدف في اليوم/الخانة) |
| minimum | رقم اختياري ≤ target (**الحد الأدنى**، PC-15) |
| slots | jsonb: `[{key, label, preferred_time}]` (خانة واحدة افتراضيًا؛ حتى 8) (PG-25) |
| slots_required | `All|AtLeast(n)` — ما يلزم ليُحسب اليوم «محافظًا عليه» |
| preferred_time | وقت التذكير للخانة الوحيدة (يُغني عن slots) |
| reminder | `{enabled, text_mode {Neutral|Name|Why}}` |
| why_enc | نيتك من الممارسة؛ يظهر في التذكير فقط إن اخترت `Why` |
| habit_ref | `{system:'habit', type:'habit', id}` + snapshot + state |
| log_mode | `Own|HabitLinked` (PC-04) |
| signal_kind | NULL أو نص مثل `fasting` (للإشارة المغلقة، PC-18) |
| active, archived_at | الأرشفة توقف التذكيرات وتبقي السجل |
| notes_enc | |
**`sp_practice_versions`** (إلحاق فقط): `practice_id, valid_from date, frequency_config jsonb, target, minimum, slots, note` — تغيير التكرار لا يعدّل التاريخ (PG-05).
**`frequency_config`** (حقل jsonb معتمد):
```text
{ "mode": "Daily" }
{ "mode": "Weekdays", "days": [0..6] }                 -- بحسب week_start
{ "mode": "TimesPerWeek", "n": 3 }                     -- مرن: أي أيام
{ "mode": "TimesPerMonth", "n": 4 }
{ "mode": "EveryNDays", "n": 3, "anchor": "YYYY-MM-DD" }
{ "mode": "MonthDay", "calendar": "gregorian|hijri", "days": [1..30], "day_offset": -1|0|1 }
{ "mode": "Dates", "dates": ["YYYY-MM-DD", ...] }
{ "mode": "Flexible" }                                  -- بلا موعد (متى شئت)
```

### 5.5 سجلات الممارسة
**`sp_practice_logs`** (Tier: Sensitive) — `log_mode=Own` فقط
| الحقل | ملاحظة |
| :---- | :---- |
| practice_id, date, slot_key | `UNIQUE(practice_id, date, slot_key)`؛ `slot_key='_'` للخانة الوحيدة |
| status | `Done|Partial|Excused` (+ `Missed` إن فُعّل `use_missed_status`) |
| actual | رقم اختياري (بوحدة الممارسة) |
| duration_min | اختياري |
| note_enc | ملاحظة قصيرة |
| private_reflection_enc | تأمل خاص قصير |
| completion_level | `Full|Minimum|Partial|None` — **مشتق** من actual (§6.3) ويُخزَّن cache |
| logged_at, source | `Manual|Quick|Import|Proposal` |
| client_op_id | idempotency |
> **غياب الصف = «غير مسجَّل» وليس `Missed`** (PC-02).
**`sp_linked_log_cache`** (للممارسات `HabitLinked` — قراءة فقط ويُعاد بناؤه): `practice_id, date, slot_key, habit_status, mapped_status, value, fetched_at`.
**`sp_practice_notes`**: ملاحظات خاصة لأيام الممارسات المرتبطة (لأن السجل عند Habit): `practice_id, date, note_enc, private_reflection_enc` — `UNIQUE(practice_id, date)`.

### 5.6 المواسم
**`sp_seasons`** (Tier: Sensitive): `id, user_id, name (باسمك أنت), start_date, end_date, status {Planned|Active|Ended|Cancelled}, note_enc, auto_revert bool`.
**`sp_season_practices`**: `season_id, practice_id, override_frequency_config jsonb, override_target, override_minimum, include bool` — **لا مواسم مبرمجة**؛ كل موسم من إنشائك.

### 5.7 الأهداف
**`sp_goals`** (Sensitive): `id, user_id, name, description_enc, type {Sum|Days|Milestones|Free}, unit, start_date, target_date, status {Active|Paused|Completed|Released}, target_value, core_goal_ref NULL, notes_enc`.
**`sp_goal_links`**: `goal_id, practice_id, weight=1` (الأهداف من نوع Sum/Days تقرأ سجلات الممارسات المربوطة).
**`sp_goal_milestones`**: `id, goal_id, title, due_date, done_at`.
**`sp_goal_adjustments`** (إلحاق فقط): `goal_id, at, delta, note_enc` — تصحيح يدوي شفاف (`current` لا يُحرَّر مباشرة، PC-14).

### 5.8 التأملات والامتنان
**`sp_reflections`** (Tier: **Secret**): `id, user_id, date, prompt_text, reflection_enc, gratitude_enc, lesson_enc, concern_enc, next_commitment_text_enc, tags text[], source_note_enc (مرجع قراءة حر: كتاب/صفحة/آية…), journal_ref NULL, commitment_id FK NULL, mood NULL (غير موجود: لا تقييم مزاج)، edited_at`. **لا سجل تعديلات** (خصوصية).
**`sp_gratitude_items`** (Secret): `id, user_id, date, text_enc, tags, resurfaced_at` — التقاط سريع (PE-05).
**`sp_reflection_prompts`**: `id, user_id, text, cadence {Daily|Weekly|Monthly|Annual|Any}, active, is_system` — **أسئلة محايدة افتراضية قابلة للتعديل** (§15.3).

### 5.9 الالتزامات
**`sp_commitments`** (Secret افتراضيًا): `id, user_id, title, description_enc, related_value_id NULL, related_principle_id NULL, practice_id NULL, start_date, review_date, cadence {None|Daily|Weekly|Custom}, cadence_config jsonb, status {Active|Paused|Completed|Released|Revised}, status_note_enc, revised_from_id NULL, notes_enc`.
**`sp_commitment_checkins`** (Secret): `commitment_id, date, state {Kept|Partly|Skipped|Note}, note_enc` — `UNIQUE(commitment_id, date)`. **لا حالة «Failed/Broken»** (PC-08).

### 5.10 التواريخ المهمة
**`sp_important_dates`** (Sensitive؛ `private=true` ⇒ Secret): `id, user_id, name, kind` (نص حر مع اقتراحات)، `calendar_system {gregorian|hijri}`, `month, day, year NULL`, `day_offset {-1,0,1}`, `recurrence {Once|Yearly|Monthly|Weekly}`, `weekday NULL`, `reminder_days smallint[]`, `private bool`, `show_in_calendar bool`, `notes_enc`, `archived_at`, `source {Manual|Import}`. **لا قائمة مبرمجة** (PC-10).

### 5.11 المراجعات
**`sp_reviews`** (Secret): `id, user_id, period {Weekly|Monthly|Annual|Custom}, period_start, period_end, status {Draft|Completed|Skipped}, template_id, completed_at, summary_snapshot jsonb (الأرقام الوصفية وقت الإكمال)`.
**`sp_review_sections`**: `review_id, key {values_reflection|practices_review|lessons|gratitude|commitments|notes|custom}, prompt_text, answer_enc, position`.
**`sp_review_templates`**: `id, user_id, period, sections jsonb, is_system` — القوالب الافتراضية محايدة وتعديلها حر. **لا جداول وثائق منفصلة** (PC-11).

### 5.12 إشارات وأعلام اليوم
**`sp_day_flags`**: `date, practice_id, flag {Intended|NotToday}` — إعلان المستخدم لنيته اليوم (يستعمل للإشارة المغلقة وللتذكيرات).
**`sp_signal_grants`**: `consumer {nutrition}, practice_id, enabled, granted_at` — موافقة صريحة لكل مستهلك وممارسة.

### 5.13 القوائم والقيود
| القائمة | القيم |
| :---- | :---- |
| status (log) | Done, Partial, Excused, (Missed اختياري) |
| completion_level | Full, Minimum, Partial, None |
| commitment status | Active, Paused, Completed, Released, Revised |
| goal status | Active, Paused, Completed, Released |
| review status | Draft, Completed, Skipped |
| season status | Planned, Active, Ended, Cancelled |
| recurrence | Once, Yearly, Monthly, Weekly |
**قيود وفهارس:** `UNIQUE(practice_id, date, slot_key)`؛ `UNIQUE(commitment_id, date)`؛ `sp_practices(user_id, active)`؛ `sp_practice_logs(user_id, date)`؛ `sp_important_dates(user_id, month, day)`؛ `sp_values(user_id, rank)` فريد بين النشطة (إعادة ترقيم تلقائية).

### 5.14 المشتقات والبنية التحتية
- **`sp_derived_cache`**: `entity, entity_id, period_key, payload jsonb, inputs_hash, computed_at` — الاتساق، التقدم، الاستمرارية، رؤية الاتساق؛ يُعاد بناؤه (PA-12).
- **`sp_inbound_proposals`**: `id, user_id, source_system, source_event_id UNIQUE, kind {LogPractice|SuggestPractice}, payload, status {Pending|Accepted|Dismissed}`.
- **`sp_outbox`** (أحداث `spiritual.{entity}.{verb}`، OFF افتراضيًا)، **`sp_client_ops`**، **`sp_audit_log`** (أحداث وصول: فتح/تصدير/محو — **بلا محتوى**)، **`sp_export_jobs`**، **`sp_import_jobs`**، **`sp_tombstones`**، **`sp_integration_state`**، **`sp_system_config`**، **`sp_automation_runs`**.

### 5.15 خريطة العلاقات
`values 1—N principles`, `values N—N practices (practice_values)`, `principles 1—N commitments`, `practices 1—N versions / logs / goal_links`, `seasons N—N practices`, `goals 1—N milestones / adjustments`, `commitments 1—N checkins`, `reflections 1—0..1 commitment`, `reviews 1—N sections`, `practices 0..1—1 habit_ref (soft)`.

---

## 6) محرّك الحساب (Calculation Engine)

> **قاعدة عامة:** كل المشتقات **وصفية** تُحسب من الحقول الرقمية والتواريخ فقط (لا من النصوص المشفّرة)، بدالة نقية وتُخزَّن في `sp_derived_cache` مع `inputs_hash`؛ نفس الحساب محليًا وعلى الخادم والخادم المرجع. **لا درجة، لا ترتيب بين أشخاص، لا ألوان عقابية**، ومعظم الأرقام مخفية افتراضيًا (`show_percentages=false`).

### 6.1 «يوم الممارسة» وحد النهاية
```text
practice_date(now) = local_date( now_local − day_cutoff_time )
مثال: day_cutoff=03:00 ، الآن 01:30 يوم 8 أكتوبر ⇒ practice_date = 7 أكتوبر
```
- ما يُسجَّل بعد منتصف الليل وقبل الحد يُحسب لليوم السابق (يناسب من ينام متأخرًا).
- **التواريخ المهمة والتذكيرات الزمنية** تستعمل التاريخ التقويمي العادي لا الحد.
- تغيير المنطقة الزمنية لا يغيّر `practice_date` للأيام الماضية؛ ويُعاد حساب اليوم الجاري فقط (PC-16).

### 6.2 الأيام المتوقَّعة (Expected)
لكل ممارسة وتاريخ `d` يُحدَّد النسخة السارية من `sp_practice_versions` (آخر `valid_from ≤ d`) ثم **الموسم** إن وُجد (§6.13):
| `mode` | اليوم متوقَّع إذا |
| :---- | :---- |
| Daily | دائمًا |
| Weekdays | `weekday(d) ∈ days` |
| EveryNDays | `(d − anchor) mod n = 0` |
| MonthDay | يوافق اليوم (ميلادي أو هجري + `day_offset`)؛ اليوم 30 في شهر 29 ⇒ آخر يوم |
| Dates | `d ∈ dates` |
| TimesPerWeek / TimesPerMonth | لا يوم محدَّد (§6.5) |
| Flexible | لا توقع إطلاقًا؛ لا اتساق يُحسب |
**تُستبعد** من المتوقَّع: أيام `Excused`، وأيام `pause_all_until`، وأيام ما قبل `created_at` للممارسة، وأيام الأرشفة.

### 6.3 مستوى الإنجاز (Completion Level)
```text
Full    : actual ≥ target             (إن وُجد target)  أو status = Done بلا actual
Minimum : minimum ≤ actual < target
Partial : 0 < actual < minimum        (أو status = Partial)
None    : لا سجل
```
| المثال: target=10 صفحة، minimum=2 | المستوى |
| :---- | :---- |
| actual = 12 | Full |
| 10 | Full |
| 4 | Minimum |
| 2 | Minimum |
| 1 | Partial |
| لا سجل | None (غير مسجَّل) |
- **Full وMinimum كلاهما يحتسب «يومًا محافظًا عليه»** (PC-15): فتح الحد الأدنى بابًا للاستمرار بدل «كل شيء أو لا شيء».
- المستخدم يستطيع كتابة الحالة يدويًا؛ تُقترح من `actual` فقط عند وجود target.
- **الخانات:** لليوم `slots_logged = عدد الخانات بمستوى ≥ Minimum`. اليوم «محافظ عليه» إذا `slots_logged ≥ required` (`All` أو `AtLeast(n)`)، و«جزئي» إذا `0 < slots_logged < required`.
  مثال: 5 خانات و`AtLeast(4)`: 4 مسجَّلة ⇒ محافظ عليه؛ 2 ⇒ جزئي.

### 6.4 الاتساق (Consistency) — وصفي
```text
maintained = أيام (Full|Minimum) في النافذة
denominator = الأيام المتوقَّعة − Excused − أيام الإيقاف
عرض افتراضي: "٤ من ٦ أيام"        (النسبة 66.7% فقط إن فُعّلت)
```
**مثال أسبوع (سبت–جمعة)، ممارسة يومية:** 4 أيام محافظ عليها + يوم جزئي + يوم Excused + يوم غير مسجَّل ⇒ المتوقَّع 7، المقام 6 ⇒ «٤ من ٦ أيام، وجزئي يوم».
- **اليوم غير المسجَّل لا يُسمّى «فائتًا» أبدًا**، ويظهر محايدًا «غير مسجَّل».
- لا حدود لونية ولا «جيد/ضعيف» (PT-09).

### 6.5 التكرار المرن (TimesPerWeek / TimesPerMonth)
```text
available_days = 7 − (أيام Excused/إيقاف داخل الأسبوع)
n_eff = max(1, round_half_up(n × available_days / 7))
remaining = max(0, n_eff − done_in_week)
```
مثال: `n=3`، يومان Excused ⇒ `3×5/7 = 2.14 ⇒ n_eff=2`؛ إن أُنجز يوم واحد ⇒ «تبقّى 1». للشهر نفس المنطق على أيام الشهر.

### 6.6 الاستمرارية (Continuity) — اختيارية ومحايدة
(`continuity_enabled=false` افتراضيًا؛ Habit يملك السلاسل الحقيقية CX-10.)
```text
امشِ للخلف من أمس (اليوم الحالي لا يُحتسب قبل نهايته):
  يوم Full|Minimum        ⇒ count += 1
  يوم Excused / غير متوقَّع / إيقاف ⇒ تجاوز بلا أثر
  يوم Partial أو غير مسجَّل ⇒ يستهلك "يوم سماح" إن وُجد (واحد لكل 7 أيام متوقَّعة) وإلا توقف
```
مثال (من الأحدث): Done, Done, Excused, Done, **غير مسجَّل**, Done, Done, Done ⇒ العدّ = 6 (واستُهلك يوم سماح واحد).
- **الصياغة:** «٦ أيام محافظ عليها في الفترة الأخيرة». عند التوقف: «بدأت فترة جديدة اليوم»، ويُعرض «آخر فترة: N يومًا» **بلا** «انقطاع» ولا «خسرت» ولا «أطول سلسلة» (مخفية افتراضيًا).
- لا يُرسَل أي عدّاد لأي قسم آخر.

### 6.7 تقدّم الأهداف (`current`)
```text
Sum       : current = Σ(actual × weight) لسجلات الممارسات المربوطة في [start, min(today, target_date)] + Σ adjustments
Days      : current = عدد الأيام (Full|Minimum) في النافذة
Milestones: current = المنجز / الكل
Free      : current = Σ adjustments فقط
progress = current / target_value   (يُعرض مقصوصًا عند 100% مع إبقاء الرقم الحقيقي)
```
**مثال (Sum):** الهدف 300 صفحة من 1/10 إلى 31/12/2026 (92 يومًا)، اليوم 7/10 (انقضى 7 أيام)، current = 120:
- التقدم = 120 / 300 = **40.0%**؛ المتبقي 180.
- الأيام المتبقية = 85 ⇒ الوتيرة اللازمة = 180 / 85 = **2.12 صفحة/يوم**.
- الوتيرة «المتوقَّعة خطيًا» حتى اليوم = 300 × 7 / 92 = **22.8** ⇒ الوصف: «متقدّم عن الوتيرة الخطية».
- لا وصف «متأخر»؛ بدلًا منه «متسع من الوقت: تحتاج 2.12 صفحة/يوم».
- `Released` تعني «قررت أن أترك هذا الهدف»، حالة كريمة لا فشل.

### 6.8 تقدّم الالتزام
```text
cadence = None   ⇒ لا نسبة؛ الحالة + "المتبقي حتى المراجعة: N يومًا"
cadence معرّفة  ⇒ expected = عدد مواعيد الـcheck-in بين start واليوم (حسب الإيقاع)
                   kept = Kept ؛ partly = Partly ؛ skipped = Skipped (لا تُسمّى "فشل")
عرض: "التزمت ٣ من ٥ مرات (وجزئيًا مرة)"
```
مثال: إيقاع أسبوعي يبدأ 1/10، اليوم 29/10 ⇒ المواعيد: 1، 8، 15، 22، 29 = 5؛ Kept=3، Partly=1، Skipped=1 ⇒ «٣ من ٥ (وجزئيًا مرة)».
عند بلوغ `review_date`: بطاقة «حان وقت المراجعة»: **أكمل / عدّل (Revised) / أطلق (Released) / مدّد**؛ لا قرار افتراضي.

### 6.9 التواريخ المهمة
```text
Yearly gregorian : أقرب (month/day) ≥ today؛ 29 فبراير ⇒ 28 فبراير في غير الكبيسة (PD-17)
Yearly hijri     : حوّل اليوم للهجري بالخوارزمية المختارة (PD-02)، أقرب (month/day هجري) ≥ اليوم،
                   إن لم يوجد اليوم 30 ⇒ آخر يوم في الشهر، ثم + day_offset (±1)، ثم حوّل لميلادي
Monthly (hijri|gregorian): اليوم المحدد من كل شهر؛ إن غاب ⇒ آخر يوم
Weekly           : أقرب weekday ≥ today
Once             : التاريخ إن لم يمضِ
days_until = next − today
```
مثال شهري هجري: «اليوم 15 من كل شهر قمري» ⇒ يُنتج تاريخًا لكل شهر بلا قائمة مبرمجة (المستخدم يضيف ما يريد). الهجري **تقريبي** يُعرض «≈» مع `day_offset` يدوي (CX-15).

### 6.10 التذكيرات (بلا ذنب)
```text
لكل ممارسة × خانة: fire_at = preferred_time في اليوم المتوقَّع
تُتخطّى إذا: سُجّلت الخانة اليوم | Excused | لا توقع | إيقاف | موسم لا يشملها | غير نشطة
dedupe_key = "prac:{practice_id}:{practice_date}:{slot}"
النص: Neutral (افتراضي) | Name | Why
ساعات الهدوء والسقف اليومي (3) ⇒ ما يفيض يُجمَّع في بطاقة واحدة داخل التطبيق
```
**التخفيف التكيّفي (PA-10):** بعد 3 تذكيرات متتالية بلا تسجيل ولا «لاحقًا» ⇒ اقتراح واحد «تحب نخفّف تذكير هذه الممارسة أو نغيّر وقتها؟» (لا إجراء تلقائي، لا يتكرر قبل 30 يومًا، ولا يزيد التذكيرات أبدًا).

### 6.11 ملخص المراجعة (وصفي)
```text
أسبوعيًا (مثال): ممارسات نشطة = 5
   متوقَّع = Σ(الأيام المتوقَّعة − Excused) = 7+7+3+7+7 = 31 ⇒ محافظ عليه = 24  ⇒ "٢٤ من ٣١ يوم-ممارسة"
   امتنانات = 3 ، تأملات = 2 ، التزامات قيد التنفيذ = 1 ، أهداف نشطة = 2 (مع تقدم §6.7)
المقارنة بالفترة السابقة: مخفية افتراضيًا (show_period_comparison)
```
- تُخزَّن لقطة الأرقام وقت الإكمال في `summary_snapshot` فلا تتغير لاحقًا.
- لا «تقييم أسبوع»، ولا كلمات «أفضل/أسوأ».

### 6.12 رؤية الاتساق بين القيم والفعل (Alignment) — وصفية
لكل قيمة: عدد المبادئ، الممارسات المربوطة، الالتزامات النشطة، وآخر تاريخ نشاط (أحدث سجل لممارسة مربوطة). عرض معلوماتي: «لم تربط ممارسة بهذه القيمة بعد» **اقتراح لا اتهام**، قابل للإخفاء، ولا يظهر في المراجعة الافتراضية.

### 6.13 المواسم
```text
effective_config(practice, d) =
   إن وُجد موسم Active يشمل d وinclude=true  ⇒ override_* (وإلا إعداد الممارسة)
   إن include=false                          ⇒ الممارسة غير متوقَّعة طوال الموسم
بعد end_date ⇒ تعود تلقائيًا للإعداد الأصلي (auto_revert=true)
```
لا يجوز تداخل موسمين نشطين (`PV`)، والموسم لا يغيّر `sp_practice_versions` ولا التاريخ.

### 6.14 الممارسات المرتبطة بـHabit (`HabitLinked`)
القراءة عبر `GET /habit/habits/{id}/logs?from&to` **(افتراض — يؤكده Habit؛ طلب تغيير)** وتُخزَّن في `sp_linked_log_cache`.
| حالة Habit (افتراض) | الحالة هنا |
| :---- | :---- |
| مكتملة | Done (Full) |
| جزئية بقيمة | Partial/Minimum حسب القيمة |
| متخطاة عمدًا | Excused |
| لا سجل | غير مسجَّل |
- لا يُنشأ `sp_practice_logs` لممارسة مرتبطة؛ الملاحظات الخاصة في `sp_practice_notes`.
- **الكتابة العكسية** (من هنا إلى Habit) غير مدعومة: التسجيل من Habit أو من Today الخاص به.
- تذكيرات الممارسة المرتبطة يملكها Habit (PC-22) إلا إن أوقفها المستخدم هناك.

### 6.15 الإشارة المغلقة للأقسام الأخرى (Signals)
```text
signal(practice, d) = true إذا (
    signal_kind ≠ NULL  و  sp_signal_grants(consumer, practice).enabled
    و ( d متوقَّع للممارسة  أو  يوجد sp_day_flags(d, practice) = Intended ) و لا يوجد NotToday )
```
تُعاد قيمة منطقية واحدة بلا اسم ولا تفاصيل: `GET /spiritual/signals/today?kind=fasting` ⇒ `{"active": true}`. مغلقة افتراضيًا (PD-06).

### 6.16 إعادة عرض الامتنان
مرة أسبوعيًا (قابلة للإيقاف): اختر عشوائيًا عنصر امتنان أقدم من 30 يومًا ولم يُعرض في آخر 60 يومًا؛ يُعرض داخل التطبيق فقط (لا إشعار).

### 6.17 بطاقة العودة (Re-entry)
إن لم تُسجَّل ممارسة ولم يُفتح القسم لمدة `reentry_prompt_days` (14) ⇒ بطاقة واحدة «أهلًا بعودتك. تحب نبدأ بالأخف؟» تعرض الممارسة ذات أصغر `minimum`؛ لا تتكرر قبل 30 يومًا، ولا تُرسَل كإشعار.

---

## 7) سجل التعارضات (PC) وحلولها

### 7.1 تعارضات داخلية في المصدر
| ID | التعارض | الحل المعتمد | أين |
| :---- | :---- | :---- | :---- |
| PC-01 | «لا تصنيف معتقد» مع أمثلة تبدأ بـ`Prayer`؛ `category` و`type` قائمتان | `type` و`category` **نص حر + اقتراحات + وسوم**؛ لا enum ولا قوائم دينية؛ القوالب الافتراضية عامة | §5.4 |
| PC-02 | `Missed` مع «ممنوع guilt automation» | الغياب = «غير مسجَّل»؛ `Missed` **اختيارية ومعطّلة** ولا تُنشأ تلقائيًا؛ `Excused` بلا سبب مطلوب | §5.5 |
| PC-03 | streak اختياري مقابل «لا moral scoring» ومقابل Habit مالك السلاسل | **استمرارية محايدة** اختيارية (يوم سماح، تجاوز Excused)، بلا «انقطاع» ولا «أطول سلسلة»، ولا تصدَّر | §6.6 |
| PC-04 | Practice Logs مقابل Habit Logs («استخدم relation») | `log_mode`: `Own` (هنا) أو `HabitLinked` (Habit مالك السجل، نخزّن Cache وملاحظات خاصة) | §5.5، §6.14 |
| PC-05 | Reflections مقابل Journal (CX-09) | التأمل يبقى هنا **خاصًا ومشفّرًا**؛ `journal_ref` اختياري لا نسخ؛ لا بحث عام | §5.8 |
| PC-06 | `violation_signals` توحي بالذنب | يُعاد تسميته `drift_signals` نصًا يكتبه المستخدم لنفسه، **لا اكتشاف آلي ولا عدّ** | §5.3 |
| PC-07 | `importance` و`rank` و«لا score» | `rank` ترتيب سحب فقط، `importance` اختيارية، **لا مجموع ولا وزن** | §5.2 |
| PC-08 | الالتزام بلا حالة تحفظ الكرامة | `Active/Paused/Completed/Released/Revised` + Check-ins `Kept/Partly/Skipped/Note`؛ لا «فشل» | §5.9 |
| PC-09 | Spiritual Goals مقابل Global Goals | أهدافه هنا للقياس الروحي/القيمي؛ `core_goal_ref` اختياري؛ لا نسخ ولا مزامنة | §5.7 |
| PC-10 | القائمة الدينية «ليست hardcoded» دون تحديد التكرار الهجري/الشهري | `calendar_system` + `recurrence Once/Yearly/Monthly/Weekly` + استيراد المستخدم؛ لا قائمة مبرمجة | §5.10، §6.9 |
| PC-11 | Review «document/entity» | **كيان + أقسام + قوالب**؛ لا DB وثائق ثانية | §5.11 |
| PC-12 | «Private by default» مع Today/Calendar/إشعارات | Feeds مغلقة أو **محايدة** افتراضيًا؛ الأسماء بإذن صريح | §11.6 |
| PC-13 | «لا Admin بدون صلاحية» | لا وصول إداري/دعم لمحتوى القسم إطلاقًا؛ سجل التدقيق بلا محتوى | §14 |
| PC-14 | `current` مشتق لكن الهدف الحر بلا مصدر | الأنواع Sum/Days/Milestones/Free؛ التصحيح عبر `sp_goal_adjustments` إلحاقًا | §5.7، §6.7 |
| PC-15 | `target` و`minimum` بلا دلالة | `minimum` يُحتسب «محافظًا» (Full أو Minimum) | §6.3 |
| PC-16 | «توقيت المستخدم» مقابل من ينام بعد منتصف الليل | `day_cutoff_time` (03:00) للممارسات فقط | §6.1 |
| PC-17 | ممارسة مرتبطة بمواقيت فلكية (شروق/غروب…) | **لا حساب مواقيت في v4.0**؛ أوقات يدوية أو استيراد ICS من مصدر يختاره المستخدم (**غير مؤكد — يُتحقق قبل البناء**) | PD-03 |
| PC-18 | Nutrition تحتاج «يوم صيام» (ND-15) والمصدر صامت | إشارة منطقية واحدة بموافقة لكل ممارسة ومستهلك، مغلقة افتراضيًا؛ Nutrition لا تعرف أي قيمة دينية | §6.15 |
| PC-19 | Relationships (صلة الأرحام) | Relationships تنشر أعدادًا مجمَّعة فقط؛ يُعرضها هنا اختياريًا في المراجعة؛ لا أسماء | §11.5 |
| PC-20 | العطاء المالي/الصدقة مع Finance | **لا ربط مالي في v4.0**: ممارسة العطاء تُسجَّل بوحدات غير مالية؛ المال يبقى في Finance ولا ينتقل إليه شيء من هنا | §11.3 |
| PC-21 | Learning (دراسة) مقابل ممارسة «دراسة» | `learning_ref` اختياري؛ أحداث Learning تصير **اقتراح تسجيل** لا تسجيلًا تلقائيًا | §11.5 |
| PC-22 | تذكيران لنفس الفعل (Habit + هنا) | للمرتبطة: Habit يذكّر وهنا يُوقف تلقائيًا | §6.14 |
| PC-23 | أحداث صادرة قد تسرّب المعتقد | OFF افتراضيًا؛ معرّفات وأعداد فقط؛ لا أسماء ممارسات | §11.8 |
| PC-24 | البحث العام مع الخصوصية | لا فهرسة في Core Search إطلاقًا؛ بحث محلي مشفّر داخل القسم | §11.7 |
| PC-25 | التصدير مع الخصوصية | تصدير مشفّر بكلمة مرور المستخدم وبإعادة مصادقة؛ يشمل كل شيء (بياناتك) | §14.5 |
| PC-26 | «Archive stops reminders» مقابل حفظ التاريخ | الأرشفة توقف التذكيرات والتوقعات وتُبقي السجل والبحث | §9.1 |
| PC-27 | «علاقات FK حقيقية» مقابل «لا تكرر كيانًا» | داخل القسم FK مركّب؛ عبر الأقسام `*_ref` ناعم (CX-02) | §3.3 |
| PC-28 | وجود قالب ديني جاهز في Notion قد يُفهم تعريفًا بمعتقدك | لا افتراض؛ النظام محايد؛ الاستيراد اختياري بقالب تعيين | §15.2 |
| PC-29 | مراجعة وصفية قد تتحول إلى حكم | أرقام وصفية بلا مقارنة افتراضية، بلا ألوان، بلا «أفضل/أسوأ» | §6.11 |
| PC-30 | صياغة التذكير والإشعار قد تلوم | قواعد صياغة ملزمة + فحص CI | §10.6 |
| PC-31 | الامتناع («أقلّل من…») مقابل Habit (relapse) | الامتناع الذي يحتاج تتبع انتكاس يبقى في Habit؛ هنا ممارسة `Abstain` تُسجَّل كـDone/Partial فقط أو تُربط `habit_ref` | §5.4 |
| PC-32 | ممارسة بخمس خانات يوميًا مقابل سجل واحد لليوم | `slots` و`slot_key` ومعيار `slots_required` | §5.4، §6.3 |
| PC-33 | تغيير التكرار يُفسد التاريخ | `sp_practice_versions` إلحاق فقط | §5.4 |
| PC-34 | التكرار الهجري الشهري غير موجود في المصدر (Yearly/Once) | `Monthly` و`MonthDay` | §6.2، §6.9 |
| PC-35 | التشفير مقابل الحسابات المشتقة | المشتقات من الحقول **الرقمية/التواريخ** فقط؛ النصوص مشفّرة ولا تُقرأ من الخادم لأي حساب | §14.2 |

---

## 8) الفجوات المسدودة (PG) والتحسينات المضافة (PE)

### 8.1 الفجوات (PG)
| ID | الفجوة في المصدر | الإضافة | أين |
| :---- | :---- | :---- | :---- |
| PG-01 | لا تعريف للبداية بلا أسئلة معتقد | إعداد أول بلا أي سؤال ديني؛ كل شيء «ابدأ فارغًا» أو بقالب عام | §15.3 |
| PG-02 | لا قوالب بداية | قوالب **عامة** (قراءة، تأمل، امتنان، خدمة، دراسة) قابلة للتعديل والإخفاء؛ لا قوالب دينية مبرمجة | §15.3 |
| PG-03 | لا قفل للقسم | `section_lock` + إخفاء من مبدّل التطبيقات + قفل تلقائي | §14.2 |
| PG-04 | لا إيقاف عند السفر/المرض/الظروف | `pause_all_until` يوقف التوقعات والتذكيرات بلا أثر على التاريخ | §6.2 |
| PG-05 | تغيير تكرار الممارسة يغيّر الماضي | `sp_practice_versions` | §5.4 |
| PG-06 | يوم الممارسة ينتهي عند منتصف الليل | `day_cutoff_time` | §6.1 |
| PG-07 | الأوقات المرتبطة بالفلك | لا حساب؛ أوقات يدوية أو ICS يختاره المستخدم | PC-17 |
| PG-08 | لا بنك أسئلة تأمل | أسئلة محايدة قابلة للتعديل ودورانها | §5.8 |
| PG-09 | نسخ احتياطي واستعادة | تصدير مشفّر + استعادة بإعادة مصادقة | §14.5 |
| PG-10 | لا «مسح كامل» | Wipe بإعادة مصادقة وكتابة تأكيد، تراجع 14 يومًا | §14.5 |
| PG-11 | التذكيرات المتزايدة تتحول إلى ضغط | تخفيف تكيّفي يقترح ولا يزيد | §6.10 |
| PG-12 | لا ربط بين الممارسات والقيم | `sp_practice_values` + رؤية وصفية | §6.12 |
| PG-13 | أرشفة/استعادة لكل الكيانات | `active/archived_at` والاستعادة بكل التاريخ | §9.1 |
| PG-14 | تعارض الأوفلاين | جدول دمج | §13.4 |
| PG-15 | حدود النظام | 200 قيمة، 500 ممارسة، 8 خانات، 20k حرف/حقل… | §14.2 |
| PG-16 | إتاحة الوصول | RTL، قارئ شاشة، تباين، بلا اعتماد على اللون | §10.5 |
| PG-17 | جهاز مشترك | قفل تلقائي، إخفاء المعاينات، لا ويدجت افتراضيًا | §14.2 |
| PG-18 | قد تتسرب بيانات المعتقد إلى الهوية | لا حقول معتقد في الملف الشخصي أو الأحداث أو Core | §14 |
| PG-19 | إشارة الصيام/الامتناع لـNutrition | إشارة منطقية مغلقة بموافقة | §6.15 |
| PG-20 | مراجعة بلا قوالب | قوالب مراجعة محايدة وقابلة للتعديل | §5.11 |
| PG-21 | تذكيرات المحلية أوفلاين | جدولة محلية بـdedupe | §13.2 |
| PG-22 | لا تراجع (Undo) | حذف ناعم 14 يومًا + Undo فوري للتسجيل | §9.1 |
| PG-23 | ترتيب القيم بالسحب | إعادة ترقيم تلقائية بلا فجوات | PV-02 |
| PG-24 | مكتبة محتوى ديني/فلسفي (آيات، أحاديث، أذكار…) | **خارج النطاق عمدًا**؛ المحتوى المرجعي يذهب إلى Knowledge/Learning إن أردت؛ هذا القسم لا يستضيف ولا يتحقق من أي نصوص | §1.2 |
| PG-25 | ممارسة متعددة المرات يوميًا (نمط Salah Tracker) | `slots` + `slot_key` + معيار `slots_required` | §5.4، §6.3 |

### 8.2 التحسينات (PE)
| ID | التحسين | القيمة |
| :---- | :---- | :---- |
| PE-01 | **رؤية الاتساق** بين القيم والمبادئ والممارسات (وصفية قابلة للإخفاء) | ترى أين تتحول القيمة إلى فعل |
| PE-02 | **الحد الأدنى المحافظ**: النسخة الصغيرة تُحتسب يومًا محافظًا عليه | الاستمرار بدل الكمال |
| PE-03 | **عودة بلا لوم** (Re-entry) | لا تصفير ولا «انقطعت» |
| PE-04 | تدوير أسئلة التأمل | تنوّع بلا جهد |
| PE-05 | **التقاط امتنان سريع** وإعادة عرضه أسبوعيًا | لحظة لطيفة داخل التطبيق فقط |
| PE-06 | **وضع الصمت** لهذا القسم بنقرة (بلا إشعارات ولا Feed) | احترام الحدود |
| PE-07 | ملاحظة خاصة قصيرة لكل ممارسة/يوم (مشفّرة) | تتبع المعنى لا الأرقام |
| PE-08 | **مراجعة سنوية «سنتي بكلماتي»**: نص حر + لقطة أرقام اختيارية | تأمل طويل المدى |
| PE-09 | لا ويدجت ولا شارات على الأيقونة افتراضيًا | خصوصية |
| PE-10 | **المواسم** (فترة مؤقتة بمجموعة ممارسات خاصة) | تعبّر عن أي فترة خاصة بلا قوالب مبرمجة |
| PE-11 | **اسم قسم مخصص** (تمويه اختياري، مثل «تأمل» أو «يومياتي») | خصوصية على الشاشة المشتركة |
| PE-12 | عرض «لماذا» الذي كتبته عند التذكير (اختياري) | تذكّر النية |
| PE-13 | **بلا ألعاب**: لا نقاط، لا شارات، لا ترتيب، لا مشاركة نتائج | كرامة وخصوصية |
| PE-14 | **وضع هادئ بلا أرقام** (Calm): يخفي كل العدّادات والنسب | واجهة تأمل لا إحصاء |
| PE-15 | إعلان نية اليوم («سأمارس اليوم») اختياري | يغذي التذكير والإشارة المغلقة |

---

## 9) دورات الحياة (Lifecycles) وقواعد التحقق

### 9.1 دورات الحياة
| الكيان | الحالات | ملاحظات |
| :---- | :---- | :---- |
| القيمة/المبدأ | `Active ⇄ Archived` | الأرشفة لا تحذف الروابط؛ الاستعادة بكل التاريخ |
| الممارسة | `Active ⇄ Archived` + إيقاف عام عبر `pause_all_until` | الأرشفة توقف التذكيرات والتوقعات (PT-07) وتبقي السجل والبحث |
| السجل | إنشاء/تعديل/حذف ناعم | Undo فوري ثم حذف ناعم 14 يومًا |
| الموسم | `Planned → Active → Ended` أو `Cancelled` | يتحول تلقائيًا بالتواريخ |
| الهدف | `Active ⇄ Paused → Completed | Released` | `Released` = تركته بقراري |
| الالتزام | `Active ⇄ Paused → Completed | Released | Revised` | `Revised` ينشئ نسخة جديدة (`revised_from_id`) ويغلق القديمة |
| التاريخ المهم | `Active ⇄ Archived`؛ `Once` ينتهي `Past` | |
| المراجعة | `Draft → Completed | Skipped` | `Skipped` حالة محايدة، لا تُذكَّر بها |
| الاقتراح الوارد | `Pending → Accepted | Dismissed` | التجاهل يُحفظ فلا يتكرر |
| الإيقاف العام | `NULL ⇄ تاريخ` | ينتهي تلقائيًا، «أهلًا بعودتك» |

### 9.2 قواعد التحقق (PV)
| ID | القاعدة | الرد |
| :---- | :---- | :---- |
| PV-01 | اسم القيمة غير فارغ ≤120 وفريد بين النشطة | 422/409 |
| PV-02 | `rank` ≥1 فريد بين النشطة؛ إعادة ترقيم تلقائية | تلقائي |
| PV-03 | عنوان المبدأ مطلوب ≤200 | 422 |
| PV-04 | اسم الممارسة مطلوب ≤120 | 422 |
| PV-05 | `minimum ≤ target` وكلاهما >0 | 422 |
| PV-06 | الخانات ≤8، المفاتيح فريدة، التسمية غير فارغة | 422 |
| PV-07 | `frequency_config` يطابق المخطط؛ `n` بين 1 و31 | 422 |
| PV-08 | `preferred_time` بصيغة HH:MM صالحة | 422 |
| PV-09 | `habit_ref` يستلزم `log_mode=HabitLinked` والعكس | 422 |
| PV-10 | السجل لا بعد `practice_date` الحالي؛ الإدخال الرجعي حتى 365 يومًا | 422 |
| PV-11 | سجل واحد لكل `(practice, date, slot)` (Upsert) | — |
| PV-12 | `actual` ≥0 ≤1,000,000 كنص عشري | 422 |
| PV-13 | `Missed` مسموحة فقط عند `use_missed_status=true` | 422 |
| PV-14 | لا سجل Own لممارسة `HabitLinked` | 409 |
| PV-15 | الموسم: `start ≤ end` ولا تداخل مع موسم نشط آخر | 422/409 |
| PV-16 | تجاوز الموسم: `minimum ≤ target` | 422 |
| PV-17 | الهدف: `target_value>0` لـSum/Days؛ `target_date ≥ start_date` | 422 |
| PV-18 | ربط الممارسات بالهدف لنوعي Sum/Days فقط | 422 |
| PV-19 | عنوان المعلَم مطلوب | 422 |
| PV-20 | الالتزام: العنوان مطلوب؛ `review_date ≥ start_date`؛ الإيقاع صالح | 422 |
| PV-21 | Check-in واحد لكل تاريخ والحالة من القائمة | 409/422 |
| PV-22 | التاريخ المهم: الشهر/اليوم صالحان؛ الهجري 1..30؛ `day_offset ∈ {-1,0,1}` | 422 |
| PV-23 | `reminder_days` 0..60 وبحد أقصى 6 | 422 |
| PV-24 | التكرار `Weekly` يستلزم `weekday` | 422 |
| PV-25 | مراجعة واحدة لكل `(period, period_start)`؛ كل قسم ≤20,000 حرف | 409/422 |
| PV-26 | حقول التأمل ≤20,000 حرف | 422 |
| PV-27 | نص السؤال ≤300 | 422 |
| PV-28 | منح الإشارة يستلزم `practice.signal_kind` | 422 |
| PV-29 | `pause_all_until` ≤ 365 يومًا من اليوم | 422 |
| PV-30 | `If-Match: version` على كل تعديل | 409 VERSION_CONFLICT |
| PV-31 | حدود: 200 قيمة، 500 ممارسة، 8 خانات، 200 سجل/يوم | 422 |
| PV-32 | المحو/Wipe بإعادة مصادقة وكتابة التأكيد | 403 |
| PV-33 | كلمة مرور التصدير ≥10 أحرف | 422 |
| PV-34 | تفعيل `Names` في الإشعارات/الفيد يتطلب فتح القفل وتأكيدًا | 403 |

---

## 10) تجربة المستخدم والشاشات

### 10.1 خريطة الشاشات
| الشاشة | الغرض | ملاحظة |
| :---- | :---- | :---- |
| Home | يوم هادئ: ممارسات اليوم، مناسبات قريبة، سؤال تأمل | بلا أرقام افتراضيًا (Calm) |
| Values | قيمك وترتيبها | سحب لإعادة الترتيب |
| Principles | المبادئ المرتبطة بالقيم | |
| Practices | التعريفات، الخانات، التكرار، الإصدارات | |
| Daily Log | تسجيل سريع ليوم/خانات | نقرة أو كمية |
| Reflections | تأملات وامتنان وأسئلة | خاصة |
| Goals | الأهداف وتقدمها الوصفي | |
| Commitments | الالتزامات وCheck-ins | |
| Important Dates | تواريخك المهمة (ميلادي/هجري/شهري) | |
| Reviews | مراجعات أسبوعية/شهرية/سنوية | |
| Seasons | المواسم المؤقتة | |
| Alignment | رؤية الاتساق (اختيارية) | |
| Settings | الخصوصية، الصياغة، التذكيرات، التكاملات | |
| Lock | شاشة القفل الخاصة بالقسم | |

### 10.2 Home
بطاقات اختيارية بالترتيب (تُخفى الفارغة):
1. **اليوم:** ممارسات اليوم بعناوينها (حسب `notification_titles`) وخاناتها؛ نقرة واحدة = Done، ضغط مطوّل = كمية/Partial/Excused/ملاحظة.
2. **سؤال تأمل واحد** من بنكك (تخطَّ بلا أثر).
3. **قريبًا:** تواريخ مهمة خلال 7 أيام (الأسماء بحسب الإعداد).
4. **التزام يحتاج مراجعة** (إن حان).
5. **بطاقة العودة** (إن لزم، §6.17).
- **حالات الشاشة:** Loading (هيكل)، Empty («ابدأ بما تحب: قيمة، ممارسة، أو اترك فارغًا»)، Error، Offline/Syncing.
- **Calm Mode** (افتراضي): لا عدّادات ولا نسب؛ تُفعَّل الأرقام من الإعدادات.
- **Silent Mode:** نقرة واحدة تعطّل التذكيرات وFeed والبطاقات (PE-06).

### 10.3 الشاشات بالتفصيل
**Values:** بطاقات بالاسم والوصف؛ سحب للترتيب؛ ربط مبادئ/ممارسات؛ لا شريط تقدم ولا لون «اكتمال».
**Principles:** القاعدة، السياق، أمثلة، «إشارات الانحراف» (حقل خاص بك، يظهر فقط هنا).
**Practices:** إنشاء من قالب عام أو فارغ: الاسم، النوع (نص حر)، الوحدة، الهدف، الحد الأدنى، الخانات، التكرار، وقت التذكير، «لماذا»، الربط بـHabit، الإشارة المغلقة؛ سجل الإصدارات؛ أرشفة.
**Daily Log:** عرض يومي بتنقل بين الأيام؛ حقول: الحالة، الكمية، المدة، ملاحظة، تأمل خاص؛ أزرار سريعة «الحد الأدنى»/«الهدف». **لا زر «فاتني»**.
**Reflections:** كتابة بحقول اختيارية (تأمل، امتنان، درس، قلق، التزام قادم)؛ «مرجع القراءة» حر؛ ربط `journal_ref`؛ بحث محلي.
**Goals:** نوع، تواريخ، الهدف الرقمي، الممارسات المربوطة، شريط وصفي (اختياري)، التصحيح اليدوي الشفاف، المعالم.
**Commitments:** عنوان، قيمة/مبدأ، إيقاع، تاريخ مراجعة، Check-in بنقرة (التزمت/جزئيًا/تخطيت/ملاحظة).
**Important Dates:** الاسم، النوع (حر)، ميلادي/هجري، التكرار (مرة/سنوي/شهري/أسبوعي)، `day_offset`، التذكيرات، الخصوصية، استيراد ICS/CSV.
**Reviews:** اختيار الفترة ← ملخص وصفي (§6.11) ← أسئلة القالب ← حفظ؛ **Skip** بلا تعليق.
**Seasons:** اسم، تواريخ، الممارسات المشمولة وتجاوزاتها، العودة التلقائية.
**Alignment:** لكل قيمة: مبادئ/ممارسات/التزامات وآخر نشاط؛ قابل للإخفاء كليًا.
**Settings:** القفل، الأسماء في الإشعارات/Today/Calendar، حد اليوم، الهجري، ساعات الهدوء، السقف، `Missed`، الاستمرارية، المقارنة، الإيقاف العام، المراجعات، التكاملات (مع شرح ما يُرسَل/يُقرأ)، التصدير/المحو.

### 10.4 الموبايل والسرعة
- تسجيل بنقرتين من Today/ويدجت (معطّل افتراضيًا).
- تعمل كل الشاشات من الكاش المحلي؛ فتح Home أقل من 200ms.
- لمسات: تمرير لتسجيل `Done`، ضغط مطوّل للكمية.
- القفل البيومتري عند الدخول وبعد الخمول.

### 10.5 الوصول واللغة
RTL كامل، قارئ شاشة، تباين WCAG AA، لا اعتماد على اللون وحده، أحجام خط قابلة للتكبير، وتقويم هجري/ميلادي بحسب الإعداد.

### 10.6 قواعد الصياغة (ملزمة)
| بدل | قل |
| :---- | :---- |
| «فاتتك ممارسة اليوم» | «لم تُسجَّل بعد — تسجّلها الآن أم لاحقًا؟» |
| «انقطعت سلسلتك» | «بدأت فترة جديدة اليوم» |
| «أنت متأخر عن هدفك» | «متسع من الوقت: تحتاج 2.12 صفحة/يوم» |
| «فشل الالتزام» | «تحب تعدّله أم تطلقه أم تمدّده؟» |
| «ذنب/خطيئة/تقصير» | (غير مسموح) |
| «٣٠٪ فقط» | «٣ من ١٠ أيام» (أو لا رقم في Calm) |
- لا مقارنة بين فترتين أو شخصين افتراضيًا؛ لا ألوان حمراء عقابية؛ لا شارات؛ لا مواعظ ولا اقتباسات تلقائية.
- النظام لا يشرح أحكامًا دينية ولا يفتي ولا يصحّح معتقدًا.
- فحص CI للنصوص المحظورة (PT-60).
- الإشعار الافتراضي: «تذكيرك الهادئ» دون اسم.

---

## 11) التكاملات وعقود API

### 11.1 المبادئ
- كل تكامل **اختياري ومغلق افتراضيًا** (`integrations.*=false`) ويُفعَّل من الإعدادات بعرض «ما يُرسَل/يُقرأ بالضبط».
- **لا شيء صادر افتراضيًا** (`outbound_events=false`)؛ الأحداث `{system}.{entity}.{verb}` بالـoutbox مرة-على-الأقل، بمعرّفات وأعداد فقط (CX-17).
- مراجع الأقسام الأخرى `*_ref` ناعمة بحالة Valid/Missing/NoAccess.

### 11.2 Habit واليوميات
| العنصر | العقد |
| :---- | :---- |
| `habit_ref` | الممارسة تشير إلى عادة؛ `log_mode=HabitLinked` |
| قراءة السجلات | `GET /habit/habits/{id}/logs?from&to` **(افتراض — يؤكده Habit؛ طلب تغيير)** + حدث `habit.log.changed` لإعادة البناء |
| قائمة العادات للربط | `GET /habit/habits?q=` (Picker) |
| اليوميات (CX-09) | `journal_ref` إلى إدخال يوميات Habit؛ **لا نسخ محتوى** والتأمل هنا يبقى خاصًا |
| السلاسل | ملك Habit؛ هنا استمرارية محايدة محليّة اختيارية فقط (§6.6) |
- الكتابة العكسية إلى Habit غير مدعومة.

### 11.3 Finance (غير مدعوم في v4.0)
لا ربط مالي (PC-20). العطاء/الصدقة كممارسة تُسجَّل بوحدات غير مالية؛ أي مبالغ تُسجَّل في Finance وحده ولا يعلم Finance بأي صلة روحية. **لا `source_type` جديد مطلوب.**

### 11.4 Nutrition (إشارة مغلقة)
- `GET /spiritual/signals/today?kind=fasting` ⇒ `{"active": true|false}`؛ ويُقدَّم أيضًا كاسم متوافق مع Nutrition: `GET /spiritual/fasting/today`.
- مفعّل فقط إن: `signals.nutrition=true` **و**`sp_signal_grants` للممارسة **و**`signal_kind` معرَّف. لا اسم ولا تفاصيل.
- Nutrition ND-15 مؤجَّل لـv4.1؛ هذا العقد جاهز عند تفعيله.

### 11.5 Learning وRelationships وCore Goals
| القسم | العقد |
| :---- | :---- |
| Learning | `learning_ref` للممارسات من نوع دراسة؛ `learning.session.completed` ⇒ **اقتراح تسجيل** (`sp_inbound_proposals`) لا تسجيل تلقائي |
| Relationships | `GET /relationships/summary?circle_type=Family&days=30` **أعداد فقط** تُعرض اختياريًا في المراجعة (PC-19) |
| Core Goals | `core_goal_ref` اختياري على الهدف؛ لا مزامنة ولا نسخ |

### 11.6 Today وCalendar والإشعارات
- **`GET /spiritual/feed/today`** (حد أقصى 5): ممارسات اليوم ثم تواريخ اليوم؛ العناوين `Neutral` («تذكيرك الهادئ») أو `Names` بتفعيل صريح؛ **مغلق (`Off`) إن كان Silent**.
- **`GET /spiritual/feed/calendar?from&to`**: تواريخ `show_in_calendar=true` فقط؛ `Off` افتراضيًا؛ `Neutral` («مناسبة») أو `Names`؛ ICS برمز سري قابل للإلغاء.
- **إشعارات (عبر Core):** ساعات هدوء، سقف يومي (3)، Digest، شاشة قفل محايدة، تُجدول محليًا (§13.2).

### 11.7 Core Files والبحث
- المرفقات (صورة/ملف في تأمل) عبر `file_ref` بحساسية `Secret`.
- **لا فهرسة في Core Search ولا في أي بحث عام**؛ بحث محلي داخل القسم على بيانات مفكوكة على الجهاز فقط (PC-24).

### 11.8 الأحداث
**صادرة (OFF افتراضيًا؛ معرّفات/أعداد فقط):** `spiritual.review.completed {period}`, `spiritual.practice.logged {count_today}` (بلا هوية الممارسة), `spiritual.commitment.reviewed`.
**لا تُرسَل أبدًا:** أسماء القيم/الممارسات/المبادئ، نص التأمل، الحالات.
**واردة:** `habit.log.changed`، `learning.session.completed`.

### 11.9 واجهة API (REST)
**اتفاقيات:** جلسة المستخدم؛ `Idempotency-Key` على POST/PUT؛ `If-Match: version`؛ أرقام نصية؛ Cursor؛ أخطاء `{code, message_ar, details}`؛ **لا تُعاد حقول `*_enc` بنص صريح إلا بعد فتح القفل (`X-Unlock-Token`)**.
| المجموعة | المسارات | أخطاء |
| :---- | :---- | :---- |
| القيم | `GET/POST /spiritual/values` · `PATCH/DELETE …/{id}` · `PUT /spiritual/values/order` | `409 NAME_EXISTS` |
| المبادئ | `GET/POST /spiritual/principles` · `PATCH/DELETE …/{id}` | |
| الممارسات | `GET/POST /spiritual/practices` · `PATCH …/{id}` · `POST …/{id}/archive|restore` · `GET/POST …/{id}/versions` · `PUT …/{id}/values` | `409 HABIT_MODE` |
| السجلات | `GET/PUT /spiritual/logs` (upsert بالمفتاح) · `DELETE …/{id}` · `POST /spiritual/logs/quick` | `409 LINKED_PRACTICE` · `422 FUTURE_DATE` |
| المواسم | `GET/POST/PATCH /spiritual/seasons` · `PUT …/{id}/practices` | `409 OVERLAP` |
| الأهداف | `GET/POST /spiritual/goals` · `PATCH …/{id}` · `PUT …/{id}/links` · `GET/POST …/{id}/milestones|adjustments` | |
| الالتزامات | `GET/POST /spiritual/commitments` · `PATCH …/{id}` · `POST …/{id}/review` · `GET/PUT …/{id}/checkins` | |
| التأملات والامتنان | `GET/POST /spiritual/reflections` · `GET/POST /spiritual/gratitude` · `GET/POST/PATCH /spiritual/prompts` | |
| التواريخ | `GET/POST /spiritual/dates` · `PATCH/DELETE …/{id}` · `GET /spiritual/dates/upcoming` | |
| المراجعات | `GET/POST /spiritual/reviews` · `PATCH …/{id}` · `POST …/{id}/complete|skip` · `GET /spiritual/reviews/draft?period=` · `GET/POST /spiritual/review-templates` | `409 REVIEW_EXISTS` |
| المشتقات | `GET /spiritual/home` · `GET /spiritual/consistency?practice=&from=&to=` · `GET /spiritual/alignment` · `GET /spiritual/goals/{id}/progress` | |
| الإشارات | `GET /spiritual/signals/today?kind=` · `PUT /spiritual/signals/grants` · `PUT /spiritual/day-flags` | `403 NOT_GRANTED` |
| Feeds | `GET /spiritual/feed/today` · `GET /spiritual/feed/calendar` · `GET /spiritual/calendar.ics?token=` | |
| الاستيراد/التصدير | `POST /spiritual/import` (dry-run/apply) · `POST /spiritual/export` · `POST /spiritual/restore` | `413` |
| المزامنة | `POST /spiritual/sync/push` · `GET /spiritual/sync/pull?since=` | `409` لكل عملية |
| الإعدادات | `GET/PATCH /spiritual/settings` · `GET /spiritual/capabilities` · `POST /spiritual/unlock` | |
| الصيانة | `POST /spiritual/rebuild` · `POST /spiritual/wipe` | `403` إعادة مصادقة |

---

## 12) الأتمتة (Automations)

| ID | الاسم | المحفّز | مفتاح عدم التكرار | افتراضي |
| :---- | :---- | :---- | :---- | :---- |
| PA-01 | تذكير الممارسة | `fire_at` §6.10 | `prac:{id}:{date}:{slot}` | ON لكل ممارسة تُفعَّل لها |
| PA-02 | تذكير التاريخ المهم | `next − reminder_days` | `date:{id}:{next}:{d}` | ON |
| PA-03 | مراجعة الالتزام | بلوغ `review_date` | `commit:{id}:{review_date}` | ON |
| PA-04 | إشعار موعد الهدف | قبل 7 وقبل 1 يوم من `target_date` | `goal:{id}:{d}` | ON (لطيف) |
| PA-05 | سؤال التأمل الأسبوعي | يوم/وقت المستخدم | `wk:{iso_week}` | OFF |
| PA-06 | سؤال المراجعة الشهرية | يوم المستخدم | `mo:{yyyymm}` | OFF |
| PA-07 | المراجعة السنوية | تاريخ المستخدم | `yr:{year}` | OFF |
| PA-08 | بدء/انتهاء الموسم | التواريخ | `season:{id}:{start|end}` | ON |
| PA-09 | مزامنة سجلات Habit | `habit.log.changed` أو عند الفتح | `habit-sync:{practice}:{date}` | ON للمرتبطة |
| PA-10 | تخفيف التذكير التكيّفي | 3 تذكيرات بلا تفاعل | `adapt:{practice}:{month}` | ON (اقتراح فقط) |
| PA-11 | إعادة عرض امتنان | أسبوعيًا | `grat:{iso_week}` | ON (داخل التطبيق) |
| PA-12 | إعادة بناء المشتقات | تغيّر مدخل | `inputs_hash` | ON |
| PA-13 | إعادة حساب الهجري | تغيير الخوارزمية/سنويًا | `hijri:{algo}:{year}` | ON |
| PA-14 | بطاقة العودة | خمول `reentry_prompt_days` | `reentry:{yyyymm}` | ON (داخل التطبيق) |
| PA-15 | تطهير المحذوف | بعد 14 يومًا | `purge:{id}` | ON |
| PA-16 | معالجة اقتراحات Learning | `learning.session.completed` | `source_event_id` | ON (كاقتراح) |
| PA-17 | انتهاء الإيقاف العام | `pause_all_until` | `unpause:{date}` | ON («أهلًا بعودتك») |
| PA-18 | تجميع Digest | تجاوز السقف/الهدوء | `digest:{date}` | ON |
| PA-19 | تذكير النسخ الاحتياطي | كل 90 يومًا | `backup:{quarter}` | OFF |
**ممنوعات:** لا تنبيه «لم تسجّل»، لا إنذار بعد غياب، لا ترقية تذكير، لا مقارنة. كل أتمتة قابلة لإعادة التشغيل بلا تكرار وتُسجَّل في `sp_automation_runs` (بلا محتوى). **Silent Mode** و`pause_all_until` يعلّقان كل شيء.

---

## 13) العمل أوفلاين والمزامنة

### 13.1 المبدأ
كل شيء يعمل محليًا أولًا: القيم، المبادئ، الممارسات، التسجيل، التأمل، الأهداف، الالتزامات، التواريخ، المراجعات. المزامنة خلفية، وكل عملية لها `client_op_id` (`sp_client_ops`) فلا تتكرر عند الإعادة. حالة كل سجل: `Synced | Pending | Conflict`.

### 13.2 التخزين المحلي
- قاعدة محلية **مشفّرة** بمفتاح محفوظ في مخزن مفاتيح الجهاز؛ لا تُفك الحقول `*_enc` إلا بعد فتح قفل القسم.
- المشتقات تُحسب محليًا بنفس خوارزميات §6؛ الخادم المرجع.
- **التذكيرات تُجدول محليًا** (ممارسات، تواريخ، مراجعات) فتصل بلا اتصال، ثم تُنسَّق بـ`dedupe_key`.
- لا كاش للنصوص الصريحة خارج القاعدة المشفّرة (لا لقطات شاشة للمعاينة، ولا فهرسة نظام التشغيل).

### 13.3 طابور العمليات
| النوع | الترتيب | ملاحظة |
| :---- | :---- | :---- |
| إنشاء/تعديل قيمة/مبدأ/ممارسة | `client_ts` ثم `seq` | `version` للتحقق |
| سجل ممارسة (Upsert) | بالمفتاح `(practice, date, slot)` | آخر كتابة تربح حقلًا بحقل |
| تأمل/امتنان | إلحاق | لا دمج نصي تلقائي |
| Check-in | بالمفتاح `(commitment, date)` | |
| الإعدادات | آخر كتابة | |
| `HabitLinked` | قراءة فقط | يُعاد بناء الكاش عند الاتصال |

### 13.4 جدول التعارض والدمج
| الحالة | القرار |
| :---- | :---- |
| سجل نفس الخانة من جهازين بقيم مختلفة | **الأعلى مستوى إنجاز** يربح (Full > Minimum > Partial)، وتُدمج الملاحظات بإلحاق؛ لا فقد |
| تأمل معدَّل على جهازين | `Conflict` ⇒ يحتفظ بالنسختين ويطلب منك الاختيار/الدمج (لا اختيار صامت لنص خاص) |
| ترتيب القيم من جهازين | آخر ترتيب بالخادم ثم إعادة ترقيم بلا فجوات |
| حذف وتعديل متعارضان | التعديل يربح ويُسترجع العنصر |
| تغيير تكرار الممارسة من جهازين | إصداران بـ`valid_from` مختلفين؛ نفس التاريخ ⇒ الأحدث `server_received_at` |
| ساعة جهاز خاطئة (>10 دقائق) | ترتيب بـ`server_received_at` وتحذير |
| تغيّر `day_cutoff_time` | يُطبَّق على المستقبل؛ سجلات الماضي لا تتحرك |
| تغيير المنطقة الزمنية | إعادة جدولة بلا تذكير مكرر (`dedupe_key`) |
| تفعيل Silent على جهاز | يُزامَن فورًا ويعلّق كل التذكيرات المجدولة محليًا |

### 13.5 ما لا يعمل أوفلاين
مزامنة سجلات Habit الجديدة، تنزيل المرفقات، التصدير إلى ICS، واستعادة النسخ الاحتياطية الكبيرة. غير ذلك يعمل كاملًا بشارة «غير متزامن».

---

## 14) الأمان والخصوصية

### 14.1 مستويات الحساسية (CX-16)
| البيانات | المستوى | المعاملة |
| :---- | :---- | :---- |
| القيم، المبادئ، الممارسات، السجلات، الأهداف، المواسم | **Sensitive** | مشفّرة النصوص؛ خارج Core Search/الأحداث/التصدير الافتراضي لأطراف أخرى؛ إشعارات محايدة |
| التأملات، الامتنان، الالتزامات، المراجعات، التواريخ `private`، الملاحظات الخاصة | **Secret** | تشفير + إعادة مصادقة للعرض بعد المهلة؛ لا Feed ولا إشعار بالاسم؛ لا أحداث |

### 14.2 الضوابط
- **قفل القسم:** `AppLock` (بيومتري/PIN الجهاز) أو `SeparatePin` خاص بالقسم؛ قفل تلقائي بعد خمول (قابل للضبط)؛ إخفاء المعاينة في مبدّل التطبيقات.
- **التشفير:** تشفير الحقول `*_enc` في الراحة بمفتاح لكل مستخدم (envelope encryption) ونقل TLS. **المقايضة (PD-10):** التشفير من طرف لطرف (E2EE) أقوى لكنه يجعل فقد كلمة المرور فقدًا للبيانات؛ التوصية: envelope الآن مع خيار «الخزنة» E2EE لاحقًا.
- **المشتقات لا تحتاج النصوص:** تُحسب من الحقول الرقمية والتواريخ فقط فلا يفك الخادم نصًا لأي حساب (PC-35).
- **لا Admin ولا دعم:** لا وصول إداري لمحتوى القسم؛ `sp_audit_log` يسجّل أحداث الوصول (فتح/تصدير/محو) بلا محتوى.
- RLS على `user_id` + FK مركّب؛ لا يُقبل `user_id` من العميل؛ Rate limit على الفتح والتصدير.
- **لا فهرسة عامة، لا أحداث، لا ويدجت، لا شارة أيقونة** افتراضيًا.
- **حدود:** 200 قيمة، 500 ممارسة، 8 خانات، 20,000 حرف للحقل، 200 سجل/يوم.
- لا حقول معتقد في أي ملف شخصي أو Core أو أي قسم آخر (PG-18).

### 14.3 موافقة التكامل
كل تكامل (Habit، Learning، Relationships، Core Goals، إشارة Nutrition) له مفتاح مستقل مع عرض «ما يُقرأ/يُرسَل بالضبط». الإيقاف يجعل المراجع `Detached` ولا يحذف شيئًا.

### 14.4 الامتثال
يُرجع إلى مبادئ القانون المصري 151 لسنة 2020 لحماية البيانات الشخصية كمرجع عام؛ **بيانات المعتقد والفكر فئة شديدة الحساسية** عمومًا. **ليست استشارة قانونية**، وتصنيفها الدقيق وشروط المعالجة **غير مؤكد — يُراجَع مع مختص قبل أي إطلاق تجاري**. لا يجمع النظام بيانات لأغراض تحليل أو إعلان.

### 14.5 التصدير والنسخ والمحو
- **التصدير/النسخ الاحتياطي:** ملف مشفّر بكلمة مرور تختارها (≥10 أحرف) وبإعادة مصادقة؛ يشمل كل بياناتك ويُحذف الملف المؤقت من الخادم بعد 24 ساعة؛ **الاستعادة** بنفس كلمة المرور (PG-09).
- **الأرشفة** الافتراضية؛ **المحو** لكيان واحد بحذف ناعم 14 يومًا.
- **Wipe كامل** (`POST /spiritual/wipe`): إعادة مصادقة + كتابة عبارة تأكيد؛ مهلة تراجع 14 يومًا ثم حذف نهائي من الخادم والنسخ (PG-10)؛ يُنظَّف الكاش المحلي فورًا.

---

## 15) الهجرة والاستيراد

### 15.1 الواقع
لا توجد بيانات قيمية/روحية شخصية مؤكدة في Notion (§1.2، ولم أقرأ محتوى). الهجرة اختيارية ولا يتوقف بناء النظام عليها، والنظام يبدأ فارغًا ومحايدًا.

### 15.2 استيراد قالب «Muslim Life OS | Free Version» (اختياري)
> **اختياري تمامًا ومبني على بنية القالب لا على افتراض معتقدك**؛ تنفّذه فقط إن كانت لديك بيانات تريد نقلها (PD-11).
| المصدر | يُحوَّل إلى | ملاحظة |
| :---- | :---- | :---- |
| **Salah Tracker** — أعمدة checkbox (Fajr, Dhuhur, Asr, Maghrib, Isha, Duha, Tahajjud, Witr) | **ممارسة واحدة بخانات** (`slots`) بالأسماء نفسها (أو ممارسة لكل خانة، باختيارك) | `slots_required` = الخانات المختارة؛ التاريخ من `Date` (وقت الإنشاء) بحسب `day_cutoff` |
| `Sunnah Prayers` (رقم) | ممارسة `Count` اختيارية | |
| `Notes` (title) | `note_enc` للسجل | |
| الصيغ (Day/Today/progress) | **لا تُستورد** (مشتقات) | تُعاد حسابها |
| **Quran Journaling** — Name، Ayah (رقم)، Surah (select)، Topic (multi: Prophets/Akhlaq/Character)، Created | **Reflection**: `Created`→`date`، `Name`→`prompt_text`، `Topic`→`tags`، `Surah+Ayah`→`source_note_enc` (مرجع قراءة حر) | خيارات `Surah` في القالب «Home/Work» عناصر مؤقتة، تُعامل نصًا |
| Surah & Juz Tracker، Du'a & Tasbih، Hadith، The Prophets، 99 Names | **لا تُستورد** | محتوى مرجعي (PG-24) |
| Ramadan Tracker (ورد في فحص Nutrition) | ممارسة/موسم يدوي | **لم يُفحص هنا — غير مؤكد** |
| Core Values/Mission/Vision (قالب Company Hub) | لا استيراد افتراضيًا | قيم مؤسسية (Projects) |
| Gratitude/Daily Journal Entries | **لا تُنقل** | اليوميات ملك Habit؛ يُربط `journal_ref` |
- خريطة الاستيراد **لا تُنشئ قيمًا ولا مبادئ ولا تصنيفات** بدل المستخدم.
- الاستيراد بـDry-run ثم تطبيق، ومفتاح `import_key = {job_id}:{row_no}` يمنع التكرار؛ نسخة احتياطية قبل التطبيق وتراجع 7 أيام.

### 15.3 الإعداد الأول (بلا أي سؤال عن المعتقد)
1. اللغة، المنطقة الزمنية، **حد اليوم** (03:00)، التقويم الهجري (إن أردت).
2. الخصوصية: اختيار القفل (AppLock/PIN)، إخفاء الأسماء (مفعّل)، اسم القسم الظاهر (اختياري).
3. «ابدأ بقيمة أو ممارسة أو اترك فارغًا»؛ **قوالب عامة** اختيارية: قراءة (صفحات)، تأمل (دقائق)، امتنان (3 أشياء)، خدمة (ساعات)، دراسة (دقائق)، مراجعة أسبوعية؛ تُنشأ فارغة التذكير ويمكن تعديلها أو حذفها.
4. **بنك أسئلة محايد** (قابل للتعديل): «ما الذي أنا ممتنّ له اليوم؟»، «ما اللحظة التي شعرت فيها بالانسجام مع قيمي؟»، «ما الذي أريد أن أتعلمه هذا الأسبوع؟»، «ما الذي أحتاج أن أتركه لأرتاح؟».
5. التكاملات كلها OFF؛ الإشعارات `Neutral`؛ `Missed` والاستمرارية والمقارنة OFF.

### 15.4 استيراد CSV/ICS
- **ممارسات وقيم وتواريخ** من CSV بقوالب محددة؛ **التواريخ المهمة من ICS** (مصدر يختاره المستخدم، **غير مؤكد — يُتحقق قبل البناء**).
- Dry-run ثم تطبيق؛ لا تغيير قبل التأكيد؛ حدود 5000 صف.

---

## 16) اختبارات القبول (PT)

### 16.1 الاختبارات العشرة من المصدر
| # | الاختبار | المتوقع |
| :---- | :---- | :---- |
| PT-01 | ممارسات مخصَّصة | إنشاء ممارسة بنوع وأسماء حرة وخانات؛ بلا قائمة مفروضة |
| PT-02 | لا تصنيف معتقد إلزامي | الإعداد الأول بلا سؤال معتقد؛ `type/category` نص حر؛ لا enum ديني في API |
| PT-03 | لا تكرار مع Habit | ممارسة `HabitLinked` لا تنشئ سجلات Own (`409 LINKED_PRACTICE`) |
| PT-04 | التواريخ المهمة تتكرر | سنوي وشهري وأسبوعي وهجري يُنتج التالي الصحيح |
| PT-05 | التأملات خاصة | مشفّرة، خارج البحث العام والفيد والأحداث، تتطلب فتح القفل |
| PT-06 | تكامل Today | `feed/today` تعيد العناصر محايدة العناوين وتحترم Silent |
| PT-07 | الأرشفة توقف التذكيرات | لا تذكير ولا «متوقَّع» بعد الأرشفة، والسجل باقٍ |
| PT-08 | تقدم الهدف قابل للتفسير | يعرض المصدر (السجلات المربوطة + التصحيحات) والمعادلة |
| PT-09 | المراجعة بلا درجة أخلاقية | لا درجة ولا «أفضل/أسوأ» ولا لون عقابي؛ أرقام وصفية فقط |
| PT-10 | عزل المستخدمين | طلب بيانات مستخدم آخر ⇒ 404 |

### 16.2 القيم والمبادئ
| # | الاختبار | المتوقع |
| :---- | :---- | :---- |
| PT-11 | اسم قيمة مكرر بين النشطة | `409 NAME_EXISTS` |
| PT-12 | سحب لإعادة الترتيب | `rank` متصل بلا فجوات |
| PT-13 | لا حقل `score` في القيم | غير موجود في المخطط والـAPI |
| PT-14 | `drift_signals` | تظهر في صفحة المبدأ فقط ولا تُكتشف آليًا |
| PT-15 | أرشفة قيمة | الروابط والتاريخ باقية |

### 16.3 الممارسات والسجلات والاتساق
| # | الاختبار | المتوقع |
| :---- | :---- | :---- |
| PT-16 | target=10، minimum=2: actual 12/10/4/2/1/0 | Full/Full/Minimum/Minimum/Partial/None |
| PT-17 | `minimum > target` | `422` |
| PT-18 | غياب السجل | «غير مسجَّل» لا Missed |
| PT-19 | `Missed` مع الإعداد OFF | `422` |
| PT-20 | خمس خانات و`AtLeast(4)` | 4 ⇒ محافظ عليه؛ 2 ⇒ جزئي |
| PT-21 | حد اليوم 03:00 والوقت 01:30 | يُسجَّل لليوم السابق |
| PT-22 | أسبوع: 4 محافظ + جزئي + Excused + غير مسجَّل | «٤ من ٦ أيام» |
| PT-23 | `TimesPerWeek n=3` ويومان Excused | `n_eff=2` |
| PT-24 | تغيير التكرار | إصدار جديد ولا يتغير الماضي |
| PT-25 | الإيقاف العام | لا توقع ولا تذكير ولا أثر على الاتساق |
| PT-26 | الاستمرارية: المثال §6.6 | 6 مع يوم سماح |
| PT-27 | الاستمرارية OFF | لا تُعرض ولا تُحسب في الواجهة |
| PT-28 | أول يوم بعد التوقف | «بدأت فترة جديدة» بلا «انقطاع» |
| PT-29 | تسجيل رجعي ≤365 يومًا | يعيد حساب المشتقات |
| PT-30 | تسجيل مستقبلي | `422 FUTURE_DATE` |
| PT-31 | Upsert لنفس `(practice,date,slot)` | سجل واحد |

### 16.4 الأهداف والالتزامات والمواسم
| # | الاختبار | المتوقع |
| :---- | :---- | :---- |
| PT-32 | هدف 300 صفحة، current=120 | 40.0%، متبقٍ 180، 2.12/يوم، الوتيرة الخطية 22.8 |
| PT-33 | هدف Days | يعدّ Full|Minimum فقط |
| PT-34 | هدف Milestones | منجز/كل |
| PT-35 | هدف Free + تصحيح | `current` من التصحيحات الشفافة |
| PT-36 | `Released` | حالة كريمة بلا «فشل» |
| PT-37 | إيقاع أسبوعي من 1/10 إلى 29/10 | المتوقع 5؛ «٣ من ٥ (وجزئيًا مرة)» |
| PT-38 | بلوغ `review_date` | بطاقة أكمل/عدّل/أطلق/مدّد بلا افتراض |
| PT-39 | `Revised` | تُنشأ نسخة جديدة وتُغلق القديمة |
| PT-40 | موسم يشمل ممارسة بتجاوز | يُطبَّق ثم يعود الأصل بعد النهاية |
| PT-41 | موسمان نشطان متداخلان | `409 OVERLAP` |

### 16.5 التواريخ والتذكيرات
| # | الاختبار | المتوقع |
| :---- | :---- | :---- |
| PT-42 | تاريخ هجري سنوي مع `day_offset=+1` | يُزاح يومًا |
| PT-43 | «اليوم 15 من كل شهر قمري» | تاريخ لكل شهر؛ اليوم 30 في شهر 29 ⇒ آخر يوم |
| PT-44 | 29 فبراير ميلادي | 28 فبراير في غير الكبيسة |
| PT-45 | تذكير ممارسة | عنوان محايد افتراضيًا |
| PT-46 | سُجّلت الخانة قبل وقتها | لا تذكير |
| PT-47 | ساعات الهدوء/السقف 3 | يتأجل/يدخل Digest |
| PT-48 | 3 تذكيرات بلا تفاعل | اقتراح تخفيف واحد؛ لا زيادة |
| PT-49 | Silent Mode | لا إشعار ولا Feed ولا بطاقات |
| PT-50 | تذكير هدف قبل 7 و1 يوم | مرة لكل منهما بصياغة لطيفة |

### 16.6 التكامل والإشارة
| # | الاختبار | المتوقع |
| :---- | :---- | :---- |
| PT-51 | Habit غير متاح | تُعرض آخر نسخة كاش بتنبيه |
| PT-52 | إشارة Nutrition بلا موافقة | `403 NOT_GRANTED` |
| PT-53 | إشارة بموافقة ويوم متوقَّع | `{"active": true}` فقط |
| PT-54 | `NotToday` | `{"active": false}` |
| PT-55 | اقتراح من Learning | يظهر كاقتراح ولا يسجّل تلقائيًا |
| PT-56 | الأحداث الصادرة افتراضيًا | لا شيء يُرسَل |
| PT-57 | `core_goal_ref` مفقود | الحالة `Missing` بلا خطأ |

### 16.7 الخصوصية والصياغة والأوفلاين
| # | الاختبار | المتوقع |
| :---- | :---- | :---- |
| PT-58 | شاشة القفل | نص محايد بلا اسم |
| PT-59 | قفل القسم وفتحه | لا نصوص صريحة قبل الفتح |
| PT-60 | **فحص الصياغة في CI** | لا عبارات لوم/ذنب/«فاتتك»/«انقطعت»/«فشلت»/أحكام دينية أو أخلاقية |
| PT-61 | لا وصول إداري | محاولة قراءة بدور إداري ⇒ 403 |
| PT-62 | لا فهرسة في Core Search | لا نتائج من القسم في البحث العام |
| PT-63 | تصدير بكلمة مرور | يُنتج ملفًا مشفّرًا يُستعاد بنفس الكلمة |
| PT-64 | Wipe | إعادة مصادقة؛ تراجع 14 يومًا؛ حذف نهائي بعدها |
| PT-65 | عمل أوفلاين كامل ثم مزامنة | لا فقد ولا تكرار |
| PT-66 | سجل نفس الخانة من جهازين | الأعلى مستوى يربح مع دمج الملاحظات |
| PT-67 | تأمل معدَّل على جهازين | Conflict يحفظ النسختين |
| PT-68 | استيراد Salah Tracker | ممارسة بخانات؛ الصيغ لا تُستورد |
| PT-69 | استيراد Quran Journaling | Reflections بوسوم ومرجع قراءة |
| PT-70 | إعادة بناء المشتقات | نفس النتائج بعد `POST /spiritual/rebuild` |

---

## 17) الخدمات وترتيب البناء

### 17.1 الخدمات
| الخدمة | المسؤولية |
| :---- | :---- |
| ValueService | القيم والترتيب |
| PrincipleService | المبادئ |
| PracticeService | الممارسات والإصدارات والخانات |
| PracticeLogService | السجلات والمستويات والكاش المرتبط |
| SpiritualGoalService | الأهداف والمعالم والتصحيحات |
| ReflectionService | التأملات والامتنان والأسئلة |
| CommitmentService | الالتزامات وCheck-ins |
| ImportantDateService | التواريخ والتقويمان |
| SpiritualReviewService | المراجعات والقوالب |
| SpiritualNotificationService | الجدولة والهدوء والسقف والصياغة |
| SeasonService | المواسم |
| ConsistencyService | الاتساق والاستمرارية والرؤية |
| SignalService | الإشارة المغلقة |
| HabitLinkService | قراءة Habit والكاش |
| PrivacyService / LockService | القفل والتشفير والمحو |
| ImportService / ExportService | الاستيراد والنسخ الاحتياطي |
| SyncService | المزامنة |

### 17.2 مراحل البناء
| المرحلة | المحتوى | اختبارات |
| :---- | :---- | :---- |
| P0 | الهيكل، RLS، التشفير، القفل، الإعدادات، المزامنة الأساسية | PT-10، 58، 59، 65 |
| P1 | القيم والمبادئ والممارسات والإصدارات | PT-01، 02، 11–17، 24 |
| P2 | السجلات والخانات والاتساق والاستمرارية | PT-16–31 |
| P3 | التأملات والامتنان والأسئلة | PT-05، 14 |
| P4 | الأهداف والالتزامات والمواسم | PT-08، 32–41 |
| P5 | التواريخ المهمة والتذكيرات والإشعارات | PT-04، 07، 42–50 |
| P6 | المراجعات والرؤية والبطاقات | PT-09 |
| P7 | التكاملات (Habit، Today، Learning، الإشارة) | PT-03، 06، 51–57 |
| P8 | الاستيراد والتصدير والمحو وتثبيت الجودة والصياغة | PT-60–64، 66–70 |

---

## 18) القرارات المفتوحة (PD)

| # | القرار | التوصية الافتراضية |
| :---- | :---- | :---- |
| PD-01 | حد «يوم الممارسة» | 03:00 قابل للضبط |
| PD-02 | خوارزمية الهجري: Umm al-Qura أم الجدولي | Umm al-Qura **غير مؤكد — يُتحقق قبل البناء**، مع `day_offset` |
| PD-03 | مواقيت فلكية (شروق/غروب/…) | **لا حساب في v4.0**؛ أوقات يدوية/ICS من مصدرك |
| PD-04 | تفعيل حالة `Missed` | OFF افتراضيًا |
| PD-05 | الاستمرارية (Streak محايد) | OFF افتراضيًا، يوم سماح لكل 7 |
| PD-06 | إشارة Nutrition (الصيام/الامتناع) | مغلقة؛ تُفعَّل مع Nutrition v4.1 |
| PD-07 | عقد سجلات Habit (افتراض) | تأكيده من مواصفة Habit قبل البناء |
| PD-08 | نص الإشعارات/Today | `Neutral` («تذكيرك الهادئ») |
| PD-09 | اسم القسم وتمويهه | الاسم الافتراضي «القيم والممارسات»، قابل للتخصيص |
| PD-10 | نموذج التشفير | Envelope الآن؛ خزنة E2EE لاحقًا مع تحذير فقد المفتاح |
| PD-11 | استيراد قالب Muslim Life OS | اختياري؛ لا تُنفَّذ إلا بطلبك |
| PD-12 | صيغة التصدير | JSON مشفّر + CSV لكل جدول |
| PD-13 | المراجعات الدورية | أسبوعية/شهرية/سنوية OFF حتى تفعّلها |
| PD-14 | محتوى القوالب العامة وبنك الأسئلة | كما في §15.3 وبتعديلك |
| PD-15 | الأحداث الصادرة | OFF |
| PD-16 | اقتراحات Learning | اقتراح لا تسجيل تلقائي |
| PD-17 | 29 فبراير في السنة غير الكبيسة | 28 فبراير |
| PD-18 | السقف اليومي للإشعارات | 3 |

---

## 19) مصفوفة التغطية والخلاصة

### 19.1 مصفوفة التغطية
| قسم المصدر | موضعه هنا |
| :---- | :---- |
| 1 الهدف وحياد المعتقد | الرأس، §3.3 |
| 2 الملكية | §3.2، §11 |
| 3 الشاشات | §10 |
| 4 Values | §5.2 |
| 5 Principles | §5.3 |
| 6 Practices | §5.4، §6.2 |
| 7 Practice Logs | §5.5، §6.3، §6.14 |
| 8 Spiritual Goals | §5.7، §6.7 |
| 9 Reflections | §5.8 |
| 10 Commitments | §5.9، §6.8 |
| 11 Important Dates | §5.10، §6.9 |
| 12 Reviews | §5.11، §6.11 |
| 13 Privacy | §14 |
| 14 Automation | §12 |
| 15 Integrations | §11 |
| 16 Services | §17 |
| 17 APIs | §11.9 |
| 18 Acceptance Tests | §16 (PT-01…PT-10) |
| القواعد التسع المشتركة | §3.3، §5.0، §13، §14 |

### 19.2 الخلاصة
**ما يحتاج قرارك:** PD-02 (خوارزمية الهجري)، PD-07 (تأكيد عقد سجلات Habit)، PD-10 (نموذج التشفير وفقد المفتاح)، PD-06 (إشارة الصيام/الامتناع مع Nutrition)، PD-11 (هل تريد استيراد قالب Notion الجاهز أم تبدأ فارغًا)، ثم الباقي بتوصياته.

**طلبات التغيير على الأنظمة الأخرى:**
- **Habit:** `GET /habit/habits/{id}/logs?from&to` و`GET /habit/habits?q=` وحدث `habit.log.changed` (افتراض — يؤكده Habit).
- **Nutrition:** استهلاك `GET /spiritual/signals/today?kind=fasting` عند تفعيل ND-15 (v4.1).
- **Relationships:** `GET /relationships/summary` أعداد فقط (معرَّف في وثيقته).
- **Learning:** حدث `learning.session.completed` كاقتراح.
- **Core:** إشعارات محايدة، `core_goal_ref` اختياري، **عدم فهرسة هذا القسم في Core Search**.
- **Finance:** لا طلبات.

**غير مؤكد:** خوارزمية الهجري، عقد سجلات Habit، مصادر ICS للمواقيت، الإطار القانوني لبيانات المعتقد، ومحتوى Ramadan Tracker وبقية صفوف قوالب Notion (لم تُقرأ).
