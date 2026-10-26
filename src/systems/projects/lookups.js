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
  discoveryType: { Problem: "مشكلة", Idea: "فكرة", Opportunity: "فرصة" },
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
    risks: [{ title: "تأخر التطوير عن الجدول", probability: 3, impact: 4, mitigation: "تقسيم النطاق وإصدار MVP أولاً" }, { title: "ضعف تبنّي المستخدمين", probability: 3, impact: 5, mitigation: "اختبار مبكر مع مستخدمين حقيقيين" }] },
  { id: "tpl_content", builtin: true, name: "محتوى", project_type: "محتوى", duration_days: 30, description: "فكرة ← سيناريو ← إنتاج ← مراجعة ← نشر ← قياس",
    task_tree: [n("الفكرة والبحث", 3, 120), n("السيناريو", 7, 240, [n("المسودة الأولى", 5, 180), n("المراجعة", 7, 60)]), n("الإنتاج", 16, null, [n("التصوير/الكتابة", 12, 480), n("المونتاج/التحرير", 16, 360)]), n("المراجعة", 20, 120), n("النشر", 22, 60), n("القياس والتعلّم", 30, 90)],
    risks: [{ title: "عدم الالتزام بالموعد المعلن", probability: 2, impact: 3, mitigation: "مخزون محتوى جاهز" }] },
  { id: "tpl_brand", builtin: true, name: "متجر / براند", project_type: "براند", duration_days: 150, description: "تسمية ← هوية ← منتجات/عينات ← موردون ← إطلاق ← تشغيل",
    task_tree: [n("التسمية والتسجيل", 14, 240), n("الهوية البصرية", 35, null, [n("الشعار والألوان", 25, 480), n("دليل الهوية", 35, 360)]), n("المنتجات والعينات", 70, null, [n("تحديد المنتجات", 45, 240), n("العينات والاختبار", 70, 720)]), n("الموردون", 90, null, [n("البحث والتفاوض", 80, 480), n("التعاقد", 90, 240)]), n("الإطلاق", 120, null, [n("الموقع/المتجر", 105, 960), n("حملة الإطلاق", 120, 480)]), n("التشغيل", 150, null, [n("الشحن والخدمة", 135, 480), n("المراجعة الأولى", 150, 180)])],
    risks: [{ title: "تأخر الموردين", probability: 4, impact: 4, mitigation: "مورد بديل مؤهل مسبقاً" }, { title: "تجاوز الميزانية", probability: 3, impact: 4, mitigation: "تتبع أسبوعي للتكلفة" }] },
];
export const REVIEW_PROMPTS = [["what_worked", "ما الذي نجح؟"], ["what_stumbled", "ما الذي تعثّر؟"], ["learned", "ما الذي تعلّمته؟"], ["will_change", "ما الذي سأغيّره؟"]];
