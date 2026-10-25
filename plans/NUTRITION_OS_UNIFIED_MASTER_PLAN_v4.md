# 🍽️ Nutrition OS — خطة العمل الموحّدة والكاملة (الإصدار 4.0)

**الغرض:** وثيقة بناء **مكتفية بذاتها** لتطبيق **تتبّع وإدارة التغذية اليومية** (ويب + موبايل، عربي RTL، يعمل أوفلاين كاملًا) يعمل **كقسم مستقل تمامًا**، ومرتبط ببقية أنظمتك (Home، Sports كمزوّد اختياري، Habit OS، Finance، Today، Core) عبر **عقود API/Events فقط** — بلا جداول مشتركة ولا نسخ كيانات. نفس فلسفة وثيقتي Learning OS v4.0 وFinance OS v4.1 ونفس هيكلهما، لكن بما يناسب طبيعة التغذية: **بيانات صحية حساسة، سلامة نفسية، دقة الحساب التاريخي، وأكل حقيقي غير مثالي (أكل خارج البيت، تقدير، أيام غير مكتملة)**.

> **هذه الوثيقة تحلّ محلّ الملفين السابقين بالكامل** (`NUTRITION_OS_Independent_Build_Spec.md` EN و`NUTRITION_OS_وثيقة_البناء_المستقلة_العربية.md` AR). كل بند فيهما موجود هنا (انظر **مصفوفة التغطية في §19**) مع حسم تعارضاتهما الداخلية ومع بقية الأقسام، وسد الفجوات. لا يُرسَل الملفان القديمان مع هذه الوثيقة لمنفّذ التطبيق كي لا تعود التعارضات.

**ما دخل في المراجعة:**

1. مواصفتا المصدر (EN + AR): 20 قسمًا + «قواعد التنفيذ المشتركة» (10 قواعد).
2. **Notion (قراءة فقط):** بحثت بعدة استعلامات (إنجليزي وعربي) عن قواعد للتغذية/الأكل/الماء/الوجبات. **لم أجد أي قاعدة Nutrition فعلية** (لا سجل أكل، لا أهداف، لا ماء). وجدت ثلاثة أشياء مجاورة فُحصت مخططاتها (§1.2): قوالب «Recipes Box / My Pantry / Year Meal Planner» (قالب جاهز مؤرَّخ مارس 2024 تحت Home/House Manager) و«نظام اللياقة بتاعي» (قاعدة 📈 Progress فيها الوزن والقياسات، وهي ملك Sports لا Nutrition).
3. وثيقتا **Learning OS v4.0** و**Finance OS v4.1** كقالب للبنية والنبرة وعقد `from-source`، و**Home OS v4.0** لتحديد الحد بين البقالة والمخزون/المشتريات (§3.2، §11.2).
4. **القرارات المشتركة CX-01…CX-22** (ملزمة) وأُشير إليها حيث تطبَّق.

**المرجع الأعلى عند التعارض:** هذه الوثيقة ← سلوك Notion الفعلي (لا يوجد لنظام تغذية؛ انظر §1.2) ← مواصفتا المصدر.

> **تنبيه أمانة (مهم):** هذه الوثيقة **أداة تنظيم وتتبّع** وليست نصيحة طبية أو غذائية أو علاجية. لا تحوي أي أرقام صحية «موصى بها»؛ كل الحدود **قابلة للضبط** أو مُعلَّمة افتراضًا. أي ادعاء عن مصدر بيانات خارجي أو قانون أو معادلة لم أفحصه موسوم **«غير مؤكد — يُتحقق قبل البناء»**. لم أفحص صفوف بيانات Notion الفعلية (عددها/جودتها)، فقط المخططات؛ خطوة «تدقيق قبل الترحيل» في §15 تغطي ذلك.

> **مفاتيح القراءة:** `NF-xx` ميزة محفوظة من المصدر · `NC-xx` تعارض محسوم · `NG-xx` فجوة مسدودة · `NE-xx` تحسين مضاف · `ND-xx` قرار يحتاج تأكيدك (بتوصية افتراضية) · `NV-xx` قاعدة تحقق · `NA-xx` أتمتة · `NT-xx` اختبار قبول. (الحرف **N** = Nutrition، حسب CX-18.) و`CX-xx` يشير إلى القرارات المشتركة الملزمة بين الأنظمة الجديدة.

---

## 1) مراجعة المصدر وحكم على كل عنصر

### 1.1 ما الذي يقوله المصدر (ملخص أمين)

المصدر نظام تغذية من 12 شاشة و11 خدمة و9 مجموعات API، سلسلته: **Food → Meal → Intake → Goals → Water → Meal Plan → Grocery → Analytics**. نقاط قوته: فصل «تعريف الطعام» عن «استهلاكه» (Food مقابل Food Log)، مبدأ **الـ Snapshot** للحفاظ على التاريخ، رفض أهداف صحية «عالمية» مبرمجة، اعتبار الملخص اليومي **مشتقًا**، وجعل الخطط المولّدة **اقتراحات** حتى يؤكدها المستخدم.

لكنه مختصر جدًا، ويترك فجوات تنفيذية كبيرة (وحدات، طبخ، أكل خارج، بحث عربي، يوم ناقص، خصوصية، أوفلاين، حدود مع Home) وفيه تعارضات داخلية (§7).

### 1.2 نتيجة فحص Notion (قراءة فقط — لم يُعدَّل شيء)

| ما وُجد | المسار | ماذا يحوي (حسب المخطط) | الحكم |
| :---- | :---- | :---- | :---- |
| **(template) Recipes Box** | Damen's / Home / House Manager / Recipes & Groceries | `Name`, `Meal` (Breakfast/Lunch/Snack/Side/Dinner/Dessert/Drink), `Tags` (Quick, Grab-n-go, Sheet Pan, Gluten Free, Low-carb, Vegetarian, 30 Minutes, Crockpot, Easy), `Favorite` (checkbox), `Picture`, `URL`, علاقة `Pantry Ingredients`، علاقة `Meal Plan Days` | قالب جاهز بلا قيم غذائية ولا كميات؛ يُرحَّل **اختياريًا** كوصفات بلا مكوّنات كمّية (§15.2) |
| **(template) My Pantry** | نفس الصفحة | `Item`, `Have` (checkbox), `Need` (صيغة)، `Qty. to Buy` (**نص حر**)، `Category`, `Recipes` | **ملك Home** (مخزون/مشتريات) لا Nutrition. لا يُرحَّل لـ Nutrition؛ يُوجَّه لاستيراد Home (§15.2) |
| **(template) Year Meal Planner** | نفس الصفحة | `Date`, `Weekday`, `Month`, `Meal` (5 أنواع)، `Recipe` (علاقة)، `Recipe Label`, `Ingredients Label`, صيغتا `This Week`/`No Plan` | يُرحَّل اختياريًا كخانات خطة (`plan_slots`) بحالة Planned (§15.2) |
| **daily Ramadan template** (Iftar/Suhoor meal plan) | Damen's / Home / Muslim Life OS / Ramadan Tracker | قالب نصي لخطة إفطار/سحور | **خارج النطاق**: يخص Spiritual (CX-16). Nutrition يوفّر «فترات أكل/صيام» يحددها المستخدم بلا أي قيم دينية مبرمجة (§5.10) |
| **🏋️ نظام اللياقة بتاعي** (+ 📈 Progress) | الجذر | تدريب 12 أسبوع؛ قاعدة Progress فيها `الوزن`, `الخصر`, `الصدر`, `الذراع`, `الفخذ`, `الطاقة`, `التوتر`, `متوسط النوم`، وقاعدة «تسجيل العادات» | **ملك Sports (CX-08)**. Nutrition لا يخزّن الوزن؛ يقرأ اختياريًا (§11.3). لا توجد قاعدة تغذية في هذا النظام |

> **الخلاصة:** لا يوجد نظام تغذية قائم يُرحَّل منه بيانات حقيقية. الترحيل = **Onboarding موجَّه + استيراد CSV** (§15)، مع مسار اختياري لقوالب الوصفات والخطة. لم أفحص صفوف هذه القوالب (قد تكون فارغة أو أمثلة) — يُتحقق قبل أي استيراد.

### 1.3 حكم على كل عنصر في المصدر

| # | عنصر المصدر | الحكم | ما يحدث له | أين |
| :---- | :---- | :---- | :---- | :---- |
| 1 | الهدف: Food→…→Analytics | **اعتماد** | السلسلة تبقى؛ تُضاف حلقتا «Units/Search» قبل Food و«Handoff» بعد Grocery | §4 |
| 2 | «للتتبع لا للتشخيص» | **اعتماد + تشديد** | قواعد صياغة مُلزِمة (NV) وفحص آلي لنصوص الواجهة (NT-61) | §3.5، §10.6 |
| 3 | الملكية (9 كيانات) | **اعتماد + توضيح** | Daily Summaries/Analytics تصير **Cache قابل لإعادة البناء** لا مصدر حقيقة | §3.2، NC-11 |
| 4 | الشاشات الـ12 | **اعتماد + إضافة** | +Search/Barcode، +Batches، +Supplements، +Windows، +Import/Export (داخل Settings) | §10 |
| 5 | Foods (بلا `user_id`) | **تفكيك** | كتالوج نظامي للقراءة فقط بإصدار + أغذية المستخدم + تعديلاته (copy-on-write) | §5.2، §5.3، NC-01 |
| 6 | Foods.`serving_size/unit` وحيد | **توسعة** | أساس غذائي (100 جم/100 مل/حصة) + وحدات منزلية + كثافة | §5.3، §6.3 |
| 7 | Foods.`micronutrients` | **تنظيم** | JSON مُتحقَّق منه مقابل جدول تعريفات `nutrient_defs` | §5.1 |
| 8 | Foods.`source/verified/status` | **تعريف** | `origin`، `verification_level`، `status` بقيم محددة | NC-02 |
| 9 | Recipes (`ingredients` حقل) | **تفكيك** | جدول `recipe_ingredients` + خطوات + وسوم + دفعات | §5.4، NC-07 |
| 10 | `nutrition_total` و`per_serving` | **اشتقاق** | Cache مشتق بـ`computed_at` و`ingredients_hash`؛ لا يُحرَّر | §6.5 |
| 11 | Meals (+`planned_or_actual`) | **إعادة تعريف** | Meal = حاوية **فعلية** فقط؛ المخطط يعيش في Plan Slots | NC-03، §5.5 |
| 12 | Food Log Entries | **اعتماد + توسعة** | XOR للمصدر، وزن مُحلَّل، ثقة، أكل خارجي، لقطة كاملة | §5.5، NC-05/06 |
| 13 | الـ Snapshot | **اعتماد + توسعة** | لقطة لكل المغذيات + `snapshot_basis` لإعادة الإنتاج | §6.4 |
| 14 | Nutrition Goals | **إعادة تصميم** | ملفات أهداف + أهداف لكل مقياس + تعيينات بتواريخ + أنواع أيام | §5.6، NC-09 |
| 15 | «لا أهداف صحية مبرمجة» | **اعتماد** | لا قيم افتراضية للأهداف إطلاقًا؛ الحارس الاختياري إعداد (NG-17) | §3.4 |
| 16 | Water Logs | **اعتماد + توسعة** | `local_date` مخزّنة، إعدادات أكواب، ربط مشروبات بمعامل يحدده المستخدم | §5.7، NC-10 |
| 17 | Meal Plans / Plan Day | **توسعة** | `plan_slots` و`plan_items` جداول؛ نوع Rolling/Fixed/Template؛ Suggestions | §5.8، NC-12 |
| 18 | Grocery | **توسعة** | قوائم + بنود + مصادر الدمج + أقسام + تسليم لـHome | §5.9، NC-13/14 |
| 19 | Daily Summary | **اعتماد كـCache** | + حالة اكتمال اليوم، لقطة الأهداف، قابل لإعادة البناء | §5.11، §6.9 |
| 20 | الحسابات (الكمية × الحصة) | **اعتماد + تفصيل** | معادلات صريحة وتقريب وأمثلة | §6 |
| 21 | «لا إعادة حساب تلقائي للتاريخ» | **اعتماد + مسار مقصود** | إعادة حساب مقصودة بمعاينة وتراجع | §6.18، NG-29 |
| 22 | UX: Today/Food Log/Recipe/Plan | **اعتماد + تفصيل** | حالات أربع، إدخال سريع، موبايل | §10 |
| 23 | Analytics (7 مقاييس) | **اعتماد + تعريف** | تعريف دقيق + استبعاد الأيام الناقصة + بلا ادعاء سببي | §6.12–6.13 |
| 24 | Automation (7) | **اعتماد + إضافات** | كلها Idempotent بمفاتيح؛ + أتمتة جديدة | §12 |
| 25 | Integrations (4) | **عقود** | Sports/Home/Finance/Today + Habit/Core | §11 |
| 26 | Services (11) | **توسعة** | +Search/Barcode/Unit/Supplement/Import/Export/Sync/Settings | §17.1 |
| 27 | APIs (9 مسارات) | **توسعة** | قائمة كاملة بأخطاء | §11.9 |
| 28 | Acceptance Tests (10) | **توسعة** | ≥ 60 اختبارًا مرقّمًا | §16 |
| 29 | قواعد التنفيذ المشتركة (10) | **اعتماد + تسوية 5 تناقضات** | §3.4 (قراءة CX) | §3.4 |

---

## 2) جرد الميزات المحفوظة (NF — كلها)

> كل سطر هنا ميزة/قاعدة من المصدر **محفوظة** في هذه الوثيقة. العمود الأخير يقول أين تُنفَّذ.

| ID | الميزة / القاعدة (من المصدر) | أين |
| :---- | :---- | :---- |
| NF-01 | كيان Food بالحقول: name, brand, serving_size, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, micronutrients, source, verified, status | §5.2، §5.3 |
| NF-02 | Food يصف التغذية للحصة وليس الاستهلاك | §3.4، §6.4 |
| NF-03 | كيان Recipe: name, servings, ingredients, instructions, preparation_time, tags, notes | §5.4 |
| NF-04 | Recipe: nutrition_total وnutrition_per_serving (مشتق) | §6.5 |
| NF-05 | Meal كحاوية (date, meal_type, name, recipe_id, time, notes) | §5.5 |
| NF-06 | `planned_or_actual` على Meal | NC-03، §6.8 |
| NF-07 | Food Log Entry: date_time, meal_id, food_id, recipe_id, quantity, unit, notes, source | §5.5 |
| NF-08 | Snapshots (calories, protein, carbs, fat, fiber) تحفظ التاريخ | §6.4 |
| NF-09 | أنواع الهدف: Maintenance/Fat Loss/Muscle Gain/Performance/General/Custom | §5.6 |
| NF-10 | لا تُبرمج أهداف صحية عالمية | §3.4 |
| NF-11 | Water Log: date_time, amount_ml, source, note | §5.7 |
| NF-12 | ماء اليوم = SUM حسب التاريخ المحلي للمستخدم | §6.14 |
| NF-13 | Meal Plan: name, start_date, end_date, goal_id, status, notes | §5.8 |
| NF-14 | Plan Day: date/day_index, meal_slots, target_calories, target_macros | §5.8 |
| NF-15 | Grocery Item: meal_plan_id, recipe_id, ingredient_or_product, quantity, unit, category | §5.9 |
| NF-16 | حالة البقالة: Needed/Purchased/Skipped | §9.1، §11.2 |
| NF-17 | Daily Summary مشتق من Food Logs + Water Logs (سعرات، ماكروز، ألياف، ماء، عدد وجبات، فرق الهدف) | §5.11، §6.9 |
| NF-18 | التغذية = التغذية للحصة × الكمية المستهلكة | §6.4 |
| NF-19 | Macro variance = الفعلي − الهدف | §6.11 |
| NF-20 | السجلات التاريخية لا تُعاد حسابها تلقائيًا من تعريف Food الجديد | §6.4، §6.18 |
| NF-21 | Today: وجبات مخططة، وجبات مسجّلة، الأهداف المتبقية، الماء | §10.3 |
| NF-22 | Food Log: Quick Add | §10.2 |
| NF-23 | Food Log: Recent | §5.3، §10.2 |
| NF-24 | Food Log: Favorites | §5.3، §10.2 |
| NF-25 | Food Log: Search | §6.17 |
| NF-26 | شاشة Recipe: مكوّنات، تعليمات، تغذية/حصة | §10.3 |
| NF-27 | Meal Plan: تخطيط يوم/تقويم | §10.3 |
| NF-28 | تحليل: ثبات السعرات | §6.13 |
| NF-29 | تحليل: ثبات البروتين | §6.13 |
| NF-30 | تحليل: اتجاه الماء | §6.14 |
| NF-31 | تحليل: تكرار الوجبات | §6.13 |
| NF-32 | تحليل: الالتزام بالأهداف | §6.12 |
| NF-33 | تحليل: المتوسطات الأسبوعية | §6.13 |
| NF-34 | علاقة اختيارية مع وزن Sports | §11.3 |
| NF-35 | لا ادعاءات سببية/طبية | §3.5، §10.6 |
| NF-36 | تذكير الوجبات | §12 |
| NF-37 | تذكير الماء | §12 |
| NF-38 | تنبيه فجوة الهدف | §12 |
| NF-39 | مساعد خطة الوجبات (اقتراح حتى التأكيد) | §6.8، §12 |
| NF-40 | توليد قائمة البقالة من الخطط | §6.15 |
| NF-41 | الملخص اليومي (أتمتة) | §12 |
| NF-42 | المراجعة الأسبوعية | §12 |
| NF-43 | تكامل Sports | §11.3 |
| NF-44 | تكامل Home/Shopping | §11.2 |
| NF-45 | تكامل Finance (Finance يملك الدفع) | §11.6 |
| NF-46 | تكامل Today | §11.5 |
| NF-47 | الخدمات الـ11 (Food, Recipe, Meal, FoodLog, NutritionGoal, Water, MealPlan, Grocery, NutritionSummary, NutritionAnalytics, NutritionNotification) | §17.1 |
| NF-48 | مسارات API التسعة (`/nutrition/foods|recipes|meals|logs|goals|water|plans|grocery|dashboard`) | §11.9 |
| NF-49 | الشاشات الـ12 (Home, Today, Food Log, Foods, Recipes, Meals, Meal Plans, Water, Goals, Grocery, Analytics, Settings) | §10 |
| NF-50 | النظام تتبع/إدارة لا تشخيص/علاج | §3.5 |
| NF-51 | الملكية: ما يملكه Nutrition وما لا يملكه (Sports، Finance، Home/Shopping) | §3.2 |
| NF-52 | `id`, `user_id`, `created_at`, `updated_at` لكل كيان رئيسي | §5.0 |
| NF-53 | عزل الملكية على الخادم، لا ثقة بـ user_id من الواجهة | §14 |
| NF-54 | العلاقات الموثقة FK حقيقية | §5.15، NC-23 |
| NF-55 | القيم المشتقة لا تُحرَّر يدويًا | §3.4، NC-24 |
| NF-56 | Validation في الواجهة والخادم والخادم المرجع | §9.2 |
| NF-57 | كل شاشة بيانات: Loading/Empty/Error/Success (+Offline/Syncing) | §10 |
| NF-58 | الأتمتة القابلة للإعادة Idempotent بسجل تنفيذ | §12 |
| NF-59 | لا تكرار كيان تملكه وحدة أخرى | §3.2، NC-23 |
| NF-60 | كل اليوم/المواعيد/التكرار بتوقيت المستخدم | §6.2 |
| NF-61 | Migration آمنة بـbackup/validation | §15 |
| NF-62 | الاختبارات العشرة للقبول (الكمية، حصة الوصفة، ثبات اللقطة، منطقة الماء، الأهداف المضبوطة، البقالة من الخطط، Sports اختياري، Finance مالك الدفع، مطابقة الملخص، لا ادعاء طبي) | §16 (NT-01…NT-10) |

---

## 3) المبادئ والحدود بين الأقسام

### 3.1 الاستقلال

Nutrition OS تطبيق **قائم بذاته**: قاعدة بياناته وخدماته وواجهاته منفصلة، ويعمل كاملًا (أغذية، وصفات، تسجيل، أهداف، ماء، خطط، بقالة، تحليلات، أوفلاين) **حتى لو غابت كل الأنظمة الأخرى**. الربط اختياري ومُحسِّن، وعند غياب أي نظام تتدهور الميزة بلطف (§3.3). حتى «الكتالوج» اختياري: النظام يعمل بأغذية يُدخلها المستخدم وحدها.

### 3.2 من يملك ماذا

| الكيان / الحقيقة | المالك | Nutrition يفعل ماذا |
| :---- | :---- | :---- |
| كتالوج الأغذية النظامي (بإصدار)، أغذية المستخدم، تعديلاته، الوحدات والكثافات، الأسماء البديلة، الباركود، الوصفات، الدفعات، الوجبات الفعلية، سجل الأكل، الأهداف (ملفات التغذية) وتعييناتها وأنواع الأيام، الماء، المشروبات، المكملات، الخطط وخاناتها، قوائم البقالة (كاحتياج مشتق من الخطط)، فترات الأكل/الصيام، التذكيرات، الملخصات والتحليلات (Cache) | **Nutrition** | يملكها بالكامل |
| التدريب، القياسات (الوزن، الخصر…)، أيام التمرين | **Sports (اختياري، CX-08)** | قراءة اختيارية فقط عبر عقد مقترح *(افتراض — يؤكده المستخدم)*؛ لا يخزّن وزنًا ولا قياسًا؛ لا ينشئ بديلًا |
| المدفوعات والميزانيات وأي حركة مال | **Finance** | لا شيء؛ لا `finance_links` هنا (NC-32) |
| مخزون المنزل (مستهلكات، صلاحيات)، تنفيذ الشراء، قوائم التسوق الأسرية، وضع التسوق | **Home** | قراءة اختيارية للمخزون؛ و**تسليم** بنود البقالة كطلب شراء (§11.2) |
| الوصفة/القيمة الغذائية للمنتج كـ«مواصفة» عند الشراء الشخصي (سلعة مرغوبة) | **Shopping** | لا تعامل؛ مشتريات البقالة اليومية ليست Shopping (CX-05) |
| الشخص (مشاركة وجبة، ضيوف) | **Relationships (CX-01)** | لا يخزّن أشخاصًا؛ لا مشاركة في v4.0 (ND-19) |
| العادات والسلاسل (مثل «اشرب ماء») | **Habit OS (CX-10)** | لا يكرر سجلًا يوميًا؛ حدث اختياري معطّل افتراضيًا (§11.4) |
| الأهداف العامة | **Core Goals (CX-11)** | `goal_ref` اختياري؛ ملفات التغذية إعداد مجال |
| الملفات (صور أطباق/ملصقات/وصفات PDF) | **Core Files (CX-07)** | `file_ref` فئة Normal أو Sensitive (§14) |
| الهوية، الإشعارات، البحث، التقويم، الأحداث | **Core** | يستهلكها |
| صفحة اليوم | **Today** | يوفّر `GET /nutrition/feed/today` ولا يكرر |

