import React,{useState,useEffect,useRef,useContext,useMemo,useCallback} from "react";
import { supabase } from "./supabase.js";

const CONTENT_SECTIONS=[{"id": "home", "label": "الرئيسية", "icon": "⌂"}, {"id": "accounts", "label": "الحسابات", "icon": "◎"}, {"id": "calendar", "label": "التقويم", "icon": "▦"}, {"id": "dailyschedule", "label": "جدول النشر اليومي", "icon": "◷"}, {"id": "analytics", "label": "التحليلات", "icon": "◒"}, {"id": "layers", "label": "الطبقات", "icon": "◈"}, {"id": "archive", "label": "الأرشيف", "icon": "▱"}, {"id": "history", "label": "السجل", "icon": "↺"}, {"id": "team", "label": "الفريق", "icon": "♟"}, {"id": "platforms", "label": "المنصات", "icon": "▣"}, {"id": "settings", "label": "الإعدادات", "icon": "⚙"}];

// ════════════════════════════════════════════════════════════════════════
// OS PLATFORM LAYER — Phase 0 (Core)
// Auth · Workspaces · Invitations · Permissions · Systems registry · Shell ·
// Today hub · Demo mode. ContentOS (above) is system #1, mounted in this shell.
// Every future system is a module with the same contract (see OSSystemHost).
// ════════════════════════════════════════════════════════════════════════
const PLATFORM={name:"OS Hub",tagline:"كل أنظمتك في مكان واحد",version:"1.0"};
const OS_LEVEL_RANK={none:0,view:1,edit:2};
const OS_LEVEL_LABEL={none:"لا وصول",view:"عرض فقط",edit:"عرض وتعديل"};
const OS_LEVEL_COLOR={none:"#94A3B8",view:"#3B82F6",edit:"#10B981"};
const OS_GROUPS=[{id:"work",label:"العمل والمعرفة"},{id:"life",label:"الحياة اليومية"},{id:"money",label:"المال والممتلكات"}];
function osSec(str){return str.split("|").map(x=>{const p=x.split(":");return{id:p[0],label:p[1],icon:p[2]||"•"};});}
// status: live = built · planned = scaffold only. phase = proposed build order (see PLATFORM_MASTER_PLAN.md)
const OS_SYSTEMS=[
{id:"content",group:"work",scope:"shared",icon:"✍️",color:"#EF9F27",name:"Content OS",title:"إدارة المحتوى",status:"live",phase:"جاهز",sensitive:false,plan:"docs/ContentOS_Phases_Roadmap.md",sections:null,
 desc:"تخطيط وإنتاج ونشر وتحليل المحتوى عبر الحسابات والمنصات."},
{id:"projects",group:"work",scope:"shared",icon:"🚀",color:"#6366F1",name:"Projects OS",title:"المشاريع والمخرجات",status:"live",phase:"جاهز",sensitive:false,plan:"Projects_OS_v4_Unified_Master_Plan.md",
 desc:"المشاريع والمهام والمخرجات والمخاطر والأهداف (OKR) للفريق.",
 sections:osSec("dashboard:الرئيسية:⌂|today:اليوم:📅|week:هذا الأسبوع:🗓️|projects:المشاريع:📁|tasks:مهامي:✅|discovery:الاكتشاف:🔎|prds:المواصفات:📝|okrs:الأهداف (OKR):🎯|outputs:المخرجات:📦|risks:المخاطر والمشاكل والقرارات:⚠️|meetings:الاجتماعات:👥|updates:التحديثات:📣|wins:الإنجازات:🏆|reviews:المراجعات الأسبوعية:🔁|contacts:جهات الاتصال:📇|team:الفريق:🧑‍🤝‍🧑|templates:القوالب:🧩|settings:الإعدادات:⚙️")},
{id:"habits",group:"life",scope:"personal",icon:"🌱",color:"#84CC16",name:"Habit OS",title:"العادات",status:"planned",phase:"المرحلة 2",sensitive:true,plan:"Habit_OS_v4_Unified_Master_Plan.md",
 desc:"مكتبة العادات والتسجيل السريع والسلاسل والأيام النظيفة والجورنال والكتب والتركيز الأسبوعي والإنجازات.",
 sections:osSec("dashboard:اليوم:◷|habits:العادات:🌿|logs:السجل اليومي:📒|relapses:التعافي:🛟|journal:الجورنال:✍️|books:الكتب والقراءة:📚|focus:التركيز الأسبوعي:🎯|achievements:الإنجازات:🏅|settings:الإعدادات والخصوصية:⚙️")},
{id:"knowledge",group:"work",scope:"shared",icon:"🧠",color:"#0EA5E9",name:"Knowledge OS",title:"المعرفة والموارد",status:"live",phase:"جاهز",sensitive:false,plan:"Knowledge_OS_v4_Unified_Master_Plan.md",
 desc:"التقط ← وضّح ← نظّم ← استخدم: الروابط والأفكار والاجتماعات والفعاليات.",
 sections:osSec("hub:الرئيسية:⌂|inbox:Inbox:📥|bookmarks:الروابط والمصادر:🔖|ideas:الأفكار:💡|notes:الملاحظات:📝|meetings:الاجتماعات:👥|events:الفعاليات:🎟️|calendar:التقويم الموحّد:📅|categories:التصنيفات:🗂️|linktypes:أنواع الروابط:🏷️|search:البحث:🔍|settings:الإعدادات:⚙️")},
{id:"learning",group:"work",scope:"personal",icon:"🎓",color:"#8B5CF6",name:"Learning OS",title:"التعلّم والتطوير",status:"live",phase:"المرحلة 1 · الهيكل الأساسي",sensitive:false,plan:"Learning_OS_v4_Unified_Master_Plan.md",
 desc:"المجالات والدورات والدروس وجلسات الدراسة والمهارات والمفردات.",
 sections:osSec("dashboard:الرئيسية:⌂|areas:المجالات:🧭|courses:الدورات:📚|skills:المهارات:🛠️|placement:اختبارات المستوى:🧪|careergoals:الأهداف المهنية:🎯|vocab:المفردات والمراجعة:🔤|analytics:التاريخ والتحليلات:📊|settings:الإعدادات:⚙️")},
{id:"finance",group:"money",scope:"personal",icon:"💰",color:"#10B981",name:"Finance OS",title:"المال",status:"live",phase:"المرحلة 1 · الأساس المالي",sensitive:true,plan:"Finance_OS_v4.2_Full_Specification_AR.md",
 desc:"الحسابات والحركات والميزانيات والأصول والديون والأهداف المالية.",
 sections:osSec("dashboard:لوحة القيادة:⌂|inbox:الوارد:📥|transactions:الحركات:🧾|accounts:الحسابات:🏦|categories:التصنيفات:🗂️|budgets:الميزانيات:📊|assets:الأصول:📈|debts:الديون والأقساط:💳|goals:الأهداف المالية:🎯|recurring:المتكرر والاشتراكات:🔁|projects:المشاريع المالية:📁|networth:صافي الثروة:💎|fx:أسعار الصرف:💱|reports:التقارير:📑|family:مركز مصاريف الأسرة:👪|family_sensitive:بيانات العائلة الحساسة:🔒|settings:الإعدادات والأمان:🔐")},
{id:"home",group:"life",scope:"shared",icon:"🏠",color:"#F97316",name:"Home OS",title:"إدارة البيت",status:"planned",phase:"المرحلة 6",sensitive:false,plan:"Home_OS_v4_Unified_Master_Plan.md",
 desc:"الغرف والمخزون المنزلي ومهام البيت والصيانة والمشتريات.",
 sections:osSec("dashboard:الرئيسية:⌂|rooms:الغرف:🚪|inventory:المخزون:📦|tasks:المهام والجدول:✅|maintenance:الصيانة:🔧|shopping:المشتريات:🛒|reports:التقارير:📑|settings:الإعدادات:⚙️")},
{id:"inventory",group:"money",scope:"shared",icon:"🧳",color:"#A16207",name:"Personal Inventory OS",title:"الممتلكات الشخصية",status:"live",phase:"المرحلة 7 · نسخة أولية",sensitive:false,plan:"PERSONAL_INVENTORY_OS_UNIFIED_MASTER_PLAN_v4.md",
 desc:"جرد ممتلكاتك والضمان والاستبدال والإعارات والمستندات.",
 sections:osSec("home:الرئيسية:⌂|items:الأصناف:📦|categories:التصنيفات:🗂️|places:الأماكن:📍|warranty:الضمان:🛡️|replacement:الاستبدال:♻️|documents:المستندات:📄|loans:الإعارات:🤝|history:التاريخ:🕘|audit:الجرد:☑️|collections:المجموعات:🎒|maintenance:الصيانة:🔧|archive:الأرشيف:🗄️|settings:الإعدادات:⚙️")},
{id:"shopping",group:"money",scope:"shared",icon:"🛒",color:"#E11D48",name:"Shopping & Wishlist OS",title:"التسوق وقوائم الرغبات",status:"planned",phase:"المرحلة 8",sensitive:false,plan:"PERSONAL_SHOPPING_WISHLIST_OS_UNIFIED_MASTER_PLAN_v4.md",
 desc:"قوائم الرغبات وتتبع الأسعار والمقارنة ومخطط الشراء والمرتجعات.",
 sections:osSec("home:الرئيسية:⌂|inbox:الوارد:📥|wishlist:الرغبات:⭐|compare:المقارنة:⚖️|planner:مخطّط الشراء:🗓️|purchases:المشتريات:🧾|ownership:الملكية:🔗|returns:المرتجعات:↩️|reviews:المراجعات:✍️|gifts:الهدايا:🎁|lists:التصنيفات والمتاجر والمواسم:🗂️|settings:الإعدادات:⚙️")},
{id:"nutrition",group:"life",scope:"personal",icon:"🍽️",color:"#22C55E",name:"Nutrition OS",title:"التغذية",status:"planned",phase:"المرحلة 9",sensitive:true,plan:"NUTRITION_OS_UNIFIED_MASTER_PLAN_v4.md",
 desc:"تسجيل الأكل والماء والأغذية والوصفات والخطط والأهداف الغذائية.",
 sections:osSec("today:اليوم:📅|log:سجل الأكل:📒|foods:الأغذية:🥑|recipes:الوصفات:🍳|batches:الدفعات:🥘|goals:الأهداف:🎯|water:الماء:💧|plan:الخطة:🗓️|grocery:البقالة:🛒|analytics:التحليلات:📊|review:المراجعة الأسبوعية:🔁|supplements:المكملات:💊|windows:النوافذ والتذكيرات:⏰|import:الاستيراد:⬆️|settings:الإعدادات:⚙️")},
{id:"sports",group:"life",scope:"personal",icon:"🏋️",color:"#EF4444",name:"Sports OS",title:"الرياضة",status:"planned",phase:"المرحلة 10",sensitive:false,plan:"Sports_OS_v4_Unified_Master_Plan.md",
 desc:"برامج التمرين والجلسات والأرقام القياسية والتعافي والقياسات.",
 sections:osSec("dashboard:الرئيسية:⌂|workout:تمرين اليوم:🏃|programs:البرامج:📋|exercises:التمارين:🦾|history:السجل:🕘|progress:التقدم:📈|goals:الأهداف:🎯|recovery:التعافي:😴|measurements:القياسات:📏|settings:الإعدادات:⚙️")},
{id:"relationships",group:"life",scope:"personal",icon:"👥",color:"#EC4899",name:"Relationships OS",title:"العلاقات",status:"live",phase:"المرحلة 11 · نسخة أولية",sensitive:true,plan:"docs/RELATIONSHIPS_OS_PHASE1.md",
 desc:"الأشخاص وسجل التواصل والمتابعات والمناسبات والهدايا والدوائر، مع بيانات شخصية حساسة.",
 sections:osSec("home:الرئيسية:⌂|people:الأشخاص:👥|timeline:سجل التواصل:🕘|followups:المتابعات:📞|occasions:المناسبات:🎂|gifts:الهدايا:🎁|circles:الدوائر:⭕|networking:العلاقات المهنية:💼|insights:الرؤى:💡|merge:مراجعة التكرارات:🔀|import:الاستيراد والتصدير:⬆️|settings:الإعدادات والخصوصية:⚙️")},
{id:"travel",group:"life",scope:"personal",icon:"✈️",color:"#06B6D4",name:"Travel & Experiences OS",title:"السفر والتجارب",status:"planned",phase:"المرحلة 12",sensitive:false,plan:"TRAVEL_EXPERIENCES_OS_UNIFIED_MASTER_PLAN_v4.md",
 desc:"الرحلات والحجوزات والبرامج والميزانية والمستندات والذكريات.",
 sections:osSec("home:الرئيسية:⌂|trips:الرحلات:🧳|active:الرحلة النشطة:📍|places:الأماكن والتجارب:🗺️|destinations:الوجهات:🌍|documents:المستندات:🛂|memories:الذكريات:📸|settings:الإعدادات:⚙️")},
{id:"spiritual",group:"life",scope:"personal",icon:"🙏",color:"#14B8A6",name:"Spiritual & Values OS",title:"الروحانيات والقيم",status:"planned",phase:"المرحلة 13",sensitive:true,plan:"SPIRITUAL_VALUES_OS_UNIFIED_MASTER_PLAN_v4.md",
 desc:"القيم والمبادئ والممارسات والتأملات والالتزامات بهدوء وخصوصية.",
 sections:osSec("home:الرئيسية:⌂|values:القيم:💎|principles:المبادئ:📜|practices:الممارسات:🌿|dailylog:السجل اليومي:📒|reflections:التأملات:🪞|goals:الأهداف:🎯|commitments:الالتزامات:🤲|dates:التواريخ المهمة:📅|reviews:المراجعات:🔁|seasons:المواسم:🌙|alignment:الاتساق:🧭|settings:الإعدادات:⚙️")},
];
function osSystemById(id){return OS_SYSTEMS.find(s=>s.id===id)||null;}
function osSections(sys){
  if(!sys) return [];
  if(sys.sections) return sys.sections;
  if(sys.id==="content") return CONTENT_SECTIONS;
  return [];
}

