export const SPIRITUAL_SECTIONS=[{id:"home",label:"الرئيسية",icon:"⌂"},{id:"values",label:"القيم",icon:"💎"},{id:"principles",label:"المبادئ",icon:"📜"},{id:"practices",label:"الممارسات",icon:"🌿"},{id:"dailylog",label:"السجل اليومي",icon:"📒"},{id:"reflections",label:"التأملات",icon:"🪞"},{id:"goals",label:"الأهداف",icon:"🎯"},{id:"commitments",label:"الالتزامات",icon:"🤲"},{id:"dates",label:"التواريخ المهمة",icon:"📅"},{id:"reviews",label:"المراجعات",icon:"🔁"},{id:"seasons",label:"المواسم",icon:"🌙"},{id:"alignment",label:"الاتساق",icon:"🧭"},{id:"settings",label:"الإعدادات والخصوصية",icon:"⚙️"}];
export const SPIRITUAL_COLLECTIONS=["values","principles","practices","practice_logs","reflections","goals","commitments","important_dates","reviews","seasons"];
export const SENSITIVE_COLLECTIONS=new Set(SPIRITUAL_COLLECTIONS);
export function createSpiritualRecord(collection,input={}){const now=new Date().toISOString();return{id:input.id||globalThis.crypto?.randomUUID?.()||`sp-${Date.now()}-${Math.random().toString(16).slice(2)}`,title:String(input.title||"").trim(),description:String(input.description||"").trim(),body:String(input.body||"").trim(),status:input.status||"active",createdAt:input.createdAt||now,updatedAt:now,collection};}
export function validateSpiritualRecord(collection,record){if(!SPIRITUAL_COLLECTIONS.includes(collection))return{ok:false,reason:"unknown-collection"};if(!record||typeof record!=="object")return{ok:false,reason:"invalid-record"};if(!String(record.title||"").trim())return{ok:false,reason:"title-required"};if(String(record.title).trim().length>180)return{ok:false,reason:"title-too-long"};if(String(record.description||"").length>4000||String(record.body||"").length>20000)return{ok:false,reason:"content-too-long"};return{ok:true};}
export function canShareSpiritualCollection(collection){return!SENSITIVE_COLLECTIONS.has(collection);}


