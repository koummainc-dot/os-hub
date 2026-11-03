# Skincare OS — خطة التنفيذ والتكامل الموحدة v1.0

> الحالة: **قيد التنفيذ المرحلي داخل OS Hub — أساس S1 وS2 ومفكرة S3-A وبنية صور S3-B أضيفت على فرع العمل؛ لا يوجد تفعيل إنتاجي بعد**. هذه الخطة تحول ملف SKINCARE_OS_UNIFIED_MASTER_PLAN_v1 إلى نظام فعلي داخل OS Hub. كل قرار تصميمي غير منصوص عليه في الملف الأصلي موضح هنا باعتباره قرار تنفيذ، وليس ميزة موجودة بالفعل.

## 1. الهدف ومعيار الإنجاز

بناء Skincare OS كنظام شخصي مستقل داخل OS Hub، يعمل على نفس تسجيل الدخول والـ workspace والصلاحيات وطبقة التخزين والمزامنة والـ Demo وعمليات الاستعادة والتدقيق المعتمدة في المنصة.

**معيار الإنجاز:** كل عنصر تنقل يفتح شاشة مكتملة، وكل زر ظاهر له إجراء حقيقي موصول بالمخزن، مع حالات loading/empty/error/success، والتحقق من المدخلات والصلاحيات، وتحديث البيانات بعد الحفظ، واختبار reload. لا أزرار placeholder أو `alert()` أو إجراءات شكلية. لا يُعلن النظام Live قبل اجتياز بوابات القبول.

## 2. قواعد عدم كسر الأنظمة الحالية

1. لا ننشئ تسجيل دخول أو Workspace أو صلاحيات مستقلة للقسم. يستخدم عقد OSSystemHost الحالي: `api.load/save`, `access`, `authUser`, `ws`, `isDemo`, `page/setPage`, `shell`.
2. جميع السجلات مملوكة للـ workspace الحالي وتُحترم ملكية المستخدم/مستوى الوصول وفق نموذج OS Hub؛ لا نستخدم user_id يرسله العميل كمرجع للملكية.
3. الالتزام بنمط `useRecordStore` وRecord API الفعلي الموجود في المشروع. يمنع إدخال localStorage مباشر أو مخزن موازٍ في الإنتاج. Demo منفصل تمامًا عن الإنتاج.
4. لا ننشئ جداول SQL جديدة لمجرد تكرار `workspace_records`. نستخدم collections/records الموجودة بعد التحقق من schema وRLS. الاستثناء المخطط هو Storage bucket خاص للصور، وتهيئة collection sections/صلاحياتها إذا أثبت الفحص أنها غير موجودة.
5. لا نكتب بيانات في Nutrition أو Sports أو Habit أو Finance أو Shopping أو Knowledge. Skincare يملك سجلاته ويصدر أحداثًا/مراجع اختيارية إلى مالك البيانات الآخر.
6. لا نعرض بيانات الصور أو الدورة أو الملاحظات الحساسة في لوحة مشتركة أو سجل أحداث عام. لا روابط صور عامة.
7. التحليل إرشادي، لا تشخيص ولا وصف علاج. لا نستنتج أن منتجًا سبب تغيرًا جلديًا؛ نستخدم عبارة «ارتباط ملحوظ في بياناتك».
8. لا تخمين لتاريخ انتهاء أو نسب تركيز أو فعالية مكوّن. أي قيمة غير معروفة تظل غير معروفة.

## 3. التسجيل في المنصة والتنقل

- معرف النظام: `skincare`؛ الاسم: `Skincare OS`؛ العنوان العربي: `العناية بالبشرة`؛ المجموعة: `life`؛ النطاق: `personal`؛ الحساسية: `true`.
- يضاف إلى سجل الأنظمة في `src/core/core.js` بعد إكمال شاشة الدخول الأولية والاختبارات الأساسية، وبحالة `planned` أثناء البناء، ولا يتحول إلى `live` قبل بوابة الإطلاق.
- ملف النظام: `src/systems/skincare/index.jsx` مع تحميل lazy الحالي في `OSSystemHost`.
- ملف الخطة المرجعي: `plans/SKINCARE_OS_UNIFIED_MASTER_PLAN_v1_AR.md`.
- كل قسم في القائمة يطابق route ثابتًا، مع حفظ آخر route، دعم الرجوع، عدم فقد حالة النماذج غير المحفوظة دون تحذير، وحماية route الحساس بصلاحياته.
- أقسام التنقل:
  1. `dashboard` — الرئيسية
  2. `diary` — مفكرة البشرة
  3. `products` — المنتجات
  4. `units` — العبوات والصلاحية
  5. `routines` — الروتين
  6. `routine_logs` — سجل إنجاز الروتين
  7. `ingredients` — المكونات ومحلل INCI
  8. `trials` — التجارب
  9. `reactions` — التفاعلات والتنبيهات
  10. `compare` — المقارنة والتقارير
  11. `photos` — صور التقدم (قسم خاص؛ ويمكن الوصول لها من المفكرة)
  12. `lists` — القوائم والرغبات
  13. `settings` — الملف الجلدي والإعدادات والخصوصية والتصدير.

## 4. نموذج البيانات وملكية السجلات

كل الكيانات تستخدم الغلاف العام المتوافق مع Record Store: `id, created_at, updated_at, v, created_by, deleted_at, deleted_by, archived_at`. نستخدم soft delete للكيانات القابلة للحذف، ونحظر الحذف الدائم للآثار السلبية المرتبطة بتاريخ.

| Collection | أهم الحقول | المالك/الخصوصية |
|---|---|---|
| `skin_profile` | skin_type, concerns, allergies_note, baseline_date, timezone | Skincare؛ خاص |
| `skin_products` | name, brand, category, step_slot, ingredients_raw, ingredient_ids, url, list_ids, status, note | Skincare |
| `skin_units` | product_id, purchase_date, price, currency, opened_date, pao_months, expiry_date, started_use_date, finished_date, finish_reason, size_note | Skincare |
| `skin_diary` | date, skin_rating, issues, note, sleep_hours, sleep_quality, mood, exercise_minutes, water_glasses, cycle_phase, photo_ids, trial_id, source_flags | Skincare؛ cycle_phase شديد الحساسية |
| `skin_photos` | diary_id, taken_at, angle, area, lighting_note, storage_path, thumb_path, size_bytes, consent_share | Storage خاص؛ لا مشاركة افتراضية |
| `skin_ingredients` | inci_name, aliases, function, notes, flag, concern_effects, source | المكتبة Seed/User؛ flags شخصية |
| `skin_routines` | name, slot, active, days_of_week, reminder_time | Skincare |
| `skin_routine_steps` | routine_id, product_id, order, frequency, times_per_week, wait_minutes, note | Skincare |
| `skin_routine_logs` | date, routine_id, step_id, done, skipped_reason, logged_at, client_generated_id | idempotent |
| `skin_reactions` | product_id, unit_id, date_started, severity, symptoms, area, action_taken, resolved_date, suspected_ingredient_ids, photo_ids, note | سجل حساس؛ Severe أرشفة فقط |
| `skin_trials` | product_id, question, start_date, planned_days, status, verdict, verdict_note, baseline_diary_ids | تجربة Running واحدة لكل منتج |
| `skin_lists` | name, kind, product_ids, order | Wishlist/Favorites/Empties/Custom |
| `skin_settings` | timezone, weekStartDay, trialDays, expirySoonDays, photoReminderDays, comparisonWindowDays, quietStart/End, unitsSystem, requireConfirmAvoid, adherenceThreshold, minDaysForCorrelation, minDaysForAverage | إعدادات workspace الشخصية |

**قرار تطبيقي مهم:** إذا كان `workspace_records` لا يدعم فصل صلاحيات collections الحساسة على مستوى RLS بما يكفي، لا نضع cycle_phase أو مراجع الصور الحساسة في blob مشترك مع سجلات أقل حساسية. نوقف الإطلاق وننفذ تقسيمًا آمنًا في التخزين/الجداول قبل المتابعة.

## 5. بنية الملفات المقترحة

- `src/systems/skincare/index.jsx` — shell الداخلي وتوجيه الصفحات.
- `src/systems/skincare/repository.js` — طبقة قراءة/كتابة محصورة بعقد API وRecord Store.
- `src/systems/skincare/domain.js` — قواعد الصلاحية والالتزام والترتيب وتحليل INCI والتجارب والمقارنة.
- `src/systems/skincare/validation.js` — تحقق الحقول والعلاقات.
- `src/systems/skincare/integrations.js` — محولات أحداث OS Hub، دون كتابة مباشرة لأنظمة أخرى.
- مكونات الشاشة: `Dashboard.jsx`, `Diary.jsx`, `Products.jsx`, `Units.jsx`, `Routines.jsx`, `Ingredients.jsx`, `Trials.jsx`, `Reactions.jsx`, `Compare.jsx`, `Photos.jsx`, `Settings.jsx`.
- `demo.js` — بيانات تجريبية معزولة وحالات واقعية للاختبار.
- الاختبارات: domain + repository contract + UI interaction + integration/privacy.

لا تُنشأ كل الملفات دفعة واحدة بواجهات وهمية؛ كل مرحلة تنشئ الملفات التي تستخدمها فقط.

## 6. خريطة الأزرار والإجراءات — لا زر بلا وظيفة

### 6.1 الرئيسية
- «سجّل يومك»: يفتح نموذج المفكرة السريع، ويحفظ/يحدّث إدخال اليوم نفسه.
- «إضافة منتج»: يفتح نموذج المنتج التدريجي.
- «علّم الخطوة»: ينشئ Routine Log idempotent ويحدّث المنتج إلى In Use عند أول إنجاز مؤكد.
- «تخطي»: يطلب سبب التخطي ويحفظه؛ لا يسجل Done.
- «تراجع»: يعكس آخر عملية مسموح بها ضمن نافذة التراجع، مع معالجة آمنة للتزامن.
- «افتح التجربة»: يفتح تفاصيل Trial المحدد.
- «عرض المنتجات القريبة من الانتهاء»: يفتح المنتجات مع فلتر ExpiringSoon.
- «التقط صورة»: يفتح رفع صورة مرتبطة بإدخال يومي، ويعمل فقط إذا كان Storage الخاص جاهزًا.

### 6.2 المفكرة
- «إضافة اليوم/تعديل»: upsert على (workspace + date)، يمنع سجلين لليوم.
- «حفظ»: تحقق من التاريخ والدرجات والمدى، ثم save وrefresh.
- «حذف»: soft delete مع تأكيد؛ لا يحذف صورًا قبل تأكيد دورة الملفات.
- «عرض اليوم»: يفتح تفاصيل الإدخال.
- «إضافة صورة/حذف صورة»: رفع/حذف الملف الأصلي والصورة المصغرة معًا، وفحص الملكية.
- «قارن صورتين»: يفتح المقارنة ويمنع الادعاء بالدقة عند اختلاف الزاوية/المنطقة.
- «السابق/التالي/اليوم»: تنقل تقويمي حقيقي.
- «ربط تجربة»: يربط Trial نشطة دون تغيير سجل التجربة.

