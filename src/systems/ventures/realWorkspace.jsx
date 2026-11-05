import React,{useEffect,useMemo,useState} from "react";
import {S} from "../../core/ui.jsx";
import {VENTURES_PLATFORM} from "./config.js";
import {loadVenturesSourceSnapshot,sourceSummary,requestVenturesSourceNavigation} from "./integrations.js";
import {loadVenturesMetrics} from "./repository.js";
import {metricDefsForProfile} from "./lookups.js";

const C=(p)=> <div style={{...S.card,padding:p.padding||16,...p.style}}>{p.children}</div>;
const Btn=({children,onClick,primary=false,disabled=false})=><button disabled={disabled} onClick={onClick} style={primary?S.btnA:S.btn}>{children}</button>;
const fmt=n=>n==null||n===""?"—":typeof n==="number"?new Intl.NumberFormat("en-US",{maximumFractionDigits:2}).format(n):String(n);
const money=n=>n==null?"—":new Intl.NumberFormat("en-US",{maximumFractionDigits:0}).format(n);
const statusMeta={active:["يعمل","مستقر"],watch:["يحتاج متابعة","متابعة"],critical:["يحتاج تدخل","حرج"],paused:["متوقف","متوقف"]};

function scoreProject(p,metrics){
  const vals=metrics.filter(x=>x.project_id===p.project_id);
  const good=vals.filter(x=>typeof x.value_num==="number").length;
  const risk=vals.filter(x=>x.status==="critical"||x.key?.includes("decline")).length;
  return Math.max(0,Math.min(100,good?Math.round(70+(good>5?10:0)-risk*15):55));
}
function ProjectCard({p,metrics,onOpen}){
  const score=scoreProject(p,metrics);
  const state=score<50?"critical":score<70?"watch":"active";
  const meta=statusMeta[state];
  return <button onClick={onOpen} style={{...S.card,padding:16,textAlign:"right",cursor:"pointer",border:"1px solid #E5E7EB",background:"#fff"}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"start"}}>
      <div><div style={{fontSize:10,color:"#0F766E",fontWeight:800}}>{p.code||p.unit_code||"VENTURE"}</div><div style={{fontSize:17,fontWeight:850,marginTop:4}}>{p.name||p.project_id}</div><div style={{fontSize:11,color:"#64748B",marginTop:4}}>{p.kind||p.subtype||"مشروع تجاري"}</div></div>
      <div style={{width:52,height:52,borderRadius:999,display:"grid",placeItems:"center",background:"#F1F5F9",fontWeight:900,color:state==="critical"?"#B91C1C":state==="watch"?"#B45309":"#0F766E"}}>{score}</div>
    </div>
    <div style={{display:"flex",justifyContent:"space-between",marginTop:14,fontSize:10}}><span>{meta[0]}</span><span style={{color:"#64748B"}}>{meta[1]}</span></div>
  </button>
}
function ProjectView({project,metrics,setPage,workspaceId,onBack}){
  const defs=metricDefsForProfile(project,{basicOnly:true,periodType:"W"})||[];
  const vals=Object.fromEntries(metrics.filter(x=>x.project_id===project.project_id).map(x=>[x.key,x.value_num]));
  const alerts=defs.map(d=>({d,v:vals[d.key]})).filter(x=>x.v!=null).filter(x=>x.d.thresholds && ((x.d.direction==="up"&&x.v<x.d.thresholds.warn)||(x.d.direction==="down"&&x.v>x.d.thresholds.warn))).slice(0,4);
  return <div dir="rtl">
    <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:12}}><Btn onClick={onBack}>← المحفظة</Btn><span style={{fontSize:11,color:"#64748B"}}>{project.code||project.project_id}</span></div>
    <C style={{marginBottom:12}}>
      <div style={{fontSize:10,color:"#0F766E",fontWeight:800}}>VENTURE WORKSPACE</div>
      <h1 style={{margin:"5px 0",fontSize:28}}>{project.name||project.project_id}</h1>
      <div style={{color:"#64748B",fontSize:12}}>{project.kind||project.subtype||"مشروع تجاري"} · {project.currency||"عملة غير محددة"}</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:15}}>
        <Btn primary onClick={()=>setPage("entry")}>إدخال الأداء الأسبوعي</Btn>
        <Btn onClick={()=>setPage("portfolio")}>القرارات</Btn>
        <Btn onClick={()=>requestVenturesSourceNavigation({workspaceId,systemId:"projects",section:"projects",recordId:project.project_id})}>فتح في Projects</Btn>
      </div>
    </C>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10,marginBottom:12}}>
      <C><div style={{fontSize:10,color:"#64748B"}}>المؤشرات المسجلة</div><b style={{fontSize:24}}>{Object.values(vals).filter(v=>v!=null).length}</b></C>
      <C><div style={{fontSize:10,color:"#64748B"}}>مؤشرات أساسية</div><b style={{fontSize:24}}>{defs.length}</b></C>
      <C><div style={{fontSize:10,color:"#64748B"}}>الحالة</div><b style={{fontSize:20,color:"#0F766E"}}>تحتاج قراءة أسبوعية</b></C>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"minmax(0,2fr) minmax(280px,1fr)",gap:12}}>
      <C><h3 style={{marginTop:0}}>أداء المشروع</h3><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:8}}>{defs.slice(0,8).map(d=><div key={d.key} style={{padding:12,border:"1px solid #E5E7EB",borderRadius:10}}><div style={{fontSize:10,color:"#64748B"}}>{d.label}</div><div style={{fontSize:20,fontWeight:850,marginTop:5}}>{fmt(vals[d.key])} <small style={{fontSize:9,color:"#94A3B8"}}>{d.unit||""}</small></div></div>)}</div></C>
      <C><h3 style={{marginTop:0}}>ما يحتاج انتباه</h3>{alerts.length?alerts.map(x=><div key={x.d.key} style={{padding:"10px 0",borderBottom:"1px solid #E5E7EB"}}><b>{x.d.label}</b><div style={{fontSize:10,color:"#B45309",marginTop:3}}>راجع المؤشر هذا الأسبوع</div></div>):<div style={{fontSize:12,color:"#64748B"}}>لا توجد إشارة خطر من البيانات الحالية.</div>}</C>
    </div>
    <C style={{marginTop:12}}><h3 style={{marginTop:0}}>تشغيل المشروع</h3><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8}}>{[["strategy","الاستراتيجية"],["competitors","المنافسون"],["experiments","التجارب"],["seoAudit","SEO"],["content","المحتوى"],["products","المنتجات"],["finance","المال"],["compliance","الامتثال"]].map(([id,l])=><button key={id} onClick={()=>setPage(id)} style={{...S.card,padding:12,textAlign:"right",cursor:"pointer",background:"#FAFAFA"}}><b>{l}</b><div style={{fontSize:9,color:"#64748B",marginTop:3}}>إدارة هذا الجانب</div></button>)}</div></C>
  </div>
}
export default function VenturesRealWorkspace({api,access,page,setPage,ws}){
  const [data,setData]=useState({}); const [metrics,setMetrics]=useState([]); const [source,setSource]=useState({}); const [selected,setSelected]=useState(null); const [view,setView]=useState("portfolio"); const [q,setQ]=useState(""); const [loading,setLoading]=useState(true);
  useEffect(()=>{let alive=true;(async()=>{try{const r=await api.load();if(alive)setData(r?.data||{});const snap=await loadVenturesSourceSnapshot(ws?.id);if(alive)setSource(sourceSummary(snap));const m=await loadVenturesMetrics(ws?.id,{periodType:"W"});if(alive)setMetrics(m?.rows||[]);}finally{if(alive)setLoading(false)}})();return()=>{alive=false}},[api,ws?.id]);
  const projects=useMemo(()=>Array.isArray(data.profiles)?data.profiles.filter(x=>!x._deleted_at):[],[data]);
  const filtered=projects.filter(p=>JSON.stringify(p).toLowerCase().includes(q.toLowerCase()));
  const totalRevenue=metrics.filter(x=>x.key==="revenue").reduce((s,x)=>s+(Number(x.value_num)||0),0);
  const needsAttention=projects.filter(p=>scoreProject(p,metrics)<70);
  const go=v=>{setView(v);setPage(v==="portfolio"?"dashboard":v)};
  if(loading)return <div dir="rtl" style={{padding:40,textAlign:"center"}}>جاري تجهيز محفظة المشاريع…</div>;
  if(selected)return <ProjectView project={selected} metrics={metrics} setPage={setPage} workspaceId={ws?.id} onBack={()=>setSelected(null)}/>;
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
    <div style={{display:"flex",gap:6,margin:"12px 0",overflowX:"auto"}}>{[["portfolio","المحفظة"],["performance","الأداء"],["decisions","القرارات"],["operations","التشغيل"]].map(([id,l])=><button key={id} onClick={()=>setView(id)} style={{...S.btn,background:view===id?"#0F766E":"#fff",color:view===id?"#fff":"#57606A"}}>{l}</button>)}</div>
    {view==="portfolio"&&<div>
      <C style={{marginBottom:12}}><div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center"}}><div><h2 style={{margin:"0 0 4px"}}>قراءة المحفظة</h2><div style={{fontSize:11,color:"#64748B"}}>ابدأ بالمشاريع التي تحتاج قرارًا، وليس بجداول البيانات.</div></div><input style={{...S.input,maxWidth:280}} placeholder="ابحث عن مشروع…" value={q} onChange={e=>setQ(e.target.value)}/></div></C>
      {needsAttention.length>0&&<C style={{marginBottom:12,border:"1px solid #FDE68A",background:"#FFFBEB"}}><b>تحتاج تدخل الآن</b><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:8,marginTop:10}}>{needsAttention.slice(0,4).map(p=><button key={p.id} onClick={()=>setSelected(p)} style={{...S.card,padding:12,textAlign:"right",cursor:"pointer"}}><b>{p.name||p.project_id}</b><div style={{fontSize:10,color:"#B45309",marginTop:4}}>افتح التشخيص</div></button>)}</div></C>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:10}}>{filtered.map(p=><ProjectCard key={p.id} p={p} metrics={metrics} onOpen={()=>setSelected(p)}/>)}</div>
      {filtered.length===0&&<C><div style={{padding:30,textAlign:"center",color:"#64748B"}}>لا توجد مشاريع مرتبطة بالمحفظة بعد.</div></C>}
    </div>}
    {view==="performance"&&<C><h2 style={{marginTop:0}}>الأداء</h2><div style={{fontSize:12,color:"#64748B",marginBottom:12}}>هذه الصفحة تقرأ مؤشرات Ventures الأسبوعية وتفصل بين الأداء التجاري وصحة التنفيذ في Projects.</div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:8}}>{projects.map(p=><ProjectCard key={p.id} p={p} metrics={metrics} onOpen={()=>setSelected(p)}/>)}</div></C>}
    {view==="decisions"&&<C><h2 style={{marginTop:0}}>قرارات المحفظة</h2><div style={{fontSize:12,color:"#64748B"}}>القرارات الفعلية تُدار من وحدة Decisions/Portfolio، بينما هذه الصفحة تعطيك السياق قبل اتخاذ القرار.</div><div style={{display:"flex",gap:8,marginTop:14}}><Btn primary onClick={()=>setPage("portfolio")}>فتح سجل القرارات</Btn><Btn onClick={()=>setPage("alerts")}>مراجعة التنبيهات</Btn></div></C>}
    {view==="operations"&&<C><h2 style={{marginTop:0}}>التشغيل</h2><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:8}}>{[["entry","Weekly Entry"],["projects","Projects"],["finance","Finance"],["content","Content"],["seoAudit","SEO"],["experiments","Experiments"]].map(([id,l])=><button key={id} onClick={()=>setPage(id)} style={{...S.card,padding:14,textAlign:"right",cursor:"pointer"}}><b>{l}</b><div style={{fontSize:10,color:"#64748B",marginTop:4}}>افتح مساحة العمل</div></button>)}</div></C>}
    <div style={{marginTop:12,fontSize:10,color:"#64748B"}}>مصادر مرتبطة: Projects {source.projects||0} · ContentOS {source.content||0} · Finance {source.finance||0} · Knowledge {source.knowledge||0}</div>
  </div>
}