// Typed P1 domain models. These helpers validate domain contracts only; they do not
// claim that the current generic-record UI or database schema implements every field.
const SPIRITUAL_IMPORTANCE=new Set(["Low","Medium","High","Core"]);
const PRACTICE_KINDS=new Set(["Done","Abstain","Quantity","Duration","Count"]);
const LOG_MODES=new Set(["Own","HabitLinked"]);
const isTime=value=>typeof value==="string"&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
const isDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value+"T00:00:00Z"))&&new Date(value+"T00:00:00Z").toISOString().slice(0,10)===value;
export function createSpiritualValue(input={}){
 return {id:input.id||globalThis.crypto?.randomUUID?.()||`spv-${Date.now()}`,name:String(input.name||"").trim(),description:String(input.description||""),tags:Array.isArray(input.tags)?[...new Set(input.tags.map(String))]:[],importance:SPIRITUAL_IMPORTANCE.has(input.importance)?input.importance:null,rank:Number.isInteger(input.rank)&&input.rank>0?input.rank:null,meaningSource:String(input.meaningSource||""),active:input.active!==false,createdAt:input.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
}
export function validateSpiritualValue(value){
 if(!value||typeof value!=="object")return{ok:false,reason:"invalid-record"};
 if(!String(value.name||"").trim())return{ok:false,reason:"name-required"};
 if(String(value.name).trim().length>120)return{ok:false,reason:"name-too-long"};
 if(value.importance!=null&&!SPIRITUAL_IMPORTANCE.has(value.importance))return{ok:false,reason:"invalid-importance"};
 if(value.rank!=null&&(!Number.isInteger(value.rank)||value.rank<1))return{ok:false,reason:"invalid-rank"};
 if(!Array.isArray(value.tags)||value.tags.some(tag=>typeof tag!=="string"||tag.trim().length>60))return{ok:false,reason:"invalid-tags"};
 if(String(value.description||"").length>4000||String(value.meaningSource||"").length>2000)return{ok:false,reason:"content-too-long"};
 return{ok:true};
}
export function createSpiritualPrinciple(input={}){
 return {id:input.id||globalThis.crypto?.randomUUID?.()||`spp-${Date.now()}`,title:String(input.title||"").trim(),statement:String(input.statement||""),relatedValueId:input.relatedValueId||null,context:String(input.context||""),examples:String(input.examples||""),driftSignals:String(input.driftSignals||""),active:input.active!==false,createdAt:input.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
}
export function validateSpiritualPrinciple(principle){
 if(!principle||typeof principle!=="object")return{ok:false,reason:"invalid-record"};
 if(!String(principle.title||"").trim())return{ok:false,reason:"title-required"};
 if(String(principle.title).trim().length>200)return{ok:false,reason:"title-too-long"};
 for(const key of ["statement","context","examples","driftSignals"])if(typeof principle[key]!=="string")return{ok:false,reason:`invalid-${key}`};
 if(principle.statement.length>4000||principle.context.length>2000||principle.examples.length>4000||principle.driftSignals.length>2000)return{ok:false,reason:"content-too-long"};
 return{ok:true};
}
export function createSpiritualPractice(input={}){
 const slots=Array.isArray(input.slots)&&input.slots.length?input.slots.map((slot,index)=>({key:String(slot.key||`slot-${index+1}`),label:String(slot.label||"").trim(),preferredTime:slot.preferredTime||null})): [{key:"default",label:"الممارسة",preferredTime:null}];
 return {id:input.id||globalThis.crypto?.randomUUID?.()||`spr-${Date.now()}`,name:String(input.name||"").trim(),type:String(input.type||"").trim(),tags:Array.isArray(input.tags)?[...new Set(input.tags.map(String))]:[],kind:PRACTICE_KINDS.has(input.kind)?input.kind:"Done",unit:String(input.unit||""),target:input.target??null,minimum:input.minimum??null,slots,slotsRequired:input.slotsRequired||"All",frequency:input.frequency||{mode:"Daily"},preferredTime:input.preferredTime||null,reminder:{enabled:input.reminder?.enabled===true,textMode:["Neutral","Name","Why"].includes(input.reminder?.textMode)?input.reminder.textMode:"Neutral"},why:String(input.why||""),habitRef:input.habitRef||null,logMode:input.logMode||"Own",signalKind:input.signalKind||null,active:input.active!==false,archivedAt:input.archivedAt||null,createdAt:input.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
}
export function validateFrequencyConfig(config){
 if(!config||typeof config!=="object"||Array.isArray(config)||typeof config.mode!=="string")return{ok:false,reason:"invalid-frequency"};
 const modes=new Set(["Daily","Weekdays","TimesPerWeek","TimesPerMonth","EveryNDays","MonthDay","Dates","Flexible"]);
 if(!modes.has(config.mode))return{ok:false,reason:"invalid-frequency-mode"};
 if(config.mode==="Weekdays"&&(!Array.isArray(config.days)||!config.days.length||config.days.some(d=>!Number.isInteger(d)||d<0||d>6)||new Set(config.days).size!==config.days.length))return{ok:false,reason:"invalid-weekdays"};
 if(config.mode==="TimesPerWeek"&&(!Number.isInteger(config.n)||config.n<1||config.n>7))return{ok:false,reason:"invalid-frequency-count"};
 if(config.mode==="TimesPerMonth"&&(!Number.isInteger(config.n)||config.n<1||config.n>31))return{ok:false,reason:"invalid-frequency-count"};
 if(config.mode==="EveryNDays"&&(!Number.isInteger(config.n)||config.n<1||config.n>365))return{ok:false,reason:"invalid-frequency-count"};
 if(config.mode==="EveryNDays"&&!isDate(config.anchor))return{ok:false,reason:"invalid-frequency-anchor"};
 if(config.mode==="MonthDay"&&(!["gregorian","hijri"].includes(config.calendar)||!Array.isArray(config.days)||!config.days.length||config.days.some(d=>!Number.isInteger(d)||d<1||d>(config.calendar==="hijri"?30:31))||new Set(config.days).size!==config.days.length||![-1,0,1].includes(config.day_offset??0)))return{ok:false,reason:"invalid-month-days"};
 if(config.mode==="Dates"&&(!Array.isArray(config.dates)||config.dates.length===0||config.dates.some(d=>!isDate(d))||new Set(config.dates).size!==config.dates.length))return{ok:false,reason:"invalid-dates"};
 return{ok:true};
}
export function validateSpiritualPractice(practice){
 if(!practice||typeof practice!=="object")return{ok:false,reason:"invalid-record"};
 if(!String(practice.name||"").trim())return{ok:false,reason:"name-required"};
 if(String(practice.name).trim().length>120)return{ok:false,reason:"name-too-long"};
 if(!PRACTICE_KINDS.has(practice.kind))return{ok:false,reason:"invalid-kind"};
 if(!LOG_MODES.has(practice.logMode))return{ok:false,reason:"invalid-log-mode"};
 if((practice.logMode==="HabitLinked")!==Boolean(practice.habitRef))return{ok:false,reason:"habit-link-mode-mismatch"};
 for(const key of ["target","minimum"])if(practice[key]!=null&&(!Number.isFinite(Number(practice[key]))||Number(practice[key])<=0))return{ok:false,reason:`invalid-${key}`};
 if(practice.target!=null&&practice.minimum!=null&&Number(practice.minimum)>Number(practice.target))return{ok:false,reason:"minimum-exceeds-target"};
 if(!Array.isArray(practice.tags)||practice.tags.some(tag=>typeof tag!=="string"||tag.trim().length>60))return{ok:false,reason:"invalid-tags"};
 if(typeof practice.slotsRequired!=="string"||!(practice.slotsRequired==="All"||/^AtLeast\([1-8]\)$/.test(practice.slotsRequired)))return{ok:false,reason:"invalid-slots-required"};
 if(!Array.isArray(practice.slots)||practice.slots.length<1||practice.slots.length>8)return{ok:false,reason:"invalid-slots-count"};
 if(practice.slotsRequired!=="All"&&Number(practice.slotsRequired.match(/[1-8]/)?.[0]||0)>practice.slots.length)return{ok:false,reason:"slots-required-exceeds-slots"};
 const keys=new Set();
 for(const slot of practice.slots){if(!slot||!String(slot.key||"").trim()||keys.has(slot.key)||!String(slot.label||"").trim())return{ok:false,reason:"invalid-slot"};keys.add(slot.key);if(slot.preferredTime!=null&&!isTime(slot.preferredTime))return{ok:false,reason:"invalid-slot-time"};}
 if(practice.preferredTime!=null&&!isTime(practice.preferredTime))return{ok:false,reason:"invalid-preferred-time"};
 if(practice.logMode==="HabitLinked"&&practice.habitRef?.system!=="habit")return{ok:false,reason:"invalid-habit-reference"};
 const frequency=validateFrequencyConfig(practice.frequency);if(!frequency.ok)return frequency;
 if(!practice.reminder||typeof practice.reminder.enabled!=="boolean"||!["Neutral","Name","Why"].includes(practice.reminder.textMode))return{ok:false,reason:"invalid-reminder"};
 return{ok:true};
}


// Compatibility adapter: keep the existing owner-scoped row envelope while
// preserving typed payloads in a versioned body. Legacy rows remain readable.
export function encodeSpiritualTypedRecord(collection, model){
 let kind=collection, valid;
 if(collection==="values")valid=validateSpiritualValue(model);
 else if(collection==="principles")valid=validateSpiritualPrinciple(model);
 else if(collection==="practices")valid=validateSpiritualPractice(model);
 else if(collection==="reflections")valid=validateSpiritualReflection(model);
 else if(collection==="important_dates")valid=validateSpiritualImportantDate(model);
 else if(collection==="reviews")valid=validateSpiritualReview(model);
 else if(collection==="goals")valid=validateSpiritualGoal(model);
 else if(collection==="commitments")valid=validateSpiritualCommitment(model);
 else return{ok:false,reason:"unsupported-typed-collection"};
 if(!valid.ok)return valid;
 const title=collection==="values"?model.name:collection==="practices"?model.name:collection==="reflections"?"تأمل · "+model.date:collection==="important_dates"?model.name:collection==="reviews"?"مراجعة · "+model.period+" · "+model.periodStart:collection==="goals"?model.name:model.title;
 const description=collection==="values"?model.description:collection==="principles"?model.statement:collection==="reflections"?model.prompt:collection==="important_dates"?model.kind:collection==="reviews"?model.status:model.why;
 return{ok:true,record:{id:model.id,title,description,body:JSON.stringify({schema:"spiritual.typed.v1",kind,data:model}),status:model.active===false?"archived":"active",collection,createdAt:model.createdAt,updatedAt:model.updatedAt}};
}
export function decodeSpiritualTypedRecord(collection, record){
 if(!record||typeof record!=="object")return{kind:"legacy",data:null};
 try{
  const parsed=JSON.parse(record.body||"");
  if(parsed?.schema!=="spiritual.typed.v1"||parsed.kind!==collection||!parsed.data||typeof parsed.data!=="object")return{kind:"legacy",data:null};
  const validators={values:validateSpiritualValue,principles:validateSpiritualPrinciple,practices:validateSpiritualPractice,reflections:validateSpiritualReflection,important_dates:validateSpiritualImportantDate,reviews:validateSpiritualReview,goals:validateSpiritualGoal,commitments:validateSpiritualCommitment};
  const validator=validators[collection];
  if(!validator||!validator(parsed.data).ok)return{kind:"legacy",data:null};
  return{kind:"typed",data:parsed.data};
 }catch{return{kind:"legacy",data:null};}
}


// P4 season domain contract. Seasons are user-defined schedule overlays, not religious-date presets.
const SPIRITUAL_SEASON_STATUSES=new Set(["Draft","Scheduled","Active","Completed","Archived"]);
const SPIRITUAL_SEASON_MODES=new Set(["Pause","NotExpected","Expected"]);
export function createSpiritualSeason(input={}){
 const now=new Date().toISOString();
 return {id:input.id||globalThis.crypto?.randomUUID?.()||`sps-${Date.now()}`,name:String(input.name||"").trim(),description:String(input.description||""),startDate:String(input.startDate||""),endDate:String(input.endDate||""),status:SPIRITUAL_SEASON_STATUSES.has(input.status)?input.status:"Draft",practiceOverrides:Array.isArray(input.practiceOverrides)?input.practiceOverrides.map(x=>({...x})):[],createdAt:input.createdAt||now,updatedAt:now};
}
export function validateSpiritualSeason(season,existing=[]){
 if(!season||typeof season!=="object")return{ok:false,reason:"invalid-record"};
 if(!String(season.name||"").trim())return{ok:false,reason:"name-required"};
 if(String(season.name).trim().length>120)return{ok:false,reason:"name-too-long"};
 if(String(season.description||"").length>4000)return{ok:false,reason:"content-too-long"};
 if(!isDate(season.startDate)||!isDate(season.endDate)||season.endDate<season.startDate)return{ok:false,reason:"invalid-date-range"};
 if(!SPIRITUAL_SEASON_STATUSES.has(season.status))return{ok:false,reason:"invalid-status"};
 if(!Array.isArray(season.practiceOverrides))return{ok:false,reason:"invalid-overrides"};
 const seen=new Set();
 for(const item of season.practiceOverrides){
  if(!item||typeof item.practiceId!=="string"||!item.practiceId.trim()||!SPIRITUAL_SEASON_MODES.has(item.mode))return{ok:false,reason:"invalid-override"};
  if(seen.has(item.practiceId))return{ok:false,reason:"duplicate-practice-override"};
  seen.add(item.practiceId);
 }
 if(["Scheduled","Active"].includes(season.status)){
  const overlap=existing.find(other=>other&&other.id!==season.id&&["Scheduled","Active"].includes(other.status)&&other.startDate<=season.endDate&&season.startDate<=other.endDate&&
   (season.practiceOverrides||[]).some(a=>(other.practiceOverrides||[]).some(b=>a.practiceId===b.practiceId)));
  if(overlap)return{ok:false,reason:"season-practice-overlap",conflictingSeasonId:overlap.id};
 }
 return{ok:true};
}
export function getSeasonPracticeOverrides(seasons,practiceId,date){
 if(!isDate(date))return null;
 const active=(seasons||[]).filter(s=>s&&["Scheduled","Active"].includes(s.status)&&isDate(s.startDate)&&isDate(s.endDate)&&s.startDate<=date&&date<=s.endDate&&(s.practiceOverrides||[]).some(x=>x.practiceId===practiceId));
 if(!active.length)return [];
 if(active.length>1)return {ok:false,reason:"season-overlap"};
 return active[0].practiceOverrides.filter(x=>x.practiceId===practiceId).map(x=>({...x,startDate:active[0].startDate,endDate:active[0].endDate,updatedAt:active[0].updatedAt||active[0].createdAt||""}));
}

// P2 practice logs. Missing rows are intentionally "unrecorded", never Missed.
const PRACTICE_LOG_STATUSES=new Set(["Done","Partial","Excused"]);
const PRACTICE_LOG_SOURCES=new Set(["Manual","Quick","Import","Proposal"]);
export function createSpiritualPracticeLog(input={}){
 const practiceId=String(input.practiceId||"").trim(),date=String(input.date||"").trim(),slotKey=String(input.slotKey||"_").trim();
 return{id:input.id||[practiceId,date,slotKey].join(":"),practiceId,date,slotKey,status:PRACTICE_LOG_STATUSES.has(input.status)?input.status:"Done",actual:input.actual===""||input.actual==null?null:Number(input.actual),durationMin:input.durationMin===""||input.durationMin==null?null:Number(input.durationMin),note:String(input.note||""),privateReflection:String(input.privateReflection||""),source:PRACTICE_LOG_SOURCES.has(input.source)?input.source:"Manual",clientOpId:input.clientOpId||globalThis.crypto?.randomUUID?.()||`op-${Date.now()}`,loggedAt:input.loggedAt||new Date().toISOString()};
}
export function validateSpiritualPracticeLog(log,practice){
 if(!log||typeof log!=="object")return{ok:false,reason:"invalid-record"};
 if(!practice||!practice.id||practice.logMode!=="Own")return{ok:false,reason:"practice-not-own"};
 if(log.practiceId!==practice.id)return{ok:false,reason:"practice-mismatch"};
 if(!isDate(log.date))return{ok:false,reason:"invalid-date"};
 const slots=Array.isArray(practice.slots)?practice.slots:[];
 if(!(slots.length===1&&log.slotKey==="_")&&!slots.some(s=>s.key===log.slotKey))return{ok:false,reason:"invalid-slot"};
 if(!PRACTICE_LOG_STATUSES.has(log.status))return{ok:false,reason:"invalid-status"};
 if(log.actual!=null&&(!Number.isFinite(Number(log.actual))||Number(log.actual)<0))return{ok:false,reason:"invalid-actual"};
 if(log.durationMin!=null&&(!Number.isInteger(Number(log.durationMin))||Number(log.durationMin)<0||Number(log.durationMin)>1440))return{ok:false,reason:"invalid-duration"};
 if(typeof log.note!=="string"||log.note.length>2000||typeof log.privateReflection!=="string"||log.privateReflection.length>4000)return{ok:false,reason:"content-too-long"};
 if(!PRACTICE_LOG_SOURCES.has(log.source))return{ok:false,reason:"invalid-source"};
 if(typeof log.clientOpId!=="string"||!log.clientOpId.trim()||log.clientOpId.length>100)return{ok:false,reason:"invalid-client-op"};
 return{ok:true};
}
export function getPracticeCompletionLevel(log,practice){
 if(!log||log.status==="Excused")return log?.status==="Excused"?"Excused":"None";
 if(log.status==="Partial")return"Partial";
 if(log.actual!=null&&practice?.target!=null){
  const actual=Number(log.actual),target=Number(practice.target),minimum=Number(practice.minimum??practice.target);
  if(actual>=target)return"Full";
  if(actual>=minimum)return"Minimum";
  return actual>0?"Partial":"None";
 }
 return log.status==="Done"?"Full":"Partial";
}
export function isPracticeExpectedOnDate(practice,date,context={}){
 if(!practice||!isDate(date))return null;
 if(practice.active===false||practice.archivedAt)return false;
 const createdDate=typeof practice.createdAt==="string"?practice.createdAt.slice(0,10):null;
 if(isDate(createdDate)&&date<createdDate)return false;
 const periods=[...(Array.isArray(context.pausePeriods)?context.pausePeriods:[]),...(Array.isArray(practice.pausePeriods)?practice.pausePeriods:[])];
 if(periods.some(p=>p&&isDate(p.startDate)&&isDate(p.endDate)&&p.startDate<=date&&date<=p.endDate))return false;
 // Explicit per-date schedule overrides have priority over season overlays.
 const overrides=[...(Array.isArray(context.scheduleOverrides)?context.scheduleOverrides:[]),...(Array.isArray(practice.scheduleOverrides)?practice.scheduleOverrides:[])].filter(o=>o&&isDate(o.startDate)&&isDate(o.endDate)&&o.startDate<=date&&date<=o.endDate).sort((a,b)=>String(b.updatedAt||"").localeCompare(String(a.updatedAt||"")));
 if(overrides.length){const mode=overrides[0].mode;if(mode==="Pause"||mode==="NotExpected")return false;if(mode==="Expected")return true;}
 // Season overrides are derived at read time. They never mutate the base frequency,
 // so the original schedule automatically resumes outside the season date range.
 if(Array.isArray(context.seasons)){
  const seasonOverrides=getSeasonPracticeOverrides(context.seasons,practice.id,date);
  if(seasonOverrides===null)return null;
  if(seasonOverrides?.ok===false)return null; // ambiguous overlapping seasons: never guess
  if(seasonOverrides.length){
   const mode=seasonOverrides[0].mode;
   if(mode==="Pause"||mode==="NotExpected")return false;
   if(mode==="Expected")return true;
  }
 }
 const f=practice.frequency||{mode:"Daily"},day=new Date(date+"T00:00:00.000Z");
 if(f.mode==="Daily")return true;
 if(f.mode==="Weekdays")return Array.isArray(f.days)?f.days.includes(day.getUTCDay()):null;
 if(f.mode==="EveryNDays"){if(!Number.isInteger(f.n)||f.n<1||!isDate(f.anchor))return null;const anchor=new Date(f.anchor+"T00:00:00.000Z");const delta=Math.round((day-anchor)/86400000);return delta>=0&&delta%f.n===0;}
 if(f.mode==="Dates")return Array.isArray(f.dates)?f.dates.includes(date):null;
 if(f.mode==="MonthDay"){
  if(!Array.isArray(f.days))return null;
  const offset=Number(f.day_offset||0),shifted=new Date(day.getTime()-offset*86400000);
  if(f.calendar==="gregorian")return f.days.includes(shifted.getUTCDate());
  if(f.calendar==="hijri"){
   try{
    // Umm al-Qura is the documented default approximation. Keep this derived
    // check deterministic for the runtime's ICU data and never guess on failure.
    const algorithm=context.hijriAlgorithm==="tabular"?"islamic":"islamic-umalqura";
    const parts=new Intl.DateTimeFormat(`en-u-ca-${algorithm}-nu-latn`,{day:"numeric",month:"numeric",timeZone:"UTC"}).formatToParts(shifted);
    const hijriDay=Number(parts.find(x=>x.type==="day")?.value);
    if(!Number.isInteger(hijriDay)||hijriDay<1||hijriDay>30)return null;
    if(f.days.includes(hijriDay))return true;
    if(hijriDay===29&&f.days.includes(30)){
     const next=new Date(shifted.getTime()+86400000);
     const nextParts=new Intl.DateTimeFormat(`en-u-ca-${algorithm}-nu-latn`,{day:"numeric",timeZone:"UTC"}).formatToParts(next);
     const nextDay=Number(nextParts.find(x=>x.type==="day")?.value);
     // Day 30 is treated as the final day only when this Hijri month has
     // 29 days; the next calendar day must be day 1 of the following month.
     if(nextDay===1)return true;
    }
    return false;
   }catch{return null;}
  }
  return null;
 }
 // Count-based and flexible schedules do not identify a specific expected day.
 return null;
}
export function getPracticeDaySummary(logs,practice,date,context={}){
 const own=(logs||[]).filter(x=>x.practiceId===practice?.id&&(!date||x.date===date));
 const levels=own.map(x=>getPracticeCompletionLevel(x,practice));
 const maintained=levels.filter(x=>x==="Full"||x==="Minimum").length;
 const partial=levels.filter(x=>x==="Partial").length;
 const required=practice?.slotsRequired==="All"?(practice?.slots?.length||1):Number(String(practice?.slotsRequired||"AtLeast(1)").match(/[1-8]/)?.[0]||1);
 const expected=date?isPracticeExpectedOnDate(practice,date,context):null;
 const state=own.length&&levels.every(x=>x==="Excused")?"Excused":maintained>=required?"Maintained":maintained+partial>0?"Partial":expected===false?"NotExpected":"Unrecorded";
 return{logged:own.length,maintainedSlots:maintained,partialSlots:partial,requiredSlots:required,state};
}

const SPIRITUAL_UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function getSpiritualRecordRelations(collection,record){
 let data;
 try{const parsed=JSON.parse(record?.body||"");if(parsed?.schema!=="spiritual.typed.v1"||parsed.kind!==collection||!parsed.data)return[];data=parsed.data;}catch{return[];}
 const edges=[];
 const add=(targetId,targetCollection,relationType)=>{if(typeof targetId==="string"&&SPIRITUAL_UUID.test(targetId))edges.push({target_id:targetId,target_collection:targetCollection,relation_type:relationType});};
 if(collection==="principles")add(data.relatedValueId,"values","principle_value");
 if(collection==="practices")for(const id of [...(data.valueIds||[]),...(data.relatedValueIds||[])])add(id,"values","practice_value");
 if(collection==="goals")for(const link of data.practiceLinks||[])add(typeof link==="string"?link:link.practiceId,"practices","goal_practice");
 if(collection==="goals")for(const id of data.practiceIds||[])add(id,"practices","goal_practice");
 if(collection==="commitments"){add(data.relatedValueId,"values","commitment_value");add(data.relatedPrincipleId,"principles","commitment_principle");add(data.practiceId,"practices","commitment_practice");}
 if(collection==="reflections")add(data.commitmentId,"commitments","reflection_commitment");
 const unique=new Map(edges.map(edge=>[edge.relation_type+":"+edge.target_collection+":"+edge.target_id,edge]));
 return [...unique.values()];
}

const SPIRITUAL_REVIEW_PERIODS=new Set(["Weekly","Monthly","Annual","Custom"]);
const SPIRITUAL_REVIEW_STATES=new Set(["Draft","Completed","Skipped"]);
const SPIRITUAL_REVIEW_KEYS=new Set(["values_reflection","practices_review","lessons","gratitude","commitments","notes","custom"]);
export function createSpiritualReflection(input={}){
 const now=new Date().toISOString();
 return{id:input.id||globalThis.crypto?.randomUUID?.()||"spr-"+Date.now(),date:String(input.date||""),prompt:String(input.prompt||""),reflection:String(input.reflection||""),gratitude:String(input.gratitude||""),lesson:String(input.lesson||""),concern:String(input.concern||""),nextCommitment:String(input.nextCommitment||""),tags:Array.isArray(input.tags)?[...new Set(input.tags.map(x=>String(x).trim()).filter(Boolean))]:[],journalRef:input.journalRef||null,commitmentId:input.commitmentId||null,createdAt:input.createdAt||now,updatedAt:now};
}
export function validateSpiritualReflection(value){
 if(!value||typeof value!=="object")return{ok:false,reason:"invalid-record"};
 if(!isDate(value.date))return{ok:false,reason:"invalid-date"};
 for(const key of ["prompt","reflection","gratitude","lesson","concern","nextCommitment"])if(typeof value[key]!=="string"||value[key].length>(key==="reflection"?20000:4000))return{ok:false,reason:"content-too-long"};
 if(!Array.isArray(value.tags)||value.tags.length>30||value.tags.some(x=>typeof x!=="string"||x.length>60))return{ok:false,reason:"invalid-tags"};
 return{ok:true};
}
export function createSpiritualImportantDate(input={}){
 const now=new Date().toISOString();
 return{id:input.id||globalThis.crypto?.randomUUID?.()||"spd-"+Date.now(),name:String(input.name||"").trim(),kind:String(input.kind||"").trim(),calendarSystem:input.calendarSystem==="hijri"?"hijri":"gregorian",date:String(input.date||""),month:input.month==null?null:Number(input.month),day:input.day==null?null:Number(input.day),year:input.year==null||input.year===""?null:Number(input.year),dayOffset:input.dayOffset==null?0:Number(input.dayOffset),recurrence:input.recurrence||"Once",weekday:input.weekday==null?null:Number(input.weekday),reminderDays:Array.isArray(input.reminderDays)?[...new Set(input.reminderDays.map(Number))]:[],private:input.private!==false,showInCalendar:input.showInCalendar===true,notes:String(input.notes||""),source:input.source||"Manual",createdAt:input.createdAt||now,updatedAt:now};
}
export function validateSpiritualImportantDate(value){
 if(!value||typeof value!=="object"||!String(value.name||"").trim()||value.name.length>120)return{ok:false,reason:"name-required"};
 if(!["gregorian","hijri"].includes(value.calendarSystem)||!["Once","Yearly","Monthly","Weekly"].includes(value.recurrence)||![-1,0,1].includes(value.dayOffset))return{ok:false,reason:"invalid-date-config"};
 if(value.recurrence==="Once"&&!isDate(value.date))return{ok:false,reason:"invalid-date"};
 if(value.recurrence==="Yearly"&&(!Number.isInteger(value.month)||value.month<1||value.month>12||!Number.isInteger(value.day)||value.day<1||value.day>(value.calendarSystem==="hijri"?30:31)))return{ok:false,reason:"invalid-date-config"};
 if(value.recurrence==="Monthly"&&(!Number.isInteger(value.day)||value.day<1||value.day>31))return{ok:false,reason:"invalid-date-config"};
 if(value.year!=null&&(!Number.isInteger(value.year)||value.year<1||value.year>9999))return{ok:false,reason:"invalid-year"};
 if(value.recurrence==="Weekly"&&(!Number.isInteger(value.weekday)||value.weekday<0||value.weekday>6))return{ok:false,reason:"invalid-weekday"};
 if(!Array.isArray(value.reminderDays)||value.reminderDays.some(n=>!Number.isInteger(n)||n<0||n>365)||new Set(value.reminderDays).size!==value.reminderDays.length)return{ok:false,reason:"invalid-reminders"};
 if(value.notes.length>4000||value.kind.length>80)return{ok:false,reason:"content-too-long"};
 return{ok:true};
}
export function createSpiritualReview(input={}){
 const now=new Date().toISOString();
 return{id:input.id||globalThis.crypto?.randomUUID?.()||"sprv-"+Date.now(),period:SPIRITUAL_REVIEW_PERIODS.has(input.period)?input.period:"Weekly",periodStart:String(input.periodStart||""),periodEnd:String(input.periodEnd||""),status:SPIRITUAL_REVIEW_STATES.has(input.status)?input.status:"Draft",sections:Array.isArray(input.sections)?input.sections.map((x,i)=>({key:x.key||"custom",prompt:String(x.prompt||""),answer:String(x.answer||""),position:Number.isInteger(x.position)?x.position:i})):[],summarySnapshot:input.summarySnapshot&&typeof input.summarySnapshot==="object"?input.summarySnapshot:{},completedAt:input.completedAt||null,createdAt:input.createdAt||now,updatedAt:now};
}
export function validateSpiritualReview(value){
 if(!value||typeof value!=="object"||!SPIRITUAL_REVIEW_PERIODS.has(value.period)||!SPIRITUAL_REVIEW_STATES.has(value.status))return{ok:false,reason:"invalid-review"};
 if(!isDate(value.periodStart)||!isDate(value.periodEnd)||value.periodEnd<value.periodStart)return{ok:false,reason:"invalid-date-range"};
 if(!Array.isArray(value.sections)||value.sections.length>30||value.sections.some(x=>!SPIRITUAL_REVIEW_KEYS.has(x.key)||x.prompt.length>2000||x.answer.length>12000))return{ok:false,reason:"invalid-review-sections"};
 if(new Set(value.sections.map(x=>x.key)).size!==value.sections.length)return{ok:false,reason:"duplicate-review-section"};
 return{ok:true};
}

const SPIRITUAL_GOAL_TYPES=new Set(["Sum","Days","Milestones","Free"]);
const SPIRITUAL_GOAL_STATES=new Set(["Active","Paused","Completed","Released"]);
const SPIRITUAL_COMMITMENT_STATES=new Set(["Active","Paused","Completed","Released","Revised"]);
const SPIRITUAL_COMMITMENT_CADENCES=new Set(["None","Daily","Weekly","Custom"]);
export function createSpiritualGoal(input={}){
 const now=new Date().toISOString();
 return{id:input.id||globalThis.crypto?.randomUUID?.()||"spg-"+Date.now(),name:String(input.name||"").trim(),description:String(input.description||""),type:SPIRITUAL_GOAL_TYPES.has(input.type)?input.type:"Free",unit:String(input.unit||""),startDate:String(input.startDate||""),targetDate:String(input.targetDate||""),status:SPIRITUAL_GOAL_STATES.has(input.status)?input.status:"Active",targetValue:input.targetValue==null||input.targetValue===""?null:Number(input.targetValue),coreGoalRef:input.coreGoalRef||null,notes:String(input.notes||""),practiceIds:Array.isArray(input.practiceIds)?[...new Set(input.practiceIds)]:[],milestones:Array.isArray(input.milestones)?input.milestones.map(x=>({...x})):[],createdAt:input.createdAt||now,updatedAt:now};
}
export function validateSpiritualGoal(value){
 if(!value||typeof value!=="object"||!String(value.name||"").trim()||value.name.length>120)return{ok:false,reason:"name-required"};
 if(!SPIRITUAL_GOAL_TYPES.has(value.type)||!SPIRITUAL_GOAL_STATES.has(value.status))return{ok:false,reason:"invalid-goal-state"};
 if(!isDate(value.startDate)||!isDate(value.targetDate)||value.targetDate<value.startDate)return{ok:false,reason:"invalid-date-range"};
 if(value.targetValue!=null&&(!Number.isFinite(value.targetValue)||value.targetValue<=0))return{ok:false,reason:"invalid-target"};
 if(value.description.length>4000||value.notes.length>4000||value.unit.length>60)return{ok:false,reason:"content-too-long"};
 if(!Array.isArray(value.practiceIds)||value.practiceIds.length>100||!Array.isArray(value.milestones)||value.milestones.length>100)return{ok:false,reason:"invalid-goal-links"};
 return{ok:true};
}
export function createSpiritualCommitment(input={}){
 const now=new Date().toISOString();
 return{id:input.id||globalThis.crypto?.randomUUID?.()||"spc-"+Date.now(),title:String(input.title||"").trim(),description:String(input.description||""),relatedValueId:input.relatedValueId||null,relatedPrincipleId:input.relatedPrincipleId||null,practiceId:input.practiceId||null,startDate:String(input.startDate||""),reviewDate:String(input.reviewDate||""),cadence:SPIRITUAL_COMMITMENT_CADENCES.has(input.cadence)?input.cadence:"None",cadenceConfig:input.cadenceConfig&&typeof input.cadenceConfig==="object"?input.cadenceConfig:{},status:SPIRITUAL_COMMITMENT_STATES.has(input.status)?input.status:"Active",statusNote:String(input.statusNote||""),revisedFromId:input.revisedFromId||null,notes:String(input.notes||""),createdAt:input.createdAt||now,updatedAt:now};
}
export function validateSpiritualCommitment(value){
 if(!value||typeof value!=="object"||!String(value.title||"").trim()||value.title.length>180)return{ok:false,reason:"title-required"};
 if(!SPIRITUAL_COMMITMENT_STATES.has(value.status)||!SPIRITUAL_COMMITMENT_CADENCES.has(value.cadence))return{ok:false,reason:"invalid-commitment-state"};
 if(!isDate(value.startDate)||!isDate(value.reviewDate)||value.reviewDate<value.startDate)return{ok:false,reason:"invalid-date-range"};
 if(value.description.length>4000||value.statusNote.length>2000||value.notes.length>4000)return{ok:false,reason:"content-too-long"};
 return{ok:true};
}
