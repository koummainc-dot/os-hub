import {VENTURES_MODULES,VENTURES_PLATFORM} from "./config.js";
import {metricDef,VENTURES_METRIC_DEFS,metricDefsForProfile} from "./lookups.js";
export {validateMasterplanExport,masterplanToVenture} from "./importMasterplan.js";
export function summarizeVentures(data={}){
 const records=Object.values(data).flatMap(v=>Array.isArray(v)?v.filter(x=>!x._deleted_at):[]);
 const types=VENTURES_PLATFORM.platform.contentTypes||[];
 const moduleCounts={}; VENTURES_MODULES.forEach(m=>{const key=m.id==="compliance"||m.id==="security"?"checklist":m.id; moduleCounts[m.id]=Array.isArray(data[key])?data[key].filter(x=>!x._deleted_at).length:0;});
 return {records:records.length,modules:VENTURES_MODULES.length,contentTypes:types.length,workflowStages:types.reduce((n,x)=>n+(x.stages||[]).length,0),contentRecords:Array.isArray(data.content)?data.content.filter(x=>!x._deleted_at).length:0,moduleCounts};
}
export function validateVenturesRecord(fields,value){return (fields||[]).filter(f=>f.required&&!String(value&&value[f.k]||"").trim()).map(f=>f.k);}
export function getContentWorkflow(typeId){const type=(VENTURES_PLATFORM.platform.contentTypes||[]).find(x=>x.id===typeId);return type?(type.stages||[]):[];}


export function validateVenturesImport(incoming={}) {
  const errors=[];
  if(!incoming || typeof incoming!=="object" || Array.isArray(incoming)) return ["البيانات المستوردة يجب أن تكون كائنًا."];
  const allowed=VENTURES_MODULES.map(m=>m.id).filter(id=>id!=="dashboard");
  for(const [key,value] of Object.entries(incoming)){
    if(key==="__ventures_imports" || key==="schema" || key==="exported_at") continue;
    if(!Array.isArray(value)){ errors.push(`المجموعة ${key} يجب أن تكون قائمة.`); continue; }
    if(!allowed.includes(key) && key!=="checklist" && key!=="content") errors.push(`مجموعة غير معروفة: ${key}`);
    value.forEach((row,index)=>{
      if(!row || typeof row!=="object" || Array.isArray(row)) errors.push(`${key}[${index}] سجل غير صالح.`);
      else if(row.id!=null && typeof row.id!=="string") errors.push(`${key}[${index}] المعرّف يجب أن يكون نصًا.`);
    });
  }
  return errors.slice(0,100);
}

export function mergeVenturesData(base={},incoming={}) {
  const out={...base};
  const importedIds=[];
  Object.entries(incoming).forEach(([k,v])=>{
    if(k==="schema"||k==="exported_at"||k==="__ventures_imports") return;
    if(!Array.isArray(v)){out[k]=v;return;}
    const existing=Array.isArray(base[k])?base[k]:[];
    const byId=new Map(existing.map(x=>[String(x?.id||""),x]));
    v.forEach((x,index)=>{
      const id=String(x?.id||`import_${k}_${index}_${JSON.stringify(x).length}`);
      byId.set(id,{...x,id});
      importedIds.push(id);
    });
    out[k]=Array.from(byId.values());
  });
  return {data:out,importedIds};
}

export async function buildVenturesImportFingerprint(incoming={}) {
  const canonical=JSON.stringify(Object.keys(incoming).sort().reduce((o,k)=>{
    const v=incoming[k];
    o[k]=Array.isArray(v)?v.map(x=>x&&typeof x==="object"?Object.keys(x).sort().reduce((a,key)=>(a[key]=x[key],a),{}):x):v;
    return o;
  },{}));
  if(typeof crypto!=="undefined"&&crypto.subtle){
    const bytes=new TextEncoder().encode(canonical);
    const digest=await crypto.subtle.digest("SHA-256",bytes);
    return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");
  }
  return `fallback-${canonical.length}-${btoa(unescape(encodeURIComponent(canonical))).slice(0,32)}`;
}


