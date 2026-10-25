# 🧳 Personal Inventory OS — خطة العمل الموحّدة والكاملة (الإصدار 4.0)

**الغرض:** وثيقة بناء **مكتفية بذاتها** لتطبيق **دفتر الممتلكات الشخصية** (ويب + موبايل، عربي RTL، يعمل أوفلاين كاملًا): أين شيئي؟ ما رقمه التسلسلي؟ هل ضمانه ساري؟ مَن استعاره؟ متى أحتاج بديلًا؟ يعمل **كقسم مستقل تمامًا**، ومرتبط بأنظمتك (Shopping، Finance، Home، Relationships، Travel، Sports، Today، Core) عبر **عقود API/Events فقط** — بلا جداول مشتركة ولا نسخ كيانات. نفس فلسفة وثائق Learning OS v4.0 وFinance OS v4.1 وNutrition OS v4.0 ونفس هيكلها، بما يناسب طبيعة الممتلكات: **قيمة مالية، أماكن حساسة، تاريخ ملكية لا يُمحى، وأشياء تُعار وتضيع وتُباع**.

> **هذه الوثيقة تحلّ محلّ الملفين السابقين بالكامل** (`PERSONAL_INVENTORY_OS_Independent_Build_Spec.md` EN و`PERSONAL_INVENTORY_OS_وثيقة_البناء_المستقلة_العربية.md` AR). كل بند فيهما موجود هنا (انظر **مصفوفة التغطية في §19**) مع حسم تعارضاتهما الداخلية ومع بقية الأقسام وسد الفجوات. لا يُرسَل الملفان القديمان لمنفّذ التطبيق كي لا تعود التعارضات.

**ما دخل في المراجعة:**

1. مواصفتا المصدر (EN + AR): 18 قسمًا + «قواعد التنفيذ المشتركة» (10 قواعد).
2. **Notion (قراءة فقط):** وجدت قاعدة **📦 Home Inventory** داخل «HOME HUB OS» (§1.2). لم أجد قاعدة ممتلكات شخصية مستقلة.
3. وثائق **Learning OS v4.0** و**Finance OS v4.1** كقالب البنية وعقد `from-source`، و**Home OS v4.0** لتحديد الحد بين الممتلكات الشخصية وممتلكات المنزل (CX-04).
4. **القرارات المشتركة CX-01…CX-22** (ملزمة) وأُشير إليها حيث تطبَّق.

**المرجع الأعلى عند التعارض:** هذه الوثيقة ← سلوك Notion الفعلي ← مواصفتا المصدر.

> **تنبيه أمانة:** هذه الوثيقة أداة **تنظيم وتتبّع** وليست استشارة قانونية أو تأمينية أو مالية أو ضريبية. تقديرات القيمة والإهلاك **معلومات تقريبية يدخلها المستخدم أو تُحسب بمعادلات مبسطة موسومة «تقدير»**، ولا تدخل في صافي الثروة. أي ادعاء عن قانون أو مزوّد خارجي غير مفحوص موسوم **«غير مؤكد — يُتحقق قبل البناء»**.

> **مفاتيح القراءة:** `IF-xx` ميزة محفوظة من المصدر · `IC-xx` تعارض محسوم · `IG-xx` فجوة مسدودة · `IE-xx` تحسين مضاف · `ID-xx` قرار يحتاج تأكيدك (بتوصية افتراضية) · `IV-xx` قاعدة تحقق · `IA-xx` أتمتة · `IT-xx` اختبار قبول. (الحرف **I** = Inventory، حسب CX-18.) و`CX-xx` = القرارات المشتركة بين الأقسام.

---

## 1) مراجعة المصدر وحكم على كل عنصر

### 1.1 ما الذي يقوله المصدر (ملخص أمين)

المصدر نظام ممتلكات شخصية من 11 شاشة و9 خدمات و8 مجموعات API، كياناته: **Items، Categories، Locations، Ownership Events، Warranty Records، Replacement Plans، Attachments**، مع Valuation (`current − purchase`). نقاط قوته: **سجل الملكية الذي لا يُمسح**، فصل الضمان والاستبدال في جداول، قاعدة «لا تنشئ Purchase تلقائيًا من خطة الاستبدال»، ومبدأ «لا تعرض قيمة مجهولة كحقيقة»، وحدود واضحة مع Home.

لكنه مختصر، ويترك فجوات تنفيذية كبيرة (عناصر بالكمية، حزم وملحقات، أكثر من رقم تسلسلي، أكثر من ضمان، إعارة بتفاصيلها، مطالبات الضمان، أصول تباع، جرد دوري، خصوصية أماكن الأشياء الثمينة، عملات متعددة، أوفلاين) وفيه تعارضات داخلية (§7).

### 1.2 نتيجة فحص Notion (قراءة فقط — لم يُعدَّل شيء)

| ما وُجد | المسار | ماذا يحوي (حسب المخطط) | الحكم |
| :---- | :---- | :---- | :---- |
| **📦 Home Inventory** (قاعدة بيانات) | HOME HUB OS | `Item Name`, `Item Type` (**Consumable / Asset**), `Category` (Food, Cleaning Products, Personal/Home Supplies, **Electronics, Tools, Furniture**, General), `Quantity`, `Unit` (pcs, kg, g, L, ml, box, pack, bottle, roll, other), `Minimum Stock`, `Unit Cost`, صيغة `Total Value`, صيغة `Stock Status`, `Storage Location` (Fridge, Freezer, Cabinet, Closet, Drawer, Shelf, Garage, Other), علاقة `Room / Location`, `Supplier`, `Model`, `Serial Number`, `Purchase Date`, `Warranty Until`, `Expiry Date`, علاقة `Maintenance Issues`, علاقة `Shopping Item`, `Notes` | **قاعدة منزلية مختلطة**: المستهلكات (طعام، منظفات) ملك **Home**؛ صفوف `Item Type = Asset` من فئات Electronics/Tools/Furniture قد تكون **منزلية** (ثلاجة، أريكة) فتبقى في Home أو **شخصية** (لابتوب، كاميرا) فتُرحَّل هنا. القرار **لكل صف على المستخدم** (§15.2). |
| **التأمين على الممتلكات** | Damen's / Mostafa Magdy / VIDEOS IDEAS | صفحة فكرة فيديو (محتوى) | **خارج النطاق** (محتوى ContentOS) |
| **🏋️ نظام اللياقة بتاعي** | الجذر | تدريب ومقاييس جسم | **ملك Sports** (CX-08)؛ يظهر هنا فقط «عتاد» اختياري (IG-24) |

> **الخلاصة:** لا توجد بيانات ممتلكات شخصية قائمة تُرحَّل تلقائيًا. المتاح: **ترحيل اختياري يدوي القرار لصفوف Asset** من Home Inventory (Notion) + Onboarding موجَّه + استيراد CSV (§15). لم أفحص **صفوف** القاعدة (قد تكون فارغة أو قليلة)؛ المخطط فقط.

### 1.3 حكم على كل عنصر في المصدر

| # | عنصر المصدر | الحكم | ما يحدث له | أين |
| :---- | :---- | :---- | :---- | :---- |
| 1 | الهدف: Electronics/Clothes/Bags/Devices/Tools/Documents/Valuables/Serial/Warranty/Location/Replacement | **اعتماد + توسعة** | شجرة تصنيفات (لا قائمة ثابتة) + عناصر فريدة وكمية وحزم | §5.2، §5.4 |
| 2 | الملكية: Home يملك المنزل، Inventory يملك الشخصي | **اعتماد + آلية** | `ownership_scope` + نقل (Transfer) بحدث/عقد لا نسخ | CX-04، §6.15 |
| 3 | «إن كان مشتركًا منزليًا فاستخدم Home ولا تنشئ duplicate» | **اعتماد + كشف** | بحث في Home قبل الإنشاء (اختياري) + اقتراح النقل | IC-30 |
| 4 | الشاشات الـ11 | **اعتماد + إضافة** | +Search/Scan، +Audit(جرد)، +Collections، +Service Log | §10 |
| 5 | Items (19 حقلًا) | **تفكيك** | هوية + مخزون + قيمة + ضمان + استبدال في جداولها؛ الحقول المشتقة تُخزَّن Cache | §5.4، IC-01..13 |
| 6 | `category_id` + `subcategory` نصي | **توحيد** | شجرة تصنيفات بـ`parent_id` | IC-01 |
| 7 | `serial_number` واحد | **توسعة** | جدول معرّفات (Serial/IMEI/MAC/SKU) + تطبيع + كشف تكرار | IC-04، §6.4 |
| 8 | `purchase_price/currency` | **اعتماد + توسعة** | مبلغ نصي DECIMAL + عملة ISO + سعر صرف مجمَّد اختياري | CX-14، §5.9 |
| 9 | `current_value` اختياري | **اعتماد + تسجيل تاريخي** | `valuations` بتاريخ ومصدر وثقة؛ لا تدخل صافي الثروة | IC-09، §6.8 |
| 10 | `location_id` | **اعتماد + توسعة** | موقع حالي مشتق من الأحداث + مخزون موزع للكميات | IC-06، §6.2 |
| 11 | `condition` (New…Damaged) | **اعتماد + سجل** | سجل تغيّر الحالة؛ `Damaged` حالة مادية لا حالة ملكية | IC-03 |
| 12 | `ownership_status` (User/System) | **اشتقاق** | مشتق من أحداث الملكية، لا يُحرَّر يدويًا | IC-02، §6.2 |
| 13 | `warranty_until`/`replacement_due` على الصنف | **اشتقاق** | Cache من `warranties`/`replacement_plans` | IC-12، IC-13 |
| 14 | `receipt_id` FK | **تحويل** | `file_ref` إلى Core Files (لا Documents OS) | IC-11، CX-07 |
| 15 | `finance_transaction_id` FK | **تحويل** | Cache مرجعي داخل `finance_links` بلا FK | IC-10، CX-03 |
| 16 | Categories (`type`, `replacement_interval_days`) | **اعتماد + توسعة** | `kind` + فترة استبدال افتراضية + نمط تتبع | §5.2 |
| 17 | Locations متداخلة + `privacy_level` | **اعتماد + تشديد** | Privacy Tier + إخفاء من البحث والإشعارات | §5.3، §14 |
| 18 | Ownership Events (8 أنواع) | **اعتماد + Append-only** | لا تعديل ولا حذف؛ التصحيح بحدث عكسي | §5.6، IC-22 |
| 19 | Warranty Records + الحالات الثلاث | **اعتماد + توسعة** | عدة ضمانات + مطالبات + حساب نهاية من أشهر | §5.7، §6.5 |
| 20 | Replacement Plans (+ `wishlist_item_id`) | **اعتماد + مرجع** | `wishlist_item_ref` بلا FK؛ لا Purchase تلقائي | IC-14، §5.8 |
| 21 | Attachments (5 أنواع) | **اعتماد + Core Files** | `file_ref` + حساسية | §5.10 |
| 22 | Valuation `gain/loss` | **اعتماد + شروط** | يُحسب فقط مع قيمتين معروفتين وعملة واحدة | §6.8 |
| 23 | الأتمتة (7) | **اعتماد + إضافات** | كلها Idempotent؛ + أتمتة جديدة | §12 |
| 24 | التكاملات (6) | **عقود** | Shopping/Finance/Home/Core Files/Today/Sports + Relationships/Travel | §11 |
| 25 | الخدمات (9) | **توسعة** | +Search/Loan/Audit/Valuation/Sync/Privacy/Import | §17.1 |
| 26 | الـAPIs (8) | **توسعة** | قائمة كاملة بأخطائها | §11.9 |
| 27 | الحالات الحدّية (7) | **حسم كل واحدة** | IC-04..08 وغيرها | §7، §9 |
| 28 | الاختبارات العشرة | **توسعة** | ≥ 60 اختبارًا مرقّمًا | §16 |
| 29 | قواعد التنفيذ المشتركة (10) | **اعتماد + تسوية 5 تناقضات** | §3.4 | §3.4 |

---

## 2) جرد الميزات المحفوظة (IF — كلها)

> كل سطر ميزة/قاعدة من المصدر **محفوظة**. العمود الأخير يقول أين تُنفَّذ.

| ID | الميزة / القاعدة (من المصدر) | أين |
| :---- | :---- | :---- |
| IF-01 | إدارة الممتلكات الشخصية: Electronics, Clothes, Bags, Devices, Tools, Documents, Valuables | §5.2، §5.4 |
| IF-02 | تتبع Serial Numbers | §5.5، §6.4 |
| IF-03 | تتبع Warranty | §5.7، §6.5 |
| IF-04 | تتبع Location | §5.3، §6.2 |
| IF-05 | Replacement Cycle | §5.8، §6.7 |
| IF-06 | Home OS يملك household/room context؛ Inventory يملك personal ownership | §3.2، CX-04 |
| IF-07 | لا duplicate مع Home للعنصر المنزلي المشترك | IC-30، §6.15 |
| IF-08 | الشاشات: Inventory Home, Items, Item Detail, Categories, Locations, Warranty, Replacement, Documents, Loans, History, Settings | §10 |
| IF-09 | Items: id, user_id, name, category_id, subcategory, brand, model, serial_number | §5.4 |
| IF-10 | Items: purchase_date, purchase_price, currency, current_value | §5.4، §5.9 |
| IF-11 | Items: location_id, condition (New/Good/Fair/Poor/Damaged) | §5.4 |
| IF-12 | Items: ownership_status (Owned/Loaned/Sold/Disposed/Lost) | §6.2 |
| IF-13 | Items: warranty_until, replacement_due | §6.5، §6.7 |
| IF-14 | Items: receipt_id, finance_transaction_id, notes | §5.10، §5.13 |
| IF-15 | Categories: id, user_id, name, type, icon, parent_id, replacement_interval_days | §5.2 |
| IF-16 | أنواع الفئة: Electronics/Clothing/Bags/Tools/Valuables/Documents/Other | §5.2 |
| IF-17 | Locations: id, user_id, name, type, parent_location_id, privacy_level | §5.3 |
| IF-18 | أنواع المكان: Home/Office/Car/Storage/With Someone/Digital/Other | §5.3 |
| IF-19 | أماكن متداخلة: Home → Bedroom → Closet | §5.3 |
| IF-20 | Ownership Events: item_id, event_type, date, from/to_location, from/to_status, person, notes | §5.6 |
| IF-21 | أنواع الأحداث: Acquired/Moved/Loaned/Returned/Sold/Disposed/Lost/Found | §5.6 |
| IF-22 | **لا تمسح التاريخ عند تغيير الحالة** | §5.6، IC-22 |
| IF-23 | Warranty Records: provider, start_date, end_date, policy_number, support_url, document, reminder_days, notes | §5.7 |
| IF-24 | حالات الضمان: Valid / Expiring Soon / Expired | §6.5 |
| IF-25 | Replacement Plans: expected_replacement_date, reason, budget, currency, status, wishlist_item_id, notes | §5.8 |
| IF-26 | **لا تنشئ Purchase تلقائيًا** من خطة الاستبدال | §5.8، §11.2 |
| IF-27 | Attachments: type, file, title, created_at | §5.10 |
| IF-28 | أنواع المرفقات: Receipt/Warranty/Manual/Ownership Proof/Other | §5.10 |
| IF-29 | Valuation: gain/loss = current − purchase عند توفر القيم | §6.8 |
| IF-30 | **لا تعرض قيمة حالية مجهولة كحقيقة** | §6.8، §10.6 |
| IF-31 | Home screen: Total Items, Warranty Expiring, Replacement Due, Loaned, Lost, Recent Acquisitions | §10.2 |
| IF-32 | Item Detail: Identity, Ownership, Location, Warranty, Documents, Purchase, Value, History, Replacement | §10.3 |
| IF-33 | Warranty مرتبة بالأيام المتبقية | §10.3 |
| IF-34 | Replacement: طابور الاستبدال القادم | §10.3 |
| IF-35 | History: Timeline للملكية/المكان/الحالة | §10.3 |
| IF-36 | أتمتة: تنبيهات الضمان | IA-01 |
| IF-37 | أتمتة: تنبيهات الاستبدال | IA-02 |
| IF-38 | أتمتة: تذكير إرجاع الإعارة | IA-03 |
| IF-39 | أتمتة: انتباه للمفقود | IA-04 |
| IF-40 | أتمتة: ربط Shopping | IA-06، §11.2 |
| IF-41 | أتمتة: التحقق من ربط Finance | IA-07، §11.3 |
| IF-42 | أتمتة: مراجعة تقييم اختيارية | IA-08 |
| IF-43 | تكامل Shopping → ownership | §11.2 |
| IF-44 | تكامل Finance → payment transaction | §11.3 |
| IF-45 | تكامل Home → household item reference/transfer | §11.4، §6.15 |
| IF-46 | تكامل Documents → secure attachments (= Core Files) | §5.10، §11.7 |
| IF-47 | تكامل Today → alerts | §11.6 |
| IF-48 | تكامل Sports → gear extension اختياري فقط | §11.5 |
| IF-49 | الخدمات التسع (Inventory, Category, Location, Ownership, Warranty, Replacement, Attachment, InventoryAnalytics, InventoryNotification) | §17.1 |
| IF-50 | الـAPIs الثمانية (items, categories, locations, events, warranties, replacements, attachments, dashboard) | §11.9 |
| IF-51 | حالة حدّية: serial مكرر | IC-04، §6.4 |
| IF-52 | حالة حدّية: عنصر في مكانين | IC-06 |
| IF-53 | حالة حدّية: عنصر مُعار | §5.6، §6.11 |
| IF-54 | حالة حدّية: مباع/متخلَّص منه | §9.1 |
| IF-55 | حالة حدّية: ضمان بلا بيانات شراء | §6.6 |
| IF-56 | حالة حدّية: موعد استبدال فات | §6.7 |
| IF-57 | حالة حدّية: العنصر ممثَّل أيضًا في Home | IC-30 |
| IF-58 | الاختبارات العشرة للقبول | §16 (IT-01…IT-10) |
| IF-59 | `id, user_id, created_at, updated_at` لكل كيان رئيسي | §5.0 |
| IF-60 | التحقق من المستخدم على الخادم لا من الواجهة | §14.2 |
| IF-61 | Derived لا تُحرَّر يدويًا | §3.4، IC-26 |
| IF-62 | Validation واجهة+خادم والخادم المرجع | §9.2 |
| IF-63 | كل شاشة: Loading/Empty/Error/Success (+Offline/Syncing) | §10.2 |
| IF-64 | الأتمتة Idempotent بسجل تنفيذ | §12 |
| IF-65 | لا تكرر كيانًا يملكه غيرك | §3.2، CX-02 |
| IF-66 | timezone المستخدم لكل المواعيد | §6.1 |
| IF-67 | Migration آمنة مع backup/validation | §15 |