// ── Permission model ──────────────────────────────────────────────────
// access = { systems: { [systemId]: { level:"view"|"edit", manage:bool, sections:{[sectionId]:"none"|"view"|"edit"} } } }
// Server (RLS) enforces system-level view/edit. Section-level hiding is enforced in the UI
// (one JSON blob per system); sensitive systems will split into parts so RLS can enforce them too.
function osAccess(ws,systemId){
  if(!ws) return {level:"none",manage:false,sections:{},owner:false};
  if(ws.isOwner) return {level:"edit",manage:true,sections:{},owner:true};
  const s=((ws.access||{}).systems||{})[systemId]||{};
  const lvl=OS_LEVEL_RANK[s.level]!==undefined?s.level:"none";
  return {level:lvl,manage:!!s.manage&&lvl!=="none",sections:s.sections||{},owner:false};
}
function osSectionLevel(acc,secId){
  if(!acc||acc.level==="none") return "none";
  if(acc.owner) return "edit";
  const o=acc.sections&&acc.sections[secId];
  let lvl=acc.level;
  if(o&&OS_LEVEL_RANK[o]!==undefined&&OS_LEVEL_RANK[o]<OS_LEVEL_RANK[lvl]) lvl=o;
  if(secId==="settings"&&!acc.manage&&!o) return "none"; // settings need "manage" unless granted explicitly
  return lvl;
}
function osCountHidden(sysAcc){return Object.keys((sysAcc&&sysAcc.sections)||{}).filter(k=>sysAcc.sections[k]==="none").length;}
function osAccessEntries(access){
  const out=[]; const sys=(access&&access.systems)||{};
  OS_SYSTEMS.forEach(s=>{const a=sys[s.id]; if(a&&OS_LEVEL_RANK[a.level]>0) out.push({sys:s,level:a.level,manage:!!a.manage,hidden:osCountHidden(a)});});
  return out;
}

