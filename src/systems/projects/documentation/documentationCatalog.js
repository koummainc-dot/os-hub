export const DOCUMENTATION_CATALOG = [
  { id:"overview", type:"overview", section:"overview", audience:"all", status:"verified", title:"مركز توثيق Projects OS", summary:"مرجع قابل للتتبع لشاشات Projects وإجراءاتها وحقولها وفلوهاتها وعلاقاتها.", sourceRefs:["src/systems/projects/index.jsx","src/systems/projects/screens_a.jsx","src/systems/projects/screens_b.jsx","src/systems/projects/screens_c.jsx","src/systems/projects/entities.jsx","src/systems/projects/parts.jsx","src/systems/projects/store.jsx"], targetPage:"documentation" },
  { id:"screen-dashboard", type:"screen", section:"screens", audience:"all", status:"verified", title:"الرئيسية — Dashboard", summary:"لوحة العمل المركزية، المؤشرات، الإشعارات والاختصارات.", sourceRefs:["src/systems/projects/screens_a.jsx"], targetPage:"dashboard" },
  { id:"screen-today", type:"screen", section:"screens", audience:"all", status:"verified", title:"اليوم — Today", summary:"عرض يومي للمهام والأحداث والإشعارات والإنجازات المرتبطة.", sourceRefs:["src/systems/projects/screens_a.jsx"], targetPage:"today" },
  { id:"screen-my-work", type:"screen", section:"screens", audience:"all", status:"verified", title:"مهامي — My Work", summary:"مساحة المهام الشخصية مع الفلاتر والتنقل إلى المشروع والمهمة.", sourceRefs:["src/systems/projects/screens_a.jsx"], targetPage:"myWork" },
  { id:"screen-week", type:"screen", section:"screens", audience:"all", status:"verified", title:"هذا الأسبوع — Week", summary:"التخطيط الأسبوعي ومؤشرات الإنجاز والمهام.", sourceRefs:["src/systems/projects/screens_a.jsx"], targetPage:"week" },
  { id:"screen-portfolio", type:"screen", section:"screens", audience:"all", status:"verified", title:"محفظة المشاريع — Portfolio", summary:"Cards/Table/Board/Timeline/Calendar مع البحث والفلاتر والتصفح إلى المشروع.", sourceRefs:["src/systems/projects/screens_a.jsx"], targetPage:"portfolio" },
  { id:"screen-projects", type:"screen", section:"screens", audience:"all", status:"verified", title:"المشاريع — Projects", summary:"قائمة المشاريع وإدارتها والدخول إلى Project Workspace.", sourceRefs:["src/systems/projects/screens_b.jsx"], targetPage:"projects" },
  { id:"screen-tasks", type:"screen", section:"screens", audience:"all", status:"verified", title:"المهام — Tasks", summary:"قائمة/شجرة المهام، الفلاتر، العمليات الجماعية والتنقل إلى Task Sheet.", sourceRefs:["src/systems/projects/screens_a.jsx","src/systems/projects/parts.jsx"], targetPage:"tasks" },
  { id:"screen-governance", type:"screen", section:"screens", audience:"all", status:"verified", title:"مركز الحوكمة", summary:"واجهة موحدة للمخاطر والمشاكل والقرارات.", sourceRefs:["src/systems/projects/index.jsx","src/systems/projects/entities.jsx"], targetPage:"risks" },
  { id:"screen-discovery", type:"screen", section:"screens", audience:"all", status:"verified", title:"الاكتشاف — Discovery", summary:"الاكتشافات المرتبطة بالمشروع ومساراتها إلى المهام والمشاكل.", sourceRefs:["src/systems/projects/entities.jsx"], targetPage:"discovery" },
  { id:"screen-prds", type:"screen", section:"screens", audience:"all", status:"verified", title:"المواصفات — PRDs", summary:"المواصفات والإصدارات والمتطلبات والمراجعات وربطها بالتنفيذ.", sourceRefs:["src/systems/projects/entities.jsx"], targetPage:"prds" },
  { id:"screen-okrs", type:"screen", section:"screens", audience:"all", status:"verified", title:"الأهداف — OKR", summary:"Objectives وKRs وربط التنفيذ بالمشاريع والمهام.", sourceRefs:["src/systems/projects/screens_c.jsx"], targetPage:"okrs" },
  { id:"screen-outputs", type:"screen", section:"screens", audience:"all", status:"verified", title:"المخرجات — Outputs", summary:"المخرجات والملفات والمراجعة والربط بالمهمة والمواصفة.", sourceRefs:["src/systems/projects/entities.jsx","src/systems/projects/parts.jsx"], targetPage:"outputs" },
  { id:"screen-meetings", type:"screen", section:"screens", audience:"all", status:"verified", title:"الاجتماعات — Meetings", summary:"مرجع اجتماعات Projects وروابطها إلى Knowledge.", sourceRefs:["src/systems/projects/screens_c.jsx","src/systems/projects/parts.jsx"], targetPage:"meetings" },
  { id:"screen-results", type:"screen", section:"screens", audience:"all", status:"verified", title:"الإنجازات والتحديثات والمراجعات", summary:"Wins وUpdates وReviews ومسارات المراجعة الأسبوعية.", sourceRefs:["src/systems/projects/screens_c.jsx"], targetPage:"wins" },
  { id:"screen-admin", type:"screen", section:"screens", audience:"all", status:"verified", title:"الإدارة", summary:"Team وContacts وTemplates وSettings.", sourceRefs:["src/systems/projects/screens_c.jsx"], targetPage:"settings" },
  { id:"workspace-tabs", type:"navigation", section:"navigation", audience:"all", status:"verified", title:"Project Workspace Tabs", summary:"Overview, Tasks, Milestones, PRDs, Outputs, Risks, Issues, Decisions, Discovery, Meetings, Finance, Timeline، مع Work/People/OKR/Activity ضمن المحتوى المرتبط.", sourceRefs:["src/systems/projects/screens_b.jsx"], targetPage:"projects" },
  { id:"task-sheet", type:"component", section:"navigation", audience:"all", status:"verified", title:"Task Sheet", summary:"لوحة المهمة الجانبية مع Details/Time/Outputs/Links/Activity والتنقل إلى السجلات المرتبطة.", sourceRefs:["src/systems/projects/parts.jsx","src/systems/projects/screens_b.jsx"], targetPage:"tasks" },
  { id:"project-header-actions", type:"action", section:"actions", audience:"editors", status:"verified", title:"Project Header — إنشاء سجل مرتبط", summary:"المشروع يفتح نماذج Task/Output/PRD/Risk/Issue/Decision/Resource الموجودة أصلًا مع المشروع محددًا.", sourceRefs:["src/systems/projects/screens_b.jsx"], targetPage:"projects" },
  { id:"project-metrics-navigation", type:"action", section:"actions", audience:"all", status:"verified", title:"Project Overview Metrics", summary:"المؤشرات تفتح Tasks/Timeline/Work/Risks/Issues أو قائمة المهام غير المرتبطة.", sourceRefs:["src/systems/projects/screens_b.jsx"], targetPage:"projects" },
  { id:"portfolio-navigation", type:"action", section:"actions", audience:"all", status:"verified", title:"Portfolio Drill-down", summary:"أعداد المهام والمشاكل والمخاطر والتواريخ تفتح المشروع أو العرض المفلتر المناسب.", sourceRefs:["src/systems/projects/screens_a.jsx"], targetPage:"portfolio" },
  { id:"task-hierarchy", type:"relationship", section:"relationships", audience:"all", status:"verified", title:"Task Hierarchy", summary:"المهام تدعم parent_task_id وتسلسل المهام الفرعية مع عرض تدريجي.", sourceRefs:["src/systems/projects/parts.jsx","src/systems/projects/store.jsx"], targetPage:"tasks" },
  { id:"objective-kr-project-task", type:"relationship", section:"relationships", audience:"all", status:"verified", title:"Objective → KR → Project → Task", summary:"المسار التنفيذي الذي يربط الهدف بالنتائج الرئيسية والمشروع والمهام وفق العلاقات الموجودة في الكود.", sourceRefs:["src/systems/projects/screens_c.jsx","src/systems/projects/store.jsx"], targetPage:"okrs" },
  { id:"prd-task-output", type:"relationship", section:"relationships", audience:"all", status:"verified", title:"PRD → Requirement → Task → Output", summary:"متطلبات PRD يمكن تتبعها إلى مهام ومخرجات مرتبطة.", sourceRefs:["src/systems/projects/entities.jsx","src/systems/projects/parts.jsx"], targetPage:"prds" },
  { id:"risk-issue-decision", type:"relationship", section:"relationships", audience:"all", status:"verified", title:"Risk / Issue / Decision Traceability", summary:"روابط السجلات الحوكمية مع المشاريع والمهام والاكتشافات ومعالجة المخاطر.", sourceRefs:["src/systems/projects/entities.jsx","src/systems/projects/store.jsx"], targetPage:"risks" },
  { id:"knowledge-integration", type:"integration", section:"integrations", audience:"all", status:"verified", title:"Knowledge ↔ Projects", summary:"Knowledge يملك الاجتماعات؛ Projects يستهلك المرجع ويستطيع إنشاء Tasks من المتابعات بهوية ثابتة.", sourceRefs:["src/systems/projects/index.jsx","src/systems/projects/parts.jsx"], targetPage:"meetings" },
  { id:"finance-integration", type:"integration", section:"integrations", audience:"all", status:"verified", title:"Finance ↔ Projects", summary:"Projects يفتح صفحة Finance وFinance يملك الملف المالي؛ Projects لا ينشئ Ledger أو Profile ماليًا.", sourceRefs:["src/systems/projects/screens_b.jsx"], targetPage:"projects" },
  { id:"outputs-storage", type:"integration", section:"integrations", audience:"editors", status:"partial", title:"Outputs Storage", summary:"استخدام projects-outputs مع recovery intent مثبت برمجيًا؛ القبول الحقيقي لـStorage/RLS ما زال يحتاج تحققًا حيًا.", sourceRefs:["src/systems/projects/entities.jsx","src/systems/projects/parts.jsx"], targetPage:"outputs" },
  { id:"permissions", type:"permission", section:"states", audience:"admins", status:"verified", title:"Permissions and Access", summary:"الوصول يمر عبر osSectionLevel وcan(...) مع إخفاء بعض عناصر Viewers.", sourceRefs:["src/systems/projects/index.jsx","src/systems/projects/store.jsx"], targetPage:"settings" },
  { id:"offline-conflict", type:"state", section:"states", audience:"all", status:"verified", title:"Offline Queue & Conflict", summary:"تعديلات حقول مهمة أساسية يمكن أن تنتظر الاتصال؛ التعارض لا يُستبدل تلقائيًا ويُعرض للمستخدم.", sourceRefs:["src/systems/projects/index.jsx"], targetPage:"tasks" },
  { id:"deep-links", type:"navigation", section:"navigation", audience:"all", status:"verified", title:"Deep Links & Browser Back", summary:"Project/Task/record focus يتم تفسيره عبر routeContext دون تغيير IDs التاريخية.", sourceRefs:["src/systems/projects/index.jsx","src/systems/projects/screens_b.jsx"], targetPage:"projects" },
  { id:"calendar-target-date", type:"action", section:"actions", audience:"all", status:"verified", title:"Project Calendar", summary:"التقويم يتعامل مع target_date ويستطيع فتح المشروع من الحدث.", sourceRefs:["src/systems/projects/screens_a.jsx"], targetPage:"portfolio" },
  { id:"output-recovery", type:"flow", section:"flows", audience:"editors", status:"verified", title:"Output Upload Recovery", summary:"Upload intent → Storage success/failure → reload → retry → metadata recovery، مع منع الاعتماد النهائي أثناء pending.", sourceRefs:["src/systems/projects/entities.jsx","src/systems/projects/parts.jsx"], targetPage:"outputs" },
  { id:"automation-notifications", type:"integration", section:"integrations", audience:"admins", status:"partial", title:"Automations & Notifications", summary:"تغطية العقود تشمل استحقاق المهام والمشاريع ومراجعات PRD/Output والاجتماعات وجهات الاتصال والصحة والمخاطر والتكاملات؛ التحقق الحي النهائي منفصل.", sourceRefs:["tests/t_projects_daily_automations_contract.mjs","src/systems/projects/store.jsx"], targetPage:"settings" },
  { id:"needs-verification", type:"state", section:"coverage", audience:"admins", status:"needs-verification", title:"العناصر غير المحسومة", summary:"Real Storage/RLS، حسابات متعددة، mobile/RTL/accessibility، offline conflict acceptance، migration no-loss وproduction acceptance تحتاج دليلًا حيًا.", sourceRefs:["docs/projects-os/master-spec-status.md"], targetPage:"documentation" }
];