---

## 3) المبادئ والحدود بين الأقسام

### 3.1 الاستقلال

Inventory تطبيق/قسم **قائم بذاته**: قاعدة بياناته، خدماته، واجهته، وأوفلاينه. كل ما يخص غيره (مال، مشتريات، أشخاص، منزل، سفر) يمرّ عبر **مراجع `*_ref` وعقود API/Events**. لا يفتح جدولًا لغيره ولا يكرر كيانه. يعمل كاملًا لو كانت **كل** الأقسام الأخرى غائبة (§3.3).

### 3.2 من يملك ماذا

| الشيء | المالك | موقف Inventory |
| :---- | :---- | :---- |
| ممتلكات شخصية (جهاز، ملابس، حقيبة، أداة، ثمين، وثيقة) | **Inventory** | يملك الهوية والمكان والملكية والضمان والاستبدال |
| أصول/مستهلكات المنزل المشتركة (ثلاجة، أثاث، مخزون مطبخ) | **Home** (CX-04) | لا ينشئها؛ يقترح **نقلًا** |
| الدفع والمعاملة والأصل المالي | **Finance** (CX-03) | `finance_links` Cache فقط؛ لا حقول دفع |
| قرار الشراء وقائمة الرغبات | **Shopping** | يستقبل «حاجة استبدال»؛ لا ينشئ Purchase |
| الضمان | **Inventory وحده** (CX-06) | ضمان Shopping معلومة مواصفات فقط |
| الشخص (مُستعير، مُعيِر) | **Relationships** (CX-01) | `person_ref` + اسم Snapshot |
| الملفات والإيصالات والصور | **Core Files** (CX-07) | `file_ref` + حساسية |
| الرحلة وقائمة التعبئة | **Travel** | يقرأ منه عناصر (اختياريًا) ولا يملك Inventory الرحلة |
| العتاد الرياضي (تفاصيل التمرين) | **Sports** (CX-08) | عنصر عادي + `sports_gear_ref` اختياري |
| الأهداف العامة والتنبيهات | **Core** | يستعمل خدماتها |
| صافي الثروة وتقييم الأصول | **Finance** | القيمة هنا **معلومة** ولا تُحسب فيه (CX-04) |

### 3.3 مصفوفة التدهور (عند غياب نظام مرتبط)

| الغائب | ما يحدث في Inventory |
| :---- | :---- |
| Finance | لا ربط مالي؛ السعر يُدخل يدويًا؛ «تتبّع كأصل» مخفي؛ لا تحقق من المعاملة |
| Shopping | الإضافة يدوية فقط؛ «اقترح بديلًا» يتحول إلى **تذكير داخلي** وزر «أضف للرغبات» مخفي |
| Home | لا بحث تكرار ولا نقل؛ يُعرض خيار «انقل يدويًا» (حذف/أرشفة هنا + أنت تضيف هناك) |
| Relationships | المُستعير نص حر (`display_name`) بلا `person_ref` |
| Travel/Sports | لا شيء يتأثر (هما المستهلكان) |
| Core Files | المرفقات معطّلة بوضوح؛ يبقى الحقل النصي (رقم الإيصال/البوليصة) |
| Core Notifications/Today | التنبيهات داخل التطبيق فقط |
| الإنترنت | كل شيء يعمل محليًا (§13) |

### 3.4 المبادئ الحاكمة (ملزمة) وتسوية «قواعد التنفيذ المشتركة»

1. **سجل الملكية يُلحَق ولا يُعدَّل** (IF-22). كل ما يتغير في حياة الشيء حدث جديد.
2. **المشتق لا يُحرَّر**: الحالة، الموقع الحالي، حالة الضمان، موعد الاستبدال = مشتقات (Cache قابل لإعادة البناء).
3. **المجهول ليس صفرًا ولا حقيقة**: قيمة غير معروفة تظهر «غير محدد»، لا تدخل مجموعًا إلا بعلامة «n من m مُقيَّم».
4. **لا تكرار**: شيء شخصي هنا، منزلي في Home؛ المشترك يُنقل.
5. **الخصوصية بالتصميم**: أماكن الأشياء الثمينة والوثائق حساسة؛ إشعاراتها محايدة (§14).
6. **لا لوم**: لا «أهملت صيانة…»؛ تذكيرات وصفية.
7. **لا تكلفة خفية**: لا شراء ولا دفع ولا إرسال بيانات خارجية بلا فعل صريح.
8. **أوفلاين أولًا**: الإدخال والبحث والمسح بلا إنترنت.
9. **سرعة الإدخال**: إضافة شيء بـ3 حقول (الاسم، الفئة، المكان)، والباقي لاحقًا.
10. **الأرقام**: مبالغ DECIMAL نصية، عملة ISO (CX-14)، لا float.

**تسوية التناقضات الخمسة في «قواعد التنفيذ المشتركة»:**

| # | التناقض | الحل |
| :---- | :---- | :---- |
| 1 | «علاقات FK حقيقية» ↔ «لا تكرر كيانًا يملكه غيرك» | FK داخل Inventory؛ عبر الأقسام `*_ref` + Snapshot + حالة بلا FK (CX-02) → IC-25 |
| 2 | «المشتق لا يُحرَّر» ↔ ملخصات «مملوكة» | ملكية Cache قابل لإعادة البناء → IC-26 |
| 3 | «توقيت المستخدم» ↔ السفر | Inventory على توقيت المستخدم؛ تواريخ الأحداث `DATE` محلية + لحظة UTC → IC-27 |
| 4 | `user_id` على الرئيسي ↔ التابع | التابعة تكرر `user_id` + FK مركّب → IC-28 |
| 5 | Migration آمن ↔ لا بيانات | خيار صفوف Asset من Notion + Onboarding + CSV بـDry-run → IC-29 |

### 3.5 الخصوصية والصياغة

- بيانات الممتلكات تكشف **ما تملكه وأين تحتفظ به** — معلومة حساسة أمنيًا. كل مكان وكل شيء له **Privacy Tier** (CX-16؛ §14.1).
- **لا نصائح تأمينية/قانونية/ضريبية**. «تصدير للتأمين» ملف منظّم فقط.
- التقدير المالي موسوم «تقدير» ولا يُسمّى «قيمة عادلة/سوقية».
- قانون حماية البيانات الشخصية المصري رقم 151 لسنة 2020 مرجع عام — **ليس استشارة قانونية** ويُراجَع مع مختص.

---

## 4) النموذج المفاهيمي

### 4.1 الخريطة

```text
            ┌────────────── Category tree ──────────────┐
            │                                           │
  Location tree ──< Item >── Identifiers (serial/IMEI…)
   (Home/Bedroom/    │  \__ Stock rows (qty per location)
    Closet…)         │   \__ Bundle parent/children
                     │
        ┌────────────┼──────────────┬──────────────┬───────────────┐
 Ownership Events  Warranties    Replacement    Valuations     Attachments
 (append-only)     └─ Claims      Plans          (point-in-    (file_ref)
   └─ Loans                        └─▶ Shopping     time)         Service Log
        │                              (ref)
  derived: status · current location · warranty state · replacement due

 خارجي (مراجع فقط): person_ref(Relationships) · finance_link(Finance) · home_item_ref(Home)
                    shopping_ref · file_ref(Core) · sports_gear_ref · trip_ref(Travel)
```

### 4.2 المفاهيم الأساسية بلغة بسيطة

- **الشيء (Item):** أي ممتلك تريد تتبّعه. نوعان: **فريد** (لابتوب برقم تسلسلي) و**كمّي** (6 قمصان، 20 كابل) و**حزمة** (كاميرا + عدسة + شاحن).
- **المكان (Location):** شجرة: «البيت ← غرفة النوم ← الدولاب». وقد يكون «مع شخص» أو «في السيارة» أو «رقمي».
- **الحدث (Event):** كل ما يحدث لشيء: اشتريته، نقلته، أعرته، رجع، بعته، ضاع، لقيته. سجل لا يُمحى.
- **الضمان (Warranty):** تغطية بتاريخ بداية ونهاية ومزوّد؛ قد يكون للشيء أكثر من ضمان (مصنّع + ممتد).
- **الاستبدال (Replacement):** خطة تقول «سأحتاج بديلًا حوالي…». لا تشتري شيئًا؛ تُرسل «حاجة» لـShopping عند رغبتك.
- **القيمة (Valuation):** تقدير لقيمة الشيء الآن بتاريخه ومصدره. معلومة، لا مال.
- **الجرد (Audit):** جولة تتأكد فيها أن كل شيء في مكانه.

### 4.3 رحلات رئيسية

**أ) إضافة شيء بعد شراء:** Shopping يُكمل شراء ← حدث/استدعاء `from-source` بمفتاح فريد ← Inventory ينشئ شيئًا واحدًا (Idempotent) بحدث `Acquired` وضمان محتمل وإيصال ← تظهر بطاقة «تمت إضافته — أضف المكان والرقم التسلسلي».

**ب) إعارة:** من الشيء ← «أعرته» ← اختر شخصًا (Relationships) أو اكتب اسمًا ← تاريخ الإرجاع (اختياري) ← حدث `Loaned` + سجل إعارة ← تذكير عند الاقتراب ← «رجع» يغلق ويُرجع المكان السابق.

**ج) عطل وضمان:** الشيء ← الضمان ← «فتح مطالبة» ← حالات المطالبة ← مرفقات ← نتيجة. تاريخ الصيانة يُسجَّل في Service Log.

**د) بيع:** «بعته» ← السعر (اختياري) ← حدث `Sold` ← الشيء يخرج من النشط ويبقى في السجل ← (اختياري) تسجيل دخل عبر Finance.

**هـ) استبدال:** يقترب الموعد ← بطاقة «قد تحتاج بديلًا» ← «أرسل لـShopping» ← يُنشأ اقتراح رغبة (Shopping يقرر) ← عند شراء البديل يُضاف الجديد، وتسأل: «ماذا عن القديم؟» (بيع/تخلّص/احتفاظ).

---
## 5) نموذج البيانات الكامل

### 5.0 الحقول العامة والقواعد

**كل كيان رئيسي:** `id` UUID · `user_id` NOT NULL (يُستخرج من الجلسة لا من الطلب) · `created_at` · `updated_at` · `deleted_at` (Soft Delete حيث ينطبق) · `version` int (تزامن متفائل) · `is_demo` bool.

**الكيانات التابعة:** تحمل `user_id` مع قيد تركيبي `FOREIGN KEY (parent_id, user_id) REFERENCES parent(id, user_id)` و`UNIQUE(id, user_id)` على كل رئيسي (IC-28).

| القاعدة | التفصيل |
| :---- | :---- |
| المبالغ | `DECIMAL(14,2)` (نصوص في JSON)، ISO-4217 `currency` (3 حروف)؛ ممنوع float. التحويل للعرض: `GET /finance/exchange-rates/current` للقراءة، وإلا سعر يدوي مجمَّد على السجل (CX-14) |
| الكميات | `DECIMAL(12,3)` للكمّي |
| التواريخ | `DATE` محلية للمستخدم (شراء، ضمان، حدث) + `occurred_at` UTC عند الحاجة لترتيب الأحداث؛ الأحداث تُرتَّب بـ(`event_date`, `seq`) |
| النصوص | UTF-8، + `*_norm` مطبَّع للبحث (§6.13) |
| المراجع الخارجية (CX-02) | `*_ref_system`, `*_ref_type`, `*_ref_id` + `*_ref_snapshot` + `*_ref_state {Valid|Missing|NoAccess}` — **بلا FK** |
| الحساسية | `privacy_tier {Normal|Sensitive|Secret}` على الأصناف والأماكن والمرفقات |
| المجهول | `NULL` = غير معروف؛ لا يُحوَّل لصفر |

### 5.1 الإعدادات

**`inventory_settings`** (صف واحد/مستخدم):

| الحقل | النوع | افتراضي | ملاحظات |
| :---- | :---- | :---- | :---- |
| default_currency | char(3) | من الحساب | |
| timezone | IANA | من الحساب | |
| week_start_day | smallint | 6 | |
| warranty_reminder_days | int[] | `{30,7}` | تذكيرات قبل النهاية (قابلة للضبط) |
| warranty_expiring_window_days | int | 30 | حد «ينتهي قريبًا» |
| replacement_reminder_days | int[] | `{30}` | |
| loan_default_days | int | null | مدة إعارة مقترحة |
| loan_reminder_days | int[] | `{2,0}` | قبل الموعد ويوم الموعد |
| lost_followup_days | int | 7 | يذكّر «ما زال مفقودًا؟» |
| mask_values | bool | false | إخفاء كل المبالغ في الشاشات |
| hide_secret_locations | bool | true | |
| valuation_review_months | int | null | OFF افتراضيًا |
| depreciation_enabled | bool | false | |
| outbound_events | jsonb | كلها false عدا ما يلزم للتكامل | §11.8 |
| integrations | jsonb | `{shopping,finance,home,relationships,travel,sports: {enabled:false}}` | |
| quiet_hours / daily_notification_cap | | يرث Core / 5 | |
| app_lock_required | bool | false | |
| search_index_optin | bool | false | Core Search (ID-09) |
| numerals | enum | Latin | |

### 5.2 التصنيفات

**`inventory_categories`**:

| الحقل | النوع | إلزامي | قيد | ملاحظة |
| :---- | :---- | :---- | :---- | :---- |
| id / user_id | | نعم | | |
| parent_id | FK self | لا | عمق ≤ 3، بلا دورات | يحل `subcategory` النصي (IC-01) |
| name / name_norm | string | نعم | `UNIQUE(user_id, parent_id, name_norm)` | |
| kind | enum | نعم | `Electronics|Clothing|Bags|Tools|Valuables|Documents|Gear|Other` | يقابل `type` في المصدر (+Gear لـSports IG-24) |
| icon / color | string | لا | | |
| tracking_mode_default | enum | نعم | `Unique|Quantity|Bundle` | يُقترح عند إنشاء الشيء |
| replacement_interval_days | int | لا | >0 | فترة استبدال افتراضية (§6.7) |
| default_privacy_tier | enum | نعم | | Valuables/Documents ← Sensitive/Secret مقترحًا |
| requires_serial | bool | لا | | يلفت الانتباه لإدخال التسلسلي (لا يمنع) |
| position | int | | | |
| status | enum | | `Active|Archived` | |

**بذور مقترحة عند Onboarding فقط** (قابلة للحذف والتعديل): إلكترونيات، ملابس، حقائب، أدوات، مقتنيات ثمينة، وثائق، أخرى. لا تُفرض.

### 5.3 الأماكن

**`inventory_locations`**:

| الحقل | النوع | إلزامي | قيد | ملاحظة |
| :---- | :---- | :---- | :---- | :---- |
| id / user_id | | نعم | | |
| parent_location_id | FK self | لا | عمق ≤ 6، بلا دورات | |
| name / name_norm | string | نعم | `UNIQUE(user_id, parent_location_id, name_norm)` | |
| kind | enum | نعم | `Home|Office|Car|Storage|WithPerson|Digital|Travel|Other` | يقابل `type`؛ +`Travel` لحقيبة السفر |
| path_cache | text | نظام | | «البيت ‹ غرفة النوم ‹ الدولاب» يُعاد بناؤه |
| privacy_tier | enum | نعم | `Normal|Sensitive|Secret` | يقابل `privacy_level` (IC-17) |
| person_ref | ref triple | لا | لـ`WithPerson` | اختياري (CX-01) |
| person_display_name | string | لا | | |
| is_mobile | bool | لا | | مكان يتحرك (سيارة، حقيبة) |
| home_room_ref | ref triple | لا | | ربط اختياري بغرفة Home للعرض فقط (§11.4) |
| note | text | لا | | |
| status | enum | | `Active|Archived` | |
| position | int | | | |

> `Digital` للأصول الرقمية (ترخيص برنامج، حساب) — يُتاح لكن **لا يُحتسب** في «ممتلكات مادية» افتراضيًا.

### 5.4 الأصناف (Items)

