// Demo seed for Projects OS — realistic data relative to "today" (nothing touches the database).
import { addDays } from "../../core/dates.js";

export function buildSeed({ me, ownerId, members, today }) {
  const owner = ownerId || me; const sara = (members && members[0]) || owner; const layla = (members && members[1]) || owner;
  const d = (n) => addDays(today, n); const ts = (n, h = 10) => addDays(today, n) + "T" + String(h).padStart(2, "0") + ":00:00.000Z";
  let order = 0; const T = (id, project_id, title, o = {}) => ({ id, project_id, title, status: "Not Started", priority: "Medium", planning_bucket: "Inbox", sort_order: ++order, parent_task_id: null, created_by: owner, ...o });
  const projects = [
    { id: "proj_general", name: "عام (General)", is_system: true, type: "أخرى", status: "In Progress", priority: "Low", visibility: "workspace", members: [], description: "مشروع النظام للمهام بلا مشروع." },
    { id: "p_app", name: "تطبيق إدارة الوقت", type: "تطبيق", status: "In Progress", priority: "High", start_date: d(-40), target_date: d(18), lead_id: owner, members: [{ member_id: owner, role: "Lead" }, { member_id: sara, role: "Contributor" }, { member_id: layla, role: "Stakeholder" }], visibility: "workspace", final_goal: "إطلاق نسخة تجريبية لـ 100 مستخدم", description: "تطبيق موبايل لتتبع الوقت بالمؤقّت والتقارير.", budget_planned: 50000, budget_currency: "EGP", created_by: owner },
    { id: "p_launch", name: "حملة إطلاق المتجر", type: "براند", status: "In Progress", priority: "Urgent", start_date: d(-20), target_date: d(-2), lead_id: sara, members: [{ member_id: sara, role: "Lead" }, { member_id: owner, role: "Reviewer" }], visibility: "workspace", final_goal: "مبيعات أول أسبوع 200 طلب", created_by: owner },
    { id: "p_site", name: "تحديث الموقع", type: "محتوى", status: "On Hold", priority: "Medium", start_date: d(-60), target_date: d(40), lead_id: owner, members: [{ member_id: owner, role: "Lead" }], visibility: "workspace", created_by: owner },
    { id: "p_coffee", name: "براند القهوة المختصة", type: "براند", status: "Idea", priority: "Low", lead_id: owner, members: [{ member_id: owner, role: "Lead" }], visibility: "workspace", description: "فكرة لعلامة قهوة مختصة.", created_by: owner },
    { id: "p_done", name: "هوية الشركة الجديدة", type: "براند", status: "Completed", priority: "Medium", start_date: d(-120), target_date: d(-30), lead_id: owner, members: [{ member_id: owner, role: "Lead" }], visibility: "workspace", completed_at: ts(-28), created_by: owner },
  ];
  const tasks = [
    T("t_design", "p_app", "التصميم", { sort_order: 1 }),
    T("t_wire", "p_app", "Wireframes", { parent_task_id: "t_design", status: "Completed", assignee_id: sara, estimated_minutes: 480, completed_at: ts(-30), due_date: d(-32), planning_bucket: "This Week" }),
    T("t_ui", "p_app", "تصميم الواجهات", { parent_task_id: "t_design", status: "Completed", assignee_id: sara, estimated_minutes: 960, completed_at: ts(-12), due_date: d(-14) }),
    T("t_proto", "p_app", "نموذج تفاعلي", { parent_task_id: "t_design", status: "In Progress", assignee_id: sara, estimated_minutes: 480, due_date: d(2), planning_bucket: "This Week", prd_id: "prd_app" }),
    T("t_dev", "p_app", "التطوير", {}),
    T("t_arch", "p_app", "الهيكل والبنية", { parent_task_id: "t_dev", status: "Completed", assignee_id: owner, estimated_minutes: 960, completed_at: ts(-20), due_date: d(-22), prd_id: "prd_app" }),
    T("t_core", "p_app", "الميزات الأساسية", { parent_task_id: "t_dev", status: "In Progress", assignee_id: owner, estimated_minutes: 2400, due_date: d(7), planning_bucket: "This Week", prd_id: "prd_app" }),
    T("t_timer", "p_app", "مؤقّت العمل", { parent_task_id: "t_core", status: "In Progress", assignee_id: owner, estimated_minutes: 600, due_date: d(3), planning_bucket: "This Week", prd_id: "prd_app" }),
    T("t_reports", "p_app", "تقارير الوقت", { parent_task_id: "t_core", assignee_id: owner, estimated_minutes: 900, due_date: d(-1), planning_bucket: "This Week", prd_id: "prd_app" }),
    T("t_sync", "p_app", "المزامنة بين الأجهزة", { parent_task_id: "t_dev", assignee_id: owner, estimated_minutes: 720, due_date: d(12), planning_bucket: "Soon", blocked: true, blocked_reason: "بانتظار قرار قاعدة البيانات" }),
    T("t_test", "p_app", "اختبار Beta", { assignee_id: layla, estimated_minutes: 720, due_date: d(15), planning_bucket: "Soon" }),
    T("t_store", "p_app", "نشر المتجر", { assignee_id: owner, due_date: d(17), planning_bucket: "Inbox", discovery_ids: ["d_store"] }),
    T("t_ads", "p_launch", "إعلانات الإطلاق", {}),
    T("t_ad1", "p_launch", "تصميم المواد الإعلانية", { parent_task_id: "t_ads", status: "Completed", assignee_id: sara, estimated_minutes: 360, completed_at: ts(-6), due_date: d(-8) }),
    T("t_ad2", "p_launch", "جدولة الحملة", { parent_task_id: "t_ads", status: "In Progress", assignee_id: sara, estimated_minutes: 120, due_date: d(-3), planning_bucket: "This Week" }),
    T("t_ship", "p_launch", "اتفاقية الشحن مع المورد", { assignee_id: sara, due_date: d(1), planning_bucket: "This Week", estimated_minutes: 180 }),
    T("t_photos", "p_launch", "تصوير المنتجات", { status: "Cancelled", cancelled_reason: "استُبدل بصور المورد", assignee_id: sara }),
    T("t_dns", "p_site", "نقل النطاق", { assignee_id: owner, planning_bucket: "Icebox", due_date: d(-20) }),
    T("t_copy", "p_site", "إعادة كتابة صفحة المنتجات", { assignee_id: owner, planning_bucket: "Icebox" }),
    T("t_logo", "p_done", "الشعار النهائي", { status: "Completed", assignee_id: owner, completed_at: ts(-40) }),
    T("t_guide", "p_done", "دليل الهوية", { status: "Completed", assignee_id: owner, completed_at: ts(-31) }),
    T("t_gen1", "proj_general", "تجديد اشتراك الاستضافة", { assignee_id: owner, due_date: today, planning_bucket: "This Week", estimated_minutes: 30 }),
    T("t_gen2", "proj_general", "مراجعة البريد المتراكم", { assignee_id: owner, planning_bucket: "Inbox" }),
  ];
  const sessions = [
    { id: "ses_1", member_id: owner, task_id: "t_arch", date: d(-25), minutes: 540, source: "manual", note: "الإعداد الأولي" }, { id: "ses_2", member_id: owner, task_id: "t_arch", date: d(-23), minutes: 480, source: "manual" },
    { id: "ses_3", member_id: owner, task_id: "t_timer", date: d(-2), minutes: 150, source: "timer", started_at: ts(-2, 9), ended_at: ts(-2, 11) }, { id: "ses_4", member_id: owner, task_id: "t_timer", date: d(-1), minutes: 95, source: "manual" },
    { id: "ses_5", member_id: sara, task_id: "t_ui", date: d(-15), minutes: 600, source: "manual" }, { id: "ses_6", member_id: sara, task_id: "t_proto", date: d(-1), minutes: 200, source: "manual" }, { id: "ses_7", member_id: sara, task_id: "t_ad1", date: d(-8), minutes: 420, source: "manual" },
  ];
  const outputs = [
    { id: "o_wire", name: "Wireframes — الإصدار النهائي", project_id: "p_app", task_id: "t_wire", type: "Design", approval: "Final", url: "https://example.com/wireframes", approved_by: owner, approved_at: ts(-29) },
    { id: "o_ui", name: "حزمة الواجهات", project_id: "p_app", task_id: "t_ui", type: "Design", approval: "Review", url: "https://example.com/ui" },
    { id: "o_arch", name: "وثيقة البنية التقنية", project_id: "p_app", task_id: "t_arch", type: "Document", approval: "Final", notes: "ملف داخلي", approved_by: owner, approved_at: ts(-19) },
    { id: "o_ads", name: "مواد الحملة", project_id: "p_launch", task_id: "t_ad1", type: "Design", approval: "Draft" },
  ];
  const prds = [
    { id: "prd_app", title: "مواصفة تطبيق إدارة الوقت", project_id: "p_app", status: "Approved", version: 1, lead_id: owner, tldr: "تطبيق يتتبع وقت العمل بدقة ويُنتج تقارير فورية.", target_ship_date: d(18), reviewer_ids: [sara], approvals: [{ reviewer_id: sara, decision: "approve", version: 1, at: ts(-35), comment: "ممتاز" }], approved_at: ts(-35), kr_ids: ["kr_users"], discovery_ids: ["d_timer"], sections: [{ key: "problem_overview", title: "نظرة عامة", group: "المشكلة", content: "الفرق لا تعرف أين يذهب وقتها." }, { key: "proposed_solution", title: "الحل المقترح (ملخص)", group: "المشكلة", content: "مؤقّت بنقرة واحدة وتقارير أسبوعية." }, { key: "success_metrics", title: "مقاييس النجاح", group: "الأهداف والنجاح", content: "100 مستخدم نشط في 30 يوماً." }, { key: "risk_mitigation", title: "المخاطر وخطط التخفيف", group: "تخفيف المخاطر", content: "تأخر المزامنة — إصدار بلا مزامنة أولاً" }] },
    { id: "prd_launch", title: "خطة إطلاق المتجر", project_id: "p_launch", status: "In Progress", version: 1, lead_id: sara, tldr: "", reviewer_ids: [owner], approvals: [], sections: [{ key: "problem_overview", title: "نظرة عامة", group: "المشكلة", content: "نحتاج جمهوراً عند الإطلاق." }] },
  ];
  const discovery = [
    { id: "d_timer", title: "الفرق لا تعرف أين يذهب وقتها", type: "Problem", status: "Completed", impact_level: "High", project_ids: ["p_app"], owner_id: owner, logged_at: d(-70), description: "ظهرت في 6 مقابلات.", resolution_links: [{ kind: "prd", id: "prd_app" }] },
    { id: "d_store", title: "ظهور التطبيق في نتائج المتجر", type: "Opportunity", status: "Working On", impact_level: "Medium", project_ids: ["p_app"], owner_id: owner, logged_at: d(-10) },
    { id: "d_widget", title: "ودجت للشاشة الرئيسية", type: "Idea", status: "Prioritized", impact_level: "Low", project_ids: ["p_app"], logged_at: d(-8) },
    { id: "d_dark", title: "وضع داكن", type: "Idea", status: "Inbox", logged_at: d(-25), description: "طلب متكرر" },
    { id: "d_ai", title: "اقتراحات ذكية للمهام", type: "Idea", status: "Inbox", logged_at: d(-3) },
    { id: "d_old", title: "نسخة سطح المكتب", type: "Idea", status: "Dropped", dropped_reason: "خارج نطاق هذا العام", logged_at: d(-90) },
  ];
  const risks = [
    { id: "r_sync", title: "تعقيد المزامنة بين الأجهزة", project_id: "p_app", probability: 4, impact: 5, status: "Open", owner_id: owner, mitigation: "إصدار أول بلا مزامنة، ثم تدريجي", review_date: d(7) },
    { id: "r_store", title: "رفض المتجر للتطبيق", project_id: "p_app", probability: 2, impact: 4, status: "In Mitigation", owner_id: owner, mitigation: "مراجعة الإرشادات مبكراً" },
    { id: "r_supplier", title: "تأخر المورد", project_id: "p_launch", probability: 3, impact: 4, status: "Open", owner_id: sara, mitigation: "مورد بديل" },
    { id: "r_budget", title: "تجاوز الميزانية", project_id: "p_launch", probability: 2, impact: 2, status: "Closed", closed_reason: "ثُبّتت الميزانية" },
  ];
  const issues = [
    { id: "i_crash", title: "توقف التطبيق عند فتح التقارير على Android", project_id: "p_app", severity: "Critical", status: "Open", owner_id: owner, discovered_at: d(-2), description: "يحدث على الأجهزة القديمة." },
    { id: "i_ads", title: "رفض الإعلان بسبب النص", project_id: "p_launch", severity: "Medium", status: "In Progress", owner_id: sara, discovered_at: d(-4) },
    { id: "i_font", title: "خط غير مدعوم في الواجهة", project_id: "p_app", severity: "Low", status: "Resolved", resolution: "استُبدل بخط نظام", owner_id: sara, discovered_at: d(-20), resolved_at: ts(-18) },
  ];
  const decisions = [
    { id: "dec_db", title: "اعتماد Supabase كقاعدة بيانات", project_id: "p_app", status: "Approved", decided_at: d(-45), decision_maker_id: owner, rationale: "سرعة التطوير وRLS جاهز", rejected_alternatives: "Firebase، خادم مخصّص" },
    { id: "dec_sync", title: "المزامنة بعد الإصدار الأول", project_id: "p_app", status: "Proposed", decided_at: d(-1), decision_maker_id: owner, rationale: "تقليل المخاطر" },
  ];
  const contacts = [
    { id: "c_inv", name: "ليلى المنصور", role: "مستثمر", organization: "Nile Ventures", email: "layla@nile.vc", last_contact_at: d(-70), follow_up_date: d(-2), project_ids: ["p_app"] },
    { id: "c_sup", name: "هاني المورّد", role: "مورّد", organization: "Delta Supplies", phone: "+20 100 000 0000", last_contact_at: d(-5), project_ids: ["p_launch"] },
    { id: "c_mentor", name: "د. سامح", role: "مرشد", last_contact_at: d(-40) },
    { id: "c_new", name: "جهة جديدة", role: "شريك" },
  ];
  const objectives = [{ id: "ob_q", name: "إطلاق منتج ناجح هذا الربع", why: "نريد دخول السوق بقوة", status: "Active", owner_id: owner, period_start: d(-45), period_end: d(45), created_by: owner }];
  const krs = [
    { id: "kr_users", objective_id: "ob_q", name: "الوصول إلى 100 مستخدم نشط", type: "Numeric", unit: "مستخدم", initial_value: 0, target_value: 100, current_value: 38, owner_id: owner },
    { id: "kr_proj", objective_id: "ob_q", name: "إكمال مشروعَي الإطلاق", type: "Project Based", project_ids: ["p_app", "p_launch"], owner_id: owner },
  ];
  const checkins = [{ id: "ck1", kr_id: "kr_users", member_id: owner, value: 12, note: "الدفعة الأولى", checked_at: ts(-20) }, { id: "ck2", kr_id: "kr_users", member_id: owner, value: 38, note: "بعد الحملة", checked_at: ts(-9) }];
  const wins = [
    { id: "w1", title: "اعتماد المواصفة من الفريق", achieved_on: d(-35), member_id: owner, project_id: "p_app", visibility: "team" }, { id: "w2", title: "إغلاق تصميم الواجهات", achieved_on: d(-12), member_id: sara, project_id: "p_app", task_id: "t_ui" },
    { id: "w3", title: "جدولة حملة الإعلانات", achieved_on: d(-1), member_id: sara, project_id: "p_launch" },
  ];
  const updates = [
    { id: "u1", title: "تحديث الإدارة — تطبيق إدارة الوقت", project_id: "p_app", audience: "Management", status: "Published", period_start: d(-28), period_end: d(-14), published_at: ts(-14), lead_assessment: "On Track", author_id: owner, sections: { highlights: "• اعتماد المواصفة\n• إنهاء التصميم", lows: "• تأخر طفيف في الهيكل", metrics: "التقدم 35%", asks: "الموافقة على ميزانية الاختبار", next: "بدء الميزات الأساسية" }, snapshot: { progress: 0.35, health: "Green", leafCompleted: 3, leafTotal: 9, openRisks: 2, openIssues: 0, actualMinutes: 1500, at: ts(-14) } },
    { id: "u2", title: "تحديث أسبوعي — حملة الإطلاق", project_id: "p_launch", audience: "Team", status: "Draft", period_start: d(-14), period_end: today, lead_assessment: "At Risk", author_id: sara, sections: { highlights: "• جدولة الحملة", lows: "• تأخر المورد", metrics: "", asks: "", next: "" } },
  ];
  const reviews = [{ id: "rev_" + sara + "_" + addDays(today, -7), member_id: sara, week_start: addDays(today, -7), status: "Closed", visibility: "team", rating: 4, energy: "Medium", what_worked: "التركيز على التصميم", what_stumbled: "التنقل بين المهام", learned: "الجدولة المسبقة تساعد", will_change: "تخصيص أوقات للتركيز", next_week_focus: "الحملة", snapshot: { wins: ["إغلاق تصميم الواجهات"], doneTasks: [], minutes: 1200, overdueCount: 1, redProjects: 1, checkins: 0, at: ts(-1) } }];
  const teams = [{ id: "tm1", name: "فريق المنتج", lead_id: owner, member_ids: [owner, sara] }];
  const profiles = [{ id: "prof_" + owner, member_id: owner, job_title: "مؤسس", employment: "Full-time", weekly_capacity_hours: 40 }, { id: "prof_" + sara, member_id: sara, job_title: "مصممة منتج", employment: "Full-time", weekly_capacity_hours: 35 }];
  const activity = [{ id: "a1", entity: "projects", entity_id: "p_app", action: "status", summary: "Planned → In Progress", actor_id: owner, at: ts(-38) }];
  return { projects, tasks, sessions, outputs, prds, discovery, risks, issues, decisions, contacts, objectives, krs, checkins, wins, updates, reviews, teams, profiles, activity };
}
