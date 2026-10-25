# 🛒 Personal Shopping & Wishlist OS — خطة العمل الموحّدة والكاملة (الإصدار 4.0)

**الغرض:** وثيقة بناء **مكتفية بذاتها** لتطبيق **قرار الشراء الشخصي** (ويب + موبايل، عربي RTL، يعمل أوفلاين كاملًا): ماذا أريد؟ هل أحتاجه فعلًا؟ بكم؟ هل السعر مناسب الآن؟ هل عندي بديل؟ هل أقدر ماليًا؟ ثم الشراء، ثم «هل ندمت؟». يعمل **كقسم مستقل تمامًا**، ومرتبط بأنظمتك (Finance، Inventory، Home، Relationships، Travel، Today، Core) عبر **عقود API/Events فقط** — بلا جداول مشتركة ولا نسخ كيانات. نفس فلسفة وثائق Learning وFinance وNutrition وInventory ونفس هيكلها، بما يناسب طبيعة التسوّق: **قرار قبل الإنفاق، أسعار تتغير، دفعة واحدة لا تتكرر، ومنتج يتحول إلى ممتلك**.

> **هذه الوثيقة تحلّ محلّ الملفين السابقين بالكامل** (`PERSONAL_SHOPPING_WISHLIST_OS_Independent_Build_Spec.md` EN و`PERSONAL_SHOPPING_WISHLIST_OS_وثيقة_البناء_المستقلة_العربية.md` AR). كل بند فيهما موجود هنا (انظر **مصفوفة التغطية في §19**) مع حسم التعارضات وسد الفجوات. لا يُرسَل الملفان القديمان لمنفّذ التطبيق.

**ما دخل في المراجعة:**

1. مواصفتا المصدر (EN + AR): 19 قسمًا + «قواعد التنفيذ المشتركة» (9 قواعد).
2. **Notion (قراءة فقط):** وجدت **🛒 Wishlist and Shopping** (قالب داخل «Traveling») و**🛒 Home Shopping** (داخل HOME HUB OS) وصفحة «Skincare Wishlist» (§1.2).
3. وثائق **Finance OS v4.1** (عقد `from-source`) و**Home OS v4.0** و**Personal Inventory OS v4.0** (عقد `from-source` للملكية، أُنتج في هذه السلسلة) و**Nutrition OS v4.0** كقالب.
4. **القرارات المشتركة CX-01…CX-22** (ملزمة).

**المرجع الأعلى عند التعارض:** هذه الوثيقة ← سلوك Notion الفعلي ← مواصفتا المصدر.

> **تنبيه أمانة:** هذه الوثيقة **أداة قرار وتنظيم** وليست نصيحة مالية أو استثمارية أو استهلاكية. «التوقيت» و«الدرجة» و«الملاءمة للميزانية» **مؤشرات شفافة قابلة للضبط** يشرح التطبيق مكوّناتها، والقرار دائمًا لك. لا scraping ولا ادعاء بتتبع أسعار آلي من متاجر بعينها (CX-22): أي مزوّد أسعار/متجر غير مفحوص موسوم **«غير مؤكد — يُتحقق قبل البناء»**.

> **مفاتيح القراءة:** `SF` ميزة محفوظة من المصدر · `SC` تعارض محسوم · `SG` فجوة مسدودة · `SE` تحسين مضاف · `SD` قرار يحتاج تأكيدك (بتوصية افتراضية) · `SV` قاعدة تحقق · `SA` أتمتة · `ST` اختبار قبول. (الحرف **S** = Shopping، حسب CX-18.) و`CX-xx` = القرارات المشتركة.

---

## 1) مراجعة المصدر وحكم على كل عنصر

### 1.1 ما الذي يقوله المصدر (ملخص أمين)

المصدر نظام **قرار شراء** من 10 شاشات و9 خدمات و7 مجموعات API، سلسلته: **Capture → Research → Compare → Decide → Plan → Buy → Own → Review**. كياناته: Wishlist Items، Products، Price Observations، Purchase Decisions، Alternatives، Planned Purchases، Purchases، Ownership References. قوته: **السعر الحالي مشتق من آخر ملاحظة** (لا نص في المنتج)، **الملاحظات التاريخية لا تتغير**، **القرار لا يشتري**، **Purchase ← معاملة Finance واحدة كحد أقصى**، و**الملكية مرجع لا نسخة** (Inventory/Home).

لكنه مختصر، ويترك فجوات كبيرة (متاجر متعددة للمنتج الواحد، عملات، مواصفات قابلة للمقارنة، شراء بعدة بنود، أقساط، مرتجعات، هدايا، فترة تهدئة، أسعار بلا scraping، أوفلاين) وفيه تعارضات داخلية (§7).

### 1.2 نتيجة فحص Notion (قراءة فقط — لم يُعدَّل شيء)

| ما وُجد | المسار | ماذا يحوي (حسب المخطط) | الحكم |
| :---- | :---- | :---- | :---- |
| **🛒 Wishlist and Shopping** (قاعدة، قالب) | Damen's / Home / Personal Growth / Traveling | `Name`, `Wishlist and Shopping` (⏲️ Wishlist / 📮 Shopping)، `Shopping Types` (**للمَن**: 8 اختيارات تسميات أشخاص/فئات: Family، Mom، Dad، أسماء، My Self، Other)، `EG Price`, `USD Price`, `Qty`, `URL`, `Website` (Ebay/Amazon/B&H)، `Status` (Not started / IN FUTURE / FIRST / SOON / TO BUY / Done)، `Reason` (متعدد، **بلا خيارات**)، `Date`، `Select` (بلا خيارات) | **هذا أقرب أصل لنظامنا**: `Wishlist` ← عنصر رغبة، `Shopping` ← قرار شراء/مخطط. `Shopping Types` تُرحَّل كـ**«لمن؟» (مستلم/غرض)** لا كأشخاص (CX-01؛ §15.2). `Status` سلّم أولوية/توقيت يُحوَّل بجدول موافقتك. القاعدة نسخة قالب قديمة (2024) وقد تكون فارغة |
| **🛒 Home Shopping** | HOME HUB OS | `Item`, `Category` (Food, Groceries, Cleaning, Household, Maintenance, Electronics, Furniture, Other)، `Status` (To Buy/Purchased/Cancelled)، `Priority`, `Estimated Price`, `Actual Price`, `Quantity`, `Unit`, `Store`, `Shopping Date`, `Finance Synced`, علاقات: `Financial Transaction`, `Inventory Item`, `Room`, `Maintenance Issue` | **ملك Home** (مشتريات المنزل: مستهلكات وصيانة) (CX-05). لا يُرحَّل. لكن يمكن للمستخدم تحديد صفوف **معمَّرة** (Electronics/Furniture) كاختيار يدوي لتصير قرارات هنا (§15.2) |
| **Skincare Wishlist** | Damen's / Home / Beautycare | صفحة قائمة رغبات | لم تُفحَص صفوفها؛ تُستورد يدويًا/CSV إن رغبت |
| **🏋️ نظام اللياقة بتاعي** (قائمة مشتريات تدريب ضمن صفحات التمرين) | الجذر | نصيحة شراء أدوات (Resistance Bands…) داخل محتوى | **ملك Sports/محتوى**؛ تُلتقط كأفكار رغبة يدويًا |

> **الخلاصة:** يوجد أصل قديم صغير (Wishlist and Shopping) يُرحَّل **اختياريًا بقرارك** (§15.2). لا توجد بيانات أسعار تاريخية أو قرارات أو مشتريات مسجّلة. لم أفحص **صفوف** القواعد.

### 1.3 حكم على كل عنصر في المصدر

| # | عنصر المصدر | الحكم | ما يحدث له | أين |
| :---- | :---- | :---- | :---- | :---- |
| 1 | السلسلة: Capture → … → Review | **اعتماد** | تُنفَّذ كمراحل؛ + «Inbox» قبل Capture و«Return» بعد Own | §4 |
| 2 | الملكية: Finance يملك الدفع، Inventory/Home الملكية | **اعتماد + عقود** | Saga من 3 خطوات مستقلة | §6.13، CX-05 |
| 3 | الشاشات الـ10 | **اعتماد + إضافة** | +Inbox، +Returns، +Gifts view، +Reviews، +Sale Events | §10 |
| 4 | Wishlist Items (12 حقلًا) | **اعتماد + تفكيك** | حالة مقيّدة + أغراض (لي/هدية/للرحلة) + وسوم | §5.2، SC-01..03 |
| 5 | Need Level (Need/Want) | **اعتماد + تعريف** | يدخل الدرجة؛ لا حكم أخلاقي على «Want» | §6.8، §3.5 |
| 6 | Status (7 قيم) | **إعادة تعريف** | مراحل مبكرة يدوية، Planned/Bought مشتقان | SC-02، §6.17 |
| 7 | Products (`merchant`, `url`, `current_price`) | **تفكيك** | منتج ← عروض (Offers) متعددة لمتاجر ← ملاحظات | §5.3، SC-05 |
| 8 | `current_price[Derived]` | **اعتماد** | مشتق من آخر ملاحظة صالحة | §6.2 |
| 9 | `specifications` | **تنظيم** | جدول مواصفات (مفتاح/قيمة/وحدة) لتمكين المقارنة | §5.3، §6.10 |
| 10 | `warranty` على المنتج | **معلومة فقط** | `warranty_months` تمرَّر لـInventory (CX-06) | SC-30 |
| 11 | Price Observations | **اعتماد + Append-only** | لا تعديل؛ التصحيح بملاحظة تصحيح | §5.4، SC-06 |
| 12 | «لا تخزن history داخل Product كنص» | **اعتماد** | | §5.4 |
| 13 | Purchase Decisions (Buy/Wait/Reject/Replace) | **اعتماد + سجل** | سجل Append-only؛ الأحدث هو الساري | §5.5، SC-09 |
| 14 | `score`, `reasons`, `budget_fit` | **تعريف شفاف** | درجة بمكوّنات وأوزان قابلة للضبط | §6.8 |
| 15 | «Decision لا يشتري» | **اعتماد** | | §6.13، ST-04 |
| 16 | Alternatives (rank, pros, cons, selected) | **اعتماد** | + ربط بالمقارنة | §5.5 |
| 17 | Planned Purchases (+ `funding_goal_id`) | **اعتماد + مرجع** | `finance_goal_ref` بلا FK (CX-11) | §5.6 |
| 18 | Purchases (منتج واحد) | **توسعة** | عدة بنود + عدة دفعات | §5.7، SC-12 |
| 19 | «معاملة Finance واحدة كحد أقصى» | **اعتماد + تدقيق** | **واحدة لكل دفعة حقيقية** (أقساط/استرداد) | SC-13، §6.13 |
| 20 | `ownership_record_id` | **تحويل** | `ownership_ref` (Inventory/Home) بلا FK | SC-14 |
| 21 | `receipt` | **تحويل** | `file_ref` (Core Files) | §5.7 |
| 22 | Ownership Reference (لا نسخ) | **اعتماد** | | §5.7 |
| 23 | قرار الشراء: 8 عناصر معروضة | **اعتماد + تفصيل** | كلها في بطاقة قرار | §10.3 |
| 24 | Good/Neutral/Poor Time | **اعتماد + تعريف** | بالنسبة المئوية لتاريخك السعري؛ «غير معروف» عند قلة البيانات | §6.5 |
| 25 | Compare 2–5 منتجات | **اعتماد + مصفوفة** | | §6.10 |
| 26 | الأتمتة (8) | **اعتماد + إضافات** | Idempotent بمفاتيح | §12 |
| 27 | التكاملات (6) | **عقود** | Finance/Inventory/Home/Travel/Goals/Today + Relationships | §11 |
| 28 | الخدمات (9) | **توسعة** | | §17.1 |
| 29 | الـAPIs (7) | **توسعة** | قائمة كاملة بأخطائها | §11.9 |
| 30 | الحالات الحدّية (8) | **حسم كل واحدة** | SC-15..22 | §7 |
| 31 | الاختبارات العشرة | **توسعة** | ≥ 60 | §16 |
| 32 | قواعد التنفيذ المشتركة (9) | **اعتماد + تسوية 5 تناقضات** | §3.4 | §3.4 |

---

## 2) جرد الميزات المحفوظة (SF — كلها)

| ID | الميزة / القاعدة (من المصدر) | أين |
| :---- | :---- | :---- |
| SF-01 | سلسلة Capture → Research → Compare → Decide → Plan → Buy → Own → Review | §4 |
| SF-02 | يملك: Wishlist Items, Products, Price Observations, Purchase Decisions, Alternatives, Planned Purchases, Purchases, Ownership References | §3.2 |
| SF-03 | Finance يملك الدفع الفعلي | §11.3 |
| SF-04 | Personal/Home Inventory يملكان الملكية الفعلية | §11.2، §11.4 |
| SF-05 | الشاشات: Shopping Home, Wishlist, Product Detail, Compare, Price History, Purchase Planner, Purchases, Ownership, Categories, Settings | §10 |
| SF-06 | Wishlist: id, user_id, title, category_id, reason, need_level, priority, desired_by_date, status, estimated_price, currency, notes | §5.2 |
| SF-07 | Need Level: Need/Want | §5.2، §6.8 |
| SF-08 | Wishlist Status: Idea/Researching/Watching/Planned/Bought/Rejected/Archived | §6.17 |
| SF-09 | Products: name, brand, model, category_id, variant, merchant, url, current_price, currency, rating, specifications, image, warranty, notes | §5.3 |
| SF-10 | `current_price` مشتق | §6.2 |
| SF-11 | Price Observations: product_id, observed_at, price, currency, merchant, availability, url, source | §5.4 |
| SF-12 | **لا history داخل Product كنص؛ السعر الحالي = آخر observation صالح** | §6.2 |
| SF-13 | Purchase Decisions: wishlist_item_id, decision, score, reasons, budget_fit, need_level, alternatives_considered, decided_at, notes | §5.5 |
| SF-14 | Decision: Buy/Wait/Reject/Replace | §5.5 |
| SF-15 | **Decision لا يشتري فعليًا** | §6.13 |
| SF-16 | Alternatives: wishlist_item_id, product_id, rank, reason, pros, cons, selected | §5.5 |
| SF-17 | Planned Purchases: wishlist_item_id, target_date, budget, currency, funding_goal_id, status, reminder_at, notes | §5.6 |
| SF-18 | Purchases: wishlist_item_id, product_id, purchased_at, quantity, total_amount, currency, merchant, finance_transaction_id, ownership_record_id, receipt, notes | §5.7 |
| SF-19 | **Purchase الفعلي ← معاملة Finance واحدة كحد أقصى** | §6.13 |
| SF-20 | Ownership Reference: ربط Inventory/Home بدل نسخ السجل | §5.7 |
| SF-21 | عرض القرار: Need/Want، Priority، Budget Fit، Current Price، Historical Price، Alternatives، Existing Equivalent، Timing | §10.3 |
| SF-22 | Timing: Good Time / Neutral / Poor Time | §6.5 |
| SF-23 | **أداة قرار وليست نصيحة مالية** | §3.5 |
| SF-24 | Compare: 2–5 منتجات: السعر، التاريخ السعري، المواصفات، الضمان، المتجر، التوافر، المزايا والعيوب | §6.10 |
| SF-25 | أتمتة: تتبع/استيراد الأسعار | SA-01 |
| SF-26 | أتمتة: تنبيه انخفاض السعر | SA-02 |
| SF-27 | أتمتة: تذكير الشراء المخطط | SA-03 |
| SF-28 | أتمتة: تذكير الضمان | SA-04 (يُعاد تعريفه، CX-06) |
| SF-29 | أتمتة: كشف التكرار | SA-05 |
| SF-30 | أتمتة: purchase → Finance | SA-06 |
| SF-31 | أتمتة: purchase → Inventory | SA-07 |
| SF-32 | أتمتة: مراجعة ما بعد الشراء | SA-08 |
| SF-33 | تكاملات: Finance, Personal Inventory, Home Inventory, Travel, Goals, Today | §11 |
| SF-34 | الخدمات التسع (Wishlist, Product, PriceTracking, Decision, Alternative, PurchasePlanner, Purchase, ShoppingRecommendation, ShoppingFinanceIntegration) | §17.1 |
| SF-35 | الـAPIs السبع (wishlist, products, prices, decisions, planned-purchases, purchases, compare) | §11.9 |
| SF-36 | حالة حدّية: لا سعر حالي | §6.2 |
| SF-37 | حالة حدّية: تغيّر عملة السعر | §6.3 |
| SF-38 | حالة حدّية: رابط منتج مكرر | §6.11 |
| SF-39 | حالة حدّية: قرار تغيّر بعد الشراء | §5.5 |
| SF-40 | حالة حدّية: إعادة محاولة الشراء | §6.13 |
| SF-41 | حالة حدّية: منتج تُخُلِّص منه | §5.7 |
| SF-42 | حالة حدّية: مكافئ مملوك موجود | §6.7 |
| SF-43 | حالة حدّية: منتج مؤرشف بتاريخ | §9.1 |
| SF-44 | الاختبارات العشرة | §16 (ST-01…ST-10) |
| SF-45 | `id, user_id, created_at, updated_at` لكل كيان رئيسي | §5.0 |
| SF-46 | التحقق من المستخدم على الخادم | §14.2 |
| SF-47 | العلاقات FK حقيقية | §3.4، SC-23 |
| SF-48 | Derived لا تُحرَّر | §3.4 |
| SF-49 | Validation واجهة+خادم | §9.2 |
| SF-50 | كل شاشة: Loading/Empty/Error/Success (+Offline) | §10.2 |
| SF-51 | Automation Idempotent بسجل | §12 |
| SF-52 | لا تكرر كيانًا يملكه غيرك | §3.2 |
| SF-53 | timezone المستخدم | §6.1 |
| SF-54 | Migration آمنة | §15 |

