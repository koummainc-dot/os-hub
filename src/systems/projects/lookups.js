// Projects OS — vocabularies (Arabic labels), built-in templates (plan §11) and lookup defaults.
export const L = {
  projectStatus: { Idea: "فكرة", Planned: "مخطَّط", "In Progress": "قيد التنفيذ", "On Hold": "متوقف", Completed: "مكتمل", Cancelled: "ملغى", Archived: "مؤرشف" },
  taskStatus: { "Not Started": "لم تبدأ", "In Progress": "جارية", Completed: "مكتملة", Cancelled: "ملغاة" },
  priority: { Low: "منخفضة", Medium: "متوسطة", High: "عالية", Urgent: "عاجلة" },
  bucket: { Inbox: "الوارد", Soon: "قريباً", "This Week": "هذا الأسبوع", Icebox: "الثلاجة" },
  riskStatus: { Open: "مفتوح", "In Mitigation": "قيد التخفيف", Closed: "مغلق", Materialized: "تحقق" },
  issueStatus: { Open: "مفتوحة", "In Progress": "قيد الحل", Resolved: "محلولة", Closed: "مغلقة" },
  severity: { Low: "منخفضة", Medium: "متوسطة", High: "عالية", Critical: "حرجة" },
  decisionStatus: { Proposed: "مقترح", Approved: "معتمد", Cancelled: "ملغى", Superseded: "حلّ محله قرار آخر" },
  discoveryType: { Problem: "مشكلة محتملة (اكتشاف)", Idea: "فكرة", Opportunity: "فرصة" },
  discoveryStatus: { Inbox: "الوارد", Prioritized: "مُرتَّب", "Working On": "قيد العمل", Completed: "مكتمل", Icebox: "الثلاجة", Dropped: "مُسقَط" },
  prdStatus: { "Not Started": "لم يبدأ", "In Progress": "قيد الكتابة", "Ready for Review": "جاهز للمراجعة", Approved: "معتمد", Superseded: "تم استبداله" },
  approval: { Draft: "مسودة", Review: "مراجعة", Final: "نهائي" },
  objectiveStatus: { Active: "نشط", Achieved: "تحقق", Paused: "متوقف", Cancelled: "ملغى" },
  krType: { Numeric: "رقمية", "Project Based": "مبنية على مشاريع" },
  energy: { High: "عالية", Medium: "متوسطة", Low: "منخفضة" },
  visibility: { workspace: "مفتوح للـ Workspace", private: "خاص بأعضاء المشروع" },
  memberRole: { Lead: "قائد", Contributor: "مساهم", Reviewer: "مراجع", Stakeholder: "صاحب مصلحة" },
  updateType: { Investor: "مستثمر", Client: "عميل", Management: "إدارة", Team: "فريق" },
  assessment: { "On Track": "على المسار", "At Risk": "معرّض للخطر", "Off Track": "خارج المسار" },
  employment: { "Full-time": "دوام كامل", "Part-time": "دوام جزئي", Freelance: "مستقل", Contractor: "متعاقد" },
};
export const opts = (map) => Object.entries(map).map(([v, l]) => ({ v, l }));
export const PRIORITY_COLOR = { Low: "#94A3B8", Medium: "#3B82F6", High: "#F97316", Urgent: "#EF4444" };
export const STATUS_COLOR = { Idea: "#94A3B8", Planned: "#6366F1", "In Progress": "#3B82F6", "On Hold": "#F59E0B", Completed: "#10B981", Cancelled: "#EF4444", Archived: "#64748B", "Not Started": "#94A3B8", Resolved: "#10B981", Closed: "#64748B", Open: "#F59E0B", "In Mitigation": "#3B82F6", Materialized: "#EF4444" };
export const SEV_COLOR = { Low: "#94A3B8", Medium: "#F59E0B", High: "#F97316", Critical: "#EF4444" };