**`inventory_items`**:

| الحقل | النوع | إلزامي | قيد | ملاحظة |
| :---- | :---- | :---- | :---- | :---- |
| id / user_id | | نعم | `UNIQUE(id,user_id)` | |
| name / name_norm | string(160) | نعم | غير فارغ | |
| tracking_mode | enum | نعم | `Unique|Quantity|Bundle` | IC-05 |
| ownership_scope | enum | نعم | `Personal|Household` | `Household` تعني «مشترك ينتظر نقلًا»؛ الافتراضي Personal (CX-04) |
| category_id | FK | لا | | يُسمح بلا تصنيف («غير مصنّف») |
| brand / model | string | لا | | |
| acquisition_kind | enum | نعم | `Purchased|Gifted|Inherited|Found|Made|Transferred|Unknown` | |
| acquired_on | date | لا | | يقابل `purchase_date` (تاريخ الاقتناء) |
| purchase_price | decimal(14,2) | لا | ≥0 | |
| purchase_currency | char(3) | لا | | مع السعر |
| purchase_fx_rate | decimal(18,8) | لا | | مجمَّد اختياري |
| seller_name | string | لا | | |
| condition | enum | نعم | `New|Good|Fair|Poor|Damaged` | حالة **مادية** فقط (IC-03) |
| privacy_tier | enum | نعم | | يرث من الفئة، قابل للرفع |
| quantity_on_hand | decimal(12,3) | مشتق | | لـQuantity (§6.3) |
| quantity_unit | string | لا | | قطعة، زوج، علبة |
| parent_item_id | FK self | لا | بلا دورات، عمق ≤ 2 | عنصر داخل حزمة (§5.5) |
| status | enum | مشتق | `Owned|Loaned|Sold|Disposed|Lost|Gifted|Transferred` | **Cache** من الأحداث (IC-02) |
| current_location_id | FK | مشتق | | **Cache** (§6.2) |
| warranty_state / warranty_until | enum/date | مشتق | | **Cache** (§6.5) |
| replacement_due | date | مشتق | | **Cache** (§6.7) |
| current_value / current_value_currency / value_as_of | | مشتق | | آخر `valuation` (§5.9) |
| expiry_date | date | لا | لفئة Documents/عناصر لها صلاحية | جواز، هوية، رخصة (IG-09) |
| masked_reference | string | لا | يُدخَل أو يُشتق | آخر 4 فقط للـSecret |
| photo_file_ref | file_ref | لا | | الصورة الرئيسية |
| finance_asset_ref | ref triple | لا | | «تتبّع كأصل» (§11.3) |
| home_item_ref | ref triple | لا | | بعد النقل (§6.15) |
| shopping_ref | ref triple | لا | | المصدر (شراء/رغيبة) |
| sports_gear_ref | ref triple | لا | | (§11.5) |
| notes | text | لا | ≤ 2000 | |
| tags | text[] | لا | | حرة |
| is_favorite | bool | لا | | |
| status_changed_at | timestamptz | نظام | | |
| source_key | string | لا | `UNIQUE(user_id, source_key)` | Idempotency للإنشاء من مصدر (§6.16) |

> **الحقول المشتقة** (`status`, `current_location_id`, `warranty_*`, `replacement_due`, `current_value*`, `quantity_on_hand`) **غير قابلة للتحرير**: تُحدَّث في نفس المعاملة التي تكتب الحدث/السجل المسبّب، ويمكن إعادة بنائها بالكامل (`POST /inventory/rebuild`).

### 5.5 المعرّفات والمخزون والحزم

**`inventory_item_identifiers`** (يحل `serial_number` الوحيد — IC-04):

| الحقل | النوع | ملاحظة |
| :---- | :---- | :---- |
| id / user_id / item_id | | FK مركّب |
| kind | enum | `Serial|IMEI|MAC|SKU|Barcode|LicenseKey|PlateNo|Other` |
| value_raw | string | كما أُدخل |
| value_norm | string | مطبَّع (§6.4) |
| is_primary | bool | واحد للصنف |
| privacy_tier | enum | `LicenseKey/PlateNo` ← Sensitive افتراضيًا |
| status | enum | `Active|Retired` (عند بيع/تخلّص يبقى للتاريخ) |
| `UNIQUE` جزئي | `(user_id, kind, value_norm) WHERE status='Active'` | منع التكرار بين الأصناف **النشطة** (IV-03) |

**`inventory_item_stock`** (لـ`Quantity` — يحل «شيء في مكانين» IC-06): `id, user_id, item_id, location_id, quantity decimal ≥0, as_of`. `UNIQUE(item_id, location_id)`. الشيء الفريد له **مكان واحد** فقط (من الأحداث)، أما الكمّي فموزع على أماكن.

**الحزم (Bundle):** `parent_item_id` على الابن. الأب `tracking_mode=Bundle`. القواعد: نقل الأب ينقل أبناءه (حدث لكل ابن بـ`group_event_id`)، إعارة الأب تعير الأبناء، بيع الأب يطرح سؤال «كل الأبناء؟». ابن يمكن فصله (`Detach`) فيصير مستقلًا. ضمان الأب لا يسري على الأبناء تلقائيًا (لكل ضمانه).

**`inventory_collections`** (مجموعات يدوية: «عتاد التصوير»، «حقيبة السفر»): `id, user_id, name, kind {Manual|PackingTemplate}, note` + `inventory_collection_items(collection_id, item_id, qty, position)`. للعرض والتعبئة، **لا تغيّر الملكية**. تقرؤها Travel (§11.5).

### 5.6 أحداث الملكية والإعارات

**`inventory_ownership_events`** (**Append-only** — لا UPDATE ولا DELETE على مستوى الصلاحيات):

| الحقل | النوع | إلزامي | قيد | ملاحظة |
| :---- | :---- | :---- | :---- | :---- |
| id / user_id / item_id | | نعم | FK مركّب | |
| seq | bigint | نظام | تصاعدي لكل صنف | ترتيب مضمون |
| event_type | enum | نعم | `Acquired|Moved|Loaned|Returned|Sold|Disposed|Lost|Found|Gifted|Transferred|QuantityAdjusted|Reacquired|Corrected` | المصدر 8 + 5 مضافة |
| event_date | date | نعم | ≤ اليوم + 1 | |
| occurred_at | timestamptz | نظام | | |
| from_location_id / to_location_id | FK | لا | | حسب النوع |
| quantity_delta | decimal | لا | | لـ`Quantity` (+/−) |
| loan_id | FK | لا | لأحداث الإعارة | |
| counterparty_ref | ref triple | لا | | شخص/جهة (CX-01) |
| counterparty_name | string | لا | | Snapshot |
| price | decimal | لا | ≥0 | في Sold/Gifted |
| currency | char(3) | لا | | |
| reason | text | لا | ≤ 500 | |
| corrects_event_id | FK self | لا | لـ`Corrected` فقط | يعكس حدثًا (IC-22) |
| group_event_id | UUID | لا | | أحداث الحزمة |
| source | enum | نعم | `User|ShoppingSync|HomeSync|Import|System|Audit` | |
| client_op_id | UUID | نعم عند الإنشاء من عميل | `UNIQUE(user_id, client_op_id)` | Idempotency |

> `from_status/to_status` من المصدر **حُذفا** كحقلين مخزّنين: الحالة تُشتق من آخر الأحداث (§6.2)، ويعرضهما الـAPI محسوبين (IC-22).

**`inventory_loans`**:

| الحقل | النوع | إلزامي | ملاحظة |
| :---- | :---- | :---- | :---- |
| id / user_id / item_id | | نعم | |
| direction | enum | نعم | `LentOut|Borrowed` — الثانية: شيء ليس لي معي (اختيارية IG-13) |
| person_ref / person_display_name | | لا / نعم | CX-01؛ الاسم إلزامي (Snapshot) |
| lent_on | date | نعم | |
| due_on | date | لا | |
| returned_on | date | لا | |
| quantity | decimal | لا | لـQuantity |
| condition_out / condition_in | enum | لا | حالة وقت التسليم/الرجوع |
| status | enum | نعم | `Open|Returned|WrittenOff` |
| note | text | لا | |
| reminders_muted | bool | لا | |

**`WrittenOff`**: لم يرجع ولن يرجع (يُنتج حدث `Lost` مرتبطًا). **لا حالة «متأخر» مخزّنة**: `Overdue` مشتقة (§6.11).

### 5.7 الضمان والمطالبات

**`inventory_warranties`** (عدة ضمانات للصنف الواحد — IC-12):

| الحقل | النوع | إلزامي | قيد | ملاحظة |
| :---- | :---- | :---- | :---- | :---- |
| id / user_id / item_id | | نعم | | |
| kind | enum | نعم | `Manufacturer|Extended|Store|Insurance|Service|Other` | |
| provider | string | لا | | |
| start_date | date | لا | | يقابل `start_date` |
| end_date | date | لا | ≥ start | |
| duration_months | smallint | لا | >0 | بديل لـend_date (§6.6) |
| end_date_source | enum | نظام | `Entered|Computed|Unknown` | |
| policy_number | string | لا | Sensitive | |
| support_url / support_phone | string | لا | | |
| coverage_note | text | لا | | ما يغطيه (نص حر، بلا تفسير قانوني) |
| document_file_refs | file_ref[] | لا | | عبر attachments (§5.10) |
| reminder_days | int[] | لا | يتجاوز العام | |
| state | enum | مشتق | `Valid|ExpiringSoon|Expired|Unknown` | **Cache** (§6.5) |
| status | enum | نعم | `Active|Archived` | |
| notes | text | لا | | |

**`inventory_warranty_claims`** (IG-06): `id, user_id, warranty_id, item_id, opened_on, issue (نص), reference_no, status {Draft|Filed|InRepair|Resolved|Denied|Closed}, resolution {Repaired|Replaced|Refunded|Denied|Withdrawn|Other}, closed_on, cost_amount/currency (تكلفة عليّ إن وُجدت), note`. + `inventory_claim_events (claim_id, at, status, note)` للتاريخ. فتح مطالبة يُنشئ تلقائيًا سجل خدمة (`service_records`) عند الإغلاق بإصلاح (اختياري).

### 5.8 خطط الاستبدال

**`inventory_replacement_plans`**:

| الحقل | النوع | إلزامي | قيد | ملاحظة |
| :---- | :---- | :---- | :---- | :---- |
| id / user_id / item_id | | نعم | | |
| expected_date | date | نعم | | يقابل `expected_replacement_date` |
| date_source | enum | نظام | `UserSet|CategoryInterval|WarrantyEnd|Manual` | لماذا هذا الموعد |
| reason | enum | نعم | `EndOfLife|Broken|Upgrade|Lost|Outgrown|Other` | |
| reason_note | text | لا | | |
| budget_amount / currency | decimal/char | لا | | تقدير |
| status | enum | نعم | `Suggested|Planned|SentToShopping|Replaced|Dismissed|Snoozed` | |
| snooze_until | date | لا | | |
| wishlist_item_ref | ref triple | لا | | **مرجع Shopping بلا FK** (IC-14) |
| replaced_by_item_id | FK | لا | | الصنف الجديد (اختياري) |
| decision_on_old | enum | لا | `Keep|Sell|Dispose|Gift|Undecided` | |
| notes | text | لا | | |

لا Purchase ولا معاملة تُنشأ من الخطة (IF-26).

### 5.9 التقييم والإهلاك

**`inventory_valuations`** (نقطة زمنية — يحل `current_value` الوحيد، IC-09):

| الحقل | النوع | ملاحظة |
| :---- | :---- | :---- |
| id / user_id / item_id | | |
| as_of | date | تاريخ التقدير |
| amount / currency | decimal/char | |
| method | enum | `UserEstimate|MarketCheck|Appraisal|Receipt|Depreciation` |
| confidence | enum | `High|Medium|Low` |
| note | text | مصدر التقدير نصًّا |
| is_current | bool | واحد فقط `true` لكل صنف (آخر as_of) |

**`inventory_depreciation_profiles`** (اختياري، افتراضي معطّل): `id, user_id, category_id|item_id, method {StraightLine}, useful_life_months, salvage_pct (0..100)`. نتيجتها تُنشئ تقديرًا بـ`method=Depreciation` عند طلب المستخدم فقط (§6.9).

### 5.10 المرفقات والصور

**`inventory_attachments`**:

| الحقل | النوع | ملاحظة |
| :---- | :---- | :---- |
| id / user_id | | |
| item_id | FK | لا |
| warranty_id / claim_id / service_id | FK | واحد على الأكثر |
| type | enum | `Receipt|Warranty|Manual|OwnershipProof|Photo|Invoice|Insurance|Other` |
| title | string | |
| file_ref | file_ref | Core Files — **لا ملفات داخل القاعدة** |
| sensitivity | enum | `Normal|Sensitive|Secret` (CX-07) |
| masked_reference | string | للـSecret: «****4821» |
| captured_at | date | |
| ocr_text | text | **غير مفعّل** (ID-10) |

العرض الكامل لمرفق Secret يطلب إعادة مصادقة؛ لا يظهر في البحث ولا الإشعارات.

### 5.11 سجل الخدمة والصيانة

**`inventory_service_records`** (IG-07): `id, user_id, item_id, service_date, kind {Repair|Maintenance|Cleaning|Upgrade|Inspection|Other}, provider, description, cost_amount, cost_currency, finance_link_state (cache), warranty_claim_id (اختياري), next_service_due (date), note`. `next_service_due` يُنتج تذكيرًا. أي تكلفة تُدفع تمرّ عبر Finance (§11.3).

### 5.12 الجرد (Audit)

**`inventory_audits`**: `id, user_id, scope_location_id|category_id|all, started_at, finished_at, status {InProgress|Completed|Cancelled}, summary jsonb` + **`inventory_audit_lines`**: `audit_id, item_id, expected_location_id, result {Found|FoundElsewhere|NotFound|Skipped}, found_location_id, note`. إنهاء الجرد يُنتج أحداث `Moved` للعناصر `FoundElsewhere` بتأكيد، وللـ`NotFound` يعرض «علّمه مفقودًا؟» (لا تلقائيًا).

### 5.13 الروابط والمراجع الخارجية

**`inventory_finance_links`** (CX-03 — **Cache مرجعي، Inventory لا يدفع**):

| الحقل | النوع | ملاحظة |
| :---- | :---- | :---- |
| id / user_id | | |
| source_type | enum | `purchase_reference` (معاملة الشراء الأصلية، مرجع قراءة) · `inventory_repair` · `inventory_sale` (طلبات على Finance §11.3) |
| source_id | UUID | `item_id` أو `service_id` أو `event_id` |
| idempotency_key | string | `UNIQUE(user_id, idempotency_key)` |
| sync_status | enum | `Not Required|Pending|Synced|Failed|Detached|Legacy` |
| finance_transaction_ref | ref triple | |
| amount / currency (snapshot) | | |
| attempts / last_error / last_synced_at | | |

> **«ربط الشراء»:** يخزّن مرجع المعاملة الأصلية (التي أنشأها Shopping) للقراءة والتحقق (IA-07) — لا يُنشئ معاملة. قيد: **معاملة واحدة لكل شراء فعلي** (CX-03؛ IT-37).

**`inventory_external_refs`** (ظلّ عام للمراجع): `id, user_id, owner_type, owner_id, system, ref_type, ref_id, snapshot, state, last_checked_at` — لمراجع Shopping/Home/Sports/Travel المتعددة.

### 5.14 البنية التحتية والكاشات

| الجدول | الحقول الأساسية | الغرض |
| :---- | :---- | :---- |
| `inventory_outbox` | `id, event_id, name, payload, status, attempts, next_attempt_at` | أحداث صادرة (CX-17) |
| `inventory_audit_log` | `id, user_id, entity, entity_id, action, before, after, at, actor` | تغييرات حساسة (خصوصية، حذف، تصحيح أحداث، تصدير) غير قابل للتعديل |
| `inventory_client_ops` | `user_id, client_op_id, op_type, result_ref, applied_at` | Idempotency للمزامنة |
| `inventory_tombstones` | `user_id, entity, entity_id, deleted_at` | حذف مزامَن |
| `inventory_import_jobs` / `rows` | نوع، وضع DryRun/Apply، تقرير، `source_key` | استيراد (§15) |
| `inventory_export_jobs` | نطاق، صيغة، `mask`, `file_ref`, `expires_at` | تصدير (بما فيه «حزمة التأمين») |
| `inventory_dashboard_cache` | `user_id, metrics jsonb, built_at, inputs_hash` | **Cache** الأرقام (§6.14) |
| `inventory_search_index` | `item_id, tokens, tier` | بحث محلي |
| `inventory_integration_state` | `user_id, system, enabled, capabilities, last_checked_at, last_error` | |
| `inventory_system_config` (مشغّل) | `key, value` | حدود إدخال، مهلات |

### 5.15 القوائم (Enums)