export function evalMetric(def={}, values={}) {
  const definition=typeof def==="string"?metricDef(def):def;
  const key=definition?.key;
  if(definition?.kind==="input"||definition?.kind==="bool"||definition?.kind==="text"){
    const value=values[key];
    return {value:value==null||value===""?null:value,missing:value==null||value===""?[key]:[]};
  }
  const formula=definition?.formula;
  if(!formula) return {value:null,missing:key?[key]:[]};
  const missing=[];
  const expr=formula.replace(/[A-Za-z_][A-Za-z0-9_]*/g,name=>{
    if(["Math","true","false","null"].includes(name)) return name;
    const v=values[name];
    if(v==null||v===""){missing.push(name);return "NaN";}
    return String(Number(v));
  });
  if(missing.length) return {value:null,missing:[...new Set(missing)]};
  try{
    const value=Function("return ("+expr+")")();
    return {value:Number.isFinite(Number(value))?Number(value):null,missing:[]};
  }catch{return {value:null,missing:[]};}
}

export function aggregatePeriod(def={}, rows=[], periodType="W") {
  const xs=(rows||[]).filter(r=>r&&!r.no_data);
  if(!xs.length) return null;
  const kind=def.aggregation||def.kind||"sum";
  if(kind==="last"||kind==="balance") return xs.slice().sort((a,b)=>String(a.period_start).localeCompare(String(b.period_start))).at(-1)?.value_num??null;
  if(kind==="average"||kind==="avg") return xs.reduce((s,r)=>s+Number(r.value_num||0),0)/xs.length;
  return xs.reduce((s,r)=>s+Number(r.value_num||0),0);
}

export function thresholdState(def={}, value, thresholds={}) {
  if(value==null || !thresholds) return "none";
  const key=def.key||"value"; const t=thresholds[key]||thresholds;
  if(t.good==null && t.warn==null && t.bad==null) return "none";
  if(t.good!=null && value>=Number(t.good)) return "good";
  if(t.bad!=null && value<=Number(t.bad)) return "bad";
  if(t.warn!=null && value<=Number(t.warn)) return "warn";
  return "good";
}

export function scorecardFor(profile={}, defs=[]) {
  return (defs||[]).filter(d=>!d.applies_to || d.applies_to.includes(profile.kind) || d.applies_to.includes(profile.subtype))
    .map(d=>({...d,required:d.required===true||d.class==="ops"}));
}

export function decisionMetric(profile={}, values={}) {
  const key=profile.decision_metric||profile.decisionMetric;
  if(key && values[key]!=null) return {key,value:Number(values[key])};
  const candidates=["net_profit","contribution_margin","revenue_growth","d30_retention","organic_traffic_growth","crash_free","conversion_rate"];
  const found=candidates.find(k=>values[k]!=null);
  return found?{key:found,value:Number(values[found])}:{key:null,value:null};
}

export function portfolioQuestions(ctx={}) {
  const projects=Array.isArray(ctx.projects)?ctx.projects:[];
  const values=ctx.values||{};
  const thresholds=ctx.thresholds||{};
  const rows=projects.map(p=>({project:p,...(values[p.id]||{})}));
  const revenueTotal=rows.reduce((s,r)=>s+Number(r.revenue||0),0);
  const q1=rows.filter(r=>Number(r.net_profit||0)>0);
  const q2=rows.filter(r=>Number(r.cash_flow||0)<=0 && Number(r.revenue_trend||0)<=0 && (Number(r.tracked_minutes||0)>Number(ctx.timeThreshold||Infinity)));
  const q3=rows.map(r=>({...r,revenue_concentration_pct:revenueTotal?Number(r.revenue||0)/revenueTotal*100:0})).sort((a,b)=>b.revenue_concentration_pct-a.revenue_concentration_pct);
  const q4=rows.filter(r=>Number(r.net_profit||0)>0 && Number(r.decision_trend||0)>0 && r.health!=="Critical" && Number(r.critical_risks||0)===0);
  const q5=rows.filter(r=>thresholdState({key:r.decision_metric_key},r.decision_metric,thresholds[r.decision_metric_key])==="bad" || Number(r.net_profit||0)<0 || r.review_overdue);
  return {q1,q2,q3,q4,q5};
}