### 6.3 المنتجات والعبوات
- «إضافة منتج»: ينشئ Product مع الاسم والفئة كحد مطلوب؛ باقي الحقول اختيارية.
- «حفظ/إلغاء»: حفظ حقيقي أو إغلاق مع تنبيه فقد التغييرات.
- «تعديل»: يفتح بيانات المنتج المحدد.
- «أرشفة»: يحافظ على العلاقات والتاريخ.
- «حذف»: متاح فقط إذا لم توجد عبوات/تفاعلات/تجارب/خطوات مرتبطة، وإلا يرفض مع اقتراح الأرشفة.
- «لصق/تحليل المكونات»: parse للقائمة وتطبيعها وإنشاء المكونات غير المعروفة كـ User/Unclassified.
- «فحص المنتج»: يعرض Suitable/Review/Avoid مع سبب وعدد غير المصنف؛ لا يقرر بدل المستخدم.
- «عبوة جديدة»: ينشئ Unit مرتبطة بمنتج موجود.
- «تسجيل الفتح/البدء/الانتهاء»: يعدل تواريخ العبوة ويعيد حساب الحالة.
- «قائمة الرغبات/المفضلة/الفارغة»: يضيف/يزيل المنتج من قائمة Skincare، مع إرسال حدث اختياري إلى Shopping.
- «مقارنة»: اختيار حتى 3 منتجات وإظهار الفروقات المتاحة.
- «فتح الرابط»: يتحقق من URL آمن ثم يفتح.
- «استيراد CSV»: معاينة mapping + validation + تقرير أخطاء + كتابة ذرية/دفعات قابلة للاستئناف.
- «تصدير»: CSV/JSON، مع استثناء الصور وcycle_phase افتراضيًا.

### 6.4 الروتين
- «إنشاء روتين/تعديل/نسخ/تعطيل»: CRUD فعلي مع حماية العلاقات.
- «إضافة خطوة»: اختيار منتج صالح؛ Avoid يحتاج تأكيدًا، وFinished/Stopped مرفوض.
- «حذف خطوة»: حذف/أرشفة حسب وجود Logs.
- «تحريك لأعلى/أسفل/سحب»: يحفظ order بعد إعادة الترتيب.
- «رتّب»: يعرض معاينة بالقاعدة الثابتة؛ «تطبيق» يحفظ، «إلغاء» لا يغير شيئًا.
- «تكرار»: ينسخ الروتين وخطواته بمعرفات جديدة.
- «تذكير»: يحفظ الوقت والأيام ويدخل التنبيه داخل التطبيق.
- «تم/تخطي»: يحفظ log مرة واحدة باستخدام client_generated_id.
- «تراجع»: يعكس السجل الأخير ضمن سياسة التراجع.
- «عرض الالتزام»: يحسب النسبة من due/done ولا يخزن المقاييس المشتقة.

### 6.5 المكونات ومحلل INCI
- «إضافة مكوّن/تعديل»: CRUD للمكتبة الشخصية.
- «وسم مفضل/حساس/تجنب/إزالة الوسم»: يحفظ flag على مكون المستخدم فقط.
- «تحليل INCI»: يفصل بالفواصل والأسطر والنقطة الوسطى، يطبع الاسم ويطابق aliases تطابقًا تامًا.
- «عرض المنتجات المحتوية»: فلتر المنتجات التي تحتوي المكوّن.
- «شرح»: يعرض وصفًا عامًا ومصدره؛ لا ادعاء علاجي.
- «إعادة الفحص»: يعيد حساب النتيجة بعد تغير المكونات أو الملف أو الوسوم.
- «استعادة Seed»: أداة إدارية محمية، لا تستبدل تعديلات المستخدم.

### 6.6 التجارب والتفاعلات
- «ابدأ تجربة»: يتحقق من عدم وجود Running لنفس المنتج، يلتقط خط أساس آخر 7 أيام المسجلة، ويعرض معاينة الربط بالروتين قبل الإنشاء.
- «إيقاف/استكمال/إنهاء»: انتقالات حالة صحيحة؛ إنهاء يطلب verdict من المستخدم.
- «احسب النتيجة»: يحسب delta وn والتفاعلات والتجارب المتزامنة، دون استنتاج سببي.
- «سجّل تفاعلًا»: ينشئ Reaction ويعرض توصية مراجعة المنتج/المكونات وإيقافه من الروتين، دون تنفيذ إيقاف تلقائي.
- «حل التفاعل»: يسجل resolved_date.
- «أرشفة»: متاح؛ «حذف» غير متاح لتفاعل Severe.
- «مراجعة المنتج»: يفتح المنتج المرتبط.
- «مراجعة المكوّن المشتبه»: يفتح المكوّن.

### 6.7 المقارنة والتقارير والصور
- «اختر الفترة A/B»: يغير حدود الفترتين.
- «احسب المقارنة»: لا يعرض المتوسط إلا عند 3 أيام مسجلة على الأقل.
- «ارتباط نمط الحياة»: لا يعرض قبل 14 يومًا على الأقل وفق الإعداد؛ يصف ارتباطًا فقط.
- «تأخير يوم»: يعيد المقارنة مع lag=1 عند طلب المستخدم.
- «قارن الصور»: يتطلب صورتين مملوكتين؛ يعرض تحذير اختلاف الزاوية/المنطقة/الإضاءة.
- «تصدير PDF/CSV»: ينشئ ملفًا حقيقيًا ويستبعد الصور والدورة إلا بتحديد صريح.
- «عرض/تنزيل/حذف صورة»: signed URL قصيرة العمر، تحقق ملكية، حذف الأصل والـ thumbnail معًا.
- «تذكير صورة»: ينشئ تذكيرًا داخل التطبيق وفق الإعدادات.

### 6.8 الإعدادات
- «حفظ الملف الجلدي»: يحفظ skin_type/concerns/notes/timezone.
- «حفظ الحدود»: يتحقق من نطاق كل قيمة قبل الحفظ.
- «إدارة التذكيرات/ساعات الهدوء»: CRUD وتطبيق quiet hours.
- «تصدير البيانات»: ملف JSON/CSV وفق سياسة الخصوصية.
- «استيراد البيانات»: preview/validate/confirm مع عدم التكرار والتعامل الذري.
- «سلة المحذوفات/استعادة»: soft-deleted records قابلة للاستعادة مع التحقق من العلاقات.
- «مشاركة المفكرة»: غير مفعلة في MVP؛ عند تنفيذها تكون read-only، بموافقة صريحة ونطاقات محددة، ولا تتضمن الصور أو الدورة افتراضيًا.
- «إعادة بناء الفهارس/Seed»: أدوات محمية لا تظهر للمستخدم العادي.

## 7. محرك الحسابات والتحقق

تنفيذ واختبار قواعد الملف الأصلي:
1. effective_expiry = أبكر تاريخ معروف بين expiry_date وopened_date + pao_months؛ لا تاريخ = Unknown.
2. حالة العبوة: Finished ثم Expired ثم ExpiringSoon ثم Unopened ثم Active حسب قواعد الخطة.
3. منع purchase_date المستقبلي؛ opened_date لا يسبق purchase_date؛ expiry_date لا يسبق purchase_date.
4. مفكرة واحدة لكل يوم؛ التاريخ لا يتجاوز اليوم حسب timezone الخاص بالمستخدم.
5. القيم 1–5 و0–24 و0–1440 ضمن حدودها.
6. due وفق frequency/days؛ TimesPerWeek لا تفرض أيامًا بعينها؛ adherence = Σdone/Σdue؛ null عندما due=0.
7. السلسلة حسب العتبة القابلة للتعديل؛ اليوم الجاري المعلق لا يكسرها.
8. الترتيب الثابت: Cleanser → Toner → Treatment/Exfoliant → Serum → Eye → Moisturizer → Sunscreen (AM) → Oil/Balm، مع معاينة وتجاوز يدوي محفوظ.
9. INCI exact match على inci_name/aliases؛ غير المعروف يُنشأ Unclassified؛ لا نسب تركيز.
10. Avoid عند وجود مكوّن Avoid/Sensitive؛ Review عند Caution أو تجاوز حد غير المصنف؛ خلاف ذلك Suitable؛ دائمًا إظهار نقص التصنيف.
11. تجربة Running واحدة لكل منتج؛ baseline من آخر 7 أيام المسجلة قبلها؛ لا verdict تلقائي.
12. cost_per_day فقط عند وجود السعر وتاريخ البدء، ولا جمع عملات مختلفة.
13. لا ارتباط نمط حياة قبل حد الأيام؛ لا سببية.
14. كل عمليات الروتين idempotent بواسطة client_generated_id؛ معالجة التعارض عبر v/updated_at.

## 8. التكامل مع بقية OS Hub — عبر أحداث لا ازدواج ملكية

| النظام | التكامل | الاتجاه والضمان |
|---|---|---|
| Today / Calendar | استحقاقات الروتين والتذكيرات | Skincare ينشر أحداثًا/مراجع؛ Today يعرضها ولا يملك تفاصيل المنتجات |
| Habit OS | استيراد نوم/مزاج اختياريًا كقراءة | لا كتابة في Habit؛ manual fallback دائم |
| Sports OS | استيراد exercise minutes اختياريًا | قراءة أو إدخال يدوي؛ لا نسخ جلسات التمرين |
| Shopping Wishlist | مزامنة رغبات منتجات البشرة | حدث idempotent بمصدر skincare؛ حذف/إلغاء المزامنة لا يحذف سجل الشراء |
| Finance OS | اقتراح حركة شراء بعد تأكيد المستخدم فقط | لا حركة تلقائية من السعر المسجل؛ لا تعديل للحركات القائمة |
| Knowledge OS | حفظ رابط/ملاحظة تجربة اختياريًا | مرجع فقط، مع احترام خصوصية الملاحظات |
| Health & Wellness OS | لا يرسل تشخيصات أو ادعاءات؛ يمكن مستقبلًا مشاركة ملخص يوافق عليه المستخدم | opt-in صريح، لا صور ولا ملاحظات حساسة افتراضيًا |
| Home OS | لا تكامل مطلوب في MVP | لا يكرر مخزون البيت |
| Notification service | تذكير روتين/انتهاء/تجربة/صورة | داخل التطبيق أولًا، ساعات الهدوء، دمج الإشعارات |
| Audit/Outbox | أحداث product.added, unit.expiring, reaction.logged, trial.completed, diary.logged, wishlist.item_added | تسليم منطقي مرة واحدة، retries، لا payload حساس |

