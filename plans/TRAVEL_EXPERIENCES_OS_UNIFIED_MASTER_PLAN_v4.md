# ✈️ Travel & Experiences OS — خطة العمل الموحّدة والكاملة (الإصدار 4.0)

**الغرض:** وثيقة بناء **مكتفية بذاتها** لتطبيق **السفر والتجارب** (ويب + موبايل، عربي RTL، **يعمل أوفلاين كاملًا** لأن السفر هو أكثر مكان تنقطع فيه الشبكة): من فكرة رحلة، إلى تخطيط وحجز، إلى أيام التنفيذ بساعاتها المحلية، إلى المصروف الفعلي، إلى الذكريات والمراجعة — وكذلك **التجارب خارج الرحلات** (مطعم، حفل، يوم في مدينة). يعمل **كقسم مستقل تمامًا**، ومرتبط بأنظمتك (Finance، Calendar/Today، Knowledge، Relationships، Home، Shopping، Inventory، Core) عبر **عقود API/Events فقط** — بلا جداول مشتركة ولا نسخ كيانات. نفس فلسفة وثائق Learning وFinance وNutrition وInventory وShopping وRelationships وSpiritual ونفس هيكلها، بما يناسب طبيعة السفر: **مناطق زمنية متعددة، حجوزات بمواعيد إلغاء، مستندات سرّية، عملات متعددة، وخصوصية موقعك وغيابك عن البيت**.

> **هذه الوثيقة تحلّ محلّ الملفين السابقين بالكامل** (`TRAVEL_EXPERIENCES_OS_Independent_Build_Spec.md` EN و`TRAVEL_EXPERIENCES_OS_وثيقة_البناء_المستقلة_العربية.md` AR). كل بند فيهما موجود هنا (انظر **مصفوفة التغطية في §19**) مع حسم التعارضات وسد الفجوات. لا يُرسَل الملفان القديمان لمنفّذ التطبيق.

**ما دخل في المراجعة:**

