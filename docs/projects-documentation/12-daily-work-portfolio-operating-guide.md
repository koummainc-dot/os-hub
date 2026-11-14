# 12 — دليل التشغيل: مساحة اليوم، الأسبوع، عملي، Dashboard وPortfolio

هذا الدليل يشرح كيف تستخدم هذه الشاشات يوميًا وما الذي تعنيه الأرقام والبطاقات والفلاتر والروابط. المصدر الأساسي هو تنفيذ Projects v5 الحالي في screens_a.jsx، وليس افتراضًا عامًا عن إدارة المشاريع.

## 1. لوحة المشاريع — Dashboard
Dashboard ليست مكان إنشاء كل شيء. هي طبقة مراقبة سريعة: ماذا يحدث في المشاريع الجارية؟ ما الذي تأخر؟ ما المشاكل الحرجة؟ ما المخاطر العالية؟ ما المواعيد القريبة؟ أين تقف الأهداف؟ وكيف يتوزع حمل الفريق؟

### أعلى الشاشة
| المؤشر | ماذا يعني | عند الضغط |
|---|---|---|
| مشاريع جارية | Planned / In Progress / On Hold | يفتح المشاريع |
| مهام متأخرة | مهام Leaf متأخرة | يفتح المهام |
| مشاكل حرجة | Open + Critical | يفتح Issues مع فلتر Critical |
| مخاطر عالية | Open + score >= riskHigh | يفتح Risks مع فلتر المخاطر العالية |
| صندوق الاكتشاف | Discovery بحالة Inbox | يفتح Discovery |

### مثال
إذا ظهر: مهام متأخرة = 4، فهذا يعني 4 مهام Leaf متأخرة ضمن مشاريع حقيقية غير مؤرشفة، وليس أربع مهام إجمالًا في النظام.

## 2. صحة المشاريع
كل مشروع جارٍ يظهر: الاسم، أسباب حالة الصحة، Health Badge، Progress، الأيام المتبقية أو المتأخرة، وقائد المشروع.
الترتيب يبدأ من الحالة الأسوأ إلى الأفضل: Red ثم Orange ثم Yellow ثم Green ثم OnHold ثم Completed ثم NotEvaluated.
استخدم Health كإشارة للمراجعة وليس كبديل عن قراءة Project. إذا رأيت Red بسبب تأخر ومخاطر، افتح المشروع وراجع Tasks وRisks وIssues وTarget date وProgress.

## 3. المواعيد خلال 14 يومًا
تظهر المشاريع التي لها target_date ويقع الموعد بين اليوم و14 يومًا. مثال: Content OS — 7 أيام يعني أن target_date للمشروع بعد سبعة أيام. هذه ليست قائمة بكل Tasks القادمة؛ للمهام استخدم Today أو Week أو Tasks.

## 4. المشاكل الحرجة
تظهر Issue عندما تكون مفتوحة وشدتها Critical. الضغط على المؤشر يفتح قائمة Issues مفلترة. لا تستخدم Issue لكل احتمال: الاحتمال Risk، والعطل الفعلي Issue.

## 5. المخاطر العالية
الحساب هو riskScore = probability × impact. مثال: Probability = 4 وImpact = 5 يعطي Score = 20. إذا كان threshold في Settings يساوي 15 يظهر الخطر كعالي.

## 6. OKR على Dashboard
يظهر لكل Objective نشط Progress وPace. Pace يقارن التقدم بالفترة الزمنية، لذلك قد يكون Progress = 50% بينما Pace متأخر إذا كان الزمن المستهلك أكبر من نسبة الإنجاز المتوقعة.

## 7. اليوم — Today
Today هي صندوق التشغيل اليومي: ماذا عليّ اليوم؟ ماذا تأخر؟ ماذا اقترب؟ ما الإشعارات؟ ما اجتماعات اليوم؟ وما التعديلات التي تنتظر المزامنة؟

## 8. الوارد الموحد
Today تقرأ Core Notifications. إذا كان الإشعار من Projects ويحمل taskId يفتح Task مباشرة. وإذا كان يحمل projectId وtab وrecordKind وrecordId يفتح Project ثم التبويب ثم السجل.
مثال: إشعار مراجعة Risk: API Delay يفتح Projects → Project X → Risks → Risk API Delay، وليس Dashboard عامة.