---

## 3) المبادئ والحدود بين الأقسام

### 3.1 الاستقلال
Shopping تطبيق/قسم **قائم بذاته**: قاعدته وخدماته وواجهته وأوفلاينه. كل ما يخص غيره (مال، ملكية، أشخاص، منزل، رحلة) عبر **مراجع `*_ref` وعقود/أحداث**. يعمل كاملًا لو غابت **كل** الأقسام الأخرى (§3.3).

### 3.2 من يملك ماذا

| الشيء | المالك | موقف Shopping |
| :---- | :---- | :---- |
| الرغبة، المنتج المرشَّح، الأسعار الملاحَظة، القرار، البدائل، الخطة، الشراء كقرار وسجل | **Shopping** | يملكها كاملة |
| الدفع والمعاملة والأقساط والاسترداد | **Finance** (CX-03) | `shopping_finance_links` Cache + مرجع؛ لا حقول دفع |
| ادخار شراء/تمويل | **Finance Goals** (CX-11) | `finance_goal_ref` للقراءة |
| الميزانية والتصنيف المالي | **Finance** | قراءة `budget_fit` فقط |
| الملكية بعد الشراء (شخصي) | **Inventory** | `ownership_ref`؛ الضمان هناك (CX-06) |
| الملكية (منزلي معمَّر) | **Home** (CX-04/05) | `ownership_ref` (طلب `from-source`) |
| مشتريات المنزل الدورية (مستهلكات، صيانة، بقالة) | **Home** (CX-05) | **لا يتولاها**؛ يحوّل المستخدم إليها |
| الشخص (مستلم الهدية، مصدر التوصية) | **Relationships** (CX-01) | `person_ref` + اسم Snapshot |
| سجل الهدايا والمناسبات | **Relationships** | Shopping يملك **الشراء**، وهي تحمل `shopping_purchase_ref` (SC-31) |
| الرحلة وما يلزمها | **Travel** (CX-20) | `trip_ref` اختياري؛ لا يملك الرحلة |
| الملفات (إيصال، صور) | **Core Files** (CX-07) | `file_ref` |
| تسعير الأصول المالية | **Finance PriceService** | **منفصل تمامًا** عن أسعار المنتجات هنا (CX-21) |

### 3.3 مصفوفة التدهور (عند غياب نظام مرتبط)

| الغائب | ما يحدث في Shopping |
| :---- | :---- |
| Finance | لا ملاءمة ميزانية (`Unknown`)، لا ربط دفع (`Not Required`)، الإجمالي يدوي، الادخار نصي |
| Inventory | لا «مكافئ مملوك» من Inventory (يُستعاض بسجل مشترياتي هنا)، لا إنشاء ملكية؛ يبقى «سجّل الملكية لاحقًا» |
| Home | شراء بملكية منزلية يُسجَّل مرجعًا نصيًا |
| Relationships | المستلم نص حر |
| Travel | لا `trip_ref` |
| Core Files/Notifications/Today | مرفقات معطلة / تنبيهات داخلية فقط |
| الإنترنت | كل شيء يعمل محليًا (§13)؛ لا جلب أسعار أصلًا (لا scraping) |

### 3.4 المبادئ الحاكمة (ملزمة) وتسوية «قواعد التنفيذ المشتركة»

1. **القرار قبل الإنفاق، والقرار ليس شراء.** لا يوجد مسار آلي من «قرار» إلى «دفع».
2. **الشفافية:** كل درجة/توقيت/ملاءمة لها مكوّنات معروضة وقابلة للضبط.
3. **التاريخ لا يُعدَّل:** الملاحظات والقرارات والمشتريات سجلات Append-only؛ التصحيح بسجل جديد.
4. **المجهول ليس صفرًا:** سعر غير معروف ≠ مجاني؛ مكوّن غير معروف يُستبعد من الدرجة ويُنبَّه.
5. **دفعة حقيقية = معاملة Finance واحدة** (idempotency).
6. **لا ضغط ولا لوم:** لا «فرصة أخيرة»، لا عدّادات ندرة، ولا حكم على «Want».
7. **لا scraping** افتراضيًا: الأسعار يدوية/استيراد/مشاركة رابط؛ الجلب الآلي قرار مفتوح (SD).
8. **لا تكلفة خفية:** لا إنفاق ولا إرسال بيانات خارجية بلا فعل صريح.
9. **الخصوصية:** قوائم الهدايا والمبالغ حساسة؛ إشعارات محايدة.
10. **سرعة الالتقاط:** إضافة رغبة بحقل واحد (عنوان) أو بمشاركة رابط.

**تسوية التناقضات الخمسة في «قواعد التنفيذ المشتركة»:**

| # | التناقض | الحل |
| :---- | :---- | :---- |
| 1 | «FK حقيقية» ↔ «لا تكرر كيانًا» | FK داخل Shopping؛ عبر الأقسام `ref + snapshot + state` (CX-02) → SC-23 |
| 2 | «المشتق لا يُحرَّر» ↔ كيانات «مملوكة» مشتقة | السعر الحالي/الدرجة/التوقيت Cache قابل لإعادة البناء → SC-24 |
| 3 | «توقيت المستخدم» ↔ السفر | Shopping على توقيت المستخدم؛ ملاحظات السعر بـUTC + `observed_on` محلي → SC-25 |
| 4 | `user_id` على الرئيسي ↔ التابع | التابعة تكرر `user_id` + FK مركّب → SC-26 |
| 5 | Migration ↔ بيانات قديمة | قالب Notion اختياري + CSV بـDry-run → SC-27 |

### 3.5 الخصوصية والصياغة

- **قوائم الهدايا والميزانيات حساسة** (CX-16): Tier لكل رغبة/هدية؛ لا تظهر في بحث عام أو إشعارات بالاسم.
- **لا نصائح مالية:** لا «اشترِ الآن»، لا «وفّر كذا». تُستخدم عبارات: «السعر الحالي أقل من 80% من ملاحظاتك السابقة».
- **لا حكم على الرغبة:** `Want` ليس خطأ. الدرجة تقيس **الملاءمة للمعايير التي ضبطتها أنت**.
- **التسويق والضغط:** لا نصوص ندرة/عدّ تنازلي مستعارة من المتاجر؛ التنبيهات تذكر السعر وتاريخ ملاحظته فقط.
- قانون حماية البيانات الشخصية المصري رقم 151 لسنة 2020 مرجع عام — **ليس استشارة قانونية**.

---

## 4) النموذج المفاهيمي

### 4.1 الخريطة

```text
 Inbox (اقتراحات واردة: رابط/Inventory/Travel)
        │ قبول
        ▼
  Wishlist Item ──< Alternatives >── Product ──< Offers (متجر+رابط) ──< Price Observations
     │   │                            │  └─< Specs (مفتاح/قيمة)
     │   └─ Decisions (سجل)           └─ Images
     ▼
  Planned Purchase ──(مرجع)── Finance Goal
     ▼
  Purchase ──< Lines ──< Ownership Refs ──▶ Inventory / Home
     │  └──< Payments ──< Finance Links ──▶ Finance
     ├──< Returns ──▶ (استرداد في Finance)
     └──  Review (ما بعد الشراء)

 مشتق: السعر الحالي · أدنى سعر · التوقيت · ملاءمة الميزانية · الدرجة · حالة الرغبة (Planned/Bought)
 مراجع بلا FK: finance_goal_ref · person_ref · inventory_item_ref · home_item_ref · trip_ref · file_ref
```

### 4.2 المفاهيم بلغة بسيطة

- **الرغبة (Wishlist Item):** «أريد شيئًا ما» — قد تكون فكرة بلا منتج محدد.
- **المنتج (Product):** مرشَّح محدد (ماركة وموديل ومواصفات). الرغبة الواحدة قد يكون لها عدة منتجات مرشَّحة (بدائل).
- **العرض (Offer):** المنتج عند متجر برابط. هو الذي له أسعار.
- **ملاحظة السعر (Price Observation):** «رأيت هذا السعر في هذا المتجر في هذا اليوم». لا تتغير.
- **القرار (Decision):** سجل بما قررته (اشترِ/انتظر/ارفض/استبدل) مع الدرجة وقت اتخاذه. **لا يشتري**.
- **الخطة (Planned Purchase):** «سأشتريه حوالي… بميزانية…».
- **الشراء (Purchase):** ما حدث فعلًا: بنود، مبلغ، متجر، إيصال. له دفعات تُسجَّل في Finance.
- **المرجع الملكي:** بعد الشراء يُنشأ الشيء في Inventory/Home؛ نحتفظ بمرجعه فقط.

### 4.3 رحلات رئيسية

**أ) من فكرة إلى شراء:** «سماعات جديدة» (Idea) ← أضف منتجين ← سجّل أسعارًا من متجرين ← قارن ← بطاقة القرار (درجة 74، توقيت Good، ملاءمة Within، عندك سماعات قديمة Inventory) ← قرار «Buy» ← خطة بميزانية وتاريخ وهدف ادخار ← تشتري ← «سجّل الشراء» ← يُنشأ ربط Finance مرة واحدة + إنشاء الشيء في Inventory مرة واحدة ← بعد 30 يومًا: «هل تشتريه ثانية؟».

**ب) هدية:** رغبة بغرض Gift لـ«أحمد» (اسم/`person_ref`) ومناسبة (اختياري) ← قرار وشراء عاديان ← الملكية: لا (الهدية تخرج) ← Relationships تحمل `shopping_purchase_ref` لسجل الهدية (بلا دفع مكرر).

**ج) اقتراح استبدال من Inventory:** Inventory يرسل «قد تحتاج بديلًا للابتوب» ← يصل Inbox ← تقبل ← رغبة مرتبطة `inventory_item_ref` وقرار «Replace» ← عند الشراء يُبلَّغ Inventory بالجديد والقرار في القديم.

**د) مرتجع:** بعد الشراء ← «إرجاع» ← سبب وموعد ← الحالة ← عند الاسترداد: عملية استرداد في Finance + إبلاغ Inventory (`shopping.purchase.refunded`) ليقترح التخلص/الإرجاع.

**هـ) مراقبة سعر:** رغبة Watching ← سعر مستهدف (يدخله المستخدم) ← كل ملاحظة جديدة تُقيَّم ← تنبيه واحد عند عبور العتبة (بتاريخ ملاحظتك لا ادّعاء حيّ).

---
## 5) نموذج البيانات الكامل

### 5.0 الحقول العامة والقواعد

**كل كيان رئيسي:** `id` UUID · `user_id` NOT NULL (من الجلسة لا من الطلب) · `created_at` · `updated_at` · `deleted_at` (حذف ناعم حيث ينطبق) · `version` int · `is_demo` bool. **التابعة:** تكرر `user_id` + `FOREIGN KEY (parent_id, user_id)` + `UNIQUE(id, user_id)` على الرئيسي (SC-26).

| القاعدة | التفصيل |
| :---- | :---- |
| المبالغ | `DECIMAL(14,2)` (نصوص في JSON) + `currency` ISO-4217؛ ممنوع float. الأسعار الصغيرة جدًا (سعر الوحدة) `DECIMAL(14,4)` |
| العملات | لكل سعر عملته. لا جمع بين عملتين إلا عبر سعر صرف من Finance (قراءة) أو سعر يدوي مجمَّد (CX-14) |
| التواريخ | ملاحظات السعر: `observed_at` UTC + `observed_on` (DATE محلي مخزَّن) |
| المراجع الخارجية (CX-02) | `*_ref_system/type/id` + `*_ref_snapshot` + `*_ref_state {Valid|Missing|NoAccess}` بلا FK |
| الحساسية | `privacy_tier {Normal|Sensitive|Secret}` على الرغبات/المشتريات/الهدايا |
| Append-only | `price_observations`, `decisions`, `purchase_events`, `finance_links.attempts` — لا UPDATE/DELETE على مستوى الصلاحيات (التصحيح بسجل جديد) |

### 5.1 الإعدادات والقوائم

**`shopping_settings`** (صف/مستخدم):

| الحقل | النوع | افتراضي | ملاحظات |
| :---- | :---- | :---- | :---- |
| default_currency / timezone | | من الحساب | |
| price_stale_days | int | 14 | بعده تُوسَم الملاحظة «قديمة» (§6.2) |
| timing_min_observations | int | 3 | الحد الأدنى لحساب التوقيت |
| timing_min_span_days | int | 14 | |
| timing_good_pct / timing_poor_pct | decimal | 25 / 75 | عتبتا النسبة المئوية (§6.5) |
| budget_tight_ratio | decimal | 0.70 | ≥ هذا من المتبقي = «Tight» (§6.6) |
| score_weights | jsonb | انظر §6.8 | قابلة للضبط |
| score_lean_buy / score_lean_wait | int | 70 / 40 | عتبات صياغة الميل |
| cooling_off_enabled | bool | false | |
| cooling_off_threshold_amount | decimal | null | فوق هذا المبلغ تُفعَّل التهدئة |
| cooling_off_days_default | int | 3 | |
| review_after_days | int | 30 | مراجعة ما بعد الشراء (SA-08) |
| existing_equivalent_check | bool | true | |
| outbound_events | jsonb | حسب §11.8 | |
| integrations | jsonb | `{finance,inventory,home,relationships,travel: {enabled:false}}` | |
| mask_amounts | bool | false | إخفاء المبالغ |
| quiet_hours / daily_notification_cap | | يرث Core / 4 | |
| numerals | enum | Latin | |
| search_index_optin | bool | false | Core Search (SD-08) |

**`shopping_categories`**: `id, user_id, parent_id (عمق ≤ 3), name, name_norm, kind {Electronics|Fashion|HomeDurable|Books|Beauty|Sports|Gift|Digital|Other}, ownership_target_default {Inventory|Home|None|Gift}, cooling_off_days (يتجاوز العام), finance_budget_ref (ref لفئة ميزانية Finance، اختياري), icon, position, status {Active|Archived}`. `UNIQUE(user_id, parent_id, name_norm)`. بذور اقتراحية عند Onboarding فقط. **`kind=Household consumable` غير موجود عمدًا** (يخص Home — SC-18).

**`shopping_merchants`** (المتاجر): `id, user_id, name, name_norm, domain, country, currency_default, return_window_days (يدخله المستخدم؛ لا قيم مبرمجة), warranty_note, type {Online|Physical|Marketplace|Person}, note, status`. `UNIQUE(user_id, name_norm)`.

**`shopping_spec_defs`** (تعريفات المواصفات القابلة للمقارنة): `id, user_id, category_id|NULL, key (slug), label, value_type {Number|Text|Bool|Enum}, unit, higher_is_better {Yes|No|Neutral}, position`. تُستخدم لتمييز «الأفضل» في المقارنة (§6.10). بلا قيم افتراضية مبرمجة عدا بذور اقتراحية قابلة للحذف.

**`shopping_sale_events`** (مواسم/عروض **يعرّفها المستخدم**): `id, user_id, name, start_date, end_date, recurrence {None|Yearly}, calendar_system {gregorian|hijri}, day_offset (±1), note, status`. لا قائمة مواسم مبرمجة (CX-22). تستعمل في تلميح «بعد 12 يومًا موسم أضفته».

### 5.2 الرغبات (Wishlist Items)

**`shopping_wishlist_items`**:

| الحقل | النوع | إلزامي | قيد | ملاحظة |
| :---- | :---- | :---- | :---- | :---- |
| id / user_id | | نعم | `UNIQUE(id,user_id)` | |
| title / title_norm | string(200) | نعم | غير فارغ | |
| purpose | enum | نعم | `ForMe|Gift|ForHome|ForTrip|ForWork` | SC-03؛ `ForHome` للمعمَّر فقط (SC-18) |
| category_id | FK | لا | | |
| reason | text | لا | ≤ 500 | لماذا أريده |
| need_level | enum | نعم | `Need|Want|Unsure` | `Unsure` افتراضي عند الالتقاط السريع |
| priority | enum | نعم | `High|Medium|Low` | |
| desired_by_date | date | لا | | |
| status | enum | نعم | `Idea|Researching|Watching|Planned|Bought|Rejected|Archived` | قيود الانتقال §6.17 |
| status_source | enum | نظام | `User|Auto` | |
| estimated_price / estimated_price_currency | decimal/char | لا | ≥0 | تقدير المستخدم |
| target_price | decimal | لا | ≥0 | سعر يستهدفه للتنبيه (§6.4) |
| quantity | decimal(8,2) | لا | >0 | افتراضي 1 |
| recipient_person_ref + recipient_name | ref/string | لـGift | CX-01 | الاسم Snapshot إلزامي لـGift |
| occasion_ref | ref triple | لا | | مناسبة من Relationships |
| trip_ref | ref triple | لـForTrip | | (CX-20) |
| inventory_item_ref | ref triple | لا | | الشيء المراد استبداله/ما عندي (SC-20) |
| finance_goal_ref | ref triple | لا | | ادخار مخصص (CX-11) |
| source_kind | enum | نظام | `Manual|SharedLink|InboxInventory|InboxTravel|Import|NotionImport` | |
| source_key | string | لا | `UNIQUE(user_id, source_key)` | Idempotency للاقتراحات الواردة |
| privacy_tier | enum | نعم | | `Gift` ← Sensitive افتراضيًا |
| image_file_ref | file_ref | لا | | |
| notes | text | لا | | |
| derived_*: current_best_price, timing, budget_fit, score, has_equivalent | | مشتق | | **Cache** (§6) |
| archived_at | timestamptz | لا | | الأرشفة تُوقف التنبيهات (ST-10) |