// ── Data API (per workspace · system · part) ──────────────────────────
function osLocalKey(wsId,sysId,part){return "os_cache_"+wsId+"_"+sysId+"_"+part;}
function osMakeApi(wsId,systemId,part){
  part=part||"main"; const lk=osLocalKey(wsId,systemId,part); let uidCache=null;
  const readLocal=(err)=>{try{const ls=localStorage.getItem(lk);if(ls)return{data:JSON.parse(ls),source:"localStorage",updatedAt:null,error:err||null};}catch(e){}return{data:null,source:"unavailable",updatedAt:null,error:err||null};};
  return {
    workspaceId: wsId,
    async loadNormalizedInventory(){
      try {
        const {data,error}=await supabase.rpc("inventory_load_snapshot",{p_workspace_id:wsId});
        if(error){
          if(["PGRST202","42883"].includes(error.code)||/function .*inventory_load_snapshot.*(not found|does not exist)|could not find the function/i.test(error.message||"")) return {available:false,error};
          return {available:true,error};
        }
        return {available:true,data,source:"normalized"};
      } catch(error) { return {available:true,error}; }
    },
    async saveNormalizedInventory(snapshot){
      try {
        const {data,error}=await supabase.rpc("inventory_save_snapshot",{p_workspace_id:wsId,p_snapshot:snapshot});
        if(error){
          if(["PGRST202","42883"].includes(error.code)||/function .*inventory_save_snapshot.*(not found|does not exist)|could not find the function/i.test(error.message||"")) return {available:false,error};
          return {available:true,ok:false,error};
        }
        return {available:true,ok:true,updatedAt:data||null};
      } catch(error) { return {available:true,ok:false,error}; }
    },
    async load(){
      try{
        const timeout=new Promise(r=>setTimeout(()=>r({ok:false,error:{message:"Supabase request timed out"}}),12000));
        const req=(async()=>{
          const {data:sd,error:se}=await supabase.auth.getSession();
          if(se) return {ok:false,error:se};
          const {data,error}=await supabase.from("workspace_data").select("data,updated_at").eq("workspace_id",wsId).eq("system_id",systemId).eq("part",part).maybeSingle();
          if(error) return {ok:false,error:{message:error.message||"read failed",code:error.code||"",hasSession:!!(sd&&sd.session)}};
          return {ok:true,data};
        })();
        const r=await Promise.race([req,timeout]);
        if(r.ok){
          const row=r.data;
          if(row&&row.data&&Object.keys(row.data).length>0) return {data:row.data,source:"supabase",updatedAt:row.updated_at||null,error:null};
          return {data:null,source:"supabaseEmpty",updatedAt:(row&&row.updated_at)||null,error:null};
        }
        console.warn("workspace_data load failed:",r.error);
        return readLocal(r.error);
      }catch(e){console.warn("workspace_data load exception:",e);return readLocal(e);}
    },
    async save(data,expected){
      const nowIso=new Date().toISOString();
      try{localStorage.setItem(lk,JSON.stringify(data));}catch(e){}
      try{
        if(!uidCache){const s=await supabase.auth.getSession();uidCache=(s&&s.data&&s.data.session&&s.data.session.user&&s.data.session.user.id)||null;}
        if(expected){
          const {data:rows,error}=await supabase.from("workspace_data").update({data,updated_at:nowIso,updated_by:uidCache}).eq("workspace_id",wsId).eq("system_id",systemId).eq("part",part).eq("updated_at",expected).select("updated_at");
          if(error){console.error("Supabase Sync Error:",error);return{ok:false,conflict:false,updatedAt:expected};}
          if(!rows||rows.length===0){console.warn("Supabase save conflict: server has newer data.");return{ok:false,conflict:true,updatedAt:expected};}
          return {ok:true,conflict:false,updatedAt:nowIso};
        }
        const {error}=await supabase.from("workspace_data").upsert({workspace_id:wsId,system_id:systemId,part,data,updated_at:nowIso,updated_by:uidCache},{onConflict:"workspace_id,system_id,part"});
        if(error){console.error("Supabase Sync Error:",error);return{ok:false,conflict:false,updatedAt:null};}
        return {ok:true,conflict:false,updatedAt:nowIso};
      }catch(e){console.error("Supabase Sync Error:",e);return{ok:false,conflict:false,updatedAt:expected||null};}
    }
  };
}
function osMakeDemoApi(store,key,seed){
  return {
    async load(){if(!store.current[key])store.current[key]=seed?seed():{};return{data:store.current[key],source:"demo",updatedAt:null,error:null};},
    async save(data){store.current[key]=data;return{ok:true,conflict:false,updatedAt:null};}
  };
}

