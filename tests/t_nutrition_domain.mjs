import assert from "node:assert/strict";
import {
  emptyNutritionData,normalizeNutritionData,nutritionToday,validateFood,scaleNutrients,snapshotFoodLog,
  validateFoodLog,calculateRecipeNutrition,summarizeNutritionDay,normalizeSearch,searchFoods,validateGoal,
  validateWater,buildGroceryNeeds,validateNutritionImport,validateRecipe,validateCookingBatch,remainingBatchServings,nutritionAnalytics,nutritionDeletionBlocker,
  buildQuickNutritionLog,buildOutsideHomeLog,convertFoodQuantity,parseHouseholdPortions
} from "../src/systems/nutrition/domain.js";

const base=emptyNutritionData();
assert.equal(base.schemaVersion,1);
assert.equal(base.foods.length,0);
assert.equal(base.goals.length,0,"Nutrition must not create preset health goals");
assert.equal(base.water.length,0);

const food={id:"f1",name:"شوفان",basisAmount:100,basisUnit:"g",calories:389,proteinG:16.9,carbsG:66.3,fatG:6.9,fiberG:10.6,sugarG:0.9,sodiumMg:2,updatedAt:"v1"};
assert.equal(validateFood(food).ok,true);
assert.equal(validateFood({...food,name:""}).ok,false);
assert.equal(validateFood({...food,basisAmount:0}).ok,false,"zero basis must not be normalized to default");
assert.equal(validateFood({...food,calories:-1}).ok,false);
assert.equal(validateFood({...food,barcode:"0123456789012",catalogSource:"licensed-catalog"}).value.catalogSource,"licensed-catalog");
assert.equal(searchFoods([{...food,barcode:"0123456789012"}],"0123456789012").length,1,"barcode should be searchable locally");
assert.deepEqual(scaleNutrients(food,50),{calories:194.5,proteinG:8.45,carbsG:33.15,fatG:3.45,fiberG:5.3,sugarG:0.45,sodiumMg:1});
assert.throws(()=>scaleNutrients(food,-1),/كمية الاستهلاك/);

const snapshot=snapshotFoodLog(food,50,"g",{id:"l1",dateTime:"2026-11-01T10:00:00.000Z",localDate:"2026-11-01",mealType:"breakfast"});
assert.equal(snapshot.foodNameSnapshot,"شوفان");
assert.equal(snapshot.nutrientsSnapshot.calories,194.5);
assert.equal(snapshot.snapshotBasis,"food-version-at-log-time");
assert.equal(validateFoodLog({foodId:"f1",dateTime:"2026-11-01T10:00:00Z",amount:50},[food]).ok,true);
assert.equal(validateFoodLog({foodId:"f1",recipeId:"r1",dateTime:"2026-11-01T10:00:00Z",amount:50},[food]).ok,false,"log source must be XOR food or recipe");
assert.equal(validateFoodLog({foodId:"missing",dateTime:"2026-11-01T10:00:00Z",amount:50},[food]).ok,false);

const recipe={id:"r1",name:"شوفان بالزبادي",servings:2};
const ingredients=[{id:"i1",recipeId:"r1",foodId:"f1",amount:100},{id:"i2",recipeId:"r1",foodId:"f2",amount:100}];
const yogurt={id:"f2",name:"زبادي",basisAmount:100,basisUnit:"g",calories:61,proteinG:3.5,carbsG:4.7,fatG:3.3,fiberG:0,sugarG:4.7,sodiumMg:46};
const recipeNutrition=calculateRecipeNutrition(recipe,ingredients,[food,yogurt]);
assert.equal(recipeNutrition.total.calories,450);
assert.equal(recipeNutrition.perServing.calories,225);
assert.equal(recipeNutrition.perServing.proteinG,10.2);

const logs=[
 {...snapshot,id:"l1",localDate:"2026-11-01",nutrientsSnapshot:snapshot.nutrientsSnapshot,completeness:"complete"},
 {...snapshot,id:"l2",localDate:"2026-11-01",nutrientsSnapshot:{...snapshot.nutrientsSnapshot,calories:100},completeness:"complete"},
 {...snapshot,id:"l3",localDate:"2026-10-31",nutrientsSnapshot:{calories:1000,proteinG:20},completeness:"complete"}
];
const water=[{id:"w1",localDate:"2026-11-01",amountMl:250,source:"water"},{id:"w2",localDate:"2026-11-01",amountMl:330,source:"beverage"}];
const goal={id:"g1",active:true,targets:{calories:2000,proteinG:100}};
const summary=summarizeNutritionDay({date:"2026-11-01",logs,water,goals:[goal]});
assert.equal(summary.totals.calories,294.5);
assert.equal(summary.mealCount,2);
assert.equal(summary.waterMl,580);
assert.equal(summary.variance.calories,-1705.5);
assert.equal(summarizeNutritionDay({date:"2026-11-02",logs,water,goals:[]}).completion,"empty");

