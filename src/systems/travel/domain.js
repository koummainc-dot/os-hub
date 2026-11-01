export const TRAVEL_SECTIONS = [
  {id:"home",label:"الرئيسية",icon:"⌂"},{id:"trips",label:"الرحلات",icon:"🧳"},{id:"stops",label:"محطات الرحلة",icon:"🛤️"},
  {id:"active",label:"الرحلة النشطة",icon:"📍"},{id:"itinerary",label:"برنامج الرحلة",icon:"🗓️"},
  {id:"bookings",label:"الحجوزات",icon:"🎟️"},{id:"budget",label:"الميزانية",icon:"💳"},
  {id:"packing",label:"قائمة التجهيز",icon:"🎒"},{id:"destinations",label:"الوجهات",icon:"🌍"},
  {id:"places",label:"الأماكن",icon:"🗺️"},{id:"experiences",label:"التجارب الفعلية",icon:"✨"},{id:"documents",label:"المستندات",icon:"🛂"},
  {id:"memories",label:"الذكريات",icon:"📸"},{id:"reviews",label:"التقييمات",icon:"⭐"},
  {id:"settings",label:"الإعدادات",icon:"⚙️"}
];
export const TRIP_STATUSES = ["idea","planning","booked","active","completed","cancelled"];
export const TRIP_STATUS_LABELS = {idea:"فكرة",planning:"قيد التخطيط",booked:"تم الحجز",active:"جارية",completed:"مكتملة",cancelled:"ملغاة"};
export function emptyTravelData(){return {schemaVersion:1,trips:[],stops:[],itinerary:[],bookings:[],packing:[],packingTemplates:[],destinations:[],places:[],experiences:[],documents:[],memories:[],reviews:[],settings:{baseCurrency:"EGP",defaultPackingTemplate:[]},financeLinks:[],audit:[]};}
export function normalizeTravelData(value){const base=emptyTravelData(),src=value&&typeof value==="object"?value:{};const out={...base,...src,schemaVersion:1};for(const key of ["trips","stops","itinerary","bookings","packing","packingTemplates","destinations","places","experiences","documents","memories","reviews","financeLinks","audit"])out[key]=Array.isArray(src[key])?src[key]:[];out.settings={...base.settings,...(src.settings||{})};return out;}