**`shopping_wishlist_tags`**: `item_id, user_id, tag (≤40)`. **`shopping_wishlist_links`** (روابط مرجعية للفكرة قبل المنتج): `item_id, url, title, added_at`.

### 5.3 المنتجات والعروض والمواصفات

**`shopping_products`**:

| الحقل | النوع | إلزامي | ملاحظة |
| :---- | :---- | :---- | :---- |
| id / user_id | | نعم | |
| name / name_norm | string | نعم | |
| brand / model / variant | string | لا | `UNIQUE` جزئي `(user_id, brand_norm, model_norm, variant_norm)` تحذير (§6.11) |
| category_id | FK | لا | |
| rating_user | smallint 1–5 | لا | تقييم المستخدم (ليس منقولًا من متجر) |
| rating_note | string | لا | «4.5 على متجر X بتاريخ…» نص حر |
| warranty_months | smallint | لا | **معلومة مواصفات فقط** (CX-06) |
| image_file_ref | file_ref | لا | |
| current_best_price / currency / merchant | | مشتق | **Cache** (§6.3) |
| status | enum | نعم | `Active|Archived|Discontinued` |
| notes | text | لا | |

**`shopping_product_offers`** (المنتج عند متجر — يحل `merchant` و`url` الوحيدين، SC-05):

| الحقل | النوع | قيد | ملاحظة |
| :---- | :---- | :---- | :---- |
| id / user_id / product_id | | FK مركّب | |
| merchant_id | FK | لا | |
| merchant_name_snapshot | string | | |
| url / url_norm / url_hash | text/text/string | `UNIQUE(user_id, url_hash) WHERE url IS NOT NULL` | تطبيع §6.11 |
| currency | char(3) | نعم | عملة هذا العرض |
| availability | enum | | `InStock|OutOfStock|Preorder|Unknown` (آخر ملاحظة) |
| is_primary | bool | | |
| last_price / last_observed_at | | مشتق | **Cache** |
| status | enum | | `Active|Dead|Archived` (رابط ميت) |

**`shopping_product_specs`**: `id, user_id, product_id, spec_def_id|NULL, key, label, value_text, value_num decimal, value_bool, unit, source_note`. `UNIQUE(product_id, key)`. **`shopping_product_images`**: `product_id, file_ref, position`.

### 5.4 ملاحظات الأسعار والتنبيهات

**`shopping_price_observations`** (**Append-only**):

| الحقل | النوع | إلزامي | قيد | ملاحظة |
| :---- | :---- | :---- | :---- | :---- |
| id / user_id | | نعم | | |
| offer_id | FK | نعم | | المنتج يُستنتج من العرض (`product_id` مكرر للفهرسة) |
| product_id | FK | نعم | | |
| observed_at | timestamptz | نعم | ≤ الآن + 1 دقيقة | |
| observed_on | date | نظام | | محلي مخزَّن |
| price | decimal(14,2) | نعم | ≥ 0 | السعر وقت الملاحظة (مع الخصم إن كان معروضًا) |
| list_price | decimal | لا | ≥ price | السعر قبل الخصم المعروض (للمعلومة؛ **لا يُستخدم في الحساب**) |
| currency | char(3) | نعم | | |
| availability | enum | لا | | |
| shipping_cost | decimal | لا | ≥0 | يُدخَل اختياريًا (§6.3) |
| source | enum | نعم | `Manual|QuickCapture|SharedLink|CsvImport|Receipt|Provider` | `Provider` = مزوّد مرخّص مستقبلًا (SD-02) |
| is_valid | bool | نظام | | صالح للحساب (التصحيح يُبطل بإضافة سجل `correction_of`) |
| correction_of_id | FK self | لا | | |
| note | text | لا | | |
| client_op_id | UUID | نعم عند الإنشاء من عميل | `UNIQUE(user_id, client_op_id)` | |

**`shopping_price_alerts`**: `id, user_id, scope {Item|Product|Offer}, scope_id, kind {BelowTarget|DropPct|LowestInDays|BackInStock}, threshold decimal, window_days, enabled, last_fired_observation_id, last_fired_at, status`. **`shopping_alert_fires`** (سجل): `id, alert_id, observation_id, fired_at, idempotency_key UNIQUE`.

### 5.5 القرارات والبدائل والمقارنات

**`shopping_decisions`** (**Append-only**؛ الأحدث لكل رغبة هو الساري):

| الحقل | النوع | ملاحظة |
| :---- | :---- | :---- |
| id / user_id / item_id | | |
| decision | enum | `Buy|Wait|Reject|Replace` |
| decided_at | timestamptz | |
| phase | enum | `PrePurchase|PostPurchase` (قرار بعد الشراء: SC-09) |
| score | smallint 0–100 | لقطة وقت القرار |
| score_breakdown | jsonb | `{need:{value,weight,points}, …, factors_used:n}` |
| score_version | smallint | نسخة الصيغة |
| budget_fit / timing / equivalent_state | enum | لقطات |
| need_level / priority | enum | لقطات |
| chosen_product_id | FK | المنتج المختار (إن وُجد) |
| chosen_offer_id | FK | |
| price_at_decision / currency | decimal/char | |
| alternatives_considered | smallint | |
| replaces_item_ref | ref triple | لـReplace |
| wait_until | date | لـWait |
| reasons | text[] | أسباب المستخدم (نص حر) + أسباب النظام |
| overridden_hint | bool | هل خالف ميل الدرجة (للشفافية فقط، لا لوم) |
| notes | text | |

**`shopping_alternatives`**: `id, user_id, item_id, product_id, rank smallint, reason, pros text[], cons text[], selected bool, created_at`. `UNIQUE(item_id, product_id)`؛ **مختار واحد** لكل رغبة (`UNIQUE(item_id) WHERE selected`).

**`shopping_comparisons`** (مقارنات محفوظة اختيارية): `id, user_id, item_id|NULL, name, product_ids uuid[] (2–5), created_at`. المصفوفة مشتقة وقت العرض (§6.10).

### 5.6 المشتريات المخطَّطة

**`shopping_planned_purchases`**: `id, user_id, item_id, product_id|NULL, offer_id|NULL, target_date, budget_amount, budget_currency, funding_mode {None|FinanceGoal|Manual}, finance_goal_ref (ref triple), planned_quantity, status {Planned|Ready|Done|Cancelled|Snoozed}, reminder_at, snooze_until, cooling_off_until, notes`. **واحدة نشطة لكل رغبة** (`UNIQUE(item_id) WHERE status IN ('Planned','Ready','Snoozed')`).

### 5.7 المشتريات

**`shopping_purchases`**:

| الحقل | النوع | إلزامي | قيد | ملاحظة |
| :---- | :---- | :---- | :---- | :---- |
| id / user_id | | نعم | | |
| item_id | FK | لا | | قد يكون شراء بلا رغبة سابقة (فوري) |
| planned_purchase_id | FK | لا | | |
| purchased_on | date | نعم | ≤ اليوم + 1 | يقابل `purchased_at` |
| merchant_id / merchant_name | FK/string | لا / نعم | | Snapshot |
| order_ref | string | لا | | رقم الطلب |
| currency | char(3) | نعم | | عملة الشراء |
| items_total | decimal | مشتق | = Σ lines | §6.12 |
| shipping_total / fees_total / discount_total | decimal | لا | | |
| grand_total | decimal | نعم | ≥ 0 | = ما دفعه فعلًا (يُدخَل أو يُحسب ويُؤكَّد) |
| payment_mode | enum | نعم | `Full|Installments|Partial|Unknown` | معلومة؛ الدفع الفعلي في Finance |
| purpose | enum | نعم | يرث من الرغبة (`ForMe|Gift|ForHome|ForTrip|ForWork`) | |
| recipient_person_ref/name | | لـGift | | |
| receipt_file_ref | file_ref | لا | | Core Files |
| status | enum | نعم | `Recorded|Completed|PartiallyReturned|Returned|Cancelled` | مشتق جزئيًا (§9.1) |
| saga_state | jsonb | نظام | `{finance, ownership, events}` لكل بند | §6.13 |
| source_key | string | نعم | `UNIQUE(user_id, source_key)` | Idempotency (ST-06) |
| privacy_tier | enum | | | |
| notes | text | | | |

**`shopping_purchase_lines`**: `id, user_id, purchase_id, line_no, product_id|NULL, offer_id|NULL, name_snapshot, brand/model snapshot, quantity decimal >0, unit_price decimal(14,4), line_total decimal (= quantity × unit_price − line_discount), line_discount, warranty_months (معلومة لتمريرها), ownership_target {Inventory|Home|None|Gift}, replaces_item_ref (ref)`. `UNIQUE(purchase_id, line_no)`.

**`shopping_purchase_payments`** (دفعة حقيقية = صف) — SC-13: `id, user_id, purchase_id, payment_no, amount, currency, paid_on, kind {Lump|Installment|Deposit|Balance}, finance_link_id (FK داخلي)`. `UNIQUE(purchase_id, payment_no)`.

**`shopping_finance_links`** (CX-03 — نمط Home):

| الحقل | النوع | ملاحظة |
| :---- | :---- | :---- |
| id / user_id | | |
| source_type | enum | `shopping_purchase` · `shopping_refund` *(طلب على Finance)* |
| source_id | UUID | `payment_id` أو `return_id` |
| idempotency_key | string | `UNIQUE(user_id, idempotency_key)` = `shopping:payment:{payment_id}` |
| sync_status | enum | `Not Required|Pending|Synced|Failed|Detached|Legacy` |
| finance_transaction_ref | ref triple | Cache (لا FK) |
| amount / currency (snapshot) | | |
| dimensions_sent | jsonb | `{shopping_purchase_id, category_code}` **بلا اسم/ملاحظات/مستلم** |
| attempts / last_error / last_synced_at | | |

**`shopping_ownership_refs`**: `id, user_id, purchase_line_id, target_system {inventory|home}, ownership_ref (ref triple + snapshot + state), source_key (= shopping:purchase:{id}:{line_no}), state {Pending|Created|Failed|Detached|NotApplicable}, attempts, last_error, created_at`. `UNIQUE(purchase_line_id, target_system)` — **مرجع ملكية واحد لكل بند** (ST-07).

**`shopping_returns`**: `id, user_id, purchase_id, line_id|NULL (كل الشراء إن NULL), reason {Defect|NotAsDescribed|ChangedMind|WrongItem|Other}, reason_note, requested_on, return_by_date, status {Considering|Requested|Shipped|Received|Refunded|Rejected|Cancelled}, refund_amount, refund_currency, refunded_on, finance_link_id, note`. القيمة المستردة لا تتجاوز ما دُفع للبند (SV).

**`shopping_reviews`** (ما بعد الشراء): `id, user_id, purchase_line_id|item_id, reviewed_on, satisfaction smallint 1–5, would_buy_again {Yes|No|Unsure}, regret {None|Mild|Strong}, used_frequency {Often|Sometimes|Rarely|Never}, note`. **للتعلّم الشخصي** فقط (§6.15).

### 5.8 الواردات والهدايا

**`shopping_inbound_proposals`** (Inbox): `id, user_id, source_system {inventory|travel|relationships|share}, source_event_id, source_key UNIQUE, payload jsonb (title, reason, due, budget?, item_ref…), received_at, status {Pending|Accepted|Dismissed|Expired}, accepted_item_id, expires_at`. لا يتحول لرغبة بلا قبول.

**الهدايا:** لا جدول هدايا مستقل. الغرض `Gift` + `recipient` + `occasion_ref` على الرغبة والشراء. سجل الهدية وتاريخها عند Relationships (SC-31).

### 5.9 البنية التحتية

| الجدول | الغرض |
| :---- | :---- |
| `shopping_outbox` | أحداث صادرة (CX-17) |
| `shopping_audit_log` | تغييرات حساسة (قرارات، حالة الربط، إعادة محاولة، حذف) غير قابل للتعديل |
| `shopping_client_ops` | Idempotency للمزامنة |
| `shopping_tombstones` | حذف مزامَن |
| `shopping_import_jobs/rows` | استيراد CSV/Notion (§15) |
| `shopping_export_jobs` | تصدير |
| `shopping_derived_cache` | آخر سعر/توقيت/ملاءمة/درجة لكل رغبة (قابل لإعادة البناء، `inputs_hash`) |
| `shopping_external_cache` | قراءات Finance/Inventory المؤقتة (TTL، لا تُصدَّر) |
| `shopping_integration_state` | حالة كل تكامل |
| `shopping_system_config` | حدود المشغّل |

### 5.10 القوائم (Enums)

| Enum | القيم |
| :---- | :---- |
| `need_level` | Need · Want · Unsure |
| `wishlist_status` | Idea · Researching · Watching · Planned · Bought · Rejected · Archived |
| `purpose` | ForMe · Gift · ForHome · ForTrip · ForWork |
| `decision` | Buy · Wait · Reject · Replace |
| `timing` (مشتق) | Good · Neutral · Poor · Unknown |
| `budget_fit` (مشتق) | Within · Tight · Over · Unknown |
| `equivalent_state` (مشتق) | None · Possible · Likely · Unknown |
| `purchase_status` | Recorded · Completed · PartiallyReturned · Returned · Cancelled |
| `payment_mode` | Full · Installments · Partial · Unknown |
| `ownership_target` | Inventory · Home · None · Gift |
| `return_status` | Considering · Requested · Shipped · Received · Refunded · Rejected · Cancelled |
| `sync_status` | Not Required · Pending · Synced · Failed · Detached · Legacy |
| `privacy_tier` | Normal · Sensitive · Secret |

### 5.11 الفهارس والقيود

| الجدول | القيد |
| :---- | :---- |
| wishlist_items | `(user_id, status)` · `(user_id, purpose)` · trigram `title_norm` · `UNIQUE(user_id, source_key)` |
| product_offers | `UNIQUE(user_id, url_hash)` جزئي |
| price_observations | `(offer_id, observed_at DESC)` · `(product_id, observed_at)` · **INSERT فقط** |
| decisions | `(item_id, decided_at DESC)` · INSERT فقط |
| alternatives | `UNIQUE(item_id) WHERE selected` |
| planned_purchases | `UNIQUE(item_id) WHERE status IN (Planned,Ready,Snoozed)` |
| purchases | `UNIQUE(user_id, source_key)` |
| purchase_payments | `UNIQUE(purchase_id, payment_no)` |
| finance_links | `UNIQUE(user_id, idempotency_key)` · `UNIQUE(source_type, source_id)` |
| ownership_refs | `UNIQUE(purchase_line_id, target_system)` |
| كل التابعة | FK مركّب (SC-26) |

### 5.12 خريطة العلاقات

```text
categories 1─* categories(self) ; categories 1─* wishlist_items · products
wishlist_items 1─* alternatives *─1 products 1─* offers 1─* price_observations
products 1─* specs · images ; wishlist_items 1─* decisions · planned_purchases · price_alerts
wishlist_items 0..1─* purchases 1─* purchase_lines 1─* ownership_refs
purchases 1─* purchase_payments 1─1 finance_links ; purchases 1─* returns 1─0..1 finance_links
purchase_lines 1─* reviews
(بلا FK، refs فقط): person_ref · occasion_ref · trip_ref · inventory_item_ref · home_item_ref
                    finance_goal_ref · finance_transaction_ref · finance_budget_ref · file_ref
مشتق: current price / best price / timing / budget_fit / score / status(Planned,Bought)
```

---
## 6) محرّك الحساب (Calculation Engine)

> كل الحسابات **حتمية** وعلى DECIMAL، وكل مؤشر **شفاف** (تُعرض مكوّناته) وقابل للضبط، وليس نصيحة. المشتقات Cache قابل لإعادة البناء (`inputs_hash`) وتُحدَّث مع الحدث المسبّب.

### 6.1 قواعد عامة