export const DOCUMENTATION_SECTIONS = [
  {id:"overview",label:"نظرة عامة"},
  {id:"navigation",label:"التنقل والشاشات"},
  {id:"actions",label:"الأزرار والإجراءات"},
  {id:"relationships",label:"العلاقات وتدفق البيانات"},
  {id:"flows",label:"الفلوهات"},
  {id:"integrations",label:"التكاملات"},
  {id:"states",label:"الحالات والصلاحيات"},
  {id:"coverage",label:"التغطية والمرجع التقني"}
];

export const DOCUMENTATION_STATUS = [
  {id:"verified",label:"موثق ومثبت"},
  {id:"partial",label:"جزئي"},
  {id:"needs-verification",label:"يحتاج تحقق"},
  {id:"planned",label:"مخطط"}
];

export function searchDocumentation(query, filters={}) {
  const q=String(query||"").trim().toLowerCase();
  return DOCUMENTATION_CATALOG.filter(item => {
    if (filters.section && item.section!==filters.section) return false;
    if (filters.status && item.status!==filters.status) return false;
    if (filters.audience && item.audience!==filters.audience) return false;
    if (!q) return true;
    return [item.id,item.title,item.summary,item.type,item.audience,...(item.sourceRefs||[])].join(" ").toLowerCase().includes(q);
  });
}