كل تكامل يبدأ باختبار توفر النظام الآخر. غيابه لا يمنع Skincare من العمل.

## 9. التخزين والصور والخصوصية

- Storage bucket: `skin-photos` خاص، لا public URLs؛ signed URLs قصيرة العمر.
- مسار معزول حسب workspace/owner/record، مع سياسات تمنع الوصول بين workspaces والمستخدمين غير المصرح لهم.
- تحقق MIME والحجم، ضغط الصور وإنشاء thumbnail، حد 10 صور لكل Diary Entry.
- حذف الصورة: حذف metadata والملف الأصلي والـ thumbnail مع تعويض/cleanup retry عند فشل جزء من العملية.
- cycle_phase وskin notes والصور بيانات حساسة؛ لا تدخل في أحداث عامة أو سجلات telemetry.
- التصدير يستثني الصور وcycle_phase افتراضيًا. المشاركة ليست ضمن MVP.
- اختبار RLS بحسابين حقيقيين في بيئة اختبار قبل Live؛ لا نعوضه باختبارات static فقط.
- فحص schema وRLS وStorage قبل أي migration؛ لا تنفيذ DDL إنتاجي دون مراجعة وخطة rollback.

## 10. المراحل وبوابات القبول

### S0 — Discovery & Safety
- فحص OSSystemHost وOS_SYSTEMS وRecord Store وRLS وStorage وintegration bus.
- جرد جميع أزرار ومكونات النظام الحالي إن وجدت.
- تأكيد الحقول/العلاقات التي يدعمها Record API.
- مخرجات: تقرير توافق، قرار collections، خطة migration إن لزم.
- بوابة: لا بناء قبل حسم فصل السجلات الحساسة.

### S1 — Foundation + Profile + Products + Units
- التسجيل المبدئي في OS Hub، shell، repository، validation، domain، Demo.
- CRUD الملف والمنتجات والعبوات والقوائم.
- صلاحية العبوة وحالاتها والأرشفة.
- اختبارات SK-01…SK-04 وCRUD/reload/permissions.
- لا Live حتى نجاحها.

### S2 — Routine Engine
- CRUD routines/steps، ordering، preview/apply، logs، due/adherence، undo، idempotency.
- تذكيرات داخل التطبيق.
- اختبارات تكرار السجل، التعارض، المنتج Avoid/Finished/Stopped، التكرار، الترتيب.

### S3 — Diary + Photos
- تقويم، quick entry، upsert يومي، قياسات النوم/المزاج/الرياضة، رفع صور خاصة.
- Storage lifecycle وsigned URLs والحذف الآمن.
- اختبارات timezone، يوم مكرر، 10 صور، MIME/size، isolation، reload.

### S4 — Ingredient Library + INCI Analyzer
- مكتبة Seed صغيرة تمت مراجعتها، مكونات المستخدم، aliases، flags، exact matching، نتيجة جزئية.
- اختبارات SK-05/SK-06 وArabic/Latin normalization حيث ينطبق.

### S5 — Reactions + Trials
- تفاعلات وآثار سلبية، severe archive-only، lifecycle للمنتج.
- بدء/إيقاف/إنهاء التجربة، baseline، trial metrics، verdict user-controlled.
- اختبارات SK-14…SK-19.

### S6 — Compare + Reports + Import/Export
- مقارنة الفترات والصور، مؤشرات الارتباط، تقارير PDF/CSV، CSV import preview.
- لا تظهر مؤشرات دون الحد الأدنى للبيانات.
- اختبارات SK-13/SK-18 وخصوصية التصدير.

### S7 — Cross-OS Integrations
- Today, Habit, Sports, Shopping, Finance, Knowledge عبر events/refs.
- retries/idempotency، إيقاف التكامل دون فقد بيانات Skincare.
- اختبارات عدم إنشاء حركة مالية دون تأكيد، وعدم الكتابة في الأنظمة المالكة الأخرى.

### S8 — Full Acceptance + Release
- اختبار كل زر من مصفوفة §6، جميع الشاشات وحالات loading/empty/error/offline.
- اختبار CRUD/reload، Demo/prod isolation، حسابين حقيقيين، RLS/Storage isolation، استعادة/حذف، تزامن جهازين.
- npm test + build + lint + browser tests، فحص Vercel CI وDeployment READY.
- تحديث الحالة إلى live بعد نجاح كل بوابات القبول فقط.

## 11. مصفوفة الاختبارات

- Domain: SK-01…SK-20 كاملة من الملف الأصلي.
- Repository: create/read/update/archive/restore لكل collection، stale version، duplicate day، idempotency.
- UI: كل زر في §6 يثبت أثره الفعلي، لا مجرد وجود handler.
- Permissions: owner/editor/viewer/section-denied، وسجلات حساسة، وحسابين منفصلين.
- Storage: owner/workspace isolation، signed URL expiry، MIME/size، delete original + thumbnail.
- Integration: النظام الآخر غائب، الحدث مكرر، فشل المستهلك، retry، تأكيد Finance.
- Recovery: reload، استعادة السجل، فشل منتصف العملية، import atomicity.
- Release: production build، lint، npm test، browser smoke، deployment READY.

## 12. الفجوات المؤجلة صراحة

1. كتالوج منتجات عالمي/مزود بيانات خارجي (F-01): خارج v1؛ لا scraping غير مرخص.
2. مراجعة علمية/مصدرية لمكتبة المكونات (F-02): Seed صغيرة فقط بعد مراجعة مناسبة، وإلا لا تظهر كمرجع موثوق.
3. مجتمع/منتدى عام: خارج v1؛ Knowledge OS للروابط والملاحظات.
4. OCR/تحليل صور آلي أو تشخيص جلدي: خارج النطاق.
5. مشاركة المفكرة: بعد MVP فقط وبصلاحيات read-only صريحة.
6. إشعارات Push خارج التطبيق: بعد التأكد من دعم منصة الإشعارات.
7. لا تعتمد أي ميزة مؤجلة كأنها مكتملة، وتظهر في قائمة الفجوات.

## 13. سجل الحالة

| المرحلة | الحالة |
|---|---|
| S0 Discovery | لم تبدأ |
| S1 Foundation/Profile/Products/Units | أساس الواجهة موجود؛ غير مفعّل وغير مختبر تشغيليًا |
| S2 Routine Engine | واجهة ومحرك نطاق مبدئيان؛ الاختبارات التشغيلية والتذكيرات الفعلية معلّقة |
| S3 Diary/Photos | لم تبدأ |
| S4 Ingredients/INCI | لم تبدأ |
| S5 Reactions/Trials | لم تبدأ |
| S6 Compare/Reports/Import/Export | لم تبدأ |
| S7 Integrations | لم تبدأ |
| S8 Acceptance/Release | لم تبدأ |

**الخطوة التالية:** تنفيذ S0 على المستودع وقاعدة البيانات، ثم اعتماد تصميم التخزين والصلاحيات قبل إنشاء أي سجل إنتاجي أو إظهار أزرار غير موصولة.


---

## 10. تقرير فحص S0 — البنية الفعلية في المستودع وقاعدة البيانات

> تاريخ الفحص: 2026-11-03. هذا القسم يسجل نتائج قراءة المستودع وقاعدة Supabase المتصلة. لم تُنفذ أي تغييرات على قاعدة البيانات في S0.

### 10.1 نتائج مؤكدة

1. **سجل الأنظمة المركزي موجود** في `src/core/core.js` باسم `OS_SYSTEMS`. النظام يعرّف `id/group/scope/icon/color/name/title/status/phase/sensitive/sections`. كما أن `osSections(sys)` يرجع الأقسام من تعريف النظام. لذلك إضافة Skincare تتطلب سجلًا واحدًا في هذا المصدر، لكن يجب تأجيله إلى حين وجود شاشة قابلة للتحميل حتى لا يظهر عنصر يفتح صفحة ناقصة.
2. **عقد البيانات العام الحالي موجود** في `osMakeApi(wsId, systemId, part)` داخل `src/core/core.js`. هذا العقد يقرأ/يكتب `workspace_data` حسب workspace/system/part، ويحتفظ بنسخة `localStorage` كمسار fallback عند فشل القراءة. لا ينبغي استخدام هذا المسار وحده للبيانات الحساسة أو صور البشرة؛ فالـfallback المحلي ليس بديلًا عن RLS أو عزل الملفات.
3. **جدول Record Store موجود فعليًا**: `public.workspace_records` ويحتوي: `workspace_id, system_id, collection, id, data (jsonb), deleted, updated_at, updated_by, visible_to`. جدول `workspace_data` موجود أيضًا، لكن وجوده لا يبرر تخزين النظام كله في blob واحد.
4. **RLS مفعّل على workspace_records**، وسياسات القراءة/الإضافة/التعديل تعتمد على `ws_access_level(workspace_id, system_id, collection)` مع شرط `visible_to`. سياسة الحذف المباشر الحالية مقيدة بمالك الـworkspace؛ لذلك يجب أن يعتمد حذف سجلات Skincare في MVP على soft-delete عبر update إذا كان المستخدم محررًا غير مالك، أو يضاف مسار حذف مصرح به بعد مراجعة آلية Record Store. لا نفترض أن DELETE المباشر متاح لكل محرر.
5. **عدد سجلات workspace_records وقت الفحص 49**، و`workspace_data` يحتوي سجلًا واحدًا. لا توجد جداول باسم skincare حتى الآن.
6. **Buckets الحالية خاصة (private)**: `knowledge-attachments`, `sports-body-progress`, `health-documents`. توجد سياسات Storage منفصلة لهذه الأنظمة، ولا يوجد bucket أو policy لـSkincare.
7. **Health OS يقدم نمطًا مناسبًا للبيانات الحساسة**: Repository مستقل، جداول ذات RLS، سجل تدقيق لا ينسخ التفاصيل السريرية الحساسة إلى metadata، وStorage خاص للوثائق. يمكن استعارة مبادئ الفصل والتدقيق، لا نسخ مخطط Health حرفيًا.
8. **اختبارات المشروع** معرفة في `package.json` عبر `npm test`، وتضم اختبارات عقود وأنظمة كثيرة، لكن قراءة تعريف الأمر ليست تشغيلًا للاختبارات. لم يتم تشغيل build أو test في S0.
9. **سجل migrations الفعلي** يتضمن أساس المنصة وRecords وميزات الأنظمة حتى migrations Health الحالية بتاريخ 2026-11-03؛ لم تُنشأ أي migration لـSkincare.

### 10.2 قرارات معمارية بعد الفحص