export function suggestCall(profile={}, ctx={}) {
  const metric=decisionMetric(profile,ctx.values||{});
  const t=thresholdState({key:metric.key},metric.value,(ctx.thresholds||{})[metric.key]);
  if(t==="none") return {decision:null,reason:"no_thresholds"};
  if(t==="good") return {decision:"Scale",reason:"decision_metric_good"};
  if(t==="bad") return {decision:Number((ctx.values||{}).net_profit)<0?"Fix":"Pause",reason:"decision_metric_bad"};
  return {decision:"Fix",reason:"decision_metric_warning"};
}

export function canApplyCall(project={}, call={}, idx={}) {
  const decision=call.decision;
  if(decision==="Scale") return {ok:true,effect:"keep_status"};
  if(decision==="Fix") return {ok:true,effect:"create_fix_tasks"};
  const to=decision==="Pause"?"On Hold":decision==="Kill"?"Cancelled":null;
  if(!to) return {ok:false,error:"قرار غير معروف"};
  const status=project.status||"Idea";
  const allowed={Idea:["Planned","Cancelled"],Planned:["In Progress","On Hold","Cancelled","Idea"],"In Progress":["On Hold","Completed","Cancelled","Planned"],"On Hold":["In Progress","Cancelled","Planned"],Completed:["Archived","In Progress"],Cancelled:["Archived","Planned"],Archived:["Planned","In Progress","Completed","Cancelled"]};
  if(!allowed[status]?.includes(to)) return {ok:false,error:"انتقال الحالة غير مسموح"};
  return {ok:true,to,effect:decision==="Kill"?"cancel_then_archive":"status_change"};
}

export function portfolioTrendSeries(projects=[],metrics=[],key="revenue",limit=12){
  const byPeriod=new Map();
  metrics.filter(x=>x.key===key&&x.value_num!=null).forEach(x=>{
    const p=String(x.period_start||"");
    if(!p)return;
    byPeriod.set(p,(byPeriod.get(p)||0)+Number(x.value_num));
  });
  return [...byPeriod.entries()].sort((a,b)=>a[0].localeCompare(b[0])).slice(-limit).map(([period,value])=>({period,value}));
}
export function missingWeekCount(projects=[],metrics=[],maxAgeDays=3,now=Date.now()){
  return projects.filter(p=>{
    const rows=metrics.filter(x=>x.project_id===p.project_id&&x.value_num!=null);
    if(!rows.length)return true;
    const latest=rows.map(x=>new Date(String(x.period_start)).getTime()).filter(Number.isFinite).sort((a,b)=>b-a)[0];
    return !latest || ((now-latest)/86400000)>maxAgeDays;
  }).length;
}