assert.equal(normalizeSearch("أرز باللبن"),normalizeSearch("ارز باللبن"));
assert.equal(normalizeSearch("ملوخية"),normalizeSearch("ملوخيـه".replace("ـ","")), "Arabic ta marbuta/ha variants should match common spelling variants");
assert.equal(searchFoods([{...food,name:"ملوخية"}],"ملوخيـه".replace("ـ","")).length,1,"Arabic search should find foods despite ة/ه spelling variation");
assert.equal(searchFoods([food,yogurt], "شوف").length,1);
assert.equal(validateGoal({name:"هدف",type:"General",targets:{calories:0}}).ok,true);
assert.equal(validateGoal({name:"",type:"General",targets:{}}).ok,false);
assert.equal(validateGoal({name:"هدف",type:"Unknown",targets:{}}).ok,false);
assert.equal(validateWater({amountMl:250,dateTime:"2026-11-01T10:00:00Z",source:"water"}).ok,true);
assert.equal(validateWater({amountMl:0,dateTime:"2026-11-01T10:00:00Z",source:"water"}).ok,false);
assert.equal(nutritionToday("Africa/Cairo",new Date("2026-11-01T23:30:00Z")),"2026-11-02","local date must honor timezone");

const needs=buildGroceryNeeds({planSlots:[{id:"s1",recipeId:"r1",portions:2,status:"planned"},{id:"s2",recipeId:"r1",portions:1,status:"skipped"}],recipes:[recipe],recipeIngredients:[{recipeId:"r1",foodId:"f1",amount:40}],foods:[food]});
assert.equal(needs.length,1);
assert.equal(needs[0].amount,40,"planned portions scale ingredients relative to recipe yield");
assert.equal(needs[0].sourceSlotIds.length,1);

const validImport=validateNutritionImport({...base,foods:[food],logs:[snapshot]});
assert.equal(validImport.ok,true);
assert.equal(validateNutritionImport({foods:[]}).ok,false);
assert.equal(validateNutritionImport({...base,foods:[food,{...food}]}).ok,false,"duplicate IDs must be rejected");
assert.equal(nutritionDeletionBlocker("food","f1",{foods:[food],logs:[{foodId:"f1"}],recipeIngredients:[],planSlots:[]}).includes("أرشفه"),true);

const analytics=nutritionAnalytics({logs,water,goals:[goal],days:7,today:"2026-11-01"});
assert.equal(analytics.summaries.length,7);
assert.equal(analytics.completeDays,2,"days without food logs must not count as zero-consumption days");
assert.equal(analytics.averageCalories,647.25);