- يمكن أن تستخدم سجلات Skincare غير شديدة الحساسية `workspace_records` مع `system_id='skincare'` وcollection مستقلة لكل مجال، بعد فحص خريطة collection/section وآلية Record Store في ملفات التنفيذ.
- لا يجوز وضع كل السجلات في collection واحدة إذا كان المطلوب صلاحيات مستقلة للأقسام. يجب أن تكون أسماء collections متوافقة مع مفاتيح الصلاحيات التي تقرؤها `ws_access_level`، وأن تختبر على مستوى RLS لا على مستوى إخفاء الواجهة فقط.
- بيانات الملف الجلدي والمفكرة والتفاعلات والتجارب يجب أن تظل ضمن collections محددة الصلاحية، ولا تدمج في سجل مشترك واسع.
- `cycle_phase` وملاحظات الحساسية/التفاعلات والصور تحتاج مراجعة خصوصية مستقلة. لا نعتمد على `visible_to` كبديل عن صلاحيات دقيقة، ولا نضع هذه الحقول في localStorage fallback.
- صور التقدم تحتاج bucket خاصًا جديدًا مخصصًا لـSkincare، مع مسارات ذات prefix يثبت ملكية الـworkspace/المستخدم، وسياسات SELECT/INSERT/UPDATE/DELETE متطابقة في النطاق، وsigned URLs قصيرة العمر. لا نعيد استخدام bucket Health أو Sports ولا نضع الصور داخل JSONB.
- يجب أن يتضمن سجل الصور metadata فقط (object path، النوع، الحجم، التاريخ، الربط)، بينما تبقى bytes في Storage. يلزم lifecycle يضمن حذف الملف المصغر والأصل معًا، مع معالجة orphaned objects.
- قبل البناء الوظيفي يجب تحديد Record Store API الحقيقي ومصدره وطرق list/get/upsert/soft-delete/restore والـsubscription، وكذلك تحميل النظام في OSSystemHost. لم يظهر موضع تعريف `OSSystemHost` أو `useRecordStore` في نتائج البحث الحالية، لذلك هذه نقطة تحقق مفتوحة وليست مفترضة.

### 10.3 فجوات S0 المتبقية قبل اعتماد مخطط التنفيذ

1. تتبع تعريف Record Store وملفات تحميل الأنظمة/المضيف داخل المستودع، وتوثيق عقدها الفعلي بدل الاكتفاء بعقد `osMakeApi`.
2. قراءة migration المنصة وmigration `collection_sections_map` لتوثيق جدول/دالة ربط collection بمستوى section، والتحقق هل يسمح بإضافة collections جديدة دون migration.
3. مراجعة تعريف `ws_access_level` وسياسات `workspace_records` كاملة، خصوصًا الفرق بين مالك workspace والمحرر في update/delete/restore.
4. فحص إعدادات bucket (الحد الأقصى للحجم وMIME types) عند إنشاء bucket Skincare، ثم كتابة سياسات عزل مستقلة واختبارات cross-workspace.
5. تحديد سياسة الاحتفاظ والحذف للصور والنسخ المصغرة، وسجل تدقيق لا يتضمن أسماء منتجات أو وصف تفاعلات أو صورًا.
6. تشغيل اختبارات المشروع وبناء التطبيق في بيئة التنفيذ المتاحة قبل اعتماد أي تغيير واجهة؛ لم يتم ذلك حتى الآن.

### 10.4 حالة المرحلة

- [x] قراءة سجل الأنظمة وواجهة البيانات العامة في `src/core/core.js`.
- [x] قراءة `package.json` وتحديد أمر الاختبارات.
- [x] فحص وجود `workspace_records` وحقوله وRLS policies.
- [x] فحص buckets الحالية وسياسات Storage ذات الصلة.
- [x] فحص migrations المسجلة وغياب جداول Skincare.
- [ ] تحديد Record Store API ومضيف النظام بدقة.
- [ ] اعتماد خريطة collection/section النهائية.
- [ ] اعتماد تصميم Storage وصلاحيات الصور.
- [ ] تشغيل build/tests baseline.
- [ ] إغلاق S0 والانتقال إلى S1.

**الحكم:** البنية الأساسية تسمح بدمج Skincare OS، لكن لا تزال هناك نقاط أمان وتكامل غير محسومة. لذلك لا نضيف النظام إلى القائمة ولا ننشئ جداول أو bucket في الإنتاج قبل إغلاق عناصر S0 المفتوحة أعلاه.


### 10.5 إغلاق فحص Record Store ومضيف النظام (استكمال S0)

بعد استعراض الملفات الفعلية في المستودع، تم تحديد المكونات التي لم تكن واضحة في الفحص الأول:

1. **Record Store الفعلي:** `src/core/records.jsx` ويصدر `useRecordStore`, `arr`, `live`, `byId`, `uid`, `stripMeta`. العقد هو:
   - `useRecordStore({wsId, systemId, isDemo, demoStore, seed, onToast})`
   - الحالة: `recs, ready, error, pending, online`.
   - API: `put, putAtomic, putBatchAtomic, purgeAtomic, softDelete, restore, putMany, reload, sync, flushQueue`.
   - القراءة من `workspace_records` لكل (workspace + system)، مع pagination وRealtime وincremental sync.
   - الكتابة تستخدم optimistic concurrency بواسطة `updated_at`، وتسلسل الكتابات لكل سجل، وقائمة انتظار offline محلية.
   - `softDelete` و`restore` عمليتا تحديث للسجل وليستا DELETE SQL؛ وهذا هو المسار المناسب لمحرر غير مالك ما دامت RLS تسمح له بالتحديث.
   - وضع Demo يستخدم مخزنًا داخل الذاكرة ولا يكتب إلى Supabase.
2. **مضيف النظام:** `src/platform/Platform.jsx` يحتوي `OSSystemHost` و`SYSTEM_LOADERS` باستخدام `import.meta.glob("../systems/*/index.jsx")`. يحمّل `src/systems/<systemId>/index.jsx` تلقائيًا، ثم يمرر `api/access/authUser/ws/members/isDemo/demoStore/page/setPage/shell`. لذلك لا نحتاج تسجيل loader منفصل؛ نحتاج فقط مجلد النظام وسجل OS_SYSTEMS.
3. **النمط المرجعي الأقرب:** `src/systems/hobbies/index.jsx` يستورد `useRecordStore` من `../../core/records.jsx` ويستخدم `arr/live/uid`. هذا هو نمط التخزين الذي سيُستخدم للكيانات التشغيلية في Skincare بدل `osMakeApi` أو localStorage.
4. **خريطة صلاحيات الأقسام موجودة فعليًا:** جدول `public.collection_sections(system_id, collection, section_id)`، وmigration `20261025020000_collection_sections_map.sql`. دالة `ws_access_level(ws, sys, part)` تبحث عن collection في هذا الجدول، ثم تطبق صلاحية القسم المقابل. إذا لم توجد خريطة، تستخدم اسم collection كأنه section id.
5. **نتيجة عملية مهمة:** إضافة collections دون إضافة mapping ستسمح بأن تكون صلاحية القسم المخفي غير مطبقة إذا اختلف اسم collection عن section id. لذلك migration Skincare يجب أن تسجل كل collection وربطها بقسمها، مع اختبار RLS على collection مخفية، لا الاكتفاء بإخفائها في القائمة.
6. **حالة الخريطة الحالية:** لا توجد أي صفوف لـ`skincare` في `collection_sections`، كما لا توجد جداول Skincare. الصفوف الحالية تخص Finance وProjects وSpiritual.
7. **المضيف لا يمرر Record Store جاهزًا:** كل نظام يستورد hook ويهيئه بنفسه. بالتالي `src/systems/skincare/index.jsx` سيُنشئ Record Store داخليًا باستخدام `ws.id` و`systemId="skincare"` وDemo store الممرر من المنصة.

### 10.6 قرارات S1 المعتمدة

- اعتماد `useRecordStore` هو المسار الأساسي لبيانات Skincare التي يمكن تخزينها كسجلات JSONB.
- اعتماد أسماء collections صريحة وربطها بأقسام الواجهة في migration واحدة؛ لا collection واحدة لكل النظام.
- عدم استخدام `putAtomic` أو `putBatchAtomic` لعمليات Skincare قبل توسيع allowlists/عقود RPC؛ هذه الدوال الحالية مقيدة بأنظمة أخرى. عمليات CRUD المفردة تستخدم `put`، والعمليات متعددة السجلات تحتاج migration/RPC مخصصًا واختبارات ذرية.
- `softDelete` هو مسار الحذف الافتراضي، و`restore` للاستعادة؛ لا نستخدم DELETE الفعلي على `workspace_records` من الواجهة.
- لا نضيف بيانات الدورة أو صور التقدم إلى fallback المحلي. الصور ستظل في Storage خاص مع metadata في Record Store.
- لا حاجة إلى تعديل `OSSystemHost` أو `SYSTEM_LOADERS`؛ إضافة مجلد النظام تكفي للتحميل الديناميكي.
- يبقى إنشاء bucket وسياسات Storage وmigration الخاصة بـSkincare جزءًا من S1 بعد تحديد owner/path contract واختبارات العزل، وليس تغييرًا مرتجلًا على الإنتاج.

### 10.7 حالة S0 بعد الاستكمال

- [x] تحديد `useRecordStore` وعقده ومخرجاته.
- [x] تحديد `OSSystemHost` والتحميل الديناميكي.
- [x] تحديد جدول `collection_sections` ودالة تطبيق صلاحيات الأقسام.
- [x] تحديد الحاجة إلى mapping لكل collection قبل تفعيل النظام.
- [x] اعتماد مسار soft-delete/restore.
- [ ] تشغيل build/tests baseline في بيئة تشغيل المشروع.
- [ ] إعداد Storage bucket والسياسات (ينتقل إلى S1).
- [ ] تنفيذ اختبار RLS بحساب عضو view/edit على أقسام Skincare بعد migration (قبل أي إطلاق).

**حالة المرحلة:** أُغلقت مراجعة البنية المصدرية وقرارات التكامل في S0. بقي baseline runtime غير منفذ بسبب عدم توفر بيئة تشغيل المستودع في هذا المسار، ويجب تنفيذه قبل الدمج النهائي. يبدأ S1 ببناء شاشة النظام وطبقة Repository وربط الصلاحيات، ثم إعداد Storage واختباراته قبل تفعيل الصور.


## 11. تنفيذ S1 — تأسيس صلاحيات الأقسام والتخزين الخاص (قيد المراجعة)

تم إنشاء migration ضمن المستودع فقط:

`supabase/migrations/20261104100000_skincare_os_private_storage_and_collection_permissions.sql`