| Enum | القيم |
| :---- | :---- |
| `tracking_mode` | Unique · Quantity · Bundle |
| `ownership_scope` | Personal · Household |
| `condition` | New · Good · Fair · Poor · Damaged |
| `item_status` (مشتق) | Owned · Loaned · Sold · Disposed · Lost · Gifted · Transferred |
| `event_type` | Acquired · Moved · Loaned · Returned · Sold · Disposed · Lost · Found · Gifted · Transferred · QuantityAdjusted · Reacquired · Corrected |
| `warranty_state` (مشتق) | Valid · ExpiringSoon · Expired · Unknown |
| `claim_status` | Draft · Filed · InRepair · Resolved · Denied · Closed |
| `replacement_status` | Suggested · Planned · SentToShopping · Replaced · Dismissed · Snoozed |
| `loan_status` | Open · Returned · WrittenOff (+ Overdue مشتق) |
| `privacy_tier` | Normal · Sensitive · Secret |
| `sync_status` (مالي) | Not Required · Pending · Synced · Failed · Detached · Legacy |
| `identifier_kind` | Serial · IMEI · MAC · SKU · Barcode · LicenseKey · PlateNo · Other |

### 5.16 الفهارس والقيود

| الجدول | الفهرس / القيد | سببه |
| :---- | :---- | :---- |
| items | `(user_id, status)` · `(user_id, category_id)` · `(user_id, current_location_id)` · trigram `(user_id, name_norm)` · `UNIQUE(user_id, source_key)` | القوائم والبحث |
| identifiers | `UNIQUE(user_id, kind, value_norm) WHERE status='Active'` | IT-02 |
| ownership_events | `(item_id, seq)` UNIQUE · `(user_id, event_date)` · `UNIQUE(user_id, client_op_id)` · **صلاحية INSERT فقط** | IF-22 |
| warranties | `(user_id, end_date) WHERE status='Active'` | شاشة الضمان |
| loans | `(user_id, status, due_on)` · قيد: **إعارة مفتوحة واحدة لكل صنف فريد** | |
| replacement_plans | `(user_id, status, expected_date)` | |
| valuations | `UNIQUE(item_id) WHERE is_current` | |
| locations/categories | `UNIQUE(user_id, parent, name_norm)` + حماية الدورات | |
| كل التابعة | `FOREIGN KEY (parent_id, user_id)` | IC-28 |

### 5.17 خريطة العلاقات

```text
categories 1─* categories(self) ; categories 1─* items
locations 1─* locations(self) ; locations 1─* items(current) ; locations 1─* item_stock
items 1─* item_identifiers · item_stock · ownership_events · loans · warranties · replacement_plans
      · valuations · attachments · service_records · audit_lines · collection_items
items 1─* items(parent_item_id: bundle)
warranties 1─* warranty_claims 1─* claim_events
(بلا FK، refs فقط): person_ref · finance_transaction_ref · home_item_ref · shopping_ref
                    wishlist_item_ref · file_ref · sports_gear_ref · finance_asset_ref
items.status / current_location / warranty_state / replacement_due / current_value : Cache مشتق
```

---
## 6) محرّك الحساب (Calculation Engine)

> كل الحسابات **حتمية** وعلى DECIMAL. كل صيغة لها مثال رقمي يصير حالة اختبار (§16). المشتقات تُحدَّث في **نفس المعاملة** التي تكتب سببها، ويمكن إعادة بنائها كلها.

### 6.1 قواعد عامة

| القاعدة | التفصيل |
| :---- | :---- |
| الدقة | المبالغ خانتان عشريتان `ROUND_HALF_UP` عند الحفظ؛ النسب خانتان عند العرض فقط |
| اليوم | «اليوم» = تاريخ المستخدم في `settings.timezone` (IF-66). تواريخ الأحداث `DATE` محلية |
| المجهول | `NULL` يبقى `NULL`؛ أي معادلة بمدخل مجهول تُرجع «غير محدد» ولا تُصفِّر |
| العملات | لا جمع بين عملتين إلا عبر سعر صرف مجمَّد أو قراءة Finance؛ وإلا يُعرض مجموع لكل عملة |
| ترتيب الأحداث | `(event_date ASC, seq ASC)` |

### 6.2 الحالة والموقع الحاليان (مشتقّان من الأحداث)

**إعادة التشغيل على الأحداث بالترتيب** (آلة حالة بسيطة):

| الحدث | أثره على `status` | أثره على الموقع |
| :---- | :---- | :---- |
| `Acquired` / `Reacquired` | Owned | `to_location` |
| `Moved` | (لا تغيير) | `to_location` |
| `Loaned` | Loaned | `WithPerson` (موقع مشتق «مع فلان»؛ الموقع الأصلي يُحفظ كـ`home_location`) |
| `Returned` | Owned | `to_location` أو `home_location` |
| `Sold` | Sold | `NULL` (خرج) |
| `Gifted` | Gifted | `NULL` |
| `Disposed` | Disposed | `NULL` |
| `Lost` | Lost | يبقى آخر موقع معروف كـ`last_known_location` |
| `Found` | Owned | `to_location` |
| `Transferred` | Transferred (إلى Home) | `NULL` |
| `QuantityAdjusted` | (لا تغيير) | يعدّل المخزون فقط |
| `Corrected` | يلغي أثر `corrects_event_id` ثم يُعاد التشغيل | |

- **القاعدة:** لا تُخزَّن `status`/`location` إلا كـCache؛ إعادة بنائها = تشغيل الآلة على كل الأحداث.
- **انتقالات غير مسموحة** (تُرفض في الخادم، IV-12): `Returned` بلا `Loaned` مفتوحة؛ `Moved` لشيء Sold/Disposed/Lost/Gifted/Transferred (يلزم `Found`/`Reacquired` أولًا)؛ `Sold` لشيء مُعار (يلزم Returned أو WrittenOff أولًا).
- **تصحيح:** حدث خاطئ لا يُحذف؛ يُنشأ `Corrected` يشير إليه. الواجهة تعرض الخطأ مشطوبًا والتصحيح بجانبه.

**مثال:** Acquired(1/1، الدولاب) → Moved(10/2، المكتب) → Loaned(1/3، أحمد) → Returned(20/3، المكتب): الحالة Owned، الموقع المكتب، تاريخ كامل 4 أحداث.

### 6.3 الكمّي والمخزون الموزّع

```text
on_hand(item)       = Σ stock.quantity على كل الأماكن
stock(item, loc)    = Σ quantity_delta للأحداث الداخلة − الخارجة لهذا المكان
Moved (Quantity)    : quantity_delta = −q في from, +q في to (حدثان بـgroup_event_id أو حدث واحد بحقلين)
Loaned (Quantity)   : −q من المكان، +q في موقع WithPerson
```

- **الرصيد السالب مرفوض** (IV-09). التعديل الجرَدي: `QuantityAdjusted` بسبب.
- `Quantity` لا يحمل رقمًا تسلسليًا (اختياري)؛ إن احتاج المستخدم تتبّع كل قطعة يحوّله إلى `Unique` (يقسمه IG-05).
- **«إجمالي الأصناف» (IC-20):** عدّان منفصلان: `items_count` (عدد الصفوف النشطة) و`units_count` (مجموع الكميات)؛ العرض الأساسي «214 صنفًا (342 قطعة)».

**مثال:** 6 قمصان: 4 في الدولاب و2 في الغسيل ← `on_hand=6`. إعارة قميصين من الدولاب لأخ: الدولاب 2، الغسيل 2، «مع الأخ» 2 ← المجموع 6 (المُعار يُحسب «مملوكًا لكن بالخارج» ويظهر في `loaned_out`).

### 6.4 تطبيع الرقم التسلسلي وكشف التكرار

```text
value_norm = UPPER( حذف المسافات والشرطات والنقاط ) ; الأصفار البادئة تُحفظ ; O≠0 (لا تحويل)
```

| الحالة | السلوك |
| :---- | :---- |
| نفس `(kind, value_norm)` لصنف **نشط** آخر | **منع** مع عرض الصنف الموجود: «هذا الرقم مسجَّل لـ…؛ هل هو نفس الشيء؟» + خيارات: افتح الموجود / ادمج / سجّل كاستثناء (`dup_ack`) |
| نفس الرقم لصنف `Sold/Disposed/Gifted` (Retired) | **مسموح** مع اقتراح «هل تعيد اقتناء الصنف القديم؟» ← `Reacquired` على نفس الصنف بدل صنف جديد |
| نفس الرقم مع علامة تجارية مختلفة | **تحذير** لا منع (قد يتصادف) |
| رقم قصير جدًا (< 4 رموز) | تحذير «رقم قصير قد لا يكون فريدًا» |

> الفرادة هنا لكل `(user, kind)` لا «عالمية»: لأن الرقم قد يتكرر بين علامات تجارية. استثناء مُعترف به (`dup_ack`) يُحفظ في الـAudit.

### 6.5 حالة الضمان

```text
remaining_days = end_date − today
state(warranty):
   end_date IS NULL                         → Unknown
   remaining_days < 0                       → Expired
   0 ≤ remaining_days ≤ expiring_window     → ExpiringSoon
   else                                     → Valid
```

- `expiring_window` = `warranty_expiring_window_days` (افتراضي 30).
- **حالة الصنف** (`warranty_state`): أعلى ضمان نشط: لو أي ضمان `Valid` ← Valid؛ وإلا `ExpiringSoon` لو وُجد؛ وإلا `Expired` لو وُجدت منتهية فقط؛ وإلا `Unknown`. و`warranty_until` = **أبعد** `end_date` بين الضمانات النشطة.
- لا تُحسب ساعات اليوم الأخير: الضمان ينتهي **آخر ثانية** من `end_date` بتوقيت المستخدم.

| `end_date` | اليوم | المتبقي | الحالة (نافذة 30) |
| :---- | :---- | :---- | :---- |
| 2026-12-31 | 2026-10-06 | 86 | Valid |
| 2026-10-20 | 2026-10-06 | 14 | ExpiringSoon |
| 2026-10-06 | 2026-10-06 | 0 | ExpiringSoon (ينتهي اليوم) |
| 2026-10-05 | 2026-10-06 | −1 | Expired |
| NULL | — | — | Unknown |

### 6.6 نهاية الضمان من المدة (ضمان بلا بيانات كاملة — IF-55)

```text
end_date = EDATE(start_date, duration_months) − 1 يوم        (نهاية اليوم السابق للذكرى)
start_date الافتراضي = acquired_on (لو معروف) وإلا NULL ← الضمان Unknown ويُطلب التاريخ
```

- `EDATE` مع قص نهاية الشهر: 2026-01-31 + شهر = 2026-02-28.
- الناتج موسوم `end_date_source=Computed` ويعرض «محسوب من تاريخ الشراء — تأكد من الفاتورة».
- **ضمان بلا تاريخ شراء ولا بداية:** يُحفظ `Unknown` بلا تنبيهات، ويظهر في «يحتاج استكمال بيانات».

**مثال:** شراء 2026-03-15، 24 شهرًا ← نهاية 2028-03-14.

### 6.7 موعد الاستبدال

```text
replacement_due(item) =
   1) خطة استبدال نشطة (Planned/Suggested) → expected_date (date_source=UserSet)
   2) وإلا category.replacement_interval_days محددة وللصنف acquired_on → acquired_on + interval (CategoryInterval)
   3) وإلا NULL (لا موعد)
```

- (2) **اقتراح موسوم «تقدير»** لا يُنشئ خطة؛ يظهر Suggested في طابور الاستبدال فقط إذا اقترب ضمن `replacement_reminder_days` أو فات.
- **موعد فات (IF-56):** `overdue_days = today − due` > 0 ← بطاقة «تجاوز الموعد المتوقع بـ n يومًا» بصياغة وصفية + أزرار: أرجئ (Snooze بتاريخ) · استبدل · لا يلزم (Dismiss ← يُوقف الاقتراح لهذا الصنف) · لا تسأل ثانية.
- الصنف `Sold/Disposed/Lost` لا يدخل الاستبدال.

**مثال:** لابتوب اقتُني 2024-01-10، فاصل فئة الإلكترونيات 1,460 يومًا (4 سنوات) ← `2028-01-09` (تقدير).

### 6.8 القيمة والربح/الخسارة

```text
gain_loss      = current_value − purchase_price                 (نفس العملة فقط)
gain_loss_pct  = gain_loss / purchase_price × 100               (purchase_price > 0)
```

- يُحسب **فقط** لو القيمتان معروفتان بنفس العملة، أو مُحوَّلتان بسعر مجمَّد/قراءة Finance بتاريخ معلن. وإلا «غير محدد».
- العرض: «القيمة التقديرية 4,500 جنيه (تقدير بتاريخ 2026-09-01، ثقة متوسطة)» — **لا تُعرض كحقيقة** بلا `as_of` ومصدر (IF-30).
- `current_value` المخزَّن على الصنف = آخر `valuation.is_current`.
- القيمة **لا تدخل** صافي الثروة؛ «تتبّع كأصل» يُنشئ أصلًا في Finance بقيمته هناك (§11.3).

**مثال:** سعر 25,000، قيمة 18,000 ← −7,000 (−28.00%).

### 6.9 الإهلاك التقديري (اختياري، معطّل)

```text
age_months = months(today − acquired_on)
est_value  = MAX(salvage, price × (1 − age_months / useful_life_months))      (خطي)
salvage    = price × salvage_pct / 100
```

مثال: سعر 20,000، عمر 36 شهرًا من 60، خردة 10% (2,000): 20,000 × (1 − 36/60) = 8,000، وهو أعلى من الخردة ← **8,000 (تقدير)**. ينتج تقديرًا `method=Depreciation, confidence=Low` **بعد ضغط المستخدم «اقترح قيمة»** ولا يُحفظ تلقائيًا. **لا يُقدَّم كمحاسبة ولا كقيمة سوق** (IV-18).

### 6.10 مجاميع المحفظة

```text
total_purchase[currency]  = Σ purchase_price للأصناف النشطة ذات السعر
total_estimated[currency] = Σ current_value للأصناف النشطة ذات القيمة
coverage                   = valued_count / active_count
```

- يُعرض دائمًا «تقدير 125,000 جنيه — بناءً على 41 من 58 صنفًا مُقيَّمًا» ولا يُقارن بـ`total_purchase` إلا على **نفس مجموعة الأصناف** (المقيَّمة والمسعَّرة معًا) لتجنّب التحيّز.
- استبعاد: الأصناف `Digital`، `Secret` (اختياري بإعداد)، وغير الشخصية.

### 6.11 الإعارة والتأخير

```text
overdue_days = today − due_on        إذا status = Open و due_on < today
state        = Open | DueSoon (0 ≤ due_on − today ≤ 2) | Overdue | Returned | WrittenOff
```

تذكير قبل الموعد بـ`loan_reminder_days` ويوم الموعد؛ بعد التأخر **تذكير واحد أسبوعيًا** كحد أقصى بصياغة لطيفة («ما زال … مع أحمد؟ أرجئ/تم الإرجاع/لن يعود»). لا تذكير ينسب لومًا للمستعير. بدون `due_on` ← لا تأخير، فقط «معار منذ n يومًا».

### 6.12 المفقود (Attention)

`Lost` ← بطاقة «بحث عن…» بعد `lost_followup_days`: «ما زال مفقودًا؟ [وجدته] [لن أبحث بعد الآن ← Disposed(reason=Lost)] [أذكّرني لاحقًا]». المفقود **لا يدخل** المجاميع النشطة لكنه يظهر في «يحتاج انتباهك». آخر مكان معروف يُعرض.

### 6.13 البحث والتطبيع

- **تطبيع `name_norm`:** إزالة التشكيل والتطويل، همزات ← ا، ى ← ي، ة ← ه (للمطابقة)، أرقام موحدة، حروف صغيرة، ضغط المسافات.
- **حقول البحث:** الاسم، الماركة، الموديل، المعرّفات (تطابق تام ثم يبدأ بـ)، الوسوم، المكان (path)، الملاحظات (وزن أقل).
- **الترتيب:** تطابق معرّف تام (serial/IMEI) > بداية الاسم > الماركة+الموديل > trigram > الملاحظات؛ ثم الأحدث استخدامًا/تعديلًا.
- **السرية:** عناصر Secret/Sensitive حسب `privacy_tier` ولا تظهر في **Core Search** (يُخرج عنها اسم عام فقط إن فُعِّل الفهرسة، ID-09).
- **الفلاتر:** فئة، مكان (مع الأبناء)، حالة، ضمان، ملكية، وسم، «بلا مكان»، «بلا رقم تسلسلي»، «بلا إيصال».

### 6.14 لوحة الأرقام (Dashboard Cache)

| المقياس | التعريف |
| :---- | :---- |
| `items_count` / `units_count` | أصناف نشطة (Owned/Loaned) / مجموع الكميات |
| `warranty_expiring` | عدد الضمانات `ExpiringSoon` |
| `replacement_due` | أصناف موعدها ≤ نافذة التذكير أو فات |
| `loaned_out` / `overdue` | أصناف Open / منها المتأخر |
| `lost` | أصناف Lost |
| `recent_acquisitions` | آخر 5 `Acquired` في 30 يومًا |
| `needs_info` | بلا مكان/بلا تسلسلي (لفئة تتطلبه)/بلا إيصال |
| `estimated_value` | §6.10 بعلامة التغطية |

كلها Cache يُعاد بناؤه عند أي حدث (`inputs_hash`).

### 6.15 النقل إلى Home (Saga)

**عنصر مشترك بوضوح ← Home** (CX-04):