const TRAVEL_COLLECTIONS=["trips","stops","itinerary","bookings","packing","packingTemplates","destinations","places","experiences","documents","memories","reviews","financeLinks","audit"];
const TRAVEL_REFERENCE_RULES=[
  ["stops","tripId","trips","محطات الرحلة"],
  ["itinerary","tripId","trips","البرنامج"],
  ["bookings","tripId","trips","الحجوزات"],
  ["packing","tripId","trips","التجهيز"],
  ["documents","tripId","trips","المستندات"],
  ["memories","tripId","trips","الذكريات"],
  ["reviews","tripId","trips","المراجعات"],
  ["places","destinationId","destinations","الأماكن"],
  ["experiences","tripId","trips","التجارب"],
  ["experiences","placeId","places","التجارب"],
  ["financeLinks","tripId","trips","روابط Finance"]
];
export function validateTravelImport(value){
  const errors=[],warnings=[];
  if(!value||typeof value!=="object"||Array.isArray(value))return {valid:false,errors:["ملف الاستيراد يجب أن يحتوي على كائن JSON في المستوى الرئيسي."],warnings:[],counts:{}};
  if(value.schemaVersion!=null&&(!Number.isInteger(Number(value.schemaVersion))||Number(value.schemaVersion)>1||Number(value.schemaVersion)<1))errors.push("إصدار ملف السفر غير مدعوم.");
  if(!TRAVEL_COLLECTIONS.some(key=>Array.isArray(value[key])))errors.push("الملف لا يحتوي على أي قائمة بيانات معروفة؛ تم إيقاف الاستيراد لحماية البيانات الحالية.");
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
export function validateStop(stop){
  const errors=[];
  if(!String(stop?.name||stop?.destination||"").trim())errors.push("اسم المحطة أو وجهتها مطلوب.");
  if(stop?.arrivalDate&&stop?.departureDate&&stop.departureDate<stop.arrivalDate)errors.push("تاريخ مغادرة المحطة يجب ألا يسبق تاريخ الوصول.");
  if(stop?.order!=null&&stop.order!==""&&(!Number.isInteger(Number(stop.order))||Number(stop.order)<1))errors.push("ترتيب المحطة يجب أن يكون رقمًا صحيحًا يبدأ من 1.");
  if(stop?.timeZone){try{new Intl.DateTimeFormat("en-US",{timeZone:stop.timeZone}).format(new Date());}catch{errors.push("المنطقة الزمنية يجب أن تكون اسم IANA صالحًا مثل Africa/Cairo.");}}
  return errors;
}
export function sortTripStops(stops=[],tripId){
  return stops.filter(stop=>!tripId||stop.tripId===tripId).slice().sort((a,b)=>Number(a.order||0)-Number(b.order||0)||(a.arrivalDate||"").localeCompare(b.arrivalDate||""));
}
export function findItineraryConflicts(items=[]){
  const events=items.filter(item=>item.status!=="skipped"&&item.date&&item.startTime&&item.endTime).map(item=>{
    const start=Number(item.startTime.slice(0,2))*60+Number(item.startTime.slice(3,5));
    let end=Number(item.endTime.slice(0,2))*60+Number(item.endTime.slice(3,5));
    if(end<=start)end+=1440;
    return {...item,startMinute:start,endMinute:end};
  }).sort((a,b)=>a.date.localeCompare(b.date)||a.startMinute-b.startMinute);
  const conflicts=[];
  for(let i=0;i<events.length;i++)for(let j=i+1;j<events.length;j++){
    const a=events[i],b=events[j];
    if(a.tripId!==b.tripId)continue;
    const diff=(Date.parse(b.date+"T00:00:00Z")-Date.parse(a.date+"T00:00:00Z"))/86400000;
    if(diff>1)break;
    const bStart=b.startMinute+diff*1440,bEnd=b.endMinute+diff*1440;
    if(a.startMinute<bEnd&&bStart<a.endMinute)conflicts.push({firstId:a.id,secondId:b.id,date:a.date,firstTitle:a.title||a.id,secondTitle:b.title||b.id});
  }
  return conflicts;
}
export function validateTrip(trip){const errors=[];if(!String(trip?.name||"").trim())errors.push("اسم الرحلة مطلوب");if(!String(trip?.destination||"").trim())errors.push("الوجهة مطلوبة");if(trip?.startDate&&trip?.endDate&&trip.endDate<trip.startDate)errors.push("تاريخ العودة يجب ألا يسبق تاريخ المغادرة");if(trip?.budget!==""&&trip?.budget!=null&&(!Number.isFinite(Number(trip.budget))||Number(trip.budget)<0))errors.push("الميزانية يجب أن تكون صفرًا أو أكثر");return errors;}
export function financeTransactionState(tx,financeTransactions=[]){
  if(!tx)return "missing";
  const status=String(tx.status||"").toLowerCase();
  if(status!=="posted")return status||"unknown";
  if(tx.reversal_of_id)return "reversal";
  if(financeTransactions.some(row=>row.status==="Posted"&&row.reversal_of_id===tx.id))return "reversed";
  return "posted";
}
export function financeTransactionStateLabel(tx,financeTransactions=[]){
  const state=financeTransactionState(tx,financeTransactions);
  const labels={posted:"مرحّلة وقابلة للاحتساب",missing:"غير متاحة",reversal:"حركة عكسية — لا تُحتسب منفردة",reversed:"معكوسة بحركة لاحقة",cancelled:"ملغاة — لا تُحتسب",canceled:"ملغاة — لا تُحتسب",void:"ملغاة — لا تُحتسب",voided:"ملغاة — لا تُحتسب",draft:"مسودة — لا تُحتسب",pending:"معلقة — لا تُحتسب"};
  return labels[state]||("غير قابلة للاحتساب: "+String(tx?.status||"حالة غير معروفة"));
}
function isEffectivePostedTransaction(tx,financeTransactions=[]){
  return financeTransactionState(tx,financeTransactions)==="posted";
}
function hasMatchingOriginalExpense(link,tx,data,financeTransactions=[]){
  if(!tx?.refund_of_id)return false;
  const original=financeTransactions.find(row=>row.id===tx.refund_of_id);
  if(!original||original.pnl_effect!=="Expense"||!isEffectivePostedTransaction(original,financeTransactions))return false;
  return (data?.financeLinks||[]).some(row=>row.financeTransactionId===original.id&&row.kind==="expense"&&row.tripId===link.tripId&&row.sourceType===link.sourceType&&String(row.sourceId||"")===String(link.sourceId||""));
}
export function validateFinanceLink(link,data,financeTransactions=[]){
  const errors=[];
  if(!link?.tripId||!(data?.trips||[]).some(t=>t.id===link.tripId))errors.push("اختر رحلة موجودة.");
  if(!link?.financeTransactionId)errors.push("اختر حركة مالية من Finance OS.");
  if((data?.financeLinks||[]).some(x=>x.financeTransactionId===link.financeTransactionId))errors.push("هذه الحركة المالية مرتبطة بالسفر بالفعل.");
  const tx=financeTransactions.find(x=>x.id===link.financeTransactionId);
  if(!tx)errors.push("الحركة المالية غير متاحة في مساحة العمل الحالية.");
  if(tx&&financeTransactionState(tx,financeTransactions)!=="posted")errors.push("لا يمكن ربط الحركة: "+financeTransactionStateLabel(tx,financeTransactions)+".");
  if(tx&&link.kind==="expense"&&tx.pnl_effect!=="Expense")errors.push("اختر حركة مصروف لربطها كمصروف سفر.");
  if(tx&&link.kind==="refund"){
    if(tx.pnl_effect!=="Income")errors.push("الاسترداد يجب أن يكون حركة دخل مسجلة في Finance.");
    if(!tx.refund_of_id)errors.push("لا يمكن ربط الاسترداد دون مرجع المصروف الأصلي في Finance.");
    else if(!financeTransactions.some(row=>row.id===tx.refund_of_id))errors.push("المصروف الأصلي للاسترداد غير متاح في مساحة العمل الحالية.");
    else if(!hasMatchingOriginalExpense(link,tx,data,financeTransactions))errors.push("يجب ربط المصروف الأصلي أولًا وبالرحلة والحجز أو النشاط نفسه قبل ربط الاسترداد.");
  }
  if(link?.sourceType==="booking"&&!(data?.bookings||[]).some(x=>x.id===link.sourceId&&x.tripId===link.tripId))errors.push("الحجز المرتبط غير موجود في الرحلة.");
  if(link?.sourceType==="itinerary"&&!(data?.itinerary||[]).some(x=>x.id===link.sourceId&&x.tripId===link.tripId))errors.push("عنصر البرنامج المرتبط غير موجود في الرحلة.");
  return [...new Set(errors)];
}
export function tripBudgetBreakdown(tripId,data,financeTransactions=[],financeBaseCurrency="EGP"){
  const trip=(data?.trips||[]).find(x=>x.id===tripId);
  const currency=trip?.currency||data?.settings?.baseCurrency||"EGP";
  const budget=trip?.budget===""||trip?.budget==null?null:Number(trip.budget);
  const bookings=(data?.bookings||[]).filter(x=>x.tripId===tripId&&x.status!=="cancelled");
  const itinerary=(data?.itinerary||[]).filter(x=>x.tripId===tripId&&x.status!=="skipped");
  const links=(data?.financeLinks||[]).filter(x=>x.tripId===tripId);
  const txById=new Map(financeTransactions.map(x=>[x.id,x]));
  const actualExpenseLinks=links.filter(link=>link.kind==="expense").map(link=>({link,tx:txById.get(link.financeTransactionId)})).filter(({tx})=>tx&&tx.pnl_effect==="Expense"&&isEffectivePostedTransaction(tx,financeTransactions));
  const refundLinks=links.filter(link=>link.kind==="refund").map(link=>({link,tx:txById.get(link.financeTransactionId)})).filter(({link,tx})=>tx&&tx.pnl_effect==="Income"&&isEffectivePostedTransaction(tx,financeTransactions)&&hasMatchingOriginalExpense(link,tx,data,financeTransactions));
  const actualExpenses=actualExpenseLinks.reduce((sum,row)=>sum+Number(row.tx.base_amount||0),0);
  const refunds=refundLinks.reduce((sum,row)=>sum+Number(row.tx.base_amount||0),0);
  const netActual=actualExpenses-refunds;
  const actualBySource=new Set(currency===financeBaseCurrency?actualExpenseLinks.filter(row=>row.link.sourceType==="itinerary").map(row=>row.link.sourceId):[]);
  const plannedActivities=itinerary.filter(row=>!actualBySource.has(row.id)).reduce((sum,row)=>sum+Number(row.estimatedCost||0),0);
  const bookingCommitments=bookings.reduce((sum,row)=>sum+Number(row.cost||0),0);
  const paidForBooking=links.reduce((sum,link)=>{
    if(link.sourceType!=="booking")return sum;
    const tx=txById.get(link.financeTransactionId);
    const booking=bookings.find(row=>row.id===link.sourceId);
    if(!tx||!booking||booking.currency!==financeBaseCurrency||!isEffectivePostedTransaction(tx,financeTransactions))return sum;
    if(link.kind==="expense"&&tx.pnl_effect==="Expense")return sum+Number(tx.base_amount||0);
    if(link.kind==="refund"&&tx.pnl_effect==="Income"&&hasMatchingOriginalExpense(link,tx,data,financeTransactions))return sum-Number(tx.base_amount||0);
    return sum;
  },0);
  const outstandingBookingCommitment=Math.max(0,bookingCommitments-(currency===financeBaseCurrency?paidForBooking:0));
  const actualInTripCurrency=currency===financeBaseCurrency?netActual:null;
  const projectedTotal=outstandingBookingCommitment+plannedActivities+(actualInTripCurrency==null?0:Math.max(0,actualInTripCurrency));
  const remainingBudget=budget==null?null:budget-projectedTotal;
  const unresolvedLinks=links.filter(link=>!txById.has(link.financeTransactionId)).length;
  const excludedLinks=links.filter(link=>{const tx=txById.get(link.financeTransactionId);return !!tx&&financeTransactionState(tx,financeTransactions)!=="posted";}).length;
  const invalidRefundLinks=links.filter(link=>{if(link.kind!=="refund")return false;const tx=txById.get(link.financeTransactionId);return !!tx&&tx.pnl_effect==="Income"&&isEffectivePostedTransaction(tx,financeTransactions)&&!hasMatchingOriginalExpense(link,tx,data,financeTransactions);}).length;
  return {budget,currency,bookingCommitments,outstandingBookingCommitment,plannedActivities,actualExpensesBase:actualExpenses,refundsBase:refunds,netActualBase:netActual,financeBaseCurrency,actualInTripCurrency,projectedTotal,remainingBudget,hasFinanceLinks:links.length>0,financeLinkCount:links.length,unresolvedLinks,excludedLinks,invalidRefundLinks,requiresFx:currency!==financeBaseCurrency&&links.length>0};
}
export function tripSpend(tripId,data){
  const trip=(data?.trips||[]).find(x=>x.id===tripId);
  const breakdown=tripBudgetBreakdown(tripId,data,[],trip?.currency||data?.settings?.baseCurrency||"EGP");
  return {budget:breakdown.budget,bookingSpend:breakdown.bookingCommitments,plannedSpend:breakdown.plannedActivities,total:breakdown.bookingCommitments+breakdown.plannedActivities,currency:breakdown.currency};
}
export function packingProgress(tripId,data){const rows=(data?.packing||[]).filter(x=>x.tripId===tripId);const packed=rows.filter(x=>x.packed).length;return {total:rows.length,packed,remaining:rows.length-packed,percent:rows.length?Math.round(packed/rows.length*100):0};}
export function getUpcomingTravelAlerts(data,today=new Date().toISOString().slice(0,10)){
  const todayMs=Date.parse(today+"T00:00:00Z");
  const alerts=[];
  for(const booking of data?.bookings||[]){
    if(["cancelled","completed"].includes(booking.status)||!booking.cancellationDeadline)continue;
    const deadlineMs=Date.parse(booking.cancellationDeadline+"T00:00:00Z");
    if(!Number.isFinite(deadlineMs))continue;
    const daysUntil=Math.round((deadlineMs-todayMs)/86400000);
    if(daysUntil<=7)alerts.push({id:"booking:"+booking.id,type:"cancellation",title:booking.title||"حجز",date:booking.cancellationDeadline,daysUntil,level:daysUntil<0?"urgent":daysUntil<=2?"urgent":"warning",tripId:booking.tripId,message:daysUntil<0?"انتهى موعد الإلغاء المحدد":daysUntil===0?"موعد الإلغاء اليوم":"موعد الإلغاء خلال "+daysUntil+" يوم"});
  }
  for(const document of data?.documents||[]){
    if(!document.expiryDate)continue;
    const expiryMs=Date.parse(document.expiryDate+"T00:00:00Z");
    if(!Number.isFinite(expiryMs))continue;
    const daysUntil=Math.round((expiryMs-todayMs)/86400000);
    if(daysUntil<=30)alerts.push({id:"document:"+document.id,type:"document",title:document.title||"مستند سفر",date:document.expiryDate,daysUntil,level:daysUntil<0?"urgent":daysUntil<=7?"urgent":"warning",tripId:document.tripId,message:daysUntil<0?"انتهت صلاحية المستند":daysUntil===0?"تنتهي الصلاحية اليوم":"تنتهي الصلاحية خلال "+daysUntil+" يوم"});
  }
  return alerts.sort((a,b)=>a.daysUntil-b.daysUntil||a.date.localeCompare(b.date));
}
export function getActiveTrip(data,today=new Date().toISOString().slice(0,10)){return (data?.trips||[]).filter(t=>t.status!=="cancelled"&&t.status!=="completed"&&t.startDate&&t.endDate&&t.startDate<=today&&t.endDate>=today).sort((a,b)=>a.startDate.localeCompare(b.startDate))[0]||null;}
export function upcomingTrips(data,today=new Date().toISOString().slice(0,10)){return (data?.trips||[]).filter(t=>!["cancelled","completed","active"].includes(t.status)&&t.startDate>=today).sort((a,b)=>a.startDate.localeCompare(b.startDate));}
export function validateRelatedRecord(kind,row,data){const errors=[];if(["stops","itinerary","bookings","packing","documents","memories","reviews","experiences"].includes(kind)&&row?.tripId&&!(data.trips||[]).some(t=>t.id===row.tripId))errors.push("الرحلة المرتبطة غير موجودة");if(kind==="itinerary"&&!String(row?.title||"").trim())errors.push("عنوان النشاط مطلوب");if(kind==="stops")errors.push(...validateStop(row));if(kind==="experiences"&&!String(row?.title||"").trim())errors.push("اسم التجربة مطلوب");if(kind==="experiences"&&row?.placeId&&!(data.places||[]).some(x=>x.id===row.placeId))errors.push("المكان المرتبط بالتجربة غير موجود.");if(kind==="bookings"&&!String(row?.title||"").trim())errors.push("اسم الحجز مطلوب");if(kind==="packing"&&!String(row?.item||"").trim())errors.push("اسم العنصر مطلوب");if(kind==="destinations"&&!String(row?.name||"").trim())errors.push("اسم الوجهة مطلوب");if(kind==="places"&&!String(row?.name||"").trim())errors.push("اسم المكان أو التجربة مطلوب");return errors;}
