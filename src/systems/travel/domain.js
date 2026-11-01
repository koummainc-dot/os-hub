export const TRAVEL_SECTIONS = [
  {id:"home",label:"الرئيسية",icon:"⌂"},{id:"trips",label:"الرحلات",icon:"🧳"},
  {id:"active",label:"الرحلة النشطة",icon:"📍"},{id:"itinerary",label:"برنامج الرحلة",icon:"🗓️"},
  {id:"bookings",label:"الحجوزات",icon:"🎟️"},{id:"budget",label:"الميزانية",icon:"💳"},
  {id:"packing",label:"قائمة التجهيز",icon:"🎒"},{id:"destinations",label:"الوجهات",icon:"🌍"},
  {id:"places",label:"الأماكن والتجارب",icon:"🗺️"},{id:"documents",label:"المستندات",icon:"🛂"},
  {id:"memories",label:"الذكريات",icon:"📸"},{id:"reviews",label:"التقييمات",icon:"⭐"},
  {id:"settings",label:"الإعدادات",icon:"⚙️"}
];
export const TRIP_STATUSES = ["idea","planning","booked","active","completed","cancelled"];
export const TRIP_STATUS_LABELS = {idea:"فكرة",planning:"قيد التخطيط",booked:"تم الحجز",active:"جارية",completed:"مكتملة",cancelled:"ملغاة"};
export function emptyTravelData(){return {schemaVersion:1,trips:[],itinerary:[],bookings:[],packing:[],destinations:[],places:[],documents:[],memories:[],reviews:[],settings:{baseCurrency:"EGP",defaultPackingTemplate:[]},audit:[]};}
export function normalizeTravelData(value){const base=emptyTravelData(),src=value&&typeof value==="object"?value:{};const out={...base,...src,schemaVersion:1};for(const key of ["trips","itinerary","bookings","packing","destinations","places","documents","memories","reviews","audit"])out[key]=Array.isArray(src[key])?src[key]:[];out.settings={...base.settings,...(src.settings||{})};return out;}