```text
1) المستخدم يضغط «انقل إلى المنزل» (ownership_scope = Household, transfer_state = Requested)
2) Inventory يرسل POST /home/items/from-source { source_ref, name, brand, model, identifiers, purchase_*, room_hint } بمفتاح Idempotency = transfer_key
3) Home يردّ home_item_ref (Acknowledged)  أو  Home غير متاح ← Queued (يُعاد)
4) Inventory يكتب حدث Transferred (يحمل home_item_ref) ← الصنف يصير Transferred ويُؤرشف من النشط
5) الضمانات والمرفقات: تبقى للتاريخ + تُمرَّر كمعلومات في الطلب (Home يقرر)
```

- **التراجع:** ما دام Home لم يردّ، يمكن إلغاء الطلب. بعد `Transferred` يعاد الشيء بـ`Reacquired`(source=HomeSync) يدويًا.
- **الاتجاه المعاكس** (من Home إلى هنا): Home يرسل حدث `home.item.transfer_requested` (**طلب على Home**)؛ نستقبل ونُنشئ صنفًا بـ`source_key`.
- **الكشف:** عند الإنشاء يُسأل Home اختياريًا `GET /home/items/search?serial=|q=`؛ تطابق ← عرض «يبدو أنه مسجَّل في Home — انقل/تجاهل» (لا منع).
- Home v4 **لا يملك** هذه الواجهات: طلبات تغيير §11.4. حتى تتوفر: النقل اليدوي (أنشئ هناك، ثم `Transferred` هنا بـ`manual_home_ref` نصي).

### 6.16 الإنشاء من مصدر (Shopping/Import) بلا تكرار

```text
source_key = "{system}:{type}:{id}:{line_no}"      مثل shopping:purchase:7c1…:1
POST /inventory/items/from-source   Idempotency-Key = source_key
  - أول مرة: ينشئ الصنف + حدث Acquired + (ضمان إن وُجدت معلومة) + رابط مالي مرجعي
  - تكرار: يعيد نفس الصنف (200) بلا إنشاء جديد
  - الكمية >1 ومصدر «Unique» ← ينشئ عدد أصناف = الكمية (كلٌّ بـline_no) أو صنفًا كمّيًا حسب إعداد الفئة
```

**مثال:** شراء 1 لابتوب (Shopping Purchase P1): استدعاءان لنفس `shopping:purchase:P1:1` ← صنف واحد وحدث Acquired واحد (IT-08).

---

## 7) سجل التعارضات (IC) وحلولها

> **ما هو** ← **لماذا مشكلة** ← **الحل المعتمد** ← **أين**. التعارضات 01–24 داخلية، 25–29 مع «قواعد التنفيذ المشتركة»، 30–34 مع بقية الأقسام.

### 7.1 تعارضات داخلية في المصدر

| # | التعارض | لماذا مشكلة | الحل المعتمد | أين |
| :---- | :---- | :---- | :---- | :---- |
| **IC-01** | `category_id` (FK) + `subcategory` (نص) | تكرار وتصنيف غير متسق | شجرة تصنيفات بـ`parent_id` | §5.2 |
| **IC-02** | `ownership_status` مصدره «User/System» | قيمة قابلة للتحرير تتناقض مع الأحداث | **مشتق** من الأحداث؛ لا يُحرَّر | §6.2 |
| **IC-03** | `condition` يشمل `Damaged` بينما الحالة `Lost/Disposed` | خلط حالة مادية بحالة ملكية | Condition = مادية فقط؛ الملكية مشتقة؛ سجل تغيّر الحالة | §5.4 |
| **IC-04** | `serial_number` واحد + «Serial uniqueness» | شيء بأكثر من رقم؛ ورقم يتكرر بين علامات | جدول معرّفات + تطبيع + منع داخل النشط وتحذير عبر العلامات | §5.5، §6.4 |
| **IC-05** | عنصر فريد مقابل «6 قمصان» | النموذج الفريد لا يحمل كمية | `tracking_mode`: Unique/Quantity/Bundle | §5.4–5.5 |
| **IC-06** | «عنصر في مكانين» | `location_id` واحد | الفريد: مكان واحد؛ الكمّي: `item_stock` موزَّع | §6.3 |
| **IC-07** | `location_id` على الصنف **و**`from/to_location` في الأحداث | مصدران للحقيقة | الموقع الحالي = Cache من آخر حدث | §6.2 |
| **IC-08** | `purchase_price` + `currency` وحيدان | أجنبي/هدية/ميراث/مجهول | `acquisition_kind` + سعر اختياري + سعر صرف مجمَّد | §5.4 |
| **IC-09** | `current_value` رقم واحد بلا تاريخ | يبدو حقيقة | `valuations` نقطية بتاريخ ومصدر وثقة | §5.9، §6.8 |
| **IC-10** | `finance_transaction_id` FK | عبر قسمين، وقد تُحذف المعاملة | Cache مرجعي في `finance_links` بلا FK + تحقق (IA-07) | §5.13 |
| **IC-11** | `receipt_id` FK | لا Documents OS | `file_ref` إلى Core Files + حساسية | §5.10 |
| **IC-12** | `warranty_until` على الصنف **و**Warranty Records | مصدران | الصنف Cache من السجلات؛ عدة ضمانات | §6.5 |
| **IC-13** | `replacement_due` على الصنف **و**Replacement Plans | مصدران | Cache من الخطة/فاصل الفئة | §6.7 |
| **IC-14** | `wishlist_item_id` FK إلى Shopping | تبعية صلبة بين قسمين | `wishlist_item_ref` بلا FK + حالة | §5.8 |
| **IC-15** | `type` للفئة: 7 قيم ثابتة بينما التصنيف شجرة | قيم لا تغطي (عتاد، هدايا) | `kind` تصنيفي + شجرة حرة | §5.2 |
| **IC-16** | مكان «With Someone» ↔ حدث الإعارة | ازدواج: مكان وإعارة | `WithPerson` **مشتق** من الإعارة؛ لا يُنشأ يدويًا إلا لتخزين دائم عند شخص | §6.2 |
| **IC-17** | `privacy_level` على المكان بلا أثر معرّف | لا يُعرف ماذا يُخفى | `privacy_tier` يحكم البحث/الإشعارات/التصدير | §14.1 |
| **IC-18** | `person` نص حر في الأحداث | ازدواج مع Relationships | `person_ref` + Snapshot (CX-01) | §5.6 |
| **IC-19** | شاشة «Documents» ↔ لا Documents OS | شاشة بلا نظام | Documents = **عرض** للمرفقات عبر Core Files + أصناف Documents | §5.10 |
| **IC-20** | «Total Items» غامض | قمصان 6 = 1 أم 6؟ | `items_count` و`units_count` معًا | §6.3 |
| **IC-21** | `Lost` مقابل `Loaned` لشيء لم يعد | شيء معار لم يرجع | `WrittenOff` على الإعارة ينتج `Lost` | §5.6 |
| **IC-22** | «لا تمسح التاريخ» ↔ `from_status/to_status` ↔ تصحيح أخطاء | لا مفر من خطأ بشري | Append-only + `Corrected` + حالة مشتقة؛ الحذف النهائي حق مستقل (§14.5) | §5.6 |
| **IC-23** | التاريخ يبقى بعد التخلّص ↔ حق الحذف | تعارض احتفاظ/خصوصية | الأرشفة افتراضيًا؛ «حذف نهائي» صريح للصنف أو الحساب مع إخطار | §9.1، §14.5 |
| **IC-24** | «موعد الاستبدال فات» بلا إجراء | تنبيه بلا مخرج | أرجئ/استبدل/لا يلزم + عدم تكرار | §6.7 |

### 7.2 مع «قواعد التنفيذ المشتركة»

| # | الحل |
| :---- | :---- |
| **IC-25** | FK داخل Inventory فقط؛ عبر الأقسام `ref + snapshot + state` (CX-02) |
| **IC-26** | المشتقات (حالة، موقع، ضمان، قيمة، لوحة) Cache قابل لإعادة البناء |
| **IC-27** | تواريخ الأحداث بتوقيت المستخدم `DATE`؛ لا استثناء سفر هنا |
| **IC-28** | `user_id` على التابعة + FK مركّب |
| **IC-29** | ترحيل = صفوف Asset اختيارية من Notion + Onboarding + CSV بـDry-run |

### 7.3 مع الأقسام الأخرى

| # | التعارض | الحل المعتمد |
| :---- | :---- | :---- |
| **IC-30** | **Home** يملك مقتنيات المنزل؛ وصفوف Asset في Notion مختلطة؛ وHome v4 بلا استقبال عنصر | `ownership_scope` + كشف بحثي + **نقل** بـSaga؛ طلبات على Home: `POST /home/items/from-source`، `GET /home/items/search`، `home.item.transfer_requested`. حتى ذلك: نقل يدوي |
| **IC-31** | **Shopping** سلسلة الشراء: Purchase ← Finance ← Ownership | عقد `from-source` بمفتاح فريد؛ معاملة Finance واحدة (يملكها Shopping) ومرجعها هنا فقط؛ لا ينشئ Inventory معاملة |
| **IC-32** | **Finance** يملك التقييم والأصول وصافي الثروة | قيمة Inventory معلومة؛ «تتبّع كأصل» يُنشئ أصل Finance بـ`inventory_item_ref`؛ السيارة = أصل Vehicle في Finance لا هنا (يُقترح ربط اختياري) |
| **IC-33** | **الضمان** عند Shopping (`warranty_months`) وهنا (CX-06) | Inventory المالك؛ Shopping يمرّر المعلومة عند الشراء فيُنشأ هنا سجل `Computed` |
| **IC-34** | **Sports/Travel** يحتاجان قراءة أصناف (عتاد/تعبئة) | قراءة فقط عبر `GET /inventory/items?kind=` و`/collections`؛ لا ملكية لهما على الأصناف؛ `sports_gear_ref` اختياري |

---
## 8) الفجوات المسدودة (IG) والتحسينات المضافة (IE)

### 8.1 الفجوات (IG)

| # | الفجوة | لماذا تهم | السدّ | أين |
| :---- | :---- | :---- | :---- | :---- |
| IG-01 | إدخال سريع | الإضافة الطويلة تقتل العادة | 3 حقول فقط (اسم + فئة + مكان) والباقي «استكمل لاحقًا» | §10.3 |
| IG-02 | مسح باركود/QR | أسرع بحث/إدخال | مسح محلي + ربط معرّف | §6.13 |
| IG-03 | ملصقات QR للأماكن/الأصناف | تعرف محتويات الصندوق بمسحه | توليد QR يفتح الصنف/المكان داخل التطبيق | §10.3 |
| IG-04 | إضافة بالصورة أولًا | لا وقت للكتابة | التقط صورة ← مسودة بلا اسم ← استكمل | §10.3 |
| IG-05 | تحويل كمّي ↔ فريد | تحتاج تتبع قطعة بعينها | «افصل قطعة» / «ادمج» بحدث مسجَّل | §6.3 |
| IG-06 | مطالبات الضمان | الضمان بلا مطالبة نصف مفيد | `warranty_claims` بحالات وتاريخ | §5.7 |
| IG-07 | سجل صيانة وإصلاح | تاريخ العطل يحدد الاستبدال | `service_records` + موعد قادم | §5.11 |
| IG-08 | عدة ضمانات للصنف | مصنّع + ممتد + متجر | `warranties` متعددة | §5.7 |
| IG-09 | صلاحية الوثائق (جواز/هوية/رخصة) | انتهاء وثيقة مفاجئ | `expiry_date` + تنبيه + قراءة Travel لصلاحية الجواز | §11.5 |
| IG-10 | حزمة تأمين/إثبات ملكية | عند سرقة/حريق | تصدير منظّم للأصناف المختارة (مع/بلا مرفقات) بعد إعادة مصادقة | §14.5 |
| IG-11 | جرد دوري | يعرف الناقص | Audit بمسح وقوائم | §5.12 |
| IG-12 | خصوصية الأماكن | «الخزنة» لا تظهر لأي أحد | Tier للمكان يحكم كل شيء بداخله | §14.1 |
| IG-13 | أشياء استعرتها من غيرك | تتبع ما عليك إرجاعه | `loans.direction=Borrowed` | §5.6 |
| IG-14 | أنواع اقتناء (هدية، ميراث، صُنع) | ليس كل شيء «مشترى» | `acquisition_kind` | §5.4 |
| IG-15 | عائد البيع | بيع بـ3,000 ثم؟ | حدث `Sold` بسعر + (طلب) `inventory_sale` في Finance | §11.3 |
| IG-16 | من الاستبدال إلى الرغبة | بلا ربط يضيع التذكير | حدث `inventory.replacement.needed` → Shopping يقترح بند رغبة | §11.2 |
| IG-17 | قرار القديم عند الاستبدال | يتراكم القديم | سؤال Keep/Sell/Dispose/Gift | §5.8 |
| IG-18 | كشف التكرار | نسيت أنك تملكه | تطبيع + اقتراح دمج | §6.4 |
| IG-19 | اكتمال البيانات | سجل ناقص = قليل الفائدة | «يحتاج استكمال»: بلا مكان/تسلسلي/إيصال/ضمان | §6.14 |
| IG-20 | تعديل جماعي ونقل جماعي | نقل صندوق كامل | تحديد متعدد + حدث لكل صنف بـ`group_event_id` | §10.3 |
| IG-21 | مجموعات/قوائم تعبئة | سفر/تصوير/موسم | `collections` | §5.5 |
| IG-22 | أوفلاين كامل | المخزن بلا شبكة | طابور + Idempotency | §13 |
| IG-23 | تصدير/حذف | حق المستخدم | JSON/CSV + حذف نهائي | §14.5 |
| IG-24 | عتاد الرياضة | Sports يحتاج قائمة معدات | فئة `Gear` + `sports_gear_ref` اختياري | §11.5 |
| IG-25 | جدولة صيانة دورية | تنظيف/فحص | `next_service_due` + تذكير | §5.11 |
| IG-26 | عملات متعددة | مشتريات من الخارج | عملة لكل سعر + سعر صرف مجمَّد | §5.4 |
| IG-27 | معرض صور للصنف | حالة قبل/بعد | عدة صور في `attachments(type=Photo)` | §5.10 |
| IG-28 | فلاتر التاريخ | شيء له 30 حدثًا | فلتر بالنوع/المدة | §10.3 |
| IG-29 | تصحيح الأخطاء بلا مسح | حدث مكان خاطئ | `Corrected` + Undo فوري 10 ثوانٍ | §6.2 |
| IG-30 | ما بعد التخلّص | البحث عن «ماذا حدث لـX» | الأرشيف قابل للبحث بفلتر «الخارج» | §9.1 |
| IG-31 | الإيصال المفقود | ضمان بلا إثبات | حالة «يحتاج إيصال» + تذكير لطيف | §6.14 |
| IG-32 | صلاحية بطاقة/اشتراك رقمي | أصول رقمية | `Digital` kind بلا قيمة افتراضيًا | §5.3 |

### 8.2 التحسينات (IE)

| # | التحسين | الفائدة | الحدود |
| :---- | :---- | :---- | :---- |
| IE-01 | «أين X؟» سريع (Widget/بحث عام) | الإجابة في ثانية | لا يعرض Secret على الشاشة الرئيسية |
| IE-02 | بحث صوتي نصي محلي | يد مشغولة | تحويل الصوت على الجهاز فقط؛ **غير مؤكد — يُتحقق** من الدعم |
| IE-03 | «آخر استخدام» اختياري | يعرف المهمل | تاريخ يدوي؛ لا تتبع تلقائي |
| IE-04 | قائمة «لم أستخدمه منذ سنة» | تنظيف | وصفية بلا لوم؛ اختيارية |
| IE-05 | تذكير لطيف «أضف إيصال» | ضمان يحتاج إثباتًا | مرة واحدة/صنف |
| IE-06 | تبديل موسمي للملابس | تدوير الدواليب | `collections` بموسم |
| IE-07 | «أعرته لـ…» من جهة اتصال | اختصار | عبر Relationships عند توفره |
| IE-08 | ملاحظة «آخر مكان رأيته فيه» | للمفقود | نص حر |
| IE-09 | تلميح تغطية التقييم | يحسّن الدقة | «قيّم 5 أصناف أخرى لتكتمل الصورة» |
| IE-10 | وضع «الإيجار/الإقامة المؤقتة» (مكان مؤقت) | شقة مؤقتة | مكان `is_mobile`/مؤقت |
| IE-11 | قوالب فئة (حقول مقترحة لكل فئة) | الإلكترونيات: IMEI، الملابس: المقاس | حقول `custom_fields` اختيارية |
| IE-12 | لقطة «حالة قبل التسليم» عند الإعارة | نزاع لاحق | صورة اختيارية |

> **حقول مخصصة (`custom_fields`):** IE-11 يضيف `inventory_items.custom_fields jsonb` (مفاتيح معرّفة في `inventory_field_defs(user_id, category_id, key, label, type)`)؛ لا بحث فيها افتراضيًا، وتُصدَّر.

---

## 9) دورات الحياة (Lifecycles) وقواعد التحقق (Validation)

### 9.1 دورات الحياة

**الصنف (حالة مشتقة من الأحداث):**

```text
[Draft*] ──(حفظ)──▶ Owned ◀──Returned/Found/Reacquired──┐
                      │  ├─Loaned───────────▶ Loaned ─────┘
                      │  ├─Lost─────────────▶ Lost ──Found──▶ Owned
                      │  ├─Sold/Gifted/Disposed ▶ (خارج)  ──Reacquired──▶ Owned
                      │  └─Transferred(Home)──▶ (خارج)
   * Draft = صنف ناقص (صورة بلا اسم) ؛ لا يظهر في المجاميع
```

