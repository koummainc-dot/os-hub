import React,{useEffect,useMemo,useState} from "react";
import {S} from "../../core/ui.jsx";
import {VENTURES_PLATFORM} from "./config.js";
import {loadVenturesSourceSnapshot,sourceSummary,requestVenturesSourceNavigation} from "./integrations.js";
import {loadVenturesMetrics,saveVenturesMetrics,enqueueVenturesMetrics} from "./repository.js";
import {metricDefsForProfile} from "./lookups.js";
import {decisionMetric,ventureAlerts,scorecardFor,portfolioQuestions,suggestCall,canApplyCall,portfolioTrendSeries,missingWeekCount} from "./domain.js";
import {requestVenturesSourceWrite} from "./integrations.js";

const C=(p)=> <div style={{...S.card,padding:p.padding||16,...p.style}}>{p.children}</div>;
const Btn=({children,onClick,primary=false,disabled=false})=><button disabled={disabled} onClick={onClick} style={primary?S.btnA:S.btn}>{children}</button>;
const fmt=n=>n==null||n===""?"—":typeof n==="number"?new Intl.NumberFormat("en-US",{maximumFractionDigits:2}).format(n):String(n);
const money=n=>n==null?"—":new Intl.NumberFormat("en-US",{maximumFractionDigits:0}).format(n);
const statusMeta={active:["يعمل","مستقر"],watch:["يحتاج متابعة","متابعة"],critical:["يحتاج تدخل","حرج"],paused:["متوقف","متوقف"]};

function metricHistory(metrics,projectId,key){
  return metrics.filter(x=>x.project_id===projectId&&x.key===key&&x.value_num!=null).slice().sort((a,b)=>String(a.period_start).localeCompare(String(b.period_start)));
}
function projectValues(metrics,projectId){
  const out={};
  metrics.filter(x=>x.project_id===projectId&&x.value_num!=null).forEach(x=>{
    const h=metricHistory(metrics,projectId,x.key);
    if(h.length) out[x.key]=Number(h.at(-1).value_num);
  });
  return out;
}
function projectTrend(metrics,projectId,key){
  const h=metricHistory(metrics,projectId,key);
  if(h.length<2)return null;
  const a=Number(h.at(-2).value_num),b=Number(h.at(-1).value_num);
  return a===0?null:(b-a)/Math.abs(a);
}
function diagnoseProject(p,metrics){
  const values=projectValues(metrics,p.project_id);
  const defs=metricDefsForProfile(p,{basicOnly:false,periodType:"W"})||[];
  const scoreDefs=scorecardFor(p,defs).filter(d=>d.kind!=="text"&&d.kind!=="bool").slice(0,12);
  const evaluated=scoreDefs.map(d=>{
    const current=values[d.key];
    const trend=projectTrend(metrics,p.project_id,d.key);
    const adverse=trend!=null&&((d.better==="up"&&trend<0)||(d.better==="down"&&trend>0));
    return {...d,current,trend,adverse};
  });
  const missing=evaluated.filter(x=>x.current==null).map(x=>x.key);
  const adverse=evaluated.filter(x=>x.adverse);
  const score=Math.max(0,Math.min(100,100-Math.round(adverse.length*12+missing.length*3)));
  const state=score<45?"critical":score<70?"watch":"active";
  const decisionMetricValue=decisionMetric(p,values);
  const suggestion=suggestCall(p,{values,thresholds:p.thresholds||{}});
  return {values,issues:adverse.map(x=>({key:x.key,label:x.label,trend:x.trend})),score,state,missing,scorecard:evaluated,decisionMetricValue,suggestion};
}
function scoreProject(p,metrics){return diagnoseProject(p,metrics).score;}
function portfolioDecision(p,metrics){const d=diagnoseProject(p,metrics);return d.suggestion?.decision?{decision:d.suggestion.decision,reason:d.suggestion.reason}:{decision:null,reason:"لا توجد عتبات قرار كافية للحسم"};}
function buildPortfolioContext(projects,metrics){
  const values=Object.fromEntries(projects.map(p=>[p.id||p.project_id,projectValues(metrics,p.project_id)]));
  const enriched=projects.map(p=>({...p,health:diagnoseProject(p,metrics).state,decision_metric_key:decisionMetric(p,values[p.id||p.project_id]).key,decision_metric:decisionMetric(p,values[p.id||p.project_id]).value}));
  return {projects:enriched,values};
}function buildAlertContext(projects,metrics,portfolioCalls){
  const base=buildPortfolioContext(projects,metrics);
  const now=Date.now();
  base.projects.forEach(p=>{
    const pid=p.id||p.project_id;
    const v=base.values[pid]||{};
    const h=metrics.filter(x=>x.project_id===p.project_id&&x.value_num!=null).sort((a,b)=>String(b.period_start).localeCompare(String(a.period_start)));
    const latest=h[0]?.period_start;
    if(latest)v.week_missing_after_days=Math.floor((now-new Date(latest).getTime())/86400000)>3;
    const lastCall=portfolioCalls.filter(x=>x.project_id===p.project_id&&!x._deleted_at).sort((a,b)=>String(b.created_at||"").localeCompare(String(a.created_at||"")))[0];
    v.review_overdue=!!(lastCall?.next_review_date&&new Date(lastCall.next_review_date+"T23:59:59").getTime()<now&&lastCall.status==="approved");
  });
  return base;
}
function reconcileAlerts(existing,generated){
  const byKey=new Map((existing||[]).filter(x=>!x._deleted_at).map(x=>[x.key,x]));
  generated.forEach(a=>{
    const old=byKey.get(a.key);
    if(old&&old.status==="snoozed"&&old.snooze_until&&new Date(old.snooze_until).getTime()>Date.now())return;
    byKey.set(a.key,{...(old||{}),...a,status:old?.status==="dismissed"?"dismissed":"active",updated_at:new Date().toISOString()});
  });
  return [...byKey.values()];
}

