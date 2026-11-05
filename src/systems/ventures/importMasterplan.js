/**
 * Pure Masterplan -> Ventures/Projects import planner.
 * No network, storage, or writes. The caller applies the returned plan
 * through the server-side Ventures import boundary.
 */
const STATUS_MAP={active:"In Progress",نشط:"In Progress",paused:"On Hold",متوقف:"On Hold",archived:"Archived",مؤرشف:"Archived"};
const TASK_STATUS_MAP={Todo:"Not Started","To Do":"Not Started",todo:"Not Started","In Progress":"In Progress",Doing:"In Progress",Review:"In Progress",Done:"Completed",done:"Completed",Cancelled:"Cancelled",Canceled:"Cancelled"};
const TYPE_MAP={
  website_content:"website_content",website:"website_content",content:"content",
  ecommerce:"store",store:"store",shop:"store",digital_product:"digital_product",
  app:"app",application:"app",brand:"brand",business:"business",other:"other"
};
const PROJECT_COLLECTIONS=["projects","tasks","outputs","risks","issues","decisions","prds","updates"];

function clean(v){return v==null?"":String(v).trim();}
function slug(v){return clean(v).toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g,"-").replace(/^-+|-+$/g,"").slice(0,80);}
function num(v){
  if(v==null||v==="") return null;
  let s=String(v).trim().replace(/[\$€£,%]/g,"").replace(/٬/g,",").replace(/٫/g,".");
  s=s.replace(/\s/g,"");
  if(s.includes(",")&&s.includes(".")) s=s.replace(/,/g,"");
  else if((s.match(/,/g)||[]).length===1) s=s.replace(",",".");
  const n=Number(s);
  return Number.isFinite(n)?n:null;
}
function sourceId(siteId,module,id){
  const raw=["masterplan",siteId,module,id].map(clean).join("|");
  return "imp_"+raw.replace(/[^a-zA-Z0-9_-]/g,"_").slice(0,180);
}
function hashString(value){
  let h=2166136261;
  for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619);}
  return (h>>>0).toString(16).padStart(8,"0");
}
function stableId(parts){
  const raw=parts.map(clean).join("|");
  return "mp_"+hashString(raw)+hashString(raw.split("").reverse().join(""));
}
function fingerprint(value){
  const raw=JSON.stringify(value);
  return hashString(raw)+hashString(raw.split("").reverse().join(""));
}
function recordsFor(data,module){
  const value=data?.[module];
  if(Array.isArray(value)) return value;
  if(value&&typeof value==="object") return Object.entries(value).map(([id,row])=>({id,...row}));
  return [];
}
function inferType(site,data){
  const explicit=clean(site?.type||site?.kind||site?.subtype);
  if(explicit) return TYPE_MAP[explicit.toLowerCase()]||explicit;
  const products=recordsFor(data,"products").length;
  const keywords=recordsFor(data,"keywords").length;
  const seo=recordsFor(data,"seoAudit").length;
  if(products&&!keywords) return "store";
  if(keywords||seo) return "website_content";
  return "website_content";
}
function mapStatus(v,kind="project"){
  const raw=clean(v);
  if(kind==="task") return TASK_STATUS_MAP[raw]||TASK_STATUS_MAP[raw.toLowerCase()]||"Not Started";
  return STATUS_MAP[raw.toLowerCase()]||STATUS_MAP[raw]||"Idea";
}
function makeSource(siteId,module,rowId,importId){
  return {system:"masterplan",site_id:siteId,id:clean(rowId),module,import_id:importId};
}