> **ملاحظة تمييز مهمة (Home مقابل Nutrition):** «بنود البقالة» عندنا = **احتياج غذائي مشتق** من خطة/وصفة (ماذا أحتاج لأطبخ ما خططت له). أما «مشتريات المنزل» و«المخزون» و«وضع التسوق» و«حالة الشراء الفعلية» فكلها في Home. موجود فعلًا في Home v4: `home_purchases` (حالات Needed/In Cart/Purchased/Cancelled)، و`home_inventory_items` (نوع «مستهلك»، كمية، حد أدنى، صلاحية)، و`POST /home/purchases` مع `Idempotency-Key`، وأحداث `home.purchase.purchased|received|reversed`. **غير موجود** ويُعدّ **طلبًا** على Home: `POST /home/purchases/from-source` بـ`source_system/source_type/source_id` فريدة، و`GET /home/inventory` بفلتر بحث نصي وبالمستهلكات المنتهية قريبًا (للقراءة)، وحدث `home.purchase.cancelled` (§7.3).

### 3.3 مصفوفة التدهور (عند غياب نظام مرتبط)

| الغائب | سلوك Nutrition |
| :---- | :---- |
| **Home** | قائمة البقالة تعمل داخليًا بالكامل (تحديد «اشتريت» يدويًا)؛ زر «سلّم لـHome» مخفي؛ لا خصم مخزون؛ يبقى «تصدير/نسخ كنص» |
| **Home موجود لكن بلا `from-source`** | يستعمل `POST /home/purchases` العادي بـ`Idempotency-Key` ويحفظ `home_purchase_ref`؛ لا ضمان فرادة على الجانب الآخر (NC-28) |
| **Sports** | لا أيام تمرين تلقائية (يحددها المستخدم يدويًا أو بقاعدة أيام الأسبوع)؛ لا رسم وزن؛ لا يخزَّن بديل |
| **Habit OS** | لا أحداث؛ الماء يعمل داخليًا بلا سلسلة |
| **Finance** | لا أثر؛ لا حقول مالية في النظام أصلًا |
| **Core (إشعارات)** | تنبيهات داخل التطبيق فقط؛ التذكيرات المحلية على الموبايل تبقى (أوفلاين) |
| **Core Files** | بلا صور؛ كل شيء آخر يعمل |
| **Core Search** | بحث داخل النظام فقط؛ لا فهرسة في البحث العام (افتراضيًا ممنوعة أصلًا، §14) |
| **Today** | لا Feed خارجي؛ شاشة Today الداخلية تكفي |
| **كتالوج الأغذية** (غير مُحمَّل/غير مرخَّص) | البحث يغطي أغذية المستخدم وما استورده؛ شاشة فارغة بإرشاد «أضف طعامًا أو استورد CSV» |
| **الإنترنت** | كل شيء يعمل أوفلاين (§13)؛ يتأخر فقط: تسليم Home، قراءة Sports، تحديث الكتالوج، الإشعارات البعيدة |

### 3.4 المبادئ الحاكمة (ملزمة) وتسوية «قواعد التنفيذ المشتركة»

1. **الكمية هي المدخل؛ والباقي مشتق** (تغذية الإدخال، المجاميع، المتبقي، الالتزام). المشتق لا يُحرَّر يدويًا؛ وإن أراد المستخدم تصحيحًا يُعدِّل **المدخلات** أو يُنشئ «تصحيح» موسوم (§6.18).
2. **اللقطة (Snapshot) سيدة التاريخ.** كل إدخال أكل يحمل قيمه المحسوبة وقت التسجيل، وبقاء التاريخ ثابتًا لو تغيّر الطعام لاحقًا (NF-20). إعادة الحساب **قرار مقصود** بمعاينة وتراجع، لا أثر جانبي.
3. **اليوم غير المكتمل ليس صفرًا.** غياب التسجيل ≠ «أكلت 0 سعر». حالة اكتمال اليوم تتحكم في ما يدخل التحليلات (§6.9).
4. **لا قيم صحية مبرمجة.** لا هدف سعرات افتراضي، لا حد ماء افتراضي، لا نسب ماكروز افتراضية، لا مواعيد وجبات ولا صيام مبرمجة. كل رقم يدخله المستخدم أو يُضبط كإعداد.
5. **السلامة النفسية قبل الإحصاء:** وضع إخفاء الأرقام، لغة بلا لوم، لا سلاسل (streaks) عقابية، حارس اختياري لأهداف شديدة الانخفاض بصياغة محايدة (§10.5، §6.21).
6. **الخادم هو المرجع** للحساب والتحقق؛ العميل يحسب محليًا للأوفلاين ثم يتحقق الخادم ويصحح عند اختلاف يتجاوز التسامح (§13).
7. كل شاشة بيانات: **Loading / Empty / Error / Success** (+ Offline/Syncing) (NF-57).
8. كل يوم/موعد يحترم **اليوم المحلي المخزَّن** على الصف (§6.2).
9. **Idempotency** لكل ما يُعاد: إدخال من الأوفلاين، استيراد، توليد بقالة، تسليم Home، بناء ملخص، تذكير.
10. **Soft delete / Archive**؛ المحذوف لا يدخل الحسابات الجارية، والحذف النهائي حق للمستخدم (§14.5).
11. **Audit** لتعديل/حذف إدخال أكل، تغيير أهداف، إعادة حساب مقصودة، تغيير إعدادات الخصوصية.
12. لا تُكرَّر كيانات مملوكة لنظام آخر؛ مراجع `*_ref` فقط (CX-02).
13. **لا scraping** لأي مصدر (CX-22)؛ مصادر البيانات الخارجية بعد التحقق من الترخيص.

**تسوية التناقضات الخمسة في «قواعد التنفيذ المشتركة» (CX §2):**

| # | التناقض | الحسم في هذه الوثيقة |
| :---- | :---- | :---- |
| 1 | «علاقات FK حقيقية» ↔ «لا تكرر كيانًا يملكه غيرك» | داخل Nutrition: FK حقيقية بين جداوله. عبر الأقسام: `*_ref = {system, type, id}` + snapshot عرض + حالة (Valid/Missing/NoAccess) بلا FK (CX-02) → NC-23 |
| 2 | «المشتق لا يُحرَّر» ↔ Daily Summary/Analytics «مملوكة» | ملكيتها = ملكية **Cache قابل لإعادة البناء**، ليست مصدر حقيقة؛ تُبنى من الإدخالات (§6.9) → NC-24 |
| 3 | «توقيت المستخدم لكل المواعيد» ↔ السفر | Nutrition يبقى على توقيت المستخدم، لكن **اليوم المحلي يُثبَّت على الصف وقت الكتابة** مع `tz` الجهاز وقتها، فلا يتحرك سجل قديم عند السفر (§6.2) → NC-25 |
| 4 | «user_id في كل كيان رئيسي» ↔ الكيانات التابعة (child) | الجداول التابعة تُكرّر `user_id` لعزل الصف على الخادم (RLS-like) مع قيد تركيبي `FOREIGN KEY (parent_id, user_id)` يضمن تطابقه مع الأب → NC-26 |
| 5 | «Migration آمن مع backup» ↔ غياب بيانات Notion | لا بيانات Nutrition في Notion (§1.2)؛ تُستبدل بـOnboarding + استيراد CSV بـdry-run وتقرير (§15) → NC-27 |

### 3.5 الملكية والخصوصية والصياغة الطبية

- **شخصي بطبيعته:** كل بيانات Nutrition مملوكة لـ`user_id`، لا مشاركة افتراضيًا. بيانات التغذية **صحية حساسة** (CX-16)؛ لكل كيان **Privacy Tier** (§14.1).
- **لا نصائح طبية/غذائية:** لا «يجب أن تأكل/تقلل»، لا «صحي/غير صحي»، لا تقييم أداء بصيغة نجاح/فشل، لا ربط سببي بين الأكل والوزن أو أي حالة. نسمّي الأشياء بأرقام وسياقات: «هذا اليوم أعلى من المخطط بكذا» لا «تجاوزت».
- **لا تشخيص:** لا حقول لحالات مرضية ولا لحساسية/عدم تحمل كتشخيص. قائمة «استبعاد» (NG-30) تفضيلات يدخلها المستخدم لمساعد الخطة فقط وتوصف بـ«أشياء لا أريدها في الاقتراحات».
- **قانون حماية البيانات الشخصية المصري رقم 151 لسنة 2020** مرجع عام لمعاملة البيانات الصحية بحساسية — **ليس استشارة قانونية** وتفاصيل الالتزام تُراجَع مع مختص قبل الإطلاق.
- **حق المستخدم:** تصدير كامل، حذف كامل، قفل التطبيق، وضع إخفاء الأرقام (§14).

---
## 4) النموذج المفاهيمي

### 4.1 الخريطة

```text
                       ┌───────────────────────── Nutrition OS (قسم مستقل) ─────────────────────────┐
                       │                                                                            │
  كتالوج نظامي (قراءة فقط، بإصدار) ──┐                                                               │
                                     ├─► Food (أغذية المستخدم + نسخ معدّلة) ──► Units/Density/Aliases/Barcodes
  استيراد CSV / إدخال يدوي ──────────┘             │
                                                   ▼
                          Recipe (مكوّنات + خطوات) ──► Batch (طبخ دفعات + بواقي)
                                                   │
        Plan (Rolling/Fixed/Template) ─► Plan Slot ─► Plan Items ──(تحويل إلى فعلي + لقطة)──┐
                                                   │                                         ▼
                                                   │            Meal (حاوية فعلية) ─► Food Log Entry  ◄── Quick Add / Barcode / Recent / Favorite
                                                   │                                         │ (Snapshot ثابت)
        Water Log ◄── Beverage (معامل يحدده المستخدم)        Supplement Log                  │
                │                                                                            ▼
                └──────────────────────► Day Mark (اكتمال اليوم) ──► Daily Summary (Cache) ──► Analytics/Review (Cache)
                                                   ▲                         ▲
        Targets Profile (أهداف/ملفات التغذية) ──► Assignments (تواريخ) ──► Day Types (تدريب/راحة/مخصّص)
                                                   │
        Grocery List ◄── (Plan Items + Recipes) ──► دمج وحدات ──► (اختياري) طرح مخزون Home ──► Handoff ──► Home Purchases
                                                   │
        Reminders/Windows (فترات أكل/صيام يحددها المستخدم) ──► Core Notifications (نص محايد)
```

### 4.2 المفاهيم الأساسية بلغة بسيطة

| المفهوم | معناه | مثال |
| :---- | :---- | :---- |
| **Catalog Food** | طعام من الكتالوج النظامي: **للقراءة فقط**، له إصدار، لا يملكه مستخدم | «أرز أبيض مطبوخ» إصدار 3 |
| **Food** | طعام **المستخدم**: مدخل يدويًا أو منسوخ/معدّل من الكتالوج أو من باركود | «كشري أمي — الطبق المتوسط» |
| **Basis (الأساس)** | الكمية التي تُنسب إليها القيم الغذائية: 100 جم، 100 مل، أو حصة واحدة | بروتين 12 جم لكل 100 جم |
| **Unit (وحدة)** | جرام، مل، كوب، ملعقة، رغيف، حصة… ولكل طعام وحداته المنزلية | رغيف عيش بلدي = 90 جم (يدخلها المستخدم) |
| **Recipe** | وصفة: مكوّنات بجدول + عدد حصص + خطوات | شوربة عدس — 4 حصص |
| **Batch** | «طبخة» فعلية من وصفة: وزنها بعد الطهي وعدد حصصها ورصيدها المتبقي | طبخت 1,800 جم، أكلت 450 جم |
| **Plan / Slot / Item** | خطة ← خانة (فطار/غداء…) ← بنود مخططة | الأحد/غداء: دجاج 150 جم + أرز 120 جم |
| **Meal** | وجبة **فعلية** حدثت (حاوية لإدخالات الأكل) | غداء اليوم 2:30 م |
| **Food Log Entry** | إدخال أكل واحد بلقطة غذائية ثابتة | 150 جم دجاج = 248 سعرًا (وقت التسجيل) |
| **Day Mark** | تعليم المستخدم للحالة: اكتمل / لا أسجّل اليوم / صائم… | «يوم غير مكتمل» ≠ 0 سعر |
| **Targets Profile** | ملف أهداف: أهداف لكل مقياس، لكل نوع يوم، بتواريخ | «ملف الشتاء» |
| **Daily Summary** | مجاميع اليوم (Cache) تُعاد من الإدخالات | 1,840 سعرًا، 92 جم بروتين |

### 4.3 رحلة إدخال واحد (من الضغطة إلى الملخص)

1. المستخدم يكتب «ارز» → البحث العربي المطبَّع يعرض: المفضلة، الأخيرة، أغذيته، ثم الكتالوج (§6.17).
2. يختار «أرز أبيض مطبوخ»، يكتب 150 جم (أو يختار «كوب» فتتحول لجرام عبر وحدات الطعام).
3. العميل يحسب اللقطة محليًا (نفس مكتبة الحساب المشتركة)، ويخزن الإدخال محليًا بـ`client_op_id`.
4. الخادم (عند المزامنة) يعيد الحساب، يقبل اللقطة إن توافقت ضمن تسامح، وإلا يستبدلها ويُعلم العميل.
5. يُحدَّث الملخص اليومي (Cache) في طابور بتجميع، ويُعاد بناء المتبقي في Today.
6. لو تغيّر تعريف «أرز أبيض مطبوخ» لاحقًا: **الإدخال القديم لا يتغير** (NF-20).

---

## 5) نموذج البيانات الكامل

### 5.0 الحقول العامة والقواعد

**كل كيان رئيسي:** `id` UUID · `user_id` NOT NULL (الملكية؛ يُستخرج من الجلسة لا من الطلب) · `created_at` · `updated_at` · `deleted_at` (Soft Delete حيث ينطبق) · `version` int (تزامن متفائل، يزيد عند كل تعديل) · `is_demo` bool (وضع التجربة).

**الكيانات التابعة (child):** تحمل `user_id` أيضًا، مع قيد تركيبي يربطها بأبيها: `FOREIGN KEY (parent_id, user_id) REFERENCES parent(id, user_id)` (NC-26). `UNIQUE(id, user_id)` على كل جدول رئيسي لتمكين ذلك.

**الأرقام (ملزمة):**

| القاعدة | التفصيل |
| :---- | :---- |
| النوع | الكميات `DECIMAL(12,3)`؛ المغذيات `DECIMAL(10,2)` (سعرات ملّيغرام صوديوم…) و`DECIMAL(10,3)` للجرامات الصغيرة؛ الأساس `DECIMAL(10,3)`. ممنوع float/double في أي طبقة (DB، API، العميل). في JSON تُرسَل نصوصًا (`"150.000"`). |
| مجهول ≠ صفر | الحقل الغذائي الفارغ (`NULL`) = **غير معروف** (ملصق بلا سكر مثلًا). لا يُحوَّل لصفر أبدًا. المجاميع تعامل المجهول كغائب وتضع علم `has_unknown` (§6.9). |
| التقريب | `ROUND_HALF_UP` عند **الحفظ** (اللقطة) لا عند العرض فقط؛ المجاميع = **مجموع القيم المقرّبة المخزّنة** فتتطابق مع الصفوف تمامًا (NT-09). |
| الطاقة | تُخزَّن بالسعرات الحرارية (`kcal`) داخليًا. العرض بـkJ إعداد (يحول عند العرض فقط). |
| التواريخ | `local_date` (DATE) تُخزَّن على الصف + اللحظة `*_at` UTC + `tz` IANA وقت الكتابة (§6.2). |
| النصوص | UTF-8؛ تُخزَّن كما أُدخلت + `name_norm` مطبَّعة للبحث (§6.17). |
| المراجع الخارجية (CX-02) | ثلاثة أعمدة `*_ref_system`, `*_ref_type`, `*_ref_id` + `*_ref_snapshot` (نص عرض) + `*_ref_state` (`Valid|Missing|NoAccess`). **بلا FK**. |

### 5.1 الإعدادات والقوائم

**`nutrition_settings`** (صف واحد لكل مستخدم، `UNIQUE(user_id)`):

| الحقل | النوع | افتراضي | ملاحظات |
| :---- | :---- | :---- | :---- |
| timezone | IANA string | من الحساب (Africa/Cairo) | يحدد اليوم المحلي للإدخالات **الجديدة** |
| day_start_time | time | 00:00 | بداية «يوم التغذية» (من لا يريد أن يُحسب أكل بعد منتصف الليل لليوم التالي يضبطها 04:00) (ND-04) |
| week_start_day | smallint 0–6 | 6 (السبت) | |
| energy_unit | enum | `kcal` | `kcal|kJ` عرضًا فقط |
| display_mode | enum | `Full` | `Full|Hidden|Qualitative` (§10.5) |
| tolerance_pct | decimal(5,2) | 10.00 | تسامح الالتزام العام؛ يُستثنى بتسامح لكل مقياس في الهدف (ND-09) |
| include_partial_in_analytics | bool | false | هل تدخل الأيام «الجزئية» في المتوسطات |
| auto_complete_policy | enum | `Ask` | `Ask|AfterMealsCount|Never` (§6.9) |
| auto_complete_min_meals | smallint | null | مع `AfterMealsCount` |
| day_close_prompt_time | time | null | وقت سؤال «اكتمل يومك؟» |
| guard_enabled | bool | true | الحارس الاختياري (§6.21) |
| guard_floor_kcal | decimal(8,2) | null | حد **يضبطه المستخدم** لتنبيهه هو؛ فارغ = يعتمد حد المشغّل إن وُجد |
| estimator_enabled | bool | false | المعادلات التقديرية (§6.19) |
| numerals | enum | `Latin` | `Latin|ArabicIndic` |
| fraction_display | bool | true | عرض ½ ¼ للحصص |
| default_servings_step | decimal | 0.25 | |
| outbound_events | jsonb | `{}` كلها false | مفتاح لكل حدث صادر (§11.8) |
| home_integration | jsonb | `{enabled:false, pantry_subtract:false}` | |
| sports_integration | jsonb | `{enabled:false, day_types:false, weight:false}` | |
| habit_water_ref | ref triple | null | |
| quiet_hours | jsonb | يرث Core | |
| daily_notification_cap | smallint | 6 | |
| weekly_review_day/time | smallint/time | الجمعة 20:00 | |
| app_lock_required | bool | false | (§14) |
| search_index_optin | bool | false | **ممنوع** افتراضيًا (Global Search) |

**`nutrition_meal_types`** (أنواع الوجبات — يحددها المستخدم؛ تُزرع قائمة مبدئية قابلة للحذف عند الـOnboarding فقط): `id, user_id, code (slug فريد للمستخدم), label_ar, label_en, position, default_time (time, اختياري — لا قيم مبرمجة، يُملأ من اختيار المستخدم), color, is_active`. قائمة البذرة الاقتراحية: فطار، غداء، عشاء، سناك، (يحذفها/يعدلها). `UNIQUE(user_id, code)`.

**`nutrition_units`** (نظامي، بلا user_id — جدول مرجعي ثابت يُحدَّث بإصدار): `code PK, kind {mass|volume|count|serving}, name_ar, name_en, symbol, to_base_factor decimal(18,8)` (الكتلة→جرام، الحجم→مل، العدّ/الحصة بلا عامل: `NULL`), `is_system`.

| code | kind | to_base | ملاحظة |
| :---- | :---- | :---- | :---- |
| g | mass | 1 | أساس الكتلة |
| kg | mass | 1000 | |
| mg | mass | 0.001 | للمكملات |
| oz | mass | 28.349523125 | مخفية افتراضيًا (ND-22) |
| lb | mass | 453.59237 | مخفية افتراضيًا |
| ml | volume | 1 | أساس الحجم |
| l | volume | 1000 | |
| tsp / tbsp / cup | volume | قابلة للضبط بالمستخدم: `settings.cup_ml` (افتراضي 240)، `tbsp_ml` (15)، `tsp_ml` (5) | **المعيار يختلف حسب البلد** — لذلك إعداد لا ثابت (**غير مؤكد — يُتحقق**) |
| fl_oz | volume | 29.5735295625 | مخفية افتراضيًا |
| piece | count | — | «حبة»؛ تحويلها خاصة بالطعام |
| serving | serving | — | الحصة المعرّفة على الطعام |
| custom | count | — | وحدة منزلية يعرّفها المستخدم لطعام معين (رغيف، كوباية الشاي) |

**`nutrition_nutrient_defs`** (نظامي): `code PK (مثل sugar_g, sodium_mg, iron_mg, vitamin_c_mg…), name_ar, name_en, unit, category {Core|Mineral|Vitamin|Other}, tracked_in_summary bool, position`. الأساسية (Core): `calories_kcal, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg`. الباقي لخانة `micronutrients`. **لا قيم مرجعية يومية (RDA) هنا** (NV-10).

### 5.2 الكتالوج النظامي (للقراءة فقط وبإصدار)

**`nutrition_catalog_versions`** (بلا user_id):