| القاعدة | التفصيل |
| :---- | :---- |
| الدقة | `ROUND_HALF_UP` عند الحفظ: المبالغ خانتان، سعر الوحدة 4 خانات، النسب خانة عند العرض |
| اليوم | تاريخ المستخدم في `settings.timezone`؛ `observed_on` يُخزَّن وقت الكتابة |
| المجهول | `NULL` ≠ 0؛ مكوّن مجهول **يُستبعد** من الدرجة ويظهر «بناءً على n من m مكوّنًا» |
| العملات | لا مقارنة بين عملتين إلا بسعر صرف (Finance قراءة، أو يدوي مجمَّد)؛ وإلا تُعرض النتائج **لكل عملة** |
| الصلاحية | الملاحظات `is_valid=true` فقط تدخل الحساب |

### 6.2 السعر الحالي للعرض (Offer) والقِدَم

```text
current(offer) = آخر ملاحظة صالحة لهذا العرض بأحدث (observed_at)
age_days       = today − observed_on
stale          = age_days > settings.price_stale_days     (افتراضي 14)
```

- **لا ملاحظة** ← «لا سعر حالي» (SF-36): الحقل يعرض «غير محدد» ويُستعمل `estimated_price` من الرغبة كمرجع **موسوم «تقدير منك»** فقط (لا يدخل التوقيت).
- الملاحظة القديمة تُعرض مع شارة «قديمة — بتاريخ 2026-09-01» ولا تُقدَّم كسعر اليوم.
- **تصحيح خطأ:** لا تعديل؛ سجل جديد `correction_of_id` والأصلي `is_valid=false`.

### 6.3 أفضل سعر للمنتج (عدة عروض وعملات)

```text
effective(offer)  = current(offer).price + COALESCE(current(offer).shipping_cost, 0)
best(product)     = MIN effective على العروض الفعّالة غير القديمة  (وإلا الأقل بين القديمة موسومًا)
مقارنة العملات   : تحويل عبر سعر Finance الحالي؛ غيابه ← أفضل سعر لكل عملة
```

- الشحن المجهول يُعامَل غير مضاف مع علامة «بدون الشحن».
- **تغير عملة السعر لنفس العرض (SF-37):** الملاحظات القديمة تبقى بعملتها؛ يُنشأ في عرض جديد (أو يُحدَّث `offer.currency` مع **علامة «تغيّرت العملة»** وتُستبعد الملاحظات القديمة من إحصاءات النسبة المئوية حتى يمكن تحويلها). لا إعادة حساب صامتة.
- **تعادل:** الأحدث ملاحظةً ثم الأعلى ثقة (مصدر `Receipt` > `Manual`).

**مثال:** عرض A: 8,900 + شحن 100 = 9,000؛ عرض B: 8,950 بلا شحن معروف = 8,950 (بدون الشحن) ← الأفضل B مع التنويه.

### 6.4 إحصاءات التاريخ السعري والتنبيهات

نافذة افتراضية 180 يومًا، ملاحظات صالحة بعملة واحدة:

```text
min, max, mean, median
drop_pct_vs_prev = (prev − current) / prev × 100
below_mean_pct   = (mean − current) / mean × 100
lowest_in_days   = current ≤ MIN(history within N days)
```

| التنبيه | الشرط (يُقيَّم عند كل ملاحظة جديدة فقط) |
| :---- | :---- |
| `BelowTarget` | `current ≤ target_price` |
| `DropPct` | `drop_pct_vs_prev ≥ threshold` |
| `LowestInDays` | `lowest_in_days(N)` |
| `BackInStock` | availability انتقل إلى `InStock` |

- التنبيه **يُطلق مرة واحدة** لكل ملاحظة (`alert_fires.idempotency_key = alert:{id}:obs:{obs_id}`) ولا يتكرر لنفس الملاحظة.
- **النص:** «سعر X في Y: 7,900 بتاريخ ملاحظتك 2026-10-05» — **بلا ادّعاء حيّ** ولا ندرة.
- لا تنبيه لعنصر مؤرشف أو `Rejected` أو `Bought` (ST-10).

**مثال:** ملاحظات: 9,000 (1/9) ثم 8,100 ← `drop_pct = 10.00%`؛ عتبة 8% ← يُطلق مرة.

### 6.5 التوقيت (Good / Neutral / Poor)

شرط الحساب: ≥ `timing_min_observations` (3) ملاحظات صالحة بعملة واحدة تمتد ≥ `timing_min_span_days` (14) وإلا **Unknown**.

```text
history  = ملاحظات الفترة (بدون الحالية) للمنتج بعملته
r        = ( عدد(أسعار < current) + 0.5 × عدد(أسعار = current) ) / n × 100        // الرتبة المئوية
timing   = Good    إذا r ≤ timing_good_pct (25)
           Poor    إذا r ≥ timing_poor_pct (75)
           Neutral غير ذلك
```

**مثال:** تاريخ [900, 950, 1000, 1000, 1100, 1200] والحالي 920: أقل منه سعر واحد ← r = 1/6 = 16.67 ← **Good**. الحالي 1,050: أقل منه 4 (900,950,1000,1000) ← r = 66.67 ← Neutral. الحالي 1,150: أقل منه 5 ← 83.33 ← Poor.

- يُعرض «لأنه أقل من 83% من أسعار ملاحظاتك السابقة» **وليس** «اشترِ الآن». ويُعرض عدد الملاحظات ومداها.
- **تلميح موسم:** لو `sale_event` يعرّفه المستخدم يبدأ خلال 14 يومًا ← «موسم أضفتَه: X بعد 9 أيام» (معلومة لا توصية).
- التوقيت **لا يتضمن** أي تنبؤ بالأسعار.

### 6.6 ملاءمة الميزانية (Budget Fit)

مصدر «المتاح» بالترتيب:

1. خطة الشراء `funding_mode=FinanceGoal` ← رصيد الهدف الحالي في Finance (قراءة).
2. ميزانية فئة Finance المرتبطة (`finance_budget_ref`) ← المتبقي من الفترة الحالية (قراءة؛ **عقد مطلوب من Finance — يُتحقق في v4.1**).
3. `planned_purchases.budget_amount` (حد وضعه المستخدم).
4. غير ذلك ← `Unknown`.

```text
ratio = price_total / available                 (price_total = السعر × الكمية + الشحن المعروف)
Within  إذا ratio ≤ budget_tight_ratio (0.70)
Tight   إذا 0.70 < ratio ≤ 1.00
Over    إذا ratio > 1.00  أو available ≤ 0
```

**أمثلة:** سعر 8,000: المتاح 15,000 ← 0.53 Within؛ 10,000 ← 0.80 Tight؛ 7,000 ← 1.14 Over. عملتان مختلفتان بلا سعر صرف ← Unknown.

> هذا **مؤشر ملاءمة لقيودك أنت**، لا حكمًا على قدرتك المالية. Finance يبقى المرجع.

### 6.7 المكافئ المملوك (Existing Equivalent) — SF-42

بترتيب المصادر: (1) Inventory عبر `GET /inventory/items/search?q=&kind=` (2) وإلا مشترياتي المكتملة هنا في آخر 24 شهرًا.

```text
Likely   : نفس الماركة وموديل متطابق أو أحدهما بادئة للآخر (norm)  أو معرّف مطابق
Possible : نفس الفئة و Jaccard(كلمات الاسم) ≥ 0.30
None     : غير ذلك
Unknown  : لا مصدر متاح
Jaccard(A,B) = |A ∩ B| / |A ∪ B|
```

**مثال:** «سماعات سوني WH-1000» مقابل «سماعات سوني WH-1000XM4» (ماركة متطابقة، موديل بادئة) ← Likely. «سماعات جابرا» ← Jaccard 1/5 = 0.20 ← None.

- **النتيجة تُعرض ولا تمنع:** «عندك سماعات سوني (في Inventory، مكتبك). [هذا استبدال] [أحتاج الاثنين] [تجاهل]». اختيار «استبدال» ← `decision=Replace` + `replaces_item_ref`.
- مشتريات المستخدم لنفس العنصر قبل أسابيع تُعرض «اشتريت X قبل 3 أسابيع» (معلومة).

### 6.8 الدرجة (Score) — شفافة وقابلة للضبط

| المكوّن | الدرجة 0–100 | الوزن الافتراضي |
| :---- | :---- | :---- |
| الحاجة (`need`) | Need=100 · Unsure=50 · Want=40 | 25 |
| الأولوية | High=100 · Medium=60 · Low=30 | 15 |
| الميزانية | Within=100 · Tight=50 · Over=0 | 25 |
| التوقيت | Good=100 · Neutral=50 · Poor=10 | 15 |
| المكافئ | None=100 · Possible=50 · Likely=10 (**أو 100 إن كان القرار Replace بمرجع**) | 10 |
| التهدئة | غير مفعّلة/انتهت=100 · جارية=0 (تُحسب فقط لو مفعّلة) | 10 |

```text
score = ROUND( Σ (points_i × weight_i) / Σ weight_i  )     على المكوّنات المعلومة فقط
```

**مثال 1:** Need(100×25) + Medium(60×15) + Within(100×25) + Neutral(50×15) + Possible(50×10) = 2500+900+2500+750+500 = 7150؛ الأوزان 90 ← **79** («بناءً على 5 من 6»؛ التهدئة معطّلة).
**مثال 2 (الميزانية Unknown):** 4650 / 65 = 71.54 ← **72** («بناءً على 4 من 6»).

- **الصياغة:** `score ≥ lean_buy (70)` ← «يميل لـ Buy حسب معاييرك»؛ `< lean_wait (40)` ← «يميل لـ Wait/Reject»؛ بينهما «مختلط». **الميل ليس قرارًا**.
- يظهر تفصيل كل مكوّن وزرّ «غيّر الأوزان». تغيير الأوزان **لا يعدّل** درجات القرارات السابقة (لقطات بـ`score_version`).
- لا مكوّن من خارجك (لا تقييمات متاجر ولا شعبية).

### 6.9 فترة التهدئة (Cooling-off) — اختيارية

عند `cooling_off_enabled` وكان `need_level ≠ Need` (إعداد) والسعر ≥ `cooling_off_threshold_amount`:

```text
cooling_off_until = decided_at(Buy) + cooling_off_days
```

- قبل الانتهاء: الخطة تظهر «تهدئة حتى 2026-10-10» وزر «جهّز الشراء» يطلب تأكيدًا خفيفًا «تخطّي التهدئة» (يُسجَّل ويُحتفظ به **بلا لوم**).
- هي **أداة يطلبها المستخدم لنفسه**؛ لا تُفعَّل بلا موافقته. لا تمنع الشراء.

### 6.10 المقارنة (2–5 منتجات)

**الصفوف:** أفضل سعر فعّال (§6.3) + عملته · موقعه من تاريخه (§6.5 كنسبة) · الضمان (`warranty_months`) · المتجر/المتاجر · التوافر · كل المواصفات (اتحاد المفاتيح) · المزايا والعيوب (من البدائل).

```text
أفضل خلية في الصف:
  value_type=Number و higher_is_better=Yes → الأعلى ؛ No → الأقل
  Bool → true أفضل (إن higher_is_better=Yes)
  Text/Enum/Neutral → لا تمييز
  المجهول → «غير محدد» ولا يُعاقَب ولا يُمثَّل كصفر
تعادل → لا تمييز
```

- الأسعار تُقارن فقط لو قابلة للمقارنة (§6.1)، وإلا صفوف منفصلة بعملاتها.
- المقارنة **لا تعطي فائزًا** تلقائيًا؛ تعرض «يتفوق في 4 من 7 صفوف قابلة للتمييز» كمعلومة.

### 6.11 تطبيع الروابط وكشف التكرار — SF-38

```text
url_norm: scheme→lower ; host→lower وحذف www. ; حذف fragment ;
          حذف معاملات التتبّع (قائمة قابلة للضبط: utm_*, fbclid, gclid, ref, ref_, tag, aff*…) ;
          فرز المعاملات الباقية أبجديًا ; حذف "/" الأخير
url_hash = SHA-256(url_norm)
```

| الحالة | السلوك |
| :---- | :---- |
| نفس `url_hash` لعرض موجود | فتح الموجود «سبق أن أضفت هذا الرابط» (لا إنشاء) |
| نفس الماركة+الموديل+المتغيّر (`norm`) لمنتج آخر | **تحذير** واقتراح ربط العرض بالمنتج الموجود |
| عنوان رغبة مشابه (trigram ≥ 0.8) لرغبة نشطة | تلميح «هل هي نفس الرغبة؟» (SA-05) |
| متغيّر لون/مقاس في معامل الرابط | يبقى ضمن `url_norm` (يميّز العرض) |

> الروابط المختصرة لا تُفكّ تلقائيًا (لا اتصال خارجي)؛ تُحفظ كما هي وتُنبَّه «رابط مختصر».

### 6.12 إجماليات الشراء وتكلفة الوحدة الفعلية

```text
line_total      = quantity × unit_price − line_discount
items_total     = Σ line_total
grand_total     = items_total + shipping_total + fees_total − discount_total      (يُؤكَّد من المستخدم)
alloc_i         = line_total_i / items_total                                       (توزيع نسبي)
effective_cost_i = line_total_i + alloc_i × (shipping + fees − discount)
```

**مثال:** سطران 1,000 و3,000، شحن 100، خصم إجمالي 200 ← items 4,000، `grand=3,900`؛ السطر 1 = 1,000 + 0.25×(−100) = **975**؛ السطر 2 = 3,000 + 0.75×(−100) = **2,925**.

- `Σ payments` يُقارَن بـ`grand_total`: عدم تطابق ← تحذير «مجموع الدفعات ≠ الإجمالي» (مقبول في `Installments/Partial`).

### 6.13 Saga الشراء: Purchase ← Finance ← Ownership (SF-19، SF-40)

```text
1) Record (معاملة محلية واحدة): purchases + lines + payments + finance_links(Pending) + ownership_refs(Pending)
   source_key = "shopping:purchase:{client_uuid}"   (UNIQUE) → إعادة الإرسال تُرجع نفس الشراء
2) لكل payment: POST /finance/transactions/from-source  Idempotency-Key = shopping:payment:{payment_id}
      dimensions = {shopping_purchase_id, category_code}   (بلا مستلم/ملاحظات/اسم)
3) لكل line بـownership_target ≠ None/Gift: 
      Inventory: POST /inventory/items/from-source  key = shopping:purchase:{purchase_id}:{line_no}
      Home     : POST /home/items/from-source (طلب)   نفس المفتاح
4) حدث shopping.purchase.completed (مرة واحدة بعد أن تبلغ كل الخطوات المطلوبة حالة نهائية) للمستهلكين الآخرين
```

- **كل خطوة مستقلة ولها حالتها:** فشل Finance لا يوقف الملكية والعكس؛ الإعادة بنفس المفاتيح **لا تكرّر** شيئًا (ST-06).
- حالة الشراء: `Recorded` ← `Completed` عند بلوغ كل خطوة مطلوبة `Synced/Created/NotApplicable/NotRequired`.
- **دفعة حقيقية واحدة = معاملة واحدة** (SC-13): أقساط ← صف دفعة لكل قسط فعلي يُسجَّل عند حدوثه.
- **المبلغ بعملة أجنبية:** يُرسَل بعملته الأصلية مع `fx_rate` اختياري (طلب Finance، CX-03).
- **تعطيل Finance:** `Not Required` ولا يُنتَج رابط؛ الشراء صحيح.
- **القرار بعد الشراء (SF-39):** يُضاف `decision(phase=PostPurchase)` بدل تعديل القديم؛ لا يؤثر على الربط ولا يعيد الشراء.
- **منتج تُخُلِّص منه (SF-41):** يصل `inventory.item.disposed` ← يُحدَّث `ownership_ref_state` (Detached) ويُسجَّل في مراجعة الشراء؛ **سجل الشراء والتاريخ يبقيان**.

### 6.14 المرتجعات والاسترداد

```text
return_by       = purchased_on + merchant.return_window_days     (إن عُرف؛ وإلا يدخله المستخدم)
refund_amount   ≤ Σ المدفوع للبند (التحقق)
net_cost        = grand_total − Σ refunds
purchase.status = PartiallyReturned إن 0 < Σ refunds < grand_total ؛ Returned إن Σ refunds = grand_total
```

- الاسترداد الفعلي مال ← Finance: `POST /finance/transactions/from-source` بـ`source_type=shopping_refund` *(طلب)* بمفتاح `shopping:refund:{return_id}`؛ وقبل توفره: يدخله المستخدم يدويًا في Finance ويربطه.
- عند `Refunded`: حدث `shopping.purchase.refunded` ← Inventory يقترح `Disposed/Returned` للبند (بتأكيد المستخدم).
- تذكير قبل `return_by` بيومين (SA-09).

**مثال:** شراء 5,000 واسترداد 5,000 ← `net_cost=0` والحالة `Returned`.

### 6.15 مراجعة ما بعد الشراء

بعد `review_after_days` (30) من الشراء: سؤال لطيف (3 نقرات): رضا 1–5 · «أشتريه ثانية؟» · ندم {لا/خفيف/قوي} · الاستخدام {كثيرًا/أحيانًا/نادرًا/لم أستخدمه}.

```text
would_buy_again_pct(category) = Yes / (Yes+No)       // يُعرض فقط بعد ≥ 5 مراجعات للفئة
regret_rate(category)         = (Mild + Strong) / reviewed
```