- **الخارج** (Sold/Gifted/Disposed/Transferred): يختفي من القوائم النشطة، يبقى في «الأرشيف» بكامل التاريخ والمرفقات والبحث (IT-10). `Reacquired` يعيده بلا إنشاء صنف جديد.
- **الحذف:** حذف ناعم (`deleted_at`) فقط لصنف **بلا أحداث سوى Acquired** (أُنشئ بالخطأ). غير ذلك: أرشفة. **الحذف النهائي** حق صريح (§14.5) يُمحى معه التاريخ بإخطار.
- **الأحداث:** لا حذف. التصحيح `Corrected`.

**الإعارة:** `Open → Returned | WrittenOff`. إعارة جديدة لصنف فريد مفتوحة الإعارة مرفوضة. الإرجاع بتاريخ قبل `lent_on` مرفوض.

**الضمان:** `Active → Archived` (يدويًا أو تلقائيًا بعد 12 شهرًا من الانتهاء بإعداد). تغيير `end_date` يُسجَّل في Audit. حالة `state` مشتقة.

**المطالبة:** `Draft → Filed → InRepair → Resolved → Closed` أو `→ Denied → Closed`. إعادة فتح ممكنة (`Closed → Filed`) مع ملاحظة.

**الاستبدال:** `Suggested → Planned → SentToShopping → Replaced` وفروع `Dismissed/Snoozed`. `Replaced` يطلب «ماذا عن القديم؟». الصنف الجديد يُربط `replaced_by_item_id`.

**التقييم:** إضافة تقدير جديد يجعله `is_current` ويُبقي السابق للتاريخ.

**المكان/الفئة:** `Active → Archived`. أرشفة مكان فيه أصناف نشطة مرفوضة (انقلها أولًا) أو تُنقل لـ«بلا مكان» بتأكيد. حذف فئة بأصناف ← نقل لفئة بديلة أو «غير مصنّف».

**الجرد:** `InProgress → Completed | Cancelled`. لا تُطبَّق نتائجه إلا بتأكيد المستخدم سطرًا أو جملة.

**النقل (Saga):** `None → Requested → Sent → Acknowledged → Transferred` أو `Failed` (إعادة) أو `Cancelled`.

**الاستيراد/التزامن:** `Synced / Pending / Conflict` (§13.4).

### 9.2 قواعد التحقق (IV)

> ثلاث طبقات: الواجهة + الخادم (إلزامي) + قيود القاعدة. رسائل محايدة وواضحة.

| # | القاعدة | عند المخالفة |
| :---- | :---- | :---- |
| IV-01 | `name` غير فارغ ≤ 160 | رفض |
| IV-02 | `tracking_mode` يتسق مع الكمية: `Unique` ← كمية 1؛ `Quantity` ← ≥ 0 | رفض |
| IV-03 | معرّف نشط فريد لكل `(user, kind, value_norm)` | منع + عرض الموجود (§6.4) |
| IV-04 | `purchase_price ≥ 0` وعملة ISO معروفة عند وجود سعر | رفض |
| IV-05 | `acquired_on` ≤ اليوم + 1 | تأكيد |
| IV-06 | `warranty.end_date ≥ start_date` | رفض |
| IV-07 | `duration_months` ∈ [1, 600] | رفض |
| IV-08 | أحداث الأصناف: `event_date` ≥ `acquired_on` إن وُجد | تحذير/تأكيد |
| IV-09 | رصيد الكمية لا يصير سالبًا | رفض |
| IV-10 | الحدث يحمل `to_location` عند Moved/Found/Returned/Acquired (يمكن «بلا مكان») | رفض/«بلا مكان» |
| IV-11 | `Moved` لا يُنقل إلى نفس المكان | تجاهل مع رسالة |
| IV-12 | الانتقالات المسموحة فقط (§6.2) | `409 INVALID_TRANSITION` |
| IV-13 | إعارة لصنف فريد مُعار أصلًا | رفض |
| IV-14 | `returned_on ≥ lent_on` | رفض |
| IV-15 | عمق الفئات ≤ 3 والأماكن ≤ 6، بلا دورات | رفض |
| IV-16 | `Bundle`: لا ابن لابن (عمق ≤ 2) | رفض |
| IV-17 | `valuation.amount ≥ 0`؛ تاريخ ≤ اليوم | رفض |
| IV-18 | الإهلاك يُسمّى «تقدير» ولا يُحفظ بلا تأكيد | فحص نصوص |
| IV-19 | `replacement.expected_date` ≥ `acquired_on` | تحذير |
| IV-20 | مرفق: نوع/حجم ضمن حد Core Files | رفض |
| IV-21 | `Secret` يتطلب `masked_reference` عند العرض | تلقائي |
| IV-22 | `expiry_date` لفئة Documents تُنبّه إن < اليوم | تنبيه |
| IV-23 | `client_op_id` فريد (Idempotency) | يعيد النتيجة |
| IV-24 | نص حر ≤ 2000؛ تعقيم HTML | تعقيم |
| IV-25 | `source_key` فريد لكل مستخدم | يعيد الصنف نفسه |
| IV-26 | `person_display_name` إلزامي مع إعارة (حتى مع `person_ref`) | رفض |
| IV-27 | `Sold.price ≥ 0` مع عملة | رفض |
| IV-28 | CSV: UTF-8 وأعمدة معروفة | تقرير |
| IV-29 | التصدير للتأمين بإعادة مصادقة | رفض |
| IV-30 | نصوص الواجهة تمر بفحص لغة بلا لوم/بلا ادعاءات (قيمة «عادلة»، «مضمون») | فشل CI |

---
## 10) تجربة المستخدم والشاشات

### 10.1 خريطة الشاشات

| # | الشاشة | الغرض | مصدرها |
| :---- | :---- | :---- | :---- |
| 1 | **Inventory Home** | نظرة سريعة وبطاقات الانتباه | IF-31 |
| 2 | **الأصناف** | قائمة/شبكة، بحث، فلاتر، تحديد جماعي | المصدر |
| 3 | **تفاصيل الصنف** | الهوية، الملكية، المكان، الضمان، المستندات، الشراء، القيمة، التاريخ، الاستبدال | IF-32 |
| 4 | **إضافة سريعة** (Sheet) | 3 حقول + صورة + مسح | IG-01 |
| 5 | **التصنيفات** | شجرة | المصدر |
| 6 | **الأماكن** | شجرة + محتويات + QR | المصدر |
| 7 | **الضمان** (+ المطالبات) | مرتبة بالمتبقي | IF-33 |
| 8 | **الاستبدال** | طابور | IF-34 |
| 9 | **المستندات** | عرض المرفقات والوثائق (Core Files) | IC-19 |
| 10 | **الإعارات** | معار/مستعار، متأخر | المصدر |
| 11 | **التاريخ** (History) | Timeline شامل | IF-35 |
| 12 | **الجرد (Audit)** | جولة تأكد | IG-11 |
| 13 | **المجموعات** | تعبئة/عتاد/موسم | IG-21 |
| 14 | **الصيانة** | سجل خدمة وقادم | IG-07 |
| 15 | **الأرشيف** | الخارج (بيع/تخلّص/هدية/نقل) | IG-30 |
| 16 | **الإعدادات** | تنبيهات، خصوصية، تكاملات، تصدير/حذف، استيراد | المصدر |

### 10.2 شاشة Inventory Home

**البطاقات (الأعلى للأهم):**

1. **يحتاج انتباهك** (تظهر فقط عند وجود شيء): ضمان ينتهي قريبًا، معار تأخر، مفقود، موعد استبدال، وثيقة تنتهي، صيانة قادمة. كل بطاقة بإجراء واحد.
2. **أرقام سريعة:** «214 صنفًا (342 قطعة)» · معار 3 · مفقود 1 · ضمان قريب 4 · استبدال 2.
3. **أُضيف حديثًا** (آخر 5).
4. **يحتاج استكمالًا** («12 صنفًا بلا مكان»).
5. **التقدير** (إن لم يخفِه المستخدم): «تقدير 125,000 جنيه — 41 من 58 مُقيَّم».
6. بحث دائم في الأعلى + زر ➕ + زر مسح.

**الحالات الأربع (إلزامية):**

| الحالة | العرض |
| :---- | :---- |
| فارغة | «لم تضف شيئًا بعد» + أضف أول شيء / استورد CSV / ابدأ بصورة |
| تحميل | هيكل عظمي؛ البيانات المحلية فورًا |
| خطأ | رسالة + إعادة محاولة؛ لا فقد للمحلي |
| أوفلاين | شارة «غير متصل — كل شيء محفوظ هنا» |

### 10.3 الشاشات بالتفصيل

**إضافة سريعة:** الاسم (اقتراح من التاريخ) + الفئة (آخر المستخدمة) + المكان (آخر مكان) + صورة اختيارية ← **حفظ** ← بطاقة «استكمل: الرقم التسلسلي، السعر، الضمان، الإيصال». زر «حفظ وأضف آخر» يحتفظ بالفئة والمكان. مسح باركود يملأ الاسم/الماركة إن وُجد في بيانات المستخدم (لا خدمة خارجية افتراضيًا، ID-07).

**قائمة الأصناف:** عرض قائمة/شبكة صور؛ فرز (الأحدث، الاسم، القيمة، الضمان)؛ فلاتر (§6.13)؛ تحديد جماعي: نقل، تغيير فئة، وسم، أرشفة، إضافة لمجموعة، تصدير. شارات صغيرة: «معار»، «ضمان قريب»، «بلا مكان».

**تفاصيل الصنف (تبويبات):**

| التبويب | المحتوى |
| :---- | :---- |
| **الهوية** | الاسم، الماركة/الموديل، المعرّفات (مع نسخ/إظهار للـSecret بعد إعادة مصادقة)، الفئة، الصور، الوسوم، الحقول المخصصة |
| **الملكية** | الحالة الحالية، أزرار: نقل · إعارة · إرجاع · بيع · إهداء · تخلّص · مفقود · وجدته · نقل إلى المنزل |
| **المكان** | المكان الحالي + المسار، المخزون الموزّع للكمّي، «افصل قطعة» |
| **الضمان** | الضمانات (شارات الحالة)، المتبقي بالأيام، مطالبات، إضافة ضمان (مدة أو تاريخ) |
| **المستندات** | الإيصال، دليل الاستخدام، إثبات الملكية؛ Secret مقنَّع |
| **الشراء** | تاريخ، سعر، عملة، البائع، رابط المعاملة (Finance) إن وُجد، حالة الربط |
| **القيمة** | آخر تقدير + تاريخه ومصدره وثقته، سجل التقديرات، الربح/الخسارة بشروطه، «اقترح بالإهلاك» (إن مفعَّل)، «تتبّع كأصل» |
| **التاريخ** | Timeline (الأحداث، الإعارات، الخدمات، المطالبات، التقييمات) بفلاتر |
| **الاستبدال** | الخطة، التاريخ ومصدره، الميزانية، «أرسل لـShopping» |

**الأماكن:** شجرة قابلة للطي مع عدّاد الأصناف؛ فتح مكان يعرض محتوياته (وأبناءه اختياريًا)؛ زر «اطبع ملصق QR»؛ «ابدأ جرد هذا المكان». الأماكن Secret لا تظهر عند إخفائها بإعداد `hide_secret_locations` إلا بعد فتح القفل.

**الضمان:** قائمة مرتبة بالمتبقي (الأقرب أولًا): الصنف، المزوّد، المتبقي، الحالة، زر اتصال/رابط الدعم. فلتر: ينتهي قريبًا / سارٍ / منتهٍ / غير معروف. «غير معروف» قسم مستقل بعنوان «أكمل التواريخ».

**الاستبدال:** طابور: المتأخر ثم القادم؛ لكل بند: السبب، المصدر («تقدير حسب فاصل الفئة»)، أزرار: أرجئ · أرسل لـShopping · استبدلت · لا يلزم.

**الإعارات:** تبويبان: «أعرتُ» و«استعرتُ»؛ لكل إعارة: الشخص، الصنف، منذ متى، الموعد، حالة (`DueSoon/Overdue`)، أزرار: «رجع» · «أرجئ الموعد» · «أرسل تذكيرًا لي» · «لن يعود (مفقود)».

**التاريخ العام:** Timeline لكل الأحداث مع فلتر النوع والفترة والصنف.

**الجرد:** اختر النطاق (مكان/فئة/الكل) ← قائمة المتوقع ← مسح/تأشير «موجود/في مكان آخر/غير موجود/تخطّي» ← مراجعة ← تطبيق بتأكيد.

**الإعدادات:** التنبيهات (أيام الضمان/الاستبدال/الإعارة)، الخصوصية (إخفاء المبالغ، إخفاء الأماكن Secret، قفل التطبيق)، التكاملات وموافقاتها، الاستيراد، التصدير (بما فيه حزمة التأمين)، «حذف بياناتي».

### 10.4 الموبايل والسرعة

- إضافة صنف مكرر الفئة/المكان ≤ **4 نقرات**؛ فتح Home من الكاش ≤ 1 ثانية؛ بحث محلي ≤ 200 ms لعشرة آلاف صنف.
- الإبهام: زر ➕ ومسح في الأسفل. كاميرا مدمجة للصور والباركود/QR.
- Widget «أين X؟» (IE-01) بلا عرض Secret.

### 10.5 الوصول واللغة

RTL كامل؛ أرقام لاتينية أو هندية؛ تباين وأحجام خط؛ كل شارة حالة نص + أيقونة (لا اللون وحده)؛ `alt` للصور من المستخدم.

### 10.6 قواعد الصياغة (ملزمة)

1. **القيمة:** لا تُكتب «القيمة العادلة/السوقية/المضمونة». تُكتب «تقدير» مع تاريخ ومصدر.
2. **لا لوم:** «لم تُنظَّف منذ…» ممنوعة؛ بدلها «آخر صيانة قبل 14 شهرًا».
3. **الإعارة:** لا ذنب على المستعير: «ما زال معه؟» لا «لم يُرجعه».
4. **التأمين/القانون:** «حزمة معلومات منظّمة» لا «إثبات قانوني».
5. **الأرقام الناقصة:** «غير محدد» لا «0».
6. فحص آلي لنصوص الواجهة في CI (IV-30، IT-60).

---

## 11) التكاملات وعقود API

### 11.1 المبادئ

1. Inventory **يعمل كاملًا بلا أي قسم آخر** (§3.3). كل تكامل **اختياري، بموافقة صريحة، قابل للإيقاف**.
2. **عقود فقط**: لا جداول مشتركة؛ المراجع `*_ref`؛ الفشل تدهور هادئ.
3. **ما يخرج:** لا مواقع ولا أرقام تسلسلية ولا قيم في أي حدث صادر (إلا معرّفات معتمة). `outbound_events` معظمها OFF.
4. الأحداث `inventory.{entity}.{verb}` + Outbox + at-least-once (CX-17).
5. **طلبات التغيير على الأقسام الأخرى** مسمّاة هنا *(طلب)* ولا نفترض وجودها.

### 11.2 Shopping

| الاتجاه | العقد | ملاحظة |
| :---- | :---- | :---- |
| Shopping → Inventory | `POST /inventory/items/from-source` (Idempotency-Key = `source_key`) أو حدث `shopping.purchase.completed` *(طلب على Shopping: يحمل `purchase_id`, `lines`, `warranty_months`, `store`, `finance_link_ref`)* | ينشئ صنفًا واحدًا + Acquired + ضمان Computed |
| Inventory → Shopping | حدث `inventory.replacement.needed` `{item_ref, reason, budget?, due}` | Shopping يقترح بند رغبة ولا يشتري؛ يردّ `wishlist_item_ref` عبر `PATCH /inventory/replacements/{id}/link` |
| Shopping → Inventory | `shopping.purchase.refunded` | يُقترح `Disposed/Returned` للصنف (تأكيد المستخدم) *(طلب)* |

**تدهور:** بدون Shopping، «أرسل» يتحول لتذكير داخلي. **لا Purchase تلقائيًا** (IF-26). المعاملة المالية يملكها Shopping/Finance؛ هنا مرجعها فقط (IC-31).

### 11.3 Finance

| العقد | الاستخدام |
| :---- | :---- |
| `GET /finance/transactions/{id}` (قراءة) | التحقق من وجود معاملة الشراء وتطابق المبلغ/التاريخ (IA-07) → `Valid/Missing/NoAccess` |
| `POST /finance/assets` *(موجود في Finance v4.1 حسب وثيقته — يُتحقق)* | «تتبّع كأصل» ← أصل بقيمة مدخلة وبمرجع `inventory_item_ref`؛ **القيمة تُدار هناك** |
| `POST /finance/transactions/from-source` | مصروف الإصلاح: `source_type=inventory_repair` *(طلب: نوع مصدر جديد)* · عائد البيع: `inventory_sale` *(طلب)* — بمفتاح Idempotency، **بلا أي اسم/ملاحظات/رقم تسلسلي** (CX-03) |
| `GET /finance/exchange-rates/current` | عرض مبالغ بعملات مختلفة |
| `GET /finance/summary?source_system=inventory` *(طلب)* | تكلفة الصيانة/الشراء |

**قاعدة:** معاملة واحدة لكل دفعة حقيقية؛ الحالات `Not Required|Pending|Synced|Failed|Detached|Legacy`؛ فشل المزامنة لا يوقف الحدث المحلي. **السيارة:** أصل Vehicle في Finance؛ Inventory لا يمثلها إلا لو أراد المستخدم ملحقاتها (إطارات، شاحن) كأصناف.