| الحقل | النوع | إلزامي | قيد | ملاحظة |
| :---- | :---- | :---- | :---- | :---- |
| id | UUID | نعم | PK | |
| version_no | int | نعم | UNIQUE | يزيد |
| source_name | string | نعم | | اسم المصدر (مثلًا «مجموعة بيانات X») |
| license_status | enum | نعم | `Unverified|Verified|Restricted|Rejected` | **لا تُنشر نسخة `Unverified` للمستخدمين** (NV-01) |
| license_note | text | لا | | رابط/نص الترخيص الذي فُحص |
| attribution_text | text | لا | | نص النسبة إن لزم |
| imported_at / published_at | timestamptz | | | |
| item_count | int | | | |
| checksum | string | | | تحقق سلامة الحزمة |
| status | enum | نعم | `Draft|Published|Retired` | |

**`nutrition_catalog_foods`** (بلا user_id، **غير قابل للتعديل بعد النشر**):

| الحقل | النوع | إلزامي | قيد | ملاحظة |
| :---- | :---- | :---- | :---- | :---- |
| id | UUID | نعم | PK | ثابت للأبد (الإدخالات القديمة تشير إليه) |
| catalog_version_id | FK | نعم | | |
| external_code | string | لا | UNIQUE(version, code) | رمز المصدر |
| supersedes_id | FK self | لا | | يربط النسخة الأحدث بالأقدم |
| name_ar / name_en | string | واحد على الأقل | | |
| brand | string | لا | | |
| category_code | string | لا | | تصنيف مرجعي (مجموعات غذائية) |
| basis_type | enum | نعم | `per_100g|per_100ml|per_serving` | |
| basis_qty | decimal | نعم | >0 | 100 أو 1 |
| serving_size / serving_unit | decimal/unit | لا | | حصة افتراضية |
| density_g_per_ml | decimal | لا | >0 | لتحويل حجم↔كتلة |
| state | enum | نعم | `raw|cooked|dry|prepared|packaged|na` | خام/مطبوخ… (§6.6) |
| calories_kcal … sodium_mg | decimal | | ≥0 أو NULL | القيم الأساسية السبعة |
| micronutrients | jsonb | لا | مفاتيح ∈ nutrient_defs | |
| data_quality | enum | نعم | `Reference|Reported|Estimated` | درجة موثوقية المصدر |
| is_beverage | bool | | | |
| status | enum | نعم | `Active|Retired` | لا حذف |

كذلك: **`nutrition_catalog_units`** (حصص منزلية: `catalog_food_id, unit_code/label, grams_per_unit, is_default`)، **`nutrition_catalog_aliases`** (`catalog_food_id, alias, alias_norm, kind {Synonym|Dialect|Translit}`)، **`nutrition_catalog_barcodes`** (`barcode, catalog_food_id`, PK `barcode`).

> **سياسة الكتالوج:** يبدأ التطبيق **بكتالوج فارغ** ما لم يُرخَّص مصدر (ND-01). مصادر مرشّحة وحالتها: USDA FoodData Central — **غير مؤكد — يُتحقق قبل البناء** (يُذكر عادة أنه متاح للاستخدام العام لكن يجب فحص الشروط الحالية)؛ Open Food Facts — **غير مؤكد — يُتحقق قبل البناء** (ترخيص قواعد بيانات بشروط نسبة ومشاركة بالمثل — تأكد)؛ جداول تركيب أغذية مصرية/عربية رسمية — **غير مؤكد — يُتحقق قبل البناء** (وجودها بصيغة قابلة للاستيراد وترخيصها غير معروف)؛ واجهات تجارية — بعد مراجعة الشروط. **لا scraping** (CX-22). كل ادعاء بوجود تغطية للأكلات المصرية (كشري، ملوخية…) **غير مؤكد** ويُسدّ بإدخال المستخدم وحزمة بداية يعدّها فريقك بمصدر مرخّص (ND-02).

### 5.3 أغذية المستخدم وملحقاتها

**`nutrition_foods`** (يملكها المستخدم):

| الحقل | النوع | إلزامي | قيد | ملاحظة |
| :---- | :---- | :---- | :---- | :---- |
| id / user_id | UUID | نعم | PK / `UNIQUE(id,user_id)` | |
| name | string(160) | نعم | غير فارغ | |
| name_norm | string | نظام | | مطبَّعة (§6.17) |
| brand | string(120) | لا | | |
| origin | enum | نعم | `Custom|CatalogCopy|Barcode|Imported|Recipe|OutOfHome` | `Recipe`: طعام ناتج من وصفة (للتسجيل السريع) |
| catalog_food_id | FK | لا | يُلزَم مع `CatalogCopy` | الأصل في الكتالوج |
| catalog_version_at_copy | int | لا | | لمعرفة أن الأصل تحدّث (§9.1) |
| basis_type / basis_qty | enum/decimal | نعم | كما الكتالوج | |
| serving_size / serving_unit | decimal / unit | لا | | الحصة الافتراضية (يقابل حقلي المصدر) |
| density_g_per_ml | decimal | لا | >0 | |
| state | enum | نعم | `raw|cooked|dry|prepared|packaged|na` | |
| cooked_variant_of_food_id | FK self | لا | | يربط «مطبوخ» بـ«خام» |
| yield_ratio | decimal | لا | >0 | وزن مطبوخ ÷ وزن خام (§6.6) |
| calories_kcal, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg | decimal | calories/protein/carbs/fat مطلوبة إلا `OutOfHome`/تقدير | ≥0 | مجهول = NULL |
| micronutrients | jsonb | لا | | |
| is_beverage | bool | لا | | |
| verification_level | enum | نعم | `Unverified|UserConfirmed|SourceVerified` | يقابل `verified` في المصدر |
| source_note | string | لا | | يقابل `source` النصي |
| status | enum | نعم | `Active|Archived` | يقابل `status` |
| is_favorite | bool | لا | | (المفضلة؛ جدول بديل في §5.3.2 لتمثيل الكتالوج) |
| photo_file_ref | file_ref | لا | | ملصق/صورة (Core Files) |
| food_version | int | نظام | يزيد عند تغيير القيم الغذائية | |
| quality_flags | jsonb | نظام | | مثل `ATWATER_MISMATCH` (§6.20) |

> **تعديل غذاء كتالوج:** لا يُعدَّل. الواجهة تعرض «حفظ نسختي» فتنشئ `nutrition_foods` بـ`origin=CatalogCopy` و`catalog_food_id` (copy-on-write). الإدخالات القديمة تبقى على الأصل. هذا يحل «Foods بلا user_id» (NC-01).

**`nutrition_food_versions`** (تاريخ قيم غذاء المستخدم): `id, user_id, food_id, food_version, values jsonb (القيم الغذائية والأساس والكثافة وقت الإصدار), changed_at, change_reason`. يُنشأ صف كلما تغيرت قيمة غذائية؛ يُستخدم في «إعادة الحساب المقصودة» (§6.18) وللدفاع عن اللقطة (`snapshot_basis` يخزّن `food_version`).

**`nutrition_food_units`** (وحدات منزلية لكل غذاء مستخدم): `id, user_id, food_id, label (نص مثل «رغيف» «كوباية الشاي»), unit_kind {mass|volume|count}, base_qty decimal (الجرامات أو المل للوحدة الواحدة), is_default, position`. `UNIQUE(food_id, label)`. تبقى متاحة للكتالوج عبر `nutrition_catalog_units`، ويمكن للمستخدم إضافة وحدات خاصة لغذاء كتالوج في `nutrition_food_units` بـ`catalog_food_id` بدل `food_id` (CHECK: واحد فقط).

**`nutrition_food_aliases`** (أسماء بديلة للمستخدم): `id, user_id, food_id|catalog_food_id, alias, alias_norm`. للبحث (§6.17).

**`nutrition_search_synonyms`** (مجموعات مرادفات): `id, user_id (NULL = نظامية)، group_key, terms text[] , terms_norm text[], kind {Synonym|Dialect|Translit|Spelling}, is_active`. النظامية تحمّلها حزمة بإصدار؛ الشخصية للمستخدم. الأمثلة الواردة في §6.17 **توضيحية** وليست قاموسًا نهائيًا.

**`nutrition_food_barcodes`** (باركود المستخدم): `id, user_id, barcode string, barcode_type {EAN13|EAN8|UPCA|UPCE|ITF14|Other}, food_id|catalog_food_id, pack_size_qty/unit (اختياري), source {Scan|Manual|Import}, UNIQUE(user_id, barcode)`. صيغ الباركود التجاري GTIN-8/12/13/14 معيار معروف؛ **التحقق من خانة الفحص (check digit)** مطلوب (NV-14). (**غير مؤكد — يُتحقق** من كل ما يخص مزوّد بحث باركود خارجي.)

**`nutrition_food_favorites`**: `user_id, food_ref_kind {user|catalog}, food_id|catalog_food_id, position, created_at` — مفضلة موحّدة للأغذية (وكذلك للوصفات عبر `is_favorite` في الوصفة).

**`nutrition_food_usage`** (Cache قابل للبناء من السجل): `user_id, food_ref_kind, food_id|catalog_food_id|recipe_id, last_used_at, use_count, last_quantity, last_unit, typical_meal_type_id`. يغذي «الأخيرة» و«الأكثر استخدامًا» وترتيب البحث. يُعاد بناؤه من `food_log_entries`.

**`nutrition_food_exclusions`** (NG-30): `id, user_id, food_ref | free_text, note`. «أشياء لا أريدها في اقتراحات الخطة والبقالة». ليست تشخيصًا ولا تحذيرًا صحيًا.

**`nutrition_hydration_rules`**: `id, user_id, food_ref (user/catalog), factor_pct decimal(5,2) ≥0 ≤100`. **لا قيم افتراضية** عدا «ماء» (100) في الواجهة؛ الشاي/القهوة/العصير تُترك للمستخدم (ND-05).

### 5.4 الوصفات والدفعات

**`nutrition_recipes`**:

| الحقل | النوع | إلزامي | قيد | ملاحظة |
| :---- | :---- | :---- | :---- | :---- |
| id / user_id | UUID | نعم | | |
| name / name_norm | string | نعم | | |
| description | text | لا | | |
| servings | decimal(8,3) | نعم | >0 | عدد الحصص (يقبل كسورًا) |
| yield_weight_g | decimal | لا | >0 | وزن الناتج **مطبوخًا** (§6.6) |
| prep_minutes / cook_minutes | int | لا | ≥0 | المصدر: `preparation_time` |
| instructions_text | text | لا | | بديل للخطوات الحرة؛ الخطوات المهيكلة في جدولها |
| notes | text | لا | | |
| is_favorite | bool | لا | | |
| photo_file_ref | file_ref | لا | | |
| source_url | string | لا | | رابط مرجعي فقط؛ لا جلب تلقائي |
| status | enum | نعم | `Draft|Active|Archived` | |
| recipe_version | int | نظام | يزيد عند تغيير مكوّن/حصص | |
| ingredients_hash | string | نظام | | بصمة المكوّنات لإبطال الكاش |
| total_* (calories_kcal, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, micronutrients) | decimal | **مشتق** | يقابل `nutrition_total` | Cache — لا يُحرَّر |
| per_serving_* | decimal | **مشتق** | يقابل `nutrition_per_serving` | Cache |
| completeness | enum | مشتق | `Complete|HasUnknown|HasUnmatched` | وجود مكوّنات بلا قيم/بلا ربط |
| computed_at | timestamptz | نظام | | |

**`nutrition_recipe_ingredients`** (المكوّنات كجدول): `id, user_id, recipe_id (FK مركّب), position, food_id|catalog_food_id|sub_recipe_id (واحد فقط) أو free_text_name (غير مرتبط), quantity decimal >0, unit_code, weight_basis {as_listed|raw|cooked}, quantity_base decimal (مشتق: جم/مل), note, is_optional, group_label (مثل «للصلصة»), resolved_state {Matched|Unmatched|UnitUnknown}`. `CHECK` مصدر واحد أو نص حر. `UNIQUE(recipe_id, position)`.

**`nutrition_recipe_steps`**: `id, user_id, recipe_id, position, text, timer_seconds (اختياري), photo_file_ref`.

**`nutrition_recipe_tags`**: `recipe_id, user_id, tag (≤40 حرفًا), UNIQUE(recipe_id, tag)`. (قيم قالب Notion: Quick, Vegetarian…، تُستورد كنصوص حرة؛ لا أوصاف صحية مبرمجة).

**`nutrition_batches`** (طبخ دفعات):

| الحقل | النوع | إلزامي | قيد | ملاحظة |
| :---- | :---- | :---- | :---- | :---- |
| id / user_id | | نعم | | |
| recipe_id | FK | لا | | بلا وصفة = «طبخة حرة» بمكوّنات مدخلة |
| name | string | نعم | | |
| cooked_on | date | نعم | | |
| cooked_total_weight_g | decimal | لا* | >0 | *إلزامي لو سيُسجَّل بالجرام |
| servings_made | decimal(8,3) | نعم | >0 | |
| total_* (calories…) | decimal | نعم | | **لقطة** إجمالي الطبخة وقت الإنشاء |
| snapshot_basis | jsonb | نعم | | نسخة الوصفة وقيم المكوّنات وقتها |
| remaining_g / remaining_servings | decimal | **مشتق** | ≥0 | = المبدئي − Σ المسجّل (§6.7) |
| status | enum | نعم | `Active|Finished|Discarded` | |
| storage_note | string | لا | | نص حر |
| keep_until_hint | date | لا | | تذكير يحدده المستخدم؛ **ليس حكمًا على سلامة الغذاء** |

### 5.5 الوجبات وسجل الأكل

**`nutrition_meals`** (الوجبة **الفعلية** فقط — بعد NC-03):

| الحقل | النوع | إلزامي | قيد | ملاحظة |
| :---- | :---- | :---- | :---- | :---- |
| id / user_id | | نعم | | |
| local_date | date | نعم | | |
| meal_type_id | FK | لا | | |
| name | string | لا | | يقابل `name` |
| time_at | timestamptz | لا | | يقابل `time` — وقت الوجبة |
| tz | string | نعم | | |
| status | enum | نعم | `Open|Closed|Skipped` | `Skipped` = اخترتُ ألا آكل (≠ ناقص) |
| recipe_id | FK | لا | | الوصفة الرئيسية للوجبة (اختياري) |
| from_plan_slot_id | FK | لا | | إن نتجت من تحويل خانة مخططة |
| venue_label | string(80) | لا | Sensitive | «مطعم/بيت فلان» نص حر |
| notes | text | لا | | |
| photo_file_ref | file_ref | لا | | |

> عمود المصدر `planned_or_actual` **لم يعد موجودًا**؛ المخطط في `plan_slots` (NC-03). في الترحيل: كل Meal بـ`planned` ينتقل خانة مخططة (§15).

**`nutrition_food_log_entries`**:

| الحقل | النوع | إلزامي | قيد | ملاحظة |
| :---- | :---- | :---- | :---- | :---- |
| id / user_id | | نعم | | |
| meal_id | FK مركّب | لا | | بلا وجبة = «بدون وجبة» |
| logged_at | timestamptz | نعم | | يقابل `date_time` |
| local_date | date | نعم | | مخزّن؛ يُعاد حسابه فقط عند تعديل `logged_at` |
| tz | string | نعم | | منطقة الجهاز وقت التسجيل |
| entry_kind | enum | نعم | `Food|Recipe|Batch|QuickMacros|OutOfHome` | |
| catalog_food_id / food_id / recipe_id / batch_id | FK | حسب النوع | **CHECK: واحد فقط** لأنواع Food/Recipe/Batch؛ لا شيء لـQuickMacros/OutOfHome | يحسم `food_id` و`recipe_id` معًا (NC-05) |
| display_name | string | نعم | | اسم لقطة (يبقى لو حُذف الأصل) |
| food_version / recipe_version | int | لا | | وقت اللقطة |
| quantity | decimal(12,3) | نعم | >0 | |
| unit_code | FK | نعم | | يشمل `serving` (الحصة الكسرية 0.5) |
| quantity_base | decimal(12,3) | مشتق | | جم أو مل بعد التحويل؛ NULL لو بلا أساس |
| calories_kcal | decimal(10,2) | نعم | ≥0 | `calories_snapshot` |
| protein_g / carbs_g / fat_g | decimal | نعم لـFood/Recipe/Batch | ≥0 | لقطات المصدر |
| fiber_g / sugar_g / sodium_mg | decimal | لا | ≥0 أو NULL | NULL = مجهول |
| micronutrients_snapshot | jsonb | لا | | |
| snapshot_basis | jsonb | نعم | | `{basis_type, basis_qty, per_values, source_kind, source_version, density, yield, state, rounding_ver}` |
| confidence | enum | نعم | `Exact|Estimated|Rough` | افتراضي Exact (طعام معروف) / Estimated (OutOfHome) |
| range_min_kcal / range_max_kcal | decimal | لا | min ≤ cal ≤ max | نطاق تقدير |
| estimation_method | enum | لا | `Menu|SimilarItem|Visual|Guess` | للأكل الخارجي |
| source | enum | نعم | `Manual|Search|Barcode|Recent|Favorite|QuickAdd|PlanConversion|Copy|Import|Batch` | |
| plan_item_id | FK | لا | | الأصل في الخطة |
| photo_file_ref | file_ref | لا | | |
| notes | text | لا | ≤1000 | |
| corrected_from_entry_id | FK self | لا | | تصحيح (بدل عدّ مزدوج) |
| recalc_run_id / recalculated_at | FK / ts | لا | | إن مسّته إعادة حساب مقصودة |
| client_op_id | UUID | نعم عند الإنشاء من عميل | `UNIQUE(user_id, client_op_id)` | Idempotency |

**`nutrition_log_entry_history`** (Audit خفيف لإدخال الأكل): `id, user_id, entry_id, action {Edit|Delete|Restore|Recalc}, before jsonb, after jsonb, at, by_client`. يحفظ ≥ 90 يومًا (قابلة للضبط) ويُحذف مع الحذف الكامل (§14.5).

### 5.6 أهداف/ملفات التغذية (Nutrition Targets Profiles — CX-19)

> الاسم التقني `nutrition_goals` والمسار `/nutrition/goals` كما في المصدر. في الواجهة والوثائق: «ملف أهداف التغذية».

**`nutrition_goals`** (الملف): `id, user_id, name, goal_type {Maintenance|FatLoss|MuscleGain|Performance|General|Custom}, description, status {Draft|Active|Archived}, goal_ref (Core Goals، اختياري), created…`. نوع الهدف **وسم تنظيمي فقط**: لا يملأ أي أرقام (NC-19). `FatLoss/MuscleGain` تظهر بأسماء محايدة في الواجهة («خفض»، «زيادة») ويستطيع المستخدم إعادة تسميتها (labels في الإعدادات).

**`nutrition_goal_targets`** (أهداف لكل مقياس ولكل نوع يوم):

| الحقل | النوع | إلزامي | قيد | ملاحظة |
| :---- | :---- | :---- | :---- | :---- |
| id / user_id / goal_id | | نعم | FK مركّب | |
| day_type_id | FK | لا | NULL = كل الأنواع (افتراضي) | تدريب/راحة/مخصص |
| metric | enum | نعم | `calories|protein_g|carbs_g|fat_g|fiber_g|sugar_g|sodium_mg|water_ml|meals_count` + أي `nutrient_def` | |
| value_kind | enum | نعم | `Absolute|PctCalories` | الماكروز كنسبة من السعرات (4/4/9 تقريبي، §6.20) |
| direction | enum | نعم | `Around|AtLeast|AtMost|Range` | |
| target_value | decimal | لـAround/AtLeast/AtMost | >0 | |
| min_value / max_value | decimal | لـRange | min ≤ max | |
| tolerance_pct | decimal | لا | | يتجاوز العام لهذا المقياس |
| effective_from | date | نعم | | **تاريخ سريان القيمة** (تاريخ الأهداف) |
| effective_to | date | لا | ≥ from | يُغلق تلقائيًا عند إضافة قيمة أحدث |

لا `UNIQUE` على (goal, metric, day_type) بل **عدم تداخل** الفترات (EXCLUDE بنطاق التواريخ). المصدر: `target_calories, protein_g, carbs_g, fat_g, fiber_g, water_ml` = صفوف بـmetric مقابل.

**`nutrition_goal_assignments`** (أي ملف نشط في أي تواريخ): `id, user_id, goal_id, start_date, end_date (NULL=مفتوح), reason`. **لا تداخل** لنفس المستخدم (EXCLUDE). يقابل `start_date/end_date/active` في المصدر؛ و«active» = وجود تعيين يغطي اليوم (مشتق).

**`nutrition_day_types`**: `id, user_id, code, label, is_default (واحد فقط), color`. (مثل: عادي، تدريب، راحة، مخصّص. لا بذور مبرمجة سوى «عادي» الافتراضي.)

**`nutrition_day_type_assignments`**: `user_id, local_date, day_type_id, source {Manual|Rule|Sports}, set_at`; `UNIQUE(user_id, local_date)`. الأولوية: Manual > Sports > Rule > الافتراضي (§6.10).

**`nutrition_day_type_rules`**: `id, user_id, weekday smallint, day_type_id, effective_from, effective_to`.

### 5.7 الماء والمشروبات والمكملات

**`nutrition_water_logs`**: `id, user_id, logged_at, local_date, tz, amount_ml decimal(8,1) >0 ≤ حد معقول قابل للضبط (NV-20), source {Manual|QuickButton|Preset|FromFoodLog|Import|Habit}, preset_id, food_log_entry_id (FK، لو من مشروب مسجّل), note, client_op_id`.

**`nutrition_water_presets`**: `id, user_id, label (كوباية، زجاجة صغيرة…), amount_ml, position, icon`. يُضاف يدويًا (لا مقادير مبرمجة).

**`nutrition_supplements`** (تعريف مكمل — **بلا ادعاءات**): `id, user_id, name, form {Tablet|Capsule|Powder|Liquid|Other}, default_dose_qty, dose_unit (mg|g|ml|piece…), label_note (نص حر يصف المكتوب على العبوة)، counts_in_totals bool (هل تدخل قيمها في مجاميع المغذيات)، nutrients_per_dose jsonb (يدخلها المستخدم من الملصق)، status`.
**`nutrition_supplement_logs`**: `id, user_id, supplement_id, taken_at, local_date, tz, dose_qty, dose_unit, note, client_op_id`. لا تحقق من جرعات «آمنة»، لا تحذير تداخل (NV-31).