export function validateMasterplanExport(raw={}){
  const errors=[],warnings=[];
  if(!raw||typeof raw!=="object"||Array.isArray(raw)) return {ok:false,errors:["الملف تالف أو ليس تصدير Masterplan"],warnings:[],stats:{}};
  if(!Array.isArray(raw.sites)||!raw.data||typeof raw.data!=="object"||Array.isArray(raw.data)){
    return {ok:false,errors:["لم أجد مواقع. هل هذا ملف Masterplan؟"],warnings:[],stats:{}};
  }
  if(raw.sites.length>50) errors.push("الملف أكبر من الحد: 50 موقعًا.");
  const sites=new Set(raw.sites.map(s=>clean(s?.id)).filter(Boolean));
  let total=0,orphans=0,duplicates=0;
  const seen=new Set();
  for(const [module,value] of Object.entries(raw.data)){
    const rows=Array.isArray(value)?value:Object.values(value||{});
    for(const row of rows){
      total++;
      const siteId=clean(row?.siteId||row?.site_id);
      const id=clean(row?.id);
      if(!siteId||!sites.has(siteId)){orphans++;continue;}
      const key=module+"|"+siteId+"|"+id;
      if(id&&seen.has(key)) duplicates++;
      if(id) seen.add(key);
    }
  }
  if(total>200000) errors.push("الملف أكبر من الحد: 200,000 سجل.");
  if(orphans) warnings.push(`سجلات يتيمة: ${orphans} وستُهمل من الإنشاء.`);
  if(duplicates) warnings.push(`معرّفات مكررة: ${duplicates}.`);
  if(!raw.phaseDefs) warnings.push("ملف قديم: phaseDefs غير موجودة، وستُستخدم المراحل المتاحة فقط.");
  const stats={sites:raw.sites.length,totalRecords:total,orphans,duplicates,modules:Object.fromEntries(Object.entries(raw.data).map(([k,v])=>[k,Array.isArray(v)?v.length:Object.keys(v||{}).length]))};
  return {ok:errors.length===0&&raw.sites.length>0,errors,warnings,stats};
}

