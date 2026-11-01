import assert from "node:assert/strict";
import {emptyTravelData,normalizeTravelData,validateTrip,tripSpend,packingProgress,getActiveTrip,upcomingTrips,validateRelatedRecord,validateTravelImport,buildTravelExport,validateFinanceLink,tripBudgetBreakdown} from "../src/systems/travel/domain.js";
const base=emptyTravelData();
assert.equal(base.trips.length,0);
assert.deepEqual(validateTrip({name:"",destination:""}),["اسم الرحلة مطلوب","الوجهة مطلوبة"]);
assert.ok(validateTrip({name:"Trip",destination:"Cairo",startDate:"2026-12-10",endDate:"2026-12-09"}).includes("تاريخ العودة يجب ألا يسبق تاريخ المغادرة"));
const data=normalizeTravelData({
 trips:[
  {id:"active",name:"Now",destination:"Aswan",startDate:"2026-11-01",endDate:"2026-11-04",status:"active",budget:1000,currency:"EGP"},
  {id:"next",name:"Later",destination:"Alex",startDate:"2026-12-10",endDate:"2026-12-12",status:"planning",budget:2000,currency:"EGP"},
  {id:"cancelled",name:"No",destination:"X",startDate:"2026-11-02",endDate:"2026-11-05",status:"cancelled"}
 ],
 bookings:[{id:"b1",tripId:"active",cost:250,status:"confirmed"},{id:"b2",tripId:"active",cost:100,status:"cancelled"}],
 itinerary:[{id:"i1",tripId:"active",estimatedCost:150},{id:"i2",tripId:"active",estimatedCost:50}],
 packing:[{id:"p1",tripId:"active",packed:true},{id:"p2",tripId:"active",packed:false},{id:"p3",tripId:"next",packed:true}]
});
assert.equal(getActiveTrip(data,"2026-11-01").id,"active");
assert.deepEqual(upcomingTrips(data,"2026-11-01").map(t=>t.id),["next"]);
assert.deepEqual(tripSpend("active",data),{budget:1000,bookingSpend:250,plannedSpend:200,total:450,currency:"EGP"});
assert.deepEqual(packingProgress("active",data),{total:2,packed:1,remaining:1,percent:50});
assert.ok(validateRelatedRecord("itinerary",{title:"",tripId:"active"},data).includes("عنوان النشاط مطلوب"));
assert.ok(validateRelatedRecord("bookings",{title:"Stay",tripId:"missing"},data).includes("الرحلة المرتبطة غير موجودة"));
assert.equal(normalizeTravelData({trips:"bad"}).trips.length,0);
console.log("Travel OS domain tests passed");

const importable={schemaVersion:1,trips:[{id:"t1",name:"Trip"}],bookings:[{id:"b1",tripId:"t1",reference:"CONFIDENTIAL"}],documents:[{id:"d1",tripId:"t1",reference:"PASSPORT-REF",storageNote:"private path"}],memories:[{id:"m1",mediaPath:"private/file.jpg"}]};
assert.equal(validateTravelImport(importable).valid,true);
assert.equal(validateTravelImport({...importable,bookings:[{id:"b1",tripId:"missing"}]}).valid,false);
assert.equal(validateTravelImport({...importable,trips:"not-an-array"}).valid,false);
assert.equal(validateTravelImport({}).valid,false);
assert.equal(validateTravelImport({...importable,trips:[{id:"same"},{id:"same"}]}).valid,false);
const safeExport=buildTravelExport(importable);
assert.equal(safeExport.redactedFields,4);
assert.equal(safeExport.exported.bookings[0].reference,"");
assert.equal(safeExport.exported.documents[0].reference,"");
assert.equal(safeExport.exported.documents[0].storageNote,"");
assert.equal(safeExport.exported.memories[0].mediaPath,"");
assert.equal(buildTravelExport(importable,{includeSensitive:true}).exported.bookings[0].reference,"CONFIDENTIAL");
console.log("Travel OS import/export safety tests passed");

const budgetData=normalizeTravelData({
 trips:[{id:"budget-trip",name:"Budget Trip",destination:"Cairo",budget:1000,currency:"EGP"}],
 bookings:[{id:"stay",tripId:"budget-trip",title:"Hotel",cost:300,currency:"EGP",status:"confirmed"},{id:"cancelled-stay",tripId:"budget-trip",cost:200,currency:"EGP",status:"cancelled"}],
 itinerary:[{id:"museum",tripId:"budget-trip",title:"Museum",estimatedCost:100,status:"planned"},{id:"tour",tripId:"budget-trip",title:"Tour",estimatedCost:50,status:"planned"}],
 financeLinks:[{id:"link-hotel",tripId:"budget-trip",sourceType:"booking",sourceId:"stay",financeTransactionId:"tx-hotel",kind:"expense"},{id:"link-refund",tripId:"budget-trip",sourceType:"trip",sourceId:"",financeTransactionId:"tx-refund",kind:"refund"}]
});
const financeRows=[
 {id:"tx-hotel",name:"Hotel paid",base_amount:100,currency:"EGP",status:"Posted",pnl_effect:"Expense"},
 {id:"tx-refund",name:"Refund",base_amount:20,currency:"EGP",status:"Posted",pnl_effect:"Income"}
];
const breakdown=tripBudgetBreakdown("budget-trip",budgetData,financeRows,"EGP");
assert.equal(breakdown.bookingCommitments,300);
assert.equal(breakdown.outstandingBookingCommitment,200);
assert.equal(breakdown.plannedActivities,150);
assert.equal(breakdown.actualExpensesBase,100);
assert.equal(breakdown.refundsBase,20);
assert.equal(breakdown.netActualBase,80);
assert.equal(breakdown.projectedTotal,430);
assert.equal(breakdown.remainingBudget,570);
assert.equal(validateFinanceLink({tripId:"budget-trip",financeTransactionId:"tx-hotel",kind:"expense",sourceType:"booking",sourceId:"stay"},budgetData,financeRows).includes("هذه الحركة المالية مرتبطة بالسفر بالفعل."),true);
assert.equal(validateFinanceLink({tripId:"budget-trip",financeTransactionId:"tx-refund",kind:"expense",sourceType:"trip"},emptyTravelData(),financeRows).some(e=>e.includes("حركة مصروف")),true);
const foreignCurrency=tripBudgetBreakdown("budget-trip",budgetData,financeRows,"USD");
assert.equal(foreignCurrency.requiresFx,true);
assert.equal(foreignCurrency.actualInTripCurrency,null);
assert.equal(foreignCurrency.plannedActivities,150);
assert.equal(validateTravelImport({...importable,financeLinks:[{id:"fl1",tripId:"missing",financeTransactionId:"external-tx",kind:"expense"}]}).valid,false);
console.log("Travel OS finance-linked budget tests passed");