export function ventureAlerts(memberId, ctx={}) {
  const alerts=[]; const projects=Array.isArray(ctx.projects)?ctx.projects:[]; const values=ctx.values||{};
  projects.forEach(p=>{
    const v=values[p.id]||{};
    if(v.week_missing_after_days) alerts.push({key:"V-A1:"+p.id,severity:"Info",title:"بيانات الأسبوع ناقصة",project_id:p.id});
    if(Number(v.net_profit_period2)<0 && Number(v.net_profit_period1)<0 && ["store","ecommerce"].includes(String(p.kind))) alerts.push({key:"V-A2:"+p.id,severity:"Warning",title:"صافي المساهمة سلبي لفترتين",project_id:p.id});
    if(v.refunds_over_threshold) alerts.push({key:"V-A3:"+p.id,severity:"Warning",title:"المرتجعات فوق العتبة",project_id:p.id});
    if(v.d30_under_threshold && Number(v.acquisition_spend||0)>0 && String(p.kind)==="app") alerts.push({key:"V-A4:"+p.id,severity:"Warning",title:"D30 تحت العتبة مع إنفاق اكتساب",project_id:p.id});
    if(v.crash_free_under_threshold) alerts.push({key:"V-A5:"+p.id,severity:"Critical",title:"Crash-free تحت العتبة",project_id:p.id});
    if(v.sku_negative_4w) alerts.push({key:"V-A6:"+p.id,severity:"Info",title:"SKU مساهمته سالبة لأربعة أسابيع",project_id:p.id});
    if(v.single_dependency_over_threshold) alerts.push({key:"V-A7:"+p.id,severity:"Warning",title:"اعتماد مرتفع على مورد/منتج واحد",project_id:p.id});
    if(v.inventory_variance_over_threshold) alerts.push({key:"V-A8:"+p.id,severity:"Warning",title:"فاقد أو فرق جرد فوق العتبة",project_id:p.id});
    if(v.review_overdue) alerts.push({key:"V-A9:"+p.id,severity:"Warning",title:"قرار منتهي موعد مراجعته",project_id:p.id});
    if(v.content_decay_over_threshold) alerts.push({key:"V-A10:"+p.id,severity:"Info",title:"محتوى متهاوٍ",project_id:p.id});
    if(v.keywords_outside_top10) alerts.push({key:"V-A11:"+p.id,severity:"Info",title:"كلمات خارج أول 10",project_id:p.id});
    if(v.affiliate_balance_available) alerts.push({key:"V-A12:"+p.id,severity:"Info",title:"رصيد أفلييت متاح",project_id:p.id});
    if(v.manual_finance_without_link) alerts.push({key:"V-A13:"+p.id,severity:"Info",title:"إدخالات مالية دون ربط Finance",project_id:p.id});
  });
  return alerts.map(a=>({...a,member_id:memberId}));
}

export function derivedMetric(defKey, values={}) { return evalMetric(metricDef(defKey), values); }
export function basicMetricDefs(profile, periodType="W") { return metricDefsForProfile(profile,{basicOnly:true,periodType}); }