### 5.8 الخطط

**`nutrition_meal_plans`**: `id, user_id, name, plan_type {Fixed|Rolling|Template}, start_date, end_date (Fixed فقط), cycle_days (Template فقط), goal_id (FK اختياري)، status {Draft|Active|Completed|Archived}, notes`. خطة **Rolling** واحدة ضمنية لكل مستخدم باسم «خطتي المفتوحة» تُنشأ عند أول تخطيط بلا خطة (`UNIQUE` جزئي). `goal_id` اختياري: تعيين الملف يكون بالتواريخ في `goal_assignments`، وهذا الحقل «ملف مقترح للخطة» فقط.

**`nutrition_plan_days`**: `id, user_id, plan_id, plan_date (لـFixed/Rolling) أو day_index (لـTemplate) — CHECK أحدهما فقط, day_type_id, target_calories/target_* (اختيار يدوي لهدف اليوم المخطط، يقابل المصدر؛ وإلا يُشتق من ملف الأهداف), planned_*_total (مشتق Cache), notes`. `UNIQUE(plan_id, plan_date)` و`UNIQUE(plan_id, day_index)`.

**`nutrition_plan_slots`** (يقابل `meal_slots`): `id, user_id, plan_day_id, meal_type_id, position, planned_time (time), status {Planned|Logged|Skipped|Dismissed}, converted_meal_id (FK→meals), note`.

**`nutrition_plan_items`**: `id, user_id, slot_id, position, food_id|catalog_food_id|recipe_id|batch_id (واحد فقط), quantity, unit_code, note, planned_calories_kcal/protein_g/carbs_g/fat_g (مشتق Cache)`.

**`nutrition_plan_suggestions`** (مخرجات مساعد الخطة قبل التأكيد): `id, user_id, plan_id|NULL, target_date_range, payload jsonb (بنود مقترحة)، basis jsonb (من أين اقتُرحت: مفضلة/متكرر/فجوة بروتين)، status {Proposed|Accepted|Partially|Dismissed|Expired}, created_at, expires_at`. لا تدخل أي حساب حتى `Accepted` (NV-33).

### 5.9 البقالة

**`nutrition_grocery_lists`**: `id, user_id, name, origin {Plan|Recipes|Manual|Mixed}, plan_id (اختياري), date_from, date_to, status {Draft|Active|HandedOff|Completed|Archived}, generation_key (UNIQUE مع user: بصمة المدخلات للـIdempotency), pantry_subtract_applied bool, notes`.

**`nutrition_grocery_sections`** (أقسام: خضار، ألبان… يحددها المستخدم؛ ترتيب يطابق مشاويره): `id, user_id, label, position, home_category_hint`.

**`nutrition_grocery_items`**: `id, user_id, list_id, section_id, food_id|catalog_food_id (اختياري) + name (نص عرض), merge_key (مطبَّع: food_ref أو name_norm + base_kind), qty_needed_base decimal (جم/مل/عدد), base_kind {mass|volume|count}, display_qty, display_unit, qty_in_stock_base (من Home — مجمَّد وقت الطرح), qty_to_buy_base (مشتق = max(0, needed − stock)), status {Needed|Purchased|Skipped}, purchased_via {Manual|HomeSync}, manual_override bool, handoff_state {None|Queued|Sent|Acknowledged|Failed|Detached}, home_purchase_ref (ref triple), handoff_idempotency_key, last_error, note`. `UNIQUE(list_id, merge_key)`.

**`nutrition_grocery_item_sources`** (لماذا هذا البند؟): `id, user_id, item_id, plan_item_id|recipe_id|manual, contribution_base, contribution_label`. تمكّن «أظهر من أين جاء 450 جم دجاج» وتجنّب العدّ المزدوج عند إعادة التوليد.

**`nutrition_home_item_map`** (ربط اختياري يؤكده المستخدم بين غذاء وعنصر مستهلك في Home): `id, user_id, food_id|catalog_food_id|name_norm, home_item_ref (triple), home_unit (قطعة|عبوة|كيلو|لتر|علبة…), factor_to_base decimal (كم جرام/مل/عدد في وحدة Home الواحدة), confirmed_at`. بدونه لا طرح مخزون آلي (§6.16).

### 5.10 فترات الأكل والتذكيرات

**`nutrition_eating_windows`** (يحددها المستخدم؛ لا قيم مبرمجة): `id, user_id, name (مسمّاه هو)، window_kind {Eating|Fasting}, start_time, end_time (قد تعبر منتصف الليل), weekdays smallint[] , valid_from date, valid_to date (NULL=مفتوح), calendar_system {gregorian} (hijri مؤجل ND-15), is_active, show_in_today bool`. تُستخدم لـ: حالة Today، إسكات التذكيرات داخل الصيام، وتلوين إدخالات خارج نافذة الأكل **بلا حكم**. لا تسمية دينية من النظام.

**`nutrition_reminders`**: `id, user_id, type {Meal|Water|GoalGap|DayClose|WeeklyReview|Supplement|PlanConfirm}, meal_type_id|supplement_id|NULL, schedule jsonb ({kind: times|interval|relative_to_meal, times:["13:00"], interval_min, weekdays, window_aware}), enabled, snooze_until, neutral_text_override, last_fired_key`. النص على شاشة القفل محايد دائمًا (§12.2).

### 5.11 المشتقات (Cache) وتعليمات المستخدم

**`nutrition_day_marks`** (**حقيقة يعلنها المستخدم**، ليست Cache): `user_id, local_date, state {Complete|NotTracking|Fasting|Travel|Sick? }` — **نكتفي**: `{Complete|NotTracking|Fasting|Other}` (لا حالة صحية)، `label (نص حر)، set_by {User|AutoPolicy}, set_at`. `UNIQUE(user_id, local_date)`.

**`nutrition_daily_summaries`** (Cache قابل لإعادة البناء):

| الحقل | النوع | ملاحظة |
| :---- | :---- | :---- |
| user_id, local_date | PK مركّب | |
| calories_kcal, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg | decimal | Σ لقطات الإدخالات الفعّالة |
| micronutrients_total | jsonb | |
| water_ml | decimal | Σ water_logs |
| meals_count | int | وجبات Closed/Open فيها إدخالات (لا Skipped) |
| entries_count | int | |
| supplements_count | int | |
| has_unknown | jsonb | أي مقاييس فيها قيم مجهولة `{sugar_g:true,…}` |
| completeness | enum | `NoData|Partial|Complete|NotTracking|Fasting` (§6.9) |
| day_type_id | FK | النوع المطبّق |
| targets_snapshot | jsonb | الأهداف المطبّقة وقت البناء (لثبات الالتزام التاريخي) |
| variance | jsonb | `{calories:{actual,target,diff,pct,status}…}` |
| inputs_hash | string | بصمة المدخلات للـIdempotency |
| built_at / build_version | | |

**`nutrition_period_aggregates`**: `user_id, period_type {Week|Month|Range}, period_start, period_end, metrics jsonb, days_included, days_excluded, built_at, inputs_hash`. للمتوسطات والاتساق (§6.13).

**`nutrition_reviews`** (المراجعة الأسبوعية): `id, user_id, period_start, period_end, generated_payload jsonb (أرقام مشتقة), user_note text (**ملاحظة المستخدم — مصدر**), status {Generated|Viewed|Dismissed}, generation_key`.

### 5.12 البنية التحتية

| الجدول | الحقول الأساسية | الغرض |
| :---- | :---- | :---- |
| `nutrition_outbox` | `id, event_id UUID, name, payload, status {Pending|Sent|Failed}, attempts, next_attempt_at` | أحداث صادرة at-least-once (CX-17) |
| `nutrition_audit_log` | `id, user_id, entity, entity_id, action, before, after, at, actor` | تغييرات حساسة (أهداف، خصوصية، إعادة حساب، حذف) غير قابل للتعديل |
| `nutrition_client_ops` | `user_id, client_op_id, op_type, result_ref, applied_at` + `UNIQUE(user_id, client_op_id)` | Idempotency للمزامنة |
| `nutrition_tombstones` | `user_id, entity, entity_id, deleted_at` | حذف مزامَن للعملاء |
| `nutrition_recalc_runs` | `id, user_id, scope jsonb, status {Previewed|Applied|Reverted}, diff_summary, created_at, applied_at, reverted_at, expires_revert_at` + `nutrition_recalc_run_items(run_id, entry_id, before jsonb, after jsonb)` | إعادة الحساب المقصودة (§6.18) |
| `nutrition_import_jobs` / `nutrition_import_rows` | job: `kind {Foods|Logs|Water|Recipes|NotionTemplates}, mode {DryRun|Apply}, status, file_ref, mapping jsonb, report jsonb`; row: `job_id, row_no, status {OK|Warning|Error|Skipped}, messages, result_ref, source_key` | استيراد CSV (§15) |
| `nutrition_export_jobs` | `id, user_id, scope, format {CSV|JSON}, status, file_ref, expires_at` | تصدير |
| `nutrition_integration_state` | `user_id, system {home|sports|habit}, enabled, capabilities jsonb, last_checked_at, last_error` | حالة التكاملات |
| `nutrition_external_cache` (TTL قصير، **لا يُصدَّر**) | `user_id, source, key, payload, fetched_at, ttl_s` | قراءات Sports/Home المؤقتة |
| `nutrition_system_config` (بلا user_id، المشغّل) | `key, value, note, updated_by` | مثل `guard_floor_kcal_default`, `max_water_log_ml`, حدود إدخال |

### 5.13 القوائم (Enums)

| Enum | القيم |
| :---- | :---- |
| `basis_type` | per_100g · per_100ml · per_serving |
| `food_state` | raw · cooked · dry · prepared · packaged · na |
| `food_origin` | Custom · CatalogCopy · Barcode · Imported · Recipe · OutOfHome |
| `verification_level` | Unverified · UserConfirmed · SourceVerified |
| `entry_kind` | Food · Recipe · Batch · QuickMacros · OutOfHome |
| `confidence` | Exact · Estimated · Rough |
| `log_source` | Manual · Search · Barcode · Recent · Favorite · QuickAdd · PlanConversion · Copy · Import · Batch |
| `meal_status` | Open · Closed · Skipped |
| `goal_type` | Maintenance · FatLoss · MuscleGain · Performance · General · Custom |
| `target_direction` | Around · AtLeast · AtMost · Range |
| `day_completeness` | NoData · Partial · Complete · NotTracking · Fasting |
| `plan_type` / `plan_status` | Fixed · Rolling · Template / Draft · Active · Completed · Archived |
| `slot_status` | Planned · Logged · Skipped · Dismissed |
| `grocery_status` | Needed · Purchased · Skipped |
| `handoff_state` | None · Queued · Sent · Acknowledged · Failed · Detached |
| `display_mode` | Full · Hidden · Qualitative |
| `privacy_tier` | Normal · Sensitive · Secret |

### 5.14 الفهارس والقيود

| الجدول | الفهرس / القيد | سببه |
| :---- | :---- | :---- |
| food_log_entries | `(user_id, local_date)` · `(user_id, logged_at)` · `(user_id, meal_id)` · `UNIQUE(user_id, client_op_id)` · جزئي `WHERE deleted_at IS NULL` | الملخص والمزامنة |
| food_log_entries | `CHECK` مصدر واحد · `CHECK (range_min ≤ calories ≤ range_max)` | NV |
| water_logs | `(user_id, local_date)` · `UNIQUE(user_id, client_op_id)` | |
| foods | `(user_id, name_norm)` trigram · `(user_id, status)` · `UNIQUE(user_id, brand, name_norm)` جزئي للنشطة (تحذير لا منع، NV-03) | بحث |
| catalog_foods | trigram على `name_norm` (يُخزَّن عمود مطبَّع) · `external_code` | بحث |
| barcodes | `UNIQUE(user_id, barcode)` · `PK(barcode)` للكتالوج | |
| goal_assignments | `EXCLUDE` على نطاق `(start_date,end_date)` لكل `user_id` | عدم التداخل |
| goal_targets | `EXCLUDE` على نطاق `(effective_from, effective_to)` لكل `(goal, metric, day_type)` | |
| plan_days | `UNIQUE(plan_id, plan_date)` · `UNIQUE(plan_id, day_index)` | |
| grocery_items | `UNIQUE(list_id, merge_key)` | |
| daily_summaries | PK `(user_id, local_date)` | |
| outbox | `(status, next_attempt_at)` | |
| كل الجداول التابعة | `FOREIGN KEY (parent_id, user_id)` | NC-26 |

### 5.15 خريطة العلاقات

```text
catalog_versions 1─* catalog_foods 1─* catalog_units/aliases/barcodes
catalog_foods 1─* foods(CatalogCopy) 1─* food_versions · food_units · food_aliases · food_barcodes
foods/catalog_foods ─┬─* recipe_ingredients *─1 recipes 1─* recipe_steps · recipe_tags
                     │                        recipes 1─* batches
                     ├─* plan_items *─1 plan_slots *─1 plan_days *─1 meal_plans
                     └─* food_log_entries *─0..1 meals ;  plan_slots 0..1─1 meals (converted_meal_id)
food_log_entries ─(0..1)─ water_logs (FromFoodLog)
goals 1─* goal_targets ; goals 1─* goal_assignments ; day_types 1─* day_type_assignments/rules/goal_targets
meal_plans ─(اختياري)─ goals ; grocery_lists 0..1─1 meal_plans ; grocery_lists 1─* grocery_items 1─* item_sources
(بلا FK، refs فقط): home_item_ref · home_purchase_ref · habit_ref · goal_ref (Core) · file_ref · sports provider
daily_summaries / period_aggregates / reviews : Cache مشتق من entries + water + marks + goals
```

---
## 6) محرّك الحساب (Calculation Engine)

> كل الحسابات هنا **حتمية** (نفس المدخلات ← نفس المخرجات) وتعمل على **DECIMAL** فقط. كل صيغة لها مثال رقمي يُستخدم كحالة اختبار (§16). لا تُعرض أي نتيجة بصيغة حكم (جيد/سيئ)؛ الأرقام وسياقها فقط (§3.5).

### 6.1 قواعد عامة للحساب

| القاعدة | التفصيل |
| :---- | :---- |
| الدقة | حساب وسيط بدقة 10 خانات عشرية، تقريب `ROUND_HALF_UP` **مرة واحدة** عند الحفظ: السعرات والمغذيات لخانتين، الجرامات الصغيرة لثلاث خانات. |
| المجهول | `NULL` ≠ 0. أي مجموع يحوي مجهولًا يُحسب من المعروف ويُضاف علم `has_unknown[metric]=true`. الواجهة تعرض «≥ س» لا «= س». |
| المجاميع | مجموع **القيم المقرّبة المخزّنة** في الصفوف، لا إعادة اشتقاق من الأصل (يضمن تطابق الأرقام مع ما يراه المستخدم). |
| الطاقة | `kcal` داخليًا؛ `kJ = kcal × 4.184` عند العرض فقط (ثابت تحويل معروف). |
| ترتيب العمليات | تحويل الوحدة ← تطبيق الأساس ← تطبيق الخام/المطبوخ ← التقريب ← التجميع. |
| الصفر مقابل الغياب | إدخال بكمية 0 مرفوض (NV). إدخال بلا قيم غذائية يُحفظ بـ`NULL` ويُعدّ مجهولًا. |

### 6.2 اليوم المحلي (`local_date`)

**المشكلة:** أكل في 01:30 صباحًا — أي يوم؟ وماذا لو سافر المستخدم لمنطقة زمنية أخرى؟ (NC-25)

**القاعدة:**

```text
t_local      = logged_at (UTC) محوَّلة إلى tz الجهاز وقت التسجيل
shifted      = t_local − day_start_time          // مثال: day_start=04:00
local_date   = DATE(shifted)
```

- `tz` و`local_date` **يُخزَّنان على الصف** وقت الكتابة؛ تغيير منطقة المستخدم لاحقًا **لا** يحرّك سجلًا قديمًا.
- تعديل `logged_at` يُعيد حساب `local_date` لهذا الصف فقط، ويضع اليومين (القديم والجديد) في طابور إعادة بناء الملخص.
- تغيير `day_start_time` في الإعدادات يسري على **الإدخالات الجديدة فقط**؛ الواجهة تعرض خيار «طبّق على الماضي» يُنفَّذ كإعادة حساب مقصودة (§6.18).

**أمثلة:**

| `logged_at` المحلي | `day_start_time` | `local_date` |
| :---- | :---- | :---- |
| 2026-10-05 01:30 | 00:00 | 2026-10-05 |
| 2026-10-05 01:30 | 04:00 | 2026-10-04 |
| 2026-10-05 04:00 | 04:00 | 2026-10-05 |
| 2026-10-05 23:59 (جهاز بتوقيت آخر) | 00:00 | يتبع `tz` الجهاز المخزَّن |

### 6.3 تحويل الوحدات والأساس الغذائي

**الهدف:** كل كمية تُختزل إلى `quantity_base` (جرام للكتلة، مل للحجم، أو عدد/حصة) ثم تُضرب في قيمة الأساس.

**الخطوة 1 — الوحدة إلى الأساس:**

```text
mass   : quantity_base = quantity × units.to_base_factor           (g)
volume : quantity_base = quantity × units.to_base_factor           (ml)   // tsp/tbsp/cup من الإعدادات
count  : quantity_base = quantity × food_units.base_qty            (g أو ml لكل «حبة/رغيف/كوباية»)
serving: quantity_base = quantity × food.serving_size (محوَّلة لأساس)
```

**الخطوة 2 — الأساس إلى القيم:**

| `basis_type` | القاعدة |
| :---- | :---- |
| `per_100g` | القيمة = `per100 × quantity_base_g / 100` |
| `per_100ml` | القيمة = `per100 × quantity_base_ml / 100` |
| `per_serving` | القيمة = `per_serving × (quantity_in_servings)` حيث الحصة = `basis_qty` |

**التحويل بين الحجم والكتلة** يحتاج `density_g_per_ml` على الغذاء. غيابها مع طلب تحويل ← `UnitUnknown` (لا تخمين): تُعرض رسالة «أضف كثافة أو وحدة منزلية» ولا يُحفظ الإدخال بقيمة صامتة (NV).

**أمثلة اختبار:**

| الحالة | الحساب | الناتج |
| :---- | :---- | :---- |
| دجاج 165 kcal/100g، 150 جم | 165 × 150/100 | **247.50** kcal |
| زيت 884 kcal/100ml، كثافة 0.92، 1 ملعقة كبيرة (15 مل) | 884 × 15/100 | **132.60** kcal |
| عيش: حصة = رغيف 80 جم، 0.5 رغيف، 250 kcal/100g | 80 × 0.5 = 40 جم ← 250 × 40/100 | **100.00** kcal |
| منتج `per_serving` (حصة 30 جم = 120 kcal)، كمية 45 جم | 45/30 = 1.5 حصة ← 120 × 1.5 | **180.00** kcal |
| حليب 60 kcal/100ml، كوب (إعداد 240 مل) | 60 × 240/100 | **144.00** kcal |

### 6.4 اللقطة (Snapshot) عند التسجيل

عند إنشاء إدخال: تُحسب القيم بالصيغ أعلاه وتُحفظ **داخل الإدخال** مع `snapshot_basis`:

```json
{
  "source_kind": "food|catalog|recipe|batch",
  "source_id": "…", "source_version": 3,
  "basis_type": "per_100g", "basis_qty": "100.000",
  "per_values": {"calories_kcal":"165.00","protein_g":"31.000"},
  "density": null, "yield_ratio": null, "state": "cooked",
  "unit_code": "g", "quantity": "150.000", "quantity_base": "150.000",
  "rounding_ver": 1
}
```

- بعد الحفظ: **تعديل الغذاء أو الوصفة أو حذفهما لا يغيّر الإدخال** (قاعدة المصدر «Snapshot» محفوظة).
- تعديل الإدخال نفسه (الكمية/الوحدة) يُعيد الحساب من `snapshot_basis` **المحفوظ** لا من الغذاء الحالي، إلا إن اختار المستخدم «حدّث بقيم الغذاء الحالية» صراحة (يُسجَّل في `log_entry_history`).
- إدخال `QuickMacros` يحمل القيم مباشرة بلا `snapshot_basis.per_values` (`source_kind: "quick"`).

### 6.5 مجموع الوصفة والحصة (Cache مشتق)

```text
ingredient_value[m] = حسب §6.3 لكل مكوّن (وبعد §6.6 لو prep_state)
recipe.total[m]     = Σ ingredient_value[m]   (للمكوّنات غير الاختيارية فقط، + الاختيارية إن فُعّل الخيار)
per_serving[m]      = ROUND(total[m] / servings)
```

- **الوصفة المتداخلة:** مكوّن `sub_recipe_id` يُحسب من `per_serving` للوصفة الفرعية × عدد الحصص المستخدمة. عمق ≤ 3، ودورة (A تحوي B تحوي A) مرفوضة وقت الحفظ (NV).
- `completeness`: `Complete` لو كل المكوّنات `Matched` بقيم معروفة؛ `HasUnknown` لو مكوّن بقيمة `NULL`؛ `HasUnmatched` لو مكوّن نص حر غير مربوط. المجموع يُحسب من المعروف **مع علم** الاكتمال.
- الإبطال: أي تغيير في مكوّن/كمية/حصص/غذاء مصدر ← `ingredients_hash` يتغير ← يُعاد بناء الكاش (تحت Job إن لزم) ويزيد `recipe_version`.

**مثال:** وصفة 1,800 kcal ولها 4 حصص ← 450 kcal/حصة. وصفة بـ3 حصص و1,000 kcal ← 333.33 kcal/حصة (وليس 333.00).

### 6.6 الخام والمطبوخ ومعامل الوزن

**المشكلة:** 100 جم أرز نيّئ ≠ 100 جم أرز مطبوخ. وزن المطبوخ يزيد (ماء) أو ينقص (تبخّر).

```text
yield_ratio = وزن_المطبوخ / وزن_الخام                (من غذاء أو من وصفة)
قيمة لكل 100 جم مطبوخ = قيمة لكل 100 جم خام / yield_ratio
```