وتشمل:
- تسجيل 12 collection وربط كل واحدة بقسم الواجهة الصحيح داخل `collection_sections`، حتى تطبق `ws_access_level` صلاحيات القسم على مستوى RLS.
- إنشاء bucket خاص `skincare-progress` (غير عام) بحد أقصى 10MB وصيغ JPEG/PNG/WebP.
- سياسات Storage منفصلة للقراءة والإضافة والتعديل والحذف، وتتحقق من UUID مساحة العمل في أول جزء من مسار الملف، ثم تستدعي `ws_access_level(workspace_id,'skincare','photos')`.
- مسار التخزين المعتمد: `{workspace_id}/{diary_id}/{photo_id}.{ext}`. لا يسمح بالوصول العام ولا يُستخدم signed URL إلا بعد التحقق من ملكية السجل.

أضيف اختبار عقد ثابت:
- `tests/t_skincare_storage_permissions_contract.mjs`
- أضيف إلى سلسلة `npm test` في `package.json`.

**مهم:** هذه migration لم تُطبق على Supabase الإنتاجي. كما لم يُنشأ سجل النظام في `OS_SYSTEMS` بعد، ولم تُنشأ واجهة قابلة للوصول. لا توجد صور يمكن رفعها حتى اجتياز الاختبارات الفعلية.

### بوابة S1 الحالية
- [x] إنشاء migration لخريطة collection/section.
- [x] تعريف bucket خاص وسياسات RLS الخاصة بالصور.
- [x] إضافة contract test وربطه بسلسلة الاختبارات.
- [ ] تشغيل الاختبار محليًا والتحقق من نجاحه.
- [ ] مراجعة migration مع schema الفعلي وتشغيلها في بيئة اختبار أولًا.
- [ ] تنفيذ repository adapter وواجهة Dashboard/Diary/Products.
- [ ] إضافة Skincare إلى `OS_SYSTEMS` بعد توفر واجهة صالحة.
- [ ] اختبار مستخدم owner وعضو view/edit على collections والصور.
- [ ] تفعيل الصور بعد إثبات العزل بين workspaceين.

**الحالة الحالية:** S0 اكتمل من ناحية فحص المصدر وقرارات التكامل. S1 بدأ بإعداد صلاحيات السجلات والتخزين على مستوى ملفات المستودع فقط. لا يوجد نشر أو تغيير إنتاجي.




## 11.1 مراجعة تنفيذية مستقلة لـS1 — 2026-11-03

تمت مراجعة ملفات المصدر وقراءة حالة Supabase المتصل قراءة فقط. لا تمثل هذه المراجعة تطبيق migration أو اختبار تشغيل.

### ما تأكد من المصدر

1. `OSSystemHost` يستخدم `import.meta.glob("../systems/*/index.jsx")`، ويحمل النظام من `src/systems/<systemId>/index.jsx` ويمرر له `access/ws/isDemo/demoStore/shell`. لذلك لا نحتاج إلى تسجيل دخول أو Workspace أو host جديد.
2. `useRecordStore` في `src/core/records.jsx` يقيد القراءة والكتابة بـ`workspace_id + system_id`، ويدعم Demo منفصلًا في الذاكرة، وعمليات `put/softDelete/restore` عبر RLS وRealtime. يجب ألا تستخدم Skincare `osMakeApi` كبديل لسجلاته.
3. `softDelete` و`restore` ينفذان تحديثًا للسجل عبر `put`، وهو متوافق مبدئيًا مع سياسة `wr_update` للمحررين؛ لا تستخدم الواجهة حذف SQL مباشرًا.
4. `putAtomic` و`putBatchAtomic` لديهما allowlists مقيدة بأنظمة أخرى. يمنع استخدامهما في Skincare حتى تُصمم RPC وعقودها واختباراتها بشكل مستقل.
5. `OS_SYSTEMS` لا يحتوي حاليًا على `skincare`، ولا ينبغي إضافته قبل وجود شاشة صالحة وصلاحيات قابلة للاختبار.

### ما تأكد من قاعدة الإنتاج — دون تعديل

- `workspace_records` و`collection_sections` موجودان، وسياسات RLS الفعلية على `workspace_records` تستدعي `ws_access_level(workspace_id, system_id, collection)` في SELECT/INSERT/UPDATE.
- سياسة DELETE المباشر على `workspace_records` مقيدة بمالك مساحة العمل، بينما UPDATE يتطلب مستوى `edit`؛ لذلك يبقى soft-delete هو المسار المناسب للمحررين.
- لا توجد أي صفوف `skincare` في `collection_sections`.
- الـBuckets الحالية ثلاثة فقط: `health-documents` و`knowledge-attachments` و`sports-body-progress`. لا يوجد `skincare-progress`.
- لا توجد migration باسم Skincare في سجل Storage migrations. لم تُنفذ أي كتابة SQL خلال هذا الفحص.

### مراجعة migration الموجودة في GitHub

- ملف migration المقترح يربط 12 collection بأقسامها، ويعرّف bucket خاصًا وسياسات منفصلة للقراءة والإضافة والتعديل والحذف. هذه إعدادات مستودع فقط وليست إعدادات إنتاج.
- اسم الملف الحالي `20261104100000_...sql` يحمل تاريخ 4 نوفمبر، أي تاريخًا لاحقًا لتاريخ هذا الفحص (3 نوفمبر 2026). يجب ضبط ترتيب/اسم migration بعد مراجعة آخر migration في المستودع وقبل أي تطبيق.
- اختبار `t_skincare_storage_permissions_contract.mjs` اختبار نصي ثابت لعقد الملف؛ لا يثبت صحة RLS وقت التشغيل ولا عزل مستخدمين أو Workspaces.
- سياسة Storage تعتمد على `ws_access_level(..., 'skincare', 'photos')`، لذا لن تعمل صلاحيات الأعضاء كما هو مقصود إلا بعد تسجيل mapping الصحيح. يلزم أيضًا اختبار أن مسارات الملفات لا تمنح الوصول خارج Workspace المقصود، وأن إصدار signed URL لا يتم إلا بعد التحقق من سجل الصورة.

### ملاحظات Advisors

أعاد فحص Supabase Security Advisors تحذيرات قائمة مسبقًا، منها جداول RLS بلا سياسات ودوال SECURITY DEFINER قابلة للتنفيذ بواسطة authenticated. هذه النتائج ليست ناتجة عن Skincare ولم أغيرها ضمن هذا العمل؛ يجب عدم خلط إصلاحاتها مع نطاق S1، مع مراجعة `ws_access_level` ضمن تدقيق صلاحيات المنصة قبل الإطلاق.

### بوابة التنفيذ التالية

1. تثبيت ترتيب migration الصحيح، ومراجعة كل سياسة Storage مع `ws_access_level`.
2. إنشاء `src/systems/skincare/index.jsx` وطبقة repository صغيرة تستخدم `useRecordStore`، مع `access` على مستوى كل قسم، دون localStorage مباشر للبيانات الحساسة.
3. بناء أول شاشات قابلة للاستخدام: الملف الجلدي، المنتجات، والعبوات؛ لا تُظهر صور التقدم قبل اعتماد واختبار Storage.
4. تشغيل `npm test` و`npm run build` و`npm run lint` في بيئة المشروع. لم تتوفر بيئة تشغيل المستودع في جلسة الفحص الحالية، لذلك لم تُعلن هذه الاختبارات ناجحة.
5. تنفيذ اختبارات RLS فعلية بحسابات owner/editor/viewer وحسابين وWorkspaceين قبل تطبيق migration أو تفعيل النظام في الإنتاج.

**حالة S1 بعد المراجعة:** ملفات التأسيس موجودة في GitHub، لكن migration غير مطبقة، والواجهات غير منشأة، والاختبارات التشغيلية غير منفذة. قاعدة الإنتاج لم تتغير.


## 11.2 تنفيذ أساس الواجهة S1-A — 2026-11-03

تم إنشاء أساس أولي داخل المستودع:

- src/systems/skincare/domain.js: تعريف collections والتحقق من ملف البشرة والمنتجات والعبوات.
- src/systems/skincare/index.jsx: شاشة أولية تستخدم useRecordStore لنفس مساحة العمل والنظام، وتعرض لوحة رئيسية وملف البشرة وقائمة المنتجات والعبوات.
- tests/t_skincare_domain.mjs: اختبارات عقد التحقق من المدخلات، وأضيفت إلى npm test.

### وظائف الواجهة الموجودة في هذه الدفعة

- عرض ملخص المنتجات والعبوات ونوع البشرة.
- إنشاء وتعديل ملف البشرة.
- إضافة المنتجات وتعديلها ونقلها إلى الحذف المنطقي.
- تسجيل العبوات وربطها بمنتج وتعديلها ونقلها إلى الحذف المنطقي.
- إظهار حالة التحميل والحفظ والأخطاء، واحترام osSectionLevel على مستوى الأقسام.
- تخزين Demo عبر useRecordStore في الذاكرة المخصصة للوضع التجريبي، وعدم إنشاء localStorage خاص ببيانات Skincare.

### احتياطات الإطلاق

- لم أُضف skincare إلى OS_SYSTEMS في النسخة النهائية من التغيير؛ أزلت تسجيله فورًا حتى لا يظهر للمستخدمين قبل تطبيق خريطة صلاحياته واختبارها. ملفات الواجهة موجودة لكن النظام غير متاح من قائمة OS Hub.
- migration الخاصة بالصور وصلاحيات الأقسام لم تُطبق، ولم يتم إنشاء bucket في الإنتاج.
- لم تُنفذ اختبارات npm test أو npm run build أو npm run lint محليًا. أعاد فحص GitHub status للـcommit الأخير حالة Vercel failure مع رابط يوضح build-rate-limit؛ ولم يظهر deployment لهذا الـcommit في سجل Vercel. لذلك لا يوجد دليل على نجاح البناء أو نشر هذه الدفعة.
- لم يتم إجراء أي كتابة على Supabase، ولم تُنشر واجهة Skincare.

### مسار العمل الآمن

تم إنشاء فرع متابعة feature/skincare-s1-foundation من آخر commit. ستتم التعديلات التالية على هذا الفرع بدل دفع تغييرات إضافية مباشرة إلى الفرع الافتراضي. قبل إعادة تسجيل النظام في OS_SYSTEMS يجب إغلاق: ضبط تاريخ migration، مراجعة سياسات Storage، اختبارات RLS فعلية لمالك ومحرر ومشاهد وعزل Workspace، وإثبات نجاح الاختبارات والبناء.

**حالة S1-A:** ملفات الأساس الأولي موجودة؛ لا يزال النظام مخفيًا وغير منشور وغير متصل ببيانات إنتاج Skincare. هذه الدفعة لا تُعد اكتمالًا للقسم أو لكل أزراره.