**تدهور:** بدون Finance: لا ربط، السعر يدوي، الأزرار المالية مخفية.

### 11.4 Home

| الاتجاه | العقد | الحالة |
| :---- | :---- | :---- |
| Inventory → Home | `POST /home/items/from-source` (نقل) | *(طلب)* |
| Inventory → Home | `GET /home/items/search?serial=&q=` (كشف تكرار) | *(طلب)* |
| Home → Inventory | `home.item.transfer_requested` (نقل عكسي) | *(طلب)* |
| Home → Inventory | `home.room.deleted` / `home.room.renamed` | يحدّث `home_room_ref_state/snapshot` للأماكن المرتبطة |

**لا تكرار:** عند `Transferred` يخرج الصنف من النشط ويحمل `home_item_ref`. **تدهور:** نقل يدوي (§6.15).

### 11.5 Relationships وTravel وSports

| القسم | العقد | الاستخدام |
| :---- | :---- | :---- |
| **Relationships** | `GET /relationships/people/search?q=` + `person_ref` | اختيار المُستعير/المُعير؛ حدث اختياري `inventory.loan.created/returned` ← ذاكرة تفاعل (OFF افتراضيًا) |
| **Travel** | `GET /inventory/collections?kind=PackingTemplate` · `GET /inventory/items?ids=` · `GET /inventory/documents/validity?kind=Passport` | قوائم تعبئة وأصنافها (بلا مواقع) + **صلاحية** الوثيقة (تاريخ فقط، بلا رقم) · حدث `travel.trip.started` ← أصناف السفر مؤقتًا `Moved(→Travel location)` بتأكيد (اختياري) |
| **Sports** | `GET /inventory/items?kind=Gear` + `sports_gear_ref` | قائمة العتاد؛ Sports لا يكتب في Inventory؛ حدث اختياري `inventory.item.disposed` لتحديث مرجعه |

### 11.6 Today / Calendar / Notifications

- `GET /inventory/feed/today` (سقف 5 بطاقات): ضمان ينتهي، معار متأخر/مستحق، استبدال، وثيقة تنتهي، مفقود، صيانة قادمة؛ بنصوص محايدة للـSensitive/Secret.
- **Calendar** يعرض تواريخ (انتهاء الضمان، موعد الإرجاع، الاستبدال) بـ`source_id` ولا يستنسخها.
- **الإشعارات** عبر Core: ساعات الهدوء، سقف يومي، **نص شاشة القفل محايد** («تذكير بخصوص أحد ممتلكاتك») دون اسم الصنف إن كان Sensitive/Secret.

### 11.7 Core Files والبحث

- **Core Files:** رفع/عرض/حذف المرفقات؛ فئة الحساسية؛ Secret مشفَّر ويُعرض بعد إعادة مصادقة؛ `masked_reference`.
- **Core Search:** معطّل افتراضيًا (ID-09). عند التفعيل يفهرس **الأسماء العامة للأصناف Normal فقط** بلا معرّفات ولا مواقع ولا قيم.
- **Core Goals:** لا استخدام (لا أهداف).

### 11.8 الأحداث الصادرة

| الحدث | الحمولة | الافتراضي |
| :---- | :---- | :---- |
| `inventory.item.acquired` | `{item_id, kind}` بلا قيم | OFF |
| `inventory.item.transfer_requested` | `{item_ref, home_payload}` | ON عند الطلب فقط |
| `inventory.replacement.needed` | `{item_id, reason, due, budget?}` | ON إن فُعِّل Shopping |
| `inventory.warranty.expiring` | `{item_id, end_date}` | OFF |
| `inventory.loan.created/returned` | `{loan_id, person_ref}` | OFF |
| `inventory.item.disposed` | `{item_id}` (لـSports/Home مرجع) | OFF |
| `inventory.data.deleted` | `{scope}` | ON (تنظيف المراجع) |

### 11.9 واجهة API (REST)

**اتفاقيات:** جلسة المستخدم؛ `Idempotency-Key` على POST/PUT؛ `If-Match: version`؛ أرقام نصية؛ Cursor؛ أخطاء `{code, message_ar, details}`.

| المجموعة | المسارات | أخطاء |
| :---- | :---- | :---- |
| الأصناف | `GET/POST /inventory/items` · `GET/PATCH/DELETE …/{id}` · `POST …/{id}/archive` · `POST …/{id}/split` · `POST …/{id}/merge` · `GET /inventory/items/search?q=&serial=` · `POST /inventory/items/from-source` · `POST /inventory/items/bulk` | `409 DUPLICATE_IDENTIFIER` · `409 VERSION_CONFLICT` · `422 INVALID_TRACKING` |
| المعرّفات | `GET/POST /inventory/items/{id}/identifiers` · `DELETE …/{iid}` | `409 DUPLICATE_IDENTIFIER` |
| التصنيفات | `GET/POST /inventory/categories` · `PATCH/DELETE …/{id}` | `409 CATEGORY_IN_USE` · `422 CYCLE` |
| الأماكن | `GET/POST /inventory/locations` · `PATCH/DELETE …/{id}` · `GET …/{id}/contents` · `GET …/{id}/qr` | `409 LOCATION_NOT_EMPTY` |
| الأحداث | `GET/POST /inventory/events` (move/loan/return/sell/gift/dispose/lost/found/adjust) · `POST /inventory/events/{id}/correct` | `409 INVALID_TRANSITION` · `422 NEGATIVE_STOCK` |
| الإعارات | `GET/POST /inventory/loans` · `POST …/{id}/return` · `POST …/{id}/writeoff` · `PATCH …/{id}` | `409 ALREADY_LOANED` |
| الضمان | `GET/POST /inventory/warranties` · `PATCH/DELETE …/{id}` · `GET /inventory/warranties/upcoming` | `422 DATES_INVALID` |
| المطالبات | `GET/POST /inventory/warranty-claims` · `PATCH …/{id}` · `POST …/{id}/status` | |
| الاستبدال | `GET/POST /inventory/replacements` · `PATCH …/{id}` · `POST …/{id}/send-to-shopping` · `POST …/{id}/snooze` · `PATCH …/{id}/link` | `502 SHOPPING_UNAVAILABLE` (طابور) |
| التقييم | `GET/POST /inventory/items/{id}/valuations` · `POST …/suggest-depreciation` | |
| المرفقات | `GET/POST /inventory/attachments` · `GET …/{id}/open` (Secret بإعادة مصادقة) · `DELETE …/{id}` | `403 REAUTH_REQUIRED` |
| الصيانة | `GET/POST /inventory/services` · `PATCH …/{id}` | |
| الجرد | `GET/POST /inventory/audits` · `PUT …/{id}/lines/{line}` · `POST …/{id}/apply` | |
| المجموعات | `GET/POST /inventory/collections` · `PUT …/{id}/items` | |
| اللوحة | `GET /inventory/dashboard` · `GET /inventory/feed/today` | |
| الاستيراد/التصدير | `POST /inventory/import` (dry-run/apply) · `POST /inventory/export` (`mask`, `insurance_pack`) | `403 REAUTH_REQUIRED` |
| المزامنة | `POST /inventory/sync/push` · `GET /inventory/sync/pull?since=` | `409` لكل عملية |
| الإعدادات | `GET/PATCH /inventory/settings` · `GET /inventory/capabilities` | |
| الصيانة الداخلية | `POST /inventory/rebuild` | |
| الخصوصية | `POST /inventory/data/delete` | إعادة مصادقة |

---

## 12) الأتمتة (Automations)

> كلها **Idempotent** بمفتاح، تحترم ساعات الهدوء وسقف الإشعارات، ويمكن إيقافها فرديًا، ونصوصها محايدة وبلا لوم.

| # | الأتمتة | المشغّل | المفتاح | الافتراضي |
| :---- | :---- | :---- | :---- | :---- |
| IA-01 | تنبيه الضمان | يوميًا: `remaining_days ∈ reminder_days` | `(warranty, days_left)` | ON |
| IA-02 | تنبيه الاستبدال | موعد ضمن نافذة / فات | `(plan, window)` | ON |
| IA-03 | تذكير إرجاع الإعارة | قبل/يوم الموعد + أسبوعي بعد التأخر | `(loan, date)` | ON |
| IA-04 | متابعة المفقود | بعد `lost_followup_days` ثم كل 30 يومًا | `(item, n)` | ON |
| IA-05 | تذكير الصيانة القادمة | `next_service_due` | `(service, date)` | ON |
| IA-06 | ربط Shopping: إنشاء الصنف من الشراء | `shopping.purchase.completed` | `source_key` | ON إن فُعِّل |
| IA-07 | التحقق من ربط Finance | أسبوعيًا + عند الفتح | `(link, week)` | ON إن فُعِّل |
| IA-08 | مراجعة التقييم | كل `valuation_review_months` | `(user, period)` | OFF |
| IA-09 | تنبيه صلاحية وثيقة | `expiry_date − n` | `(item, days_left)` | ON |
| IA-10 | إعادة بناء المشتقات (حالة/موقع/ضمان/لوحة) | تغيّر حدث | `(item, inputs_hash)` | ON |
| IA-11 | أرشفة الضمان المنتهي بعد 12 شهرًا | يوميًا | `(warranty,'archive')` | OFF |
| IA-12 | إعادة محاولة النقل لـHome | فشل | `transfer_key` | ON |
| IA-13 | تذكير «أضف إيصال» (مرة) | بعد 7 أيام من الإضافة | `(item,'receipt')` | OFF |
| IA-14 | تنظيف المسودات الفارغة | أسبوعيًا | `(draft,'gc')` | ON |
| IA-15 | تحديث مراجع Home/Shopping (`Valid/Missing`) | عند حدث الحذف | `(ref, event)` | ON |
| IA-16 | حذف نهائي بعد المهلة | يوميًا | `(entity,'purge')` | ON |

**الإشعارات:** تجميع (Digest) يومي اختياري؛ لا إشعار بقيمة أو مكان؛ كتم/تأجيل بضغطة؛ سقف 5 يوميًا.

---
## 13) العمل بلا اتصال (Offline) والمزامنة

### 13.1 المبدأ
كل العمليات اليومية تعمل **بلا إنترنت**: الإضافة، البحث، المسح، النقل، الإعارة، الجرد، عرض الضمان والمرفقات المحمّلة. الخادم نسخة مرجعية لا شرط استخدام.

### 13.2 ما يُخزَّن محليًا

| البيانات | السياسة |
| :---- | :---- |
| الأصناف والمعرّفات والأماكن والتصنيفات والأحداث والضمانات والإعارات | كاملة (حجمها صغير) |
| المشتقات | تُحسب محليًا بنفس المحرك (§6) |
| الصور | مصغّرات محلية، الأصل عند الطلب |
| مرفقات Normal | عند الطلب/تثبيت يدوي «متاح أوفلاين» |
| مرفقات Secret | **لا تُخزَّن محليًا** إلا بتفعيل صريح ومشفّرة بمفتاح الجهاز |

### 13.3 طابور العمليات
كل تغيير عملية `{client_op_id, type, payload, base_version}` تُدفع بالترتيب عبر `sync/push`؛ الخادم يطبّق مرة واحدة (Idempotency). الفشل المؤقت يُعاد بتراجع أُسّي؛ الدائم يظهر للمستخدم دون فقد الإدخال.

### 13.4 التعارض والدمج

| الحالة | الحل |
| :---- | :---- |
| حقول مختلفة لنفس الصنف | دمج |
| نفس الحقل | الأحدث + أثر في Audit + إشعار «تم دمج تعديلين» |
| **أحداث ملكية متعارضة** (Moved على جهازين لنفس الصنف) | **كلاهما يُحفظ** (append-only) بترتيب `event_date, seq`؛ الموقع الحالي = آخرهما؛ إن تعارضت الحالة (Sold على جهاز وMoved على آخر بعده) يُوسَم الصنف «يحتاج مراجعة» ويقترح تصحيحًا |
| تعديل مقابل حذف | الحذف يفوز مع استعادة |
| معرّف تسلسلي مكرر من جهازين | الأول يُقبل؛ الثاني `Conflict` مع عرض الموجود |
| إعارتان لنفس الصنف | الأولى تُقبل؛ الثانية تُرفض بوضوح عند المزامنة ويُطلب قرار |
| ساعة جهاز خاطئة | `received_at` على الخادم + تنبيه إن الفرق > 24 ساعة |

حالة كل عنصر: `Synced / Pending / Conflict` + شارة «n عمليات بانتظار».

### 13.5 ما لا يعمل أوفلاين
النقل إلى Home، التحقق من معاملة Finance، فتح مرفق Secret غير محمّل، التصدير الكامل. تظهر معطّلة برسالة واضحة، والطلبات تُجدول (Queued).

---

## 14) الأمان والخصوصية

### 14.1 مستويات الخصوصية (CX-16)

| الكيان | الافتراضي | قابل للرفع | سياسات |
| :---- | :---- | :---- | :---- |
| الأصناف عمومًا | Normal | نعم | الاسم يظهر في البحث العام فقط لو Normal وفُعِّلت الفهرسة |
| فئة Valuables/Documents | **Sensitive** (Documents الهوية/الجواز: **Secret**) | | لا بحث عام، لا إشعارات بالاسم، لا أحداث صادرة بتفاصيل |
| الأماكن | Normal | نعم | مكان Secret ← كل ما بداخله Secret ضمنيًا، يختفي من الشاشات حتى فتح القفل |
| المعرّفات (Serial) | Normal؛ `LicenseKey/PlateNo` Sensitive | نعم | لا تصدير إلا بإعادة مصادقة |
| المرفقات | تتبع الصنف؛ الوثائق Secret | نعم | Core Files؛ عرض بإعادة مصادقة |
| الإعارات | Normal | | الاسم Snapshot فقط يظهر |
| التقييمات والمبالغ | Sensitive | | إخفاء بـ`mask_values` |

**قاعدة الأمان:** قائمة بما تملك وأين تضعه معلومة ثمينة لمن يريد الضرر؛ فلذلك: لا أماكن ولا أرقام ولا قيم في أحداث صادرة أو إشعارات أو بحث عام افتراضيًا.

### 14.2 الضوابط

- TLS أثناء النقل، تشفير عند التخزين؛ البيانات المحلية بمفتاح الجهاز؛ Secret بتشفير إضافي بمفتاح مشتق من مصادقة المستخدم **(تفاصيل التنفيذ تُراجَع مع مختص أمن — غير مؤكد)**.
- العزل بـ`user_id` من الجلسة؛ FK مركّب (IC-28)؛ لا يُقبل `user_id` من الطلب.
- **قفل التطبيق** اختياري ويُلزم للـSecret؛ مهلة تلقائية؛ تمويه لقطة الشاشة.
- الأحداث `ownership_events` **INSERT-only** على مستوى صلاحيات القاعدة.
- Audit غير قابل للتعديل لتغييرات الخصوصية والتصحيح والحذف والتصدير.
- المشغّل لا يرى بيانات الممتلكات إلا بإذن مؤقت من المستخدم.

### 14.3 التكاملات
موافقة لكل تكامل واتجاه مع «ما الذي سيُشارَك بالضبط». سحبها يوقف التدفق ويجعل المراجع `Detached`.

### 14.4 القانون
قانون حماية البيانات الشخصية المصري رقم 151 لسنة 2020 مرجع عام (**ليس استشارة قانونية**). مبادئ مطبّقة: الحد الأدنى من الجمع، غرض واضح، حق الوصول/التصدير/الحذف. بيانات الأطراف الثالثة (اسم المُستعير) تُحفظ كاسم Snapshot فقط.

### 14.5 التصدير والحذف

- **تصدير كامل:** JSON + CSV لكل جدول، ملف في Core Files برابط ينتهي، بإعادة مصادقة؛ خيار `mask` لإخفاء Secret/القيم.
- **حزمة التأمين (IG-10):** يختار المستخدم أصنافًا ← ملف منظّم (الاسم، الفئة، الماركة/الموديل، الرقم التسلسلي، تاريخ/سعر الشراء، التقدير بتاريخه، صور، إيصالات) بإعادة مصادقة؛ **لا ادعاء قانوني**.
- **حذف صنف نهائيًا:** يمحو أحداثه ومرفقاته (إشعار «لن يمكن التراجع»)؛ المرجع الخارجي يصير `Missing`.
- **حذف الحساب:** مهلة تراجع 7 أيام ثم حذف نهائي وفق جدول الاحتفاظ، وإصدار `inventory.data.deleted`.
- **الاحتفاظ:** المحذوف الناعم 30 يومًا؛ الـAudit 12 شهرًا؛ الكاش ساعات.

---

## 15) الترحيل والاستيراد

### 15.1 الواقع
لا توجد قاعدة ممتلكات شخصية في Notion. توجد **📦 Home Inventory** (مستهلكات + أصول منزلية) — لا تُرحَّل آليًا (§1.2).