- مكوّن الوصفة له `weight_basis`: `as_listed` (كما في تعريف الغذاء)، `raw` أو `cooked`. لو الغذاء خام والمستخدم أدخل وزنًا مطبوخًا ← `quantity_raw_equiv = quantity / yield_ratio` ثم §6.3.
- غياب `yield_ratio` عند عدم تطابق `state` ← **تحذير** `STATE_MISMATCH` + يُحفظ كما أدخل بثقة `Estimated`، لا تخمين.
- **وزن الوصفة المطبوخ:** `yield_weight_g` يسمح بتسجيل «300 جم من الناتج»:

```text
per_100g_cooked = total[m] / yield_weight_g × 100
entry[m]        = per_100g_cooked × grams_eaten / 100
```

**مثال:** وصفة 1,800 kcal، `yield_weight_g=1,200` ← 150 kcal/100جم؛ 300 جم ← **450.00** kcal (= حصة من أربع).

### 6.7 الدفعات (Batches) والمتبقي

```text
batch.total[m]        = لقطة مجموع الوصفة وقت الطبخ (مع الوزن الفعلي لو أُدخل)
per_g                 = total / cooked_total_weight_g
entry[m]              = per_g × grams_eaten        (أو per_serving × servings_eaten)
remaining_g           = cooked_total_weight_g − Σ grams_eaten      (من الإدخالات غير المحذوفة)
remaining_servings    = servings_made − Σ servings_eaten
```

- المتبقي **مشتق** يُعاد حسابه من الإدخالات (حذف إدخال يعيد الكمية).
- `remaining ≤ 0` ← الدفعة تُقترح كـ`Finished` (لا تُغلَق آليًا)، وتجاوز طفيف مسموح بتحذير لطيف (الوزن تقديري).
- حذف الدفعة بإدخالات: الإدخالات **تبقى** (لقطات) وتفقد الرابط؛ لا حذف متسلسل.

### 6.8 تحويل خانة الخطة إلى وجبة فعلية

عند «سجّلتها»: تُنشأ `nutrition_meals` (status `Closed`) وإدخالات بـ`source=PlanConversion` و`plan_item_id`، بمفتاح Idempotency `(plan_slot_id, 'convert')`:

1. القيم تُحسب **من الغذاء/الوصفة الحاليين** وقت التحويل (لا من أرقام الخطة المخزنة) ← لقطة جديدة.
2. المستخدم يعدّل الكميات قبل التأكيد (ما أكله فعلًا).
3. الخانة تصير `Logged` ويحفظ `converted_meal_id`؛ أي تحويل ثانٍ لنفس الخانة يعيد نفس الوجبة (لا تكرار).
4. «لم آكل هذه» ← الخانة `Skipped` (لا إدخالات، ولا يُحسب ذلك «نقصًا»).
5. «تغيّر الأمر» ← يُسجَّل بديل كإدخال عادي والخانة `Dismissed`.

### 6.9 الملخص اليومي وحالة الاكتمال

**البناء (Idempotent):** `inputs_hash = H(entries_active, water, supplements, marks, goal_resolution, build_version)`. إن لم يتغير لا يُعاد البناء.

```text
calories..sodium = Σ entries(local_date=D, deleted_at IS NULL) [+ مكملات counts_in_totals]
water_ml         = Σ water_logs(amount_ml × hydration_factor) أو الخام حسب إعداد الهدف (§6.14)
meals_count      = عدد الوجبات (غير Skipped) التي فيها ≥ إدخال
```

**الاكتمال (`completeness`):**

| الحالة | الشرط |
| :---- | :---- |
| `NoData` | لا إدخالات ولا علامة |
| `Partial` | إدخالات موجودة ولم يعلن المستخدم الاكتمال |
| `Complete` | علامة `Complete` من المستخدم، أو سياسة `AfterMealsCount` وبلغ العدد (علامة `set_by=AutoPolicy` قابلة للإلغاء) |
| `NotTracking` | علامة المستخدم «لم أتتبّع» |
| `Fasting` | علامة المستخدم أو نافذة صيام يحدّدها هو |

- **المهم:** لا يُفترض الاكتمال من وجود إدخالات. اليوم بإدخالين فقط **ليس** يوم «أكل قليل» بل `Partial`.
- سؤال إغلاق اليوم (`day_close_prompt_time`) يعرض: «هل اكتمل تسجيل يوم س؟ [نعم] [أضف ما نقص] [لم أتتبّع]».
- تعديل إدخال في يوم `Complete` لا يفتح اليوم؛ يُبنى الملخص من جديد ويبقى الوسم.

### 6.10 نوع اليوم (Day Type)

الأولوية: **Manual** (المستخدم لهذا اليوم) > **Sports** (إن مفعَّل والمزوّد متاح وبموافقة) > **Rule** (قاعدة يوم الأسبوع) > الافتراضي. المصدر يُخزَّن في `day_type_assignments.source`. غياب Sports يعني ببساطة تخطي المستوى (لا فشل). تغيير النوع بعد بناء الملخص يُعيد بناءه بالأهداف الجديدة (والـ`targets_snapshot` القديمة تُستبدل لهذا اليوم فقط).

### 6.11 حلّ الهدف المطبّق على يوم

```text
profile  = goal_assignment يغطي D                   // لا تعيين ← لا أهداف (يُعرض الأكل بلا مقارنة)
target[m] = goal_targets(profile, m, day_type=D.type) حيث D ∈ [effective_from, effective_to]
            وإلا goal_targets(profile, m, day_type=NULL)
            وإلا لا هدف لهذا المقياس
```

- الماكروز بـ`PctCalories`: `grams = target_kcal × pct / 100 / (4|4|9)` — **تقريب Atwater** ويُوسَم «تقريبي» (§6.20). لو لا هدف سعرات ← النسبة غير قابلة للتحويل (تُعرض كنسبة من اليوم الفعلي فقط).
- النتيجة تُحفظ في `targets_snapshot` ضمن الملخص: تغيير الهدف لاحقًا **لا يغيّر التقييم التاريخي**.

### 6.12 الفرق عن الهدف (Variance)

```text
diff = actual − target                         (موجب = أعلى من المخطط)
pct  = diff / target × 100                     (target > 0)
```

| `direction` | الحالة `status` (وصف محايد) |
| :---- | :---- |
| `Around` | `Within` لو `|pct| ≤ tolerance_pct`، وإلا `Above` / `Below` |
| `AtLeast` | `Met` لو `actual ≥ target`، وإلا `Below` |
| `AtMost` | `Within` لو `actual ≤ target`، وإلا `Above` |
| `Range` | `Within` لو `min ≤ actual ≤ max`، وإلا `Above`/`Below` |

- **اليوم `Partial`** لا يُعرض له `Below` (ينقصه تسجيل لا أكل): يُعرض «اليوم لم يكتمل».
- الصياغة في الواجهة: «أعلى من المخطط بـ 120 kcal» لا «تجاوزت».
- **مثال:** هدف 2,000 ± 10%، فعلي 2,180 ← diff=+180، pct=+9.0% ← `Within`. فعلي 2,250 ← +12.5% ← `Above`.

### 6.13 التحليلات على فترة

| المقياس | التعريف |
| :---- | :---- |
| **المتوسط** | `avg = Σ القيمة / عدد أيام Complete` في الفترة. تُعرض عبارة **«بناءً على n من m يومًا»**. الأيام `Partial/NoData/NotTracking/Fasting` مستبعدة (إلا لو فعّل المستخدم `include_partial_in_analytics`). |
| **الالتزام** | نسبة الأيام الـComplete التي حالتها `Within`/`Met` ÷ عدد الأيام الـComplete التي لها هدف. بلا هدف ← لا نسبة. |
| **الاتساق** | معامل التباين `CV = stdev / mean × 100` للسعرات على الأيام Complete (عينة ≥ 5 أيام وإلا «بيانات غير كافية»). رقم **وصفي** لا حكم. |
| **توزيع الماكروز** | `kcal_from_macro = g × (4\|4\|9)`، النسبة = ÷ مجموع الثلاثة؛ يُوسَم «تقريبي». |
| **اتجاه** | متوسط متحرك 7 أيام Complete؛ لا يُحسب لو < 4 أيام. |
| **الأيام المسجّلة** | عدد الأيام التي فيها ≥ إدخال (وصفي، لا يُسمّى «التزامًا»). |
| **أكثر الأغذية** | حسب عدد المرات/الكمية، من `food_usage` المبني. |

- **لا ربط سببي** بين التغذية والوزن أو الطاقة أو المزاج (حتى مع Sports). يُعرض الرقمان متجاورين فقط، بلا عبارة تفسيرية.
- الستريك/السلاسل **معطّلة افتراضيًا**، وتفعيلها اختياري، وكسرها لا يُعرض بعبارة فشل.

### 6.14 الماء

```text
effective_ml = amount_ml × factor/100      لو water_logs.food_log_entry_id ليس NULL (مشروب غير ماء) وفق hydration_rules
water_ml     = Σ effective_ml (أو Σ amount_ml حسب إعداد الهدف «احسب الخام»)
```

- المشروب الذي سجّله المستخدم كإدخال طعام (قهوة، عصير) يُنشئ سجل ماء `FromFoodLog` فقط لو فُعِّل `counts_toward_water` لهذا الغذاء ولهذا الإعداد معامل (`hydration_rules`). **لا معاملات افتراضية** إلا «ماء = 100».
- حذف إدخال الطعام يحذف سجل الماء المشتق منه (ويظهر في الـAudit).
- Habit: حدث `habit.water.checked` (إن مفعّل) **لا ينشئ** ماءً بنفسه إلا بإدخال كمية؛ سجل الماء هو المصدر الوحيد (CX-10). تفاصيل §11.4.

### 6.15 توليد قائمة البقالة

```text
needs[merge_key]  = Σ (quantity_base لكل plan_item / وصفة × عدد الحصص) في [date_from, date_to]
                    حيث الخانة status ∈ {Planned} و item ليس excluded
grocery.qty_needed_base = needs[merge_key]
```

- `merge_key` = (`food_ref` أو `name_norm`) + `base_kind`؛ **الجرام لا يُجمع مع «حبة»** إلا عبر وحدة منزلية للغذاء.
- المصادر تُحفظ في `grocery_item_sources` فتُجنَّب العدّ المزدوج: إعادة التوليد بنفس `generation_key` تُحدّث ولا تكرّر.
- المضاف يدويًا (`manual_override`) **لا يُمسّ** عند إعادة التوليد.
- **تقريب العبوة:** لو للغذاء `pack_size` ← `packs = CEIL(qty_to_buy / pack_size)` ويُعرض «3 عبوات (≈ 750 جم)». هذا للعرض؛ الحساب الغذائي لا يتأثر.
- البند `Purchased`/`Skipped` يبقى كذلك عند إعادة التوليد (لا يُعاد «Needed»).

### 6.16 طرح المخزون (Pantry Offset) والتسليم لـHome

لا طرح إلا بشروط معًا: `home_integration.enabled` + `pantry_subtract` + خريطة مؤكدة في `nutrition_home_item_map` + قدرة Home متاحة.

```text
stock_base       = Home.stock(home_item_ref) × factor_to_base
qty_to_buy_base  = MAX(0, qty_needed_base − stock_base)
```

- قيمة المخزون **تُجمَّد** على البند وقت الطرح (`qty_in_stock_base`) مع طابع زمني؛ تُعرض «حسب مخزون Home وقت 14:20».
- غياب Home أو فشل القراءة ← لا طرح، تُعرض القائمة كاملة بعلامة «لم يُطرح المخزون».
- Home v4 لا يملك واجهة استقبال مشتريات بمصدر خارجي (NC-28): التسليم الأساسي `POST /home/purchases` (الموجود) بمفتاح Idempotency ويُحفظ `home_purchase_ref`؛ والطلب المقترح `POST /home/purchases/from-source` يُسجَّل كطلب تغيير (§11.2).
- حدث Home `home.purchase.purchased` يعلّم البند `Purchased (HomeSync)` **فقط** لو حمل مرجعنا (`source_ref`)؛ وإلا يُتجاهل (لا مطابقة بالأسماء).

### 6.17 البحث والتطبيع (عربي)

**تطبيع `name_norm`** (يُطبَّق على الاسم والمرادفات والاستعلام):

1. إزالة التشكيل والتطويل (ـ).
2. توحيد الهمزات: `أ إ آ` ← `ا`.
3. `ى` ← `ي`، `ة` ← `ه` (للمطابقة فقط، العرض بالأصل).
4. توحيد الأرقام الهندية/اللاتينية.
5. حروف صغيرة للإنجليزية، إزالة علامات الترقيم، ضغط المسافات.
6. إزالة «ال» التعريف من بداية الكلمة للمطابقة الثانوية فقط.

**الترتيب (Score):** تطابق تام (name_norm) > بداية الاسم > مرادف مطابق > trigram مشابه؛ ثم **الاستخدام الشخصي** (`food_usage`: الأخيرة والمتكررة والمفضلة) ثم أغذية المستخدم قبل الكتالوج عند التعادل. الباركود يطابق أولًا تامًّا (مستخدم ثم كتالوج) ثم يعرض «غير موجود — أضفه».

**المرادفات واللهجات** (`search_synonyms`): مجموعات يحمّلها المشغّل ويضيف عليها المستخدم؛ الأمثلة كـ«أرز/رز» أو «بطاطس/بطاطا» **توضيحية** وليست قاموسًا نهائيًا. بحث فارغ النتيجة ← «إضافة غذاء جديد» بالاسم المكتوب.

**الباركود:** التحقق من خانة الفحص قبل البحث (NV-14)؛ أي مزوّد خارجي **اختياري ومعطَّل** حتى يُتحقق منه (**غير مؤكد — يُتحقق قبل البناء**).

### 6.18 إعادة الحساب المقصودة (Intentional Recalculation)

المصدر يقول: لا إعادة حساب تلقائي للتاريخ. هذا **محفوظ**. لكن تصحيح غذاء كان خاطئًا يحتاج مسارًا:

1. المستخدم يعدّل قيم غذاء ← خيار «طبّق على إدخالاتي السابقة؟» (افتراضي: **لا**).
2. «نعم» ← **معاينة**: عدد الإدخالات، نطاق التواريخ، فرق السعرات الكلي، عيّنة قبل/بعد (`recalc_runs.status=Previewed`).
3. التأكيد ← `Applied`: يُحفظ `before/after` لكل إدخال في `recalc_run_items`، ويُوسَم الإدخال (`recalc_run_id`) ويُبنى كل يوم متأثر.
4. **تراجع** (`Reverted`) متاح ضمن نافذة (افتراضي 14 يومًا) ويعيد القيم القديمة تمامًا.
5. لا تُمسّ الإدخالات `QuickMacros`، ولا ما عدّله المستخدم يدويًا (علم `manually_edited`) إلا بتحديد صريح.
6. نفس الآلية لتغيير `day_start_time` على الماضي.

### 6.19 المعادلات التقديرية (اختيارية ومعطّلة)

`estimator_enabled=false` افتراضيًا. عند التفعيل: مساعد يقدّر **BMR** بمعادلة Mifflin–St Jeor (**معادلة منشورة معروفة؛ مرجعها وحدودها غير مؤكدة هنا — يُتحقق قبل البناء**) من بيانات يدخلها المستخدم بنفسه (الوزن من Sports اختياريًا بموافقة). تُعرض كـ**«تقدير تقريبي لأغراض التخطيط»** ولا **تُملأ** كهدف تلقائيًا: المستخدم ينسخها يدويًا إن أراد. لا يُعرض TDEE ولا «ناقص/زائد» ولا تواريخ بلوغ هدف وزن.

### 6.20 مطابقة Atwater وجودة البيانات

```text
kcal_expected = 4 × protein_g + 4 × carbs_g + 9 × fat_g (+ 7 × alcohol_g إن وُجد)
```

- لو `|kcal_stated − kcal_expected| / kcal_stated > ATWATER_TOL` (افتراضي 20%، إعداد المشغّل) ← علم `ATWATER_MISMATCH` على الغذاء + تلميح لطيف «القيم قد لا تتسق — راجع الملصق».
- **تحذير فقط، لا منع ولا تعديل** (الألياف والكحول والتقريب قد تفسّر الفرق).

### 6.21 الحارس الاختياري لتغيّر الهدف

**مبدأ:** لا أرقام صحية عالمية. بدلًا منها فحص **نسبي لطيف**:

- لو ضبط المستخدم هدف سعرات جديدًا < `GUARD_RATIO` (افتراضي 60%) من **متوسط أكله هو** الأخير (≥ 7 أيام Complete) ← رسالة محايدة: «هذا الهدف أقل كثيرًا مما تسجّله عادةً. تأكد أنه ما تقصده» + زر «تأكيد» (لا حظر).
- `guard_floor_kcal` يضبطه المستخدم لتنبيه نفسه؛ حد المشغّل `guard_floor_kcal_default` فارغ افتراضيًا (يُحدَّد بقرار ND-10 بعد مراجعة مختص).
- أنماط تتبّع تُشعِر بالقلق (فحص مفرط، مسح متكرر لأيام كاملة…) **لا تُشخَّص**؛ نوفّر فقط: وضع إخفاء الأرقام، إيقاف التتبع مؤقتًا، وتخفيف التذكيرات، وعبارة مساعدة عامة بالتواصل مع مختص عند الحاجة (§10.6).

---
## 7) سجل التعارضات (NC) وحلولها

> كل تعارض: **ما هو** ← **لماذا مشكلة** ← **الحل المعتمد** ← **أين طُبّق**. الأرقام ثابتة وتُشير إليها بقية الوثيقة. التعارضات 01–22 داخلية (المصدر ضد نفسه أو ضد الواقع)، 23–27 مع «قواعد التنفيذ المشتركة»، 28–32 مع بقية الأقسام.

### 7.1 تعارضات داخلية في المصدر

| # | التعارض | لماذا مشكلة | الحل المعتمد | أين |
| :---- | :---- | :---- | :---- | :---- |
| **NC-01** | `Foods` بلا `user_id` ومع ذلك «يُعدَّل» ويُحذف | تعديل غذاء عام يغيّر لكل المستخدمين أو يُسرّب بيانات | كتالوج نظامي **للقراءة فقط بإصدار** + أغذية المستخدم + نسخ عند التعديل (copy-on-write) | §5.2–5.3، §9.1 |
| **NC-02** | `source/verified/status` بلا قيم معرّفة | لا يمكن بناء فلاتر ولا سياسة ثقة | `origin` و`verification_level` و`status` بقيم محددة؛ `license_status` للكتالوج | §5.3، §5.13 |
| **NC-03** | `Meals.planned_or_actual` يخلط الخطة بالواقع | وجبة «مخططة» قد تُحسب أكلًا فعليًا فتفسد المجاميع | Meal = **فعلي فقط**؛ المخطط في `plan_slots/plan_items`؛ التحويل صريح | §5.5، §6.8 |
| **NC-04** | الحصة الوحيدة (`serving_size/unit`) لا تكفي | «رغيف»، «كوباية»، 100 جم، عبوة: وحدات متعددة بلا مصدر تحويل | أساس غذائي + وحدات منزلية لكل غذاء + كثافة + إعدادات المعايير | §5.3، §6.3 |
| **NC-05** | الإدخال يحمل `food_id` و`recipe_id` معًا | لا يُعرف أيهما يحسب القيمة | `entry_kind` + CHECK مصدر واحد فقط | §5.5 |
| **NC-06** | اللقطة تغطي 4 ماكروز فقط | تفقد الألياف/الصوديوم/المغذيات الدقيقة ولا يمكن إعادة الإنتاج | لقطة كاملة + `snapshot_basis` (نسخة، أساس، كثافة، معامل) | §6.4 |
| **NC-07** | `Recipes.ingredients` حقل نصي/JSON | لا يُحسب ولا يُبحث ولا يُجمّع للبقالة | جدول `recipe_ingredients` بحالات مطابقة + وصفات متداخلة + نص حر | §5.4، §6.5 |
| **NC-08** | `nutrition_total/per_serving` مخزّنة وقابلة للتعديل | تتباعد عن المكوّنات | **Cache مشتق** بـ`ingredients_hash` لا يُحرَّر | §6.5 |
| **NC-09** | `Goals` رقم واحد لكل مقياس بلا تاريخ | تغيير الهدف يغيّر تقييم الماضي؛ لا أيام تدريب/راحة | ملفات + أهداف بتواريخ سريان + تعيينات + أنواع أيام + `targets_snapshot` | §5.6، §6.11 |
| **NC-10** | `Water` بلا يوم مخزّن ولا مشروبات | تحرّك سجل قديم عند السفر؛ هل القهوة ماء؟ | `local_date` مخزّن؛ معاملات ترطيب **يحددها المستخدم** | §5.7، §6.14 |
| **NC-11** | `Daily Summary/Analytics` «مملوكة» ومصدر حقيقة | تتباعد عن الإدخالات | **Cache قابل لإعادة البناء** بـ`inputs_hash` | §5.11، §6.9 |
| **NC-12** | `Meal Plan` يوم/خانات داخل JSON | لا فهارس، لا تحويل جزئي، لا قوالب | جداول `plan_days/slots/items` + أنواع Fixed/Rolling/Template | §5.8 |
| **NC-13** | قائمة البقالة تُولَّد ثم تُعدَّل: ماذا يحدث عند إعادة التوليد؟ | فقد التعديلات أو العدّ المزدوج | `generation_key` + `manual_override` + `item_sources` | §5.9، §6.15 |
| **NC-14** | «أُشتري» حالة داخل Nutrition بينما Home يملك المشتريات | ازدواج مصدر حقيقة المشتريات | Nutrition = **قائمة طلب** فقط؛ التنفيذ يسلَّم لـHome بمرجع ويحدّث الحالة من حدثه | §6.16، §11.2 |
| **NC-15** | `Meal.date` والإدخالات لها `date_time` مستقل | وجبة بعد منتصف الليل في يوم مختلف عن إدخالاتها | `local_date` على الإدخال أساس؛ الوجبة تتبع الإدخال الأول؛ نقل وجبة ينقل إدخالاتها | §6.2 |
| **NC-16** | «يوم فيه إدخالات = يوم مكتمل» ضمنيًا | يوم بوجبة واحدة يظهر «أكل قليل» | `completeness` صريح بإعلان المستخدم | §6.9 |
| **NC-17** | متوسط الأسبوع على كل الأيام | الأيام الناقصة تهبط بالمتوسط | متوسط على أيام `Complete` + «بناءً على n من m» | §6.13 |
| **NC-18** | الاتساق/الالتزام بلا تعريف | أرقام غير قابلة للاختبار | تعريفات رياضية صريحة وحد أدنى للعينة | §6.13 |
| **NC-19** | `goal_type` (خفض/زيادة…) قد يوحي بأرقام افتراضية | يخالف «لا أهداف صحية مبرمجة» | وسم تنظيمي فقط، لا يملأ شيئًا، أسماؤه قابلة لإعادة التسمية | §5.6 |
| **NC-20** | «وجبة مخططة» تُحتسب في «الباقي اليوم» | ينتج رقمًا مضللًا | الباقي = الهدف − الفعلي فقط؛ المخطط يُعرض منفصلًا «مخطط: …» | §10.2 |
| **NC-21** | المصدر يقترح تنبيهات «تجاوز» | لغة لوم وضغط نفسي | تنبيهات وصفية اختيارية محايدة، قابلة للإيقاف الكامل | §12، §3.5 |
| **NC-22** | أكل خارج البيت بلا مكان في النموذج | المستخدمون سيدخلون أرقامًا مختلقة بدقة زائفة | `OutOfHome` + `confidence` + نطاق تقدير + طريقة التقدير | §5.5 |