**إضافة إغلاق دورة الحذف والاستعادة:** أضيفت في شاشة المنتجات والعبوات قوائم للمحذوفات مع زر استعادة فعلي يستدعي store.api.restore، وأصبحت دورة الإضافة/التعديل/الحذف المنطقي/الاستعادة موجودة لهذه الكيانات في الواجهة. لا تزال اختبارات الواجهة وRLS التشغيلية غير منفذة. حالة Vercel للـcommit السابق ما زالت failure بسبب build-rate-limit؛ ولم يتم إنشاء deployment لهذا التغيير حتى لحظة الفحص.


## 11.3 تنفيذ S2 — Routine Engine (دفعة أولية) — 2026-11-03

أضيفت على فرع feature/skincare-s1-foundation:

- src/systems/skincare/Routines.jsx: واجهة إدارة الروتينات والخطوات وسجل التنفيذ.
- توسعة src/systems/skincare/domain.js: التحقق من الروتين والتكرار والأيام والوقت، التحقق من صلاحية المنتج، ترتيب الخطوات، تحديد استحقاق الروتين، حساب الالتزام، وتوليد مفتاح idempotency لسجل الخطوة.
- توسعة src/systems/skincare/index.jsx: حفظ الروتينات في skin_routines وسجلات التنفيذ في skin_routine_logs عبر useRecordStore، مع سجل واحد لكل (روتين + يوم + خطوة).
- tests/t_skincare_routine_domain.mjs: اختبارات قواعد الروتين والمنتجات والترتيب والالتزام والهدف الأسبوعي، وأضيفت إلى npm test.
- تحديث migration mapping بحيث تتبع skin_routine_logs صلاحية قسم routines نفسه، لأن سجل التنفيذ جزء من تشغيل الروتين ولا ينبغي أن يتطلب قسم صلاحيات منفصلًا غير ظاهر للمستخدم.

### الوظائف المضافة

- إنشاء وتعديل ونسخ الروتينات، وإيقافها مؤقتًا أو إعادة تفعيلها.
- خطوات مرتبطة بمنتجات موجودة، مع رفض المنتجات المنتهية/المتخلّص منها، وطلب تأكيد صريح للمنتجات المصنفة Avoid.
- ترتيب يدوي لأعلى/أسفل، ومعاينة ترتيب مقترح ثم تطبيقه أو إلغاء المعاينة.
- أرشفة الخطوة بدل إزالتها إذا كان لها سجل تنفيذ سابق.
- تكرار أسبوعي يومي/أيام محددة/عدد مرات أسبوعيًا.
- تسجيل تم/تخطي، منع تكرار سجل الخطوة في اليوم باستخدام client_generated_id ثابت، والتراجع عن آخر تسجيل عبر soft delete.
- حساب التزام مبدئي من السجلات الفعلية مقابل الاستحقاق الأسبوعي، دون تخزين النسبة المشتقة.
- منع حذف منتج مرتبط بعبوة أو خطوة روتين حتى لا تنكسر العلاقات.

### حدود S2 المتبقية

- حقل وقت التذكير محفوظ فقط؛ لم أعثر على خدمة إشعارات/جدولة قائمة موثقة يمكن توصيلها بأمان. لذلك لم أقدّم التذكير على أنه يعمل، ويظل تفعيل الإشعارات داخل التطبيق مؤجلًا حتى ربط خدمة المنصة أو بناء adapter موحد لها.
- حساب الالتزام الحالي تقديري ويحتاج اختبارات قبول على نطاقات زمنية مختلفة، خصوصًا التكرار times_per_week والأسبوع المحلي والتوقيت الصيفي.
- يلزم اختبار تعارض التعديل المتزامن، وتكرار الضغط، وreload، وDemo/prod isolation، وصلاحيات owner/editor/viewer.
- لا توجد اختبارات runtime أو build أو lint منفذة لهذه الدفعة؛ فحص Vercel السابق أظهر build-rate-limit، ولا يجوز اعتبار حالة CI نجاحًا.
- لم تُطبق migration ولم تُكتب أي بيانات إلى Supabase الإنتاجي، ولم يُفعّل النظام في OS_SYSTEMS.

**حالة S2:** أساس المحرك والواجهة موجود على فرع العمل فقط. لا تُعد المرحلة مغلقة حتى تنجح الاختبارات التشغيلية وتُربط خدمة التذكيرات وتُراجع صلاحيات collection فعليًا.


## 11.4 تنفيذ S3-A — مفكرة البشرة اليومية — 2026-11-03

تمت إضافة دفعة أولية على فرع `feature/skincare-s1-foundation`:

- `src/systems/skincare/Diary.jsx`: شاشة مفكرة يومية، سجل زمني، اختيار اليوم السابق/التالي/اليوم، تحرير إدخال قائم، وقائمة محذوفات مع الاستعادة.
- `src/systems/skincare/domain.js`: إضافة collection `skin_diary` ودالة `validateSkinDiaryEntry` للتحقق من التاريخ، منع المستقبل، والتحقق من نطاقات تقييم البشرة والنوم والمزاج والنشاط والمياه.
- `src/systems/skincare/index.jsx`: ربط المفكرة بـ`useRecordStore` مع upsert منطقي على سجل واحد لكل تاريخ، منع التكرار، soft delete، restore، والتحقق من تعارض تاريخ عند الاستعادة.
- `tests/t_skincare_domain.mjs`: إضافة حالات تاريخ صحيح/مستقبلي/غير موجود، درجات خارج النطاق، وساعات نوم غير صحيحة. الملف موجود بالفعل ضمن سلسلة `npm test` الحالية.
- إضافة مدخل مفكرة البشرة إلى التنقل وزر «سجّل يومك» من الرئيسية.

### نطاق بيانات المفكرة في هذه الدفعة

- تاريخ اليوم.
- تقييم البشرة 1–5.
- مشكلات/أعراض نصية يحددها المستخدم.
- ملاحظات حرة.
- ساعات النوم وجودته.
- المزاج.
- دقائق النشاط.
- أكواب المياه.

لم تتم إضافة `cycle_phase` أو أي بيانات دورة/صحة شديدة الحساسية في هذه الدفعة. ولم يتم تضمين صور أو رفع ملفات داخل JSONB.

### ما لم يكتمل في S3

- الصور: لا يوجد upload/download/delete فعلي؛ يجب أولًا مراجعة وتصحيح migration Storage، واختبار owner/editor/viewer وعزل Workspace، ثم بناء adapter يربط سجل `skin_photos` بالملف الخاص. لا signed URLs عامة.
- قياسات البشرة المتقدمة (المناطق، شدة كل مشكلة، خرائط الوجه) والتقويم المرئي وتحليلات الاتجاهات لم تُبنَ بعد.
- ربط trial من المفكرة مؤجل حتى اكتمال Trials OS section والتحقق من collection `skin_trials`.
- لم يتم تشغيل `npm test` أو `npm run build` أو `npm run lint` في بيئة تشغيل؛ status الآلي المتاح سابقًا كان يفشل بسبب Vercel build-rate-limit، وليس بسبب نتيجة اختبار موثقة.
- لم تُطبق migration على Supabase الإنتاجي، ولم يتم إنشاء bucket، ولم يُنشر النظام أو يُسجل في `OS_SYSTEMS`.

**حالة S3-A:** CRUD المفكرة الأساسي موجود على فرع العمل فقط؛ لا تعتبر المرحلة مغلقة قبل اختبارات التشغيل وRLS وreload، وقبل بناء مسار الصور الآمن.


## 11.5 تنفيذ S3-B — بنية صور التقدم الخاصة — 2026-11-03

أضيفت دفعة S3-B على فرع `feature/skincare-s1-foundation`:

- `src/systems/skincare/Photos.jsx`: شاشة رفع الصور ومعرض خاص ومقارنة صورتين جنبًا إلى جنب، مع تسجيل الإضاءة والزاوية وملاحظات التصوير.
- `src/systems/skincare/photoDomain.js`: التحقق من أنواع الصور والأحجام، وصناعة مسارات مرتبطة بـworkspace وإدخال اليوم ومعرّف الصورة، والتحقق من بيانات المقارنة.
- `src/systems/skincare/photoStorage.js`: adapter للرفع والتنظيف وإنشاء روابط موقعة قصيرة العمر والحذف، مع إعادة قراءة سجل الصورة من `workspace_records` والتحقق من ملكية المسار قبل إصدار الروابط.
- `src/core/records.jsx`: إضافة `putStrict` الذي لا يضع عمليات البيانات الوصفية في offline queue. هذا ضروري لأن ملف Storage لا يجوز أن يترك سجلًا يتيمًا أو سجلًا ينتظر المزامنة بينما الملف موجود بالفعل.
- `src/systems/skincare/index.jsx`: ربط `skin_photos` بواجهة Skincare OS ورفع/حذف الصور من خلال المخزن الموحد.
- `supabase/migrations/20261103160000_skincare_os_private_storage_and_collection_permissions.sql`: تصحيح توقيت migration إلى ما بعد آخر migration إنتاجية مرصودة (`20261103151035`) بدل التاريخ المستقبلي السابق، وتشديد سياسات القراءة والرفع.
- `tests/t_skincare_storage_permissions_contract.mjs` و`tests/t_skincare_domain.mjs`: تحديث عقود mapping والصلاحيات ومسارات الصور.

### سلوك الصور

- قبول JPG/PNG/WEBP فقط، بحد أقصى 10MB للملف الأصلي.
- إعادة معالجة الصورة في المتصفح قبل الرفع لإزالة بيانات EXIF، مع حد أقصى 3200 بكسل للحافة الأطول.
- إنشاء نسخة WebP مصغرة حتى 480 بكسل.
- حفظ الملفين في bucket خاص `skincare-progress`، وليس داخل JSONB.
- مسار الملف: `{workspace_uuid}/{diary-YYYY-MM-DD}/{photo_uuid}.{ext}`، والنسخة المصغرة `{photo_uuid}.thumb.webp`.
- يجب وجود إدخال يومي نشط قبل الرفع.
- إصدار signed URLs لمدة 5 دقائق فقط، بعد قراءة سجل `skin_photos` من `workspace_records` والتحقق من أن المسارات تطابق السجل. لا يوجد public URL.
- أرشفة سجل الصورة أولًا لمنع العرض، ثم حذف الأصل والنسخة المصغرة معًا. إذا فشل حذف الملفات يبقى السجل في قائمة تنظيف قابلة لإعادة المحاولة. لا يمكن استعادة الملف بعد حذفه من Storage.
- المقارنة بصرية فقط، ولا تدّعي تشخيصًا أو تحليلًا طبيًا. يسجل المستخدم الإضاءة والزاوية لتفسير الاختلافات.

