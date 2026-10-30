import React, { useCallback, useEffect, useMemo, useState } from "react";
import { loadNormalizedKnowledge, saveNormalizedKnowledge, hasKnowledgeContent } from "./repository.js";

const C = { ink:"#172033", muted:"#64748B", line:"#E2E8F0", bg:"#F8FAFC", accent:"#0284C7", soft:"#E0F2FE", green:"#047857", amber:"#B45309", red:"#B91C1C", white:"#FFFFFF" };
const SECTIONS = [
  ["hub","الرئيسية","⌂"],["inbox","Inbox","📥"],["bookmarks","الروابط والمصادر","🔖"],["ideas","الأفكار","💡"],["notes","الملاحظات","📝"],
  ["meetings","الاجتماعات","👥"],["events","الفعاليات","🎟️"],["calendar","التقويم الموحّد","📅"],
  ["categories","التصنيفات","🗂️"],["linktypes","أنواع الروابط","🏷️"],["search","البحث","🔍"],["settings","الإعدادات","⚙️"]
];
const KINDS = { resource:"مصدر", idea:"فكرة", note:"ملاحظة", meeting:"اجتماع", event:"فعالية", inbox:"وارد" };
const STATUSES = { inbox:"الوارد", unread:"لم يُراجع", reviewing:"قيد المراجعة", processed:"تمت المعالجة", active:"نشط", archived:"مؤرشف", done:"مكتمل" };
const SOURCE_TYPES = ["مقال","كتاب","فيديو","بودكاست","دورة","بحث","موقع","أداة","ملف","ورقة علمية","نشرة بريدية","أخرى"];
const PRIORITIES = {low:"منخفضة",normal:"عادية",high:"مرتفعة",urgent:"عاجلة"};
const IDEA_STAGES = {captured:"ملتَقطة",exploring:"قيد الاستكشاف",validated:"تم التحقق",planned:"مخططة",implemented:"تم التنفيذ",rejected:"مرفوضة"};
const uid = () => globalThis.crypto?.randomUUID?.() || "kn-" + Date.now().toString(36) + Math.random().toString(36).slice(2,9);
const isoNow = () => new Date().toISOString();
const today = () => new Date().toLocaleDateString("en-CA", { timeZone:"Africa/Cairo" });
const emptyData = () => ({
  version:1,
  resources:[], ideas:[], notes:[], meetings:[], events:[], inbox:[],
  categories:[{id:"cat-work",name:"العمل",color:"#0284C7"},{id:"cat-learning",name:"التعلّم",color:"#7C3AED"},{id:"cat-personal",name:"شخصي",color:"#059669"}],
  linkTypes:[...SOURCE_TYPES],
  preferences:{defaultView:"hub",reviewReminderDays:7}
});
export const demoSeed = () => {
  const d=emptyData(), now=isoNow();
  d.resources=[
    {id:"demo-r1",title:"مقدمة في التفكير المنظومي",url:"https://example.com/systems-thinking",summary:"مصدر تجريبي لفهم العلاقات بين أجزاء النظام.",sourceType:"مقال",status:"unread",categoryId:"cat-learning",tags:["تفكير","أنظمة"],priority:"high",reviewAt:today(),createdAt:now,updatedAt:now,pinned:true},
    {id:"demo-r2",title:"أداة لإدارة المراجع",url:"https://example.com/research-tool",summary:"مكان لتجميع أدوات البحث والمراجع.",sourceType:"أداة",status:"processed",categoryId:"cat-work",tags:["أدوات"],priority:"normal",createdAt:now,updatedAt:now,pinned:false}
  ];
  d.ideas=[{id:"demo-i1",title:"إنشاء خريطة للمفاهيم المتكررة",summary:"ربط الأفكار المتشابهة بالمشاريع والمحتوى.",status:"active",stage:"exploring",priority:"high",categoryId:"cat-work",tags:["نظام المعرفة"],createdAt:now,updatedAt:now}];
  d.notes=[{id:"demo-n1",title:"ملاحظة: مبادئ تنظيم المعرفة",summary:"اجمع الفكرة الأساسية ثم اربطها بمصدر أو مشروع عند الحاجة.",body:"1. احفظ المصدر مع سياقه.\\n2. استخرج الفكرة بلغتك.\\n3. اربطها بما تعمل عليه.",status:"active",categoryId:"cat-learning",tags:["ملاحظات","منهجية"],createdAt:now,updatedAt:now}];
  d.inbox=[{id:"demo-in1",title:"مثال: رابط يحتاج إلى مراجعة",url:"https://example.com/review",summary:"عنصر تجريبي في صندوق الوارد.",sourceType:"مقال",status:"inbox",createdAt:now,updatedAt:now}];
  d.meetings=[{id:"demo-m1",title:"اجتماع تخطيط أسبوعي",date:today(),summary:"نقاط النقاش والقرارات والمتابعات.",status:"active",tags:["تخطيط"],createdAt:now,updatedAt:now}];
  d.events=[{id:"demo-e1",title:"موعد مراجعة المعرفة",date:today(),summary:"مراجعة العناصر المحفوظة وتحويل المهم منها إلى إجراءات.",status:"active",createdAt:now,updatedAt:now}];
  return d;
};
const normalize = raw => {
  const d = raw && typeof raw==="object" ? raw : {};
  const base=emptyData();
  return {
    ...base,...d,
    resources:Array.isArray(d.resources)?d.resources:[],
    ideas:Array.isArray(d.ideas)?d.ideas:[],
    notes:Array.isArray(d.notes)?d.notes:[],
    meetings:Array.isArray(d.meetings)?d.meetings:[],
    events:Array.isArray(d.events)?d.events:[],
    inbox:Array.isArray(d.inbox)?d.inbox:[],
    categories:Array.isArray(d.categories)?d.categories:base.categories,
    linkTypes:Array.isArray(d.linkTypes)?d.linkTypes:base.linkTypes,
    preferences:{...base.preferences,...(d.preferences||{})}
  };
};
const esc = s => String(s||"").trim();
const card = {background:C.white,border:"1px solid "+C.line,borderRadius:16,padding:16};
const input = {width:"100%",boxSizing:"border-box",border:"1px solid "+C.line,borderRadius:10,padding:"10px 12px",font:"inherit",fontSize:13,color:C.ink,background:C.white};
function Btn({children,onClick,secondary=false,disabled=false,type="button"}) {
  return <button type={type} disabled={disabled} onClick={onClick} style={{border:"1px solid "+(secondary?C.line:C.accent),background:secondary?C.white:C.accent,color:secondary?C.ink:C.white,borderRadius:10,padding:"9px 13px",fontWeight:750,fontFamily:"inherit",fontSize:12,cursor:disabled?"not-allowed":"pointer",opacity:disabled ? .55 : 1}}>{children}</button>;
}
function Field({label,children}) { return <label style={{display:"grid",gap:6,fontSize:12,fontWeight:750,color:"#475569"}}>{label}{children}</label>; }
function Tag({children}) { return <span style={{fontSize:11,padding:"4px 8px",borderRadius:999,background:C.soft,color:"#075985",whiteSpace:"nowrap"}}>{children}</span>; }