const recipeMulti={id:"r-multi",name:"طبق متوازن",servings:4};
const multiIngredients=[{id:"mi1",recipeId:"r-multi",foodId:"f1",amount:200,unit:"g"},{id:"mi2",recipeId:"r-multi",foodId:"f2",amount:400,unit:"g"}];
assert.equal(validateRecipe(recipeMulti,multiIngredients,[food,yogurt]).ok,true);
assert.equal(validateRecipe({...recipeMulti,name:""},multiIngredients,[food,yogurt]).ok,false);
assert.equal(validateRecipe(recipeMulti,[...multiIngredients,{...multiIngredients[0],id:"mi3"}],[food,yogurt]).ok,false);
assert.equal(validateCookingBatch({id:"b1",recipeId:"r-multi",totalServings:6,consumedServings:2,cookedDate:"2026-11-01",expiryDate:"2026-11-03"},[recipeMulti]).ok,true);
assert.equal(validateCookingBatch({id:"b2",recipeId:"missing",totalServings:6,consumedServings:0},[recipeMulti]).ok,false);
assert.equal(remainingBatchServings({totalServings:6,consumedServings:2}),4);
assert.equal(remainingBatchServings({totalServings:2,consumedServings:4}),0);
const scaledNeeds=buildGroceryNeeds({planSlots:[{id:"s1",recipeId:"r-multi",portions:2,status:"planned"},{id:"s2",recipeId:"r-multi",portions:4,status:"planned"}],recipes:[recipeMulti],recipeIngredients:multiIngredients,foods:[food,yogurt]});
assert.equal(scaledNeeds.find(x=>x.foodId==="f1").amount,300);
assert.equal(scaledNeeds.find(x=>x.foodId==="f2").amount,600);
assert.deepEqual(scaledNeeds.find(x=>x.foodId==="f1").sourceSlotIds,["s1","s2"]);
const household=parseHouseholdPortions("كوب = 240\nملعقة كبيرة = 15","g");
assert.equal(household.ok,true);
assert.equal(household.value.length,2);
const portionFood={...food,portions:household.value};
assert.equal(convertFoodQuantity(portionFood,2,"portion:"+household.value[0].id),480);
const portionSnapshot=snapshotFoodLog(portionFood,1,"portion:"+household.value[0].id,{id:"portion-log"});
assert.equal(portionSnapshot.quantityBase,240);
assert.equal(parseHouseholdPortions("كوب = 0","g").ok,false);
assert.equal(parseHouseholdPortions("كوب = 240\nكوب = 120","g").ok,false,"duplicate household portion labels are rejected");
const denseFood={...food,densityGPerMl:1.03,servingAmount:30};
assert.equal(convertFoodQuantity(denseFood,50,"ml"),51.5);
assert.equal(convertFoodQuantity(denseFood,2,"serving"),60);
assert.throws(()=>convertFoodQuantity(food,50,"ml"),/الكثافة/);
const mlSnapshot=snapshotFoodLog(denseFood,50,"ml",{id:"ml-log"});
assert.equal(mlSnapshot.quantityBase,51.5);
assert.equal(mlSnapshot.nutrientsSnapshot.calories,200.34);
assert.equal(validateFoodLog({foodId:"f1",dateTime:"2026-11-01T10:00:00Z",amount:50,unit:"ml"},[food]).ok,false);
assert.equal(validateFood({...food,densityGPerMl:-1}).ok,false);
assert.equal(searchFoods([{...food,name:"ملوخية"}],"مُلَوْخِيّـه").length,1,"Arabic harakat and tatweel should be ignored");
const quick=buildQuickNutritionLog({name:"وجبة سريعة",dateTime:"2026-11-04T08:00:00Z",localDate:"2026-11-04",nutrients:{calories:420,proteinG:24,carbsG:"",fatG:""}});
assert.equal(quick.ok,true);
assert.equal(quick.value.entryKind,"QuickMacros");
assert.equal(quick.value.nutrientsSnapshot.proteinG,24);
assert.equal(quick.value.nutrientsSnapshot.carbsG,null,"unentered macros must remain unknown, not zero");
assert.equal(quick.value.completeness,"partial");
assert.equal(buildQuickNutritionLog({name:"",nutrients:{calories:100}}).ok,false);
assert.equal(buildQuickNutritionLog({name:"وجبة",nutrients:{calories:-1}}).ok,false);

const outside=buildOutsideHomeLog({name:"وجبة مطعم",venue:"مطعم محلي",dateTime:"2026-11-04T12:00:00Z",localDate:"2026-11-04",rangeMin:450,rangeMax:650,estimationMethod:"Visual",nutrients:{calories:520,proteinG:28}});
assert.equal(outside.ok,true);
assert.equal(outside.value.entryKind,"OutOfHome");
assert.equal(outside.value.confidence,"Estimated");
assert.equal(outside.value.venueLabel,"مطعم محلي");
assert.equal(outside.value.rangeMinKcal,450);
assert.equal(buildOutsideHomeLog({name:"وجبة",venue:"مكان",rangeMin:600,rangeMax:700,nutrients:{calories:500}}).ok,false,"estimate range must contain the selected calorie estimate");
assert.equal(buildOutsideHomeLog({name:"وجبة",venue:"",nutrients:{calories:500}}).ok,false,"outside-home venue is required");

const partialSummary=summarizeNutritionDay({date:"2026-11-04",logs:[quick.value],water:[],goals:[]});
assert.equal(partialSummary.coverage.proteinG.known,1);
assert.equal(partialSummary.coverage.proteinG.complete,true);
assert.equal(partialSummary.coverage.carbsG.missing,1);
assert.equal(partialSummary.coverage.carbsG.complete,false,"unknown macros must be exposed as incomplete daily coverage");
console.log("Nutrition OS domain tests passed");