### تدقيق أمان Migration

- تأكدت من أن الإنتاج لا يحتوي حاليًا على bucket باسم `skincare-progress`، وأن الـbuckets الموجودة للصور/المستندات خاصة.
- سياسة القراءة لا تكتفي بوجود UUID في أول مجلد؛ تشترط وجود سجل `skin_photos` نشط يطابق المسار، وإدخال يوم نشط تابع لنفس Workspace.
- سياسة الرفع تشترط صلاحية edit لقسم photos ووجود إدخال اليوم المرتبط.
- لا تمنح Migration صلاحية UPDATE للملفات؛ الرفع يستخدم `upsert: false`.
- سياسة الحذف محصورة في bucket ومسار Workspace وصلاحية edit لقسم photos.
- إنشاء signed URL لا يتم اعتمادًا على اسم الملف المرسل من الواجهة وحده؛ تتم مطابقة metadata من قاعدة البيانات أولًا.

### حدود وفجوات S3-B

- لم تُطبق Migration؛ bucket غير موجود في الإنتاج حتى الآن، ولذلك لا يُعد الرفع جاهزًا للاستخدام الإنتاجي.
- روابط Supabase الموقعة تظل قابلة للاستخدام حتى انتهاء صلاحيتها (5 دقائق) حتى لو تغيرت الصلاحية بعد إصدارها؛ لا نستخدم روابط طويلة الأجل.
- لم يتم تنفيذ اختبار Storage فعلي بحسابين وWorkspaceين أو اختبار owner/editor/viewer، ولم نتحقق من سلوك إزالة الملفين عند فشل جزئي من الخادم.
- لم يتم تشغيل `npm test` أو `npm run build` أو `npm run lint` محليًا. فحص Vercel السابق كان `build-rate-limit` وليس نتيجة بناء.
- لا يوجد دعم رفع صور في Demo عمدًا؛ الصور لا تُحفظ في localStorage أو offline queue.
- لا يوجد تحليل تلقائي للصور أو مقارنة طبية؛ المقارنة جنبًا إلى جنب فقط.

**حالة S3-B:** كود وMigration وعقود اختبار مبدئية موجودة على فرع العمل فقط. لا تفتح الميزة في الإنتاج ولا تفعّل Skincare في `OS_SYSTEMS` قبل تطبيق Migration بموافقة صريحة، واجتياز اختبارات RLS وStorage متعددة الحسابات، ثم اختبارات التشغيل والبناء.

### قائمة قبول S3-B المتبقية

1. اختبار رفع صورة أصلية ومصغرة والتحقق من MIME والحجم والأبعاد.
2. اختبار signed URL لمستخدم viewer ومستخدم بلا صلاحية ومستخدم من Workspace آخر.
3. التأكد من أن photo metadata غير موجود أو محذوف يمنع إصدار signed URL وقراءة الملف.
4. اختبار حذف الأصل والمصغرة، وفشل حذف أحد الملفين، وفشل حفظ tombstone بعد حذف الملفات.
5. اختبار منع الرفع في Demo وoffline وعدم ترك ملفات أو سجلات يتيمة.
6. اختبار reload والتزامن بعد الرفع والحذف.


### 11.6 تدقيق وإصلاح Migration صور التقدم — 2026-11-03

أثناء بوابة التحقق التالية تمت مراجعة ملف Migration الفعلي على الفرع، واكتشاف أن سياسة الحذف كانت تحتوي شرط SQL مشوهًا وبقايا SQL مكررة بعد COMMIT. لم تكن هذه الصيغة صالحة للتطبيق.

تم إصلاح الملف supabase/migrations/20261103160000_skincare_os_private_storage_and_collection_permissions.sql على فرع العمل فقط:

- إعادة كتابة سياسات القراءة والرفع والحذف بصياغة متماسكة.
- القراءة تتطلب صلاحية view/edit، وسجل صورة نشطًا يطابق مسار الملف، وسجل مفكرة نشطًا مرتبطًا بالصورة.
- الرفع يتطلب صلاحية edit وسجل يوم نشطًا يطابق مجلد التاريخ.
- الحذف يتطلب صلاحية edit ومسار Workspace/تاريخ/اسم ملف مطابقًا للنمط. لا يشترط وجود سجل صورة نشطًا، حتى يمكن تنظيف الملف بعد وضع Tombstone أو عند فشل حفظ metadata.
- لا توجد سياسة UPDATE؛ الرفع ما زال يستخدم upsert: false.
- إضافة assertions إلى عقد الاختبار للتحقق من عدد السياسات، وعدم وجود UPDATE، وحدود سياسة الحذف، وعدم وجود SQL بعد COMMIT.

**التحقق المتاح:** تمت مراجعة النص النهائي آليًا عبر GitHub والتأكد من وجود BEGIN/COMMIT واحد، وثلاث سياسات فقط (SELECT/INSERT/DELETE)، وعدم وجود العبارة المشوهة أو SQL زائد بعد COMMIT. هذا فحص نصي للعقد فقط، وليس تنفيذًا لـPostgreSQL أو اختبار RLS/Storage حقيقيًا.

**ما لم يتم:** لم يتم تشغيل npm test أو npm run build أو npm run lint لأن نسخة المستودع غير متاحة في بيئة تشغيل محلية لهذه الجلسة. حالة Vercel على commit de67551b590faee8ed37196f8e95f07438b44d1f ما زالت failure بسبب build-rate-limit؛ لا تُعد نتيجة اختبار فاشلة من التطبيق ولا نجاحًا للبناء. لم تُطبق Migration ولم تُنشأ bucket في الإنتاج، ولم يتم merge أو deploy.

**الخطوة التالية:** إتاحة بيئة اختبار معزولة أو Supabase staging لاختبار owner/editor/viewer وWorkspace isolation والرفع والحذف الجزئي وإعادة المحاولة، ثم تشغيل حزمة الاختبارات والبناء وLint قبل طلب موافقة مستقلة على أي تغيير إنتاجي.


### 11.7 استكمال S3-A — تقويم المفكرة وقياسات مناطق الوجه — 2026-11-03

أضيفت دفعة متابعة على فرع العمل:

- `src/systems/skincare/Diary.jsx`: تقويم شهري تفاعلي يوضح الأيام التي لها إدخال، يسمح بالتنقل بين الشهور السابقة والحالية، يمنع اختيار الأيام المستقبلية، ويزامن الشهر المعروض مع التاريخ المختار.
- شاشة ملخص آخر 30 يومًا تعرض عدد الأيام المسجلة، متوسط تقييم البشرة من الإدخالات التي تحتوي تقييمًا فقط، مقارنة متوسط آخر 7 أيام بالـ7 السابقة عند توافر بيانات في الفترتين، وأكثر الملاحظات تكرارًا.
- إضافة قياسات منفصلة لشدة المشكلة في الجبهة والخد الأيسر والخد الأيمن والأنف والذقن والفك، بقيم من 0 إلى 5؛ القيمة الفارغة تعني عدم التقييم و0 تعني عدم وجود مشكلة.
- `src/systems/skincare/domain.js`: التحقق من أسماء مناطق الوجه وقيم القياس وحدودها قبل الحفظ.
- `src/systems/skincare/index.jsx`: تهيئة القياسات في المسودة، تحميلها عند تعديل إدخال قديم، وإعادة تهيئتها بعد الحفظ. البيانات محفوظة داخل سجل `skin_diary` القائم في `useRecordStore` دون إنشاء collection أو جدول مستقل.

**حدود التحليل:** المؤشرات وصفية وليست تشخيصًا أو استنتاجًا سببيًا. متوسط التقييم لا يحسب الأيام التي لم يسجل فيها المستخدم تقييمًا. المقارنة الأسبوعية تظهر «بيانات غير كافية» إذا لم يوجد تقييم في إحدى الفترتين.

**حالة التنفيذ:** تمت مراجعة وجود مكونات التقويم والقياسات والتحقق وربط المسودة عبر ملفات الفرع. لم يتم تشغيل الاختبارات أو البناء أو lint بناءً على قرار تأجيل الاختبارات في هذه المرحلة؛ لذلك لا توصف هذه الدفعة بأنها مجتازة للاختبارات. لا تزال اختبارات S3-A/S3-B وStorage/RLS مؤجلة، ولم تُطبق أي Migration أو تغييرات على Supabase الإنتاجي، ولم يحدث merge أو deploy.

**الفجوة التالية في S3:** ربط إدخالات المفكرة بالتجارب النشطة بعد بناء Trials OS وتحديد نموذج التجربة وحالاتها وسجل النتائج؛ لا نضيف trialId حرًا أو خيارات وهمية قبل وجود إدارة تجارب فعلية.


### 11.8 بدء S4 — مكتبة المكونات ومحلل INCI الشخصي — 2026-11-03

أضيفت دفعة أولية على فرع العمل:

- `src/systems/skincare/Ingredients.jsx`: واجهة المكتبة الشخصية لإضافة المكوّن وتعديله ووسمه (مفضل/حساس/تجنب/بدون وسم)، حفظ الوظيفة والملاحظات والمصدر، الحذف المنطقي والاستعادة، البحث، وعرض المنتجات التي تحتوي على المكوّن.
- إضافة محلل INCI يقسم القائمة على الفواصل العربية والإنجليزية والأسطر والنقطة الوسطى، ويطابق أسماء INCI وAliases بعد توحيد المسافات وحالة الأحرف. يعرض المطابقات والأسماء غير المعروفة والوسوم الشخصية التي تحتاج مراجعة. لا توجد مطابقة تخمينية أو ادعاءات علاجية.
- `src/systems/skincare/domain.js`: إضافة `validateSkinIngredient`, `normalizeINCIName`, `parseINCIList`, `analyzeINCI`, `productsContainingIngredient` وتسجيل `skin_ingredients` في `SKINCARE_COLLECTIONS`.
- `src/systems/skincare/index.jsx`: ربط المكتبة بـ`useRecordStore`، والتنقل الداخلي، وصلاحيات قسم ingredients، والتحقق من تكرار الاسم، وعمليات soft delete/restore.
- يعتمد عرض المنتجات المحتوية على تطابق حرفي لقائمة المكونات الخام المخزنة في المنتج؛ لا يجري OCR ولا يستنتج أسماء غير موجودة.

**حدود الدفعة:** المكتبة شخصية وفارغة افتراضيًا؛ لم أضف Seed أو خدمة خارجية لتفسير المكونات. «شرح المكوّن» حاليًا يعتمد على الوظيفة والملاحظات والمصدر الذي يدخله المستخدم، وليس قاعدة معرفة طبية جاهزة. لا يتم استبدال تعديلات المستخدم أو إضافة بيانات من مصدر خارجي.

