export const NUTRITION_SECTIONS = [
  {id:"today",label:"اليوم",icon:"📅"},
  {id:"log",label:"سجل الأكل",icon:"📒"},
  {id:"foods",label:"الأغذية",icon:"🥑"},
  {id:"recipes",label:"الوصفات",icon:"🍳"},
  {id:"batches",label:"الدفعات",icon:"🥘"},
  {id:"goals",label:"الأهداف",icon:"🎯"},
  {id:"water",label:"الماء",icon:"💧"},
  {id:"plan",label:"الخطة",icon:"🗓️"},
  {id:"grocery",label:"البقالة",icon:"🛒"},
  {id:"analytics",label:"التحليلات",icon:"📊"},
  {id:"review",label:"المراجعة الأسبوعية",icon:"🔁"},
  {id:"supplements",label:"المكملات",icon:"💊"},
  {id:"windows",label:"نوافذ الأكل",icon:"⏰"},
  {id:"import",label:"الاستيراد والتصدير",icon:"⬆️"},
  {id:"settings",label:"الإعدادات",icon:"⚙️"},
];

export const NUTRIENTS = ["calories","proteinG","carbsG","fatG","fiberG","sugarG","sodiumMg"];
export const NUTRIENT_LABELS = {calories:"السعرات",proteinG:"البروتين (جم)",carbsG:"الكربوهيدرات (جم)",fatG:"الدهون (جم)",fiberG:"الألياف (جم)",sugarG:"السكر (جم)",sodiumMg:"الصوديوم (ملجم)"};
export const MEAL_TYPES = ["breakfast","lunch","dinner","snack","drink","other"];
export const MEAL_LABELS = {breakfast:"إفطار",lunch:"غداء",dinner:"عشاء",snack:"وجبة خفيفة",drink:"مشروب",other:"أخرى"};
export const GOAL_TYPES = ["Maintenance","Fat Loss","Muscle Gain","Performance","General","Custom"];
export const GOAL_LABELS = {Maintenance:"محافظة", "Fat Loss":"خفض وزن", "Muscle Gain":"زيادة كتلة",Performance:"أداء",General:"عام",Custom:"مخصص"};
export const WATER_SOURCES = ["water","beverage","food"];
export const WATER_SOURCE_LABELS = {water:"ماء",beverage:"مشروب",food:"طعام غني بالماء"};