وصفية فقط: «في فئة الإلكترونيات: اشتريتَه ثانية في 80% (من 10 مراجعات)». **لا تصنيف شخصية ولا نصائح.** تُغذّي بطاقة القرار بسطر معلومات اختياري: «آخر 3 مشتريات من هذه الفئة: رضا 4.3».

### 6.16 تحليلات الإنفاق (من سجلات Shopping)

- الإنفاق حسب الفئة/الغرض/الشهر = `Σ (grand_total − refunds)` للمشتريات `Completed|PartiallyReturned`، بعملة واحدة أو لكل عملة.
- الخطة مقابل الفعلي: `actual − planned_budget` (وصفي).
- الفرق عن أدنى سعر لاحظته: `paid_unit − min_observed` (موجب = أعلى؛ وصفي).
- «رغبات راكدة»: عناصر `Idea/Researching` بلا نشاط > 180 يومًا (اقتراح أرشفة، بلا لوم).
- **مصدر المال الرسمي هو Finance**؛ أي اختلاف يُعرض «حسب سجلات Shopping» مع رابط للتحقق.

### 6.17 انتقالات حالة الرغبة

| من | إلى (يدويًا) | تلقائيًا |
| :---- | :---- | :---- |
| Idea | Researching · Watching · Rejected · Archived | — |
| Researching | Watching · Planned* · Rejected · Archived | — |
| Watching | Researching · Planned* · Rejected · Archived | — |
| Planned | Researching · Watching · Archived | `Bought` عند تسجيل شراء؛ العودة لـResearching عند إلغاء الخطة |
| Bought | Archived فقط | — |
| Rejected | Researching · Archived | — |
| Archived | يعود لآخر حالة قبل الأرشفة | — |

- *`Planned` تنشأ تلقائيًا بإنشاء خطة شراء نشطة (`status_source=Auto`).
- قرار `Reject` يقترح `Rejected` (بتأكيد). قرار `Buy` يقترح إنشاء خطة.
- الأرشفة تُوقف التنبيهات والتذكيرات (ST-10) وتُبقي كل التاريخ والبحث.

### 6.18 تقدّم التمويل

```text
funded_pct = MIN(100, goal.current_amount / price_total × 100)       (قراءة Finance Goal)
Ready      إذا funded_pct = 100 أو لا funding (Manual/None) ويصل target_date
```

مثال: هدف الادخار 6,000 والسعر 8,000 ← 75.00%. لا تنفيذ لآلية الادخار هنا (CX-11).

---

## 7) سجل التعارضات (SC) وحلولها

> **ما هو** ← **لماذا مشكلة** ← **الحل** ← **أين**. 01–22 داخلية، 23–27 مع «قواعد التنفيذ المشتركة»، 28–34 مع بقية الأقسام.

### 7.1 تعارضات داخلية في المصدر

| # | التعارض | لماذا مشكلة | الحل المعتمد | أين |
| :---- | :---- | :---- | :---- | :---- |
| **SC-01** | `title` فقط ولا مكان لفكرة بلا منتج | الرغبة غالبًا بلا ماركة | الرغبة مستقلة عن المنتج؛ المنتجات مرشَّحات | §5.2–5.3 |
| **SC-02** | `status` (Idea…Archived) يتداخل مع Decision وPlanned وPurchase | حالة تتناقض مع الكيان الفعلي | مراحل مبكرة يدوية؛ Planned/Bought **مشتقتان** | §6.17 |
| **SC-03** | الغرض غير موجود (لي/هدية/للرحلة) | الهدية لها مستلم وسياق مختلف | `purpose` + مستلم + مناسبة + رحلة | §5.2 |
| **SC-04** | `reason` نص مفرد لكنه يغذي القرار | لا يمكن تحليله | يبقى نصًا للمستخدم؛ أسباب النظام منفصلة بالـbreakdown | §5.5 |
| **SC-05** | `merchant` و`url` على المنتج | المنتج الواحد يُباع في عدة متاجر | **Offers** لكل متجر/رابط | §5.3 |
| **SC-06** | `current_price` على المنتج مشتق ومع ذلك متعدد العملات | أي ملاحظة؟ وأي عملة؟ | مشتق لكل عرض ثم أفضل سعر بقواعد §6.3 | §6.2–6.3 |
| **SC-07** | `specifications` حقل حر | لا مقارنة ممكنة | جدول مواصفات + تعريفات + اتجاه الأفضلية | §5.3، §6.10 |
| **SC-08** | `score` بلا تعريف | رقم غامض | مكوّنات وأوزان معروضة وقابلة للضبط | §6.8 |
| **SC-09** | Decision يُعدَّل أم يُضاف؟ و«قرار تغيّر بعد الشراء» | فقد التاريخ | سجل Append-only + `phase` | §5.5 |
| **SC-10** | `budget_fit` بلا مصدر | يخلط ميزانية وهدف ادخار | ترتيب مصادر + `Unknown` | §6.6 |
| **SC-11** | «Good/Neutral/Poor Time» اختياري بلا تعريف | قد يُفهم كنصيحة | نسبة مئوية لتاريخك + حد أدنى للبيانات | §6.5 |
| **SC-12** | Purchase بمنتج واحد وكمية | سلة بعدة بنود | `purchase_lines` | §5.7 |
| **SC-13** | «معاملة Finance واحدة كحد أقصى» ↔ أقساط/عربون/استرداد | واحدة لكل **دفعة حقيقية** لا لكل شراء | `purchase_payments` + رابط لكل دفعة + `shopping_refund` | §6.13 |
| **SC-14** | `ownership_record_id` FK | عبر قسمين | `ownership_refs` بلا FK + حالة | §5.7 |
| **SC-15** | لا سعر حالي | حقل فارغ يفسد التوقيت والدرجة | «غير محدد» + استبعاد المكوّن | §6.2 |
| **SC-16** | تغيّر عملة السعر | نقارن عملتين | عملة لكل عرض/ملاحظة + علامة + استبعاد | §6.3 |
| **SC-17** | رابط مكرر | سجلان لنفس العرض | تطبيع + `url_hash` فريد | §6.11 |
| **SC-18** | شراء منزلي (مستهلكات) ↔ Home Shopping | ازدواج مع Home | المستهلكات والصيانة = Home؛ هنا المعمَّر + القرار، والملكية تذهب لـHome | §3.2 |
| **SC-19** | إعادة محاولة الشراء | شراء مضاعف/ربط مضاعف | `source_key` + مفاتيح لكل خطوة | §6.13 |
| **SC-20** | «مكافئ مملوك موجود» بلا مصدر | لا يعرف ما عندك | قراءة Inventory + احتياطي مشترياتي | §6.7 |
| **SC-21** | منتج تُخُلِّص منه | الرابط الملكي يموت | `Detached` والتاريخ يبقى | §6.13 |
| **SC-22** | منتج مؤرشف بتاريخ | تنبيهات مستمرة أو فقد تاريخ | الأرشفة توقف التنبيهات وتحفظ التاريخ | §6.17 |

### 7.2 مع «قواعد التنفيذ المشتركة»

| # | الحل |
| :---- | :---- |
| **SC-23** | FK داخل Shopping فقط؛ عبر الأقسام `ref + snapshot + state` (CX-02) |
| **SC-24** | المشتقات (سعر، توقيت، ملاءمة، درجة، حالة) Cache قابل لإعادة البناء |
| **SC-25** | `observed_on` محلي مخزَّن + UTC؛ لا يتحرك سجل قديم عند تغيّر المنطقة |
| **SC-26** | `user_id` على التابعة + FK مركّب |
| **SC-27** | قالب Notion اختياري + Onboarding + CSV بـDry-run |

### 7.3 مع الأقسام الأخرى

| # | التعارض | الحل المعتمد |
| :---- | :---- | :---- |
| **SC-28** | **Finance**: الميزانية/الأهداف/الدفع، وHome يتصل بها بنمط `finance_links` | Shopping يقرأ الميزانية والهدف، ويرسل الدفعات بـ`from-source`؛ **طلبات على Finance:** `shopping_purchase` و`shopping_refund` كـ`source_type`، أبعاد `shopping_purchase_id`، فئة افتراضية، عملة مختلفة عن عملة الحساب، قراءة متبقي ميزانية فئة |
| **SC-29** | **Inventory**: سلسلة Purchase ← Ownership، وInventory يرسل «حاجة استبدال» | `from-source` بمفتاح؛ Inbox للاقتراحات؛ `replaces_item_ref` على الشراء يُغلق الاستبدال هناك |
| **SC-30** | **الضمان**: عند Shopping (`warranty`) وInventory (CX-06) | `warranty_months` **معلومة** تمرَّر عند الشراء؛ التذكيرات من Inventory وحدها. اختبار «Warranty reminder works» (المصدر 8) يُعاد تعريفه: الشراء يُنتج ضمانًا في Inventory |
| **SC-31** | **Relationships**: الهدايا (سجل ومناسبات) وShopping (شراء) | Shopping يملك الشراء والمدفوع؛ Relationships تحمل `shopping_purchase_ref` في سجل الهدية؛ **لا رابط Finance ثانٍ** (`relationship_gift` للهدايا غير المشتراة هنا فقط، كنقد/تجربة) |
| **SC-32** | **Travel** (CX-20): مشتريات الرحلة | `purpose=ForTrip` + `trip_ref`؛ Travel قد ينشئ اقتراحات واردة (`POST /shopping/inbox`)؛ التجارب والحجوزات في Travel لا هنا |
| **SC-33** | **Today/الإشعارات**: تنبيهات الأسعار تُنتج ضجيجًا | سقف يومي + تجميع + نص محايد + لا ندرة |
| **SC-34** | **Home** (إعادة التزويد الدورية) | تحويل «هذا استهلاكي» إلى Home بنقرة (`POST /home/purchases/from-source` *(طلب)*) بدل إنشائه هنا |

---
## 8) الفجوات المسدودة (SG) والتحسينات المضافة (SE)

### 8.1 الفجوات (SG)

| # | الفجوة | لماذا تهم | السدّ | أين |
| :---- | :---- | :---- | :---- | :---- |
| SG-01 | التقاط سريع | الفكرة تضيع إن احتاجت 10 حقول | عنوان فقط، أو مشاركة رابط من أي تطبيق/متصفح | §10.3 |
| SG-02 | Inbox للاقتراحات الواردة | Inventory/Travel يقترحان | `inbound_proposals` بقبول صريح | §5.8 |
| SG-03 | متاجر متعددة للمنتج | الأسعار تختلف | Offers | §5.3 |
| SG-04 | مواصفات قابلة للمقارنة | مقارنة بلا بنية | `spec_defs` + `product_specs` | §6.10 |
| SG-05 | أسعار بلا scraping | لا نريد انتهاك شروط المتاجر ولا ادعاء دقة | إدخال سريع (سعر+متجر) + مشاركة رابط + CSV + مزوّد مرخّص لاحقًا | §6.2، SD-02 |
| SG-06 | قِدَم السعر | سعر أمس ليس سعر اليوم | `price_stale_days` + شارة | §6.2 |
| SG-07 | شحن/رسوم | السعر النهائي ≠ سعر العرض | `shipping_cost` + بدون الشحن | §6.3 |
| SG-08 | سعر مستهدف وتنبيهات | حل المراقبة | `target_price` + `price_alerts` | §6.4 |
| SG-09 | تلميح المواسم | تأجيل الشراء لموسم | `sale_events` يعرّفها المستخدم | §5.1 |
| SG-10 | درجة شفافة | الثقة في المؤشر | مكوّنات وأوزان وn من m | §6.8 |
| SG-11 | فترة تهدئة اختيارية | شراء اندفاعي | `cooling_off` | §6.9 |
| SG-12 | غرض الشراء (هدية/رحلة/عمل) | سياق مختلف | `purpose` | §5.2 |
| SG-13 | شراء بعدة بنود | سلة | `purchase_lines` | §5.7 |
| SG-14 | أقساط/عربون | واقع السوق | `purchase_payments` | §6.13 |
| SG-15 | مرتجعات | بعد الشراء حياة | `returns` + موعد + استرداد | §6.14 |
| SG-16 | مراجعة ما بعد الشراء | التعلم الشخصي | `reviews` بلا لوم | §6.15 |
| SG-17 | تكلفة الوحدة الفعلية | شحن وخصم موزّعان | توزيع نسبي | §6.12 |
| SG-18 | عملات متعددة | شراء أجنبي | عملة لكل سعر + FX من Finance | §6.3 |
| SG-19 | Saga آمنة | شراء ولا ربط/ملكية | خطوات مستقلة بمفاتيح | §6.13 |
| SG-20 | الهدايا | مستلم/مناسبة/ميزانية | `purpose=Gift` + `person_ref` | §5.2، SC-31 |
| SG-21 | قائمة رغبات لمشاركة؟ | (غير ضروري الآن) | مؤجل، SD-06 | §18 |
| SG-22 | كشف التكرار (رابط/منتج/رغبة) | نظافة البيانات | تطبيع + تحذير | §6.11 |
| SG-23 | رغبات راكدة | تراكم | قائمة اقتراح أرشفة | §6.16 |
| SG-24 | استيراد من Notion/CSV | البداية | Dry-run | §15 |
| SG-25 | أوفلاين كامل | التسوق في السوق بلا نت | طابور + Idempotency | §13 |
| SG-26 | تصدير/حذف | حق المستخدم | JSON/CSV + حذف | §14.5 |
| SG-27 | ربط الادخار | شراء ممول بهدف | `finance_goal_ref` + تقدّم | §6.18 |
| SG-28 | خصوصية الهدايا والمبالغ | الاطلاع العرضي | Tier + إخفاء المبالغ | §14.1 |
| SG-29 | رابط ميت | عرض لم يعد موجودًا | `status=Dead` يدويًا/عند فشل فتح | §5.3 |
| SG-30 | بدائل مع مزايا/عيوب | القرار | `alternatives` | §5.5 |
| SG-31 | قرار بعد الشراء | «لو كنت أعرف» | `phase=PostPurchase` | §5.5 |
| SG-32 | سجل أسباب عدم الشراء | لا أريد العودة إليه | `Rejected` بسبب + إخفاء من الاقتراحات | §6.17 |
| SG-33 | شراء فوري بلا رغبة | واقع | `purchases.item_id` اختياري | §5.7 |
| SG-34 | الأمانة في الصياغة | منع الضغط والندرة | قواعد §10.6 + فحص CI | §10.6 |

### 8.2 التحسينات (SE)

| # | التحسين | الفائدة | الحدود |
| :---- | :---- | :---- | :---- |
| SE-01 | مشاركة رابط إلى التطبيق (Share Target) | أسرع التقاط | يحفظ الرابط فقط؛ لا جلب خارجي |
| SE-02 | «لقطة سعر» بالكاميرا للرف (إدخال يدوي مساعد) | تسجيل أسعار السوق | تحويل نص على الجهاز فقط — **غير مؤكد — يُتحقق** من الدعم |
| SE-03 | سؤال «لماذا تريده؟» (3 اختيارات سريعة) | يحدد الحاجة | اختياري |
| SE-04 | قائمة «اشتريها بنفسك عند X» (قوائم لكل متجر) | مشوار مرتب | عرض فقط |
| SE-05 | بطاقة «قبل أن تشتري» (مختصر القرار) | قراءة سريعة | بلا ندرة |
| SE-06 | حفظ مقارنة وإعادة فتحها | عودة للقرار | `comparisons` |
| SE-07 | ملخص نهاية الشهر (مشتريات ومراجعات) | وعي | وصفي |
| SE-08 | رغبات «لما يتوفر التمويل» | ربط بالادخار | `funded_pct` |
| SE-09 | قوالب خطة (ما أحتاجه لرحلة/دراسة/عمل جديد) | إعداد سريع | قوالب المستخدم |
| SE-10 | تلخيص ما اشتريته لهذا الشخص سابقًا (هدايا) | لا تكرار | عبر Relationships عند توفرها؛ بلا نسخ بياناته |
| SE-11 | «ماذا فعلت بالقديم؟» بعد الاستبدال | يغلق الحلقة مع Inventory | بيع/تخلص/احتفاظ |
| SE-12 | تاريخ سعري مرئي بسيط (Sparkline) | فهم سريع | بلا توقع |

---

## 9) دورات الحياة (Lifecycles) وقواعد التحقق (Validation)

### 9.1 دورات الحياة

**الرغبة:** انتقالاتها في §6.17. **الحذف:** ناعم فقط لرغبة بلا قرارات/ملاحظات/مشتريات؛ غير ذلك أرشفة. الأرشفة: `archived_at`، تُوقف التنبيهات، تبقى قابلة للبحث، والاستعادة لآخر حالة.

**المنتج:** `Active → Archived | Discontinued`. أرشفة منتج له ملاحظات/قرارات/مشتريات **مسموحة** (يبقى للتاريخ، يخرج من الاختيار). حذف نهائي ممنوع إلا في «حذف بياناتي».

**العرض:** `Active → Dead | Archived`. عرض بملاحظات لا يُحذف.

**الملاحظة:** لا حذف ولا تعديل؛ التصحيح بسجل جديد.

