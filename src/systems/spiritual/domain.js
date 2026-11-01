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
 if(!Array.isArray(value.tags))return{ok:false,reason:"invalid-tags"};
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
 return{ok:true};
}
export function createSpiritualPractice(input={}){
 const slots=Array.isArray(input.slots)&&input.slots.length?input.slots.map((slot,index)=>({key:String(slot.key||`slot-${index+1}`),label:String(slot.label||"").trim(),preferredTime:slot.preferredTime||null})): [{key:"default",label:"الممارسة",preferredTime:null}];
 return {id:input.id||globalThis.crypto?.randomUUID?.()||`spr-${Date.now()}`,name:String(input.name||"").trim(),type:String(input.type||"").trim(),tags:Array.isArray(input.tags)?[...new Set(input.tags.map(String))]:[],kind:PRACTICE_KINDS.has(input.kind)?input.kind:"Done",unit:String(input.unit||""),target:input.target??null,minimum:input.minimum??null,slots,slotsRequired:input.slotsRequired||"All",preferredTime:input.preferredTime||null,reminder:{enabled:input.reminder?.enabled===true,textMode:["Neutral","Name","Why"].includes(input.reminder?.textMode)?input.reminder.textMode:"Neutral"},why:String(input.why||""),habitRef:input.habitRef||null,logMode:input.logMode||"Own",signalKind:input.signalKind||null,active:input.active!==false,archivedAt:input.archivedAt||null,createdAt:input.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
}
export function validateFrequencyConfig(config){
 if(!config||typeof config!=="object"||Array.isArray(config)||typeof config.mode!=="string")return{ok:false,reason:"invalid-frequency"};
 const modes=new Set(["Daily","Weekdays","TimesPerWeek","TimesPerMonth","EveryNDays","MonthDay","Dates","Flexible"]);
 if(!modes.has(config.mode))return{ok:false,reason:"invalid-frequency-mode"};
 if(config.mode==="Weekdays"&&(!Array.isArray(config.days)||!config.days.length||config.days.some(d=>!Number.isInteger(d)||d<0||d>6)||new Set(config.days).size!==config.days.length))return{ok:false,reason:"invalid-weekdays"};
 if(["TimesPerWeek","TimesPerMonth","EveryNDays"].includes(config.mode)&&(!Number.isInteger(config.n)||config.n<1||config.n>31))return{ok:false,reason:"invalid-frequency-count"};
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
 if(!Array.isArray(practice.tags)||practice.tags.some(tag=>typeof tag!=="string"||tag.trim().length>60))return{ok:false,reason:"invalid-tags"};\n if(typeof practice.slotsRequired!=="string"||!(practice.slotsRequired==="All"||/^AtLeast\\([1-8]\\)$/.test(practice.slotsRequired)))return{ok:false,reason:"invalid-slots-required"};\n if(!Array.isArray(practice.slots)||practice.slots.length<1||practice.slots.length>8)return{ok:false,reason:"invalid-slots-count"};
 const keys=new Set();
 for(const slot of practice.slots){if(!slot||!String(slot.key||"").trim()||keys.has(slot.key)||!String(slot.label||"").trim())return{ok:false,reason:"invalid-slot"};keys.add(slot.key);if(slot.preferredTime!=null&&!isTime(slot.preferredTime))return{ok:false,reason:"invalid-slot-time"};}
 if(practice.preferredTime!=null&&!isTime(practice.preferredTime))return{ok:false,reason:"invalid-preferred-time"};
 if(practice.logMode==="HabitLinked"&&practice.habitRef?.system!=="habit")return{ok:false,reason:"invalid-habit-reference"};
 if(!practice.reminder||typeof practice.reminder.enabled!=="boolean"||!["Neutral","Name","Why"].includes(practice.reminder.textMode))return{ok:false,reason:"invalid-reminder"};
 return{ok:true};
}