## 9. المهمة السريعة
زر مهمة ينشئ Task في مشروع النظام عام مع assignee للمستخدم الحالي وplanning_bucket = This Week وdue_date = اليوم. استخدمه لالتقاط شيء سريع مثل اتصل بأحمد، وليس لإنشاء PRD أو Requirement أو Output.

## 10. اجتماعات اليوم
Today تستدعي Knowledge Meetings وتعرض الاجتماعات غير المؤرشفة وغير المحذوفة وغير ذات الحالة archived التي تاريخها اليوم، مرتبة حسب وقت البداية. إذا خرج من الاجتماع Follow-up فالعلاقة التشغيلية هي Meeting → Follow-up → Projects Task.

## 11. Offline / Sync
عند Offline يمكن تعديل حقول المهمة الأساسية فقط. الإنشاءات والعلاقات والنقل والملفات والعمليات الذرية تحتاج اتصالًا. عند Conflict لا يستبدل النظام نسخة الخادم تلقائيًا. تظهر خيارات مثل دمج الحقول غير المتعارضة أو استخدام نسخة الخادم.
مثال: الخادم due_date = 20 Nov والمحلي due_date = 22 Nov، لا يتم اختيار 22 Nov تلقائيًا بعد تغير نسخة الخادم.

## 12. هذا الأسبوع — Week
Week مساحة التخطيط التنفيذي للأسبوع وتحتوي Inbox وSoon وThis Week وIcebox.
| Bucket | الاستخدام |
|---|---|
| Inbox | شيء لم يُفرز بعد |
| Soon | قريب لكن ليس ضمن التنفيذ الحالي |
| This Week | التزام هذا الأسبوع |
| Icebox | مؤجل أو غير نشط حاليًا |
مثال: إعداد Content Brief إذا كان التزام هذا الأسبوع يصبح This Week؛ فكرة غير مفروزة Inbox؛ شيء مؤكد لاحقًا Soon؛ شيء جمدته Icebox.

## 13. تغيير Bucket
يمكن نقل Task من عمود لآخر، وهذا يغير planning_bucket فعليًا وليس بصريًا فقط. الصلاحية المطلوبة task.write على المشروع.

## 14. Workload في Week
يحسب عدد المهام والـestimated minutes للمستخدم أو للفريق. مثال: 8 مهام و1,240 دقيقة تعني المدة المقدرة للمهام المخططة، وليست وعدًا بأن كل الوقت سينفذ فعليًا.

## 15. اكتشافات قيد العمل
Week تعرض Discovery التي حالتها Working On وتفلترها حسب الشخص عند اختيار عضو. هذا يربط الاكتشاف النشط بإيقاع التنفيذ بدل عزله في قسم منفصل.

## 16. إنجازات الأسبوع
تعرض Wins المسجلة في الأسبوع وTasks المكتملة خلال الأسبوع. لذلك إنجاز الأسبوع ليس Win فقط؛ قد يظهر Task مكتمل مثل تنفيذ API.

## 17. عملي — My Work
My Work غلاف موحد لثلاثة مستويات: اليوم، هذا الأسبوع، كل المهام. ويعرض Preview من المهام الحالية. إذا كان سؤالك فقط ماذا عليّ أن أفعل، ابدأ من My Work.

## 18. المهام — Tasks
Tasks هي شاشة إدارة المهام الكاملة، ويمكن تغيير العرض إلى List وBoard وTable وCalendar وTimeline.

## 19. الفلاتر
يمكن التصفية بواسطة الشخص والمشروع والحالة وBlocked والبحث النصي وActive Projects Only. مثال: كل المهام المفتوحة في Projects v5 التي تخص مصطفى ومتعطلة = Person مصطفى + Project Projects v5 + Status Open + Blocked true.

## 20. الحالات
من جدول Tasks يمكن تغيير Not Started وIn Progress وOn Hold وCompleted وCancelled. عند Completed يتم تسجيل completed_at وcompleted_by.

## 21. Bulk Actions
يمكن تحديد عدة Tasks ثم إكمالها أو بدءها أو تعليقها. العملية الحالية تستخدم المسار الذري الجماعي، لذلك لا نعتبر نجاح واجهة الاختيار وحده دليلًا على الحفظ.

## 22. Inline Editing
في Table يمكن تعديل اسم المهمة بالنقر المزدوج عند وجود صلاحية الكتابة، كما يمكن تغيير status وpriority وdue_date من الجدول.