### 7.2 تعارضات مع «قواعد التنفيذ المشتركة»

NC-23…NC-27 مفصَّلة في جدول §3.4 (FK مقابل المرجع، المشتق مقابل المملوك، المنطقة الزمنية، `user_id` على التابعة، الترحيل بلا بيانات). الحل المختصر:

| # | الحل |
| :---- | :---- |
| **NC-23** | FK حقيقية داخل Nutrition فقط؛ عبر الأقسام `ref triple + snapshot + state` بلا FK (CX-02) |
| **NC-24** | الكيانات المشتقة «مملوكة» كـCache قابل لإعادة البناء |
| **NC-25** | `local_date` + `tz` تُثبَّتان على الصف وقت الكتابة (§6.2) |
| **NC-26** | `user_id` على كل جدول تابع + FK مركّب |
| **NC-27** | الترحيل = Onboarding + CSV بـDry-run (لا بيانات Notion) |

### 7.3 تعارضات مع الأقسام الأخرى

| # | التعارض | الحل المعتمد |
| :---- | :---- | :---- |
| **NC-28** | **Home v4** يملك المخزون والمشتريات لكن بلا API استقبال بمصدر خارجي، ولا يطابق مرجعنا عند `home.purchase.purchased` | تسليم عبر `POST /home/purchases` الموجود بمفتاح Idempotency + حفظ `home_purchase_ref`؛ **طلب تغيير** على Home: `POST /home/purchases/from-source` (فرادة المصدر) و`GET /home/items/stock` (قراءة)، وأن يحمل الحدث `source_ref`. حتى ذلك الحين: لا ضمان فرادة، وتُعرض حالة التسليم بصدق |
| **NC-29** | **Spiritual** (صيام/رمضان) ↔ **Nutrition** (نوافذ أكل وصيام) | Nutrition لا يعرف أي قيمة دينية: «نوافذ» يحددها المستخدم بأسمائه هو. قراءة صيام Spiritual **غير مدعومة في v4.0** (ND-15)؛ التكامل لاحقًا عبر `GET /spiritual/fasting/today` كإشارة وسم يوم `Fasting` بموافقة |
| **NC-30** | **Sports** (الوزن والقياسات) ↔ لا يجوز لـNutrition تخزين وزن | Nutrition لا يخزّن وزنًا؛ يقرأ اختياريًا `GET /sports/measurements/summary` (طلب تغيير) ويُخفي الميزة عند غيابه (CX-08) |
| **NC-31** | **Habit** (عادة «اشرب ماء») ↔ سجل الماء | سجل الماء هو المصدر الوحيد؛ Habit يقرأ حدثًا أو يطلب إدخالًا ولا ينشئ ازدواجًا (CX-10) |
| **NC-32** | **Finance**: هل المشتريات الغذائية تمرّ بـNutrition؟ | لا. Nutrition لا يملك أي مال ولا `finance_links` (CX-03): الدفع يتم عبر Home أو يدخله المستخدم في Finance. قراءة اختيارية لميزانية «طعام» من Finance لعرض ملخص فقط |

### 7.4 ملخص طلبات التغيير على الأقسام الأخرى (للتتبّع)

| القسم | الطلب | حالته في Nutrition |
| :---- | :---- | :---- |
| Home | `POST /home/purchases/from-source` · `GET /home/items/stock` · `source_ref` في `home.purchase.purchased` | اختياري؛ يتدهور لـ`POST /home/purchases` |
| Sports | `GET /sports/measurements/summary` · `GET /sports/day-type/{date}` | اختياري؛ الميزة تختفي عند غيابه |
| Habit | استهلاك `nutrition.water.logged` (إن فُعِّل) | اختياري |
| Core | Files: مستوى حساسية للصور · Notifications: نص محايد | يعتمد على الموجود |
| Finance | لا شيء | — |

---
## 8) الفجوات المسدودة (NG) والتحسينات المضافة (NE)

> **الفجوة (NG)** = شيء ناقص في المصدر وسيعطّل التنفيذ أو التجربة. **التحسين (NE)** = شيء إضافي يحسّن التجربة دون تغيير الفلسفة. كلها داخل حدود Nutrition ولا تكرّر ملكية غيره.

### 8.1 الفجوات (NG)

| # | الفجوة | لماذا تهم | السدّ | أين |
| :---- | :---- | :---- | :---- | :---- |
| NG-01 | وحدات منزلية (رغيف، كوباية الشاي، ملعقة) | الناس لا تزن طعامها | `food_units` + إعدادات الكوب/الملعقة + كثافة | §5.3، §6.3 |
| NG-02 | بحث عربي (همزات، تاء مربوطة، لهجات) | بحث «رز» لا يجد «أرز» | تطبيع + مرادفات + ترتيب بالاستخدام | §6.17 |
| NG-03 | باركود | أسرع إدخال للمنتجات المعبأة | مسح محلي + خريطة باركود مستخدم/كتالوج + تحقق خانة الفحص | §5.3 |
| NG-04 | أكل خارج البيت | أرقام دقيقة زائفة | `OutOfHome` + ثقة + نطاق + طريقة التقدير | §5.5 |
| NG-05 | إدخال سريع بالسعرات فقط | يوم مزدحم ولا وقت للتفاصيل | `QuickMacros` يقبل سعرات فقط (مع مجهول للباقي) | §5.5 |
| NG-06 | نسخ وجبة/يوم | تكرار الأكل اليومي | «انسخ إلى اليوم/غدًا» بإدخالات جديدة (لقطات جديدة) | §10.3 |
| NG-07 | الأخيرة والمتكررة | 80% من الأكل متكرر | `food_usage` مشتق + مفضلة | §5.3 |
| NG-08 | قوالب وجبات («فطاري المعتاد») | إدخال بضغطة | وجبة قالب = وصفة بسيطة أو وجبة محفوظة (`Draft` وصفة) | §10.3 |
| NG-09 | طبخ دفعات ومتبقٍ | تطبخ 6 حصص وتأكل على أيام | `batches` + المتبقي المشتق | §5.4، §6.7 |
| NG-10 | خام مقابل مطبوخ | فرق قيم كبير | `state` + `yield_ratio` + `weight_basis` | §6.6 |
| NG-11 | يوم ناقص | تشويه المتوسطات | `completeness` + علامات يوم | §6.9 |
| NG-12 | اليوم المنطقي (بعد منتصف الليل) | العشاء المتأخر | `day_start_time` | §6.2 |
| NG-13 | أوفلاين كامل | الموبايل بلا نت | طابور عمليات + Idempotency | §13 |
| NG-14 | إخفاء الأرقام | راحة نفسية | `display_mode` | §10.5 |
| NG-15 | إيقاف التتبّع مؤقتًا | إجازة/ظرف | علامة `NotTracking` + إيقاف تذكيرات | §6.9، §12 |
| NG-16 | تعديل/تراجع/Undo | أخطاء الإدخال | تاريخ + Undo toast + استعادة | §5.5، §9.1 |
| NG-17 | حارس لأهداف شديدة الانخفاض | سلامة بلا أرقام صحية عامة | فحص نسبي لطيف قابل للإيقاف | §6.21 |
| NG-18 | إشعارات محايدة | الخصوصية أمام الآخرين | نص قفل محايد دائمًا | §12.2 |
| NG-19 | صورة ملصق/وجبة | توثيق سريع | `photo_file_ref` (Core Files، Sensitive) | §14.1 |
| NG-20 | تصدير بياناتي | حق المستخدم | JSON/CSV كاملة | §14.5 |
| NG-21 | حذف كامل | حق المستخدم | حذف نهائي بتأكيد + مهلة | §14.5 |
| NG-22 | استيراد CSV | بداية بلا بيانات | Dry-run + تقرير | §15 |
| NG-23 | مكمّلات | تُسجَّل ضمن اليوم | `supplements` بلا ادعاءات ولا جرعات موصى بها | §5.7 |
| NG-24 | نوافذ أكل/صيام | من يتبع نظام نوافذ | `eating_windows` يعرّفها المستخدم | §5.10 |
| NG-25 | أنواع الأيام (تدريب/راحة) | أهداف مختلفة | `day_types` + الأولوية | §6.10 |
| NG-26 | تاريخ الأهداف | تقييم الماضي | تواريخ سريان + `targets_snapshot` | §5.6، §6.11 |
| NG-27 | مراجعة أسبوعية | تأمل لا تقييم | `reviews` أرقام + ملاحظة المستخدم | §5.11 |
| NG-28 | وصفات متداخلة | صلصة داخل طبق | `sub_recipe_id` بعمق ≤3 | §6.5 |
| NG-29 | إعادة حساب مقصودة | تصحيح غذاء خاطئ | معاينة + تطبيق + تراجع | §6.18 |
| NG-30 | قائمة «لا أريد في الاقتراحات» | مساعد الخطة يحترم تفضيلات | `food_exclusions` (ليست تشخيصًا) | §5.3 |
| NG-31 | مساعد الخطة | بناء خطة من المفضلة والمتكرر | `plan_suggestions` تحتاج قبولًا صريحًا؛ بلا نصائح طبية | §5.8 |
| NG-32 | تقريب العبوات في البقالة | تشتري عبوة لا جرامات | `pack_size` + CEIL للعرض | §6.15 |
| NG-33 | وضع تجربة | تعلم بلا تلويث البيانات | `is_demo` | §5.0 |
| NG-34 | أرقام هندية وكسور | RTL عربي | `numerals`, `fraction_display` | §5.1 |
| NG-35 | كشف تكرار الأغذية | قاعدة أغذية نظيفة | تحذير عند `(brand, name_norm)` متشابه + دمج | §9.2 |
| NG-36 | جودة البيانات | قيم غير متسقة | علامات `quality_flags` (Atwater وغيره) | §6.20 |
| NG-37 | تحديث الكتالوج | قيم المصدر تتغير | `catalog_version_at_copy` + إشعار «الأصل تحدّث» اختياري | §9.1 |
| NG-38 | تعدد الأجهزة والتعارض | تعديل من جهازين | `version` + قواعد دمج | §13 |

### 8.2 التحسينات (NE)

| # | التحسين | الفائدة | الشرط/الحدود |
| :---- | :---- | :---- | :---- |
| NE-01 | إدخال بالنص الحر («٢ بيضة وعيش») ← اقتراح بنود | أسرع إدخال | محلي بلا إرسال لخدمة؛ تأكيد المستخدم قبل الحفظ |
| NE-02 | «زي أمس» لوجبة/يوم | تكرار بنقرة | لقطات جديدة |
| NE-03 | تدرّج الحصة (½، ¼) | واقعية | `default_servings_step` |
| NE-04 | تحجيم الوصفة (×2، ÷2) | طبخ لعدد مختلف | يُنشئ عرضًا لا وصفة جديدة إلا بحفظ |
| NE-05 | لصق وصفة نصية وتحليل المكوّنات | بدل كتابة كل شيء | لصق يدوي فقط؛ **لا جلب من الروابط** (CX-22) |
| NE-06 | Widget الموبايل (ماء/إضافة سريعة) | سرعة | بلا أرقام على الشاشة الرئيسية بوضع الخصوصية |
| NE-07 | قائمة بقالة مرتبة بأقسامك | توفير وقت المشوار | `grocery_sections.position` |
| NE-08 | ملاحظات يوم حرة | سياق («مناسبة») | تنعكس في المراجعة |
| NE-09 | مقارنة أسبوعين (أرقام) | وعي | بلا تفسير سببي |
| NE-10 | تخطيط تحضير مسبق (meal-prep) | ربط الدفعات بالخطة | خانة تشير لدفعة |
| NE-11 | وضع السفر | تخفيف التذكيرات عند `travel.trip.started` | حدث اختياري (§11.7) |
| NE-12 | رابط مرجع معرفي للوصفة | `resource_ref` إلى Knowledge | اختياري، بلا FK |
| NE-13 | Undo/Redo فوري | أمان الإدخال | 10 ثوانٍ + تاريخ |
| NE-14 | توصيف الصور بالنص | وصول | `alt` يدخله المستخدم |

---

## 9) دورات الحياة (Lifecycles) وقواعد التحقق (Validation)

### 9.1 دورات الحياة

**غذاء المستخدم**

```text
Active ──(أرشفة)──▶ Archived ──(استعادة)──▶ Active
   │ تعديل قيم ──▶ food_version+1 + food_versions صف جديد (الإدخالات القديمة لا تتأثر)
   └ حذف نهائي: ممنوع لو له إدخالات؛ يُؤرشف فقط. يُحذف نهائيًا فقط عند «حذف حسابي» (§14.5)
```

**غذاء الكتالوج:** `Active → Retired` فقط (لا حذف). عند صدور إصدار جديد: النسخ القديمة تبقى قابلة للقراءة والإدخالات القديمة تشير إليها. المستخدم الذي نسخ غذاءً (`CatalogCopy`) يرى شارة «الأصل تحدّث» (اختيارية) ويقرّر «حدّث نسختي» (يُنشئ `food_version` جديدة) أو يتجاهل.

**الوصفة:** `Draft → Active → Archived`. أي تعديل مكوّن ينتج `recipe_version+1` ولا يغيّر الإدخالات القديمة (لقطة). حذف وصفة لها إدخالات/دفعات/خطط: **أرشفة** فقط.

**الدفعة:** `Active → Finished` (يدوي أو بقبول اقتراح عند المتبقي ≤ 0) أو `Discarded` (بلا حذف إدخالاتها).

**الوجبة:** `Open → Closed`؛ `Skipped` بديل (لا إدخالات). إدخال جديد في `Closed` يعيد فتحها آليًا. وجبة بلا إدخالات وليست `Skipped` تُنظَّف آليًا بعد 24 ساعة.

**الإدخال:** `Active → Deleted (soft) → Purged` (بعد مهلة حذف، افتراضي 30 يومًا، أو فورًا بحذف نهائي). الاستعادة ممكنة قبل Purge.

**الخطة والخانات:** الخطة `Draft → Active → Completed → Archived`. الخانة `Planned → Logged | Skipped | Dismissed`؛ **ثابتة** بعد `Logged` (التعديل يكون على الوجبة الفعلية).

**قائمة البقالة:** `Draft → Active → HandedOff → Completed → Archived`. البند: `Needed → Purchased | Skipped` ويرجع `Needed` يدويًا. التسليم: `None → Queued → Sent → Acknowledged | Failed | Detached`؛ `Failed` يعاد بمفتاح Idempotency ثابت؛ `Detached` لو حُذف المرجع في Home.

**اليوم:** `NoData → Partial → Complete`؛ `NotTracking/Fasting` علامات؛ إعادة فتح اليوم (إلغاء Complete) مسموحة وتُسجَّل.

**الهدف:** تعيين جديد يُغلق السابق عند تاريخ البدء − 1 (لا تداخل). حذف ملف أهداف له تعيينات تاريخية ← أرشفة.

**التزامن:** ثلاث حالات للعميل: `Synced` / `Pending` / `Conflict` (§13.4).

### 9.2 قواعد التحقق (NV)

> تُطبَّق في **ثلاث طبقات**: الواجهة (فورية) + الخادم (إلزامية) + قيود قاعدة البيانات (الأخيرة). الرسائل محايدة ولا تتضمن حكمًا.

| # | القاعدة | عند المخالفة |
| :---- | :---- | :---- |
| NV-01 | لا ينشر إصدار كتالوج `license_status ≠ Verified` | منع النشر |
| NV-02 | اسم الغذاء غير فارغ ≤ 160؛ الأساس `basis_qty > 0` | رفض |
| NV-03 | تكرار `(brand, name_norm)` لغذاء نشط | **تحذير** لا منع، مع اقتراح دمج |
| NV-04 | القيم الغذائية ≥ 0 أو `NULL`؛ ممنوع سالب | رفض |
| NV-05 | السعرات/الماكروز الأربعة مطلوبة للغذاء إلا `OutOfHome`/تقدير | رفض مع شرح |
| NV-06 | `quantity > 0` ≤ حد معقول لكل وحدة (قابل للضبط) | رفض/تأكيد |
| NV-07 | الوحدة المختارة قابلة للتحويل لأساس الغذاء وإلا `UnitUnknown` | يطلب وحدة منزلية/كثافة |
| NV-08 | `yield_ratio > 0` | رفض |
| NV-09 | وصفة: `servings > 0`، مكوّن واحد على الأقل لتفعيلها (`Active`) | تبقى `Draft` |
| NV-10 | **لا قيم مرجعية صحية (RDA) في الكود أو البذور** | فحص بناء CI |
| NV-11 | عمق الوصفات المتداخلة ≤ 3 ولا دورات | رفض |
| NV-12 | إدخال: مصدر واحد فقط (Food/Recipe/Batch) | رفض |
| NV-13 | `range_min ≤ calories ≤ range_max` | رفض |
| NV-14 | باركود: طول ∈ {8,12,13,14} + خانة فحص صحيحة | رفض/تنبيه |
| NV-15 | `logged_at` ليس في المستقبل بأكثر من 24 ساعة (يسمح بتخطيط قريب) | تأكيد |
| NV-16 | `client_op_id` فريد لكل مستخدم (Idempotency) | إعادة النتيجة السابقة |
| NV-17 | هدف: `Range` ← min ≤ max؛ `Around/AtLeast/AtMost` ← قيمة > 0 | رفض |
| NV-18 | تعيين أهداف لا يتداخل مع آخر | رفض مع عرض التعارض |
| NV-19 | `tolerance_pct` ∈ [0, 100] | رفض |
| NV-20 | `water amount_ml` ≤ حد المشغّل `max_water_log_ml` | تأكيد |
| NV-21 | `hydration factor` ∈ [0,100] | رفض |
| NV-22 | `day_start_time` ∈ [00:00, 12:00] | رفض |
| NV-23 | خانة الخطة: تاريخ ضمن الخطة؛ `plan_date` أو `day_index` | رفض |
| NV-24 | مكوّن بقالة: `qty_needed_base ≥ 0` | رفض |
| NV-25 | `pack_size > 0` | رفض |
| NV-26 | `home_item_map.factor_to_base > 0` | رفض |
| NV-27 | تسليم Home: مفتاح Idempotency ثابت لكل بند | — |
| NV-28 | حجم صورة/ملف ≤ حد Core Files، نوع مسموح | رفض |
| NV-29 | نص حر ≤ 1000؛ لا HTML | تعقيم |
| NV-30 | CSV: ترميز UTF-8، أعمدة معروفة، أرقام بنقطة/فاصلة موحّدة | تقرير أخطاء |
| NV-31 | **لا تحقق جرعات/تداخل للمكملات** (لا ادعاءات) | — |
| NV-32 | تعديل إدخال محذوف ممنوع (استعد أولًا) | رفض |
| NV-33 | اقتراحات الخطة لا تدخل أي حساب قبل `Accepted` | — |
| NV-34 | نصوص الواجهة تمر بفحص الصياغة المحايدة (قائمة كلمات ممنوعة: «تجاوزت/فشلت/سيئ/صحي…») | فشل CI |

---
## 10) تجربة المستخدم والشاشات

### 10.1 خريطة الشاشات

| # | الشاشة | الغرض | مصدرها |
| :---- | :---- | :---- | :---- |
| 1 | **اليوم (Today)** | ما أكلته، المتبقي، الماء، الخطة | NF-21 |
| 2 | **إضافة أكل** (Sheet) | بحث/باركود/أخيرة/مفضلة/سريع/خارجي | جديد (NG-02..07) |
| 3 | **سجل الأكل** | أيام وإدخالات، تعديل، نسخ | المصدر |
| 4 | **الأغذية** | بحث، إدارة، نسخ من الكتالوج | المصدر |
| 5 | **تفاصيل غذاء** | قيم، وحدات، نسخ، باركود | المصدر |
| 6 | **الوصفات** + **تفاصيل وصفة** | مكوّنات، خطوات، تغذية/حصة | NF-26 |
| 7 | **الدفعات** | المتبقي | NG-09 |
| 8 | **الأهداف** | ملفات، قيم، تعيينات، أنواع أيام | المصدر |
| 9 | **الماء** | سريع، مسبقات | المصدر |
| 10 | **الخطة** (يوم/أسبوع/قالب) | تخطيط وتحويل | NF-27 |
| 11 | **البقالة** | قائمة بأقسامك + تسليم | المصدر |
| 12 | **التحليلات** | متوسطات، توزيع، اتساق | المصدر |
| 13 | **المراجعة الأسبوعية** | أرقام + ملاحظتك | NG-27 |
| 14 | **المكملات** | تعريف وتسجيل | NG-23 |
| 15 | **النوافذ والتذكيرات** | نوافذ أكل/صيام وتذكيرات | NG-24 |
| 16 | **الإعدادات** | وحدات، يوم، عرض، تكاملات، خصوصية، تصدير/حذف | المصدر + جديد |
| 17 | **الاستيراد** | CSV Dry-run | NG-22 |