**القرار:** سجل Append-only؛ الأحدث هو الساري. بعد الشراء يُضاف `PostPurchase`.

**الخطة:** `Planned → Ready → Done | Cancelled`؛ `Snoozed` مؤقتة. `Done` تلقائيًا عند تسجيل شراء مرتبط. واحدة نشطة لكل رغبة.

**الشراء:**

```text
Recorded ──(كل الخطوات المطلوبة نهائية)──▶ Completed
   │                                          │
   └─(إلغاء قبل أي ربط)─▶ Cancelled           ├─(استرداد جزئي)─▶ PartiallyReturned
                                              └─(استرداد كامل)─▶ Returned
```

- **الإلغاء بعد الربط المالي:** لا يُلغى؛ يُسجَّل مرتجع/استرداد أو تصحيح في Finance (Shopping لا يحذف أثرًا ماليًا).
- **تعديل شراء مُسجَّل:** يسمح بتصحيح الملاحظات والمتجر؛ تغيير المبالغ بعد الربط ← «تصحيح» ينتج تعديلًا في Finance عبر PUT (نفس المفتاح) أو معاملة عكسية حسب عقد Finance.

**المرتجع:** `Considering → Requested → Shipped → Received → Refunded` أو `Rejected | Cancelled`. `Refunded` ينتج رابط Finance مرة واحدة.

**ربط Finance:** `Pending → Synced | Failed`، `Failed` يُعاد بنفس المفتاح؛ `Detached` لو حُذفت المعاملة في Finance؛ `Not Required` عند التعطيل.

**مرجع الملكية:** `Pending → Created | Failed`، `Detached` لو حُذف الشيء في Inventory/Home.

**الاقتراح الوارد:** `Pending → Accepted | Dismissed | Expired` (انتهاء بعد 30 يومًا).

**المزامنة:** `Synced / Pending / Conflict` (§13.4).

### 9.2 قواعد التحقق (SV)

| # | القاعدة | عند المخالفة |
| :---- | :---- | :---- |
| SV-01 | `title` غير فارغ ≤ 200 | رفض |
| SV-02 | `price ≥ 0` وعملة ISO معروفة | رفض |
| SV-03 | `observed_at` ≤ الآن + دقيقة | رفض |
| SV-04 | لا UPDATE/DELETE لملاحظة أو قرار | `403 IMMUTABLE` |
| SV-05 | `list_price ≥ price` إن وُجد | تحذير |
| SV-06 | رابط صالح (http/https) وطوله ≤ 2048 | رفض |
| SV-07 | `url_hash` فريد | يفتح الموجود |
| SV-08 | المقارنة بين 2 و5 منتجات | رفض |
| SV-09 | بديل مختار واحد فقط لكل رغبة | رفض |
| SV-10 | خطة نشطة واحدة لكل رغبة | `409 PLAN_EXISTS` |
| SV-11 | `target_date` ≥ اليوم عند الإنشاء | تحذير |
| SV-12 | `quantity > 0` | رفض |
| SV-13 | مجموع السطور = `items_total`؛ `grand_total ≥ 0` | رفض |
| SV-14 | `purchased_on` ≤ اليوم + 1 | تأكيد |
| SV-15 | `source_key` فريد للشراء | يعيد الموجود |
| SV-16 | `payment_no` فريد؛ `amount > 0` | رفض |
| SV-17 | تحذير لو Σ الدفعات ≠ `grand_total` إلا في Installments/Partial | تحذير |
| SV-18 | Gift يتطلب `recipient_name` | رفض |
| SV-19 | `ForTrip` يقبل `trip_ref` اختياريًا | — |
| SV-20 | `refund_amount ≤` المدفوع للبند | رفض |
| SV-21 | `return_by ≥ purchased_on` | رفض |
| SV-22 | `weights` الدرجة: كل وزن ≥ 0 ومجموعها > 0 | رفض |
| SV-23 | `timing` عتبتان: good < poor ضمن 0–100 | رفض |
| SV-24 | `tight_ratio ∈ (0,1]` | رفض |
| SV-25 | `client_op_id` فريد | يعيد النتيجة |
| SV-26 | `finance_goal_ref` يُتحقق (Valid) قبل اعتماد التمويل | تحذير |
| SV-27 | صورة/ملف ضمن حدود Core Files | رفض |
| SV-28 | نص حر ≤ 2000؛ تعقيم HTML | تعقيم |
| SV-29 | CSV: UTF-8 وأعمدة معروفة | تقرير |
| SV-30 | نصوص الواجهة تمر بفحص «لا ندرة/لا ضغط/لا لوم/لا نصيحة» | فشل CI |

---
## 10) تجربة المستخدم والشاشات

### 10.1 خريطة الشاشات

| # | الشاشة | الغرض | مصدرها |
| :---- | :---- | :---- | :---- |
| 1 | **Shopping Home** | ما يحتاج انتباهك + التنبيهات + المخطط | SF-05 |
| 2 | **Inbox** | اقتراحات واردة وروابط مشاركة | جديد (SG-02) |
| 3 | **Wishlist** | قائمة/لوح حسب الحالة/الغرض | المصدر |
| 4 | **تفاصيل الرغبة** (بطاقة القرار) | كل ما يلزم للقرار | SF-21 |
| 5 | **تفاصيل المنتج** | عروض، مواصفات، صور، سعر | المصدر |
| 6 | **تاريخ الأسعار** | رسم + ملاحظات | المصدر |
| 7 | **المقارنة** | 2–5 منتجات | SF-24 |
| 8 | **مخطّط الشراء** (Purchase Planner) | الخطط والتمويل والتذكير | المصدر |
| 9 | **تسجيل شراء** (Sheet) | بنود ودفعات وإيصال | المصدر |
| 10 | **المشتريات** | السجل والمرتجعات | المصدر |
| 11 | **الملكية** | روابط Inventory/Home وحالتها | المصدر |
| 12 | **المرتجعات** | مواعيد وحالات | جديد |
| 13 | **المراجعات** | ما بعد الشراء | جديد |
| 14 | **الهدايا** (عرض مُرشَّح) | رغبات/مشتريات `Gift` حسب المستلم | جديد |
| 15 | **التصنيفات والمتاجر والمواسم** | إدارة القوائم | المصدر |
| 16 | **الإعدادات** | أوزان، عتبات، تكاملات، خصوصية، تصدير/حذف | المصدر |

### 10.2 Shopping Home

**البطاقات:**
1. **الاقتراحات الواردة** (إن وُجدت): «Inventory يقترح بديلًا للابتوب» [اقبل] [تجاهل].
2. **تنبيهات الأسعار** (تجميع): «3 رغبات عبرت سعرك المستهدف (بحسب ملاحظاتك)».
3. **مخطط قريب:** خطط خلال 14 يومًا وحالة التمويل.
4. **تهدئة جارية** (إن فعّلتها).
5. **مرتجعات تقترب مواعيدها.**
6. **مراجعات بانتظارك** (بطاقة واحدة).
7. **التقاط سريع** دائم في الأعلى + زر مشاركة رابط.

**الحالات الأربع:**

| الحالة | العرض |
| :---- | :---- |
| فارغة | «لا رغبات بعد» + أضف أول رغبة / الصق رابطًا / استورد |
| تحميل | هيكل عظمي؛ المحلي فورًا |
| خطأ | رسالة + إعادة محاولة بلا فقد |
| أوفلاين | «غير متصل — كل شيء محفوظ هنا» |

### 10.3 الشاشات بالتفصيل

**التقاط سريع:** حقل واحد (العنوان أو رابط). الرابط ← يُنشأ عرض + رغبة بعنوان مستنتج من النص المدخل (لا جلب)؛ يطلب السعر اختياريًا («رأيت سعرًا؟ [أدخله]»). الغرض الافتراضي «لي».

**بطاقة القرار (تفاصيل الرغبة):** الأقسام بالترتيب:

| القسم | المحتوى |
| :---- | :---- |
| **الحاجة** | Need/Want/Unsure + السبب + الأولوية + «لمن؟» |
| **السعر** | الحالي (أفضل عرض) + تاريخ ملاحظته + شارة «قديم» + الأدنى/المتوسط/الأعلى + منحنى بسيط |
| **التوقيت** | Good/Neutral/Poor أو Unknown + «لماذا؟» (الرتبة، العدد، المدى) |
| **الميزانية** | Within/Tight/Over أو Unknown + مصدر المتاح (هدف/ميزانية/حد) |
| **عندي مثله؟** | None/Possible/Likely + العنصر المطابق + [استبدال] [أحتاج الاثنين] |
| **البدائل** | بطاقات مصغّرة + مزايا/عيوب + زر «قارن» |
| **الدرجة** | رقم + مكوّنات مفصّلة + «بناءً على n من m» + «غيّر الأوزان» |
| **تهدئة** | إن فُعِّلت |
| **القرار** | [Buy] [Wait حتى…] [Reject لسبب] [Replace] — يسجَّل مع لقطة الدرجة؛ **لا شراء** |

**تفاصيل المنتج:** الهوية، العروض (متجر، رابط، آخر سعر وتاريخه، التوافر)، «أضف ملاحظة سعر» (سعر + متجر + تاريخ اليوم افتراضيًا)، مواصفات، صور، تقييمي، ضمان (معلومة)، «أضف للمقارنة».

**تاريخ الأسعار:** رسم خطي لكل عرض (نقاط الملاحظات لا خطًا مستمرًا مصطنعًا)، إحصاءات §6.4، قائمة الملاحظات (مصدر + ملاحظة + تصحيح)، تنبيهات.

**المقارنة:** جدول §6.10 مع تمييز الأفضل، زر «اختر هذا كبديل مختار».

**مخطّط الشراء:** قائمة الخطط بحسب التاريخ؛ لكل خطة: السعر المتوقع، الميزانية، التمويل (%)، التهدئة، زر «جهّز الشراء» ← يفتح تسجيل الشراء معبّأ.

**تسجيل شراء (Sheet):** البنود (من الرغبة/الخطة أو يدويًا) · المتجر · التاريخ · الشحن/الرسوم/الخصم · **الإجمالي** (محسوب ويؤكَّد) · **الدفعات** (دفعة واحدة افتراضيًا؛ «أقساط؟» تضيف) · الإيصال · «أين يذهب؟» لكل بند (Inventory/Home/لا شيء/هدية) · «هل تستبدل شيئًا عندك؟». زر **«سجّل الشراء»** يبدأ Saga ويعرض الحالات: «حُفظ ✓ · المال: قيد الإرسال · الملكية: قيد الإنشاء». الإعادة آمنة.

**المشتريات:** السجل بحالة كل ربط؛ تفاصيل الشراء؛ «إرجاع» ← مرتجع.

**الملكية:** كل بند وحالة ربطه (Created/Pending/Failed/Detached) وزر «أعد المحاولة».

**الهدايا:** مرشَّح بالمستلم/المناسبة؛ ما اشتريته لهم من قبل (من Relationships أو من مشترياتي)؛ ميزانية الهدية.

**الإعدادات:** الأوزان والعتبات (مع «استعادة الافتراضي»)، التهدئة، القدم، التكاملات وموافقاتها، الاستيراد/التصدير/الحذف.

### 10.4 الموبايل والسرعة

- التقاط ≤ 3 ثوانٍ (مشاركة رابط ← حفظ). إضافة ملاحظة سعر ≤ 3 نقرات.
- المتجر الفعلي: شاشة «في المتجر» مبسّطة (بحث عن المنتج ← إضافة سعر ← مقارنة سريعة).
- Share Target للروابط. Widget «+ رغبة».

### 10.5 الوصول واللغة
RTL كامل؛ أرقام لاتينية/هندية؛ ألوان الحالات مع نص؛ قارئ الشاشة يقرأ تفصيل الدرجة؛ `alt` للصور.

### 10.6 قواعد الصياغة (ملزمة)

1. **ممنوع:** عدّادات الندرة والعد التنازلي، «فرصة أخيرة»، «لا تفوّت»، «وفّر الآن»، «أفضل سعر على الإطلاق».
2. **ممنوع:** نصائح مالية صريحة («اشترِ»، «لا تشترِ»)، وأي حكم على الرغبة («تبذير»، «كمالية»).
3. **مسموح:** «أقل من 83% من أسعار ملاحظاتك»، «يميل لـBuy حسب معاييرك»، «المتاح 15,000 (من هدفك)».
4. **السعر دائمًا بتاريخ ملاحظته** ومصدره.
5. **الميزانية:** «ضمن/ضيّق/أعلى من المتاح» لا «تتحمّل/لا تتحمّل».
6. **المراجعة:** «ندم خفيف» وصف لا تقييم للشخص.
7. فحص آلي في CI (SV-30، ST-60).

---

## 11) التكاملات وعقود API

### 11.1 المبادئ
1. Shopping **يعمل كاملًا بلا أي قسم آخر** (§3.3). كل تكامل **اختياري، بموافقة، قابل للإيقاف**.
2. **عقود فقط**؛ المراجع `*_ref`؛ الفشل = تدهور هادئ.
3. **ما يخرج:** لا أسماء مستلمين ولا ملاحظات ولا أسباب في أي حدث أو طلب مالي؛ معرّفات معتمة ومبالغ فقط.
4. أحداث `shopping.{entity}.{verb}` + Outbox + at-least-once + مستهلك idempotent (CX-17).
5. **طلبات التغيير** على الأقسام الأخرى موسومة *(طلب)* ولا نفترض وجودها.

### 11.2 Inventory

| الاتجاه | العقد | ملاحظة |
| :---- | :---- | :---- |
| Shopping → Inventory | `POST /inventory/items/from-source` (Idempotency-Key = `shopping:purchase:{id}:{line_no}`) بحمولة `{name, brand, model, acquired_on, price, currency, warranty_months, seller, replaces_item_ref?}` | **معرَّف في Inventory v4 (§6.16)**؛ صنف واحد لكل بند |
| Shopping → Inventory | حدث `shopping.purchase.completed` | للمعلومة (والهدايا لا تُنشئ شيئًا) |
| Shopping → Inventory | حدث `shopping.purchase.refunded` | يقترح `Disposed/Returned` |
| Inventory → Shopping | حدث `inventory.replacement.needed` `{item_ref, reason, due, budget?}` | يصبّ في **Inbox** بـ`source_key=inv:{replacement_id}` |
| Shopping → Inventory | `PATCH /inventory/replacements/{id}/link` `{wishlist_item_ref}` | بعد القبول |
| Shopping ← Inventory | `GET /inventory/items/search?q=&kind=` | المكافئ المملوك (§6.7) |
| Inventory → Shopping | `inventory.item.disposed` | `ownership_ref_state=Detached` |

**قاعدة:** ضمان المنتج يمرّ **معلومةً** ويُنشأ هناك (CX-06). **تدهور:** بدون Inventory، الملكية «سجّل لاحقًا» والمكافئ من مشترياتي.

### 11.3 Finance

| العقد | الاستخدام |
| :---- | :---- |
| `POST /finance/transactions/from-source` | `source_type=shopping_purchase` *(طلب: نوع جديد)* · `dimensions {shopping_purchase_id}` *(طلب)* · فئة افتراضية «مشتريات شخصية» *(طلب)* · **بلا اسم/ملاحظات/مستلم** |
| `…/from-source` (استرداد) | `shopping_refund` *(طلب)* |
| `PUT /finance/transactions/from-source/{key}` · reverse | تصحيح/عكس (موجودان في v4.1 حسب وثيقته — يُتحقق) |
| `GET /finance/goals/{id}` | تقدّم الادخار (§6.18) |
| `GET /finance/budgets/status?category=` | متبقي الميزانية (§6.6) *(عقد غير مؤكد في v4.1 — طلب)* |
| `GET /finance/exchange-rates/current` | تحويل العملات |
| `GET /finance/summary?source_system=shopping` *(طلب)* | إنفاق Shopping بحسب Finance |

**قواعد:** دفعة حقيقية = معاملة واحدة؛ الأقساط = دفعات؛ الفشل لا يوقف الشراء؛ `Not Required` عند التعطيل. **Finance PriceService منفصل** (CX-21): أسعار المنتجات هنا لا تُرسَل إليه.

### 11.4 Home

| العقد | الاستخدام |
| :---- | :---- |
| `POST /home/items/from-source` *(طلب)* | ملكية بنود `ForHome` المعمَّرة |
| `POST /home/purchases/from-source` *(طلب)* | تحويل «هذا استهلاكي» إلى Home |
| `home.purchase.purchased` | **لا يُستهلك هنا** (Home يملك مشترياته) |

**الحد (CX-05):** Shopping = قرار الشراء للمعمَّر وللشخصي؛ Home = إعادة التزويد والصيانة. **تدهور:** مرجع نصي.

### 11.5 Relationships وTravel وGoals

