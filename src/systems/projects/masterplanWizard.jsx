import React, { useMemo, useRef, useState } from "react";
import { Btn, Chip, Head, Progress, C, Empty } from "../../core/kit.jsx";
import { validateMasterplanExport, masterplanToVenture } from "../ventures/importMasterplan.js";
import { applyVenturesProjectsImport, undoVenturesProjectsImport } from "../ventures/repository.js";

const BATCH_SIZE = 200;

function readJsonFile(file){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>{try{resolve(JSON.parse(String(reader.result||"")));}catch(e){reject(new Error("ملف JSON غير صالح."));}};
    reader.onerror=()=>reject(new Error("تعذّر قراءة الملف."));
    reader.readAsText(file,"utf-8");
  });
}
function csvEscape(v){
  const s=String(v==null?"":v);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
}
function reportCsv(rows){
  const cols=["site_id","module","id","status","reason"];
  return "\uFEFF"+[cols.join(","),...rows.map(r=>cols.map(k=>csvEscape(r[k])).join(","))].join("\n");
}
function downloadText(text,name,type){
  const blob=new Blob([text],{type});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a"); a.href=url; a.download=name; a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function normalizePlan(plan,authUser){
  const projects=plan.projects.map(({project,profile})=>({
    project:{
      ...project,
      lead_id:project.lead_id||authUser.id,
      created_by:project.created_by||authUser.id,
      members:project.members&&project.members.length?project.members:[{member_id:project.lead_id||authUser.id,role:"Lead"}]
    },
    profile
  }));
  const projectRecords=projects.map(x=>x.project);
  const profileRecords=projects.map(x=>x.profile);
  const projectIds=new Set(projectRecords.map(p=>p.id));
  return {
    ...plan,
    projects,
    records:[
      ...projectRecords.map(p=>({collection:"projects",id:p.id,data:p,deleted:false,visible_to:p.visible_to||null,source:p.source})),
      ...profileRecords.map(p=>({collection:"profiles",id:p.id,data:p,deleted:false,visible_to:p.visible_to||null,source:p.source})),
      ...plan.records.filter(r=>r.collection!=="projects"&&r.collection!=="profiles"&&(!r.project_id||projectIds.has(r.project_id)))
    ]
  };
}