export function emailDerivedMetrics(campaign={}){
  const sent=Number(campaign.sent)||0, delivered=Number(campaign.delivered)||0, opens=Number(campaign.opens)||0, clicks=Number(campaign.clicks)||0;
  const unsubs=Number(campaign.unsubs)||0, hard=Number(campaign.bounces_hard)||0, soft=Number(campaign.bounces_soft)||0, complaints=Number(campaign.spam_complaints)||0, conversions=Number(campaign.conversions)||0, revenue=Number(campaign.revenue)||0;
  return {deliveryRate:sent?delivered/sent*100:null,openRate:delivered?opens/delivered*100:null,ctr:delivered?clicks/delivered*100:null,ctor:opens?clicks/opens*100:null,unsubscribeRate:delivered?unsubs/delivered*100:null,bounceRate:sent?(hard+soft)/sent*100:null,spamRate:delivered?complaints/delivered*100:null,conversionRate:clicks?conversions/clicks*100:null,rpr:delivered?revenue/delivered:null};
}
export function validateEmailCampaign(campaign={}){
  const errors=[];
  ["spam_rate","open_rate","ctr","unsubscribe_rate","bounce_rate"].forEach(k=>{if(campaign[k]!=null&&campaign[k]!==""&&(Number(campaign[k])<0||Number(campaign[k])>100))errors.push(k+" must be between 0 and 100");});
  if(Number(campaign.delivered||0)>Number(campaign.sent||0))errors.push("delivered cannot exceed sent");
  if(Number(campaign.opens||0)>Number(campaign.delivered||0))errors.push("opens cannot exceed delivered");
  if(Number(campaign.clicks||0)>Number(campaign.delivered||0))errors.push("clicks cannot exceed delivered");
  return errors;
}
export function validateEmailABTest(campaign={}) {
  const errors=[];
  const enabled=campaign.ab_test===true || campaign.ab_test==="true" || campaign.ab_test==="on";
  if(!enabled) return errors;
  if(!String(campaign.variant_a||"").trim()) errors.push("variant_a is required");
  if(!String(campaign.variant_b||"").trim()) errors.push("variant_b is required");
  if(campaign.winner_variant!=null && campaign.winner_variant!=="" && !["A","B"].includes(String(campaign.winner_variant))) errors.push("winner_variant must be A or B");
  if(campaign.winner_variant && !String(campaign.winner_reason||"").trim()) errors.push("winner_reason is required when a winner is selected");
  return errors;
}
export function emailWinnerPatch(campaign={}, winnerVariant="", reason="") {
  const winner=String(winnerVariant||"").trim();
  if(!["A","B"].includes(winner)) return {ok:false,error:"winner_variant must be A or B"};
  if(!String(reason||"").trim()) return {ok:false,error:"winner_reason is required"};
  return {ok:true,patch:{winner_variant:winner,winner_reason:String(reason).trim(),winner_at:new Date().toISOString(),ab_test:true}};
}
export function emailCheckProjectIssue(check={}) {
  const id=String(check.id||"");
  if(!id) return {ok:false,error:"check id is required"};
  const risk=String(check.risk||"").trim();
  const title=[check.type||"Email check",risk&&`Risk: ${risk}`].filter(Boolean).join(" · ");
  return {ok:true,recordId:`email-check-${id}`,payload:{id:`email-check-${id}`,title,status:"Open",kind:"Risk",source:"ventures_email",source_record_id:id,project_id:check.project_id||null,risk:risk||"Medium",description:check.note||"",module:"Email",created_at:new Date().toISOString()}};
}
export function emailAlerts(campaigns=[],lists=[],checks=[],thresholds={}){
  const out=[]; const spamMax=thresholds.spam_rate==null?null:Number(thresholds.spam_rate); const bounceMax=thresholds.hard_bounce_rate==null?null:Number(thresholds.hard_bounce_rate);
  campaigns.forEach(c=>{const m=emailDerivedMetrics(c);if(spamMax!=null&&m.spamRate!=null&&m.spamRate>spamMax)out.push({key:"email_spam_"+c.id,severity:"critical",message:"معدل شكاوى السبام فوق العتبة",campaign_id:c.id});if(bounceMax!=null&&m.bounceRate!=null&&m.bounceRate>bounceMax)out.push({key:"email_bounce_"+c.id,severity:"warning",message:"معدل الارتداد فوق العتبة",campaign_id:c.id});if(c.status==="Scheduled"&&c.scheduled_at&&new Date(c.scheduled_at).getTime()<Date.now())out.push({key:"email_schedule_"+c.id,severity:"warning",message:"حملة مجدولة تجاوزت موعدها دون Sent",campaign_id:c.id});});
  lists.forEach(l=>{if(l.last_cleaned_at&&thresholds.list_clean_days!=null){const age=(Date.now()-new Date(l.last_cleaned_at).getTime())/86400000;if(age>Number(thresholds.list_clean_days))out.push({key:"email_list_clean_"+l.id,severity:"info",message:"القائمة لم تُنظف منذ العتبة المحددة",list_id:l.id});}});
  checks.forEach(x=>{if(x.status==="Open"&&x.risk)out.push({key:"email_check_"+x.id,severity:"warning",message:"بند تسليم/امتثال Risk مفتوح",check_id:x.id});});
  return out;
}