### 10.2 شاشة اليوم (Today)

**المكوّنات من الأعلى:**

1. **شريط اليوم:** التاريخ المحلي، أسهم يوم سابق/لاحق، حالة اليوم (`Partial`/`Complete`) بزر «اكتمل يومي».
2. **حلقة/شريط السعرات:** «مسجّل 1,240 من 2,000». بوضع الأرقام المخفية: وصف نوعي (§10.5). الهدف الغائب ← لا حلقة، فقط «مسجّل 1,240».
3. **الباقي:** `الهدف − الفعلي` **فقط** (NC-20). والمخطط يُعرض كسطر منفصل «مخطط ولم يُسجَّل: غداء، عشاء». لا يُطرح المخطط من الباقي.
4. **ماكروز** (بروتين/كارب/دهون) بنفس منطق الهدف؛ لكل مقياس `AtLeast/AtMost` عبارته المحايدة.
5. **وجبات اليوم:** بطاقات حسب أنواع وجباتك (مسجّلة/مخططة/متخطّاة).
6. **الماء:** أزرار المسبقات + إجمالي.
7. **بنود مخططة بانتظار التأكيد:** «سجّلتها / لم آكلها / غيّرت».
8. **زر عائم ➕** (إضافة أكل) دائمًا ظاهر.

**حالات الشاشة الأربع (إلزامية):**

| الحالة | العرض |
| :---- | :---- |
| فارغة | «لم تسجّل شيئًا بعد اليوم» + أزرار: أضف أكلًا، انسخ من أمس، لم أتتبّع اليوم |
| تحميل | هيكل عظمي (Skeleton) لا شاشة بيضاء؛ البيانات المحلية تظهر فورًا |
| خطأ | رسالة بسيطة + إعادة المحاولة؛ لا فقد للإدخال المحلي |
| أوفلاين | شارة «غير متصل — كل شيء محفوظ هنا»؛ الإدخالات تعمل بالكامل |

### 10.3 الشاشات الرئيسية بالتفصيل

**إضافة أكل (Sheet):**

- تبويبات: **الأخيرة** · **المفضلة** · **بحث** · **باركود** · **سريع (سعرات)** · **خارج البيت** · **وصفة/دفعة**.
- بعد الاختيار: **الكمية** (حقل + أزرار ½ ¼ ×2) + **الوحدة** (أعلى وحدة استخدمتها لهذا الغذاء أولًا) + معاينة فورية للسعرات والماكروز + **الوجبة** (اقتراح حسب الوقت) + تاريخ/وقت (افتراضي الآن).
- زر «أضف وأكمل» (يبقى المودال لإضافة التالي) و«أضف وأغلق».
- **أكل خارج البيت:** اسم + سعرات تقديرية + (اختياري: نطاق) + طريقة التقدير؛ يُعلَّم «تقدير» (شارة صغيرة) بلا لون إنذاري.
- **غذاء مفقود:** «لم تجده؟ أضفه» يفتح نموذجًا مختصرًا (الاسم + قيم لكل 100 جم أو للحصة)، يمكن حفظه لاحقًا بقيم ناقصة (`Unverified`).

**سجل الأكل:** قائمة بالأيام (حالة كل يوم)، تعديل (كمية/وحدة/وجبة/وقت)، حذف مع Undo، «انسخ الوجبة/اليوم إلى…»، فلتر (وجبة، نوع، ثقة).

**الأغذية:** بحث موحّد (أغذيتي + الكتالوج)، شارات المصدر (`مخصص`، `من الكتالوج`، `باركود`)، مفضلة، أرشيف. **تفاصيل الغذاء:** القيم للأساس + حصة + وحدات منزلية + كثافة + باركودات + سجل النسخ + «استخدمه في» + علامات الجودة.

**الوصفات:** قائمة + تفاصيل: صورة، حصص، مكوّنات مجمّعة بعناوين، خطوات بمؤقتات، **تغذية/حصة** مع شارة اكتمال («مكوّن بلا قيم»)، تحجيم ×، «سجّل حصة»، «ضمن الخطة»، «أضف مكوّناتها للبقالة».

**الأهداف:** ملفات (بأسماء محايدة)، لكل ملف: قيم لكل مقياس ونوع يوم، **اتجاه** (حول/على الأقل/على الأكثر/نطاق)، سريان من تاريخ، **تعيين الملف** بفترات، قواعد أنواع الأيام. عند خفض ملحوظ يظهر الحارس (§6.21) بصيغة لطيفة.

**الخطة:** عرض أسبوع (7 أعمدة RTL) ويوم؛ سحب وإفلات من الوصفات/المفضلة؛ **نسخ أسبوع**؛ قالب دوري (Template)؛ ملخص مخطط لكل يوم (يُعرض «مخطط»)؛ «اقتراحات» (مساعد) بقبول بند بند؛ «حوّل إلى سجل» لكل خانة.

**البقالة:** قوائم؛ أقسام بترتيبك؛ كل بند: الكمية المطلوبة، المخزون (إن طُرح)، المطلوب شراؤه، من أين جاء (زر «لماذا؟»)؛ تحديد «اشتريت»؛ «أرسل إلى Home» (يظهر فقط مع التكامل)؛ حالة التسليم بصدق (`Sent/Acknowledged/Failed`).

**التحليلات:** مدى (7/14/30/مخصص)، شارة **«بناءً على n من m يومًا»**، متوسطات، توزيع ماكروز (تقريبي)، اتساق، أعلى الأغذية، الماء. بلا أحكام. زر «ما هذه الأرقام؟» يشرح التعريفات.

**المراجعة الأسبوعية:** أرقام مشتقة + **حقل ملاحظتك** + «ماذا تودّ أن تجرّب؟» (نص حر). لا اقتراحات علاجية.

**الإعدادات:** الوحدات (حجم الكوب/الملعقة)، يوم التغذية، الأرقام، الطاقة، وضع العرض، حدود الاكتمال، التكاملات وموافقاتها، الإشعارات، الخصوصية (قفل، إخفاء من البحث)، التصدير، «إيقاف التتبّع»، «حذف بياناتي».

### 10.4 الموبايل والسرعة

- هدف الأداء: إضافة غذاء مكرر ≤ **3 نقرات** و≤ 5 ثوانٍ؛ فتح Today من الكاش المحلي ≤ **1 ثانية**.
- الإبهام: الأزرار الأساسية في النصف السفلي؛ الكيبورد الرقمي للكميات.
- مسح الباركود بكاميرا الجهاز، يعمل محليًا للمعروف.
- Widget الماء والإضافة السريعة (NE-06) بلا أرقام حساسة افتراضيًا.
- اختصارات: الضغط المطوّل على غذاء ← «نفس كمية آخر مرة».

### 10.5 أوضاع العرض (`display_mode`)

| الوضع | ماذا يظهر |
| :---- | :---- |
| `Full` | كل الأرقام |
| `Qualitative` | أوصاف نوعية فقط («قريب من المخطط»، «أعلى قليلًا») بلا أرقام السعرات؛ التسجيل يعمل بنفس الدقة داخليًا |
| `Hidden` | لا أرقام تغذية على الإطلاق (يبقى التسجيل، الماء، الوجبات، الخطة بالأسماء) |

- التبديل من الإعدادات أو بضغطة مطوّلة على شعار Today؛ يُطبَّق على كل الشاشات والـWidgets والإشعارات والتصدير المرئي.
- الأرقام تظهر لحظيًا عند الضغط المطوّل «اكشف مؤقتًا» (يُعاد الإخفاء تلقائيًا) إن سمح الإعداد.

### 10.6 قواعد الصياغة والسلامة (ملزمة)

1. **ممنوع:** «تجاوزت»، «فشلت»، «سيئ/جيد/صحي/غير صحي»، «ذنب»، «عقاب»، «احرق»، ألوان الإنذار (الأحمر) لأرقام الأكل، رموز وجوه حزينة.
2. **مسموح:** «أعلى من المخطط بـ…»، «أقل من المخطط بـ…»، «ضمن النطاق».
3. لا مقارنات اجتماعية، ولا شارات إنجاز مرتبطة بالأكل القليل.
4. السلاسل (Streaks) **معطّلة افتراضيًا**؛ عند تفعيلها تُسمّى «أيام تسجيل متتالية» وتُوقَف بإجازة بلا كسر.
5. **عبارة المساعدة:** في الإعدادات وعند الحارس: «إن كان التتبّع يسبب لك ضغطًا، يمكنك إيقافه أو إخفاء الأرقام، والتحدث مع مختص». دون ذكر أرقام هواتف مبرمجة (تختلف بالبلد — تُعدَّل من المشغّل).
6. فحص آلي في CI للنصوص (NV-34، NT-61).

### 10.7 الوصول واللغة

RTL كامل؛ الأرقام لاتينية أو هندية (إعداد)؛ أحجام خط قابلة للتكبير؛ تباين كافٍ؛ قارئ الشاشة: كل حلقة/شريط له وصف نصي؛ لا اعتماد على اللون وحده؛ كل الصور لها `alt` اختياري (NE-14).

---

## 11) التكاملات وعقود API

### 11.1 المبادئ

1. Nutrition **يعمل كاملًا بلا أي قسم آخر** (§3.3). كل تكامل **اختياري، معطّل افتراضيًا، بموافقة صريحة، وقابل للإيقاف**.
2. **عقود فقط**: لا قراءة من جداول غيره، لا نسخ كيانات (CX-02).
3. كل قراءة خارجية لها TTL قصير ومهلة؛ الفشل = تدهور هادئ، لا خطأ للمستخدم.
4. البيانات **الخارجة** من Nutrition: لا أرقام تغذية افتراضيًا (`outbound_events` كلها false) (CX-16).
5. الأحداث `nutrition.{entity}.{verb}` + Outbox + at-least-once + `event_id` (CX-17).

### 11.2 Home (البقالة والمخزون)

| الاتجاه | العقد | ملاحظة |
| :---- | :---- | :---- |
| Nutrition ← Home | `GET /home/items/stock?refs=…` | قراءة مخزون (طلب تغيير على Home؛ يتدهور لعدم الطرح) |
| Nutrition → Home | `POST /home/purchases` الموجود، `Idempotency-Key = grocery_item.handoff_idempotency_key` | يحفظ `home_purchase_ref` |
| Nutrition → Home (مقترح) | `POST /home/purchases/from-source` | فرادة المصدر (طلب) |
| Home → Nutrition | `home.purchase.purchased` + `source_ref` | يعلّم البند `Purchased (HomeSync)` فقط عند وجود المرجع |
| Home → Nutrition | `home.item.deleted` | يجعل `home_item_ref_state=Missing` والبند `Detached` |

**تدهور:** بدون Home، القائمة كاملة بلا طرح مخزون، و«اشتريت» يدوي.

### 11.3 Sports (قراءة اختيارية)

| العقد | الاستخدام |
| :---- | :---- |
| `GET /sports/day-type/{date}` (طلب) | نوع يوم (تدريب/راحة) كمدخل لـ§6.10 |
| `GET /sports/measurements/summary` (طلب) | وزن حديث للمعادلات التقديرية فقط (§6.19) |
| `GET /sports/capabilities` | اكتشاف |

- Nutrition **لا يخزّن وزنًا** (CX-08). الموافقة منفصلة لكل مدخل (`sports_integration.day_types/weight`).
- لا يرسل Nutrition أي قيم تغذية لـSports **إلا** بموافقة مستقلة وعبر حدث ملخّص (`nutrition.day.summarized` بسعرات اليوم الكلية فقط) — **معطّل افتراضيًا**.

### 11.4 Habit OS

- `nutrition.water.logged` (اختياري): يحمل `date` و`total_ml` المقرَّب لعتبة `bucket`، لا كل سجل.
- Habit يستطيع طلب «سجّل كوبًا» عبر `POST /nutrition/water` بـ`source=Habit` (وسيلة إدخال فقط، ليس مصدرًا ثانيًا).
- لا ستريك في Nutrition؛ السلاسل ملك Habit (CX-10).

### 11.5 Today (Core)

`GET /nutrition/feed/today` يُرجع بطاقات محايدة: وجبات مخططة بانتظار التأكيد، تذكير ماء (إن فُعِّل)، «اكتمل يومك؟». بوضع `Hidden` تُرجع عناوين بلا أرقام. Calendar يعرض ولا ينسخ.

### 11.6 Finance

لا تكامل كتابة (NC-32). اختياري: قراءة `GET /finance/summary?category=food` لعرض سطر «إنفاق الطعام هذا الشهر» داخل المراجعة، **بموافقة**، ويغيب بغيابه.

### 11.7 تكاملات أخرى (اختيارية)

| القسم | الاستخدام |
| :---- | :---- |
| **Travel** | حدث `travel.trip.started/ended` ← وضع السفر: تخفيف التذكيرات، `tz` الجهاز للإدخال الجديد |
| **Knowledge** | `resource_ref` (مقال/كتاب وصفة) على الوصفة |
| **Core Files** | صور وملصقات بمستوى Sensitive |
| **Core Notifications** | إرسال بنصوص محايدة وساعات الهدوء |
| **Core Search** | **غير مفعّل افتراضيًا**؛ عند التفعيل يفهرس أسماء الوصفات فقط (لا أرقام ولا سجل أكل) |
| **Spiritual** | غير مدعوم في v4.0 (ND-15) |

### 11.8 الأحداث الصادرة (كلها معطّلة افتراضيًا)

| الحدث | الحمولة | الافتراضي |
| :---- | :---- | :---- |
| `nutrition.water.logged` | `{date, total_ml_bucket}` | OFF |
| `nutrition.day.completed` | `{date}` بلا أرقام | OFF |
| `nutrition.day.summarized` | `{date, calories}` | OFF (موافقة منفصلة) |
| `nutrition.grocery.handoff_requested` | `{list_id, items:[{ref,qty,unit}]}` | ON عند التسليم فقط |
| `nutrition.plan.slot.pending` | `{date, slot}` للـToday | ON (للـfeed فقط) |
| `nutrition.data.deleted` | `{scope}` | ON (لتنظيف المراجع) |

### 11.9 واجهة API (REST)

**اتفاقيات:** `Authorization` بجلسة المستخدم؛ `Idempotency-Key` على كل POST/PUT؛ `If-Match: version` للتعديل؛ الأرقام نصوصًا؛ ترقيم بـcursor؛ أخطاء بصيغة `{code, message_ar, details}`.

| المجموعة | المسارات | ملاحظات أخطاء |
| :---- | :---- | :---- |
| الأغذية | `GET/POST /nutrition/foods` · `GET/PATCH/DELETE /nutrition/foods/{id}` · `POST /nutrition/foods/{id}/archive` · `GET /nutrition/foods/search?q=&barcode=` · `POST /nutrition/catalog/{id}/copy` | `409 DUPLICATE_WARNING` · `422 UNIT_UNKNOWN` |
| الكتالوج | `GET /nutrition/catalog/foods` · `GET /nutrition/catalog/versions` | قراءة فقط |
| الوحدات | `GET /nutrition/units` · `POST/PATCH /nutrition/foods/{id}/units` | |
| الوصفات | `GET/POST /nutrition/recipes` · `GET/PATCH/DELETE /nutrition/recipes/{id}` · `POST …/duplicate` · `POST …/scale` · `GET …/nutrition` | `422 RECIPE_CYCLE` · `422 RECIPE_DEPTH` |
| الدفعات | `GET/POST /nutrition/batches` · `PATCH …/{id}` · `POST …/{id}/finish` | |
| الوجبات | `GET/POST /nutrition/meals` · `PATCH/DELETE …/{id}` · `POST …/{id}/skip` | |
| سجل الأكل | `GET/POST /nutrition/food-log` · `PATCH/DELETE …/{id}` · `POST …/{id}/restore` · `POST /nutrition/food-log/copy` · `POST /nutrition/food-log/batch` (مزامنة) | `422 NO_SOURCE` · `409 VERSION_CONFLICT` |
| الأهداف | `GET/POST /nutrition/goals` · `PATCH …/{id}` · `POST …/{id}/targets` · `GET/POST /nutrition/goal-assignments` · `GET /nutrition/goals/resolve?date=` | `409 ASSIGNMENT_OVERLAP` |
| أنواع الأيام | `GET/POST /nutrition/day-types` · `PUT /nutrition/days/{date}/type` | |
| الماء | `GET/POST /nutrition/water` · `DELETE …/{id}` · `GET/POST /nutrition/water/presets` | |
| المكملات | `GET/POST /nutrition/supplements` · `POST …/{id}/log` | |
| الخطط | `GET/POST /nutrition/plans` · `GET/PATCH …/{id}` · `PUT /nutrition/plans/{id}/days/{date}` · `POST …/slots/{id}/convert` · `POST …/slots/{id}/skip` · `POST /nutrition/plans/{id}/copy` · `POST /nutrition/plans/suggest` · `POST …/suggestions/{id}/accept` | `409 SLOT_ALREADY_CONVERTED` (يعيد الوجبة) |
| البقالة | `GET/POST /nutrition/grocery` · `POST /nutrition/grocery/generate` · `PATCH …/items/{id}` · `POST …/{id}/handoff` · `GET …/items/{id}/sources` · `GET/POST /nutrition/grocery/sections` | `502 HOME_UNAVAILABLE` (يُعاد لاحقًا) |
| الملخصات | `GET /nutrition/summary/day?date=` · `GET /nutrition/summary/range?from=&to=` · `PUT /nutrition/days/{date}/mark` · `POST /nutrition/summary/rebuild` | |
| التحليلات | `GET /nutrition/analytics?from=&to=&metrics=` · `GET/POST /nutrition/reviews` | |
| إعادة الحساب | `POST /nutrition/recalc/preview` · `POST …/{id}/apply` · `POST …/{id}/revert` | `410 REVERT_EXPIRED` |
| النوافذ/التذكيرات | `GET/POST /nutrition/windows` · `GET/POST /nutrition/reminders` | |
| الاستيراد/التصدير | `POST /nutrition/import` (dry-run/apply) · `GET /nutrition/import/{id}` · `POST /nutrition/export` · `GET …/{id}` | |
| المزامنة | `POST /nutrition/sync/push` · `GET /nutrition/sync/pull?since=` | `409` لكل عملية متعارضة |
| الإعدادات | `GET/PATCH /nutrition/settings` · `GET /nutrition/capabilities` | |
| الخصوصية | `POST /nutrition/data/delete` · `GET /nutrition/data/delete/{id}` | تأكيد بإعادة مصادقة |
| الـFeed | `GET /nutrition/feed/today` | |

---

## 12) الأتمتة (Automations)

> كل أتمتة **Idempotent** بمفتاح، تُحترم فيها ساعات الهدوء وسقف الإشعارات اليومي، وتُحترم فيها حالة `NotTracking` و`Fasting`، ويمكن إيقافها فرديًا.

| # | الأتمتة | المشغّل | المفتاح (Idempotency) | الافتراضي |
| :---- | :---- | :---- | :---- | :---- |
| NA-01 | بناء/تحديث الملخص اليومي | تغيّر إدخال/ماء/علامة | `(user, date, inputs_hash)` | ON |
| NA-02 | سؤال إغلاق اليوم | `day_close_prompt_time` | `(user, date, 'close')` | OFF حتى يضبطه |
| NA-03 | تذكير وجبة | جدول المستخدم | `(reminder, date, time)` | OFF |
| NA-04 | تذكير ماء | فاصل/أوقات | `(reminder, date, slot)` | OFF |
| NA-05 | تذكير «تأكيد المخطط» | بعد وقت الخانة | `(slot, 'confirm')` | OFF |
| NA-06 | مراجعة أسبوعية | يوم/ساعة | `(user, week_start)` | OFF |
| NA-07 | توليد مسودة بقالة للأسبوع القادم | يوم يحدده المستخدم | `generation_key` | OFF |
| NA-08 | تنظيف الوجبات الفارغة | يومي | `(meal, 'gc')` | ON |
| NA-09 | حذف نهائي للمحذوف بعد المهلة | يومي | `(entry, 'purge')` | ON |
| NA-10 | تحديث كاش الاستخدام | تغيّر السجل | `(user,'usage')` | ON |
| NA-11 | إعادة محاولة التسليم لـHome | فشل | مفتاح البند | ON |
| NA-12 | إشعار «الأصل تحدّث» للكتالوج | إصدار جديد | `(copy, version)` | OFF |
| NA-13 | تخفيف التذكيرات في السفر | `travel.trip.started` | `(trip, 'dim')` | ON إن وُجد التكامل |
| NA-14 | تعليم دفعة كمنتهية (اقتراح) | المتبقي ≤ 0 | `(batch,'finish-suggest')` | ON |
| NA-15 | إلغاء تعيين Home بعد حذف المرجع | `home.item.deleted` | `(item, ref)` | ON |
| NA-16 | تنظيف كاش خارجي | ساعي | `ttl` | ON |

### 12.2 الإشعارات

- **نص شاشة القفل محايد دائمًا:** «تذكير من تطبيقك» / «لديك تحديث»، دون ذكر أكل أو أرقام. التفاصيل بعد فتح التطبيق.
- ساعات الهدوء من Core، وسقف `daily_notification_cap`، ولا إشعار يوم `NotTracking`/`Fasting` للتذكيرات المرتبطة بالأكل.
- **تذكير الفجوة (GoalGap)** وصفي ومعطّل افتراضيًا ("مسجّل أقل من المخطط حتى الآن") ولا يُرسل قبل حد زمني يحدده المستخدم.
- كل إشعار قابل للكتم والتأجيل بضغطة.

---
## 13) العمل بلا اتصال (Offline) والمزامنة

### 13.1 المبدأ
كل عمليات اليوم تعمل **بلا إنترنت**: بحث الأغذية المحلية، تسجيل الأكل والماء، الوصفات، الخطة، قائمة البقالة، الملخصات. الخادم نسخة مرجعية وليس شرطًا للاستخدام.