export function masterplanToVenture(raw={},opts={}){
  const validation=validateMasterplanExport(raw);
  if(!validation.ok) return {ok:false,validation,projects:[],records:[],report:[]};
  const importId=clean(opts.importId)||"imp_"+fingerprint({sites:raw.sites,data:raw.data}).slice(0,24);
  const selected=new Set((opts.selectedSiteIds||raw.sites.map(s=>s.id)).map(clean));
  const projectConfigs=opts.projectConfigs||{};
  const projects=[],records=[],report=[];
  const globalSeen=new Set();

  for(const site of raw.sites){
    const siteId=clean(site?.id);
    if(!selected.has(siteId)) continue;
    const data=raw.data||{};
    const cfg=projectConfigs[siteId]||{};
    const projectId=clean(cfg.projectId)||stableId(["project",siteId]);
    const projectName=clean(cfg.name||site?.name)||`Masterplan ${siteId}`;
    const type=inferType(site,data);
    const profile={
      id:"vp_"+projectId,
      project_id:projectId,
      code:clean(cfg.code),
      kind:type,
      subtype:clean(cfg.subtype||site?.subtype||site?.type),
      currency:clean(cfg.currency||site?.currency||"USD"),
      source:makeSource(siteId,"profiles",siteId,importId),
      visibility:cfg.visibility==="private"?"private":"workspace",
      visible_to:Array.isArray(cfg.visible_to)?cfg.visible_to:null,
      modules_override:cfg.modules_override||null,
      name:projectName
    };
    const projectRecord={
      id:projectId,
      name:projectName,
      status:mapStatus(cfg.status||site?.status),
      priority:clean(cfg.priority||site?.priority||"Medium"),
      visibility:profile.visibility,
      visible_to:profile.visible_to,
      source:profile.source,
      legacy_status:STATUS_MAP[clean(cfg.status||site?.status).toLowerCase()]?null:clean(cfg.status||site?.status),
      lead_id:clean(cfg.lead_id||cfg.owner_id||site?.owner_id)||null,
      created_by:clean(cfg.created_by||site?.created_by)||null,
      description:clean(cfg.description||site?.description),
      type:type
    };
    projects.push({project:projectRecord,profile});
    records.push({collection:"projects",id:projectId,data:projectRecord,deleted:false,visible_to:profile.visible_to,source:profile.source});

    for(const [module,rawValue] of Object.entries(data)){
      const rows=Array.isArray(rawValue)?rawValue:Object.entries(rawValue||{}).map(([id,row])=>({id,...row}));
      for(const row of rows){
        if(clean(row?.siteId||row?.site_id)!==siteId) continue;
        const originalId=clean(row?.id);
        if(!originalId){report.push({site_id:siteId,module,status:"skipped",reason:"missing_id"});continue;}
        const dedupeKey=module+"|"+siteId+"|"+originalId;
        if(globalSeen.has(dedupeKey)){report.push({site_id:siteId,module,id:originalId,status:"duplicate"});continue;}
        globalSeen.add(dedupeKey);
        if(["content","email","distribution"].includes(module)){
          report.push({site_id:siteId,module,id:originalId,status:"deferred",reason:"انقلها إلى Content OS",source:makeSource(siteId,module,originalId,importId)});
          continue;
        }
        if(module==="members") {report.push({site_id:siteId,module,id:originalId,status:"deferred",reason:"الأعضاء لا تُنقل"});continue;}
        const source=makeSource(siteId,module,originalId,importId);
        const targetCollection=module==="compliance"||module==="security"?"tasks":module==="team"?"tasks":module==="assets"?"outputs":module==="notes"?"updates":module==="decisions"?"decisions":module==="risks"?"risks":module==="issues"?"issues":module==="prds"?"prds":module==="updates"?"updates":module==="outputs"?"outputs":module==="tasks"?"tasks":null;
        const targetId=sourceId(siteId,module,originalId);
        if(!targetCollection){
          report.push({site_id:siteId,module,id:originalId,status:"deferred",reason:"لا يوجد target collection في Projects OS؛ يحتاج ربطًا بنظامه المالك.",source});
          continue;
        }
        const visibility=profile.visibility==="private"?profile.visible_to:null;
        const base={id:targetId,project_id:projectId,source,visible_to:visibility};
        let dataOut={...row,...base};
        if(["tasks","team"].includes(module)){
          dataOut={...dataOut,status:mapStatus(row.status,"task"),is_phase:false};
          if(row.phase) dataOut.phase=clean(row.phase);
          if(row.cancelled||String(row.status).toLowerCase().includes("cancel")) dataOut.cancelled_reason="مستورد";
        } else if(module==="finance"){
          report.push({site_id:siteId,module,id:originalId,status:"deferred",reason:"Finance يصبح Metrics في Ventures وليس سجل Projects؛ سيُربط في مسار Phase 4.",source});
          continue;
        } else if(module==="kpi"){
          dataOut={...dataOut,target_value:num(row.target12??row.target??row.target_value),current_value:num(row.current??row.current_value),initial_value:num(row.initial??row.initial_value),notes:[row.target3,row.target6].filter(x=>clean(x)).map(x=>String(x)).join(" | ")};
        } else if(module==="compliance"||module==="security"){
          dataOut={...dataOut,kind:"checklist",status:clean(row.status||"Todo"),title:clean(row.title||row.name||module+" item")};
        }
        records.push({collection:targetCollection,id:targetId,data:dataOut,deleted:false,visible_to:visibility,source});
      }
    }
    const phases=Array.isArray(raw.phaseDefs)?raw.phaseDefs:[];
    phases.filter(p=>clean(p.siteId||p.site_id)===siteId||!p.siteId).forEach((phase,idx)=>{
      const pid=sourceId(siteId,"phaseDefs",clean(phase.id)||String(idx));
      records.push({collection:"tasks",id:pid,data:{id:pid,project_id:projectId,title:clean(phase.name||phase.title||`مرحلة ${idx+1}`),is_phase:true,status:null,estimate:null,due_date:null,source:makeSource(siteId,"phaseDefs",phase.id||String(idx),importId),visible_to:visibility},deleted:false,visible_to:visibility,source:makeSource(siteId,"phaseDefs",phase.id||String(idx),importId)});
    });
  }
  return {ok:true,validation,importId,projects,records,report,summary:{
    projects:projects.length,
    records:records.length,
    deferred:report.filter(x=>x.status==="deferred").length,
    duplicates:report.filter(x=>x.status==="duplicate").length,
    warnings:validation.warnings.length
  }};
}

export {PROJECT_COLLECTIONS};