**حالة التنفيذ:** تم ربط الملفات والتنقل والمخزن الموحد على فرع العمل. لم يتم تشغيل الاختبارات أو البناء أو lint وفق قرار تأجيل الاختبارات؛ لا يعني ذلك نجاحًا مثبتًا. mapping `skin_ingredients -> ingredients` موجود بالفعل في Migration الخاصة بالـcollections، لكن لم يتم تطبيقها على الإنتاج. لا merge ولا deploy.

**الخطوة التالية في S4:** إضافة Seed مرجعي موثوق قابل للإصدار والتحديث دون استبدال سجلات المستخدم، ثم ربط تحليل INCI ببيانات المنتجات وواجهة مراجعة المكونات ذات الوسوم. لا نضيف قاعدة معلومات أو تقييم سلامة غير موثق.


### 11.9 ربط محلل INCI بمنتجات المكتبة — 2026-11-03

استكمالًا لدفعة S4، أضيف إلى `Ingredients.jsx` اختيار منتج محفوظ لتحميل قائمة `ingredients` الخام الخاصة به مباشرة إلى محلل INCI. يعاد التحليل تلقائيًا عند تغير النص أو مكتبة المكونات، وتظل المطابقة exact/alias فقط. لا يتم تعديل سجل المنتج أثناء التحليل.

**ملاحظة إدارة الفرع:** أثناء إنشاء ملفات الواجهة Trials.jsx وReactions.jsx، تكرر خطأ عدم تمرير اسم الفرع في عملية الإنشاء، فأنشئت الملفات مؤقتًا على `main` ثم حُذفت مباشرة وأعيد إنشاؤها صراحة على `feature/skincare-s1-foundation`. كما حدث سابقًا مع Ingredients.jsx. تحققت أن الملفات الثلاثة غير موجودة على `main` الآن، وموجودة على فرع العمل. نتج عن عمليات الإنشاء والحذف ستة commits على `main` دون تغييرات ملفات باقية؛ لذلك أصبح فرع العمل متأخرًا عن `main` بستة commits (ومتقدمًا عليه بـ106 commits وقت آخر مقارنة). لم يتم دمج أو نشر تغييرات Skincare. يجب مزامنة/مراجعة تاريخ الفرع قبل PR أو merge، وعدم دمج تغييرات Skincare قبل حل divergence.

**الحالة العامة حتى هذه الدفعة:** S3-A تقويم وقياسات مناطق الوجه مضافة؛ S3-B بنية الصور ومigration المصححة على الفرع؛ S4 مكتبة المكونات ومحلل INCI الأولي مربوطان بالمخزن الموحد. كل ذلك غير مختبر runtime/build، ولم يتم تطبيق migrations أو النشر أو التفعيل الإنتاجي. Seed مرجعي موثق، شرح موثوق للمكونات، وتجارب/تفاعلات S5 ما زالت ضمن الخطة.


### 11.10 كتالوج INCI مرجعي قابل للاستيراد — 2026-11-03

أضيفت دفعة Seed مرجعية إلى S4:

- src/systems/skincare/ingredientCatalog.js: كتالوج إصدار 2026.11.03.1 يضم 18 اسم INCI شائعًا، مع عدد محدود من المرادفات الواضحة فقط. لا تُعامل الاختصارات العامة مثل AHA/BHA أو الأسماء الشائعة الواسعة كمرادفات لمادة واحدة.
- تمت إضافة روابط مرجعية إلى قاعدة CosIng والـGlossary الأوروبي وتقارير Cosmetic Ingredient Review (CIR).
- أضيف زر «استيراد الأسماء المرجعية» داخل واجهة المكونات، ويعمل فقط لمن لديه صلاحية تعديل.
- الاستيراد يمر عبر useRecordStore والـcollection الحالية skin_ingredients؛ لا توجد جداول جديدة ولا تخزين محلي موازٍ.
- الاستيراد idempotent على مستوى اسم INCI بعد التطبيع: يتجاوز السجلات النشطة والمحذوفة التي لها الاسم نفسه، ولا يكتب فوق الوسوم أو الملاحظات أو الوظائف الشخصية. إذا توقف منتصف العملية، يمكن إعادة المحاولة؛ السجلات التي أضيفت بالفعل سيتم تجاوزها.
- validateSkinIngredient أصبح يحتفظ ببيانات مصدر السجل: referenceUrl, catalogKey, catalogVersion, sourceType.
- الكتالوج يضيف أسماء فقط؛ حقول الوظيفة فارغة، ولا يضيف تقييم أمان أو فعالية أو تركيز أو توصية علاجية. يجب الرجوع إلى مصدر خاص بالمادة والسياق قبل إضافة هذه المعلومات.

**المصادر المرجعية وحدودها:**
- المفوضية الأوروبية توضح أن CosIng قاعدة معلوماتية/مرجعية، وليست قائمة موافقات، وأن وجود اسم فيها لا يعني أن المادة معتمدة أو مسموح بها تلقائيًا. كما أن الـGlossary ليس شاملًا ويخضع للتحديث.
- CIR ينشر تقييمات سلامة لمكونات بعينها، وليس تقييمًا للمنتجات النهائية؛ لا ننقل استنتاجات تقييم مادة إلى منتج أو تركيز مختلف.

**حالة التنفيذ:** أضيفت ملفات الكتالوج والاستيراد والروابط على فرع العمل. لم يتم تشغيل اختبارات أو build أو lint وفق قرار تأجيل الاختبارات؛ لذلك لم يتم التحقق التشغيلي من الاستيراد. لا Migration جديدة مطلوبة لهذه الدفعة، ولا تغيير في Supabase الإنتاج، ولا merge/deploy.

**المتبقي في S4:** توسيع مرجعية الوظائف والمعلومات لكل مكوّن بمصادر محددة، وتسجيل تاريخ/نسخة المصدر، ثم إضافة تحديث Seed لا يستبدل بيانات المستخدم، وأداة مراجعة المصادر. لا يجوز ملء حقول وظيفة أو سلامة بصورة جماعية اعتمادًا على صفحة عامة واحدة.


### 11.11 بدء S5 — التجارب والتفاعلات (الدفعة الأولى) — 2026-11-03

أضيفت بنية أولية فعلية لقسمي Trials وReactions على فرع العمل:

- domain.js: إضافة collections skin_trials وskin_reactions، والتحقق من حقول التجربة (المنتج، السؤال، تاريخ البداية/النهاية، المدة، الحالة، النتيجة، وخط الأساس)، والتحقق من التفاعل (المنتج، العبوة، التاريخ، الشدة، الأعراض، المنطقة، الإجراء، المكونات المشتبه بها، وتاريخ الحل).
- domain.js: انتقالات حالات التجربة محصورة في planned → running/cancelled، running → paused/completed/cancelled، paused → running/completed/cancelled؛ لا يمكن إعادة فتح تجربة مكتملة أو ملغاة.
- domain.js: ملخص وصفي للتجربة يقارن متوسط تقييمات خط الأساس والمتابعة، ويعرض عدد السجلات والتفاعلات والتجارب المتزامنة، ولا يقرر أن المنتج سبب التغير.
- Trials.jsx: إنشاء تجربة لمنتج نشط، معاينة خط أساس آخر 7 أيام قبل البدء، منع بدء تجربة أخرى لنفس المنتج إذا كانت هناك تجربة جارية أو متوقفة مؤقتًا، إيقاف/استكمال/إنهاء/إلغاء، واختيار النتيجة من المستخدم.
- Reactions.jsx: تسجيل التفاعل وربطه بمنتج وعبوة اختياريًا، وإضافة الأعراض والمنطقة والإجراء والمكونات التي يشتبه المستخدم بها، ثم تسجيل الحل أو الأرشفة.
- index.jsx: ربط القسمين بـuseRecordStore وبيانات Workspace الحالية، والتحقق من أن العبوة تتبع المنتج وأن المكونات المشتبه بها موجودة، ومنع بدء تجربة لمنتج موسوم avoid، مع أزرار تنقل لمراجعة المنتج والروتين والمكونات دون إيقاف أي خطوة تلقائيًا.
- Migration الحالية تحتوي بالفعل على collection_sections mapping لكل من skin_trials وskin_reactions؛ لم تُنشأ Migration جديدة لهذه الدفعة.

**حدود الدفعة والفجوات:**
- خط الأساس يلتقط إدخالات المفكرة ذات تقييم البشرة في الأيام السبعة السابقة لتاريخ البدء، وقد يكون عددها صفرًا أو قليلًا؛ تعرض الواجهة نقص البيانات بدل اختلاق قيم.
- ملخص التجربة وصفي، ويتضمن تحذيرًا عند أقل من 3 تقييمات في أي فترة. التجارب المتزامنة والتفاعلات تظهر كعوامل سياقية لا كاستنتاج سببي.
- تسجيل تفاعل لا يوقف المنتج أو الروتين تلقائيًا. لا توجد خدمة تنبيه طبي أو إشعارات فعلية.
- لم يكتمل بعد الربط العميق بين التفاعل وخطوات الروتين، ولا صفحة تفصيل تجربة مستقلة، ولا مقارنة متعددة الفترات، ولا استيراد/تصدير سجل التجارب.
- لا يوجد حذف للتفاعلات في هذه الدفعة؛ الأرشفة تحفظ الأثر، وخصوصًا الشديد.

**حالة التنفيذ:** أضيفت ملفات Trials.jsx وReactions.jsx وربطهما بالتنقل والمخزن على فرع feature/skincare-s1-foundation. تم التحقق من وجود collection mappings في migration الحالية. لم يتم تشغيل الاختبارات أو build أو lint وفق قرار تأجيل الاختبارات، لذلك لا توجد نتيجة تشغيلية مثبتة. لا تعديل على Supabase الإنتاجي، ولا merge أو deploy.


### 11.12 ربط المفكرة بالتجارب — 2026-11-03

استكمالًا لـS5، أضيف اختيار التجربة المرتبطة داخل نموذج مفكرة البشرة:

- Diary.jsx يستقبل التجارب ويعرض فقط التجارب غير الملغاة التي يقع تاريخ الإدخال داخل نطاقها الزمني.
- index.jsx يتحقق عند الحفظ أن التجربة موجودة في Workspace نفسه، وليست ملغاة، وأن تاريخ المفكرة لا يسبق البداية ولا يتجاوز النهاية عند وجودها.
- يظل الربط اختياريًا، ولا يغيّر سجل التجربة أو نتيجتها.
- تستخدم العلاقة حقل trialId الموجود داخل سجل skin_diary، دون جدول إضافي.

**حالة التنفيذ:** تمت إضافة الربط والتحقق على فرع العمل. لم يتم تشغيل الاختبارات أو build أو lint، ولم يحدث تعديل إنتاجي أو merge/deploy.