export default function KnowledgeOS({api,access,isDemo=false,page="hub",setPage,ws}) {
  const [data,setData]=useState(emptyData);
  const [updatedAt,setUpdatedAt]=useState(null);
  const [storageMode,setStorageMode]=useState("legacy");
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [query,setQuery]=useState("");
  const [filter,setFilter]=useState("all");
  const [editor,setEditor]=useState(null);
  const [form,setForm]=useState({});
  const [showArchived,setShowArchived]=useState(false);
  const canEdit=!!isDemo || access?.level==="edit" || access?.manage || access?.owner;
  const section=SECTIONS.some(s=>s[0]===page)?page:"hub";
  const go=id=>setPage&&setPage(id);
  const load=useCallback(async()=>{
    setLoading(true);setError("");
    try {
      if(!isDemo && api?.workspaceId) {
        const normalized=await loadNormalizedKnowledge(api.workspaceId);
        if(normalized.available) {
          if(normalized.error) throw normalized.error;
          if(normalized.hasContent || normalized.updatedAt) {
            setStorageMode("normalized");
            setData(normalize(normalized.data));
            setUpdatedAt(normalized.updatedAt);
            return;
          }
          // First-run/backfill path: never replace non-empty normalized data with legacy JSON.
          const legacy=await api.load();
          if(legacy?.error && !legacy?.data) throw legacy.error;
          const legacyData=normalize(legacy?.data || null);
          setStorageMode("normalized");
          setData(legacyData);
          setUpdatedAt(normalized.updatedAt || null);
          if(hasKnowledgeContent(legacyData) && (access?.level==="edit" || access?.manage || access?.owner)) {
            const migrated=await saveNormalizedKnowledge(api.workspaceId,legacyData,normalized.updatedAt || null);
            if(migrated.available && migrated.ok) {
              setUpdatedAt(migrated.updatedAt);
              setNotice("تم نقل بيانات المعرفة الحالية إلى التخزين المنظم.");
            } else if(migrated.available && migrated.conflict) {
              setNotice("توجد تغييرات أحدث على الخادم؛ أعد التحميل قبل التعديل.");
            } else if(migrated.available && migrated.error) {
              setNotice("تم تحميل البيانات القديمة، لكن النقل إلى التخزين المنظم لم يكتمل.");
            }
          }
          return;
        }
      }
      setStorageMode("legacy");
      const result=await api.load();
      if(result?.error && !result?.data) throw result.error;
      setData(normalize(result?.data || (isDemo?demoSeed():null)));
      setUpdatedAt(result?.updatedAt||null);
    } catch(e) { setError(e?.message||"تعذر تحميل بيانات المعرفة.");setData(normalize(isDemo?demoSeed():null)); }
    finally { setLoading(false); }
  },[api,isDemo,access?.level,access?.manage,access?.owner]);
  useEffect(()=>{load();},[load]);
  const allItems=useMemo(()=>[
    ...data.resources.map(x=>({...x,kind:"resource"})),
    ...data.ideas.map(x=>({...x,kind:"idea"})),
    ...data.notes.map(x=>({...x,kind:"note"})),
    ...data.meetings.map(x=>({...x,kind:"meeting"})),
    ...data.events.map(x=>({...x,kind:"event"})),
    ...data.inbox.map(x=>({...x,kind:"inbox"}))
  ],[data]);
  const categoryName=id=>data.categories.find(c=>c.id===id)?.name||"بدون تصنيف";
  const filtered=useMemo(()=>{
    let rows=allItems.filter(x=>showArchived||x.status!=="archived");
    if(section==="bookmarks") rows=rows.filter(x=>x.kind==="resource");
    else if(section==="ideas") rows=rows.filter(x=>x.kind==="idea");
    else if(section==="notes") rows=rows.filter(x=>x.kind==="note");
    else if(section==="meetings") rows=rows.filter(x=>x.kind==="meeting");
    else if(section==="events") rows=rows.filter(x=>x.kind==="event");
    else if(section==="inbox") rows=rows.filter(x=>x.kind==="inbox"||x.status==="inbox"||x.status==="unread");
    else if(section==="calendar") rows=rows.filter(x=>x.date);
    else if(section==="categories") rows=[];
    else if(section==="linktypes"||section==="settings") rows=[];
    else if(section==="hub") rows=rows.filter(x=>x.pinned||x.status==="inbox"||x.status==="unread"||x.kind==="meeting"||x.kind==="event"||(x.reviewAt&&x.reviewAt<=today()));
    const q=query.trim().toLocaleLowerCase();
    if(q) rows=rows.filter(x=>[x.title,x.summary,x.notes,x.nextAction,x.url,x.sourceType,x.date,x.location,x.author,x.decisions,(x.followups||[]).join(" "),categoryName(x.categoryId),(x.tags||[]).join(" ")].join(" ").toLocaleLowerCase().includes(q));
    if(filter!=="all") rows=rows.filter(x=>x.kind===filter||x.status===filter);
    return rows.sort((a,b)=>String(b.updatedAt||b.createdAt||b.date||"").localeCompare(String(a.updatedAt||a.createdAt||a.date||"")));
  },[allItems,section,query,filter,showArchived,data.categories]);
  const persist=async next=>{
    setSaving(true);setError("");setNotice("");
    try {
      const result=storageMode==="normalized" && !isDemo
        ? await saveNormalizedKnowledge(api.workspaceId,next,updatedAt||null)
        : await api.save(next,updatedAt||undefined);
      if(result?.available===false && storageMode==="normalized") {
        setError("تعذر الوصول إلى تخزين المعرفة المنظم. لم يتم تحويل الحفظ إلى التخزين القديم تلقائيًا حتى لا تنقسم البيانات بين مصدرين.");
        return false;
      }
      if(result?.ok===false) {
        if(result.conflict) {setError("توجد نسخة أحدث من البيانات على الخادم. أعد التحميل قبل الحفظ لتجنب الكتابة فوق التعديلات.");}
        else setError(result?.error?.message||"تعذر حفظ التغييرات على الخادم. احتفظ بنسخة من تعديلاتك وأعد المحاولة.");
        return false;
      }
      setData(next);setUpdatedAt(result?.updatedAt||updatedAt);setNotice("تم الحفظ.");return true;
    } catch(e) {setError(e?.message||"تعذر الحفظ.");return false;}
    finally {setSaving(false);}
  };
  const openNew=(kind)=>{
    if(!canEdit)return;
    setEditor({kind,id:null});
    setForm({title:"",url:"",summary:"",notes:"",nextAction:"",sourceType:"مقال",status:kind==="inbox"?"inbox":"active",stage:"captured",priority:"normal",categoryId:"",tags:"",date:today(),startTime:"",endTime:"",location:"",attendees:"",decisions:"",followups:"",author:"",publishedAt:"",readAt:"",reviewAt:"",rating:"",relatedSystem:"",relatedId:"",relatedItemIds:[],pinned:false});
    setError("");
  };
  const openEdit=item=>{
    if(!canEdit)return;
    setEditor({kind:item.kind,id:item.id});
    setForm({...item,tags:(item.tags||[]).join(", "),attendees:(item.attendees||[]).join(", "),followups:(item.followups||[]).join("\n"),relatedItemIds:Array.isArray(item.relatedItemIds)?item.relatedItemIds:[],rating:item.rating||""});
    setError("");
  };
  const saveItem=async e=>{
    e.preventDefault();
    if(!canEdit||!esc(form.title)){setError("العنوان مطلوب.");return;}
    const kind=editor.kind==="inbox"?"inbox":editor.kind;
    const row={...form,id:editor.id||uid(),title:esc(form.title),url:esc(form.url),summary:esc(form.summary),notes:esc(form.notes),nextAction:esc(form.nextAction),author:esc(form.author),location:esc(form.location),relatedSystem:esc(form.relatedSystem),relatedId:esc(form.relatedId),relatedItemIds:[...new Set((Array.isArray(form.relatedItemIds)?form.relatedItemIds:[]).filter(id=>id&&id!==(editor.id||"")))],rating:form.rating===""?null:Number(form.rating)||null,reviewAt:(kind==="resource"&&!form.reviewAt&&Number(data.preferences.reviewReminderDays)>0)?new Date(Date.now()+Number(data.preferences.reviewReminderDays)*86400000).toLocaleDateString("en-CA",{timeZone:"Africa/Cairo"}):(form.reviewAt||""),categoryId:form.categoryId||null,tags:[...new Set(esc(form.tags).split(",").map(x=>x.trim()).filter(Boolean))],attendees:esc(form.attendees).split(",").map(x=>x.trim()).filter(Boolean),followups:esc(form.followups).split("\n").map(x=>x.trim()).filter(Boolean),updatedAt:isoNow(),createdAt:form.createdAt||isoNow()};
    delete row.kind;
    const key=kind==="resource"?"resources":kind==="idea"?"ideas":kind==="note"?"notes":kind==="meeting"?"meetings":kind==="event"?"events":"inbox";
    const next={...data,[key]:editor.id?data[key].map(x=>x.id===editor.id?row:x):[row,...data[key]]};
    if(await persist(next))setEditor(null);
  };
  const mutateItem=async(item,patch)=>{
    if(!canEdit)return;
    const key=item.kind==="resource"?"resources":item.kind==="idea"?"ideas":item.kind==="note"?"notes":item.kind==="meeting"?"meetings":item.kind==="event"?"events":"inbox";
    const next={...data,[key]:data[key].map(x=>x.id===item.id?{...x,...patch,updatedAt:isoNow()}:x)};
    await persist(next);
  };
  const removeItem=async item=>{
    if(!canEdit||!window.confirm("أرشفة هذا العنصر؟ سيظل محفوظًا ويمكن إظهاره من العناصر المؤرشفة."))return;
    await mutateItem(item,{status:"archived",archivedAt:isoNow()});
  };
  const addCategory=async()=>{
    if(!canEdit)return;
    const name=window.prompt("اسم التصنيف الجديد");if(!esc(name))return;
    if(data.categories.some(c=>c.name.toLowerCase()===esc(name).toLowerCase())){setError("هذا التصنيف موجود بالفعل.");return;}
    await persist({...data,categories:[...data.categories,{id:uid(),name:esc(name),color:C.accent}]});
  };
  const addLinkType=async()=>{
    if(!canEdit)return;
    const name=window.prompt("اسم نوع المصدر الجديد");if(!esc(name))return;
    if(data.linkTypes.some(x=>x.toLowerCase()===esc(name).toLowerCase())){setError("هذا النوع موجود بالفعل.");return;}
    await persist({...data,linkTypes:[...data.linkTypes,esc(name)]});
  };
  const exportJson=()=>{
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json;charset=utf-8"});
    const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="knowledge-os-export-"+today()+".json";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  const pageTitle=SECTIONS.find(s=>s[0]===section)?.[1]||"المعرفة والموارد";
  const count=(kind)=>allItems.filter(x=>x.kind===kind&&x.status!=="archived").length;
  const newKind=section==="ideas"?"idea":section==="notes"?"note":section==="meetings"?"meeting":section==="events"?"event":section==="inbox"?"inbox":"resource";
  const addLabel=({resource:"＋ حفظ مصدر",idea:"＋ فكرة جديدة",note:"＋ ملاحظة",meeting:"＋ اجتماع",event:"＋ فعالية",inbox:"＋ إضافة للوارد"})[newKind];
  const setField=(key,value)=>setForm(f=>({...f,[key]:value}));
  return <div dir="rtl" style={{color:C.ink,fontFamily:"inherit",display:"grid",gap:16,maxWidth:1400,margin:"0 auto"}}>
    <header style={{...card,background:"linear-gradient(135deg,#F0F9FF,#FFFFFF)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}>
      <div><div style={{fontSize:11,color:C.accent,fontWeight:850,letterSpacing:.5}}>KNOWLEDGE OS · CAPTURE → CLARIFY → ORGANIZE → USE</div><h1 style={{fontSize:25,margin:"7px 0"}}>المعرفة والموارد</h1><p style={{margin:0,fontSize:13,color:C.muted,lineHeight:1.8}}>مكان واحد للروابط والمصادر والأفكار ومحاضر الاجتماعات والفعاليات، مع بحث وربط وتصنيف وأرشفة.</p></div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{canEdit&&<Btn onClick={()=>openNew(newKind)}>{addLabel}</Btn>}<Btn secondary onClick={exportJson}>تصدير نسخة JSON</Btn></div>
    </header>
    <nav style={{display:"flex",gap:7,flexWrap:"wrap"}}>{SECTIONS.map(([id,label,icon])=><button key={id} onClick={()=>go(id)} style={{border:"1px solid "+(section===id?C.accent:C.line),background:section===id?C.soft:C.white,color:section===id?C.accent:C.ink,borderRadius:10,padding:"8px 10px",fontFamily:"inherit",fontSize:12,fontWeight:750,cursor:"pointer"}}>{icon} {label}</button>)}</nav>
    {error&&<div role="alert" style={{...card,borderColor:"#FECACA",background:"#FEF2F2",color:C.red,fontSize:13}}>{error} <button onClick={load} style={{marginInlineStart:10}}>إعادة تحميل</button></div>}
    {notice&&<div role="status" style={{...card,borderColor:"#A7F3D0",background:"#ECFDF5",color:C.green,fontSize:13}}>{notice}</div>}
    {loading?<div style={{...card,textAlign:"center",padding:50,color:C.muted}}>جارٍ تحميل قاعدة المعرفة…</div>:<>
      {section==="hub"&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:12}}>{[["المصادر",count("resource"),"🔖","bookmarks"],["الأفكار",count("idea"),"💡","ideas"],["الملاحظات",count("note"),"📝","notes"],["الاجتماعات",count("meeting"),"👥","meetings"],["الفعاليات",count("event"),"🎟️","events"],["الوارد",allItems.filter(x=>x.kind==="inbox"||x.status==="inbox"||x.status==="unread").length,"📥","inbox"]].map(([label,n,icon,dest])=><button key={dest} onClick={()=>go(dest)} style={{...card,textAlign:"right",cursor:"pointer",fontFamily:"inherit"}}><div style={{fontSize:22}}>{icon}</div><div style={{fontSize:12,color:C.muted,marginTop:9}}>{label}</div><div style={{fontSize:27,fontWeight:850,marginTop:3}}>{n}</div></button>)}</div>}
      {section==="categories"&&<section style={card}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}><div><h2 style={{fontSize:17,margin:"0 0 5px"}}>التصنيفات</h2><p style={{fontSize:12,color:C.muted,margin:0}}>التصنيفات تساعدك على تنظيم المصادر والأفكار والاجتماعات والفعاليات.</p></div>{canEdit&&<Btn onClick={addCategory}>＋ تصنيف</Btn>}</div><div style={{display:"grid",gap:8,marginTop:16}}>{data.categories.map(c=><div key={c.id} style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",borderBottom:"1px solid "+C.line,paddingBottom:8}}><Tag>{c.name}</Tag>{canEdit&&<><Btn secondary onClick={async()=>{const name=window.prompt("تعديل اسم التصنيف",c.name);if(!esc(name)||esc(name)===c.name)return;if(data.categories.some(x=>x.id!==c.id&&x.name.toLowerCase()===esc(name).toLowerCase())){setError("هذا التصنيف موجود بالفعل.");return;}await persist({...data,categories:data.categories.map(x=>x.id===c.id?{...x,name:esc(name)}:x)});}}>تعديل</Btn><Btn secondary onClick={async()=>{if(!window.confirm("حذف التصنيف؟ ستبقى العناصر محفوظة وسيُزال ارتباطها بهذا التصنيف."))return;const strip=arr=>arr.map(x=>x.categoryId===c.id?{...x,categoryId:null,updatedAt:isoNow()}:x);await persist({...data,categories:data.categories.filter(x=>x.id!==c.id),resources:strip(data.resources),ideas:strip(data.ideas),notes:strip(data.notes),meetings:strip(data.meetings),events:strip(data.events),inbox:strip(data.inbox)});}}>حذف</Btn></>}</div>)}</div></section>}
      {section==="linktypes"&&<section style={card}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}><div><h2 style={{fontSize:17,margin:"0 0 5px"}}>أنواع المصادر</h2><p style={{fontSize:12,color:C.muted,margin:0}}>نوع المصدر يوضح طبيعة ما تحفظه دون أن يفرض طريقة استخدام واحدة.</p></div>{canEdit&&<Btn onClick={addLinkType}>＋ نوع مصدر</Btn>}</div><div style={{display:"grid",gap:8,marginTop:16}}>{data.linkTypes.map(c=><div key={c} style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",borderBottom:"1px solid "+C.line,paddingBottom:8}}><Tag>{c}</Tag>{canEdit&&<><Btn secondary onClick={async()=>{const name=window.prompt("تعديل نوع المصدر",c);if(!esc(name)||esc(name)===c)return;if(data.linkTypes.some(x=>x.toLowerCase()===esc(name).toLowerCase())){setError("هذا النوع موجود بالفعل.");return;}const update=arr=>arr.map(x=>x.sourceType===c?{...x,sourceType:esc(name),updatedAt:isoNow()}:x);await persist({...data,linkTypes:data.linkTypes.map(x=>x===c?esc(name):x),resources:update(data.resources),inbox:update(data.inbox)});}}>تعديل</Btn><Btn secondary onClick={async()=>{const used=[...data.resources,...data.inbox].some(x=>x.sourceType===c);if(used){setError("لا يمكن حذف نوع مستخدم. عدّل نوع المصدر في العناصر أولًا.");return;}if(!window.confirm("حذف نوع المصدر؟"))return;await persist({...data,linkTypes:data.linkTypes.filter(x=>x!==c)});}}>حذف</Btn></>}</div>)}</div></section>}
      {section==="settings"&&<section style={card}><h2 style={{fontSize:17,marginTop:0}}>الإعدادات والنسخ الاحتياطي</h2><p style={{fontSize:13,color:C.muted,lineHeight:1.8}}>البيانات مرتبطة بمساحة العمل الحالية. يمكنك تصدير نسخة JSON للاحتفاظ بنسخة مستقلة. لا يستبدل التصدير النسخ الاحتياطية للخادم.</p><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><Btn secondary onClick={exportJson}>تصدير جميع البيانات</Btn><Btn secondary onClick={async()=>{const v=window.prompt("عدد الأيام قبل مراجعة المصدر المحفوظ",String(data.preferences.reviewReminderDays??7));if(v===null)return;const n=Number(v);if(!Number.isInteger(n)||n<0||n>365){setError("أدخل عددًا صحيحًا من 0 إلى 365. القيمة 0 تعطل الموعد الافتراضي.");return;}await persist({...data,preferences:{...data.preferences,reviewReminderDays:n}});}}>تعديل تذكير المراجعة ({data.preferences.reviewReminderDays} يوم)</Btn><Btn secondary onClick={load}>إعادة تحميل من المصدر</Btn><label style={{...input,width:"auto",cursor:canEdit?"pointer":"not-allowed"}}>استيراد JSON<input type="file" accept="application/json,.json" disabled={!canEdit} style={{display:"block",marginTop:8,maxWidth:230}} onChange={async e=>{const f=e.target.files?.[0];if(!f)return;try{if(f.size>10*1024*1024)throw new Error("size");const raw=JSON.parse(await f.text());if(!raw||typeof raw!=="object"||Array.isArray(raw)||!["resources","ideas","notes","meetings","events","inbox"].some(k=>Array.isArray(raw[k])))throw new Error("shape");for(const k of ["resources","ideas","notes","meetings","events","inbox"])if(raw[k]!==undefined&&!Array.isArray(raw[k]))throw new Error("shape");const parsed=normalize(raw);if(!window.confirm("سيتم استبدال بيانات المعرفة الحالية بالملف. هل تريد المتابعة؟"))return;await persist(parsed);}catch(e){setError(e?.message==="size"?"حجم الملف يتجاوز الحد المسموح (10 MB).":"ملف JSON غير صالح أو لا يحتوي بنية بيانات معرفة مدعومة.");}finally{e.target.value="";}}}/></label></div></section>}
      {section==="calendar"&&<section style={card}><h2 style={{fontSize:17,marginTop:0}}>التقويم الموحّد</h2><p style={{fontSize:12,color:C.muted}}>الاجتماعات والفعاليات والمواعيد المرتبطة بعناصر المعرفة التي لها تاريخ.</p></section>}
      {section==="search"&&<section style={card}><h2 style={{fontSize:17,marginTop:0}}>البحث في المعرفة</h2><p style={{fontSize:12,color:C.muted}}>ابحث في العناوين والملخصات والروابط والتصنيفات والوسوم والتواريخ.</p></section>}
      {!["categories","linktypes","settings"].includes(section)&&<section style={{display:"grid",gap:12}}>
        <div style={{...card,display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(150px,.3fr) auto",gap:8,alignItems:"end"}}>
          <Field label="بحث سريع"><input style={input} value={query} onChange={e=>setQuery(e.target.value)} placeholder="ابحث في العنوان أو المحتوى أو الوسوم…"/></Field>
          <Field label="تصفية"><select style={input} value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">الكل</option>{Object.entries(KINDS).map(([k,v])=><option key={k} value={k}>{v}</option>)}{Object.entries(STATUSES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></Field>
          <label style={{fontSize:11,color:C.muted,display:"flex",gap:6,alignItems:"center"}}><input type="checkbox" checked={showArchived} onChange={e=>setShowArchived(e.target.checked)}/> إظهار المؤرشف</label>
        </div>
        {filtered.length===0?<div style={{...card,textAlign:"center",padding:40,color:C.muted}}>لا توجد عناصر مطابقة. احفظ مصدرًا أو أضف فكرة جديدة، أو غيّر عوامل البحث.</div>:filtered.map(item=><article key={item.kind+":"+item.id} style={{...card,display:"grid",gap:10}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"start",flexWrap:"wrap"}}>
            <div style={{minWidth:0,flex:1}}><div style={{display:"flex",gap:7,alignItems:"center",flexWrap:"wrap"}}><Tag>{KINDS[item.kind]||"وارد"}</Tag><Tag>{STATUSES[item.status]||item.status||"نشط"}</Tag>{item.sourceType&&<Tag>{item.sourceType}</Tag>}{item.pinned&&<Tag>مثبّت</Tag>}</div><h3 style={{fontSize:16,margin:"9px 0 5px",overflowWrap:"anywhere"}}>{item.title}</h3>{item.url&&<a href={item.url} target="_blank" rel="noreferrer" style={{fontSize:12,color:C.accent,overflowWrap:"anywhere"}}>{item.url}</a>}<p style={{fontSize:13,color:C.muted,lineHeight:1.8,margin:"6px 0"}}>{item.summary||"لا يوجد ملخص بعد."}</p></div>
            {canEdit&&<div style={{display:"flex",gap:6,flexWrap:"wrap"}}><Btn secondary onClick={()=>openEdit(item)}>تعديل</Btn><Btn secondary onClick={()=>mutateItem(item,{pinned:!item.pinned})}>{item.pinned?"إلغاء التثبيت":"تثبيت"}</Btn>{item.status==="inbox"||item.status==="unread"?<Btn onClick={()=>mutateItem(item,{status:"processed",readAt:today()})}>تمت المراجعة</Btn>:null}{item.status==="archived"?<Btn onClick={()=>mutateItem(item,{status:"active",archivedAt:null})}>استعادة</Btn>:<Btn secondary onClick={()=>removeItem(item)}>أرشفة</Btn>}</div>}
          </div>
          <div style={{display:"flex",gap:7,flexWrap:"wrap",alignItems:"center"}}>{item.categoryId&&<Tag>{categoryName(item.categoryId)}</Tag>}{item.date&&<Tag>📅 {item.date}{item.startTime?` · ${item.startTime}`:""}{item.endTime?`–${item.endTime}`:""}</Tag>}{item.priority&&<Tag>الأولوية: {PRIORITIES[item.priority]||item.priority}</Tag>}{item.reviewAt&&<Tag>مراجعة: {item.reviewAt}</Tag>}{item.author&&<Tag>✍ {item.author}</Tag>}{item.rating&&<Tag>★ {item.rating}/5</Tag>}{(item.tags||[]).map(t=><Tag key={t}>#{t}</Tag>)}</div>
          {(item.notes||item.nextAction||item.relatedSystem)&&<div style={{background:C.bg,borderRadius:10,padding:12,fontSize:12,lineHeight:1.8}}>{item.body&&<div><b>نص الملاحظة:</b> {item.body}</div>}{item.notes&&<div><b>ملاحظات مستخرجة:</b> {item.notes}</div>}{item.nextAction&&<div><b>الخطوة التالية:</b> {item.nextAction}</div>}{item.relatedSystem&&<div><b>ارتباط خارجي:</b> {item.relatedSystem}{item.relatedId?` · ${item.relatedId}`:""} (مرجع نصي؛ لا ينشئ علاقة قاعدة بيانات تلقائيًا)</div>}</div>
          {(item.kind==="meeting"&&(item.decisions||item.followups?.length||item.attendees?.length))&&<div style={{background:C.bg,borderRadius:10,padding:12,fontSize:12,lineHeight:1.8}}>{item.attendees?.length>0&&<div><b>الحضور:</b> {item.attendees.join("، ")}</div>}{item.decisions&&<div><b>القرارات:</b> {item.decisions}</div>}{item.followups?.length>0&&<div><b>المتابعات:</b> {item.followups.join("، ")}</div>}</div>}
        </article>)}
      </section>}
    </>}
    {editor&&<div role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!saving)setEditor(null)}} style={{position:"fixed",inset:0,zIndex:1000,background:"#0F172A88",display:"grid",placeItems:"center",padding:16,overflowY:"auto"}}><div role="dialog" aria-modal="true" aria-label="تعديل عنصر معرفة" style={{background:C.white,borderRadius:18,padding:22,width:"min(720px,100%)",maxHeight:"calc(100vh - 32px)",overflowY:"auto",boxSizing:"border-box"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><h2 style={{fontSize:19,margin:0}}>{editor.id?"تعديل":"إضافة"} {KINDS[editor.kind]||"عنصر وارد"}</h2><button onClick={()=>setEditor(null)} disabled={saving} style={{border:0,background:"transparent",fontSize:24,cursor:"pointer"}}>×</button></div><form onSubmit={saveItem} style={{display:"grid",gap:12}}>
      <Field label="العنوان *"><input required style={input} value={form.title||""} onChange={e=>setField("title",e.target.value)} placeholder="عنوان واضح يسهل استرجاعه"/></Field>
      {(editor.kind==="resource"||editor.kind==="inbox")&&<><Field label="الرابط"><input type="url" style={input} value={form.url||""} onChange={e=>setField("url",e.target.value)} placeholder="https://…"/></Field><Field label="نوع المصدر"><select style={input} value={form.sourceType||"مقال"} onChange={e=>setField("sourceType",e.target.value)}>{data.linkTypes.map(t=><option key={t}>{t}</option>)}</select></Field></>}
      <Field label="ملخص / وصف"><textarea style={{...input,minHeight:75,resize:"vertical"}} value={form.summary||""} onChange={e=>setField("summary",e.target.value)} placeholder="الفكرة الأساسية أو وصف العنصر…"/></Field>
      {editor.kind==="note"&&<Field label="نص الملاحظة"><textarea style={{...input,minHeight:180,resize:"vertical"}} value={form.body||""} onChange={e=>setField("body",e.target.value)} placeholder="اكتب المعرفة بصياغتك، مع أمثلة وروابط داخلية…"/></Field>}
      {(editor.kind==="resource"||editor.kind==="inbox")&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10}}><Field label="المؤلف / الجهة"><input style={input} value={form.author||""} onChange={e=>setField("author",e.target.value)}/></Field><Field label="تاريخ النشر"><input type="date" style={input} value={form.publishedAt||""} onChange={e=>setField("publishedAt",e.target.value)}/></Field><Field label="تاريخ القراءة / المراجعة"><input type="date" style={input} value={form.readAt||""} onChange={e=>setField("readAt",e.target.value)}/></Field><Field label="موعد المراجعة القادمة"><input type="date" style={input} value={form.reviewAt||""} onChange={e=>setField("reviewAt",e.target.value)}/></Field><Field label="التقييم (1–5)"><input type="number" min="1" max="5" style={input} value={form.rating||""} onChange={e=>setField("rating",e.target.value)}/></Field></div>}
      {editor.kind==="idea"&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10}}><Field label="مرحلة الفكرة"><select style={input} value={form.stage||"captured"} onChange={e=>setField("stage",e.target.value)}>{Object.entries(IDEA_STAGES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></Field><Field label="الخطوة التالية"><input style={input} value={form.nextAction||""} onChange={e=>setField("nextAction",e.target.value)}/></Field></div>}
      <Field label="ملاحظات / اقتباسات / ما تعلمته"><textarea style={{...input,minHeight:75,resize:"vertical"}} value={form.notes||""} onChange={e=>setField("notes",e.target.value)} placeholder="ملاحظاتك الخاصة أو اقتباسات مختصرة مع مراعاة حقوق النشر…"/></Field>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10}}><Field label="الأولوية"><select style={input} value={form.priority||"normal"} onChange={e=>setField("priority",e.target.value)}>{Object.entries(PRIORITIES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></Field><Field label="ارتباط بنظام آخر"><select style={input} value={form.relatedSystem||""} onChange={e=>setField("relatedSystem",e.target.value)}><option value="">بدون</option><option value="projects">Projects OS</option><option value="learning">Learning OS</option><option value="content">Content OS</option><option value="habits">Habit OS</option></select></Field><Field label="معرّف العنصر المرتبط"><input style={input} value={form.relatedId||""} onChange={e=>setField("relatedId",e.target.value)} placeholder="ID / slug"/></Field></div>
      <Field label="عناصر معرفة مرتبطة (يمكن اختيار أكثر من عنصر)"><select multiple style={{...input,minHeight:100}} value={form.relatedItemIds||[]} onChange={e=>setField("relatedItemIds",Array.from(e.target.selectedOptions).map(o=>o.value))}>{allItems.filter(x=>x.id!==(editor.id||"")&&x.status!=="archived").map(x=><option key={x.id} value={x.id}>{KINDS[x.kind]||x.kind} — {x.title}</option>)}</select><span style={{fontSize:11,color:C.muted}}>استخدم Ctrl أو Command لاختيار أكثر من عنصر. الروابط محفوظة داخل بيانات مساحة العمل.</span></Field>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10}}>
        <Field label="التصنيف"><select style={input} value={form.categoryId||""} onChange={e=>setField("categoryId",e.target.value)}><option value="">بدون تصنيف</option>{data.categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <Field label="الحالة"><select style={input} value={form.status||"active"} onChange={e=>setField("status",e.target.value)}>{Object.entries(STATUSES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="الوسوم (افصل بينها بفواصل)"><input style={input} value={form.tags||""} onChange={e=>setField("tags",e.target.value)} placeholder="فكرة، مرجع، متابعة"/></Field>
        {(editor.kind==="meeting"||editor.kind==="event")&&<><Field label="التاريخ"><input type="date" style={input} value={form.date||today()} onChange={e=>setField("date",e.target.value)}/></Field><Field label="وقت البداية"><input type="time" style={input} value={form.startTime||""} onChange={e=>setField("startTime",e.target.value)}/></Field><Field label="وقت النهاية"><input type="time" style={input} value={form.endTime||""} onChange={e=>setField("endTime",e.target.value)}/></Field></>}
      </div>
      {editor.kind==="meeting"&&<><Field label="المشاركون"><input style={input} value={form.attendees||""} onChange={e=>setField("attendees",e.target.value)} placeholder="الأسماء مفصولة بفواصل"/></Field><Field label="القرارات"><textarea style={input} value={form.decisions||""} onChange={e=>setField("decisions",e.target.value)}/></Field><Field label="المتابعات (كل متابعة في سطر)"><textarea style={input} value={form.followups||""} onChange={e=>setField("followups",e.target.value)}/></Field></>}
      {editor.kind==="event"&&<><Field label="المكان"><input style={input} value={form.location||""} onChange={e=>setField("location",e.target.value)}/></Field><Field label="رابط الحجز / الفعالية"><input type="url" style={input} value={form.url||""} onChange={e=>setField("url",e.target.value)}/></Field></>}
      <label style={{display:"flex",gap:8,alignItems:"center",fontSize:12,fontWeight:750}}><input type="checkbox" checked={!!form.pinned} onChange={e=>setField("pinned",e.target.checked)}/> تثبيت العنصر في الرئيسية</label>
      <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:5}}><Btn secondary onClick={()=>setEditor(null)} disabled={saving}>إلغاء</Btn><Btn type="submit" disabled={saving||!esc(form.title)}>{saving?"جارٍ الحفظ…":"حفظ"}</Btn></div>
    </form></div></div>}
  </div>;
}