## 23. Portfolio
Portfolio ليست نسخة من Projects؛ هي طبقة مقارنة ومراقبة عبر جميع المشاريع. تعرض Project وHealth وProgress وTarget وRemaining وLead وTeam وPriority وFinance وIssues وRisks.

## 24. حالات Portfolio
يمكن اختيار Active وCompleted وArchived وAll. Active تعني المشاريع غير المكتملة وغير الملغاة وغير المؤرشفة. Completed تعني المشاريع المكتملة غير المؤرشفة. Archived تعني المؤرشفة.

## 25. البحث
البحث يشمل ID وname وdescription وfinal_goal. مثال: البحث عن Content قد يظهر مشروعًا يحتوي الاسم أو الوصف أو الهدف النهائي على Content.

## 26. Portfolio Filters
يمكن الفلترة حسب Type وHealth وLead وTeam وPriority وVisibility وTarget date from/to وHigh Risk وFinance link.
مثال: كل المشاريع Red أو Orange ذات مخاطر عالية وموعدها خلال الشهر = Health + High Risk + Date From + Date To.

## 27. Finance Filter
Portfolio يستطيع قراءة Finance project sync. حالات الربط الحالية تشمل: مرتبط، غير مرتبط، أكثر من ملف، اختلاف عملة، الملف الأساسي غير موجود، بيانات قديمة، خطأ، ولا توجد صلاحية.
مثال: Project budget_currency = EGP وFinance currency = USD ينتج Finance: اختلاف عملة USD/EGP.

## 28. Saved Views
Portfolio يمكنه حفظ طريقة العرض، بما في ذلك query وstatus وmode والفلاتر والأعمدة وترتيبها وFinance filter وRisk filter. يمكن حفظها Personal أو Workspace. مشاركة Workspace متاحة للـOwner/Admin حسب التنفيذ الحالي.
مثال: احفظ Executive Risk Review لتستعيد Health = Red وHigh Risk = true ونطاق التاريخ بدل إعادة ضبطها كل مرة.

## 29. أعمدة Portfolio
الأعمدة الحالية تشمل project وstatus وhealth وprogress وtarget وremaining وlead وteam وpriority وfinance وissues وrisks. ويمكن تغيير ترتيبها.

## 30. Calendar داخل Portfolio
Calendar يعرض أحداثًا من Project start date وProject target date وMilestones وTask due dates وPRD target ship dates وFinal Output approval وKnowledge meetings. لذلك هو صورة زمنية للمشروع وليس Calendar Tasks فقط.

## 31. العلاقة بين الشاشات
لا توجد نسخة مستقلة من البيانات لكل شاشة. السجل canonical نفسه يظهر في Dashboard وToday وWeek وMy Work وTasks وPortfolio وProject Workspace وTask Sheet وCalendar وTimeline بحسب السياق.
مثال Task واحد قد يظهر في Dashboard كمتأخر، وفي Today كموعد اليوم، وفي Week داخل This Week، وفي My Work، وفي Tasks، وفي Project Workspace، وفي Calendar، وفي Timeline. هذه كلها نفس Task ID.

## 32. سيناريو يومي كامل
09:00 افتح Today وتجد مراجعة Content Brief. 09:10 تلاحظ Notification بأن Risk أصبح High وتفتحه. 09:20 تنشئ Mitigation Task باسم Prepare Mock API. 11:00 تنقل المهمة من Inbox إلى This Week. 14:00 تنهيها فتتحول إلى Completed. 17:00 تفتح Portfolio فتلاحظ تغير Progress. نهاية الأسبوع تسجل Weekly Review ثم Win إذا كان الإنجاز يستحق التسجيل.

## 33. القاعدة التشغيلية
| السؤال | الشاشة |
|---|---|
| ماذا أفعل الآن؟ | Today / My Work |
| ماذا سأفعل هذا الأسبوع؟ | Week |
| أين كل مهامي؟ | Tasks |
| أين تقف كل مشاريعي؟ | Portfolio |
| ما صحة المشاريع ولماذا؟ | Dashboard |
| ما تفاصيل مشروع واحد؟ | Project Workspace |
| ما تفاصيل مهمة واحدة؟ | Task Sheet |

## 34. لا تخلط بين الطبقات
Dashboard = مراقبة. Today = تنفيذ اليوم. Week = تخطيط الأسبوع. My Work = بوابة عملي. Tasks = إدارة المهام. Portfolio = إدارة المحفظة. Project Workspace = تشغيل مشروع واحد. Task Sheet = تشغيل مهمة واحدة.