export const DEFAULT_LOOKUPS = {
  project_type: ["تطبيق", "براند", "متجر", "محتوى", "عمل", "أخرى"],
  contact_role: ["تقني", "مستثمر", "مورّد", "شريك", "عميل", "زميل", "مرشد", "جهة رسمية"],
  output_type: ["Design", "Code", "Document", "Sample", "Video", "Other"],
  meeting_type: ["Daily Standup", "Weekly Sync", "Sprint Planning", "Post-mortem", "Ad Hoc"],
};
export const LOOKUP_LABEL = { project_type: "أنواع المشاريع", contact_role: "أدوار جهات الاتصال", output_type: "أنواع المخرجات", meeting_type: "أنواع الاجتماعات (للمرجع)" };

// PRD template: 6 groups / 10 sections (plan §11.1)
export const PRD_TEMPLATE = [
  { key: "background", group: "الخلفية", title: "الخلفية", hint: "ما يحتاجه القارئ ليفهم المشكلة والحل والهدف والأثر." },
  { key: "problem_overview", group: "المشكلة", title: "نظرة عامة", hint: "ماذا نحل؟ لماذا الآن؟ كيف يرتبط بالأهداف؟ حجم الأثر؟", required: true },
  { key: "evidence", group: "المشكلة", title: "الأدلة", hint: "بيانات / أبحاث / مقابلات." },
  { key: "proposed_solution", group: "المشكلة", title: "الحل المقترح (ملخص)", hint: "", required: true },
  { key: "success_definition", group: "الأهداف والنجاح", title: "تعريف النجاح", hint: "" },
  { key: "success_metrics", group: "الأهداف والنجاح", title: "مقاييس النجاح", hint: "القيمة الحالية + المستهدفة + سبب الاختيار — تُربط بالنتائج الرئيسية (KRs).", required: true },
  { key: "key_features", group: "الحل", title: "المزايا الرئيسية", hint: "" },
  { key: "user_journeys", group: "الحل", title: "رحلات المستخدم الأساسية", hint: "روابط التصميم / النموذج." },
  { key: "risk_mitigation", group: "تخفيف المخاطر", title: "المخاطر وخطط التخفيف", hint: "اكتب كل خطر في سطر بصيغة: الخطر — خطة التخفيف. يمكنك تحويلها إلى سجلات مخاطر." },
  { key: "launch", group: "الإطلاق والتوسع", title: "خطة الإطلاق", hint: "الجمهور، من يدعم، الرسالة." },
];
export const UPDATE_SECTIONS = [
  { key: "asks", title: "الطلبات (Asks)" }, { key: "metrics", title: "الأرقام الرئيسية" }, { key: "lows", title: "الصعوبات (Lows)" },
  { key: "highlights", title: "أبرز الإنجازات (Highlights)" }, { key: "next", title: "ماذا نتوقع في الفترة القادمة" },
];
export const MEETING_TEMPLATES = [
  { name: "Daily Standup", sections: ["ماذا أنجزنا أمس؟", "ماذا سننجز اليوم؟", "عوائق محتملة؟", "Action Items"] },
  { name: "Weekly Sync", sections: ["ماذا حدث الأسبوع الماضي؟", "ماذا نعمل هذا الأسبوع؟", "عوائق؟", "Action Items"] },
  { name: "Sprint Planning", sections: ["هدف الدورة", "Backlog الملتزم به", "الفريق والأدوار", "ملاحظات"] },
  { name: "Post-mortem", sections: ["الأثر على المستخدم", "الجدول الزمني", "المقاييس", "تحليل السبب", "الحل وما نجح/ما يُحسَّن", "أعمال مستقبلية", "Action Items"] },
  { name: "Ad Hoc", sections: ["الأجندة", "الملاحظات", "القرارات", "Action Items"] },
];