export function emptyNutritionData() {
  return {schemaVersion:1,foods:[],recipes:[],recipeIngredients:[],batches:[],meals:[],logs:[],goals:[],goalAssignments:[],water:[],plans:[],planSlots:[],groceryLists:[],groceryItems:[],supplements:[],windows:[],settings:[{id:"settings",timezone:"Africa/Cairo",volumeUnit:"ml",weightUnit:"g",weekStartDay:6,waterCupMl:250,showCalories:true}],audit:[]};
}
const COLLECTIONS = ["foods","recipes","recipeIngredients","batches","meals","logs","goals","goalAssignments","water","plans","planSlots","groceryLists","groceryItems","supplements","windows","settings","audit"];
export function normalizeNutritionData(input) {
  const src=input&&typeof input==="object"&&!Array.isArray(input)?input:{};
  const base=emptyNutritionData();
  const out={...base,...src,schemaVersion:1};
  for(const key of COLLECTIONS) out[key]=Array.isArray(src[key])?src[key]:base[key];
  return out;
}
export function nutritionToday(timeZone="Africa/Cairo", now=new Date()) {
  try { return new Intl.DateTimeFormat("en-CA",{timeZone,year:"numeric",month:"2-digit",day:"2-digit"}).format(now); }
  catch { return now.toISOString().slice(0,10); }
}
export function makeNutritionId(prefix="nut") {
  return globalThis.crypto?.randomUUID?.() || prefix+"-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,9);
}
const num = v => Number.isFinite(Number(v)) ? Number(v) : 0;
const nonNegative = v => Number.isFinite(Number(v)) && Number(v)>=0;
export function normalizeFood(food) {
  const f=food&&typeof food==="object"?food:{};
  const out={id:String(f.id||""),name:String(f.name||"").trim(),brand:String(f.brand||"").trim(),basisAmount:num(f.basisAmount??100),basisUnit:f.basisUnit==="ml"?"ml":"g",servingAmount:num(f.servingAmount??0),servingUnit:String(f.servingUnit||(f.basisUnit==="ml"?"مل":"جم")),origin:f.origin||"user",verificationLevel:f.verificationLevel||"unverified",status:f.status||"active",aliases:Array.isArray(f.aliases)?f.aliases.map(x=>String(x).trim()).filter(Boolean):[],barcode:String(f.barcode||""),catalogSource:String(f.catalogSource||""),densityGPerMl:num(f.densityGPerMl??0),favorite:!!f.favorite,createdAt:f.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
  for(const key of NUTRIENTS) out[key]=num(f[key]);
  return out;
}
export function validateFood(input) {
  const f=normalizeFood(input), errors=[];
  if(!f.name) errors.push("اسم الغذاء مطلوب.");
  if(!Number.isFinite(f.basisAmount)||f.basisAmount<=0) errors.push("كمية الأساس يجب أن تكون أكبر من صفر.");
  for(const key of NUTRIENTS) if(!nonNegative(f[key])) errors.push("قيم العناصر الغذائية لا يمكن أن تكون سالبة.");
  if(!["g","ml"].includes(f.basisUnit)) errors.push("وحدة الأساس غير صالحة.");
  if(f.densityGPerMl<0) errors.push("الكثافة لا يمكن أن تكون سالبة.");
  return {ok:errors.length===0,errors,value:f};
}
export function scaleNutrients(nutrients, consumedAmount, basisAmount=100) {
  const amount=Number(consumedAmount), basis=Number(basisAmount);
  if(!Number.isFinite(amount)||amount<0||!Number.isFinite(basis)||basis<=0) throw new Error("كمية الاستهلاك أو كمية الأساس غير صالحة.");
  const out={};
  for(const key of NUTRIENTS) out[key]=Math.round(num(nutrients?.[key])*amount/basis*100)/100;
  return out;
}
export function convertFoodQuantity(food, amount, unit=food?.basisUnit) {
  const qty=Number(amount);
  if(!Number.isFinite(qty)||qty<=0) throw new Error("الكمية يجب أن تكون أكبر من صفر.");
  if(unit===food?.basisUnit) return qty;
  if(unit==="serving") { if(!(Number(food?.servingAmount)>0)) throw new Error("لم تُحدد كمية الحصة المعتادة لهذا الغذاء."); return qty*Number(food.servingAmount); }
  const density=Number(food?.densityGPerMl)||0;
  if(density<=0) throw new Error("يلزم إدخال كثافة الغذاء لتحويل الجرام والملليلتر.");
  if(food?.basisUnit==="g"&&unit==="ml") return qty*density;
  if(food?.basisUnit==="ml"&&unit==="g") return qty/density;
  throw new Error("وحدة الكمية غير متوافقة مع وحدة أساس الغذاء.");
}
export function snapshotFoodLog(food, amount, unit, extras={}) {
  if(!food?.id) throw new Error("اختر غذاءً معروفًا قبل تسجيل الاستهلاك.");
  const selectedUnit=String(unit||food.basisUnit),quantityBase=convertFoodQuantity(food,amount,selectedUnit);
  const nutrients=scaleNutrients(food,quantityBase,food.basisAmount);
  return {foodId:String(food.id),foodNameSnapshot:String(food.name||"غذاء غير مسمى"),foodBrandSnapshot:String(food.brand||""),amount:num(amount),unit:selectedUnit,quantityBase,basisAmount:num(food.basisAmount),basisUnit:food.basisUnit,nutrientsSnapshot:nutrients,snapshotBasis:"food-version-at-log-time",foodUpdatedAt:food.updatedAt||null,...extras};
}
export function buildQuickNutritionLog(input={}) {
  const name=String(input.name||"").trim(), nutrients=input.nutrients&&typeof input.nutrients==="object"?input.nutrients:{};
  const values=Object.fromEntries(NUTRIENTS.map(key=>{const raw=nutrients[key];return [key,raw===null||raw===undefined||raw===""?null:Number(raw)];}));
  const errors=[];
  if(!name) errors.push("اسم الإدخال مطلوب.");
  if(values.calories===null||!Number.isFinite(values.calories)||values.calories<0) errors.push("السعرات مطلوبة ويجب ألا تكون سالبة.");
  for(const key of NUTRIENTS) if(values[key]!==null&&(!Number.isFinite(values[key])||values[key]<0)) errors.push("قيم المغذيات يجب أن تكون أرقامًا غير سالبة.");
  const dateTime=input.dateTime||new Date().toISOString();
  if(!Number.isFinite(Date.parse(dateTime))) errors.push("تاريخ ووقت الإدخال غير صالح.");
  if(errors.length) return {ok:false,errors,value:null};
  const complete=Object.values(values).every(value=>value!==null);
  return {ok:true,errors:[],value:{id:String(input.id||makeNutritionId("log")),foodNameSnapshot:name,amount:1,unit:"entry",dateTime,localDate:String(input.localDate||dateTime.slice(0,10)),mealType:String(input.mealType||"other"),notes:String(input.notes||""),source:String(input.source||"quick-macros"),entryKind:String(input.entryKind||"QuickMacros"),confidence:"Exact",completeness:complete?"complete":"partial",nutrientsSnapshot:values,createdAt:input.createdAt||new Date().toISOString()}};
}
export function buildOutsideHomeLog(input={}) {
  const base=buildQuickNutritionLog({...input,source:"outside-home-estimate",entryKind:"OutOfHome"});
  if(!base.ok) return base;
  const calories=base.value.nutrientsSnapshot.calories;
  const min=input.rangeMin===""||input.rangeMin===null||input.rangeMin===undefined?null:Number(input.rangeMin);
  const max=input.rangeMax===""||input.rangeMax===null||input.rangeMax===undefined?null:Number(input.rangeMax);
  const errors=[];
  if(!String(input.venue||"").trim()) errors.push("اسم المكان أو المطعم مطلوب.");
  if(min!==null&&(!Number.isFinite(min)||min<0||min>calories)) errors.push("الحد الأدنى يجب أن يكون رقمًا غير سالب ولا يتجاوز السعرات المقدرة.");
  if(max!==null&&(!Number.isFinite(max)||max<calories)) errors.push("الحد الأعلى يجب ألا يقل عن السعرات المقدرة.");
  if(min!==null&&max!==null&&min>max) errors.push("الحد الأعلى يجب ألا يقل عن الحد الأدنى.");
  if(!["Menu","SimilarItem","Visual","Guess"].includes(input.estimationMethod||"Visual")) errors.push("طريقة التقدير غير صالحة.");
  if(errors.length) return {ok:false,errors,value:null};
  return {ok:true,errors:[],value:{...base.value,venueLabel:String(input.venue).trim(),rangeMinKcal:min,rangeMaxKcal:max,estimationMethod:input.estimationMethod||"Visual",confidence:"Estimated",notes:String(input.notes||"")}};
}
export function validateFoodLog(input, foods=[]) {
  const x=input&&typeof input==="object"?input:{},errors=[];
  const hasFood=!!x.foodId,hasRecipe=!!x.recipeId;
  if(hasFood===hasRecipe) errors.push("يجب اختيار غذاء واحد أو وصفة واحدة فقط.");
  if(!x.dateTime||!Number.isFinite(Date.parse(x.dateTime))) errors.push("تاريخ ووقت الوجبة غير صالح.");
  if(!Number.isFinite(Number(x.amount))||Number(x.amount)<=0) errors.push("الكمية يجب أن تكون أكبر من صفر.");
  if(hasFood&&!foods.some(f=>f.id===x.foodId)) errors.push("الغذاء المحدد غير موجود.");
  if(hasFood&&foods.some(f=>f.id===x.foodId)) { const food=foods.find(f=>f.id===x.foodId); try { convertFoodQuantity(food,x.amount,x.unit||food.basisUnit); } catch(e) { errors.push(e.message); } }
  return {ok:errors.length===0,errors};
}
export function calculateRecipeNutrition(recipe, ingredients=[], foods=[]) {
  const foodById=new Map(foods.map(f=>[f.id,f]));
  const total=Object.fromEntries(NUTRIENTS.map(k=>[k,0]));
  for(const item of ingredients.filter(x=>x.recipeId===recipe?.id&&x.status!=="archived")) {
    const food=foodById.get(item.foodId); if(!food) continue;
    const scaled=scaleNutrients(food,num(item.amount),food.basisAmount);
    for(const key of NUTRIENTS) total[key]+=scaled[key];
  }
  const servings=Math.max(1,num(recipe?.servings)||1);
  for(const key of NUTRIENTS) total[key]=Math.round(total[key]*100)/100;
  return {total,perServing:Object.fromEntries(NUTRIENTS.map(k=>[k,Math.round(total[k]/servings*100)/100])),servings,computedAt:new Date().toISOString()};
}
export function summarizeNutritionDay({date,logs=[],water=[],goals=[]}) {
  const dayLogs=logs.filter(x=>String(x.localDate||x.dateTime||"").slice(0,10)===date&&!x.deleted_at);
  const dayWater=water.filter(x=>String(x.localDate||x.dateTime||"").slice(0,10)===date&&!x.deleted_at);
  const totals=Object.fromEntries(NUTRIENTS.map(k=>[k,0]));
  const coverage=Object.fromEntries(NUTRIENTS.map(k=>[k,{known:0,missing:0,complete:true}]));
  for(const log of dayLogs) for(const key of NUTRIENTS) {
    const value=log.nutrientsSnapshot?.[key];
    if(value===null||value===undefined||value==="") coverage[key].missing++;
    else if(Number.isFinite(Number(value))&&Number(value)>=0) { totals[key]+=Number(value); coverage[key].known++; }
    else coverage[key].missing++;
  }
  for(const key of NUTRIENTS) { totals[key]=Math.round(totals[key]*100)/100; coverage[key].complete=coverage[key].missing===0; }
  const waterMl=dayWater.reduce((sum,x)=>sum+num(x.amountMl),0);
  const goal=goals.find(x=>x.active!==false&&!x.deleted_at)||null;
  const target=goal?.targets&&typeof goal.targets==="object"?goal.targets:{};
  const variance=Object.fromEntries(NUTRIENTS.filter(k=>target[k]!==undefined&&target[k]!==null&&target[k]!=="").map(k=>[k,Math.round((totals[k]-num(target[k]))*100)/100]));
  return {date,totals,coverage,waterMl,mealCount:dayLogs.length,waterEntries:dayWater.length,goalId:goal?.id||null,goalTargets:{...target},variance,completion:dayLogs.length===0?"empty":dayLogs.some(x=>x.completeness==="partial")?"partial":"logged"};
}
export function normalizeSearch(value) {
  return String(value||"").normalize("NFKC").toLocaleLowerCase("ar").replace(/[\u064B-\u065F\u0670\u0640]/g,"").replace(/[أإآ]/g,"ا").replace(/ى/g,"ي").replace(/ة/g,"ه").trim();
}
export function searchFoods(foods, query) {
  const q=normalizeSearch(query); if(!q) return foods.slice();
  return foods.filter(f=>[f.name,f.brand,f.barcode,...(f.aliases||[])].some(v=>normalizeSearch(v).includes(q)));
}
export function validateGoal(input) {
  const x=input&&typeof input==="object"?input:{},errors=[];
  if(!String(x.name||"").trim()) errors.push("اسم الهدف مطلوب.");
  const targets=x.targets&&typeof x.targets==="object"?x.targets:{};
  for(const key of Object.keys(targets)) if(targets[key]!==""&&targets[key]!==null&&targets[key]!==undefined&&!nonNegative(targets[key])) errors.push("قيم الأهداف يجب أن تكون أرقامًا غير سالبة.");
  if(!GOAL_TYPES.includes(x.type)) errors.push("نوع الهدف غير معروف.");
  return {ok:errors.length===0,errors};
}
export function validateWater(input) {
  const x=input&&typeof input==="object"?input:{},errors=[];
  if(!Number.isFinite(Number(x.amountMl))||Number(x.amountMl)<=0) errors.push("كمية الماء يجب أن تكون أكبر من صفر.");
  if(!x.dateTime||!Number.isFinite(Date.parse(x.dateTime))) errors.push("تاريخ ووقت التسجيل غير صالح.");
  if(!WATER_SOURCES.includes(x.source||"water")) errors.push("مصدر الماء/المشروب غير معروف.");
  return {ok:errors.length===0,errors};
}
export function buildGroceryNeeds({planSlots=[],recipes=[],recipeIngredients=[],foods=[]}) {
  const recipeById=new Map(recipes.map(x=>[x.id,x]));
  const foodById=new Map(foods.map(x=>[x.id,x]));
  const totals=new Map();
  for(const slot of planSlots.filter(x=>!["skipped","archived","cancelled"].includes(x.status)&&x.recipeId)) {
    const recipe=recipeById.get(slot.recipeId); if(!recipe||recipe.status==="archived") continue;
    const recipeServings=Math.max(1,num(recipe.servings)||1), portions=Math.max(0,num(slot.portions)||1);
    for(const ingredient of recipeIngredients.filter(x=>x.recipeId===recipe.id&&x.status!=="archived")) {
      const food=foodById.get(ingredient.foodId); if(!food) continue;
      const unit=String(ingredient.unit||food.basisUnit), key=food.id+"::"+unit, amount=num(ingredient.amount)*portions/recipeServings;
      const row=totals.get(key)||{foodId:food.id,name:food.name,amount:0,unit,sourceSlotIds:[],sourceSlotAmounts:{}};
      row.amount+=amount;if(!row.sourceSlotIds.includes(slot.id))row.sourceSlotIds.push(slot.id);
      row.sourceSlotAmounts[slot.id]=(row.sourceSlotAmounts[slot.id]||0)+amount;totals.set(key,row);
    }
  }
  return [...totals.values()].map(x=>({...x,amount:Math.round(x.amount*100)/100,sourceSlotAmounts:Object.fromEntries(Object.entries(x.sourceSlotAmounts).map(([k,v])=>[k,Math.round(v*100)/100]))}));
}
export function validateRecipe(recipe,ingredients=[],foods=[]) {
 const errors=[],active=ingredients.filter(x=>x.status!=="archived");
 if(!String(recipe?.name||"").trim())errors.push("اسم الوصفة مطلوب.");
 if(!Number.isFinite(Number(recipe?.servings))||Number(recipe.servings)<=0)errors.push("عدد الحصص يجب أن يكون أكبر من صفر.");
 if(active.some(x=>!foods.some(f=>f.id===x.foodId)))errors.push("كل مكوّن يجب أن يرتبط بغذاء موجود.");
 if(active.some(x=>!Number.isFinite(Number(x.amount))||Number(x.amount)<=0))errors.push("كمية كل مكوّن يجب أن تكون أكبر من صفر.");
 if(new Set(active.map(x=>x.foodId)).size!==active.length)errors.push("لا تكرر الغذاء نفسه في الوصفة؛ اجمع كميته في سطر واحد.");
 if(!active.length)errors.push("أضف مكوّنًا واحدًا على الأقل.");
 return {ok:errors.length===0,errors};
}
export function validateCookingBatch(input,recipes=[]) {
 const x=input&&typeof input==="object"?input:{},errors=[];
 if(!recipes.some(r=>r.id===x.recipeId&&r.status!=="archived"))errors.push("اختر وصفة نشطة للدفعة.");
 if(!Number.isFinite(Number(x.totalServings))||Number(x.totalServings)<=0)errors.push("عدد حصص الدفعة يجب أن يكون أكبر من صفر.");
 if(!Number.isFinite(Number(x.consumedServings||0))||Number(x.consumedServings||0)<0||Number(x.consumedServings||0)>Number(x.totalServings))errors.push("عدد الحصص المستهلكة غير صالح.");
 if(x.expiryDate&&x.cookedDate&&x.expiryDate<x.cookedDate)errors.push("تاريخ الانتهاء لا يمكن أن يسبق تاريخ التحضير.");
 return {ok:errors.length===0,errors};
}
export function remainingBatchServings(batch){return Math.max(0,Math.round((num(batch?.totalServings)-num(batch?.consumedServings))*100)/100);}
export function validateNutritionImport(input) {
  if(!input||typeof input!=="object"||input.schemaVersion!==1) return {ok:false,errors:["ملف الاستيراد غير صالح أو غير مدعوم."],data:null};
  const data=normalizeNutritionData(input),errors=[];
  for(const key of COLLECTIONS) {
    const seen=new Set();
    for(const row of data[key]) {
      if(!row||typeof row!=="object"||!row.id) {errors.push("يوجد سجل بلا معرّف في "+key);continue;}
      if(seen.has(String(row.id))) errors.push("يوجد معرّف مكرر في "+key+": "+row.id);
      seen.add(String(row.id));
    }
  }
  for(const log of data.logs) if(log.foodId&&!data.foods.some(f=>f.id===log.foodId)&&!log.foodNameSnapshot) errors.push("سجل أكل يشير إلى غذاء مفقود بلا لقطة تاريخية.");
  return {ok:errors.length===0,errors,data:errors.length?null:data};
}
export function nutritionAnalytics({logs=[],water=[],goals=[],days=7,today}) {
  const dates=[]; const base=new Date((today||nutritionToday())+"T12:00:00Z");
  for(let i=days-1;i>=0;i--){const d=new Date(base);d.setUTCDate(d.getUTCDate()-i);dates.push(d.toISOString().slice(0,10));}
  const summaries=dates.map(date=>summarizeNutritionDay({date,logs,water,goals}));
  const complete=summaries.filter(x=>x.completion==="logged");
  const avg=key=>complete.length?Math.round(complete.reduce((s,x)=>s+x.totals[key],0)/complete.length*100)/100:null;
  return {dates,summaries,completeDays:complete.length,averageCalories:avg("calories"),averageProteinG:avg("proteinG"),averageWaterMl:complete.length?Math.round(complete.reduce((s,x)=>s+x.waterMl,0)/complete.length):null,mealFrequency:complete.length?Math.round(complete.reduce((s,x)=>s+x.mealCount,0)/complete.length*100)/100:null};
}
export function nutritionDeletionBlocker(kind, id, data) {
  if(kind==="food"&&data.logs.some(x=>x.foodId===id)&&data.foods.find(x=>x.id===id)) return "لا يمكن حذف غذاء مستخدم في السجل؛ أرشفه بدلًا من ذلك للحفاظ على اللقطات التاريخية.";
  if(kind==="recipe"&&data.recipeIngredients.some(x=>x.recipeId===id)) return "احذف مكونات الوصفة أو انقلها قبل حذف الوصفة.";
  if(kind==="recipe"&&data.planSlots.some(x=>x.recipeId===id)) return "الوصفة مرتبطة بخطة؛ أزل الربط قبل الحذف.";
  return null;
}