| القسم | العقد | الاستخدام |
| :---- | :---- | :---- |
| **Relationships** | `GET /relationships/people/search` · `person_ref` · `GET /relationships/occasions?person=` | اختيار المستلم والمناسبة؛ حدث `shopping.purchase.completed` (`purpose=Gift`, `recipient_person_ref`) ← تُسجَّل في سجل الهدية بـ`shopping_purchase_ref`؛ **لا نسخ بيانات الشخص** |
| **Travel** | `travel.trip.*` + `POST /shopping/inbox` | اقتراحات مشتريات الرحلة؛ `trip_ref` على الرغبة؛ لا ملكية للرحلة |
| **Core Goals** | `goal_ref` اختياري | هدف عام «اشترِ لابتوبًا هذا العام»؛ الادخار في Finance |

### 11.6 Today / Calendar / Notifications

- `GET /shopping/feed/today` (حد 5): اقتراحات واردة، تنبيهات الأسعار المجمّعة، خطة قريبة، مرتجع يقترب، مراجعة، تهدئة تنتهي.
- Calendar: تواريخ الخطط والمرتجعات والمواسم المعرَّفة (`source_id`) بلا نسخ.
- الإشعارات عبر Core: ساعات الهدوء، سقف 4 يوميًا، **نص محايد لشاشة القفل** («لديك تحديث في قائمة مشترياتك») دون اسم الهدية أو المبلغ؛ بلا ندرة.

### 11.7 Core Files والبحث والمشاركة

- **Core Files:** إيصالات وصور (Normal/Sensitive).
- **Core Search:** معطّل افتراضيًا؛ عند التفعيل يفهرس عناوين الرغبات `ForMe` Normal فقط (لا هدايا ولا مبالغ).
- **Share Target:** استقبال رابط/نص من نظام التشغيل ← Inbox/التقاط.

### 11.8 الأحداث الصادرة

| الحدث | الحمولة | الافتراضي |
| :---- | :---- | :---- |
| `shopping.purchase.completed` | `{purchase_id, lines:[{name, qty, ownership_target, warranty_months}], purpose, recipient_person_ref?}` بلا مبالغ | ON (للمستهلكين المفعَّلين) |
| `shopping.purchase.refunded` | `{purchase_id, line_nos}` | ON |
| `shopping.wishlist.item.accepted` | `{item_id, source}` (يعلم Inventory بربط الاقتراح) | ON عند الاقتراح الوارد |
| `shopping.decision.recorded` | `{item_id, decision}` | OFF |
| `shopping.data.deleted` | `{scope}` | ON |

### 11.9 واجهة API (REST)

**اتفاقيات:** جلسة المستخدم؛ `Idempotency-Key` على POST/PUT؛ `If-Match: version`؛ أرقام نصية؛ Cursor؛ أخطاء `{code, message_ar, details}`.

| المجموعة | المسارات | أخطاء |
| :---- | :---- | :---- |
| الرغبات | `GET/POST /shopping/wishlist` · `GET/PATCH/DELETE …/{id}` · `POST …/{id}/archive` · `POST …/{id}/restore` · `GET …/{id}/decision-card` | `409 VERSION_CONFLICT` · `422 INVALID_TRANSITION` |
| الالتقاط | `POST /shopping/capture` (عنوان/رابط) | `200` يعيد الموجود عند التكرار |
| المنتجات | `GET/POST /shopping/products` · `PATCH …/{id}` · `POST …/{id}/archive` · `GET/PUT …/{id}/specs` | `409 DUPLICATE_PRODUCT` (تحذير) |
| العروض | `GET/POST /shopping/products/{id}/offers` · `PATCH …/{oid}` | `409 DUPLICATE_URL` (يعيد الموجود) |
| الأسعار | `GET /shopping/prices?offer=&product=` · `POST /shopping/prices` · `POST /shopping/prices/{id}/correct` · `POST /shopping/prices/import` | `403 IMMUTABLE` عند PATCH/DELETE |
| التنبيهات | `GET/POST /shopping/alerts` · `PATCH …/{id}` | |
| القرارات | `GET/POST /shopping/decisions` · `GET /shopping/decisions/score-preview` | |
| البدائل | `GET/POST /shopping/wishlist/{id}/alternatives` · `PATCH …/{aid}` · `POST …/{aid}/select` | `409 SELECTED_EXISTS` |
| المقارنة | `POST /shopping/compare` `{product_ids[2..5]}` · `GET/POST /shopping/comparisons` | `422 COMPARE_RANGE` |
| الخطط | `GET/POST /shopping/planned-purchases` · `PATCH …/{id}` · `POST …/{id}/snooze` · `POST …/{id}/ready` | `409 PLAN_EXISTS` |
| المشتريات | `GET/POST /shopping/purchases` · `GET/PATCH …/{id}` · `POST …/{id}/retry` · `POST …/{id}/cancel` | `409 ALREADY_RECORDED` (يعيد الموجود) · `502 FINANCE_UNAVAILABLE` (يُجدول) |
| الدفعات | `POST /shopping/purchases/{id}/payments` | `409 PAYMENT_DUPLICATE` |
| المرتجعات | `GET/POST /shopping/returns` · `PATCH …/{id}` · `POST …/{id}/refunded` | `422 REFUND_EXCEEDS` |
| المراجعات | `GET/POST /shopping/reviews` | |
| الملكية | `GET /shopping/ownership` · `POST …/{id}/retry` | |
| Inbox | `GET /shopping/inbox` · `POST /shopping/inbox` (من مصدر) · `POST …/{id}/accept` · `POST …/{id}/dismiss` | |
| التصنيفات/المتاجر/المواسم/المواصفات | `GET/POST/PATCH` على `/shopping/categories|merchants|sale-events|spec-defs` | `409 IN_USE` |
| التحليلات | `GET /shopping/analytics?from=&to=` · `GET /shopping/dashboard` · `GET /shopping/feed/today` | |
| الاستيراد/التصدير | `POST /shopping/import` (dry-run/apply) · `POST /shopping/export` | |
| المزامنة | `POST /shopping/sync/push` · `GET /shopping/sync/pull?since=` | `409` لكل عملية |
| الإعدادات | `GET/PATCH /shopping/settings` · `GET /shopping/capabilities` | |
| إعادة البناء | `POST /shopping/rebuild` | |
| الخصوصية | `POST /shopping/data/delete` | إعادة مصادقة |

---

## 12) الأتمتة (Automations)

> كلها **Idempotent** بمفتاح، تحترم ساعات الهدوء وسقف الإشعارات، قابلة للإيقاف فرديًا، ونصوصها بلا ندرة ولا لوم.

| # | الأتمتة | المشغّل | المفتاح | الافتراضي |
| :---- | :---- | :---- | :---- | :---- |
| SA-01 | استيراد/التقاط الأسعار (من مشاركة/CSV/إدخال) | وصول ملاحظة | `client_op_id` | ON |
| SA-02 | تنبيه السعر (BelowTarget/DropPct/LowestInDays/BackInStock) | ملاحظة جديدة | `alert:{id}:obs:{obs}` | ON للتنبيهات التي أنشأها المستخدم |
| SA-03 | تذكير الشراء المخطط | `reminder_at` / `target_date` | `(plan, date)` | ON |
| SA-04 | **تمرير معلومة الضمان إلى Inventory** (يحل «Warranty reminder» — CX-06) | عند الشراء | مفتاح الصنف | ON إن فُعِّل Inventory |
| SA-05 | كشف التكرار (رابط/منتج/رغبة) | عند الإضافة | `(user, hash)` | ON |
| SA-06 | purchase → Finance | شراء مسجَّل | `shopping:payment:{id}` | ON إن فُعِّل Finance |
| SA-07 | purchase → Inventory/Home | شراء مسجَّل | `shopping:purchase:{id}:{n}` | ON إن فُعِّلا |
| SA-08 | مراجعة ما بعد الشراء | `purchased_on + review_after_days` | `(line,'review')` | ON (بطاقة واحدة) |
| SA-09 | تذكير آخر موعد إرجاع | `return_by − 2` | `(return,'due')` | ON |
| SA-10 | إعادة محاولة الربط الفاشل | `Failed` | مفتاح الخطوة | ON |
| SA-11 | انتهاء التهدئة | `cooling_off_until` | `(plan,'cool')` | ON إن فُعِّلت |
| SA-12 | قدم السعر: وسم «قديم» | يوميًا | — | ON |
| SA-13 | اقتراح أرشفة رغبات راكدة | أسبوعيًا | `(user, week)` | OFF |
| SA-14 | انتهاء الاقتراحات الواردة (30 يومًا) | يوميًا | `(proposal,'exp')` | ON |
| SA-15 | تحديث المراجع (`Valid/Missing`) | حدث حذف | `(ref,event)` | ON |
| SA-16 | حذف نهائي بعد المهلة | يوميًا | `(entity,'purge')` | ON |
| SA-17 | إعادة بناء المشتقات | تغيّر مدخل | `inputs_hash` | ON |

**الإشعارات:** تجميع تنبيهات الأسعار في بطاقة واحدة يوميًا (Digest) بدل إشعار لكل ملاحظة؛ لا إشعار بالاسم لـSensitive.

---

---

## 13) العمل أوفلاين والمزامنة

### 13.1 المبدأ
كل شيء يعمل محليًا أولًا (التقاط، رغبات، ملاحظات سعر، قرارات، مقارنات، خطط، تسجيل شراء). المزامنة خلفية، وكل عملية لها `client_op_id` فريد (`shopping_client_ops`) فتُعاد بلا تكرار. حالة كل سجل: `Synced | Pending | Conflict`.

### 13.2 التخزين المحلي
- قاعدة محلية مشفّرة (SQLCipher/IndexedDB مشفّر) تحمل الكيانات في §5 ما عدا الواردات الثقيلة و`shopping_external_cache`.
- المشتقات (`shopping_derived_cache`) تُحسب محليًا بنفس الخوارزميات في §6 وتُعاد عند تغيّر `inputs_hash` (SA-17)؛ الخادم هو المرجع عند التعارض.
- الصور والإيصالات: مرفقات Core Files تُرفع عند الاتصال؛ محليًا نسخة مصغّرة فقط.

### 13.3 طابور العمليات
| النوع | الترتيب | ملاحظة |
| :---- | :---- | :---- |
| إنشاء/تعديل رغبة أو منتج | حسب `client_ts` ثم `seq` | يُحمل `version` للتحقق |
| ملاحظة سعر | إلحاق فقط، لا ترتيب مطلوب | المفتاح `(offer_id, observed_at, price, source)` يمنع التكرار |
| قرار | إلحاق فقط | قرار جديد لا يعدّل القديم |
| تسجيل شراء | بعد المنتج/الرغبة في نفس الطابور | `source_key` يُولَّد عند الإنشاء ويُحفظ |
| دفعة / مرتجع | بعد الشراء | مفتاح `payment_key` / `return_key` |
| استدعاءات Finance/Inventory/Home | **ليست من الطابور** — تُنفَّذ على الخادم بعد المزامنة (Saga §6.12) | لا اتصال مباشر من الجهاز |

### 13.4 جدول التعارض والدمج
| الحالة | القرار |
| :---- | :---- |
| ملاحظتا سعر من جهازين لنفس العرض واللحظة والسعر | تُدمجان في واحدة (نفس المفتاح) |
| ملاحظتا سعر مختلفتان | تُحفظان كلتاهما (إلحاق فقط)؛ الأحدث `observed_at` هو الحالي |
| جهازان يسجّلان نفس الشراء بمفتاحين مختلفين | يُكتشف احتمال التكرار (نفس الرغبة + المتجر + المبلغ + ±1 يوم) → بطاقة «هل هذا نفس الشراء؟» بدمج يدوي؛ لا حذف تلقائي |
| تعديل على جهاز وحذف على آخر | الحذف الناعم يربح إن لم يوجد شراء/قرار؛ وإلا **التعديل يربح** ويُسترجع العنصر مع إشعار |
| تعديل حقل واحد من جهازين (حقول مختلفة) | دمج على مستوى الحقل |
| تعديل نفس الحقل | `Conflict` → شاشة اختيار «نسختي/النسخة الأخرى» |
| ساعة الجهاز خاطئة (فرق > 10 دقائق) | الخادم يعتمد `server_received_at` للترتيب ويحتفظ بـ`client_ts` للعرض؛ تحذير في الإعدادات |
| شراء أُرسل ثم أُلغي على جهاز آخر | الإلغاء مسموح فقط قبل أي ربط Finance؛ بعده يتحوّل إلى مرتجع/تصحيح |
| مفتاح idempotency مكرر بمحتوى مختلف | `422 KEY_REUSE_MISMATCH` |

### 13.5 ما لا يعمل أوفلاين
- ربط Finance والملكية (تُعرض «قيد المزامنة»)، وبحث Core Search، وتنزيل صور المنتجات الجديدة.
- ما عدا ذلك يعمل كاملًا، وشارة «غير متزامن» ظاهرة على الشاشة.
- **طابور المشاركة (Share-target):** الروابط المشاركة من التطبيقات تُحفظ في Inbox محليًا حتى فتح التطبيق، بلا جلب لصفحة المتجر.

---

## 14) الأمان والخصوصية

### 14.1 مستويات الخصوصية (CX-17)
| البيانات | المستوى | المعاملة |
| :---- | :---- | :---- |
| رغبات/منتجات عادية | Normal | ظاهرة في البحث والفيد |
| هدايا والمستلمون وميزانياتهم | Sensitive | لا تظهر في البحث العام/الويدجت/الإشعارات بالاسم؛ تُخفى المبالغ عند `mask_amounts` |
| عناصر موسومة سرّية (مفاجآت، مشتريات حساسة) | Secret | إعادة مصادقة للعرض، خارج `feed/today` والتصدير الافتراضي |
| الإيصالات | حسب `sensitivity` الملف | عبر Core Files فقط |

### 14.2 الضوابط
- كل استعلام يُفلتر بـ`user_id` من الجلسة على الخادم؛ لا يُقبل `user_id` من العميل.
- Row-Level Security على كل الجداول + FK مركّب `(parent_id, user_id)`.
- Rate limit على الالتقاط والاستيراد والـAPI؛ حدود حجم لـCSV والمرفقات.
- سجل تدقيق `shopping_audit_log` للعمليات الحساسة (حذف، تصدير، تغيير الخصوصية) بلا قيم المبالغ.
- الروابط: تُنقّح معاملات التتبع (utm وغيرها) قبل الحفظ؛ لا تُطلب صفحة المتجر من الخادم افتراضيًا (لا scraping).
- إشعارات شاشة القفل **محايدة**: «لديك تذكير في التسوّق» بدل اسم المنتج لـSensitive/Secret.
- لا تُرسل أسماء المنتجات أو الملاحظات أو أسماء الأشخاص إلى Finance (CX-04)؛ فقط المبلغ والعملة والتاريخ والتصنيف والأبعاد.

### 14.3 موافقة التكامل
كل تكامل (Finance، Inventory، Home، Relationships، Travel) له مفتاح تفعيل منفصل في الإعدادات (`shopping_integration_state`) مع شرح ما يُرسَل بالضبط. الإيقاف يضع الروابط `Detached` ولا يحذف شيئًا.

### 14.4 الامتثال
تُراعى مبادئ القانون المصري 151 لسنة 2020 لحماية البيانات الشخصية كمرجع عام (تقليل البيانات، الغرض المحدد، حق الحذف والتصدير) — وهذا ليس استشارة قانونية؛ يُراجَع مع مختص قبل الإطلاق.

### 14.5 التصدير والحذف
- التصدير JSON/CSV بإعادة مصادقة، ويستثني Secret ما لم يُختَر صراحة.
- حذف الحساب/البيانات: `POST /shopping/data/delete` بإعادة مصادقة، حذف ناعم 14 يومًا (Tombstones) ثم نهائي؛ يُرسل حدث `shopping.data.deleted` ليُنظّف المستهلكون مراجعهم (تصير `Missing`).
- حذف Finance المرتبط **لا يتم تلقائيًا**: يُعرض للمستخدم قرار صريح.

---

## 15) الهجرة والاستيراد

### 15.1 الواقع
لا توجد بيانات Shopping حقيقية مؤكَّدة في Notion (القالب 🛒 Wishlist and Shopping بصفوف لم تُفحص كلها — **غير مؤكد: عدد الصفوف الفعلي**). لذا الهجرة اختيارية ولا يتوقف بناء النظام عليها.

### 15.2 استيراد Notion (اختياري)
| حقل Notion | يُحوَّل إلى | ملاحظة |
| :---- | :---- | :---- |
| الاسم | `title` | |
| Wishlist/Shopping (select) | Wishlist ← `status=Idea`؛ Shopping ← `status=Planned` | يحتاج تأكيدك (SD-10) |
| Shopping Types (تسميات المستلم) | `purpose` + `recipient_label` نصي | **ليست أشخاصًا** ولا تُنشئ Person؛ الربط بـRelationships يدوي لاحقًا |
| EG Price / USD Price | `estimated_price` + `currency` (الأساسية EGP) والأخرى `secondary_price` | لا تحويل تلقائي |
| Qty | `quantity` | |
| URL | عرض (`offer`) بعد التنقيح ومنع التكرار | |
| Website (Ebay/Amazon/B&H) | `merchant` | تُنشأ المتاجر المفقودة |
| Status: FIRST / SOON / IN FUTURE | `priority` = High / Medium / Low | مقترح — يحتاج تأكيدك |
| Status: TO BUY | `status=Planned` | |
| Status: Done | `status=Bought` (بلا شراء؛ `legacy`) | لا يُنشأ Finance link |
| Status: Not started | `status=Idea` | |
| Reason / Select (فارغان) | `reason` إن وُجد | |