export function MasterplanWizard({ ws, authUser, access, store, onDone }){
  const [step,setStep]=useState(1);
  const [raw,setRaw]=useState(null);
  const [plan,setPlan]=useState(null);
  const [validation,setValidation]=useState(null);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [cursor,setCursor]=useState(0);
  const [importId,setImportId]=useState("");
  const [applied,setApplied]=useState([]);
  const [report,setReport]=useState([]);
  const fileRef=useRef(null);
  const canEdit=access?.owner||access?.manage||access?.level==="edit";
  const batches=useMemo(()=>plan?Array.from({length:Math.ceil(plan.records.length/BATCH_SIZE)},(_,i)=>plan.records.slice(i*BATCH_SIZE,(i+1)*BATCH_SIZE)):[],[plan]);

  async function chooseFile(file){
    setError(""); setValidation(null); setPlan(null); setCursor(0); setApplied([]); setReport([]);
    if(!file)return;
    if(file.size>25*1024*1024){setError("الحد الأقصى لملف Masterplan هو 25MB.");return;}
    try{
      const value=await readJsonFile(file);
      const v=validateMasterplanExport(value);
      setRaw(value); setValidation(v);
      if(!v.ok){setError(v.errors.join("؛ "));return;}
    }catch(e){setError(e?.message||"تعذّر قراءة الملف.");}
  }
  function buildReview(){
    if(!raw||!validation?.ok)return;
    try{
      const p=normalizePlan(masterplanToVenture(raw,{importId:"imp_"+Date.now().toString(36),selectedSiteIds:raw.sites.map(s=>s.id)}),authUser);
      setPlan(p); setImportId(p.importId); setStep(2); setError("");
    }catch(e){setError(e?.message||"تعذّر بناء خطة الاستيراد.");}
  }
  async function execute(){
    if(!plan||!canEdit||busy)return;
    setBusy(true); setError("");
    let localCursor=cursor;
    try{
      for(let i=Math.floor(localCursor/BATCH_SIZE);i<batches.length;i++){
        const batch=batches[i];
        const result=await applyVenturesProjectsImport(ws.id,importId,batch,{
          source:"masterplan",
          mode:"approved-4-step-wizard",
          projectCount:plan.projects.length,
          batchIndex:i,
          batchCount:batches.length,
          traceability:"masterplan-import"
        });
        if(!result?.ok)throw new Error(result?.error?.message||"فشل تنفيذ دفعة الاستيراد.");
        localCursor=Math.min(plan.records.length,(i+1)*BATCH_SIZE);
        setCursor(localCursor);
        setApplied(x=>[...x,...batch.map(r=>r.id)]);
      }
      await store.api.reload();
      setStep(4); setReport(plan.report);
    }catch(e){
      setError(e?.message||"توقف الاستيراد. يمكنك استئناف التنفيذ من الدفعة المتبقية.");
      setCursor(localCursor); setStep(3);
    }finally{setBusy(false);}
  }
  async function undo(){
    if(!importId||busy)return;
    setBusy(true);setError("");
    try{
      const result=await undoVenturesProjectsImport(ws.id,importId);
      if(!result?.ok)throw new Error(result?.error?.message||"تعذّر التراجع.");
      await store.api.reload();
      setReport(x=>[...x,{status:"undo",reason:"تم التراجع عن الاستيراد"}]);
      setCursor(0);setApplied([]);setStep(4);
    }catch(e){setError(e?.message||"تعذّر التراجع.");}
    finally{setBusy(false);}
  }
  if(!canEdit)return <Empty icon="🔒" title="استيراد Masterplan يحتاج صلاحية تحرير" sub="يجب أن تكون Owner أو Admin أو Member بصلاحية edit في Projects OS."/>;

  return <div dir="rtl">
    <Head title="نقل من Masterplan" sub="Wizard من 4 خطوات: ملف → مراجعة → Dry Run وتنفيذ → تقرير/تراجع"
      right={<><Btn onClick={()=>onDone?.()}>← العودة للمشاريع</Btn></>}/>
    <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
      {[["1","الملف"],["2","المراجعة"],["3","Dry Run / تنفيذ"],["4","التقرير / Undo"]].map(([n,l])=><Chip key={n} color={step===Number(n)?C.accent:C.muted} solid={step===Number(n)}>{n}. {l}</Chip>)}
    </div>
    {error&&<div role="alert" style={{marginBottom:12,padding:12,borderRadius:10,border:"1px solid #FECACA",background:"#FEF2F2",color:"#991B1B",fontSize:12}}>{error}</div>}

    {step===1&&<div style={{display:"grid",gap:14}}>
      <div style={{padding:20,border:"1px dashed #A8A29E",borderRadius:14,textAlign:"center",background:"#FAFAF9"}}>
        <div style={{fontSize:30}}>⤓</div>
        <div style={{fontWeight:800,marginBottom:5}}>اختر ملف Masterplan JSON</div>
        <div style={{fontSize:12,color:C.muted,marginBottom:12}}>حتى 25MB · يتم التحقق محليًا قبل أي كتابة على الخادم.</div>
        <input ref={fileRef} type="file" accept=".json,application/json" onChange={e=>chooseFile(e.target.files?.[0])}/>
      </div>
      {validation&&<div style={{padding:14,borderRadius:12,border:"1px solid "+C.line,fontSize:12}}>
        <div style={{fontWeight:800,marginBottom:8}}>نتيجة التحقق</div>
        <div>المواقع: <b>{validation.stats.sites}</b> · السجلات: <b>{validation.stats.totalRecords}</b> · اليتيمة: <b>{validation.stats.orphans}</b> · المكررة: <b>{validation.stats.duplicates}</b></div>
        {validation.warnings.map((w,i)=><div key={i} style={{marginTop:5,color:C.warn}}>⚠ {w}</div>)}
        {validation.ok&&<div style={{marginTop:12}}><Btn kind="primary" onClick={buildReview}>الانتقال إلى المراجعة →</Btn></div>}
      </div>}
    </div>}

    {step===2&&plan&&<div style={{display:"grid",gap:14}}>
      <div style={{padding:14,borderRadius:12,border:"1px solid "+C.line,fontSize:12}}>
        <b>ملخص الخطة</b><div style={{marginTop:7}}>مشاريع: {plan.summary.projects} · سجلات قابلة للنقل: {plan.summary.records} · مؤجلة: {plan.summary.deferred} · مكررة: {plan.summary.duplicates}</div>
      </div>
      <div style={{border:"1px solid "+C.line,borderRadius:12,overflow:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
          <thead><tr>{["المشروع","النوع","الحالة","الأولوية","الرؤية","الكود"].map(x=><th key={x} style={{padding:9,textAlign:"right",borderBottom:"1px solid "+C.line}}>{x}</th>)}</tr></thead>
          <tbody>{plan.projects.map(({project,profile})=><tr key={project.id}>
            <td style={{padding:9}}>{project.name}</td><td style={{padding:9}}>{profile.kind}</td><td style={{padding:9}}>{project.status}</td><td style={{padding:9}}>{project.priority}</td><td style={{padding:9}}>{project.visibility}</td><td style={{padding:9}}>{profile.code||"—"}</td>
          </tr>)}</tbody>
        </table>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <Btn onClick={()=>setStep(1)}>← تعديل الملف</Btn>
        <Btn kind="primary" onClick={()=>setStep(3)}>تشغيل Dry Run →</Btn>
      </div>
    </div>}

    {step===3&&plan&&<div style={{display:"grid",gap:14}}>
      <div style={{padding:14,borderRadius:12,border:"1px solid "+C.line}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}><b>Dry Run</b><Chip color={plan.summary.records?C.ok:C.warn}>{plan.summary.records?plan.summary.records+" سجل جاهز":"لا توجد سجلات"}</Chip></div>
        <div style={{fontSize:12,color:C.muted,marginTop:6}}>لا توجد كتابة في Dry Run؛ تم التحقق من البنية والتعيين قبل التنفيذ.</div>
        <div style={{marginTop:12}}><Progress value={plan.summary.records?1:0} showLabel={false}/></div>
        <div style={{marginTop:12,fontSize:12}}>دفعات التنفيذ: <b>{batches.length}</b> · حجم الدفعة: <b>{BATCH_SIZE}</b></div>
      </div>
      <div style={{padding:14,borderRadius:12,border:"1px solid "+C.line}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:6}}><span>التنفيذ</span><b>{cursor}/{plan.records.length}</b></div>
        <Progress value={plan.records.length?cursor/plan.records.length:0}/>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <Btn onClick={()=>setStep(2)} disabled={busy}>← المراجعة</Btn>
        <Btn kind="primary" onClick={execute} disabled={busy||cursor>=plan.records.length}>{busy?"⏳ جارٍ التنفيذ…":cursor?"استئناف التنفيذ":"بدء التنفيذ"}</Btn>
        {cursor>0&&cursor<plan.records.length&&<Chip color={C.warn}>متوقف عند الدفعة {Math.floor(cursor/BATCH_SIZE)+1}</Chip>}
      </div>
    </div>}

    {step===4&&<div style={{display:"grid",gap:14}}>
      <div style={{padding:14,borderRadius:12,border:"1px solid "+C.line}}>
        <div style={{fontWeight:800,marginBottom:8}}>اكتمل الاستيراد</div>
        <div style={{fontSize:12}}>Import ID: <code>{importId}</code></div>
        <div style={{fontSize:12,marginTop:6}}>تمت معالجة {applied.length||cursor} سجلًا. العناصر المؤجلة: {plan?.summary.deferred||0}.</div>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <Btn kind="primary" onClick={()=>downloadText(reportCsv(report.length?report:plan?.report||[]),"masterplan-import-report.csv","text/csv;charset=utf-8")}>تصدير التقرير CSV</Btn>
        <Btn danger onClick={undo} disabled={busy}>{busy?"⏳ جارٍ التراجع…":"↩ التراجع عن الاستيراد"}</Btn>
        <Btn onClick={()=>onDone?.()}>فتح المشاريع</Btn>
      </div>
      <div style={{fontSize:11,color:C.muted}}>التراجع متاح ضمن نافذة الـ14 يومًا التي يفرضها حد الخادم، ويُرفض إذا عدّل أحد السجلات المستوردة بعد الاستيراد.</div>
    </div>}
  </div>;
}
export default MasterplanWizard;