1. مواصفتا المصدر (EN + AR): 19 قسمًا + «قواعد التنفيذ المشتركة» (9 قواعد).
2. **Notion (قراءة فقط):** وجدت صفحة **🧳 Traveling** (ضمن Damen's/Home/Personal Growth) تضم قالب **Simple Trip Planner** وقاعدتين وقاعدة مضمّنة «Grants and Travel»، وقسم **Travel Management** في «Company Hub Template» (دليل إجراءات لمساعد تنفيذي) (§1.2).
3. وثائق **Finance OS v4.1** (عقد `from-source` وأبعاد `trip_id`/`booking_id`) و**Shopping OS v4.0** (`ForTrip`) و**Relationships OS v4.0** (رفاق الرحلة) و**Spiritual OS v4.0** كقالب.
4. **القرارات المشتركة CX-01…CX-22** (ملزمة) — وأهمها **CX-13 (الوقت المحلي + IANA + UTC)** وCX-14 (العملات) وCX-07 (المستندات السرّية) وCX-20 (التجارب = Travel).

**المرجع الأعلى عند التعارض:** هذه الوثيقة ← سلوك Notion الفعلي ← مواصفتا المصدر.

> **تنبيه أمانة:** هذه الوثيقة **أداة تنظيم** وليست وكالة سفر ولا نصيحة قانونية أو صحية أو أمنية. **لا يعرف النظام متطلبات التأشيرات ولا صلاحية الجوازات لأي دولة** (القاعدة الافتراضية «جواز ≥ 6 أشهر» مجرد **افتراض قابل للتعديل — غير مؤكد، يتحقق المستخدم من متطلبات الوجهة الرسمية**، TD-02). لا scraping ولا قراءة بريد ولا أسعار طيران أو طقس أو خرائط من مزوّدين (CX-22): الإدخال يدوي أو باستيراد ملف/ICS؛ أي مزوّد غير مفحوص موسوم **«غير مؤكد — يُتحقق قبل البناء»**.

> **مفاتيح القراءة:** `TF` ميزة محفوظة من المصدر · `TC` تعارض محسوم · `TG` فجوة مسدودة · `TE` تحسين مضاف · `TD` قرار يحتاج تأكيدك (بتوصية افتراضية) · `TV` قاعدة تحقق · `TA` أتمتة · `TT` اختبار قبول. (الحرف **T** = Travel، حسب CX-18.) و`CX-xx` = القرارات المشتركة.

---

## 1) مراجعة المصدر وحكم على كل عنصر

### 1.1 ملخص المراجعة
المصدر منظّم لكنه **يفترض أن الوقت والمال بسيطان** وهما أصعب ما في السفر:
- **`destination_ids` مصفوفة داخل Trips:** علاقة متعددة بلا ترتيب ولا تواريخ لكل وجهة (رحلة مدينتين لا تُمثَّل).
- **الوقت:** `start_time/end_time` بلا منطقة زمنية؛ والقاعدة المشتركة «توقيت المستخدم» تكسر رحلة تقلع من القاهرة وتهبط في لندن (حُسم في CX-13).
- **`end_time < start_time` مرفوض** لكن الحافلة الليلية والفندق والرحلة عابرة منتصف الليل **مشروعة**.
- **الحجز والبند:** Booking فيه `start_at/end_at` وItinerary Item فيه `start_time/end_time` + `booking_id`: وقتان لحدث واحد.
- **`cost` في Booking** مع «Booking ليس transaction» و«Finance يملك المدفوعات»: ما معنى `cost`؟ وماذا عن عربون ثم باقي، أو استرداد عند الإلغاء؟
- **الميزانية الفعلية «مشتقة من Finance»** لكن مصروف الرحلة اليومي (قهوة، تاكسي) لا يمرّ بـTravel أصلًا: كيف يصل إلى Finance موسومًا بالرحلة؟
- **العملات:** `base_currency` للرحلة وعملة لكل فئة وعملة الحساب في Finance، ولا سعر صرف (CX-14).
- **Experience مقابل Memory مقابل Itinerary:** ثلاث كيانات متقاطعة؛ والتجربة لها `cost` يزدوج مع Finance.
- **حالة الرحلة والوجهة والمكان يدوية** رغم أن أغلبها قابل للاشتقاق (Visited، Active، Completed).
- **المستندات:** `masked_reference` و`file` بلا تحديد أين يُخزَّن الملف (لا Documents OS، CX-07) ولا كيف تُقرأ تذكرة الطيران في المطار بلا إنترنت.
- **التعبئة (Packing):** `owner` نص حر مقابل أشخاص حقيقيين (Relationships).
- **Trip Review `total_spent` مشتق** لكن Finance قد يتغير بعد المراجعة (استرداد متأخر).
- **لا شيء عن:** الأوفلاين للسفر، الرحلة الملغاة وتبعاتها، تواريخ بلا إقامة، الرفاق، مشاركة الغياب مع Home (خصوصية)، إعادة استخدام رحلة سابقة.

### 1.2 ما وجدته في Notion (قراءة فقط)
| العنصر | الموقع | الحقيقة المفحوصة | الأثر |
| :---- | :---- | :---- | :---- |
| **🧳 Traveling** | Damen's / Home / Personal Growth (آخر تعديل 2024-04-07) | صفحة تضم **Simple Trip Planner** + قاعدتين (لم تُفتح) + قاعدة مضمّنة **Grants and Travel** (لم تُفحص) | قالب جاهز مستورد؛ **لا دليل على رحلات حقيقية** |
| **Simple Trip Planner** | داخل Traveling (2024-03-26) | **قالب فارغ**: Trip Overview (When/Where to/Duration/With who)، Accommodation (Check-in/out، Reservation #)، Flights (Departure/Arrival: Date، Flight #، Seat، Airport، Terminal، Time)، Things to Do/See/Eat، **Trip Budget** (Transportation/Accommodation/Food/Insurance/Attractions/Souvenirs/Other × Budget/Actual/Difference)، Car Rental (Company، Pickup/Drop-off، Confirmation، Vehicle، Cost)، **Packing List** (~87 خانة اختيار بعمودين، أولها Clothing) | يطابق Trip + Bookings + Budget + Packing؛ **بلا بيانات** |
| **Travel Management** | Company Hub Template / Management System | دليل إجراءات لمساعد تنفيذي: Before Booking (Extract Trip Information، **Check Country's Travel Requirements** — يذكر «جواز ينتهي خلال 6 أشهر يعرّض السفر للخطر»)، During Booking (Book Flight)، After Booking (Confirm Bookings، Prepare Itinerary، Prepare Packing List، Block out Calendar)، + Travel Preferences/Checklist | **إلهام فقط** (دورة التخطيط وقاعدة الجواز)؛ ليس بيانات شخصية |
| «🛒 Wishlist and Shopping» | داخل Traveling (وُجد في فحص Shopping) | قالب Shopping | يخص Shopping |

> **لم أقرأ محتوى أي رحلة أو صف**، ولم أحتفظ بشيء. النتيجة الأمينة: **لا توجد رحلات أو حجوزات أو مستندات مؤكدة** في Notion للهجرة؛ الهجرة اختيارية (§15) والنظام يبدأ فارغًا.

### 1.3 حكم على كل عنصر من المصدر
| # | العنصر في المصدر | الحكم | المعالجة | أين |
| :---- | :---- | :---- | :---- | :---- |
| 1 | الدورة: فكرة→…→مراجعة | **اعتماد** | تغطي كل شاشة | §4.3 |
| 2 | يملك 11 كيانًا | **اعتماد + تدقيق** | + جداول مساعدة (محطات، رفاق، مصروفات، قوالب) | §3.2 |
| 3 | Finance/Calendar/Knowledge/Relationships حدود | **اعتماد** | مراجع ناعمة + عقود | §11 |
| 4 | Trips + `destination_ids` | **تعديل** | `tr_trip_destinations` مرتبة بتواريخ | TC-01 |
| 5 | الحالات والأنواع | **تعديل** | انتقالات تلقائية بالتواريخ وبموافقة | TC-13 |
| 6 | `duration_days = end − start + 1` | **اعتماد + تدقيق** | + الليالي، متعدد المناطق | §6.1 |
| 7 | Destinations | **تعديل** | `Visited` مشتقة؛ المنطقة IANA | TC-12 |
| 8 | Itinerary + قاعدة end<start | **تعديل** | `end_day_offset` + وراثة الوقت من الحجز | TC-03، TC-04 |
| 9 | Bookings + «ليس transaction» | **تعديل** | `cost` = سعر الحجز؛ دفعات عبر روابط | TC-05 |
| 10 | Travel Budgets + الفعلي من Finance | **تعديل** | + مصروفات التقاط + أسعار صرف مجمَّدة | TC-06، TC-07 |
| 11 | Packing | **تعديل** | قوالب + أشخاص + وزن | TC-20، TC-21 |
| 12 | Places | **تعديل** | `trip_id` اختياري؛ Visited مشتقة | TC-11 |
| 13 | Experiences | **تعديل** | بلا رحلة مسموح؛ تكلفة معلوماتية | TC-08، TC-10 |
| 14 | Travel Documents | **تعديل** | Core Files + أوفلاين + قاعدة الصلاحية | TC-14، TC-15 |
| 15 | Memories | **اعتماد** | مستقلة + وسائط عبر Core Files | TC-09 |
| 16 | Trip Review | **تعديل** | لقطة المصروف وقت المراجعة | TC-23 |
| 17 | Trip Detail tabs + Home | **اعتماد** | + أوفلاين، تحويل المنطقة | §10 |
| 18 | الأتمتة (8) | **اعتماد + توسيع** | مناطق زمنية صحيحة | §12 |
| 19 | التكاملات (6) | **اعتماد مع حدود** | + Shopping وInventory | §11 |
| 20 | الخدمات (13) | **اعتماد** | + خدمات مساعدة | §17 |
| 21 | الاختبارات العشرة | **اعتماد** | ضمن 60+ اختبارًا | §16 |
| 22 | القواعد التسع المشتركة | **اعتماد + مواءمة** | CX-13 يستثني Travel من «توقيت المستخدم» | §3.3 |
| 23 | لا أوفلاين مخصَّص للسفر | **إضافة** | حزمة أوفلاين للرحلة | TG-06 |
| 24 | لا قواعد للرحلة الملغاة/المعدّلة | **إضافة** | دورة حياة + سجل أحداث الحجز | TG-10، TG-11 |

---

## 2) جرد الميزات المحفوظة (TF — كلها)

| ID | الميزة / القاعدة (من المصدر) | أين |
| :---- | :---- | :---- |
| TF-01 | السفر كرحلة كاملة: فكرة → تخطيط → حجز → تنفيذ → إنفاق → ذكريات → مراجعة | §4.3 |
| TF-02 | يملك: Trips, Destinations, Itinerary Items, Bookings, Travel Budgets, Packing, Places, Experiences, Travel Documents, Memories, Trip Reviews | §3.2 |
| TF-03 | Finance يملك المدفوعات؛ Calendar يملك العرض الزمني؛ Knowledge يملك مصادر البحث؛ Relationships يملك الأشخاص | §3.2، §11 |
| TF-04 | الشاشات: Home, Trips, Trip Detail, Itinerary, Destinations, Bookings, Budget, Packing, Places, Experiences, Documents, Memories, Review | §10 |
| TF-05 | Trips: id, user_id, name, status, trip_type, start_date, end_date, base_currency, budget_amount, destination_ids, main_purpose, notes | §5.3 |
| TF-06 | Trip status: Idea/Planning/Booked/Active/Completed/Cancelled | §9.1 |
| TF-07 | Trip type: Solo/Family/Couple/Friends/Work/Mixed | §5.3 |
| TF-08 | `duration_days = end_date − start_date + 1` | §6.1 |
| TF-09 | Destinations: name, country, city, region, timezone, status, rating, best_time, url, map_link, notes | §5.2 |
| TF-10 | Destination status: Wishlist/Planned/Visited | §5.2، §6.13 |
| TF-11 | Itinerary Items: trip_id, date, start_time, end_time, type, title, location, booking_id, destination_id, notes, status | §5.5 |
| TF-12 | Itinerary type: Activity/Transit/Meal/Rest/Free Time/Meeting/Event/Custom | §5.5 |
| TF-13 | `end_time < start_time` مرفوض داخل اليوم | §6.4، TC-03 |
| TF-14 | Bookings: trip_id, type, provider, confirmation_code, booking_date, start_at, end_at, from/to_location, location, cost, currency, cancellation_deadline, status, document_id, notes | §5.6 |
| TF-15 | Booking types: Flight/Hotel/Train/Bus/Car/Activity/Other | §5.6 |
| TF-16 | **Booking ليس transaction** | §3.2، TC-05 |
| TF-17 | Travel Budgets: trip_id, category, planned_amount, currency, notes | §5.7 |
| TF-18 | الفئات: Transport/Accommodation/Food/Activities/Shopping/Insurance/Visa/Other | §5.7 |
| TF-19 | **الفعلي مشتق من معاملات Finance المرتبطة بالرحلة** | §6.7، §11.3 |
| TF-20 | Packing Lists + Items: (list: name, status, notes)؛ (item: item, category, quantity, packed, optional, owner, notes) | §5.8 |
| TF-21 | Places to Visit: trip_id, destination_id, name, type, priority, status, location, url, estimated_cost, notes | §5.9 |
| TF-22 | Place status: Wishlist/Planned/Visited/Skipped | §5.9 |
| TF-23 | Experiences: trip_id, title, type, date, location, people, rating, highlights, notes, media, cost, place_id | §5.10 |
| TF-24 | Experience = حدث فعلًا؛ Itinerary = مخطط | §3.3، TC-10 |
| TF-25 | Travel Documents: trip_id, type, name, masked_reference, issue_date, expiry_date, file, reminder_days, notes | §5.11 |
| TF-26 | القيم الحساسة محمية | §14 |
| TF-27 | Memories: trip_id, date, title, description, media, people, location, tags | §5.12 |
| TF-28 | Memory مستقلة عن Experience | §5.12، TC-09 |
| TF-29 | Trip Review: overall_rating, best_parts, worst_parts, lessons, favorite_place, total_spent (مشتق)، would_repeat, notes | §5.13، §6.14 |
| TF-30 | Trip Detail tabs: Overview/Itinerary/Bookings/Budget/Packing/Places/Experiences/Documents/Memories/Review | §10.3 |
| TF-31 | Home: Upcoming Trip, Planning, Wishlist, Documents, Budget Alerts, Recent Memories | §10.2 |
| TF-32 | أتمتة: تذكير الحجز | TA-01 |
| TF-33 | أتمتة: موعد إلغاء الحجز | TA-02 |
| TF-34 | أتمتة: انتهاء المستند | TA-03 |
| TF-35 | أتمتة: تذكير التعبئة | TA-05 |
| TF-36 | أتمتة: تذكير البرنامج | TA-04 |
| TF-37 | أتمتة: تنبيه الميزانية | TA-06 |
| TF-38 | أتمتة: بداية/نهاية الرحلة | TA-07 |
| TF-39 | أتمتة: رحلة مكتملة ⇒ دعوة للمراجعة | TA-08 |
| TF-40 | التكاملات: Finance, Calendar, Knowledge, Relationships, Home, Today | §11 |
| TF-41 | الخدمات الثلاث عشرة (Trip…TravelCalendar) | §17 |
| TF-42 | الاختبارات العشرة | §16 (TT-01…TT-10) |
| TF-43 | القواعد التسع المشتركة | §3.3 |

---

## 3) المبادئ والحدود بين الأقسام

### 3.1 ما هو Travel & Experiences OS
نظام يجيب عن: **إلى أين؟ متى بالساعة المحلية؟ ماذا حجزت وماذا يلزم إلغاؤه؟ كم خططت وكم أنفقت؟ ماذا أحمل؟ أين مستنداتي؟ ماذا عشت وماذا أحتفظ به؟** ولا يجيب عن: كم سعر التذكرة، ما الطقس، هل أحتاج تأشيرة، أو أين أحجز.

### 3.2 مصفوفة الملكية
| الكيان | يملكه | غيره يخزّن فقط |
| :---- | :---- | :---- |
| الرحلات، المحطات، البرنامج، الحجوزات (كسجل حجز)، الميزانية المخططة، التعبئة، الأماكن، التجارب، الذكريات، المراجعات | **Travel** | — |
| **الدفع الفعلي والاسترداد** | **Finance** | `tr_finance_links` (حالة المزامنة) |
| **الميزانية الفعلية** | Finance (مجاميع بـ`trip_id`) | Travel يقرأ |
| **المستند نفسه (الملف)** | **Core Files** (Secret) | `file_ref` + `masked_reference` |
| العرض الزمني على التقويم | Calendar | Travel يوفّر feed بمصدر `source_id` |
| مصادر البحث والملاحظات الطويلة | Knowledge | `knowledge_ref` |
| **الأشخاص (الرفاق)** | **Relationships** (CX-01) | `person_ref` + snapshot أو اسم حر |
| المهام العامة | Core Tasks/Today | `task_ref` ناعم |
| الاجتماعات (رحلة عمل) | Knowledge | `meeting_ref` ناعم |
| مشتريات السفر (حقيبة، شاحن) | **Shopping** (`purpose=ForTrip`) | Travel يعرض قراءة فقط |
| مقتنيات للتعبئة | Inventory | `inventory_item_ref` (قراءة) |
| الأصول المالية والادخار للرحلة | Finance (Goals) | `finance_goal_ref` |
| بيت الغياب (تعليق التذكيرات المنزلية) | Home | حدث اختياري مغلق افتراضيًا |

### 3.3 المبادئ (ملزمة)
1. **الوقت دائمًا محلي للمكان:** كل حدث رحلة = تاريخ ووقت محلي + `IANA tz` + لحظة UTC مشتقة (CX-13). لا نخزّن «وقتًا بلا منطقة» لأي بند رحلة.
2. **الحجز ليس مالًا:** `cost` سعر الحجز (التزام)؛ الدفع الفعلي معاملة Finance واحدة لكل دفعة حقيقية.
3. **المال قرش بقرش:** نصوص عشرية وISO-4217، **لا تحويل صامت**، أسعار صرف مجمَّدة مع القيد أو من Finance للقراءة (CX-14).
4. **الأوفلاين أولًا:** تذكرتك وعنوان فندقك ورقم تأكيدك يجب أن تُفتح في المطار بلا شبكة (TE-01).
5. **المستندات سرّية:** `masked_reference` فقط في الواجهات والإشعارات والبحث والتصدير؛ الأصل في Core Files بإعادة مصادقة (CX-07).
6. **المشتقات** (المدة، الميزانية، Visited، تقدم التعبئة، حالة المستند) Cache قابل لإعادة البناء ولا تُحرَّر.
7. **لا تكرار:** الأشخاص عند Relationships، المال عند Finance، الاجتماعات عند Knowledge، الملفات عند Core.
8. **لا FK عبر الأقسام**؛ داخل القسم FK مركّب `(parent_id, user_id)`؛ عبر الأقسام `*_ref` ناعم (CX-02).
9. **الخصوصية:** مواعيد غيابك وأماكنك Sensitive؛ لا بث للغياب لأحد افتراضيًا (§14).
10. **لا مصادر خارجية بلا فحص:** لا أسعار طيران/فنادق/طقس/خرائط (CX-22).
11. **بلا لوم ولا ضغط:** الميزانية والتعبئة والمستندات تذكيرات لا أحكام.

### 3.4 مصفوفة التدهور (Degradation)
| ما يتعطل | ما يستمر | ما يظهر |
| :---- | :---- | :---- |
| Finance | كل الرحلة؛ الميزانية المخططة؛ الروابط `Pending` | «الفعلي غير متاح الآن» |
| Core Files | الحقول المقنَّعة؛ الكاش المحلي للمستندات المحفوظة أوفلاين | تنبيه «الملف الأصلي غير متاح» |
| Calendar/Today | داخل القسم | لا عناصر في Today |
| Knowledge/Relationships/Shopping/Inventory/Home | كل شيء | المراجع `Missing/NoAccess` أو تُخفى اللوحات |
| الشبكة | **كل شيء** محليًا | شارة «غير متزامن» |

### 3.5 الخصوصية والصياغة
- **الإشعارات:** نص محايد على شاشة القفل للمستندات والهويات («لديك تذكير سفر»)؛ لا أرقام جوازات ولا رموز تأكيد في أي إشعار.
- **ممنوع:** لوم («أنفقت أكثر من اللازم»)، نصائح مالية/أمنية/صحية، تقدير مخاطر دول.
- **أحداث للأقسام الأخرى:** معرّفات وتواريخ فقط، بلا أسماء أماكن أو أرقام حجز.

---

## 4) النموذج المفاهيمي

### 4.1 خريطة الكيانات
```text
Destination ──< TripDestination (ordered legs) >── Trip ──< Companion (person_ref|name)
                                                    │
        ┌─────────────┬──────────────┬──────────────┼──────────────┬────────────┐
   ItineraryItem   Booking ──< Events  BudgetLine   Packing List    Document   Checklist
        │ (time inherits)  │ └─ FinanceLinks         └─ Items       (Core Files ref)
        │                  └─ Expense (capture)→Finance
   Place ──< Experience ──< Memory (media refs)           TripReview (snapshot)
```
> `Place`، `Experience`، `Memory` يمكن أن توجد **بلا رحلة** (CX-20).

### 4.2 المفاهيم
- **الرحلة (Trip):** إطار له تواريخ ومحطات ورفاق وميزانية.
- **المحطة (Leg):** وجهة داخل رحلة بتواريخ دخول وخروج، وهي من تحدد **منطقة اليوم**.
- **بند البرنامج:** شيء مخطط (نشاط، تنقل، وجبة…) بوقت محلي.
- **الحجز:** سجل حجز (طيران، فندق…) له رمز تأكيد وموعد إلغاء وسعر؛ **ليس معاملة**.
- **المصروف (Expense):** نموذج التقاط سريع لإنفاق أثناء الرحلة يُكتب إلى Finance بوسم الرحلة.
- **التجربة:** ما حدث فعلًا؛ **الذكرى:** لحظة حرة (صورة/سطر).
- **المستند:** جواز/تأشيرة/تأمين/تذكرة؛ المرجع مقنَّع والملف في Core Files.
- **حزمة الأوفلاين:** كل ما تحتاجه رحلتك محفوظ مشفّرًا على الجهاز.

### 4.3 رحلات الاستخدام
1. **حلم → خطة:** وجهة في «قائمة الأمنيات» ← رحلة `Idea` بتواريخ تقريبية ← ميزانية مخططة ← `Planning`.
2. **حجز:** إضافة حجز (رمز تأكيد، موعد إلغاء بتوقيت الفندق) ← يظهر في البرنامج بوقته المحلي ← عند دفعه: «سجّل الدفع» ← Finance.
3. **قبل السفر:** قائمة التعبئة من قالب، قائمة مهام قبل السفر، تنبيه صلاحية الجواز، **حزمة الأوفلاين** تُحمَّل.
4. **أثناء الرحلة:** Today يعرض بند اليوم بتوقيت المكان؛ «مصروف سريع» بنقرتين؛ «حدث هذا» يحوّل بند البرنامج إلى تجربة.
5. **بعد الرحلة:** دعوة مراجعة، لقطة المصروف الفعلي، ذكريات، اقتراح تسجيل لقاءات مع الرفاق في Relationships.
6. **تجربة بلا رحلة:** «عشاء الجمعة في مطعم كذا» ← تجربة بلا `trip_id` ← تظهر في الخط الزمني.

---

## 5) نموذج البيانات الكامل

### 5.0 الحقول العامة والقواعد
- كل كيان رئيسي: `id UUID`, `user_id`, `created_at`, `updated_at`, `version int`, `deleted_at` (حذف ناعم)، `origin_device`.
- كل جدول فرعي يكرّر `user_id` وله FK مركّب `(parent_id, user_id)`؛ RLS على `user_id = auth.uid()`؛ **لا FK عبر الأقسام** (CX-02).
- **الوقت (CX-13):** كل حدث رحلة يُخزَّن ثلاثيًا: `local_date` + `local_time` (محلي للمكان) + `tz` (IANA مثل `Europe/London`) + `utc_at timestamptz` **مشتق** (يُعاد حسابه عند تغيير بيانات المنطقة). نقطة في الزمن (وصول طيران) = `*_local_at` + `*_tz`؛ فترة يوم كامل = `date` فقط بلا ساعة.
- **المال (CX-14):** `amount` نص عشري (`DECIMAL(18,4)` في القاعدة) + `currency` ISO-4217؛ لا نخزّن أسعار صرف خاصة بنا؛ القيد الذي يحتاج تحويلًا يخزّن **`frozen_rate`** (نص عشري) + `rate_source {Manual|FinanceSnapshot}` + `rate_date`.
- **حقول مشفّرة** (`*_enc`): كل ملاحظة/عنوان/رمز تأكيد/وصف نصي حر.
- **المراجع الخارجية:** `{system,type,id}` + `display_snapshot` + `ref_state {Valid|Missing|NoAccess}` — **لا أسماء أماكن ولا أرقام حجز داخل مرجع خارجي**.
- **Privacy Tier (CX-16):** `Normal|Sensitive|Secret` لكل كيان (الافتراضي في كل جدول أدناه). المستندات = `Secret`.
- **المشتقات** في `tr_derived_cache` فقط (§5.14) مع `inputs_hash` وقابلة لإعادة البناء.
- أسماء الجداول بالبادئة `tr_`.
- **الأوفلاين:** كل صف يحمل `sync_status {Synced|Pending|Conflict}` و`client_op_id` (UUID لكل عملية)؛ الكتابة عبر جدول `tr_outbox` (§5.14).

### 5.1 الإعدادات
**`tr_settings`** (صف لكل مستخدم): `home_timezone` (IANA، منطقتك المرجعية)، `language`, `week_start`, `default_currency` (ISO)، `show_home_equivalent` (افتراضي true — عرض ما يعادل بعملتك عند توفر سعر)، `rate_policy {FinanceCurrent|ManualFrozen}` (افتراضي `FinanceCurrent` مع الرجوع لليدوي عند غياب Finance، TD-05)، `passport_min_validity_months` (افتراضي 6، **غير مؤكد — يعدّله المستخدم**، TD-02)، `doc_reminder_days_default` (90,30,7)، `cancel_reminder_hours_default` (72,24)، `packing_reminder_days_before` (3)، `itinerary_reminder_minutes` (60)، `budget_alert_pct` (80,100)، `budget_alerts_enabled` (true)، `notification_titles {Neutral|Names}` (Neutral، TD-06)، `today_feed {Off|Neutral|Names}` (Neutral)، `calendar_feed {Off|Neutral|Names}` (Off)، `home_absence_signal` (false، **يرسل لـHome فقط تواريخ غياب**، TD-07)، `memory_prompt_after_days` (1)، `review_prompt_after_days` (2)، `offline_pack_auto` (true عند Wi-Fi قبل الرحلة بـ3 أيام)، `offline_pack_include_media` (false)، `section_lock {None|AppLock|SeparatePin}` (AppLock)، `integrations {finance, calendar, today, knowledge, relationships, home, shopping, inventory}` (كلها true عدا home).

### 5.2 الوجهات (Destinations)
**`tr_destinations`** (Tier: Normal)
| الحقل | النوع | إلزامي | ملاحظة |
| :---- | :---- | :---- | :---- |
| id / user_id | UUID | نعم | |
| name | text | نعم | `UNIQUE(user_id, lower(name), country_code)` بين غير المحذوفة |
| country_code | char(2) | لا | ISO-3166 (نص حر `country` للعرض) |
| country / city / region | text | لا | |
| timezone | text (IANA) | **نعم لكل وجهة تُستخدم في محطة** | يُتحقق من وجودها في قاعدة tzdata المضمّنة (TV-04) |
| intent | enum | نعم | `Wishlist|Planned` **يدوي** فقط؛ `Visited` **مشتقة** (§6.13، TC-12) |
| rating | int 1–5 | لا | تقييمي شخصي بعد الزيارة |
| best_time_note_enc | bytea | لا | نص حر (لا بيانات طقس، CX-22) |
| url / map_link | text | لا | رابط يلصقه المستخدم؛ لا نجلب منه شيئًا |
| lat / lng | decimal | لا | اختياري للعرض على خريطة المستخدم؛ Sensitive |
| knowledge_ref | ref | لا | بحث مفصّل في Knowledge |
| notes_enc | bytea | لا | |
| archived | bool | نعم | |
**مشتق (في الكاش):** `status_effective = Visited` إذا وُجدت محطة `Completed` أو رحلة مكتملة تضمها؛ `visit_count`; `last_visit_date`.

### 5.3 الرحلات (Trips)
**`tr_trips`** (Tier: Sensitive)
| الحقل | النوع | إلزامي | ملاحظة |
| :---- | :---- | :---- | :---- |
| name | text | نعم | |
| status | enum | نعم | `Idea|Planning|Booked|Active|Completed|Cancelled` (§9.1) |
| trip_type | enum | نعم | `Solo|Family|Couple|Friends|Work|Mixed` |
| start_date / end_date | date | لا في `Idea` / نعم من `Planning` | **محلية للمحطة الأولى/الأخيرة** (TC-02) |
| date_flexibility | enum | لا | `Exact|Approx|Month` للـIdea |
| base_currency | char(3) | نعم | عملة ميزانية الرحلة |
| budget_amount | decimal | لا | **مشتق افتراضيًا** = مجموع بنود الميزانية بالعملة الأساسية؛ يمكن وضع سقف يدوي `budget_cap` |
| budget_cap | decimal | لا | سقف اختياري (يغلب في التنبيه) |
| main_purpose | text | لا | |
| work_trip_ref | ref | لا | اجتماع/مشروع في Knowledge |
| finance_goal_ref | ref | لا | هدف ادخار للرحلة (CX-11) |
| cloned_from_trip_id | UUID | لا | نسخ رحلة سابقة (TE-08) |
| cancel_reason_enc | bytea | لا | |
| notes_enc | bytea | لا | |
**مشتقات:** `duration_days`، `nights`، `leg_count`، `countries`، `timezone_changes` (§6.1، §6.2).
**جدول المحطات `tr_trip_destinations`** (TC-01): `id, trip_id, user_id, seq int, destination_id FK, arrive_date, depart_date, tz (نسخة من الوجهة وقت الإضافة، قابلة للتعديل), leg_status {Planned|Active|Completed|Skipped}`; `UNIQUE(trip_id, seq)`؛ المحطات متتالية لا تتداخل مع **سماح** بيوم تبديل (TV-06).

### 5.4 الرفاق وقوائم ما قبل السفر
**`tr_trip_companions`** (Tier: Sensitive): `id, trip_id, user_id, person_ref (ref إلى Relationships) NULL, name_snapshot text, free_name text NULL, role {Adult|Child|Infant|Other}, notes_enc` — إما `person_ref` أو `free_name` (TV-07). **لا إنشاء Person من هنا**؛ زر «افتح في Relationships» فقط (CX-01).
**`tr_trip_tasks`** (قائمة ما قبل السفر داخل الرحلة): `id, trip_id, user_id, title_enc, due_date, done, done_at, task_ref NULL (إن حُوِّلت إلى Core Task)`؛ **ليست نظام مهام** — قائمة مرجعية صغيرة (TG-05).

### 5.5 بنود البرنامج (Itinerary)
**`tr_itinerary_items`** (Tier: Sensitive)
| الحقل | ملاحظة |
| :---- | :---- |
| trip_id / user_id | FK مركّب |
| local_date | يوم البند (محلي للمحطة) |
| start_local_time / end_local_time | لا إلزام؛ بند «يوم كامل» مسموح |
| tz | يرث من المحطة أو من الحجز (TC-04) |
| end_day_offset | int ≥0 (0/1/2) — يعالج عبور منتصف الليل (TC-03) |
| start_utc / end_utc | مشتقان |
| type | `Activity|Transit|Meal|Rest|FreeTime|Meeting|Event|Custom` |
| title_enc, location_enc | |
| booking_id | FK داخلي NULL — **إذا وُجد فالبند يرث الأوقات والمنطقة من الحجز ولا يُحرَّران** (`time_source = Booking`) |
| destination_id / leg_id | NULL |
| place_id | NULL (مكان من §5.9) |
| status | `Planned|Done|Skipped|Moved` |
| sort_order | ترتيب داخل اليوم لغير المؤقتة |
| experience_id | NULL (يُملأ عند «حدث هذا») |
| calendar_exposed | bool افتراضي true للمؤقتة |
**قاعدة:** ينتهي البند قبل بدايته فقط إذا `end_day_offset=0` و`end_local_time < start_local_time` ⇒ **رفض** مع اقتراح «ينتهي في اليوم التالي؟» (TV-09).

### 5.6 الحجوزات
**`tr_bookings`** (Tier: Sensitive؛ رمز التأكيد مشفّر)
| الحقل | ملاحظة |
| :---- | :---- |
| trip_id | **اختياري** (حجز قبل إنشاء الرحلة مسموح، TG-12) |
| type | `Flight|Hotel|Train|Bus|Car|Activity|Ferry|Insurance|Other` |
| provider_enc | الجهة |
| confirmation_code_enc | رمز التأكيد؛ يظهر **مقنَّعًا** في القوائم، كاملًا بعد فتح تفصيل الحجز (TG-17) |
| booking_made_date | date |
| start_local_at / end_local_at + start_tz / end_tz | **مصدر الحقيقة للأوقات**؛ مثال طيران: إقلاع `Africa/Cairo` وهبوط `Europe/London` |
| from_location_enc / to_location_enc / location_enc | |
| cost_amount / cost_currency | **سعر الحجز** (التزام، ليس معاملة) |
| amount_paid_declared | اختياري: مبلغ مدفوع يدويًا بلا Finance (يُعامل معلوماتيًا فقط) |
| cancellation_deadline_local_at + tz | موعد الإلغاء المجاني بتوقيت **مكان الحجز**؛ `cancellation_deadline_utc` مشتق |
| refundable | `Yes|No|Partial|Unknown` |
| status | `Planned|Confirmed|Changed|Cancelled|Completed|NoShow` (§9.3) |
| document_id | FK داخلي NULL (التذكرة/القسيمة من §5.11) |
| guests | int (فندق) |
| notes_enc | |
**جدول `tr_booking_events`** (append-only، TG-11): `id, booking_id, user_id, at, kind {Created|Confirmed|Changed|CancelRequested|Cancelled|Refunded|PaymentLinked|NoShow|Note}, before_json_enc, after_json_enc, actor {User|Import}` — يحفظ ما تغيّر (يغني عن «تعديل الحجز يكسر الذكريات»، TT-09).
**`tr_finance_links`** (CX-03): `id, user_id, source_type {travel_booking|travel_expense}, source_id, kind {Payment|Deposit|Balance|Refund}, amount, currency, finance_transaction_ref NULL, sync_status {NotRequired|Pending|Synced|Failed|Detached|Legacy}, source_key UNIQUE, last_error_code, attempts, synced_at` — **صف لكل دفعة حقيقية**.

### 5.7 الميزانية والمصروفات
**`tr_budget_lines`** (Tier: Sensitive): `id, trip_id, user_id, category {Transport|Accommodation|Food|Activities|Shopping|Insurance|Visa|Other}, planned_amount, currency, leg_id NULL, notes_enc` — `UNIQUE(trip_id, category, currency, coalesce(leg_id))` (TV-12).
**`tr_expenses`** (التقاط سريع أثناء الرحلة، TC-06): `id, trip_id NULL, user_id, local_date, tz, amount, currency, category, merchant_enc NULL, payment_method_hint {Cash|Card|Other}, frozen_rate NULL, rate_source, note_enc NULL, finance_link_id NULL, capture_state {Captured|Queued|Posted|Failed}` — **كل صف = معاملة واحدة في Finance** عبر `tr_finance_links` (`source_type=travel_expense`). لا نكرر الحساب المالي: Travel لا يعرف الرصيد ولا الحساب، يرسل `account_hint` اختياريًا فقط ويُحل في Finance (TD-04).
**مبلغ مخطط/فعلي:** الفعلي يقرأ من Finance بمجاميع `trip_id` (§11.3)؛ `tr_expenses` غير الموجّلة تعرض مؤقتًا كـ«مسجّل محليًا — بانتظار Finance».

### 5.8 التعبئة
**`tr_packing_lists`** (Tier: Normal): `id, trip_id NULL (قالب إن NULL), user_id, name, is_template bool, status {Draft|InProgress|Ready|Done}, owner_person_ref NULL, owner_free_name NULL, notes_enc`.
**`tr_packing_items`**: `id, list_id, user_id, item_name, category (Clothing|Toiletries|Electronics|Documents|Health|Kids|Other|مخصّص), quantity int ≥1, packed bool, optional bool, owner_kind {Me|Companion|Shared}, owner_person_ref NULL, owner_free_name NULL, weight_g int NULL, volume_note NULL, inventory_item_ref NULL, shopping_ref NULL, sort_order`.
**القوالب:** قوالب مبنية (طقس حار/بارد/عمل/شاطئ/أطفال) **نصوص افتراضية قابلة للتعديل** تُنشأ محليًا لا من مصدر خارجي (TE-04).

### 5.9 الأماكن
**`tr_places`** (Tier: Sensitive): `id, user_id, trip_id NULL, destination_id NULL, name_enc, type {Attraction|Restaurant|Cafe|Hotel|Museum|Nature|Shop|Other}, priority {Must|Nice|Maybe}, intent {Wishlist|Planned|Skipped}` (**Visited مشتقة** من وجود تجربة مرتبطة، §6.13، TC-11), `address_enc, url, estimated_cost_amount, estimated_cost_currency, opening_note_enc, rating, notes_enc`.

### 5.10 التجارب
**`tr_experiences`** (Tier: Sensitive): `id, user_id, trip_id NULL (CX-20), title_enc, type {Meal|Activity|Show|Sightseeing|Event|Social|Nature|Other}, local_date, local_time NULL, tz, location_enc, place_id NULL, itinerary_item_id NULL, rating 1–5 NULL, highlights_enc, notes_enc, cost_amount NULL, cost_currency NULL` (**معلوماتية فقط**، TC-08)، `would_repeat bool NULL`, `source {Manual|FromItinerary}`.
**`tr_experience_people`**: `experience_id, user_id, person_ref NULL, free_name NULL` — يغذي اقتراح «سجّل لقاءً» في Relationships (TA-12).

### 5.11 المستندات
**`tr_documents`** (Tier: **Secret** افتراضيًا): `id, user_id, trip_id NULL, type {Passport|Visa|NationalID|DriverLicense|Insurance|Ticket|HotelVoucher|VaccinationCert|Other}, display_name, masked_reference (آخر 4 فقط، يُولَّد عند الإدخال ولا يُقرأ منه الأصل), country_code NULL, issue_date, expiry_date, reminder_days int[] NULL, file_ref (Core Files) NULL, offline_cached bool, offline_cache_expires_at NULL, holder_kind {Me|Companion}, holder_person_ref NULL, holder_free_name NULL, notes_enc`.
**ممنوع تخزين الرقم الكامل** في أي عمود هنا (TV-15). **القاعدة المشتقة:** `validity_ok_for_trip` حسب `passport_min_validity_months` (§6.10، TC-15 — وسم «غير مؤكد»).

### 5.12 الذكريات
**`tr_memories`** (Tier: Sensitive): `id, user_id, trip_id NULL, experience_id NULL, local_date, tz, title_enc, description_enc, location_enc, tags text[], is_favorite bool`.
**`tr_memory_media`**: `memory_id, user_id, file_ref (Core Files), kind {Photo|Video|Audio|Note}, caption_enc, sort_order`.
**`tr_memory_people`**: `memory_id, user_id, person_ref NULL, free_name NULL`.
> **الذكرى لا تعتمد على الحجز** (TC-09): حذف/تعديل حجز أو بند برنامج لا يمسها؛ `experience_id` تفضيلي فقط.

### 5.13 مراجعة الرحلة
**`tr_trip_reviews`** (Tier: Sensitive): `id, trip_id UNIQUE, user_id, overall_rating, best_parts_enc, worst_parts_enc, lessons_enc, favorite_place_id NULL, would_repeat {Yes|No|Maybe}, notes_enc, spent_snapshot_json (لقطة وقت المراجعة: {currency: amount}, rates_used, taken_at), reviewed_at` (TC-23). تحديث اللقطة يدوي «حدّث الأرقام» ولا يتغير تلقائيًا.

### 5.14 الأنواع والمشتقات والبنية التحتية
- **`tr_derived_cache`**: `entity, entity_id, key, value_json, inputs_hash, computed_at` — يغطي المدة/الليالي/تقدم التعبئة/حالة المستند/الميزانية/زيارة الوجهة.
- **`tr_outbox`**: أحداث خارجة بترتيب وإعادة إرسال (CX-17): `id, event_type, payload_json, idempotency_key, attempts, next_attempt_at, status`.
- **`tr_offline_ops`** (جانب الخادم لإزالة التكرار): `client_op_id UNIQUE, applied_at, result_json`.
- **`tr_conflicts`**: `id, entity, entity_id, local_version, server_version, local_json_enc, server_json_enc, resolved_by {User|Auto}, resolution`.
- **`tr_offline_packs`**: `trip_id, user_id, built_at, size_bytes, includes {itinerary,bookings,documents,packing,places,expenses}, status`.
- **`tr_import_batches`** (CSV/ICS): `id, kind, dry_run, rows_total, rows_ok, rows_failed, report_json`.
- **`tr_audit_log`** (append-only): الوصول للمستندات الأصلية وتغيير الأقفال (بلا قيم).
- **`tr_notifications_log`**: `kind, entity_id, sent_at, dedupe_key UNIQUE`.
- **فهارس رئيسية:** `tr_trips(user_id,status,start_date)`، `tr_itinerary_items(trip_id,local_date,sort_order)`، `tr_bookings(user_id,cancellation_deadline_utc) WHERE status IN ('Planned','Confirmed')`، `tr_documents(user_id,expiry_date)`، `tr_expenses(trip_id,local_date)`، `tr_finance_links(user_id,sync_status)`، `tr_experiences(user_id,local_date)`، `tr_places(user_id,intent)`، `tr_memories(user_id,trip_id,local_date)`.
- **التقسيم والاحتفاظ:** لا يوجد تحويل شكلي؛ الحذف الناعم 30 يومًا ثم حذف نهائي، والمستندات والوسائط تُحذف مرجعها فقط (الملف عند Core).

---

## 6) محرك الحساب

> كل ما هنا **مشتقات** تُحسب على الخادم وتُخزَّن في `tr_derived_cache` (قابلة لإعادة البناء) وتُحسب على الجهاز للأوفلاين بنفس الخوارزمية (TV-30). لا حقل مشتق يُحرَّر.

### 6.1 المدة والليالي (TF-08)
- `duration_days = end_date − start_date + 1` (شامل اليومين).
- `nights = duration_days − 1`.
- رحلة بمحطات: `start_date` = أول `arrive_date` و`end_date` = آخر `depart_date` (محليّين)؛ **لا نحسب المدة بالساعات** فلا يخطئ عبور منتصف الليل.
- **مثال:** 10 نوفمبر → 17 نوفمبر ⇒ `duration_days = 8`، `nights = 7`.
- رحلة بيوم واحد: `duration_days=1`, `nights=0`.
- رحلة بلا تواريخ (`Idea`): المدة غير محسوبة وتعرض «—».

### 6.2 تحويل المناطق الزمنية والمدد
- `utc_at = local_to_utc(local_date + local_time, tz)` باستخدام tzdata المضمّنة بالتطبيق **والخادم بنفس الإصدار** (يُخزَّن `tzdata_version` مع كل حساب، TV-04).
- **مدة التنقل** = `arr_utc − dep_utc`.
- **مثال (طيران):** إقلاع 2026-11-10 23:30 `Africa/Cairo` (UTC+2) ⇒ 21:30Z؛ هبوط 2026-11-11 03:40 `Europe/London` (UTC+0) ⇒ 03:40Z. المدة = **6س 10د** (رغم أن فرق الساعات المحلية 4س 10د). `end_day_offset` للوصول = 1 بالنسبة للمغادرة.
- **الوقت المحلي غير الموجود** (فجوة التقديم الصيفي) يُرفض ويُقترح أقرب صحيح؛ **الوقت المكرر** (الإرجاع) يطلب اختيار الأول/الثاني (TV-05).
- **تغيّر قواعد المنطقة بعد الحفظ:** إن تغيّر tzdata، تُعاد حسابات `utc_at` للأحداث المستقبلية فقط، ويظهر إشعار «تغيّر توقيت بعض بنودك» (TG-19).

### 6.3 وراثة الأوقات من الحجز (TC-04)
عند ربط بند برنامج بحجز (`booking_id`):
`item.start/end/tz ← booking.start/end/tz`، و`time_source=Booking` ويصير حقلا الوقت للقراءة فقط؛ تعديل الحجز يحدّث البند. فك الربط يحوّل `time_source=Manual` ويُبقي القيم الحالية. حجز **طيران** يولّد بندين اختياريين: «إقلاع» في منطقة الإقلاع و«هبوط» في منطقة الهبوط (`type=Transit`)، وحجز **فندق** يولّد «تسجيل الوصول» (يوم الوصول) و«المغادرة» (يوم المغادرة) ولا يملأ الأيام بينهما.

### 6.4 التحقق من الزمن (TF-13)
1. `start ≤ end` عند `end_day_offset = 0`؛ وإلا رفض `ITINERARY_END_BEFORE_START` مع اقتراح «ينتهي اليوم التالي؟».
2. `end_day_offset ∈ {0,1,2}`.
3. `local_date` ضمن `[trip.start_date, trip.end_date]` **أو** تحذير (لا رفض) خارج التواريخ — يمكن بند «قبل الرحلة/بعدها» (TV-10).
4. تداخل بنود في اليوم **تحذير ناعم** وليس رفضًا (الغداء والمشي معًا مشروع).
5. بند بلا وقت = يوم كامل ويعرض في أعلى اليوم.

### 6.5 مواعيد الإلغاء والتذكيرات (TA-02)
- `cancellation_deadline_utc` مشتق من الموعد المحلي + منطقة الحجز.
- التذكير عند `deadline_utc − h` لكل `h` في `cancel_reminder_hours_default` (افتراضي 72 و24 ساعة)؛ **يُعرض بتوقيت المستخدم الحالي ويُذكر توقيت الحجز أيضًا** («ينتهي 23:59 بتوقيت لشبونة = 01:59 بتوقيتك»).
- لا تذكير إن `status ∈ {Cancelled, Completed, NoShow}` أو `refundable = No`؛ وإن `refundable=Unknown` يعرض تذكير بصياغة «تحقق من شروط الإلغاء».
- بعد انقضاء الموعد: يبقى الحجز بشارة «انتهى الإلغاء المجاني» ولا يُحذف أي سجل.

### 6.6 الميزانية المخططة
- `planned_total[currency] = Σ planned_amount` لكل عملة على حدة.
- `planned_total_in_base` **فقط إذا** توفر سعر لكل عملة غير الأساسية (من Finance الحالي أو `frozen_rate` يدوي)؛ وإلا تعرض المجاميع **لكل عملة** ويُوسَم الإجمالي «غير كامل التحويل».
- إن وُجد `budget_cap` فهو المرجع في التنبيه، وإلا `planned_total_in_base`.

### 6.7 الفعلي من Finance (TF-19)
- `actual[currency, category] = GET /finance/transactions/summary?dimension=trip_id&trip_id=…&group=category` (§11.3) — يشمل المصروفات المدفوعة من الحجوزات والمصروفات الملتقطة **ما دامت متزامنة** (`Synced`).
- `pending_local[currency, category] = Σ tr_expenses WHERE capture_state ≠ Posted` + `Σ Pending/Failed` من `tr_finance_links` — **تُعرض منفصلة** («بانتظار المزامنة») ولا تُجمع صامتة مع الفعلي.
- **الاستردادات:** حركة `Refund` مرتبطة بحجز تُطرح من فئة الحجز (تتولاها Finance) ويرى Travel الصافي.
- لا يخمّن Travel أي مبلغ؛ إن كان Finance غير متاح: «الفعلي غير متاح الآن» + `pending_local` فقط.

### 6.8 تعدد العملات والتجميد (CX-14، TC-07)
- القيد بعملة أجنبية يُحفظ بعملته الأصلية دائمًا. للعرض بالعملة الأساسية:
  1. `rate_policy=FinanceCurrent` ⇒ `GET /finance/exchange-rates/current?from&to` وقت العرض؛
  2. أو `frozen_rate` وقت الالتقاط (`rate_source=FinanceSnapshot|Manual`) فيصير **ثابتًا** للمراجعة (§6.14).
- **لا تحويل يخلط عملتين بلا سعر**؛ ويُعرض «لا يوجد سعر لـ GBP→EUR» مع حقل إدخال يدوي.
- **مثال:** ميزانية `EUR`. فندق 650 EUR (Finance، Synced). قهوة وتاكسي ملتقطة 40 GBP بـ`frozen_rate=1.16` ⇒ 46.40 EUR. المجموع المعروض = 696.40 EUR مع سطر منفصل «40.00 GBP مجمَّدة بسعر 1.16 بتاريخ…».
- التقريب: نصف زوجي (`ROUND_HALF_EVEN`) إلى خانتين عند العرض فقط؛ التخزين 4 خانات.

### 6.9 حالة الميزانية والتنبيهات (TA-06)
- `used_pct = actual_in_base / reference_total` (reference = cap أو planned).
- `Under < 80%`، `Near 80–99.99%`، `Over ≥ 100%` (قابلة للضبط). **صياغة محايدة:** «بلغت 82% من ميزانية الرحلة». لا «أفرطت».
- فئة بلا مخطط وبفعلي > 0 ⇒ `Unplanned` (لا تنبيه Over).
- تنبيه لكل عتبة مرة واحدة (`dedupe_key = trip:threshold`)، وإعادة عند تغيير الميزانية.

### 6.10 صلاحية المستندات (TF-34، TC-15)
- `days_to_expiry = expiry_date − today(home_timezone)`.
- حالات: `Valid`, `Expiring (≤ أكبر reminder_days)`, `Expired`.
- **قاعدة الجواز (غير مؤكد — يتحقق المستخدم):** `validity_ok_for_trip = expiry_date ≥ trip.end_date + passport_min_validity_months`. إذا فشلت ⇒ تحذير معلوماتي «قد لا تتوافق صلاحية الجواز مع شروط بعض الدول — تحقق من الوجهة»؛ **ليست نصيحة قانونية ولا تمنع الحفظ**.
- **مثال:** نهاية الرحلة 2026-11-17، الحد 6 أشهر ⇒ المطلوب `expiry ≥ 2027-05-17`. جواز ينتهي 2027-03-01 ⇒ تحذير.
- التأشيرات: `valid_from/valid_to` اختياريان في الملاحظات؛ **لا يعرف النظام متطلبات أي دولة**.
- تذكيرات الانتهاء: عند كل `reminder_days` (90/30/7) مرة لكل عتبة.

### 6.11 التعبئة
- `progress = packed_required / total_required` (البنود غير الاختيارية فقط)؛ الاختيارية تُعرض منفصلة.
- `weight_total_g = Σ quantity × weight_g` للبنود المعلومة؛ `unknown_weight_count` يُعرض.
- `status` القائمة: `Draft` بلا بنود، `InProgress` ≥1 معبأ، `Ready` كل المطلوب معبأ، `Done` عند بدء الرحلة (أو يدويًا).
- النسخ من قالب/رحلة سابقة **ينسخ البنود بـ`packed=false`**.

### 6.12 انتقالات حالة الرحلة المقترحة (TC-13)
قواعد **اقتراح** (تنتظر موافقة بنقرة إلا حالتي Active/Completed حين يُفعَّل الأوتوماتيك):
- `Idea → Planning`: عند إضافة تواريخ أو أول حجز.
- `Planning → Booked`: كل حجوزات النقل والإقامة الرئيسية `Confirmed` (أو بنقرة يدوية).
- `Booked → Active`: عند `now ≥ start_date 00:00 (tz المحطة الأولى)`.
- `Active → Completed`: عند `now > end_date 23:59 (tz المحطة الأخيرة)`.
- أي حالة (عدا Completed) → `Cancelled` يدويًا مع سبب اختياري؛ الحجوزات المرتبطة **لا تُلغى تلقائيًا** بل تُقترح للمراجعة (TG-10).
- الرجوع من `Completed` لـ`Active` ممنوع؛ يُسمح بـ«إعادة فتح» لتعديل البيانات فقط (TV-18).

### 6.13 «تمت زيارتها» المشتقة (TC-11, TC-12)
- **وجهة** `Visited` ⇔ وُجدت محطة `leg_status=Completed` **أو** رحلة `Completed` تتضمنها **أو** تجربة بتاريخ ماضٍ وربطها `destination_id`.
- **مكان** `Visited` ⇔ وُجدت `tr_experiences.place_id = place.id` بتاريخ ≤ اليوم.
- `intent=Wishlist/Planned/Skipped` يدويان ويبقيان؛ العرض يدمج: `status_effective`.
- لا يمكن وضع Visited يدويًا؛ زر «زرتها من قبل» ينشئ تجربة موجزة (TE-09).

### 6.14 لقطة المراجعة (TC-23)
عند فتح/حفظ المراجعة: `spent_snapshot = actual summary + pending_local` بكل عملة وسعر مستخدم؛ مجموعات: `per_person = total / (1 + companions)` و`per_day = total / duration_days` (بالعملة الأساسية إن توفر تحويل) — وتُعرض كأرقام لا أحكام. تحديث اللقطة يدوي.

### 6.15 «ما الآن؟» لـToday (TC-17)
لـ`GET /travel/feed/today`: بنود اليوم بحسب **منطقة المحطة الحالية** (من المحطة النشطة أو tz الجهاز عند Active)، بترتيب `start_utc`. الرحلة القادمة: عدّاد أيام + حجوزات الـ48 ساعة القادمة + مستندات منتهية. قبل السفر: عدّاد «بعد N يوم» بتوقيت `home_timezone`.

### 6.16 حزمة الأوفلاين (TG-06)
`pack_items = {trip, legs, itinerary(≥اليوم−1), bookings (مع رموز التأكيد مشفّرة محليًا), packing, places(لهذه الرحلة), expenses queue, documents marked offline_cached (ملفات مشفّرة بمفتاح الجهاز، مدة صلاحية قابلة للضبط)}`؛ الحجم التقديري يُعرض قبل التحميل؛ الوسائط والخرائط **مستثناة** افتراضيًا.

---

## 7) سجل التعارضات المحسومة (TC)

| ID | التعارض | الحل المعتمد | أين |
| :---- | :---- | :---- | :---- |
| TC-01 | `destination_ids` مصفوفة بلا ترتيب أو تواريخ | جدول `tr_trip_destinations` مرتّب بتواريخ دخول/خروج ومنطقة لكل محطة | §5.3 |
| TC-02 | تواريخ الرحلة مقابل تواريخ المحطات | تواريخ الرحلة **مشتقة** من المحطات إن وُجدت؛ يدوية إن لم توجد؛ تعارض ⇒ تحذير (TV-06) | §5.3، §6.1 |
| TC-03 | `end_time < start_time` مرفوض مقابل الرحلات الليلية | `end_day_offset` صريح؛ الرفض فقط حين offset=0 | §6.4 |
| TC-04 | وقتان للحدث الواحد (حجز + بند) | الحجز مصدر الحقيقة؛ البند يرث ويُقفل | §6.3 |
| TC-05 | `Booking.cost` مقابل «Finance يملك المدفوعات» | `cost` = سعر الحجز (التزام) فقط؛ الدفع معاملة Finance عبر `tr_finance_links` (عربون/باقي/استرداد) | §5.6، §11.3 |
| TC-06 | مصروف يومي لا يمرّ بالحجز لكن الفعلي «من Finance» | `tr_expenses` التقاط يكتب إلى Finance بـ`trip_id` (saga، بلا تكرار) | §5.7 |
| TC-07 | عملات متعددة وبلا أسعار صرف | قيم أصلية دائمًا + `frozen_rate` أو قراءة Finance؛ لا تحويل صامت | §6.8 |
| TC-08 | `Experience.cost` يزدوج مع Finance | حقل معلوماتي فقط ولا يدخل الفعلي؛ زر «سجّل الدفع» يمر عبر المصروف | §5.10 |
| TC-09 | Memory مقابل Experience مقابل Booking | الذكرى مستقلة؛ حذف/تعديل الحجز لا يمسها | §5.12 |
| TC-10 | Itinerary (مخطط) مقابل Experience (حدث) | «حدث هذا» ينشئ تجربة مرتبطة ولا ينسخ البند | §5.5، §5.10 |
| TC-11 | `Place.trip_id` إلزامي مقابل أماكن بلا رحلة | اختياري؛ Visited مشتقة | §5.9، §6.13 |
| TC-12 | حالة وجهة يدوية `Visited` | مشتقة من المحطات/التجارب | §6.13 |
| TC-13 | حالات الرحلة يدوية بلا قواعد | اقتراحات انتقال بالتواريخ + موافقة | §6.12 |
| TC-14 | `file` في المستند بلا مكان تخزين (لا Documents OS) | `file_ref` في Core Files (Secret) + كاش أوفلاين مشفّر | §5.11 |
| TC-15 | قاعدة الجواز 6 أشهر مذكورة في Notion فقط | قاعدة **قابلة للضبط** وموسومة غير مؤكد؛ لا معرفة بمتطلبات الدول | §6.10 |
| TC-16 | غياب البيت: مشاركة مع Home مقابل الخصوصية | حدث غياب اختياري مغلق افتراضيًا، تواريخ فقط (TD-07) | §11.2 |
| TC-17 | Calendar: نسخ البنود مقابل feed | feed بمصدر `source_id` ولا استنساخ (TT-08) | §11.1 |
| TC-18 | Shopping (`ForTrip`) مقابل Packing | Packing يقرأ المراجع؛ الشراء عند Shopping ولا تكرار | §11.4 |
| TC-19 | هدايا السفر/الهدايا التذكارية: Relationships أم Travel؟ | الشراء عبر Shopping (`ForTrip`) أو Relationships؛ Travel لا يملك مشتريات | §11.4 |
| TC-20 | قوائم التعبئة مرتبطة برحلة فقط | قالب (`trip_id` NULL) + نسخ للرحلة | §5.8 |
| TC-21 | `Packing.owner` نص حر | `owner_kind` + `person_ref` أو اسم حر | §5.8 |
| TC-22 | ميزانية بعملات متعددة ومجموع واحد | مجاميع لكل عملة + إجمالي مشروط بالأسعار | §6.6 |
| TC-23 | `total_spent` مشتق يتغير بعد المراجعة | لقطة وقت المراجعة + «حدّث الأرقام» | §6.14 |

> **ما لم يتغير عمدًا:** الدورة الكاملة للرحلة، الكيانات الأحد عشر، دورها كمالك واحد لكل شيء، وأن **Finance** وحده يحتفظ بالمدفوعات.

---

## 8) الفجوات والتحسينات المضافة

### 8.1 الفجوات المسدودة (TG)
| ID | الفجوة | المعالجة |
| :---- | :---- | :---- |
| TG-01 | لا مفهوم للمحطات في رحلة متعددة المدن | `tr_trip_destinations` مرتّبة بتواريخ ومناطق (TC-01) |
| TG-02 | لا نموذج للرفاق | `tr_trip_companions` بمرجع Relationships أو اسم حر |
| TG-03 | لا مصروفات يومية | `tr_expenses` التقاط سريع يكتب إلى Finance |
| TG-04 | لا تعامل مع الأطفال/الرضّع في المستندات والتعبئة | `holder_kind=Companion` + قوالب أطفال |
| TG-05 | لا قائمة «قبل السفر» | `tr_trip_tasks` قائمة صغيرة قابلة للتحويل إلى Core Task |
| TG-06 | لا أوفلاين مخصَّص للسفر | **حزمة أوفلاين** للرحلة (§6.16، §13) |
| TG-07 | لا ربط بين الحجز والبرنامج (وقتان) | الوراثة والقفل (TC-04) |
| TG-08 | لا حالة «تغيّر الحجز/لم يحضر» | حالات `Changed`/`NoShow` + سجل أحداث |
| TG-09 | لا تعامل مع العربون والباقي والاسترداد | `tr_finance_links.kind` |
| TG-10 | **الرحلة الملغاة** بلا تبعات | عند الإلغاء: قائمة مراجعة للحجوزات (إلغاء/استرداد) والتذكيرات تتوقف، والبيانات تبقى |
| TG-11 | لا تاريخ لتعديلات الحجز | `tr_booking_events` append-only |
| TG-12 | لا حجز قبل إنشاء الرحلة | `trip_id` اختياري ثم «أضف إلى رحلة» |
| TG-13 | لا إعادة استخدام رحلة | نسخ الرحلة (TE-08) |
| TG-14 | لا موضع لـ«يوم بلا خطة» | بنود `FreeTime/Rest` + «يوم حر» بنقرة |
| TG-15 | المدفوعات النقدية بلا قيد | مصروف نقدي بـ`payment_method_hint=Cash` يُرسل إلى Finance (حساب نقد يحدّده Finance) |
| TG-16 | لا قواعد اللمس بالأوفلاين | طابور عمليات + حل تعارض (§13) |
| TG-17 | رمز التأكيد ظاهر | إخفاء افتراضي + «اضغط للإظهار» |
| TG-18 | لا ربط بتأمين السفر | نوع حجز `Insurance` + مستند |
| TG-19 | تغيّر tzdata بعد الحفظ | إعادة حساب المستقبل + إشعار (§6.2) |
| TG-20 | لا تصدير/نسخة للأسرة | ملف PDF/ICS للبرنامج **بلا مستندات ورموز** (TE-12) |
| TG-21 | لا قفل لقسم السفر | `section_lock` (§14) |
| TG-22 | لا تجارب خارج الرحلات | CX-20: `trip_id` اختياري |
| TG-23 | لا يوم وصول/مغادرة منفصل للفندق | بنود Check-in/Check-out مولّدة (§6.3) |
| TG-24 | لا تأكيد قبل الحذف المتسلسل | حذف رحلة: يعرض ما سيحذف (برنامج/ميزانية/تعبئة) وما يبقى (الذكريات/Finance) |

### 8.2 التحسينات المضافة (TE)
| ID | التحسين | الفائدة |
| :---- | :---- | :---- |
| TE-01 | **«وصول سريع» أوفلاين:** شاشة من 4 بطاقات (الحجز القادم، المستند، عنوان الإقامة، رقم الطوارئ الذي أدخلته) | تذكرتك في المطار بنقرتين |
| TE-02 | عدّاد «بعد N يوم» وعرض «اليوم X من Y» أثناء الرحلة | إحساس بالوقت |
| TE-03 | عرض **الوقت في وجهتك مقابل بيتك** على بطاقة الرحلة | يمنع أخطاء التواصل |
| TE-04 | قوالب تعبئة افتراضية (حار/بارد/شاطئ/عمل/أطفال) تُحرَّر | بداية سريعة |
| TE-05 | «مصروف سريع» بنقرتين: مبلغ + فئة (العملة الأخيرة افتراضية) | يعمل بلا شبكة |
| TE-06 | لمحة يومية «اليوم» (بنود + مصروف اليوم) | وضوح |
| TE-07 | استيراد بنود من ICS ومن CSV | بلا قراءة بريد (CX-22) |
| TE-08 | **نسخ رحلة** سابقة (بنود/تعبئة/قوائم دون حجوزات أو تواريخ) | رحلة سنوية متكررة |
| TE-09 | «زرتها من قبل» ينشئ تجربة موجزة | سجل سريع |
| TE-10 | خط زمني للتجارب والذكريات بالسنة | تصفح الماضي |
| TE-11 | بطاقة «عندي كذا من الحجوزات ينتهي إلغاؤها هذا الأسبوع» | حماية المال |
| TE-12 | تصدير برنامج للأسرة **نظيف** (بلا رموز ومستندات) | مشاركة آمنة |
| TE-13 | وضع «بلا ميزانية» (تعطيل الميزانية والتنبيهات) | لمن لا يريدها |
| TE-14 | «ماذا بعد؟» أثناء الرحلة: البند التالي بوقته المحلي وتحويله لتوقيت بيتك | تنقل أسهل |

---

## 9) دورات الحياة وقواعد التحقق

### 9.1 الرحلة
```text
Idea ──(تواريخ/حجز)──> Planning ──(كل الحجوزات الرئيسية مؤكدة)──> Booked ──(بدء)──> Active ──(انتهاء)──> Completed
  └───────────────────────────── Cancelled (يدويًا من أي حالة قبل Completed) ──> يمكن "إعادة التخطيط" إلى Planning
```
- Completed ⇒ تظهر دعوة المراجعة (TA-08).
- Cancelled ⇒ تتوقف التذكيرات، تُعرض قائمة «حجوزات تحتاج متابعة»، تبقى الذكريات.

### 9.2 المحطة
`Planned → Active → Completed` أو `Skipped`؛ تتغير بالتاريخ وبالتحرير اليدوي؛ تغيير المحطة لا يغيّر الحجوزات.

### 9.3 الحجز
```text
Planned → Confirmed → Completed
   │         ├──> Changed (سجل أحداث) → Confirmed
   └─────────┴──> Cancelled (مع refundable/استرداد) | NoShow
```
- `Cancelled`: يقترح «سجّل الاسترداد» إن كان قد دُفع (رابط Finance نوع `Refund`).
- لا حذف نهائي لحجز عليه روابط Finance؛ أرشفة فقط (TV-22).

### 9.4 المستند
`Valid → Expiring → Expired`؛ تجديد المستند = **صف جديد** (التاريخ القديم يبقى) مع «استبدال»؛ حذف مستند = حذف المرجع والكاش المحلي ولا يمس ملف Core.

### 9.5 التعبئة
`Draft → InProgress → Ready → Done`؛ القالب لا يتغير بالتعبئة.

### 9.6 المصروف الملتقط
`Captured → Queued → Posted` أو `Failed` (يعاد عند عودة الشبكة؛ `source_key` يمنع التكرار)؛ تعديل مصروف `Posted` ⇒ **تصحيح** عبر Finance لا تعديل صامت (TV-25).

### 9.7 التجربة والذكرى والمكان
بلا حالات؛ أرشفة/حذف ناعم. حذف رحلة لا يحذف التجارب والذكريات (تصبح بلا رحلة) إلا بطلب صريح (TG-24).

### 9.8 قواعد التحقق (TV)
| ID | القاعدة |
| :---- | :---- |
| TV-01 | اسم الرحلة غير فارغ (≤120) |
| TV-02 | `end_date ≥ start_date` للرحلة |
| TV-03 | `base_currency` رمز ISO-4217 صالح |
| TV-04 | `tz` قيمة IANA موجودة في tzdata المضمّنة؛ تُحفظ `tzdata_version` |
| TV-05 | وقت محلي غير موجود (فجوة DST) يُرفض؛ وقت مكرر يتطلب اختيارًا |
| TV-06 | المحطات متتالية بلا تداخل أكثر من يوم التبديل؛ `arrive ≤ depart` |
| TV-07 | الرفيق: `person_ref` **أو** `free_name` (ليس كلاهما فارغًا) |
| TV-08 | `end_day_offset ∈ {0,1,2}` |
| TV-09 | `end < start` مرفوض فقط عند offset=0 |
| TV-10 | بند خارج تواريخ الرحلة ⇒ تحذير لا رفض |
| TV-11 | حجز: `end_local_at ≥ start_local_at` بعد التحويل إلى UTC |
| TV-12 | بند ميزانية واحد لكل (فئة، عملة، محطة) |
| TV-13 | `planned_amount ≥ 0` وبصيغة عشرية سليمة (≤4 خانات) |
| TV-14 | `frozen_rate > 0` ومصدره موسوم |
| TV-15 | **لا يُقبل رقم مستند كامل**: الحقل `masked_reference` يُقتطع إلى آخر 4 ويُرفض ما هو أطول |
| TV-16 | `expiry_date ≥ issue_date` |
| TV-17 | `reminder_days` أعداد صحيحة موجبة بحد أقصى 365 |
| TV-18 | الرحلة المكتملة لا تعود Active؛ «إعادة فتح للتحرير» تحفظ سجلًا |
| TV-19 | `quantity ≥ 1` في التعبئة ووزن ≥ 0 |
| TV-20 | `rating` بين 1 و5 |
| TV-21 | تجربة: `local_date` ≤ اليوم (+ يوم) أو تُوسَم مخططة |
| TV-22 | لا حذف نهائي لحجز/مصروف عليه رابط Finance غير `Detached` |
| TV-23 | `source_key` فريد لكل دفعة (منع الازدواج) |
| TV-24 | `client_op_id` فريد (إعادة التنفيذ آمنة) |
| TV-25 | تصحيح مصروف مرحَّل يمر عبر Finance |
| TV-26 | ملف مرفوع: الأنواع المسموحة وحد حجم، ولا تنفيذ |
| TV-27 | `url`: http/https فقط، لا جلب |
| TV-28 | `memory_media.file_ref` يشير إلى Core Files فقط |
| TV-29 | `person_ref` يتحقق من `ref_state` عند العرض لا عند الحفظ |
| TV-30 | خوارزميات الاشتقاق **متطابقة** بين الجهاز والخادم (اختبار تكافؤ بنفس مجموعة الحالات) |

---

## 10) تجربة المستخدم

### 10.1 التنقل والمبادئ
- شريط سفلي (موبايل): **الرئيسية · الرحلات · اليوم/الرحلة النشطة · الأماكن والتجارب · المزيد (وجهات، مستندات، ذكريات، إعدادات)**؛ في الويب شريط جانبي.
- **وضع الرحلة النشطة:** عند `Active` تتحول الرئيسية إلى «اليوم X من Y» + «ما بعد» + «مصروف سريع» + «وصول سريع» (TE-01، TE-14).
- RTL كامل، أرقام لاتينية للمبالغ والأوقات، تنسيق التاريخ حسب اللغة، **عرض الوقت دائمًا مع شارة المنطقة** («14:30 لندن»).
- الصياغة محايدة (§3.5)؛ لا ألوان حمراء للميزانية — درجات برتقالي هادئ.

### 10.2 الرئيسية (TF-31)
اللوحات بالترتيب: **الرحلة القادمة/النشطة** (عدّاد + بطاقة وقت الوجهة مقابل البيت) · **قيد التخطيط** · **قائمة أمنيات الوجهات** · **تنبيهات** (مستندات، مواعيد إلغاء، ميزانية؛ TE-11) · **ذكريات حديثة** · «مصروف سريع». كل لوحة تُخفى إن كانت فارغة أو إن عُطّل تكاملها.

### 10.3 تفاصيل الرحلة — التبويبات (TF-30)
| التبويب | المحتوى |
| :---- | :---- |
| **نظرة عامة** | الحالة، التواريخ، المحطات (خط)، الرفاق، شريط الميزانية، عدّادات (حجوزات/مستندات/تعبئة)، قائمة ما قبل السفر |
| **البرنامج** | أيام قابلة للتمرير؛ لكل يوم شارة منطقة؛ سحب لإعادة الترتيب؛ «حدث هذا» |
| **الحجوزات** | بطاقات حسب النوع بالتاريخ؛ شارة موعد الإلغاء؛ سجل التغييرات |
| **الميزانية** | مخطط/فعلي/بانتظار لكل فئة وعملة؛ مصروفات ملتقطة؛ سعر مجمَّد |
| **التعبئة** | قوائم + تقدّم + وزن؛ تصفية بالشخص |
| **الأماكن** | قائمة/خريطة المستخدم؛ الأولوية |
| **التجارب** | ما عشته في الرحلة |
| **المستندات** | قائمة مقنَّعة + حالة الصلاحية + كاش أوفلاين |
| **الذكريات** | شبكة |
| **المراجعة** | تظهر عند Completed |

### 10.4 الشاشات والتفاصيل
1. **الرحلات:** تبويبات (قادمة، سابقة، أفكار، ملغاة)؛ بطاقة: الاسم، التواريخ، المدة، المحطات، حالة الحجوزات (✓ n/م)، شريط ميزانية.
2. **إنشاء رحلة:** وجهة واحدة أو أكثر ← تواريخ (أو «لم أحدد») ← رفاق ← عملة. ينتهي بحفظ كـIdea/Planning.
3. **الوجهات:** قائمة أمنيات مع بحث؛ بطاقة: الوقت المحلي الآن، المنطقة، زيارات سابقة.
4. **إضافة حجز:** نوع ← مزود ← رمز التأكيد (مخفي) ← أوقات **بمنطقتين** للنقل ← السعر ← موعد الإلغاء بمنطقة الحجز ← «اربط ببند البرنامج».
5. **المصروف السريع:** مبلغ + عملة (آخر عملة) + فئة؛ `Posted/Queued` شارة صغيرة.
6. **المستندات:** إضافة مستند: النوع، الاسم، **آخر 4 أرقام**، تواريخ، ملف اختياري (يُرفع إلى Core Files)؛ زر «احفظ أوفلاين».
7. **التجارب:** شريط زمني؛ تصفية (رحلة/بلا رحلة، النوع، التقييم).
8. **الذكريات:** سحب وإسقاط وسائط؛ علامات؛ مفضلة.
9. **الإعدادات:** كل مفتاح من §5.1 مع شرح سطر واحد.

### 10.5 الحالات والإتاحة
Loading/Empty/Error/Success + **Offline/Syncing/Conflict** لكل شاشة بيانات؛ Empty نص إيجابي («ابدأ بوجهة تحلم بها»)؛ حجم لمس ≥44px؛ قارئ شاشة يقرأ المنطقة مع الوقت؛ الحد الأدنى للتباين AA؛ **تأكيد قبل الحذف المتسلسل** (TG-24).

### 10.6 النماذج
حفظ مسودة تلقائيًا محليًا؛ التحقق فوري بالرسائل المحايدة (TV)؛ منتقي مناطق بحث بالاسم (ليس قائمة IANA خام)، يقترح منطقة الوجهة تلقائيًا.

---

## 11) التكاملات وواجهة API

### 11.1 Calendar / Today (TC-17)
- `GET /travel/feed/calendar?from&to` يعيد **مراجع** (لا نسخ): `{source_system:"travel", source_type, source_id, title (حسب calendar_feed), start_utc, end_utc, tz, all_day}`؛ التعديل يتم في Travel فقط.
- `GET /travel/feed/today` (CX-12) = §6.15؛ العناوين محايدة افتراضيًا («رحلة: بند اليوم»).
- لا تُرسل رموز تأكيد ولا أرقام مستندات في أي feed.

### 11.2 Home
حدث اختياري مغلق افتراضيًا `travel.trip.absence_started/ended` يحمل `{trip_id, from_date, to_date}` **فقط** (TD-07)؛ Home يقرر ماذا يفعل (تعليق تذكيرات المنزل). لا أماكن ولا أسماء.

### 11.3 Finance (CX-03، TC-05/06)
**الكتابة:** `POST /finance/transactions/from-source` بجسم:
```json
{
  "source_system": "travel",
  "source_type": "travel_expense | travel_booking",
  "source_id": "<uuid>",
  "source_key": "<unique idempotency key>",
  "kind": "Payment|Deposit|Balance|Refund",
  "amount": "46.40", "currency": "EUR",
  "occurred_on": "2026-11-12",
  "category_hint": "Food",
  "dimensions": {"trip_id": "<uuid>", "booking_id": "<uuid|null>"},
  "account_hint": "optional"
}
```
- **بلا أسماء أماكن ولا ملاحظات** (CX-03). الفئة تعيّنها Finance من `category_hint` عبر خريطة قابلة للتعديل عندهم.
- `sync_status`: `Pending → Synced`، `Failed` (إعادة مع backoff)، `Detached` (إن قطع المستخدم الربط)، `Legacy` (استيراد).
- **القراءة:** `GET /finance/transactions/summary?dimension=trip_id&trip_id=…` و`GET /finance/exchange-rates/current`.
- **السلوك عند الفشل:** المصروف يبقى `Queued` بشارة، وتُعاد المحاولة (TA-10)؛ لا فقدان.
- **الاسترداد:** يُدخَل في Travel كـ`Refund` ويرسل من-المصدر كحركة موجبة.

### 11.4 Relationships / Shopping / Inventory / Knowledge / Core
| النظام | الاتجاه | التفاصيل |
| :---- | :---- | :---- |
| Relationships | قراءة + اقتراح | `person_ref` للرفاق؛ بعد الرحلة يعرض Travel «اقتراح تسجيل لقاء» بحدث `travel.trip.completed` يحمل `{trip_id, person_refs[], dates}`؛ Relationships يقرر (TA-12) |
| Shopping | قراءة | قوائم `purpose=ForTrip` تظهر في تبويب التعبئة؛ لا شراء داخل Travel (TC-18/19) |
| Inventory | قراءة | `inventory_item_ref` على بند تعبئة (حقيبة، كاميرا) |
| Knowledge | مرجع | `knowledge_ref` لبحث الوجهة؛ `work_trip_ref` لاجتماعات رحلة العمل |
| Core Files | كتابة/قراءة | رفع/قراءة مستندات ووسائط بمستوى Secret/Sensitive |
| Core Goals | مرجع | `finance_goal_ref` لهدف ادخار الرحلة |
| Habit/Spiritual | — | لا تكامل مباشر؛ لا أحداث |

### 11.5 الأحداث الخارجة (CX-17: `{system}.{entity}.{verb}`)
`travel.trip.created|status_changed|completed|cancelled`، `travel.booking.created|cancelled`، `travel.document.expiring`، `travel.review.saved`. الحمولة معرّفات وتواريخ فقط؛ التسليم at-least-once عبر `tr_outbox` مع `idempotency_key`.
**أحداث داخلة:** `finance.transaction.deleted` (يضع الرابط `Detached`)، `relationships.person.merged|erased` (يحدّث `ref_state`)، `core.file.deleted` (`file_ref` → Missing).

### 11.6 واجهة REST (مرجع)
| المسار | الوظيفة |
| :---- | :---- |
| `GET/POST /travel/trips` · `GET/PATCH/DELETE /travel/trips/{id}` | الرحلات؛ `POST /trips/{id}/clone` |
| `POST /travel/trips/{id}/status` | انتقال حالة (يتحقق من §6.12) |
| `GET/POST/PATCH/DELETE /travel/trips/{id}/legs` | المحطات |
| `GET/POST /travel/trips/{id}/companions` | الرفاق |
| `GET/POST/PATCH/DELETE /travel/itinerary-items` | البنود؛ `POST /itinerary-items/{id}/happened` (ينشئ تجربة) |
| `GET/POST/PATCH /travel/bookings` · `GET /bookings/{id}/events` · `POST /bookings/{id}/payments` | الحجوزات والدفع |
| `GET/PUT /travel/trips/{id}/budget` · `GET /budget/status` | الميزانية |
| `POST /travel/expenses` · `GET /travel/expenses?trip_id=` | المصروفات |
| `GET/POST /travel/packing-lists` · `.../items` · `POST /packing-lists/{id}/clone` | التعبئة |
| `GET/POST /travel/places` · `/experiences` · `/memories` | الأماكن/التجارب/الذكريات |
| `GET/POST /travel/documents` · `POST /documents/{id}/reveal` | المستندات؛ `reveal` يتطلب إعادة مصادقة ويُسجَّل |
| `GET/PUT /travel/trips/{id}/review` · `POST .../review/refresh-snapshot` | المراجعة |
| `POST /travel/offline-packs/{trip_id}` · `GET .../manifest` | حزمة الأوفلاين |
| `POST /travel/sync` | دفعة عمليات `client_op_id` (§13) |
| `GET /travel/feed/today` · `/feed/calendar` | feeds |
| `POST /travel/import/{ics|csv}?dry_run=true` | استيراد |
| `GET /travel/export` | تصدير كامل JSON (+ نسخة نظيفة للبرنامج) |
- **الأخطاء** `{code, message, field?}`؛ أمثلة: `ITINERARY_END_BEFORE_START`, `TZ_INVALID`, `BOOKING_HAS_FINANCE_LINK`, `RATE_REQUIRED`.
- **المصادقة** JWT + RLS؛ **الحدّ:** 120 طلبًا/دقيقة؛ **Idempotency-Key** لكل POST مالي.

### 11.7 الخدمات (ملخص، التفصيل في §17)
Trip, Destination, Itinerary, Booking, TravelBudget, Packing, Place, Experience, TravelDocument, Memory, TripReview, TravelNotification, TravelCalendar (TF-41) + **TravelExpense, FinanceLink, OfflinePack, Sync, Import, TimeZone**.

---

## 12) الأتمتة (TA)

| ID | الأتمتة | المُشغّل | السلوك |
| :---- | :---- | :---- | :---- |
| TA-01 | تذكير الحجز | قبل `start_utc` للحجوزات المؤكدة (24س وساعتين) | إشعار محايد «تذكير سفر»؛ يُلغى إن Cancelled |
| TA-02 | موعد الإلغاء | §6.5 | بتوقيتين (الحجز + المستخدم) |
| TA-03 | انتهاء المستند | `reminder_days` | مرة لكل عتبة؛ لا رقم في الإشعار |
| TA-04 | تذكير البرنامج | `itinerary_reminder_minutes` قبل `start_utc` | يحترم Quiet Hours |
| TA-05 | تذكير التعبئة | `packing_reminder_days_before` | يذكر التقدّم فقط |
| TA-06 | تنبيه الميزانية | عبور العتبة | مرة لكل عتبة، بصياغة محايدة |
| TA-07 | بداية/نهاية الرحلة | حسب §6.12 | اقتراح بنقرة أو تلقائي إن فُعّل |
| TA-08 | دعوة المراجعة | بعد `review_prompt_after_days` من Completed | مرة واحدة؛ قابلة للتأجيل |
| TA-09 | تجهيز حزمة الأوفلاين | قبل البدء بـ3 أيام (Wi-Fi) | تنبيه «حزمتك جاهزة» |
| TA-10 | إعادة مزامنة Finance | كل 5 دقائق/عودة الشبكة | backoff أسّي؛ `source_key` يمنع التكرار |
| TA-11 | دعوة تدوين الذكريات | `memory_prompt_after_days` أثناء/بعد الرحلة | اختيارية |
| TA-12 | اقتراح تسجيل لقاءات | بعد Completed | حدث `travel.trip.completed` إلى Relationships |
| TA-13 | تغيّر tzdata | عند ترقية البيانات | إعادة حساب المستقبل + إشعار |
| TA-14 | إشارة الغياب لـHome | بداية/نهاية الرحلة إن فُعّلت | حدث تواريخ فقط |
| TA-15 | بناء الكاش | تغيّر `inputs_hash` | ليلي + عند الطلب |
| TA-16 | تنظيف المحذوفات | يوميًا | حذف نهائي بعد 30 يومًا |
- كل أتمتة **idempotent** بـ`dedupe_key`، مرصودة في `tr_notifications_log`، تحترم `quiet_hours`/`pause_all` وسقف الإشعارات اليومي.

---

## 13) الأوفلاين والمزامنة

### 13.1 المبدأ
السفر = أكثر مكان تنقطع فيه الشبكة. **كل ما في §5 يقرأ ويُكتب محليًا** (قاعدة SQLite مشفّرة على الجهاز)، والمزامنة لاحقة.

### 13.2 ما يعمل بلا شبكة
| الوظيفة | أوفلاين؟ | ملاحظة |
| :---- | :---- | :---- |
| عرض الرحلة النشطة (برنامج/حجوزات/تعبئة/أماكن) | نعم | من حزمة الأوفلاين |
| المصروف السريع | نعم | يُطابَق `Queued` |
| تعديل البرنامج والتعبئة والذكريات (نص) | نعم | طابور |
| رفع وسائط الذكريات | طابور | يرفع عند الشبكة |
| فتح مستند أصلي | **فقط إن حُفظ أوفلاين** | مشفّر بمفتاح الجهاز + مدة صلاحية |
| الميزانية الفعلية من Finance | لا | آخر قيمة مخزنة + شارة «قديمة» |
| سعر الصرف الحالي | لا | يُستخدم `frozen_rate` أو إدخال يدوي |

### 13.3 المزامنة
- كل عملية: `client_op_id` + `entity` + `base_version` + `payload` → `POST /travel/sync` دفعة مرتبة.
- **إعادة التنفيذ آمنة** (`tr_offline_ops`).
- **التعارض:** إن اختلف `base_version`: (أ) حقول غير متداخلة ⇒ دمج تلقائي؛ (ب) نفس الحقل ⇒ `Conflict` وشاشة مقارنة «نسختي / نسخة الخادم / الاثنتان».
- **المصروفات والمعاملات** لا تتعارض (إضافية فقط)؛ تصحيحها عبر Finance.
- **الحذف مقابل التعديل:** التعديل يغلب الحذف مع إبلاغ (قاعدة «لا تفقد بيانات»).
- المشتقات تُحسب محليًا بنفس الخوارزمية (TV-30) وتُستبدل بقيم الخادم عند المزامنة.
- الساعة: إن اختلفت ساعة الجهاز عن الخادم > 5 دقائق، يُحذَّر ولا تُستخدم الساعة لترتيب العمليات (يُستخدم تسلسل الطابور).

### 13.4 الحزمة والمفاتيح
المفتاح في Keystore/Keychain؛ فقدان الجهاز ⇒ إبطال الجلسة من الخادم، ولا تُفك الحزمة بلا قفل القسم. تنتهي صلاحية كاش المستندات بعد `offline_cache_expires_at` (افتراضي: 7 أيام بعد نهاية الرحلة).

---

## 14) الأمان والخصوصية

- **التشفير:** TLS؛ حقول `*_enc` بمفتاح لكل مستخدم (envelope)؛ كاش الجهاز مشفّر.
- **المستندات (Secret):** لا تظهر في بحث ولا إشعار ولا feed ولا تصدير ولا سجلات؛ `reveal` = إعادة مصادقة + سطر في `tr_audit_log`؛ لقطة الشاشة محجوبة حيث يدعم النظام.
- **رموز التأكيد:** مقنَّعة في القوائم (TG-17)، لا تُرسل لأي نظام آخر.
- **الموقع/الغياب:** مواعيد الرحلات والأماكن Sensitive؛ **لا بث لأي طرف** (Home اختياري، TD-07)؛ التصدير المشترك نظيف (TE-12).
- **عزل المستخدمين:** RLS + فحص ملكية في الخدمة؛ اختبار TT-10 وTT-60.
- **القفل:** `section_lock` + إخفاء من مبدّل التطبيقات.
- **الإشعارات:** نص محايد على القفل، لا أرقام (§3.5).
- **القانون (مرجع عام لا نصيحة):** القانون المصري 151/2020 لحماية البيانات الشخصية: موافقة صريحة، حق الحذف والتصدير (`/travel/export`)، تقليل البيانات (لا أرقام مستندات كاملة).
- **سجل الوصول:** `tr_audit_log` append-only.
- **الحذف النهائي:** يشمل الكاش والملفات المحلية والمراجع؛ أما ملفات Core Files فيتبع حذفها سياسة Core.
- **الروابط والاستيراد:** لا جلب لروابط (CX-22)؛ تعقيم HTML/ICS؛ حد حجم؛ لا تنفيذ.
- **التحقق من tz:** قائمة بيضاء من tzdata.

---

## 15) الترحيل والاستيراد

1. **Notion (اختياري):** لا بيانات رحلات مؤكدة في Notion (§1.2)؛ يوفَّر ربط اختياري لأعمدة قالب **Simple Trip Planner** إن استخدمه المستخدم: Trip Overview→Trip، Accommodation/Flights/Car Rental→Bookings، Things to Do/See/Eat→Places، Trip Budget→Budget lines، Packing List→قائمة قالب. **تجريبي dry-run أولًا** ثم تأكيد.
2. **الاستيراد من ICS/CSV:** معاينة (`dry_run`) → تقرير أخطاء بأرقام الصفوف → تأكيد؛ **الأوقات بلا منطقة** تُسأل عنها المستخدم صراحة (لا افتراض)؛ التكرار بـ`source_key`.
3. **أول استخدام (Onboarding):** `home_timezone`، العملة، اختيار الأقسام المربوطة، شرح الأوفلاين، تجربة «مصروف سريع». **ابدأ فارغًا** مقبول.
4. **الاستيراد من Finance:** مصروفات سابقة موسومة برحلة تظهر كـ`Legacy` (قراءة فقط).
5. **النسخ الاحتياطي** قبل أي استيراد؛ تراجع كامل لدفعة الاستيراد (`tr_import_batches`).
6. **ترحيل بين الإصدارات:** migrations مرقمة، قابلة للتراجع، مع اختبار بيانات نموذجية.

---

## 16) اختبارات القبول (TT)

> **TT-01…TT-10 من المصدر**، والباقي مضاف.

| ID | الاختبار | النتيجة المتوقعة |
| :---- | :---- | :---- |
| TT-01 | رحلة 10→17 نوفمبر | `duration_days=8`, `nights=7` |
| TT-02 | بند ينتهي قبل بدايته بلا offset | رفض `ITINERARY_END_BEFORE_START` |
| TT-03 | تذكير حجز + موعد إلغاء بمنطقة مختلفة | الإشعار بالتوقيتين وفي الوقت الصحيح |
| TT-04 | ميزانية ↔ Finance | الفعلي = مجموع `Synced` من Finance؛ الفرق معروض كـ«بانتظار» |
| TT-05 | التعبئة تستمر بعد إعادة التشغيل/أوفلاين | الحالة محفوظة |
| TT-06 | مستند ينتهي خلال 30 يومًا | تنبيه عند 30 مرة واحدة، بلا رقم |
| TT-07 | رحلة Completed | دعوة المراجعة، ولقطة المصروف |
| TT-08 | feed التقويم | مراجع بمصدر `source_id`، لا نسخ؛ تعديل المصدر يحدّثه |
| TT-09 | تعديل/إلغاء حجز | الذكريات والتجارب لم تتغير |
| TT-10 | مستخدم ب يطلب رحلة أ | 404 |
| TT-11 | طيران القاهرة→لندن 23:30→03:40 | المدة 6س10د؛ UTC صحيح |
| TT-12 | وقت محلي غير موجود (فجوة DST) | رفض مع اقتراح |
| TT-13 | وقت مكرر (إرجاع DST) | يطلب اختيار الأول/الثاني |
| TT-14 | `tz` غير صالح | `TZ_INVALID` |
| TT-15 | تغيّر tzdata لبند مستقبلي | إعادة حساب UTC + إشعار؛ الماضي لا يتغير |
| TT-16 | بند مرتبط بحجز | وقته للقراءة فقط ويتبع الحجز |
| TT-17 | فك ربط البند من الحجز | يصير يدويًا ويحتفظ بالقيم |
| TT-18 | محطتان بتداخل أكثر من يوم | تحذير/رفض TV-06 |
| TT-19 | يوم تبديل المحطة | مسموح |
| TT-20 | رحلة بمحطات | التواريخ مشتقة من أول/آخر محطة |
| TT-21 | مصروف سريع أوفلاين | `Queued` ثم `Posted` بعد الشبكة بلا تكرار |
| TT-22 | إعادة إرسال نفس `source_key` | معاملة واحدة في Finance |
| TT-23 | فشل Finance | `Failed` + إعادة محاولة؛ لا فقدان |
| TT-24 | حجز بعربون وباقي | رابطان `Deposit`/`Balance` ومعاملتان |
| TT-25 | إلغاء حجز مدفوع | اقتراح `Refund`؛ لا حذف الروابط |
| TT-26 | قيد بـGBP وميزانية EUR بسعر مجمَّد | 40 GBP×1.16=46.40 EUR؛ السطر الأصلي ظاهر |
| TT-27 | عملة بلا سعر | لا تحويل؛ `RATE_REQUIRED` |
| TT-28 | Finance غير متاح | «الفعلي غير متاح» + المحلي بانتظار |
| TT-29 | `Experience.cost` | لا يدخل الفعلي |
| TT-30 | عتبة 80% | تنبيه واحد محايد |
| TT-31 | تجاوز 100% | تنبيه واحد؛ بلا لوم |
| TT-32 | فئة بلا مخطط وبفعلي | `Unplanned` |
| TT-33 | `budget_cap` أقل من المخطط | يُستخدم السقف في الحالة |
| TT-34 | جواز لا يحقق 6 أشهر | تحذير معلوماتي لا منع |
| TT-35 | تغيير `passport_min_validity_months` | يعاد حساب الحالة |
| TT-36 | رقم مستند كامل مُدخل | يُقتطع/يرفض (TV-15) |
| TT-37 | بحث عن رقم جواز | لا نتائج؛ لا يُفهرس |
| TT-38 | إشعار انتهاء مستند | بلا رقم ولا اسم مستند |
| TT-39 | `reveal` للمستند | يتطلب إعادة مصادقة + سجل |
| TT-40 | مستند محفوظ أوفلاين | يفتح بلا شبكة؛ ينتهي بعد المدة |
| TT-41 | فقدان Core Files | `file_ref=Missing` والقناع يعمل |
| TT-42 | حزمة الأوفلاين | تتضمن اليوم−1 فصاعدًا والحجوزات |
| TT-43 | تعارض تعديل أوفلاين | `Conflict` وشاشة مقارنة |
| TT-44 | حذف مقابل تعديل | التعديل يغلب مع إبلاغ |
| TT-45 | ساعة جهاز خاطئة | تحذير؛ الترتيب بالتسلسل |
| TT-46 | التعبئة بقالب | نسخ بـ`packed=false` |
| TT-47 | تقدّم التعبئة بدون اختياري | يستثني الاختيارية |
| TT-48 | وزن غير معلوم | يعرض العدد المجهول |
| TT-49 | رفيق من Relationships | `person_ref` + snapshot |
| TT-50 | حذف الشخص في Relationships | `ref_state` يتغير ولا تفشل الرحلة |
| TT-51 | رفيق بدون مرجع واسم | رفض TV-07 |
| TT-52 | تجربة بلا رحلة | تُحفظ وتظهر في الخط الزمني |
| TT-53 | وجهة Visited مشتقة | تتحول بعد محطة Completed |
| TT-54 | محاولة ضبط Visited يدويًا | غير مسموح |
| TT-55 | «حدث هذا» | تجربة جديدة مرتبطة، البند باقٍ |
| TT-56 | نسخ رحلة | بنود/تعبئة بلا حجوزات وتواريخ |
| TT-57 | إلغاء رحلة | تتوقف التذكيرات؛ قائمة حجوزات للمتابعة |
| TT-58 | حذف رحلة | تأكيد يعرض ما سيحذف؛ الذكريات تبقى |
| TT-59 | لقطة المراجعة | لا تتغير بعد تعديل Finance؛ تتحدث يدويًا |
| TT-60 | عزل المستخدمين على كل جدول `tr_*` | لا تسريب عبر RLS |
| TT-61 | feed اليوم أثناء الرحلة | بتوقيت المحطة الحالية |
| TT-62 | حدث الغياب لـHome | يحمل تواريخ فقط؛ مغلق افتراضيًا |
| TT-63 | تصدير نظيف | لا رموز ولا مستندات |
| TT-64 | استيراد ICS بلا منطقة | يسأل المستخدم |
| TT-65 | CSV dry-run | لا كتابة؛ تقرير أخطاء |
| TT-66 | تكافؤ الحساب (جهاز/خادم) | نفس النتائج لمجموعة حالات |
| TT-67 | نص بلا لوم (CI) | لا عبارات مثل «أفرطت/تأخرت» |
| TT-68 | إشعارات شاشة القفل | محايدة |
| TT-69 | حدود المعدل وIdempotency-Key | تعمل |
| TT-70 | حذف المستخدم/تصدير الكل | يشمل الكاش والمراجع؛ التصدير كامل |

---

## 17) الخدمات وترتيب البناء

### 17.1 الخدمات (TF-41)
`TripService`، `DestinationService`، `ItineraryService`، `BookingService`، `TravelBudgetService`، `PackingService`، `PlaceService`، `ExperienceService`، `TravelDocumentService`، `MemoryService`، `TripReviewService`، `TravelNotificationService`، `TravelCalendarService` + مضافة: `TravelExpenseService`، `FinanceLinkService`، `TimeZoneService`، `OfflinePackService`، `SyncService`، `ImportExportService`، `TravelDerivedService`.

### 17.2 ترتيب البناء (حسب الاعتماد)
1. **الأساس:** الإعدادات، الهوية، RLS، `TimeZoneService` (tzdata)، الحقول العامة.
2. الوجهات + الرحلات + المحطات + الرفاق.
3. البرنامج + الحجوزات + سجل الأحداث + الوراثة.
4. الميزانية + المصروفات + `FinanceLinkService` (saga + إعادة المحاولة).
5. التعبئة + الأماكن + التجارب + الذكريات + المراجعة.
6. المستندات (Core Files + القفل + reveal).
7. الأوفلاين والمزامنة وحزمة الرحلة (التحدي الأكبر؛ يُبنى مبكرًا بنموذج بيانات ثابت).
8. الأتمتة والإشعارات + feeds + الأحداث.
9. الاستيراد/التصدير + الترحيل + تقوية الأمان.
10. الاختبارات والتحقق النهائي.

---

## 18) القرارات المفتوحة (TD)

| ID | القرار | التوصية الافتراضية |
| :---- | :---- | :---- |
| TD-01 | هل يلتقط Travel المصروفات (يكتب لـFinance) أم يقتصر على القراءة؟ | **يلتقط** (saga) لأن الفعلي لا يصل غير ذلك |
| TD-02 | قاعدة صلاحية الجواز (6 أشهر) | قابلة للتعديل ومعلوماتية فقط — **غير مؤكد، يُتحقق من الجهة الرسمية** |
| TD-03 | الانتقالات التلقائية Active/Completed | مفعّلة، والباقي باقتراح |
| TD-04 | `account_hint` (حساب الدفع) | اختياري ولا يحمل رصيدًا |
| TD-05 | سياسة الصرف الافتراضية | `FinanceCurrent` ثم اليدوي |
| TD-06 | عناوين الإشعارات | محايدة |
| TD-07 | إشارة الغياب لـHome | مغلقة |
| TD-08 | تخزين المستندات أوفلاين | مفعّل بطلب المستخدم لكل مستند |
| TD-09 | الوسائط في حزمة الأوفلاين | مستثناة |
| TD-10 | الخرائط | رابط يلصقه المستخدم؛ لا مزوّد (CX-22) |
| TD-11 | الطقس وأسعار الطيران | خارج النطاق (CX-22) |
| TD-12 | بيانات الطيران | يدوي أو ICS فقط |
| TD-13 | رحلة مشتركة بين مستخدمين | خارج v1 (التصدير النظيف بدلًا منها) |
| TD-14 | هجرة Simple Trip Planner من Notion | اختيارية |
| TD-15 | مدة حفظ الرحلات الملغاة | دائمة حتى يحذفها المستخدم |
| TD-16 | مدة كاش الملفات المحلية | 7 أيام بعد نهاية الرحلة |

---

## 19) مصفوفة التغطية والخلاصة

### 19.1 مصفوفة التغطية (المصدر → الوثيقة)
| قسم المصدر | أين |
| :---- | :---- |
| 1 Purpose | §3.1 |
| 2 Ownership | §3.2 |
| 3 Screens | §10 |
| 4 Trips | §5.3، §6.1، §6.12 |
| 5 Destinations | §5.2، §6.13 |
| 6 Itinerary Items | §5.5، §6.3، §6.4 |
| 7 Bookings | §5.6، §6.5 |
| 8 Travel Budget | §5.7، §6.6–6.9 |
| 9 Packing | §5.8، §6.11 |
| 10 Places | §5.9 |
| 11 Experiences | §5.10 |
| 12 Travel Documents | §5.11، §6.10 |
| 13 Memories | §5.12 |
| 14 Trip Review | §5.13، §6.14 |
| 15 UX | §10 |
| 16 Automation | §12 |
| 17 Integrations | §11 |
| 18 Services | §17 |
| 19 Acceptance Tests | §16 |
| Shared Engineering Rules (9) | §3.3، §5.0 |

### 19.2 الخلاصة
- **المحتوى:** 43 ميزة محفوظة (TF)، 23 تعارضًا محسومًا (TC)، 24 فجوة (TG)، 14 تحسينًا (TE)، 16 قرارًا مفتوحًا (TD)، 30 قاعدة تحقق (TV)، 16 أتمتة (TA)، و70 اختبار قبول (TT).
- **أهم القرارات:** الوقت المحلي + IANA + UTC؛ الحجز التزام لا معاملة؛ مصروف الرحلة يُلتقط ويصل Finance بوسم `trip_id`؛ المستندات Secret في Core Files بقناع؛ حزمة أوفلاين؛ لا مصادر خارجية بلا فحص.
- **الاستقلال:** القسم يعمل وحده ويتدهور بأمان عند غياب أي نظام آخر (§3.4).
- **ما يحتاج تأكيدك أولًا:** TD-01 (التقاط المصروف)، TD-02 (قاعدة الجواز)، TD-07 (إشارة Home).