### 15.2 ترحيل اختياري لصفوف Asset من Notion
1. المستخدم يصدّر القاعدة CSV من Notion (أو نقرأها قراءة فقط بإذنه).
2. **فلترة تلقائية:** `Item Type = Asset` فقط؛ `Consumable` يُترك لـHome (لا يُستورد).
3. **جدول قرار:** لكل صف يختار: **شخصي** ← يُستورد هنا، **منزلي** ← يبقى/يذهب لـHome، **تجاهل**. اقتراح أولي: `Electronics/Tools` ← شخصي، `Furniture` ← منزلي (قابل للتغيير).
4. **التطابق:** `Item Name` ← name · `Category` ← تصنيف (يُنشأ إن لم يوجد) · `Model` · `Serial Number` ← معرّف Serial · `Purchase Date` ← acquired_on · `Unit Cost × Quantity` ← السعر (إن كانت `Quantity>1` فاسأل: كمّي أم أصناف) · `Warranty Until` ← ضمان (`end_date_source=Entered`) · `Storage Location`/`Room / Location` ← مكان نصي (يُنشأ) · `Notes` · `Supplier` ← seller_name.
5. **لا تُستورد:** `Stock Status`, `Total Value` (مشتقات)، `Expiry Date` (مستهلكات)، علاقات `Maintenance Issues`/`Shopping Item` (تبقى في Home/Shopping).
6. Dry-run بتقرير ثم تطبيق بـ`source_key=notion:{page_id}` (إعادة الاستيراد لا تكرّر). لم أفحص صفوف القاعدة؛ قد تكون قليلة.

### 15.3 Onboarding (6 خطوات، كلها قابلة للتخطي)
1. العملة والمنطقة الزمنية.
2. التصنيفات (بذور اقتراحية قابلة للحذف).
3. الأماكن الأساسية (بيت/مكتب/سيارة…).
4. أول 5 أصناف بصور سريعة.
5. التنبيهات (أيام الضمان).
6. التكاملات (كلها مغلقة).

### 15.4 استيراد CSV

| الأعمدة الأساسية | name, category, brand, model, serial, acquired_on, price, currency, location, condition, warranty_end, notes |
| :---- | :---- |

الخطوات: رفع ← ربط الأعمدة ← **Dry-run** (OK/تحذير/خطأ/تخطّي، تكرارات تسلسلي، مواقع جديدة) ← تأكيد ← تطبيق بـ`source_key` ← تقرير. الأصناف المستوردة تُنشئ حدث `Acquired` (`source=Import`) بتاريخ الاقتناء إن عُرف وإلا تاريخ الاستيراد موسوم.

---

## 16) اختبارات القبول (IT)

> IT-01…IT-10 هي الاختبارات العشرة الأصلية بالترتيب؛ الباقي يغطي الفجوات والتعارضات.

| # | الاختبار | المتوقع |
| :---- | :---- | :---- |
| IT-01 | أضف لابتوب في «المكتب ‹ الدرج» ثم ابحث عنه | يظهر باسمه ومساره الكامل |
| IT-02 | أضف صنفين بنفس الرقم التسلسلي (نشطين) | الثاني `409 DUPLICATE_IDENTIFIER` مع عرض الأول |
| IT-03 | انقل صنفًا | حدث Moved جديد؛ الموقع الحالي تغيّر؛ القديم باقٍ في التاريخ |
| IT-04 | أعِر ثم أرجع | حدثان + سجل إعارة Returned؛ الحالة Owned |
| IT-05 | ضمان ينتهي بعد 14 يومًا (نافذة 30) | `ExpiringSoon` والمتبقي 14 |
| IT-06 | استبدال بموعد خلال نافذة التذكير | تنبيه مرة واحدة بمفتاح idempotent |
| IT-07 | صنف مرتبط بمعاملة Finance | الرابط `Valid` والمبلغ/التاريخ مطابقان؛ لا معاملة جديدة أُنشئت |
| IT-08 | استدعاء `from-source` مرتين لنفس الشراء | صنف واحد وحدث Acquired واحد |
| IT-09 | ابحث بالرقم التسلسلي ثم بالموديل | يجد الصنف في الحالتين |
| IT-10 | بع صنفًا ثم ابحث في الأرشيف | التاريخ كاملًا موجود |
| IT-11 | `Sold` لصنف مُعار | `409 INVALID_TRANSITION` |
| IT-12 | `Returned` بلا إعارة مفتوحة | رفض |
| IT-13 | `Moved` لصنف Disposed | رفض ويقترح Reacquired |
| IT-14 | `Reacquired` لصنف مباع بنفس الرقم | نفس الصنف يعود Owned |
| IT-15 | رقم تسلسلي لصنف مباع يُعاد لصنف جديد | مسموح مع اقتراح Reacquired |
| IT-16 | نفس الرقم لعلامتين مختلفتين | تحذير لا منع (إن كان الصنفان نشطين من فئتين) |
| IT-17 | تصحيح حدث نقل خاطئ | حدث `Corrected` والأصلي مشطوب؛ الموقع صحّ |
| IT-18 | محاولة DELETE/UPDATE حدث ملكية | مرفوضة على مستوى القاعدة |
| IT-19 | 6 قمصان: انقل 2 لمكان آخر | `on_hand=6` موزّعة 4/2 |
| IT-20 | سحب كمية أكبر من المتاح | `422 NEGATIVE_STOCK` |
| IT-21 | «افصل قطعة» من كمّي | صنف فريد جديد + حدث QuantityAdjusted |
| IT-22 | حزمة (كاميرا+عدسة): نقل الأب | يُنقل الابنان بـgroup_event_id |
| IT-23 | بيع الحزمة | يسأل «كل الأبناء؟» |
| IT-24 | ضمانان لصنف (مصنّع+ممتد) | الحالة = الأفضل؛ `warranty_until` = الأبعد |
| IT-25 | ضمان 24 شهرًا من 2026-03-15 | نهاية 2028-03-14 `Computed` |
| IT-26 | ضمان من 31 يناير + شهر | 28 فبراير |
| IT-27 | ضمان بلا تاريخ شراء ولا بداية | `Unknown` بلا تنبيه ويظهر في «أكمل» |
| IT-28 | ينتهي الضمان اليوم | `ExpiringSoon` (0 يوم) |
| IT-29 | بعد انتهاء الضمان بيوم | `Expired` |
| IT-30 | مطالبة ضمان تُغلق بإصلاح | ينتج سجل خدمة (إن اختار) |
| IT-31 | موعد استبدال فات | بطاقة وصفية + أزرار؛ «لا يلزم» يوقف الاقتراح نهائيًا |
| IT-32 | استبدال ← «أرسل لـShopping» | حدث `replacement.needed` ولا Purchase |
| IT-33 | Shopping غائب | يتحول لتذكير داخلي |
| IT-34 | فاصل الفئة 1,460 يومًا والاقتناء 2024-01-10 | موعد 2028-01-09 موسوم «تقدير» |
| IT-35 | القيمة 18,000 والسعر 25,000 | −7,000 (−28.00%) |
| IT-36 | عملتان مختلفتان بلا سعر صرف | «غير محدد» لا رقم مضلل |
| IT-37 | شراء واحد مرّ بـShopping وFinance وInventory | معاملة Finance **واحدة** وصنف واحد وحلقة مرجعية صحيحة |
| IT-38 | تتبّع كأصل | أصل في Finance بـ`inventory_item_ref`؛ القيمة هنا لا تدخل صافي الثروة |
| IT-39 | مجموع التقدير: 41 من 58 مُقيَّم | يُعرض «بناءً على 41 من 58» |
| IT-40 | معاملة Finance حُذفت | الرابط `Missing` وتنبيه لطيف؛ الصنف سليم |
| IT-41 | إعارة لصنف مُعار فعلًا | `409 ALREADY_LOANED` |
| IT-42 | إعارة مع `person_ref` ثم حذف الشخص في Relationships | الاسم Snapshot يبقى و`person_ref_state=Missing` |
| IT-43 | إعارة بلا Relationships | اسم نصي حر يعمل |
| IT-44 | إعارة متأخرة | `Overdue` مشتق + تذكير أسبوعي واحد |
| IT-45 | «لن يعود» | `WrittenOff` + حدث Lost |
| IT-46 | مفقود بعد 7 أيام | بطاقة متابعة؛ «وجدته» يعيده Owned |
| IT-47 | استعرتُ شيئًا (`Borrowed`) | يظهر في تبويب «استعرتُ» ولا يدخل ممتلكاتي |
| IT-48 | مكان Secret | لا يظهر في البحث ولا الشاشة الرئيسية قبل فتح القفل |
| IT-49 | إشعار لصنف Sensitive | نص محايد بلا اسم |
| IT-50 | مرفق Secret | يُعرض مقنّعًا وفتحه يطلب إعادة مصادقة |
| IT-51 | تصدير حزمة التأمين | يتطلب إعادة مصادقة؛ يطابق الأصناف المختارة |
| IT-52 | `mask_values` مفعّل | لا مبلغ في أي شاشة |
| IT-53 | جواز ينتهي خلال نافذة التنبيه | تنبيه بنص محايد؛ Travel يقرأ التاريخ فقط بلا الرقم |
| IT-54 | نقل لـHome (متاح) | `Transferred` + `home_item_ref`؛ يخرج من النشط |
| IT-55 | نقل لـHome (غير متاح) | `Queued` ثم يُعاد بنفس المفتاح بلا تكرار |
| IT-56 | بحث تكرار في Home يطابق الرقم | يعرض «مسجّل في Home» ولا يمنع |
| IT-57 | جرد مكان: عنصر في مكان آخر | يقترح Moved ويطبّق بتأكيد |
| IT-58 | جرد: عنصر غير موجود | يسأل «علّمه مفقودًا؟» ولا يفعل تلقائيًا |
| IT-59 | نقل جماعي 10 أصناف | 10 أحداث بنفس `group_event_id` |
| IT-60 | فحص CI للنصوص | فشل لو ظهر «القيمة العادلة» أو لغة لوم |
| IT-61 | أوفلاين: إضافة 5 وإعارة وجرد ثم اتصال | تُدفع بالترتيب بلا تكرار |
| IT-62 | Moved على جهازين لنفس الصنف | الحدثان محفوظان؛ الموقع = الأحدث |
| IT-63 | تعديل نفس الحقل من جهازين | الأحدث + أثر في Audit |
| IT-64 | `client_op_id` مكرر | نتيجة واحدة |
| IT-65 | `user_id` في الطلب مختلف عن الجلسة | يُتجاهل/يُرفض |
| IT-66 | استيراد Asset من Notion | Dry-run ثم تطبيق؛ إعادة التطبيق لا تكرّر؛ المستهلكات لا تُستورد |
| IT-67 | استيراد CSV بتسلسلي مكرر | صف `Error` في التقرير |
| IT-68 | حذف صنف نهائيًا | يمحو أحداثه ومرفقاته؛ مراجع الخارج `Missing` |
| IT-69 | `rebuild` | المشتقات مطابقة للحالة قبل الإعادة |
| IT-70 | عمق فئات 4 أو دورة أماكن | رفض |

---

## 17) الخدمات وترتيب البناء

### 17.1 الخدمات

| الخدمة | المسؤولية |
| :---- | :---- |
| InventoryService | الأصناف، الحقول، الحزم، الكمّي، الإنشاء من مصدر |
| CategoryService | الشجرة والفواصل |
| LocationService | الشجرة والـQR والخصوصية |
| IdentifierService | المعرّفات والتطبيع والتكرار |
| OwnershipService | الأحداث، آلة الحالة، التصحيح، الإعارات |
| LoanService | الإعارات والتأخر |
| WarrantyService | الضمانات والمطالبات والحالة |
| ReplacementService | الخطط والاقتراحات والإرسال |
| ValuationService | التقييمات والإهلاك والمجاميع |
| ServiceRecordService | الصيانة |
| AttachmentService | المرفقات والحساسية (Core Files) |
| AuditService (الجرد) | الجرد |
| CollectionService | المجموعات |
| InventorySearchService | التطبيع والفهرس |
| InventoryAnalyticsService | اللوحة والمجاميع |
| InventoryNotificationService | التنبيهات والـfeed |
| InventoryImportService / ExportService | الاستيراد، التصدير، حزمة التأمين |
| InventorySyncService | الطابور والدمج |
| InventoryPrivacyService | المستويات، الحذف، إعادة المصادقة |
| InventoryIntegrationService | Shopping/Finance/Home/Relationships/Travel/Sports |

### 17.2 مراحل البناء

| المرحلة | المحتوى | معيار الخروج |
| :---- | :---- | :---- |
| P0 | الأساس: إعدادات، مصادقة، Outbox، Sync، Core Files | IT-61..65 |
| P1 | تصنيفات + أماكن + أصناف + معرّفات + بحث + إضافة سريعة | IT-01,02,09,16 |
| P2 | أحداث الملكية والإعارات والأرشيف | IT-03,04,10..18,41..47 |
| P3 | الكمّي والحزم والمجموعات | IT-19..23 |
| P4 | الضمان والمطالبات والتنبيهات | IT-05,24..30 |
| P5 | الاستبدال والتقييم والمجاميع | IT-06,31..36,39 |
| P6 | الخصوصية والتصدير والحذف | IT-48..53,68 |
| P7 | الجرد والصيانة والوثائق | IT-53,57..59 |
| P8 | التكاملات (Shopping/Finance/Home/Travel/Sports) والترحيل | IT-07,08,33,37,38,40,54..56,66,67 |

---

## 18) القرارات المفتوحة (ID) — بتوصيتي

| # | القرار | التوصية الافتراضية |
| :---- | :---- | :---- |
| ID-01 | هل «الاستبدال المقترح» يُنشأ تلقائيًا من فاصل الفئة | يظهر كاقتراح موسوم «تقدير» ولا يُنشأ كخطة |
| ID-02 | سقف الأصناف لكل مستخدم | بلا سقف؛ حد أداء 50,000 |
| ID-03 | حذف الأحداث | ممنوع؛ التصحيح فقط (الحذف النهائي حق مستقل) |
| ID-04 | أوفلاين للمرفقات Secret | معطّل افتراضيًا |
| ID-05 | هل تُحتسب أصول `Digital` في الإجماليات | لا |
| ID-06 | هل يدخل Secret في إجمالي القيمة | نعم مع إخفاء عند `mask_values` (اختيار المستخدم) |
| ID-07 | مزوّد باركود خارجي لملء الاسم | معطّل — **غير مؤكد — يُتحقق قبل البناء** |
| ID-08 | سيارتك: أصل Finance أم هنا | Finance (Vehicle)؛ هنا ملحقاتها فقط |
| ID-09 | فهرسة Core Search | معطّلة؛ عند التفعيل أسماء Normal فقط |
| ID-10 | OCR للإيصالات | مؤجل (يحتاج مراجعة خصوصية ومزوّد) |
| ID-11 | الإهلاك | معطّل افتراضيًا ويُقدَّم كتقدير |
| ID-12 | مدة الاحتفاظ بالمحذوف | 30 يومًا |
| ID-13 | أرشفة الضمان المنتهي تلقائيًا | OFF |
| ID-14 | هل يمنع التكرار الصارم الأرقام عبر العلامات | تحذير لا منع |
| ID-15 | اسم المستعير: نص أم `person_ref` إلزامي | نص إلزامي + `person_ref` اختياري |
| ID-16 | نقل من Home إلى هنا تلقائيًا | بتأكيد المستخدم فقط |
| ID-17 | تفاصيل تشفير Secret | تُراجَع مع مختص أمن |
| ID-18 | الحد الأقصى للعمق في الأماكن | 6 |
| ID-19 | صور بقائمة المعرض | حتى 10/صنف قابلة للضبط |
| ID-20 | هل Sports يكتب `sports_gear_ref` أم نحن | نحن (اختياري) |

---

## 19) مصفوفة التغطية

| بند المصدر | أين |
| :---- | :---- |
| الهدف والملكية (1–2) | §3.2، §6.15 |
| الشاشات (3) | §10 |
| Items (4) | §5.4–5.5 |
| Categories (5) | §5.2 |
| Locations (6) | §5.3 |
| Ownership Events (7) | §5.6، §6.2 |
| Warranty Records (8) | §5.7، §6.5–6.6 |
| Replacement Plans (9) | §5.8، §6.7 |
| Attachments (10) | §5.10 |
| Valuation (11) | §5.9، §6.8–6.10 |
| UX (12) | §10.2–10.3 |
| Automation (13) | §12 (IA-01…16) |
| Integrations (14) | §11 |
| Services (15) | §17.1 |
| APIs (16) | §11.9 |
| Edge Cases (17) | §6.4 (serial)، §6.3 (مكانان)، §5.6 (معار)، §9.1 (مباع)، §6.6 (ضمان بلا بيانات)، §6.7 (استبدال فات)، §6.15 (Home) |
| Acceptance Tests (18) | §16 (IT-01…10) |
| قواعد التنفيذ المشتركة | §3.4، §7.2 |

---

## خلاصة

Inventory OS هنا **دفتر ممتلكات شخصي مستقل**: سجل ملكية لا يُمحى، حالة وموقع مشتقان، ضمانات متعددة بمطالبات، إعارات بتذكير لطيف، استبدال يُرسل «حاجة» لـShopping ولا يشتري، وتقدير قيمة صريح لا يُعرض كحقيقة. خصوصية قوية للأماكن والوثائق، وأوفلاين كامل. **ما يحتاج منك:** ID-01، ID-06، ID-07، ID-08، ID-17، وطلبات التغيير على Home (`from-source`، `search`، `transfer_requested`)، وShopping (`purchase.completed` بمعلومة الضمان)، وFinance (`inventory_repair`، `inventory_sale`).