- **🛒 Home Shopping لا يُستورد** (ملك Home)، إلا صفوفًا يختارها المستخدم صراحة كمقتنيات دائمة، فتُنشأ رغبات `ForHome`.
- صفحة «Skincare Wishlist»: يدوي/CSV.

### 15.3 الإعداد الأول (Onboarding)
1. اللغة والعملة الأساسية (EGP افتراضيًا) والمنطقة الزمنية.
2. التصنيفات الافتراضية (إلكترونيات، ملابس، منزل، هدايا، أخرى) قابلة للتعديل.
3. اختيار التكاملات (كلها اختيارية).
4. اختيار: «ابدأ فارغًا» / «استيراد CSV» / «استيراد Notion».
5. تفعيل التبريد (Cooling-off) — افتراضيًا **OFF**.

### 15.4 استيراد CSV (Dry-run ثم تطبيق)
- القالب: `title, category, purpose, need_level, priority, price, currency, merchant, url, status, notes`.
- Dry-run يعرض: صفوف سليمة، مكررة (بـ`url_hash` أو التطابق النصي)، أخطاء، ثم يُطبّق بعد التأكيد.
- `source_key = csv:{job_id}:{row_no}` يضمن عدم تكرار الاستيراد.
- النسخة الاحتياطية تلقائية قبل التطبيق (`shopping_import_jobs`) مع إمكانية التراجع 7 أيام.
- حدود: 5000 صف للملف، 50 عمودًا.

---

## 16) اختبارات القبول (ST)

### 16.1 الاختبارات العشرة من المصدر
| # | الاختبار | النتيجة المتوقعة |
| :---- | :---- | :---- |
| ST-01 | السعر الحالي مشتق | يساوي آخر ملاحظة صالحة، ولا يُحرَّر يدويًا (PATCH → 403) |
| ST-02 | ملاحظات السعر لا تتغير | PATCH/DELETE → `403 IMMUTABLE`؛ التصحيح يُنشئ ملاحظة `Corrected` |
| ST-03 | المقارنة تعمل | 2–5 منتجات؛ 1 أو 6 → `422 COMPARE_RANGE` |
| ST-04 | القرار لا يشتري | إنشاء قرار Buy لا ينشئ شراءً ولا Finance |
| ST-05 | الشراء يُنشئ رابط Finance واحدًا لكل دفعة فعلية | دفعة واحدة → رابط واحد |
| ST-06 | الإعادة idempotent | إعادة الشراء/الحفظ بنفس `source_key` → لا تكرار |
| ST-07 | مرجع الملكية يُنشأ | سطر شراء → `shopping_ownership_refs` واحد لكل هدف |
| ST-08 | تذكير الضمان | معلومة `warranty_months` تنتقل إلى Inventory ويصل التذكير من Inventory فقط |
| ST-09 | المكافئ الموجود يظهر | Likely/Possible في بطاقة القرار |
| ST-10 | الأرشفة توقف التنبيهات | لا تنبيه لعنصر مؤرشف، والتاريخ والبحث باقيان |

### 16.2 الأسعار والتوقيت
| # | الاختبار | المتوقع |
| :---- | :---- | :---- |
| ST-11 | تاريخ [900,950,1000,1000,1100,1200] والسعر 920 | الترتيب المئوي 16.67 → Good Time |
| ST-12 | أقل من 3 ملاحظات | التوقيت Unknown بلا تلوين |
| ST-13 | الملاحظات تمتد أقل من 14 يومًا | Unknown |
| ST-14 | سعر أقدم من 14 يومًا | وسم «قديم» ولا يدخل Good/Poor |
| ST-15 | تغيّر العملة لنفس المنتج | لا مقارنة عبر العملات؛ تنبيه «عملة مختلفة» |
| ST-16 | لا سعر حالي | البطاقة تعرض «لا سعر» ولا خطأ، والدرجة تُحسب بالأوزان المتاحة |
| ST-17 | رابط مكرر (بعد التنقيح من utm) | `409 DUPLICATE_URL` ويعيد الموجود |
| ST-18 | تنبيه انخفاض سعر | يُطلَق مرة لكل `alert_fire` ويدخل Digest |
| ST-19 | إدخال سعر من مصدر `Provider` غير مفعّل | مرفوض بوضوح |
| ST-20 | قيمة سعر بنص غير رقمي أو سالبة | `422` |

### 16.3 الميزانية والدرجة والبدائل
| # | الاختبار | المتوقع |
| :---- | :---- | :---- |
| ST-21 | نسبة الميزانية ≤0.70 | Within |
| ST-22 | بين 0.70 و1.00 | Tight |
| ST-23 | أكبر من 1.00 | Over |
| ST-24 | لا هدف ولا ميزانية | Unknown وليس Within |
| ST-25 | أولوية المصادر | هدف Finance ثم الميزانية ثم ميزانية الخطة |
| ST-26 | الدرجة قابلة للتفسير | `score_breakdown` مجموعه يطابق الدرجة (مثال 79 و72) |
| ST-27 | تغيير الأوزان في الإعدادات | الدرجة الجديدة تُحسب ولا تُعدَّل القرارات القديمة |
| ST-28 | Jaccard ≥0.30 | Possible/Likely حسب العتبات |
| ST-29 | مكافئ مُتخلَّص منه (Disposed) | لا يُحتسب مكافئًا |
| ST-30 | بديل مختار واحد فقط | الثاني `409 SELECTED_EXISTS` |
| ST-31 | تبريد مفعّل | القرار Buy يتأجل حتى انتهاء المدة مع إمكانية التجاوز بسبب |
| ST-32 | تبريد معطّل (افتراضي) | لا تأخير |
| ST-33 | تغيير القرار بعد الشراء | قرار `PostPurchase` جديد، لا تعديل للقديم ولا للشراء |

### 16.4 الخطة والتمويل
| # | الاختبار | المتوقع |
| :---- | :---- | :---- |
| ST-34 | خطة نشطة واحدة لكل رغبة | الثانية `409 PLAN_EXISTS` |
| ST-35 | نسبة التمويل من هدف Finance | تُقرأ من Finance ولا تُخزَّن كحقيقة |
| ST-36 | Finance غير متاح | الخطة تعمل بلا نسبة والبطاقة «تعذّر الحساب» |
| ST-37 | تذكير خطة مؤجَّل (snooze) | يعاد في الموعد الجديد فقط |
| ST-38 | تاريخ مستهدف في الماضي | تحذير ويمكن الحفظ |

### 16.5 الشراء والـSaga
| # | الاختبار | المتوقع |
| :---- | :---- | :---- |
| ST-39 | شراء متعدد السطور | تخصيص التكلفة الفعلية (مثال 975/2925) متسق ومجموعه = الإجمالي |
| ST-40 | تقسيط 3 دفعات | ثلاثة روابط Finance، واحد لكل دفعة فعلية |
| ST-41 | فشل Finance في خطوة | الشراء محفوظ، الرابط `Failed`، والملكية تستمر |
| ST-42 | إعادة الـSaga بعد فشل | لا تكرار للروابط الناجحة |
| ST-43 | فشل الملكية فقط | Finance سليم ويمكن `POST …/ownership/{id}/retry` |
| ST-44 | شراء مسجل مرتين (نفس `source_key`) | `409 ALREADY_RECORDED` ويعيد الموجود |
| ST-45 | `PAYMENT_DUPLICATE` | منع نفس الدفعة مرتين |
| ST-46 | Finance معطّل في الإعدادات | الروابط `Not Required` ولا أخطاء |
| ST-47 | الحدث `shopping.purchase.completed` | يُنشر عبر outbox مرة على الأقل ويحمل `warranty_months` |
| ST-48 | إلغاء شراء قبل أي ربط | مسموح؛ بعد الربط يُرفض ويُوجَّه للمرتجع |
| ST-49 | مرتجع جزئي | الاسترداد ≤ المدفوع، وإلا `422 REFUND_EXCEEDS` |
| ST-50 | مرتجع مؤكد | `shopping.purchase.refunded` + طلب `shopping_refund` إلى Finance |
| ST-51 | هدية من Shopping | Relationships تحمل `shopping_purchase_ref` ولا رابط Finance ثانٍ |
| ST-52 | عنصر منزلي (ForHome) | يُوجَّه إلى Home عبر `POST /home/items/from-source` |

### 16.6 التكامل والتدهور
| # | الاختبار | المتوقع |
| :---- | :---- | :---- |
| ST-53 | Inventory غير متاح | شاشة الملكية «قيد الانتظار» والشراء سليم |
| ST-54 | `inventory.replacement.needed` | يظهر في Inbox كمقترح، ولا شراء تلقائي |
| ST-55 | قبول مقترح من Inbox | تُنشأ رغبة بمصدرها، والرفض لا يعيد المقترح نفسه |
| ST-56 | مرجع مفقود (Missing) | يعرض الـsnapshot مع وسم، بلا انهيار |
| ST-57 | `feed/today` | يستثني Sensitive/Secret ويحترم المنطقة الزمنية |

### 16.7 الخصوصية والأوفلاين والاستيراد
| # | الاختبار | المتوقع |
| :---- | :---- | :---- |
| ST-58 | إشعار شاشة القفل لهدية | نص محايد بلا اسم |
| ST-59 | `mask_amounts` | المبالغ مخفية في القوائم والويدجت |
| ST-60 | فحص الصياغة في CI | لا عبارات لوم أو نصيحة مالية/استثمارية في نصوص الواجهة |
| ST-61 | محاولة قراءة بيانات مستخدم آخر | 404 (RLS) |
| ST-62 | عمل أوفلاين كامل ثم مزامنة | لا فقد ولا تكرار، وحالة Synced |
| ST-63 | ملاحظتا سعر متطابقتان من جهازين | تُدمجان في واحدة |
| ST-64 | تعديل/حذف متعارضان | التعديل يربح عند وجود شراء/قرار |
| ST-65 | CSV Dry-run | لا تغيير قبل التأكيد، وإعادة التطبيق لا تكرّر |
| ST-66 | استيراد Notion Status | يطابق جدول §15.2 ولا ينشئ Finance link لـDone |
| ST-67 | تصدير يستثني Secret افتراضيًا | صحيح |
| ST-68 | حذف البيانات | يُرسل `shopping.data.deleted` ويصير المستهلكون `Missing` |
| ST-69 | إعادة بناء المشتقات | نفس النتائج بعد `POST /shopping/rebuild` |
| ST-70 | تنقيح الرابط | utm يُزال ولا يُجلب الرابط من الخادم |

---

## 17) الخدمات وترتيب البناء

### 17.1 الخدمات
| الخدمة | المسؤولية |
| :---- | :---- |
| WishlistService | الرغبات، الحالات، الأرشفة |
| ProductService | المنتجات والمواصفات والصور |
| OfferService | العروض والمتاجر وتنقيح الروابط |
| PriceTrackingService | ملاحظات الأسعار والتنبيهات والمشتقات |
| DecisionService | القرارات والدرجة والتبريد |
| AlternativeService | البدائل |
| CompareService | المقارنة |
| PurchasePlannerService | الخطط والتمويل والتذكير |
| PurchaseService | الشراء والدفعات والـSaga |
| ReturnService / ReviewService | المرتجعات والمراجعات |
| ShoppingRecommendationService | بطاقة القرار والتوقيت والمكافئ |
| ShoppingFinanceIntegrationService | عقد Finance `from-source` والمرتجعات |
| OwnershipIntegrationService | Inventory/Home والإعادة |
| InboxService | الواردات والهدايا والاستبدالات |
| SearchService / ImportService / ExportService | بحث، استيراد، تصدير |
| SyncService / PrivacyService / IntegrationService | مزامنة، خصوصية، تفعيل التكاملات |

### 17.2 مراحل البناء
| المرحلة | المحتوى | اختبارات |
| :---- | :---- | :---- |
| P0 | الهيكل، RLS، الإعدادات، التصنيفات، outbox، المزامنة الأساسية | ST-61، ST-62 |
| P1 | الرغبات والالتقاط والمنتجات والعروض | ST-10، ST-17 |
| P2 | ملاحظات الأسعار والمشتقات والتنبيهات | ST-01، 02، 11–20 |
| P3 | القرارات والبدائل والمقارنة والمكافئ والتبريد | ST-03، 04، 09، 21–33 |
| P4 | الخطط والتمويل (قراءة Finance) | ST-34–38 |
| P5 | الشراء والـSaga والدفعات والملكية | ST-05–08، 39–48، 52–53 |
| P6 | المرتجعات والمراجعات وInbox | ST-49–51، 54–56 |
| P7 | الاستيراد والتصدير والهجرة | ST-65، 66، 67 |
| P8 | الخصوصية الكاملة، Today، الأوفلاين المتقدم، ثم تثبيت الجودة | ST-57–60، 63، 64، 68–70 |

---

## 18) القرارات المفتوحة (SD)

| # | القرار | التوصية الافتراضية |
| :---- | :---- | :---- |
| SD-01 | الأوزان الافتراضية للدرجة (need25/priority15/budget25/timing15/equivalent10/cooling10) | اعتمادها وإتاحة الضبط |
| SD-02 | مزوّد أسعار مرخّص أو لا | لا scraping؛ إدخال يدوي/مشاركة/CSV الآن. **غير مؤكد — يُتحقق قبل البناء** |
| SD-03 | مدة التبريد الافتراضية | OFF، وعند التفعيل 48 ساعة |
| SD-04 | عتبات التوقيت Good ≤25 / Poor ≥75 وحد أدنى 3 ملاحظات و14 يومًا | اعتمادها |
| SD-05 | عتبات الميزانية 0.70 و1.00 | اعتمادها |
| SD-06 | قائمة رغبات قابلة للمشاركة | مؤجّل |
| SD-07 | معالجة التقسيط في Finance (دفعة = معاملة؟) | معاملة لكل دفعة فعلية — تحتاج تأكيد Finance |
| SD-08 | الفهرسة في Core Search | اختياري (`search_index_optin`) وبدون Sensitive |
| SD-09 | العملات الأجنبية في Finance | تُرسل بعملتها الأصلية إن دعمها Finance وإلا EGP يدويًا |
| SD-10 | تحويل حالات Notion (FIRST→High…) | يحتاج تأكيدك قبل الاستيراد |
| SD-11 | عمر «السعر القديم» (14 يومًا) | اعتماده |
| SD-12 | التصنيف الافتراضي لمصروف الشراء في Finance | فئة «مشتريات» قابلة للتعيين لكل تصنيف Shopping |
| SD-13 | هل «Done» في Notion يُنشئ شراءً تاريخيًا | لا، يبقى `legacy` |
| SD-14 | مدة الاحتفاظ بالحذف الناعم | 14 يومًا |

---

## 19) مصفوفة التغطية والخلاصة

### 19.1 مصفوفة التغطية
| قسم المصدر | موضعه هنا |
| :---- | :---- |
| 1 الهدف | الرأس، §4 |
| 2 الملكية | §3، §11 |
| 3 الشاشات | §10 |
| 4 Wishlist Items | §5.2، §9.1 |
| 5 Products | §5.3 |
| 6 Price Observations | §5.4، §6.1 |
| 7 Purchase Decisions | §5.5، §6.13 |
| 8 Alternatives | §5.5 |
| 9 Planned Purchases | §5.6 |
| 10 Purchases | §5.7، §6.12 |
| 11 Ownership Reference | §5.7، §11.2، §11.4 |
| 12 قرار الشراء | §6 |
| 13 Compare | §5.5، §10.3 |
| 14 Automation | §12 |
| 15 Integrations | §11 |
| 16 Services | §17 |
| 17 APIs | §11.9 |
| 18 Edge Cases | §7، §9، §13 |
| 19 Acceptance Tests | §16 (ST-01…ST-10) |
| القواعد المشتركة (9) | §3.3، §5.0، §14، §13 |

### 19.2 الخلاصة
**ما يحتاج قرارك:** SD-02 (مزوّد الأسعار)، SD-07 (التقسيط)، SD-10 (تحويل حالات Notion)، ثم باقي القرارات بتوصياتها الافتراضية.

**طلبات التغيير على الأنظمة الأخرى:**
- **Finance:** `source_type` جديد `shopping_purchase` و`shopping_refund`، بُعد `shopping_purchase_id`، تصنيف افتراضي، دعم عملة أجنبية، وقراءة المتبقي من الميزانية/تقدّم الهدف.
- **Inventory:** معرَّف مسبقًا (`POST /inventory/items/from-source`، `GET /inventory/items/search`، `inventory.replacement.needed`).
- **Home:** `POST /home/items/from-source` و`POST /home/purchases/from-source`.
- **Relationships:** سجل الهدية يحمل `shopping_purchase_ref` ولا يُنشئ رابط Finance ثانيًا.

**ما هو غير مؤكد:** عدد صفوف Notion الفعلي، ومزوّد الأسعار، ودعم Finance للتقسيط والعملات.