### 13.2 ما يُخزَّن محليًا

| البيانات | سياسة التخزين |
| :---- | :---- |
| أغذيتي ووصفاتي وأهدافي وإعداداتي | كاملة |
| الكتالوج | مجموعة فرعية: المفضلة + المستخدم مؤخرًا + حزمة بداية؛ البحث الكامل يتطلب اتصالًا أو حزمة كاملة اختيارية |
| سجل الأكل والماء | آخر 90 يومًا كاملة (قابلة للضبط) والباقي عند الطلب |
| الملخصات | تُبنى محليًا بنفس المحرك (§6) |
| الصور | مصغّرات محلية، الأصل عند الطلب |

### 13.3 طابور العمليات
كل تغيير = عملية `{client_op_id, type, payload, base_version}` تُحفظ محليًا ثم تُرسل `sync/push` بالترتيب. الخادم يطبّق مرة واحدة (Idempotency) ويردّ بالنتيجة. الفشل المؤقت يعاد بتراجع أُسّي؛ الدائم (تحقق) يظهر للمستخدم بوضوح دون فقد الإدخال.

### 13.4 التعارض والدمج

| الحالة | الحل |
| :---- | :---- |
| تعديل نفس الإدخال من جهازين | `version`: الأحدث وقتًا يفوز **للحقول المختلفة تُدمج**؛ نفس الحقل ← يُحتفظ بالأحدث ويُسجَّل الآخر في `log_entry_history` مع إشعار «تم دمج تعديلين» |
| حذف على جهاز وتعديل على آخر | الحذف يفوز مع إمكان الاستعادة |
| إضافة نفس الغذاء من جهازين | `UNIQUE(client_op_id)` يمنع التكرار؛ تشابه الأسماء ← تحذير دمج لاحقًا (NV-03) |
| تغيير الهدف | تعيينات بتواريخ؛ التعارض يُعرض للمستخدم (لا دمج صامت) |
| ملخص اليوم | يُعاد بناؤه من الإدخالات؛ لا يُدمج |
| ساعة جهاز خاطئة | الخادم يسجّل `received_at`؛ فرق > 24 ساعة ← تنبيه «تأكد من ضبط الوقت» |

حالة العرض لكل عنصر: `Synced / Pending / Conflict` + شارة عامة «n عمليات بانتظار المزامنة».

### 13.5 ما لا يعمل أوفلاين
تسليم البقالة لـHome، قراءة مخزون Home، قراءة Sports، البحث في كتالوج غير محمّل، التصدير الكامل. تظهر معطّلة برسالة واضحة، والطلبات تُجدول للاحقًا (التسليم يصير `Queued`).

---

## 14) الأمان والخصوصية

### 14.1 مستويات الخصوصية (CX-16)

| الكيان | المستوى | ملاحظات |
| :---- | :---- | :---- |
| سجل الأكل، الماء، المكملات، الملخصات، الأهداف، المراجعات | **Sensitive** | لا تظهر في بحث عام، لا إشعارات بأرقام، لا أحداث صادرة افتراضيًا |
| الأغذية، الوصفات | Normal (قابلة لرفع المستوى) | الصور Sensitive |
| الخطط والبقالة | Normal | |
| الإعدادات | Normal | |
| لا شيء Secret افتراضيًا | يمكن للمستخدم رفع أي كيان إلى Secret (يطلب قفل التطبيق) | |

### 14.2 الضوابط

- التشفير أثناء النقل (TLS) وعند التخزين؛ بيانات الجهاز المحلية مشفّرة بمفتاح الجهاز.
- عزل على مستوى الصف بـ`user_id` من الجلسة، ولا يُقبل `user_id` من الطلب؛ FK مركّبة (NC-26).
- **قفل التطبيق** اختياري (بصمة/PIN) ويُلزم لـSecret؛ مهلة قفل تلقائية.
- لقطة الشاشة في التبديل بين التطبيقات تُموَّه عند الخصوصية.
- الـAudit غير قابل للتعديل لتغييرات الأهداف والخصوصية وإعادة الحساب والحذف.
- المشغّل لا يقرأ بيانات الأكل في الدعم إلا بإذن مؤقت من المستخدم.

### 14.3 التكاملات والخصوصية
موافقة صريحة لكل تكامل وكل اتجاه؛ تُعرض «ما الذي سيُشارَك بالضبط». سحب الموافقة يوقف التدفق فورًا ويُبقي المراجع القديمة `Detached`.

### 14.4 قانون حماية البيانات
القانون المصري رقم 151 لسنة 2020 مرجع عام لمعاملة البيانات الصحية (**ليس استشارة قانونية؛ يُراجَع مع مختص قبل الإطلاق**). مبادئ مطبّقة: جمع الحد الأدنى، غرض واضح، حق الوصول والتصدير والحذف.

### 14.5 التصدير والحذف

- **التصدير:** JSON كامل (+ CSV لكل جدول رئيسي)، يُنتج كملف في Core Files برابط ينتهي، بعد إعادة مصادقة.
- **حذف بياناتي:** تأكيد بإعادة مصادقة + عبارة تأكيد + مهلة تراجع (افتراضي 7 أيام)، ثم حذف نهائي من الجداول والنسخ الاحتياطية وفق جدول الاحتفاظ، وإصدار `nutrition.data.deleted` للأقسام التي تحمل مراجع (تصير `Missing`).
- **حذف جزئي:** حسب النطاق (سجل الأكل فقط، نطاق تواريخ، الصور…).
- **الاحتفاظ:** المحذوف الناعم 30 يومًا؛ الـhistory 90 يومًا؛ الكاش الخارجي ساعات.

---

## 15) الترحيل والاستيراد

### 15.1 الواقع
لا توجد بيانات تغذية فعلية في Notion (§1.2) ← لا ترحيل تلقائي. بدلًا منه: **Onboarding موجَّه + استيراد CSV**.

### 15.2 Onboarding (5 خطوات، كلها قابلة للتخطي)
1. وحدات المنزل (حجم الكوب والملعقة) و`day_start_time`.
2. أنواع الوجبات (قائمة اقتراحية قابلة للحذف).
3. وضع العرض وهل تريد أهدافًا الآن (الافتراضي: لا).
4. أغذية بداية (من حزمة مرخّصة إن وُجدت، أو أضف مفضلاتك).
5. التكاملات (كلها مغلقة).

**قوالب Notion الموجودة:** «Recipes Box» ← استيراد وصفات بالاسم/الوسوم/المفضلة/الرابط (المكوّنات نص حر `Unmatched` للمستخدم ليربطها)؛ «Year Meal Planner» ← خانات خطة `Planned` اختياريًا؛ «My Pantry» ← **لا يُستورد هنا** (ملك Home). (لم تُفحص صفوف القوالب؛ قد تكون فارغة.)

### 15.3 استيراد CSV

| النوع | الأعمدة الأساسية |
| :---- | :---- |
| أغذية | name, brand, basis, serving, calories, protein, carbs, fat, fiber, sugar, sodium |
| سجل | date, time, meal, food_name, quantity, unit, calories, protein, carbs, fat |
| ماء | date, time, ml |
| وصفات | name, servings, ingredient, qty, unit |

**الخطوات:** رفع ← **ربط الأعمدة** ← **Dry-run** (تقرير: صفوف OK/تحذير/خطأ/تخطّي، تكرارات، وحدات غير معروفة) ← تأكيد ← تطبيق بـ`source_key` لكل صف (إعادة الاستيراد لا تكرّر) ← تقرير نهائي قابل للتحميل. الاستيراد من تطبيقات تتبّع أخرى: **غير مؤكد — يُتحقق قبل البناء** من صيغ تصديرها.

### 15.4 قواعد
لا يُستورد صف بلا تاريخ؛ الإدخالات المستوردة `source=Import` بثقة `Estimated`؛ لا يُحتسب الاكتمال تلقائيًا للأيام المستوردة (المستخدم يعلنه).

---

## 16) اختبارات القبول (NT)

> NT-01…NT-10 هي الاختبارات العشرة الأصلية، مفصَّلة. الباقي يغطي الفجوات والتعارضات.

| # | الاختبار | المتوقع |
| :---- | :---- | :---- |
| NT-01 | دجاج 165 kcal/100g، سجّل 150 جم | 247.50 kcal، بروتين بنسبة 1.5 × القيمة |
| NT-02 | وصفة 1,800 kcal و4 حصص | 450.00/حصة؛ 3 حصص و1,000 ← 333.33 |
| NT-03 | سجّل غذاء ثم عدّل قيمه | الإدخال القديم لم يتغير؛ الجديد بالقيم الجديدة |
| NT-04 | سجّل ماء 23:30 بتوقيت القاهرة ثم غيّر المنطقة | `local_date` لم يتحرك |
| NT-05 | افتح الأهداف لمستخدم جديد | لا أرقام افتراضية إطلاقًا |
| NT-06 | خطة 3 أيام تحوي 450 جم دجاج موزعة | بند بقالة واحد 450 جم بمصادره الثلاثة؛ إعادة التوليد لا تضاعف |
| NT-07 | أوقف Sports | Nutrition يعمل بالكامل بلا أخطاء |
| NT-08 | تحقق من الجداول والواجهات | لا حقول دفع ولا `finance_links` |
| NT-09 | سجّل 3 إدخالات بقيم تُقرَّب | مجموع الملخص = مجموع الصفوف المعروضة بالضبط |
| NT-10 | فحص النصوص | لا عبارة طبية/سببية/حكمية |
| NT-11 | بحث «رز» | يجد «أرز» |
| NT-12 | بحث «ملوخيه» بالياء/بالتاء | يجد «ملوخية» |
| NT-13 | باركود بخانة فحص خاطئة | رفض برسالة |
| NT-14 | باركود معروف في الكتالوج | يفتح الغذاء مباشرة |
| NT-15 | تعديل غذاء كتالوج | يعرض «حفظ نسختي»؛ الأصل لم يتغير |
| NT-16 | وحدة «كوب» بدون كثافة لغذاء صلب | `UNIT_UNKNOWN` بلا حفظ صامت |
| NT-17 | رغيف 80 جم، 0.5 رغيف | 40 جم والقيم الصحيحة |
| NT-18 | زيت: 1 ملعقة كبيرة بكثافة 0.92 | 132.60 kcal (المثال §6.3) |
| NT-19 | 100 جم أرز خام مقابل مطبوخ بمعامل 2.5 | قيم لكل 100 جم مطبوخ = خام ÷ 2.5 |
| NT-20 | مكوّن بوزن مطبوخ لغذاء خام | تحويل بالمعامل وإلا `STATE_MISMATCH` |
| NT-21 | وصفة متداخلة بعمق 4 | رفض `RECIPE_DEPTH` |
| NT-22 | دورة A→B→A | رفض `RECIPE_CYCLE` |
| NT-23 | مكوّن بلا قيم | `completeness=HasUnknown`، المجموع من المعروف |
| NT-24 | وصفة yield 1,200 جم وإجمالي 1,800 | 300 جم = 450 kcal |
| NT-25 | دفعة 6 حصص، أكلت 2 | المتبقي 4؛ حذف إدخال يرجع الكمية |
| NT-26 | أكل 01:30 بـday_start=04:00 | يُحسب لليوم السابق |
| NT-27 | تعديل `logged_at` عبر منتصف الليل | يتحدث اليومان |
| NT-28 | يوم بإدخالين فقط | `Partial` وليس `Below` |
| NT-29 | أعلن اليوم Complete ثم أضف إدخالًا | الملخص يتحدث والوسم يبقى |
| NT-30 | متوسط أسبوع فيه 4 أيام Complete | «بناءً على 4 من 7» |
| NT-31 | الاتساق بعينة 3 أيام | «بيانات غير كافية» |
| NT-32 | هدف 2,000±10%، فعلي 2,180 | `Within` |
| NT-33 | فعلي 2,250 | `Above` بعبارة «أعلى من المخطط بـ 250» |
| NT-34 | تغيير الهدف اليوم | تقييم الأمس لم يتغير (`targets_snapshot`) |
| NT-35 | تعيينان متداخلان | `ASSIGNMENT_OVERLAP` |
| NT-36 | Sports يغيّر نوع اليوم | الأولوية: يدوي > Sports > قاعدة |
| NT-37 | هدف جديد < 60% من متوسطي | رسالة الحارس اللطيفة + تأكيد |
| NT-38 | الحارس معطّل | لا رسالة |
| NT-39 | قهوة بمعامل ترطيب 50% و200 مل | 100 مل ماء فعّال |
| NT-40 | حذف إدخال المشروب | يحذف سجل الماء المشتق |
| NT-41 | تحويل خانة الخطة مرتين | وجبة واحدة (Idempotent) |
| NT-42 | «لم آكل هذه» | الخانة Skipped ولا إدخالات ولا يظهر «نقص» |
| NT-43 | الباقي اليوم مع وجبة مخططة | الباقي = الهدف − الفعلي فقط |
| NT-44 | اقتراحات المساعد قبل القبول | لا تظهر في أي مجموع |
| NT-45 | بند بقالة بمخزون Home 200 جم من 450 | المطلوب شراؤه 250 + «حسب مخزون Home وقت…» |
| NT-46 | Home غير متاح | القائمة كاملة بعلامة «لم يُطرح المخزون» |
| NT-47 | حدث `purchased` بلا `source_ref` | يُتجاهل |
| NT-48 | حدث بمرجعنا | البند Purchased (HomeSync) |
| NT-49 | تسليم فشل ثم أعيد | نفس مفتاح Idempotency؛ لا تكرار |
| NT-50 | حذف عنصر Home المرتبط | البند Detached |
| NT-51 | بند يدوي ثم إعادة توليد | لا يُمسّ |
| NT-52 | وضع Hidden | لا رقم تغذية في أي شاشة/Widget/إشعار |
| NT-53 | وضع Qualitative | أوصاف نوعية فقط |
| NT-54 | إشعار شاشة القفل | نص محايد دائمًا |
| NT-55 | يوم `NotTracking` | لا تذكيرات أكل |
| NT-56 | أوفلاين: 10 إدخالات ثم اتصال | تُدفع بالترتيب بلا تكرار |
| NT-57 | تعديل من جهازين لحقلين مختلفين | يُدمج |
| NT-58 | تعديل لنفس الحقل | الأحدث + أثر في History |
| NT-59 | إرسال نفس `client_op_id` مرتين | نتيجة واحدة |
| NT-60 | إعادة حساب مقصودة | معاينة ثم تطبيق ثم تراجع يعيد القيم الأصلية |
| NT-61 | فحص CI للنصوص | فشل لو ظهرت كلمة ممنوعة |
| NT-62 | تصدير | JSON كامل بلا بيانات مستخدم آخر |
| NT-63 | حذف بياناتي | بعد المهلة لا بقايا؛ حدث `data.deleted` |
| NT-64 | `user_id` في الطلب مختلف عن الجلسة | يُتجاهل/يُرفض |
| NT-65 | استيراد CSV بصفوف مكررة | Dry-run يبلغ؛ إعادة التطبيق لا تكرّر |
| NT-66 | تفعيل Core Search | يفهرس أسماء الوصفات فقط |
| NT-67 | حذف دفعة بإدخالات | الإدخالات تبقى |
| NT-68 | تغيير `day_start_time` | يسري على الجديد؛ الماضي بإعادة حساب مقصودة فقط |

---

## 17) الخدمات وترتيب البناء

### 17.1 الخدمات

| الخدمة | المسؤولية |
| :---- | :---- |
| FoodService | أغذية المستخدم، النسخ، الأرشفة، الباركود، الوحدات |
| NutritionCatalogService | الكتالوج والإصدارات والبحث |
| NutritionUnitService | التحويلات والكثافة والإعدادات |
| RecipeService | وصفات، مكوّنات، مجموع، حصص، تحجيم |
| BatchService | الدفعات والمتبقي |
| MealService | الوجبات |
| FoodLogService | الإدخالات واللقطة والتصحيح والنسخ |
| NutritionGoalService | الملفات، الأهداف، التعيينات، أنواع الأيام |
| WaterService | الماء والمسبقات والترطيب |
| SupplementService | المكملات |
| MealPlanService | الخطط والخانات والتحويل والاقتراحات |
| GroceryService | التوليد، الدمج، الطرح، التسليم |
| NutritionSummaryService | الملخصات والاكتمال |
| NutritionAnalyticsService | المتوسطات والاتساق والمراجعة |
| NutritionSearchService | التطبيع والمرادفات والترتيب |
| NutritionRecalcService | إعادة الحساب المقصودة |
| NutritionNotificationService | التذكيرات والنوافذ |
| NutritionImportService / ExportService | CSV/JSON |
| NutritionSyncService | الطابور والدمج |
| NutritionPrivacyService | المستويات، التصدير، الحذف |
| NutritionIntegrationService | Home/Sports/Habit/Today والموافقات |

### 17.2 مراحل البناء

| المرحلة | المحتوى | معيار الخروج |
| :---- | :---- | :---- |
| P0 | الأساس: إعدادات، وحدات، مصادقة، Outbox، Sync | NT-56..59,64 |
| P1 | أغذية + بحث عربي + سجل الأكل + الملخص اليومي | NT-01,03,09,11..18,26..29 |
| P2 | الوصفات والدفعات | NT-02,19..25,67 |
| P3 | الأهداف وأنواع الأيام والتحليلات | NT-05,30..38 |
| P4 | الماء والمكملات والنوافذ والتذكيرات | NT-04,39..40,54,55 |
| P5 | الخطة والمساعد | NT-41..44 |
| P6 | البقالة وتكامل Home | NT-06,45..51 |
| P7 | الخصوصية والعرض والتصدير/الحذف والاستيراد | NT-52,53,60..66,68 |
| P8 | Sports/Habit/Today/Travel + الصقل | NT-07,36 |

---

## 18) القرارات المفتوحة (ND) — بتوصيتي

| # | القرار | التوصية الافتراضية |
| :---- | :---- | :---- |
| ND-01 | مصدر الكتالوج الأولي | كتالوج فارغ + حزمة بداية بمصدر مرخّص يُتحقق منه |
| ND-02 | من يعدّ حزمة الأكلات المصرية | فريقك بمصدر مرخّص، والمستخدم يُكمل |
| ND-03 | هل تُرسل الأرقام لـSports | لا افتراضيًا (موافقة منفصلة) |
| ND-04 | `day_start_time` الافتراضي | 00:00 مع تلميح للتغيير |
| ND-05 | معاملات ترطيب المشروبات | يحدّدها المستخدم، لا افتراضات |
| ND-06 | ظهور المكملات في المجاميع | خيار لكل مكمل، افتراضي لا |
| ND-07 | الستريك | معطّل افتراضيًا |
| ND-08 | الاحتفاظ بالمحذوف | 30 يومًا |
| ND-09 | تسامح الالتزام | 10% قابل للضبط |
| ND-10 | حد أدنى للحارس (مشغّل) | فارغ حتى يراجعه مختص |
| ND-11 | وضع الاقتراحات (مساعد الخطة) | قواعد محلية من المفضلة والمتكرر، لا ذكاء خارجي |
| ND-12 | تسجيل بالصور بالذكاء الاصطناعي | مؤجل |
| ND-13 | إدخال صوتي | مؤجل |
| ND-14 | مزوّد باركود خارجي | مؤجل حتى التحقق من الشروط |
| ND-15 | ربط Spiritual (صيام) | مؤجل لـv4.1 |
| ND-16 | عرض kJ | إعداد فقط |
| ND-17 | حجم الكتالوج محليًا | مفضلة + أخيرة + حزمة بداية |
| ND-18 | مدة التراجع عن إعادة الحساب | 14 يومًا |
| ND-19 | مشاركة وجبة/وصفة مع أشخاص | مؤجل؛ يعتمد على Relationships |
| ND-20 | تسليم Home: إلى «مشتريات» أم «قائمة بقالة» | مشتريات `Needed` |
| ND-21 | فتح Core Search | معطّل |
| ND-22 | إظهار oz/lb | مخفية |
| ND-23 | قفل التطبيق افتراضيًا | معطّل مع اقتراح عند أول تسجيل |
| ND-24 | حد حجم الإدخال المعقول للوحدات | يضبطه المشغّل |

---

## 19) مصفوفة التغطية

| بند المصدر | أين في هذه الوثيقة |
| :---- | :---- |
| الأقسام 1–4 (الهدف، النطاق، الملكية، الفلسفة) | §1، §3 |
| Foods | §5.2–5.3، §6.3 |
| Recipes | §5.4، §6.5–6.7 |
| Meals | §5.5، §6.8 |
| Food Log Entries | §5.5، §6.4 |
| Goals | §5.6، §6.11–6.12 |
| Water Logs | §5.7، §6.14 |
| Meal Plans | §5.8 |
| Grocery Lists/Items | §5.9، §6.15–6.16 |
| Daily Summary / Analytics | §5.11، §6.9، §6.13 |
| الشاشات الـ12 | §10 |
| الأتمتة (7) | §12 (NA-01…16) |
| التكاملات (Sports/Home/Finance/Today) | §11 |
| الخدمات (11) | §17.1 |
| الـAPIs (9) | §11.9 |
| الاختبارات العشرة | §16 (NT-01…10) |
| قواعد التنفيذ المشتركة (10) | §3.4، §7.2 |
| الحدود الطبية | §3.5، §6.21، §10.6 |

---

## خلاصة

Nutrition OS هنا **قسم مستقل** يسجّل ويخطّط ويحلّل الأكل بدقة حسابية صارمة (لقطات، تقريب موحّد، أيام مكتملة فقط في المتوسطات) وبسلامة نفسية (لا أحكام، أرقام يمكن إخفاؤها، لا أهداف صحية مبرمجة). يتصل بـHome وSports وHabit وToday **بعقود اختيارية** ويتدهور بلا أي منها. **ما يحتاج منك:** القرارات ND-01، ND-02، ND-10، ND-15، وطلبات التغيير على Home وSports (§7.4)، والتحقق من ترخيص أي مصدر كتالوج قبل البناء.