function ProjectCard({p,metrics,onOpen}){
  const score=scoreProject(p,metrics);
  const state=score<50?"critical":score<70?"watch":"active";
  const meta=statusMeta[state];
  const diagnosis=diagnoseProject(p,metrics);
  return <button onClick={onOpen} style={{...S.card,padding:16,textAlign:"right",cursor:"pointer",border:"1px solid #E5E7EB",background:"#fff"}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"start"}}>
      <div><div style={{fontSize:10,color:"#0F766E",fontWeight:800}}>{p.code||p.unit_code||"VENTURE"}</div><div style={{fontSize:17,fontWeight:850,marginTop:4}}>{p.name||p.project_id}</div><div style={{fontSize:11,color:"#64748B",marginTop:4}}>{p.kind||p.subtype||"مشروع تجاري"}</div></div>
      <div style={{width:52,height:52,borderRadius:999,display:"grid",placeItems:"center",background:"#F1F5F9",fontWeight:900,color:state==="critical"?"#B91C1C":state==="watch"?"#B45309":"#0F766E"}}>{score}</div>
    </div>
    <div style={{display:"flex",justifyContent:"space-between",marginTop:14,fontSize:10}}><span>{meta[0]}</span><span style={{color:"#64748B"}}>{diagnosis.issues.length?`${diagnosis.issues.length} إشارات سلبية`:"لا توجد إشارة قوية"}</span></div>
  </button>
}
function quarterlyReview(projects,metrics,calls){
  const now=new Date(), quarter=Math.floor(now.getMonth()/3)+1, year=now.getFullYear();
  const start=new Date(year,(quarter-1)*3,1);
  const end=new Date(year,quarter*3,0);
  const inQuarter=calls.filter(c=>{const d=new Date(c.created_at||0);return d>=start&&d<=end});
  const rows=projects.map(p=>{const d=diagnoseProject(p,metrics);return {project:p,diagnosis:d,lastCall:inQuarter.filter(c=>c.project_id===p.project_id).sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)))[0]};});
  return {year,quarter,rows,inQuarter};
}
function QuarterlyReview({projects,metrics,calls}){
  const report=quarterlyReview(projects,metrics,calls);
  const exportReport=()=>{
    const lines=["project,score,state,decision,last_review"];
    report.rows.forEach(r=>lines.push([r.project.name||r.project.project_id,r.diagnosis.score,r.diagnosis.state,r.lastCall?.decision||"",r.lastCall?.next_review_date||""].map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")));
    const blob=new Blob([lines.join("\n")],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`ventures-quarterly-${report.year}-Q${report.quarter}.csv`;a.click();URL.revokeObjectURL(url);
  };
  return <div style={{marginTop:14,padding:12,border:"1px solid #E5E7EB",borderRadius:10}}><div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}><div><b>المراجعة الربع سنوية · {report.year} Q{report.quarter}</b><div style={{fontSize:10,color:"#64748B",marginTop:3}}>ملخص المحفظة والقرارات المسجلة في الربع الحالي.</div></div><Btn onClick={exportReport}>تصدير التقرير CSV</Btn></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:8,marginTop:10}}><div><b>{report.rows.length}</b><div style={{fontSize:9,color:"#64748B"}}>مشاريع</div></div><div><b>{report.rows.filter(x=>x.diagnosis.state==="critical").length}</b><div style={{fontSize:9,color:"#64748B"}}>حرجة</div></div><div><b>{report.rows.filter(x=>x.diagnosis.state==="watch").length}</b><div style={{fontSize:9,color:"#64748B"}}>تحتاج متابعة</div></div><div><b>{report.inQuarter.length}</b><div style={{fontSize:9,color:"#64748B"}}>قرارات هذا الربع</div></div></div></div>
}
function ProjectView({project,metrics,setPage,workspaceId,onBack,save,data,portfolioCalls=[]}){
  const [decisionOpen,setDecisionOpen]=useState(false);
  const [decisionReason,setDecisionReason]=useState("");
  const [reviewDate,setReviewDate]=useState("");
  const [owner,setOwner]=useState("");
  const [followups,setFollowups]=useState(true);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const applyDecision=async()=>{
    const d=portfolioDecision(project,metrics);
    if(!d.decision||!decisionReason.trim()||!reviewDate){setMessage("القرار يحتاج سببًا وموعد مراجعة.");return}
    const evidence={decision_metric_key:diagnosis.decisionMetricValue.key,decision_metric_value:diagnosis.decisionMetricValue.value,issues:diagnosis.issues.slice(0,5),last4:diagnosis.scorecard?.map(x=>({key:x.key,current:x.current,trend:x.trend})).slice(0,8)};
    const call={id:`pc_${project.project_id}_${new Date().toISOString().slice(0,10).replaceAll("-","")}_${Date.now()}`,project_id:project.project_id,decision:d.decision,reason:decisionReason.trim(),evidence,next_review_date:reviewDate,owner:owner.trim()||null,create_followups:followups,status:"approved",created_at:new Date().toISOString(),source:"ventures_engine"};
    const transition=canApplyCall(project,call,{});
    if(!transition.ok){setMessage(transition.error||"الانتقال غير مسموح.");return}
    setBusy(true);setMessage("");
    try{
      await save({...data,portfolio_calls:[...(portfolioCalls||[]),call]});
      const effectPayload={project_id:project.project_id,decision:d.decision,transition,reason:call.reason,next_review_date:reviewDate,owner:call.owner,create_followups:followups,evidence};
      const dispatched=requestVenturesSourceWrite({workspaceId,systemId:"projects",action:"apply_ventures_decision",recordId:project.project_id,payload:effectPayload});
      setMessage(dispatched?"تم اعتماد القرار وتوجيه أثره إلى Projects.":"تم حفظ القرار، لكن تعذر توجيه أثره إلى Projects.");
      setDecisionOpen(false);
    }catch(e){setMessage("تعذر حفظ القرار.");}finally{setBusy(false);}
  };
  const defs=metricDefsForProfile(project,{basicOnly:true,periodType:"W"})||[];
  const vals=Object.fromEntries(metrics.filter(x=>x.project_id===project.project_id).map(x=>[x.key,x.value_num]));
  const diagnosis=diagnoseProject(project,metrics);
  const alerts=diagnosis.issues.slice(0,5);
  const values=diagnosis.values;
  const decision=portfolioDecision(project,metrics);
  const latestCall=portfolioCalls.filter(x=>x.project_id===project.project_id&&!x._deleted_at).sort((a,b)=>String(b.created_at||"").localeCompare(String(a.created_at||"")))[0];

  return <div dir="rtl">
    <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:12}}><Btn onClick={onBack}>← المحفظة</Btn><span style={{fontSize:11,color:"#64748B"}}>{project.code||project.project_id}</span></div>
    <C style={{marginBottom:12}}>
      <div style={{fontSize:10,color:"#0F766E",fontWeight:800}}>VENTURE WORKSPACE</div>
      <h1 style={{margin:"5px 0",fontSize:28}}>{project.name||project.project_id}</h1>
      <div style={{color:"#64748B",fontSize:12}}>{project.kind||project.subtype||"مشروع تجاري"} · {project.currency||"عملة غير محددة"}</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:15}}>
        <Btn primary onClick={()=>setPage("entry")}>إدخال الأداء الأسبوعي</Btn>
        <Btn onClick={()=>setPage("decisions")}>القرارات</Btn>
        <Btn onClick={()=>requestVenturesSourceNavigation({workspaceId,systemId:"projects",section:"projects",recordId:project.project_id})}>فتح في Projects</Btn>
      </div>
    </C>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10,marginBottom:12}}>
      <C><div style={{fontSize:10,color:"#64748B"}}>المؤشرات المسجلة</div><b style={{fontSize:24}}>{Object.values(vals).filter(v=>v!=null).length}</b></C>
      <C><div style={{fontSize:10,color:"#64748B"}}>مؤشرات أساسية</div><b style={{fontSize:24}}>{defs.length}</b></C>
      <C><div style={{fontSize:10,color:"#64748B"}}>الحالة</div><b style={{fontSize:20,color:"#0F766E"}}>تحتاج قراءة أسبوعية</b></C>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"minmax(0,2fr) minmax(280px,1fr)",gap:12}}>
      <C><h3 style={{marginTop:0}}>أداء المشروع</h3><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:8}}>{defs.slice(0,8).map(d=>{const v=values[d.key];const t=projectTrend(metrics,project.project_id,d.key);const adverse=t!=null&&((d.better==="up"&&t<0)||(d.better==="down"&&t>0));return <div key={d.key} style={{padding:12,border:"1px solid #E5E7EB",borderRadius:10}}><div style={{fontSize:10,color:"#64748B"}}>{d.label}</div><div style={{fontSize:20,fontWeight:850,marginTop:5}}>{fmt(v)} <small style={{fontSize:9,color:"#94A3B8"}}>{d.unit||""}</small></div>{t!=null&&<div style={{fontSize:9,color:adverse?"#B45309":"#64748B",marginTop:3}}>{t>0?"↑":"↓"} {Math.abs(t*100).toFixed(1)}%</div>}</div>})}</div></C>
      <C><h3 style={{marginTop:0}}>التشخيص</h3>{alerts.length?alerts.map(x=><div key={x.key} style={{padding:"10px 0",borderBottom:"1px solid #E5E7EB"}}><b>{x.label}</b><div style={{fontSize:10,color:"#B45309",marginTop:3}}>الاتجاه {x.trend>0?"↑":"↓"} مقارنة بالفترة السابقة</div></div>):<div style={{fontSize:12,color:"#64748B"}}>لا توجد إشارة اتجاه قوية من البيانات الحالية.</div>}<div style={{marginTop:12,padding:10,borderRadius:10,background:"#F8FAFC"}}><b>القرار المقترح: {decision.decision||"غير كافٍ للحسم"}</b><div style={{fontSize:10,color:"#64748B",marginTop:4}}>{decision.reason}</div>{diagnosis.decisionMetricValue.key&&<div style={{fontSize:10,color:"#64748B",marginTop:4}}>مؤشر القرار: {diagnosis.decisionMetricValue.key} = {fmt(diagnosis.decisionMetricValue.value)}</div>}{latestCall&&<div style={{fontSize:10,color:"#0F766E",marginTop:4}}>آخر قرار: {latestCall.decision} · مراجعة {latestCall.next_review_date||"—"}</div>}{decision.decision&&<div style={{marginTop:8}}><Btn primary onClick={()=>setDecisionOpen(true)}>اعتماد القرار</Btn></div>}{message&&<div style={{fontSize:10,color:"#0F766E",marginTop:5}}>{message}</div>}</div>
{decisionOpen&&<div style={{position:"fixed",inset:0,zIndex:6000,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center",padding:18}}><div style={{...S.card,width:"min(620px,100%)",padding:20}}><h3 style={{marginTop:0}}>اعتماد قرار {decision.decision}</h3><div style={{fontSize:11,color:"#64748B",marginBottom:12}}>القرار لا يغيّر المشروع تلقائيًا من المحرك؛ بعد الاعتماد يرسل الأثر المسموح إلى Projects.</div><div style={{display:"grid",gap:10}}><label style={{fontSize:11,fontWeight:700}}>السبب *<textarea style={{...S.input,minHeight:80,marginTop:5}} value={decisionReason} onChange={e=>setDecisionReason(e.target.value)} placeholder="لماذا اتخذت هذا القرار؟"/></label><label style={{fontSize:11,fontWeight:700}}>موعد المراجعة القادمة *<input type="date" style={{...S.input,marginTop:5}} value={reviewDate} onChange={e=>setReviewDate(e.target.value)}/></label><label style={{fontSize:11,fontWeight:700}}>المسؤول<input style={{...S.input,marginTop:5}} value={owner} onChange={e=>setOwner(e.target.value)} placeholder="البريد أو معرف العضو"/></label><label style={{display:"flex",gap:8,alignItems:"center",fontSize:11}}><input type="checkbox" checked={followups} onChange={e=>setFollowups(e.target.checked)}/> أنشئ مهام المتابعة</label></div><div style={{display:"flex",gap:8,marginTop:15}}><Btn primary disabled={busy} onClick={applyDecision}>{busy?"جارٍ الاعتماد…":"اعتماد وتسجيل القرار"}</Btn><Btn onClick={()=>setDecisionOpen(false)}>إلغاء</Btn></div></div></div>}</C>
    </div>
    <C style={{marginTop:12}}><h3 style={{marginTop:0}}>تشغيل المشروع</h3><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8}}>{[["dashboard","المحفظة"],["entry","الإدخال الأسبوعي"],["projects","المشاريع"],["money","المال"],["channels","القنوات"],["seo","SEO"],["growth","النمو والتجارب"],["catalog","الكتالوج"],["compliance","الامتثال"],["tools","الأدوات"],["decisions","القرارات"],["email","البريد"]].map(([id,l])=><button key={id} onClick={()=>setPage(id)} style={{...S.card,padding:12,textAlign:"right",cursor:"pointer",background:"#FAFAFA"}}><b>{l}</b><div style={{fontSize:9,color:"#64748B",marginTop:3}}>إدارة هذا الجانب</div></button>)}</div></C>
  </div>
}
const CANONICAL_SCREENS=[["dashboard","المحفظة"],["entry","الإدخال الأسبوعي"],["projects","المشاريع"],["money","المال"],["channels","القنوات"],["seo","SEO"],["growth","النمو والتجارب"],["catalog","الكتالوج"],["compliance","الامتثال"],["tools","الأدوات"],["decisions","القرارات"],["import","الاستيراد"],["settings","الإعدادات"],["email","البريد"]];
function CanonicalScreen({page,projects,metrics,data,setData,setSelected,setPage,source,save,workspaceId}){
 const [draft,setDraft]=useState({}),[notice,setNotice]=useState("");\n useEffect(()=>{if(typeof window==="undefined")return;const handler=e=>{const d=e?.detail||{};if(d.workspaceId&&String(d.workspaceId)!==String(workspaceId))return;if(d.systemId==="finance"&&d.source!=="ventures")return;if(d.systemId==="finance"&&d.action){setNotice(d.ok?"تم تنفيذ العملية داخل Finance.":("تعذر تنفيذ العملية داخل Finance: "+(d.error||"خطأ غير معروف")));}};window.addEventListener("os:source-write-result",handler);return()=>window.removeEventListener("os:source-write-result",handler)},[workspaceId]);
 const rows=k=>Array.isArray(data[k])?data[k].filter(x=>!x._deleted_at):[];
 const add=async(k,extra={})=>{const row={id:k+"_"+Date.now(),...draft,...extra,created_at:new Date().toISOString()};const next={...data,[k]:[...rows(k),row]};try{await save(next);setData(next);setDraft({});setNotice("تم الحفظ.");}catch(e){setNotice("تعذر الحفظ؛ لم يتم اعتبار العملية مكتملة.");}};
 const input=(k,l,t="text")=><label style={{fontSize:10,fontWeight:700}}>{l}<input type={t} style={{...S.input,marginTop:4}} value={draft[k]||""} onChange={e=>setDraft(v=>({...v,[k]:e.target.value}))}/></label>;
 if(page==="dashboard")return <><C><b>VENTURES OS · المحفظة</b><h2 style={{margin:"5px 0"}}>لوحة المحفظة</h2><div style={{fontSize:11,color:"#64748B"}}>مشاريع {projects.length} · مؤشرات {metrics.length} · Projects {source.projects||0} · Finance {source.finance||0} · ContentOS {source.content||0}</div></C><C><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:10}}>{projects.slice(0,8).map(p=><ProjectCard key={p.id||p.project_id} p={p} metrics={metrics} onOpen={()=>setSelected(p)}/>)}</div></C></>;
 if(page==="entry")return <C><h2 style={{marginTop:0}}>الإدخال الأسبوعي</h2><div style={{overflowX:"auto"}}><table style={{width:"100%",fontSize:10}}><thead><tr><th>المشروع</th>{(metricDefsForProfile(projects[0]||{}, {basicOnly:true,periodType:"W"})||[]).slice(0,8).map(d=><th key={d.key}>{d.label}</th>)}</tr></thead><tbody>{projects.map(p=><tr key={p.project_id}><td>{p.name||p.project_id}</td>{(metricDefsForProfile(p,{basicOnly:true,periodType:"W"})||[]).slice(0,8).map(d=><td><input style={{...S.input,width:80}} data-pid={p.project_id} data-key={d.key}/></td>)}</tr>)}</tbody></table></div><Btn primary onClick={async()=>{const periodStart=new Date();periodStart.setDate(periodStart.getDate()-periodStart.getDay());const cells=[...document.querySelectorAll("input[data-pid]")].filter(x=>x.value!=="");const rows=cells.map(x=>({workspace_id:workspaceId,project_id:x.dataset.pid,key:x.dataset.key,period_type:"W",period_start:periodStart.toISOString().slice(0,10),value_num:Number(String(x.value).replace("٫",".").replace(",",".")),source:"manual"}));if(rows.some(x=>!Number.isFinite(x.value_num))){setNotice("يوجد رقم غير صالح.");return;}if(!rows.length){setNotice("لا توجد قيم للحفظ.");return;}const r=await saveVenturesMetrics(workspaceId,rows);if(r.ok){setNotice("تم حفظ دفعة الأداء الأسبوعي.");return;}enqueueVenturesMetrics(workspaceId,rows);setNotice("تعذر الاتصال بقاعدة البيانات؛ تم وضع الدفعة في طابور الاستعادة.");}}>{notice?"حفظ/إعادة التحقق":"حفظ الدفعة"}</Btn>{notice&&<div style={{fontSize:10,color:notice.includes("تم حفظ")?"#0F766E":"#B45309",marginTop:6}}>{notice}</div>}</C>;
  if(page==="projects")return <><C><h2 style={{marginTop:0}}>المشاريع</h2><div style={{fontSize:11,color:"#64748B"}}>Ventures لا يملك سجل المشروع الأصلي؛ Projects هو المالك. الإنشاء من هنا يرسل العملية مباشرة إلى Projects بدل إنشاء نسخة محلية.</div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:8,marginTop:10}}>{input("name","اسم المشروع")}{input("project_id","Project ID")}{input("kind","النوع")}<Btn primary onClick={()=>{const id=draft.project_id||"vp_"+Date.now();const ok=requestVenturesSourceWrite({workspaceId,systemId:"projects",action:"create",recordId:id,payload:{id,project_id:id,name:draft.name||id,kind:draft.kind||"commercial",status:"active"}});setNotice(ok?"تم إرسال الإنشاء إلى Projects.":"تعذر إرسال الإنشاء إلى Projects.");}}>إنشاء في Projects</Btn></div>{notice&&<div style={{fontSize:10,color:"#0F766E",marginTop:8}}>{notice}</div>}</C><C><div style={{fontSize:11,color:"#64748B"}}>المشاريع المعروضة هنا هي سجلات Ventures الحالية. بعد إنشاء مشروع في Projects أعد فتح الشاشة لتحديث المصدر.</div>{rows("profiles").map(p=><div key={p.id} style={{padding:8,borderBottom:"1px solid #E5E7EB",display:"flex",justifyContent:"space-between"}}><span><b>{p.name||p.project_id}</b> · {p.kind||"—"}</span><Btn onClick={()=>setSelected(p)}>فتح</Btn></div>)}</C></>;
 if(page==="money")return <><C><h2 style={{marginTop:0}}>المال</h2><div style={{fontSize:11,color:"#64748B"}}>الأداء المالي يُقرأ من Ventures metrics، أما دفتر الحركات الفعلي فيملكه Finance. زر التسجيل أدناه يرسل الحركة إلى Finance مباشرة.</div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8,marginTop:10}}>{input("project_id","Project ID")}{input("type","Revenue أو Expense")}{input("amount","المبلغ","number")}{input("local_date","التاريخ","date")}{input("note","ملاحظة")}<Btn primary onClick={()=>{const amount=Number(draft.amount);const type=draft.type==="Revenue"||draft.type==="Expense"?draft.type:null;if(!workspaceId||!type||!(amount>0)||!draft.local_date){setNotice("أكمل المشروع والنوع والمبلغ والتاريخ.");return;}const ok=requestVenturesSourceWrite({workspaceId,systemId:"finance",action:"create",recordId:"vf_"+Date.now(),payload:{type,amount,local_date:draft.local_date,name:draft.name||"حركة من Ventures",note:draft.note||"",currency:projects.find(p=>p.project_id===draft.project_id)?.currency||undefined}});setNotice(ok?"تم إرسال الحركة إلى Finance.":"تعذر إرسال الحركة إلى Finance.");}}>تسجيل في Finance</Btn></div>{notice&&<div style={{fontSize:10,color:notice.includes("تعذر")?"#B45309":"#0F766E",marginTop:8}}>{notice}</div>}</C><C>{projects.map(p=><div key={p.project_id} style={{padding:10,borderBottom:"1px solid #E5E7EB"}}><b>{p.name||p.project_id}</b><div style={{fontSize:10}}>Revenue {fmt(projectValues(metrics,p.project_id).revenue)} · Net profit {fmt(projectValues(metrics,p.project_id).net_profit)}</div></div>)}</C></>;
 if(page==="channels")return <><C><h2 style={{marginTop:0}}>القنوات</h2><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8}}>{input("name","الحملة")}{input("source","Source")}{input("medium","Medium")}{input("sessions","Sessions","number")}{input("revenue","Revenue","number")}<Btn primary onClick={()=>add("campaigns")}>حفظ الحملة</Btn></div></C><C>{rows("campaigns").map(x=><div key={x.id} style={{padding:8,borderBottom:"1px solid #E5E7EB"}}>{x.name} · {x.source}/{x.medium} · {x.sessions||0} sessions · {x.revenue||0}</div>)}</C></>;
 if(page==="seo")return <><C><h2 style={{marginTop:0}}>SEO</h2><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:8}}>{input("project_id","Project ID")}{input("keyword","Keyword")}{input("status","Status")}<Btn primary onClick={()=>add("seo_items",{module:"keywords"})}>حفظ</Btn></div></C><C>{rows("seo_items").map(x=><div key={x.id} style={{padding:8}}>{x.project_id} · {x.keyword} · {x.status}</div>)}</C></>;
 if(page==="growth")return <><C><h2 style={{marginTop:0}}>النمو والتجارب</h2><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:8}}>{input("project_id","Project ID")}{input("title","التجربة")}{input("status","الحالة")}{input("result","النتيجة")}<Btn primary onClick={()=>add("growth_items",{module:"experiment"})}>حفظ التجربة</Btn></div></C><C>{rows("growth_items").map(x=><div key={x.id} style={{padding:8}}>{x.project_id} · {x.title} · {x.status}</div>)}</C></>;
 if(page==="catalog")return <><C><h2 style={{marginTop:0}}>الكتالوج</h2><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8}}>{input("project_id","Project ID")}{input("name","المنتج")}{input("sku","SKU")}{input("price","السعر","number")}<Btn primary onClick={()=>add("products")}>حفظ المنتج</Btn></div></C><C>{rows("products").map(x=><div key={x.id} style={{padding:8}}>{x.name} · {x.sku} · {x.price}</div>)}</C></>;
 if(page==="compliance")return <><C><h2 style={{marginTop:0}}>الامتثال</h2><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8}}>{input("project_id","Project ID")}{input("title","البند")}{input("status","الحالة")}<Btn primary onClick={()=>add("compliance_items")}>حفظ البند</Btn></div></C><C>{rows("compliance_items").map(x=><div key={x.id} style={{padding:8}}>{x.title} · {x.status}</div>)}</C></>;
 if(page==="tools")return <><C><h2 style={{marginTop:0}}>الأدوات</h2><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8}}>{input("source","UTM Source")}{input("medium","UTM Medium")}{input("campaign","UTM Campaign")}<Btn primary onClick={()=>add("tool_codes",{code:"utm_source="+(draft.source||"")+"&utm_medium="+(draft.medium||"")+"&utm_campaign="+(draft.campaign||"")})}>حفظ UTM</Btn></div></C><C>{rows("tool_codes").map(x=><div key={x.id} style={{padding:8}}>{x.code}</div>)}</C></>;
 if(page==="decisions")return <C><h2 style={{marginTop:0}}>القرارات</h2><div style={{fontSize:11,color:"#64748B",marginBottom:10}}>الاقتراح من محرك Ventures؛ الاعتماد الفعلي يسجل portfolio_call ثم يرسل أثر القرار إلى Projects.</div>{projects.map(p=>{const d=diagnoseProject(p,metrics);return <div key={p.project_id} style={{padding:10,borderBottom:"1px solid #E5E7EB",display:"flex",justifyContent:"space-between"}}><span><b>{p.name||p.project_id}</b> · {d.suggestion?.decision||"غير كافٍ"}</span><Btn primary onClick={()=>setSelected(p)}>فتح التشخيص</Btn></div>})}</C>;
 if(page==="import")return <C><h2 style={{marginTop:0}}>الاستيراد</h2><div style={{fontSize:11,color:"#64748B"}}>معالج Masterplan الحالي هو نقطة التنفيذ الذري؛ لن نكرر منطق الاستيراد هنا.</div><Btn primary onClick={()=>setPage("masterplan")}>فتح معالج Masterplan</Btn></C>;
 if(page==="settings")return <C><h2 style={{marginTop:0}}>الإعدادات</h2><textarea style={{...S.input,minHeight:180,fontFamily:"monospace"}} value={JSON.stringify(data.ventures_settings||{},null,2)} onChange={e=>{try{setData({...data,ventures_settings:JSON.parse(e.target.value)})}catch{}}}/><div style={{marginTop:8}}><Btn primary onClick={async()=>{await save({...data});setNotice("تم حفظ الإعدادات.")}}>حفظ</Btn></div></C>;
 if(page==="email")return <><C><h2 style={{marginTop:0}}>البريد</h2><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8}}>{input("name","الحملة")}{input("project_id","Project ID")}{input("type","النوع")}{input("goal","الهدف")}<Btn primary onClick={()=>add("email_campaigns",{status:"Draft",sent:0,delivered:0,opens:0,clicks:0,unsubs:0,bounces_hard:0,bounces_soft:0,conversions:0,revenue:0})}>حفظ الحملة</Btn></div></C><C>{rows("email_campaigns").map(x=><div key={x.id} style={{padding:8}}><b>{x.name}</b> · {x.status} · Delivery {x.sent?((x.delivered||0)/x.sent*100).toFixed(1):0}% · CTR {x.delivered?((x.clicks||0)/x.delivered*100).toFixed(1):0}%</div>)}</C></>;
 return null;
}
export default function VenturesRealWorkspace({api,access,page,setPage,ws}){
  const [data,setData]=useState({}); const [metrics,setMetrics]=useState([]); const [source,setSource]=useState({}); const [selected,setSelected]=useState(null); const [view,setView]=useState(page||"dashboard"); const [q,setQ]=useState(""); const [loading,setLoading]=useState(true);
  useEffect(()=>{let alive=true;(async()=>{try{const r=await api.load();if(alive)setData(r?.data||{});const snap=await loadVenturesSourceSnapshot(ws?.id);if(alive)setSource(sourceSummary(snap));const m=await loadVenturesMetrics(ws?.id,{periodType:"W"});if(alive)setMetrics(m?.rows||[]);}finally{if(alive)setLoading(false)}})();return()=>{alive=false}},[api,ws?.id]);
  const projects=useMemo(()=>Array.isArray(data.profiles)?data.profiles.filter(x=>!x._deleted_at):[],[data]);
  const portfolioCalls=useMemo(()=>Array.isArray(data.portfolio_calls)?data.portfolio_calls.filter(x=>!x._deleted_at):[],[data]);
  const saveWithData=async(next)=>{await api.save(next);setData(next);};
  const filtered=projects.filter(p=>JSON.stringify(p).toLowerCase().includes(q.toLowerCase()));
  const totalRevenue=metrics.filter(x=>x.key==="revenue").reduce((s,x)=>s+(Number(x.value_num)||0),0);
  const diagnoses=projects.map(p=>({p,d:diagnoseProject(p,metrics)}));
  const needsAttention=diagnoses.filter(x=>x.d.score<70).map(x=>x.p);
  const portfolioCtx=buildPortfolioContext(projects,metrics);
  const questions=portfolioQuestions(portfolioCtx);
  const alertCtx=buildAlertContext(projects,metrics,portfolioCalls);
  const engineAlerts=ventureAlerts(ws?.user_id||"current",alertCtx);
  const storedAlerts=Array.isArray(data.venture_alerts)?data.venture_alerts:[];
  const alerts=useMemo(()=>reconcileAlerts(storedAlerts,engineAlerts),[storedAlerts,engineAlerts]);
  const activeAlerts=alerts.filter(a=>a.status==="active" || (a.status==="snoozed" && a.snooze_until && new Date(a.snooze_until).getTime()<=Date.now()));
  const missingWeeks=missingWeekCount(projects,metrics,3);
  const trend=portfolioTrendSeries(projects,metrics,"revenue",12);
  const go=v=>{setView(v);setPage(v)};
  useEffect(()=>{if(page&&CANONICAL_SCREENS.some(([id])=>id===page))setView(page)},[page]);
  if(loading)return <div dir="rtl" style={{padding:40,textAlign:"center"}}>جاري تجهيز محفظة المشاريع…</div>;
  if(selected)return <ProjectView project={selected} metrics={metrics} setPage={setPage} workspaceId={ws?.id} onBack={()=>setSelected(null)} save={saveWithData} data={data} portfolioCalls={portfolioCalls}/>;
  return <div dir="rtl">
    <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 300px",gap:12,alignItems:"stretch"}}>
      <C style={{padding:22,background:"linear-gradient(135deg,#0F766E 0%,#134E4A 100%)",color:"#fff"}}>
        <div style={{fontSize:10,fontWeight:800,opacity:.85}}>VENTURES OS</div>
        <h1 style={{fontSize:30,margin:"6px 0"}}>محفظة المشاريع التجارية</h1>
        <div style={{fontSize:12,opacity:.9,maxWidth:700}}>مكان واحد لمعرفة ماذا يحدث في مشاريعك، ما الذي يحتاج تدخلك، وما القرار التالي — بدون إعادة بناء بيانات Projects وFinance وContent.</div>
        <div style={{display:"flex",gap:8,marginTop:16,flexWrap:"wrap"}}><Btn primary onClick={()=>setPage("entry")}>أدخل أرقام هذا الأسبوع</Btn><Btn onClick={()=>setPage("portfolio")}>راجع القرارات</Btn></div>
      </C>
      <C style={{display:"grid",gap:10}}>
        <div><div style={{fontSize:10,color:"#64748B"}}>مشاريع المحفظة</div><b style={{fontSize:28}}>{projects.length}</b></div>
        <div><div style={{fontSize:10,color:"#64748B"}}>تحتاج انتباه</div><b style={{fontSize:28,color:needsAttention.length?"#B45309":"#0F766E"}}>{needsAttention.length}</b></div>
        <div><div style={{fontSize:10,color:"#64748B"}}>Revenue المسجل</div><b style={{fontSize:24}}>{money(totalRevenue)}</b></div>
      </C>
    </div>
    <div style={{display:"flex",gap:6,margin:"12px 0",overflowX:"auto"}}>{CANONICAL_SCREENS.map(([id,l])=><button key={id} onClick={()=>go(id)} style={{...S.btn,background:view===id?"#0F766E":"#fff",color:view===id?"#fff":"#57606A",whiteSpace:"nowrap"}}>{l}</button>)}</div>
    {view==="portfolio"&&<div>
      <C style={{marginBottom:12}}><div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center"}}><div><h2 style={{margin:"0 0 4px"}}>قراءة المحفظة</h2><div style={{fontSize:11,color:"#64748B"}}>ابدأ بالمشاريع التي تحتاج قرارًا، وليس بجداول البيانات.</div></div><input style={{...S.input,maxWidth:280}} placeholder="ابحث عن مشروع…" value={q} onChange={e=>setQ(e.target.value)}/></div></C>
      {(needsAttention.length>0||activeAlerts.length>0)&&<C style={{marginBottom:12,border:"1px solid #FDE68A",background:"#FFFBEB"}}>
<div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}><div><b>تحتاج تدخل الآن</b><div style={{fontSize:10,color:"#64748B",marginTop:4}}>{activeAlerts.length} تنبيه نشط · dedupe تلقائي</div></div><Btn onClick={()=>saveWithData({...data,venture_alerts:alerts.map(a=>({...a,status:"dismissed",dismissed_at:new Date().toISOString()}))})}>إخفاء التنبيهات</Btn></div>
<div style={{display:"grid",gap:8,marginTop:10}}>{activeAlerts.slice(0,8).map(a=><div key={a.key} style={{padding:10,border:"1px solid #FDE68A",borderRadius:10,background:"#fff"}}><div style={{display:"flex",justifyContent:"space-between",gap:8}}><div><b>{a.title}</b><div style={{fontSize:10,color:"#64748B",marginTop:3}}>{a.severity} · {a.project_id}</div></div><div style={{display:"flex",gap:5}}><Btn onClick={()=>saveWithData({...data,venture_alerts:alerts.map(x=>x.key===a.key?{...x,status:"snoozed",snooze_until:new Date(Date.now()+7*86400000).toISOString()}:x)})}>تأجيل 7 أيام</Btn><Btn onClick={()=>saveWithData({...data,venture_alerts:alerts.map(x=>x.key===a.key?{...x,status:"dismissed",dismissed_at:new Date().toISOString()}:x)})}>إغلاق</Btn></div></div></div>)}</div>
{needsAttention.length>0&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:8,marginTop:10}}>{needsAttention.slice(0,4).map(p=><button key={p.id} onClick={()=>setSelected(p)} style={{...S.card,padding:12,textAlign:"right",cursor:"pointer"}}><b>{p.name||p.project_id}</b><div style={{fontSize:10,color:"#B45309",marginTop:4}}>افتح التشخيص</div></button>)}</div>}
</C>}}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:10}}>{filtered.map(p=><ProjectCard key={p.id} p={p} metrics={metrics} onOpen={()=>setSelected(p)}/>)}</div>
      {filtered.length===0&&<C><div style={{padding:30,textAlign:"center",color:"#64748B"}}>لا توجد مشاريع مرتبطة بالمحفظة بعد.</div></C>}
    </div>}
    {view==="performance"&&<C><h2 style={{marginTop:0}}>الأداء</h2><div style={{fontSize:12,color:"#64748B",marginBottom:12}}>هذه الصفحة تقرأ مؤشرات Ventures الأسبوعية وتفصل بين الأداء التجاري وصحة التنفيذ في Projects.</div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:8}}>{projects.map(p=><ProjectCard key={p.id} p={p} metrics={metrics} onOpen={()=>setSelected(p)}/>)}</div><div style={{marginTop:14,padding:12,border:"1px solid #E5E7EB",borderRadius:10}}><div style={{display:"flex",justifyContent:"space-between",gap:8}}><div><b>اتجاه الإيراد · آخر 12 أسبوعًا</b><div style={{fontSize:10,color:"#64748B",marginTop:3}}>تجميع المؤشر المسجل من جميع المشاريع.</div></div><span style={{fontSize:11,color:missingWeeks?"#B45309":"#0F766E"}}>{missingWeeks} مشاريع متأخرة عن إدخال الأسبوع</span></div><div style={{display:"flex",alignItems:"end",gap:6,height:150,marginTop:15}}>{trend.length?trend.map(x=>{const max=Math.max(...trend.map(y=>Math.abs(y.value)),1);return <div key={x.period} title={x.period+" · "+fmt(x.value)} style={{flex:1,height:Math.max(6,Math.round(Math.abs(x.value)/max*120)),background:"#0F766E",borderRadius:"6px 6px 0 0",minWidth:8}}/>}):<div style={{color:"#64748B",fontSize:11}}>لا توجد بيانات إيراد كافية للرسم.</div>}</div></div><div style={{marginTop:14,padding:12,border:"1px solid #E5E7EB",borderRadius:10}}><b>Scorecards · حالة كل مشروع</b><div style={{display:"grid",gap:8,marginTop:10}}>{diagnoses.map(({p,d})=>{const required=(d.scorecard||[]).filter(x=>x.required);const missing=required.filter(x=>x.current==null);return <div key={p.project_id} style={{display:"grid",gridTemplateColumns:"minmax(180px,1fr) 90px 1fr",gap:10,alignItems:"center",padding:"8px 0",borderBottom:"1px solid #F1F5F9"}}><b>{p.name||p.project_id}</b><span style={{fontWeight:800}}>{d.score}/100</span><span style={{fontSize:10,color:missing.length?"#B45309":"#0F766E"}}>{missing.length ? "ناقص "+missing.length+" مؤشرات أساسية" : "مكتمل للمؤشرات المتاحة"}</span></div>})}</div></div></C>}
    {view==="decisions"&&<C><h2 style={{marginTop:0}}>قرارات المحفظة</h2><div style={{fontSize:12,color:"#64748B",marginBottom:12}}>اقتراح → اعتماد → أثر في Projects → مراجعة لاحقة.</div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:8}}>{projects.map(p=>{const d=diagnoseProject(p,metrics);return <div key={p.id||p.project_id} style={{padding:12,border:"1px solid #E5E7EB",borderRadius:10}}><b>{p.name||p.project_id}</b><div style={{fontSize:10,color:"#64748B",marginTop:4}}>Score {d.score} · {d.decisionMetricValue.key||"لا يوجد مؤشر قرار"}</div><div style={{fontSize:11,fontWeight:800,marginTop:7,color:d.suggestion?.decision==="Scale"?"#0F766E":d.suggestion?.decision?"#B45309":"#64748B"}}>{d.suggestion?.decision||"غير كافٍ للحسم"}</div><div style={{fontSize:10,color:"#64748B",marginTop:3}}>{d.suggestion?.reason||"لا توجد عتبات كافية."}</div><div style={{marginTop:8}}><Btn onClick={()=>setSelected(p)}>فتح التشخيص واعتماد</Btn></div></div>})}</div><div style={{marginTop:14,padding:12,background:"#F8FAFC",borderRadius:10,fontSize:11}}><b>أسئلة المحفظة Q1–Q5</b><div style={{marginTop:6}}>Q1 مربح: {questions.q1.length} · Q2 يحتاج مراجعة: {questions.q2.length} · Q3 تركّز الإيراد: {questions.q3.length} · Q4 مرشح للتوسع: {questions.q4.length} · Q5 يحتاج قرار: {questions.q5.length}</div></div><QuarterlyReview projects={projects} metrics={metrics} calls={portfolioCalls}/></C>}
    {view==="operations"&&<C><h2 style={{marginTop:0}}>التشغيل</h2><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:8}}>{[["entry","Weekly Entry"],["projects","Projects"],["finance","Finance"],["content","Content"],["seoAudit","SEO"],["experiments","Experiments"]].map(([id,l])=><button key={id} onClick={()=>setPage(id)} style={{...S.card,padding:14,textAlign:"right",cursor:"pointer"}}><b>{l}</b><div style={{fontSize:10,color:"#64748B",marginTop:4}}>افتح مساحة العمل</div></button>)}</div></C>}
    <CanonicalScreen page={view} projects={projects} metrics={metrics} data={data} setData={setData} setSelected={setSelected} setPage={setPage} source={source} save={saveWithData} workspaceId={ws?.id}/><div style={{marginTop:12,fontSize:10,color:"#64748B"}}>مصادر مرتبطة: Projects {source.projects||0} · ContentOS {source.content||0} · Finance {source.finance||0} · Knowledge {source.knowledge||0}</div>
  </div>
}