// ── Platform backend (workspaces / members / invitations) ─────────────
function osIsSchemaMissing(e){return !!e&&(e.code==="42P01"||e.code==="PGRST205"||e.code==="PGRST202"||/schema cache|does not exist|could not find the (table|function)/i.test(e.message||""));}
function osMapInv(i){return{id:i.id,wsId:i.workspace_id,email:i.invited_email,message:i.message||"",access:i.access||{},status:i.status,createdAt:i.created_at,inviterName:i.inviter_name||"",wsName:i.workspace_name||"",expiresAt:i.expires_at};}
async function osLoadWorkspaces(sbUser){
  const {data:rows,error:e1}=await supabase.from("workspaces").select("id,name,owner_id,owner_name,created_at");
  if(e1) throw e1;
  const {data:mem,error:e2}=await supabase.from("workspace_members").select("workspace_id,access,status").eq("user_id",sbUser.id);
  if(e2) throw e2;
  const acc={}; (mem||[]).forEach(m=>{if(m.status==="active")acc[m.workspace_id]=m.access||{};});
  return (rows||[]).filter(w=>w.owner_id===sbUser.id||acc[w.id]).map(w=>({id:w.id,name:w.name,ownerId:w.owner_id,ownerName:w.owner_name||"",isOwner:w.owner_id===sbUser.id,access:acc[w.id]||{}})).sort((a,b)=>(b.isOwner?1:0)-(a.isOwner?1:0));
}
async function osLoadIncoming(sbUser){
  const em=String(sbUser.email||"").toLowerCase();
  const {data,error}=await supabase.from("invitations").select("id,workspace_id,invited_email,inviter_name,workspace_name,message,access,status,created_at,expires_at").eq("invited_email",em).eq("status","pending");
  if(error) throw error;
  const now=Date.now();
  return (data||[]).filter(i=>!i.expires_at||new Date(i.expires_at).getTime()>now).map(osMapInv);
}
async function osLoadWsAdmin(wsId,isOwner){
  const {data:m,error:e1}=await supabase.from("workspace_members").select("user_id,email,display_name,access,status,joined_at").eq("workspace_id",wsId);
  if(e1) throw e1;
  let sent=[];
  if(isOwner){const {data,error}=await supabase.from("invitations").select("*").eq("workspace_id",wsId).order("created_at",{ascending:false}).limit(50); if(error) throw error; sent=(data||[]).map(osMapInv);}
  return {members:(m||[]).map(x=>({userId:x.user_id,email:x.email||"",name:x.display_name||"",access:x.access||{},status:x.status,joinedAt:x.joined_at})),sent};
}
function osAuthErr(e){
  const m=String((e&&e.message)||"").toLowerCase();
  if(m.includes("invalid login credentials")||m.includes("invalid_credentials")) return "البريد الإلكتروني أو كلمة المرور غير صحيحة";
  if(m.includes("email not confirmed")) return "لم يتم تأكيد البريد بعد — افتح رسالة التأكيد في بريدك";
  if(m.includes("already registered")||m.includes("already exists")||m.includes("user_already_exists")) return "هذا البريد مسجّل بالفعل — جرّب تسجيل الدخول";
  if(m.includes("rate limit")||m.includes("too many")||m.includes("over_email_send_rate_limit")) return "محاولات كثيرة — حاول بعد قليل";
  if(m.includes("password")&&(m.includes("weak")||m.includes("least")||m.includes("short"))) return "كلمة المرور ضعيفة — استخدم 8 أحرف على الأقل";
  if(m.includes("same password")||m.includes("different from the old")) return "كلمة المرور الجديدة لازم تختلف عن القديمة";
  if(m.includes("sdk failed")||m.includes("failed to fetch")||m.includes("network")) return "تعذر الاتصال بالخادم — تحقق من الإنترنت";
  if(m.includes("signup")&&m.includes("disabled")) return "التسجيل الجديد مُعطّل في إعدادات Supabase";
  return (e&&e.message)?("خطأ: "+e.message):"حدث خطأ غير متوقع";
}
function osClearLocalCaches(){
  try{Object.keys(localStorage).forEach(k=>{if(k==="cos_v8"||k.indexOf("os_cache_")===0||k.indexOf("contentos_version_snapshots_v1")===0||k==="os_current_ws")localStorage.removeItem(k);});}catch(e){}
}
function osBuildDemoState(){
  const sys=(lvl)=>{const o={};OS_SYSTEMS.forEach(s=>{o[s.id]={level:lvl,manage:false,sections:{}};});return o;};
  const sara=sys("edit"); sara.finance.level="view"; delete sara.spiritual; delete sara.relationships; sara.content={level:"edit",manage:false,sections:{analytics:"none",team:"none",settings:"none"}}; sara.projects.manage=true; sara.habits={level:"view",manage:false,sections:{journal:"none",relapses:"none"}};
  const layla=sys("view"); delete layla.finance; delete layla.spiritual; delete layla.relationships; delete layla.nutrition; delete layla.habits;
  const omar=sys("view"); Object.keys(omar).forEach(k=>{if(["content","projects","knowledge"].indexOf(k)<0)delete omar[k];});
  const ago=(d)=>new Date(Date.now()-d*86400000).toISOString();
  return {
    me:{id:"demo_me",email:"demo@os-hub.app",name:"أنت (تجريبي)"},
    viewAs:"owner",
    workspaces:[{id:"demo_ws",name:"مساحتي التجريبية",ownerId:"demo_me",ownerName:"أنت (تجريبي)",isOwner:true,access:{}}],
    members:[
      {userId:"demo_sara",email:"sara@demo.app",name:"سارة أحمد",access:{systems:sara},status:"active",joinedAt:ago(12)},
      {userId:"demo_layla",email:"layla@demo.app",name:"ليلى حسن",access:{systems:layla},status:"active",joinedAt:ago(5)}
    ],
    sent:[{id:"demo_inv1",wsId:"demo_ws",email:"omar@demo.app",message:"أهلاً عمر، ضفتك للاطلاع على المحتوى والمشاريع.",access:{systems:omar},status:"pending",createdAt:ago(1),inviterName:"أنت (تجريبي)",wsName:"مساحتي التجريبية"}],
    incoming:[{id:"demo_inc1",wsId:"demo_ws2",email:"demo@os-hub.app",message:"أهلاً! ضفتك على مشاريع الشركة.",status:"pending",createdAt:ago(0),inviterName:"أحمد منصور",wsName:"مساحة أحمد",
      access:{systems:{projects:{level:"edit",manage:false,sections:{}},knowledge:{level:"view",manage:false,sections:{}},content:{level:"view",manage:false,sections:{team:"none",settings:"none"}}}}}]
  };
}


export { CONTENT_SECTIONS, OS_GROUPS, OS_LEVEL_COLOR, OS_LEVEL_LABEL, OS_LEVEL_RANK, OS_SYSTEMS, PLATFORM, osAccess, osAccessEntries, osAuthErr, osBuildDemoState, osClearLocalCaches, osCountHidden, osIsSchemaMissing, osLoadIncoming, osLoadWorkspaces, osLoadWsAdmin, osLocalKey, osMakeApi, osMakeDemoApi, osMapInv, osSec, osSectionLevel, osSections, osSystemById };