const TRAVEL_COLLECTIONS=["trips","itinerary","bookings","packing","destinations","places","documents","memories","reviews","audit"];
const TRAVEL_REFERENCE_RULES=[
  ["itinerary","tripId","trips","البرنامج"],
  ["bookings","tripId","trips","الحجوزات"],
  ["packing","tripId","trips","التجهيز"],
  ["documents","tripId","trips","المستندات"],
  ["memories","tripId","trips","الذكريات"],
  ["reviews","tripId","trips","المراجعات"],
  ["places","destinationId","destinations","الأماكن"]
];
export function validateTravelImport(value){
  const errors=[],warnings=[];
  if(!value||typeof value!=="object"||Array.isArray(value))return {valid:false,errors:["ملف الاستيراد يجب أن يحتوي على كائن JSON في المستوى الرئيسي."],warnings:[],counts:{}};
  if(value.schemaVersion!=null&&(!Number.isInteger(Number(value.schemaVersion))||Number(value.schemaVersion)>1||Number(value.schemaVersion)<1))errors.push("إصدار ملف السفر غير مدعوم.");
  for(const key of TRAVEL_COLLECTIONS){
    if(value[key]!=null&&!Array.isArray(value[key]))errors.push("الحقل "+key+" يجب أن يكون قائمة.");
  }
  if(value.settings!=null&&(typeof value.settings!=="object"||Array.isArray(value.settings)))errors.push("حقل الإعدادات يجب أن يكون كائنًا.");
  const collections={};
  for(const key of TRAVEL_COLLECTIONS){
    const rows=Array.isArray(value[key])?value[key]:[];
    collections[key]=rows;
    const ids=new Set();
    rows.forEach((row,index)=>{
      if(!row||typeof row!=="object"||Array.isArray(row)){errors.push(key+"["+index+"] ليس سجلًا صالحًا.");return;}
      if(!String(row.id||"").trim())errors.push(key+"["+index+"] لا يحتوي على معرّف.");
      else if(ids.has(String(row.id)))errors.push("معرّف مكرر في "+key+": "+row.id);
      else ids.add(String(row.id));
    });
  }
  for(const [collection,field,target,label] of TRAVEL_REFERENCE_RULES){
    const targetIds=new Set((collections[target]||[]).map(row=>String(row?.id||"")).filter(Boolean));
    (collections[collection]||[]).forEach((row,index)=>{
      if(row?.[field]&&!targetIds.has(String(row[field])))errors.push(label+"["+index+"] يشير إلى سجل غير موجود ("+field+").");
    });
  }
  const counts={};
  for(const key of TRAVEL_COLLECTIONS)counts[key]=(collections[key]||[]).length;
  if(!value.schemaVersion)warnings.push("الملف لا يحدد schemaVersion؛ سيتم تفسيره باستخدام مخطط Travel OS الحالي.");
  if(!Array.isArray(value.audit))warnings.push("لا يوجد سجل تدقيق صالح في الملف؛ سيبدأ السجل المستورد فارغًا.");
  return {valid:errors.length===0,errors,warnings,counts};
}
export function buildTravelExport(value,{includeSensitive=false}={}){
  const normalized=normalizeTravelData(value);
  const exported=JSON.parse(JSON.stringify(normalized));
  let redactedFields=0;
  if(!includeSensitive){
    for(const row of exported.bookings||[])if(row.reference){row.reference="";redactedFields++;}
    for(const row of exported.documents||[]){
      if(row.reference){row.reference="";redactedFields++;}
      if(row.storageNote){row.storageNote="";redactedFields++;}
    }
    for(const row of exported.memories||[])if(row.mediaPath){row.mediaPath="";redactedFields++;}
  }
  return {exported,redactedFields};
}
export function validateTrip(trip){const errors=[];if(!String(trip?.name||"").trim())errors.push("اسم الرحلة مطلوب");if(!String(trip?.destination||"").trim())errors.push("الوجهة مطلوبة");if(trip?.startDate&&trip?.endDate&&trip.endDate<trip.startDate)errors.push("تاريخ العودة يجب ألا يسبق تاريخ المغادرة");if(trip?.budget!==""&&trip?.budget!=null&&(!Number.isFinite(Number(trip.budget))||Number(trip.budget)<0))errors.push("الميزانية يجب أن تكون صفرًا أو أكثر");return errors;}
export function tripSpend(tripId,data){const trip=(data?.trips||[]).find(x=>x.id===tripId);const bookings=(data?.bookings||[]).filter(x=>x.tripId===tripId&&x.status!=="cancelled");const direct=bookings.reduce((sum,x)=>sum+Number(x.cost||0),0);const other=(data?.itinerary||[]).filter(x=>x.tripId===tripId).reduce((sum,x)=>sum+Number(x.estimatedCost||0),0);return {budget:trip?.budget===""||trip?.budget==null?null:Number(trip.budget),bookingSpend:direct,plannedSpend:other,total:direct+other,currency:trip?.currency||data?.settings?.baseCurrency||"EGP"};}
export function packingProgress(tripId,data){const rows=(data?.packing||[]).filter(x=>x.tripId===tripId);const packed=rows.filter(x=>x.packed).length;return {total:rows.length,packed,remaining:rows.length-packed,percent:rows.length?Math.round(packed/rows.length*100):0};}
export function getActiveTrip(data,today=new Date().toISOString().slice(0,10)){return (data?.trips||[]).filter(t=>t.status!=="cancelled"&&t.status!=="completed"&&t.startDate&&t.endDate&&t.startDate<=today&&t.endDate>=today).sort((a,b)=>a.startDate.localeCompare(b.startDate))[0]||null;}
export function upcomingTrips(data,today=new Date().toISOString().slice(0,10)){return (data?.trips||[]).filter(t=>!["cancelled","completed","active"].includes(t.status)&&t.startDate>=today).sort((a,b)=>a.startDate.localeCompare(b.startDate));}
export function validateRelatedRecord(kind,row,data){const errors=[];if(["itinerary","bookings","packing","documents","memories","reviews"].includes(kind)&&row?.tripId&&!(data.trips||[]).some(t=>t.id===row.tripId))errors.push("الرحلة المرتبطة غير موجودة");if(kind==="itinerary"&&!String(row?.title||"").trim())errors.push("عنوان النشاط مطلوب");if(kind==="bookings"&&!String(row?.title||"").trim())errors.push("اسم الحجز مطلوب");if(kind==="packing"&&!String(row?.item||"").trim())errors.push("اسم العنصر مطلوب");if(kind==="destinations"&&!String(row?.name||"").trim())errors.push("اسم الوجهة مطلوب");if(kind==="places"&&!String(row?.name||"").trim())errors.push("اسم المكان أو التجربة مطلوب");return errors;}