const n = (title, offset, est, children, extra) => ({ title, offset_days: offset, estimate_minutes: est, children, ...(extra || {}) });
export const BUILTIN_TEMPLATES = [
  { id: "tpl_app", builtin: true, name: "تطبيق", project_type: "تطبيق", duration_days: 120, description: "اكتشاف ← مواصفة ← تصميم ← تطوير ← اختبار ← إطلاق ← ما بعد الإطلاق",
    task_tree: [
      n("الاكتشاف", 14, null, [n("مقابلات المستخدمين", 7, 240), n("تحليل المنافسين", 10, 180), n("تحديد المشكلة والفرصة", 14, 120)]),
      n("كتابة المواصفة (PRD)", 21, 480, [n("مسودة PRD", 18, 360), n("مراجعة واعتماد", 21, 120)]),
      n("التصميم", 45, null, [n("Wireframes", 30, 480), n("تصميم الواجهات", 40, 960), n("نموذج تفاعلي", 45, 480)]),
      n("التطوير", 90, null, [n("الهيكل والبنية", 55, 960), n("الميزات الأساسية", 75, 2400), n("الربط والتكاملات", 85, 960), n("الأداء والأمان", 90, 480)]),
      n("الاختبار", 105, null, [n("اختبار داخلي", 98, 480), n("اختبار مستخدمين (Beta)", 105, 720), n("إصلاح الأخطاء", 108, 720)]),
      n("الإطلاق", 118, null, [n("متجر التطبيقات والتسويق", 112, 360), n("خطة الإطلاق", 115, 240), n("الإطلاق", 118, 120)]),
      n("ما بعد الإطلاق", 120, null, [n("مراقبة المقاييس", 120, 120), n("تجميع الملاحظات", 120, 120)]),
    ],
    risks: [{ title: "تأخر التطوير عن الجدول", probability: 3, impact: 4, mitigation: "تقسيم النطاق وإصدار MVP أولاً" }, { title: "ضعف تبنّي المستخدمين", probability: 3, impact: 5, mitigation: "اختبار مبكر مع مستخدمين حقيقيين" }],
    prd_templates: [{ title: "مواصفة المنتج والتطبيق", tldr: "تعريف المشكلة والمستخدمين والنطاق ومعايير النجاح", requirements: [
      { title: "المشكلة ونتائج النجاح", acceptance_criteria: "مشكلة واضحة، شريحة مستخدمين، ومقياس نجاح قابل للقياس.", task_title: "تحديد المشكلة والفرصة" },
      { title: "تجربة المستخدم والتصميم", acceptance_criteria: "تدفق أساسي ونموذج واجهة تمت مراجعته.", task_title: "تصميم الواجهات" },
      { title: "الميزات الأساسية", acceptance_criteria: "تعمل الوظائف الأساسية وفق معايير قبول متفق عليها.", task_title: "الميزات الأساسية" },
      { title: "الأداء والأمان", acceptance_criteria: "اجتياز قائمة فحص الأداء والأمان دون مانع حرج.", task_title: "الأداء والأمان" }
    ] }],
    output_templates: [
      { name: "مواصفة منتج معتمدة", type: "Document", task_title: "مراجعة واعتماد", prd_title: "مواصفة المنتج والتطبيق", requirement_title: "المشكلة ونتائج النجاح" },
      { name: "نموذج واجهات تفاعلي", type: "Design", task_title: "نموذج تفاعلي", prd_title: "مواصفة المنتج والتطبيق", requirement_title: "تجربة المستخدم والتصميم" },
      { name: "نسخة تجريبية قابلة للاختبار", type: "Code", task_title: "اختبار مستخدمين (Beta)", prd_title: "مواصفة المنتج والتطبيق", requirement_title: "الميزات الأساسية" },
      { name: "نسخة الإطلاق", type: "Code", task_title: "الإطلاق" },
      { name: "تقرير نتائج ما بعد الإطلاق", type: "Document", task_title: "مراقبة المقاييس" }
    ],
    decision_prompts: ["ما الحد الأدنى القابل للإطلاق MVP؟", "ما نموذج الصلاحيات والخصوصية؟", "ما المنصات والتكاملات الداخلة في النطاق؟", "ما معيار قبول الإطلاق؟"],
    team_roles: ["مالك المنتج", "مصمم تجربة المستخدم", "قائد تقني", "مطور الواجهة", "مطور الخلفية", "مسؤول الاختبار والجودة"],
    checklist: ["اعتماد المشكلة وشريحة المستخدمين", "اعتماد نطاق MVP", "مراجعة الخصوصية والأمان", "اعتماد معايير قبول كل متطلب", "مراجعة جاهزية الإطلاق", "تحديد مقاييس ما بعد الإطلاق"]
  },
  { id: "tpl_content", builtin: true, name: "محتوى", project_type: "محتوى", duration_days: 30, description: "فكرة ← سيناريو ← إنتاج ← مراجعة ← نشر ← قياس",
    task_tree: [n("الفكرة والبحث", 3, 120), n("السيناريو", 7, 240, [n("المسودة الأولى", 5, 180), n("المراجعة", 7, 60)]), n("الإنتاج", 16, null, [n("التصوير/الكتابة", 12, 480), n("المونتاج/التحرير", 16, 360)]), n("المراجعة", 20, 120), n("النشر", 22, 60), n("القياس والتعلّم", 30, 90)],
    risks: [{ title: "عدم الالتزام بالموعد المعلن", probability: 2, impact: 3, mitigation: "مخزون محتوى جاهز" }],
    prd_templates: [{ title: "مواصفة المحتوى", tldr: "الجمهور والرسالة والمنصة وجودة المادة ومقياس الأداء", requirements: [
      { title: "الفكرة والجمهور", acceptance_criteria: "فكرة واضحة وجمهور محدد وزاوية مختلفة.", task_title: "الفكرة والبحث" },
      { title: "السيناريو والرسالة", acceptance_criteria: "سيناريو قابل للإنتاج ومراجع وفق هدف المحتوى.", task_title: "المراجعة" },
      { title: "جودة المادة النهائية", acceptance_criteria: "النسخة النهائية متوافقة مع دليل الجودة والمنصة.", task_title: "المونتاج/التحرير" },
      { title: "النشر والقياس", acceptance_criteria: "رابط نشر ومؤشرات أداء أولية موثقة.", task_title: "القياس والتعلّم" }
    ] }],
    output_templates: [
      { name: "ملف بحث الفكرة", type: "Document", task_title: "الفكرة والبحث", prd_title: "مواصفة المحتوى", requirement_title: "الفكرة والجمهور" },
      { name: "سيناريو نهائي", type: "Document", task_title: "المراجعة", prd_title: "مواصفة المحتوى", requirement_title: "السيناريو والرسالة" },
      { name: "المادة المنتجة", type: "Video", task_title: "المونتاج/التحرير", prd_title: "مواصفة المحتوى", requirement_title: "جودة المادة النهائية" },
      { name: "رابط النشر", type: "Other", task_title: "النشر" },
      { name: "تقرير الأداء", type: "Document", task_title: "القياس والتعلّم", prd_title: "مواصفة المحتوى", requirement_title: "النشر والقياس" }
    ],
    decision_prompts: ["ما الهدف الأساسي من المحتوى؟", "من الجمهور المستهدف؟", "ما المنصة والصيغة؟", "ما دعوة الإجراء؟", "ما مؤشرات نجاح المحتوى؟"],
    team_roles: ["كاتب أو معد محتوى", "مقدم أو مصور", "مونتير أو محرر", "مراجع محتوى", "مسؤول نشر وتحليل"],
    checklist: ["تأكيد حقوق المواد والمصادر", "اعتماد النص قبل الإنتاج", "مراجعة الصوت والصورة", "تدقيق العنوان والوصف والصورة المصغرة", "التحقق من الرابط بعد النشر", "تسجيل مؤشرات الأداء"]
  },
  { id: "tpl_brand", builtin: true, name: "متجر / براند", project_type: "براند", duration_days: 150, description: "تسمية ← هوية ← منتجات/عينات ← موردون ← إطلاق ← تشغيل",
    task_tree: [n("التسمية والتسجيل", 14, 240), n("الهوية البصرية", 35, null, [n("الشعار والألوان", 25, 480), n("دليل الهوية", 35, 360)]), n("المنتجات والعينات", 70, null, [n("تحديد المنتجات", 45, 240), n("العينات والاختبار", 70, 720)]), n("الموردون", 90, null, [n("البحث والتفاوض", 80, 480), n("التعاقد", 90, 240)]), n("الإطلاق", 120, null, [n("الموقع/المتجر", 105, 960), n("حملة الإطلاق", 120, 480)]), n("التشغيل", 150, null, [n("الشحن والخدمة", 135, 480), n("المراجعة الأولى", 150, 180)])],
    risks: [{ title: "تأخر الموردين", probability: 4, impact: 4, mitigation: "مورد بديل مؤهل مسبقاً" }, { title: "تجاوز الميزانية", probability: 3, impact: 4, mitigation: "تتبع أسبوعي للتكلفة" }],
    prd_templates: [{ title: "مواصفة العلامة والمنتج", tldr: "الهوية والعرض التجاري وجودة المنتج وتجربة العميل", requirements: [
      { title: "الهوية البصرية", acceptance_criteria: "شعار وألوان واستخدامات معتمدة ودليل هوية.", task_title: "دليل الهوية" },
      { title: "مواصفات المنتجات", acceptance_criteria: "منتجات محددة بمواصفات وسعر مستهدف ومعايير جودة.", task_title: "تحديد المنتجات" },
      { title: "اعتماد العينة", acceptance_criteria: "عينة مجرّبة ومقبولة وفق قائمة جودة.", task_title: "العينات والاختبار" },
      { title: "المتجر وتجربة الشراء", acceptance_criteria: "تجربة شراء وشحن ودفع مختبرة.", task_title: "الموقع/المتجر" }
    ] }],
    output_templates: [
      { name: "دليل الهوية البصرية", type: "Design", task_title: "دليل الهوية", prd_title: "مواصفة العلامة والمنتج", requirement_title: "الهوية البصرية" },
      { name: "كتالوج المنتجات ومواصفاتها", type: "Document", task_title: "تحديد المنتجات", prd_title: "مواصفة العلامة والمنتج", requirement_title: "مواصفات المنتجات" },
      { name: "عينة معتمدة", type: "Sample", task_title: "العينات والاختبار", prd_title: "مواصفة العلامة والمنتج", requirement_title: "اعتماد العينة" },
      { name: "متجر جاهز للشراء", type: "Code", task_title: "الموقع/المتجر", prd_title: "مواصفة العلامة والمنتج", requirement_title: "المتجر وتجربة الشراء" },
      { name: "خطة الإطلاق", type: "Document", task_title: "حملة الإطلاق" }
    ],
    decision_prompts: ["ما وعد العلامة وقيمتها المميزة؟", "ما نطاق التشكيلة الأولى؟", "ما سقف التكلفة والهامش المستهدف؟", "ما معايير اختيار المورد؟", "ما سياسة الإرجاع والشحن؟"],
    team_roles: ["مدير علامة تجارية", "مصمم هوية", "مسؤول منتج ومشتريات", "مسؤول موردين", "مسؤول متجر وتسويق", "مسؤول تشغيل وخدمة العملاء"],
    checklist: ["مراجعة توفر الاسم والعلامة", "اعتماد الهوية البصرية", "توثيق مواصفات المنتج", "اختبار العينة", "تأكيد المورد البديل", "اختبار الدفع والشحن والإرجاع", "اعتماد حملة الإطلاق"]
  },
];
export const REVIEW_PROMPTS = [["what_worked", "ما الذي نجح؟"], ["what_stumbled", "ما الذي تعثّر؟"], ["learned", "ما الذي تعلّمته؟"], ["will_change", "ما الذي سأغيّره؟"]];
