import assert from "node:assert/strict";
import {emptyTravelData,normalizeTravelData,validateTrip,tripSpend,packingProgress,getActiveTrip,upcomingTrips,validateRelatedRecord,validateTravelImport,buildTravelExport,validateFinanceLink,tripBudgetBreakdown,financeTransactionState,financeTransactionStateLabel,validateStop,sortTripStops,findItineraryConflicts,getUpcomingTravelAlerts,travelDeletionBlocker} from "../src/systems/travel/domain.js";
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
 financeLinks:[{id:"link-hotel",tripId:"budget-trip",sourceType:"booking",sourceId:"stay",financeTransactionId:"tx-hotel",kind:"expense"},{id:"link-hotel-part2",tripId:"budget-trip",sourceType:"booking",sourceId:"stay",financeTransactionId:"tx-hotel-part2",kind:"expense"},{id:"link-refund",tripId:"budget-trip",sourceType:"booking",sourceId:"stay",financeTransactionId:"tx-refund",kind:"refund"}]
});
const financeRows=[
 {id:"tx-hotel",name:"Hotel deposit",base_amount:100,currency:"EGP",status:"Posted",pnl_effect:"Expense"},
 {id:"tx-hotel-part2",name:"Hotel second payment",base_amount:50,currency:"EGP",status:"Posted",pnl_effect:"Expense"},
 {id:"tx-refund",name:"Hotel refund",base_amount:20,currency:"EGP",status:"Posted",pnl_effect:"Income",refund_of_id:"tx-hotel"}
];
const breakdown=tripBudgetBreakdown("budget-trip",budgetData,financeRows,"EGP");
assert.equal(breakdown.bookingCommitments,300);
assert.equal(breakdown.outstandingBookingCommitment,170);
assert.equal(breakdown.plannedActivities,150);
assert.equal(breakdown.actualExpensesBase,150);
assert.equal(breakdown.refundsBase,20);
assert.equal(breakdown.netActualBase,130);
assert.equal(breakdown.projectedTotal,450);
assert.equal(breakdown.remainingBudget,550);
const activityLinkedData=normalizeTravelData({
 trips:[{id:"activity-trip",name:"Activity Trip",destination:"Cairo",budget:500,currency:"EGP"}],
 itinerary:[{id:"activity-1",tripId:"activity-trip",title:"Museum",estimatedCost:120,status:"planned"}],
 financeLinks:[{id:"activity-link",tripId:"activity-trip",sourceType:"itinerary",sourceId:"activity-1",financeTransactionId:"tx-activity",kind:"expense"}]
});
const activityBreakdown=tripBudgetBreakdown("activity-trip",activityLinkedData,[{id:"tx-activity",base_amount:120,status:"Posted",pnl_effect:"Expense"}],"EGP");
assert.equal(activityBreakdown.plannedActivities,0);
assert.equal(activityBreakdown.projectedTotal,120);

assert.equal(validateFinanceLink({tripId:"budget-trip",financeTransactionId:"tx-hotel",kind:"expense",sourceType:"booking",sourceId:"stay"},budgetData,financeRows).includes("هذه الحركة المالية مرتبطة بالسفر بالفعل."),true);
assert.equal(validateFinanceLink({tripId:"budget-trip",financeTransactionId:"tx-refund",kind:"expense",sourceType:"trip"},emptyTravelData(),financeRows).some(e=>e.includes("حركة مصروف")),true);
const foreignCurrency=tripBudgetBreakdown("budget-trip",budgetData,financeRows,"USD");
assert.equal(foreignCurrency.requiresFx,true);
assert.equal(foreignCurrency.actualInTripCurrency,null);
assert.equal(foreignCurrency.plannedActivities,150);
assert.equal(validateTravelImport({...importable,financeLinks:[{id:"fl1",tripId:"missing",financeTransactionId:"external-tx",kind:"expense"}]}).valid,false);
console.log("Travel OS finance-linked budget tests passed");

const mismatchedRefundData=normalizeTravelData({
 trips:[{id:"refund-trip",name:"Refund Trip",destination:"Cairo",budget:1000,currency:"EGP"}],
 bookings:[{id:"booking-a",tripId:"refund-trip",title:"Hotel A",cost:300,currency:"EGP",status:"confirmed"},{id:"booking-b",tripId:"refund-trip",title:"Hotel B",cost:200,currency:"EGP",status:"confirmed"}],
 financeLinks:[{id:"original-link",tripId:"refund-trip",sourceType:"booking",sourceId:"booking-a",financeTransactionId:"original-expense",kind:"expense"}]
});
const refundTransactions=[
 {id:"original-expense",base_amount:100,status:"Posted",pnl_effect:"Expense"},
 {id:"wrong-booking-refund",base_amount:25,status:"Posted",pnl_effect:"Income",refund_of_id:"original-expense"}
];
assert.ok(validateFinanceLink({tripId:"refund-trip",sourceType:"booking",sourceId:"booking-b",financeTransactionId:"wrong-booking-refund",kind:"refund"},mismatchedRefundData,refundTransactions).some(e=>e.includes("الحجز أو النشاط نفسه")));
assert.deepEqual(validateFinanceLink({tripId:"refund-trip",sourceType:"booking",sourceId:"booking-a",financeTransactionId:"wrong-booking-refund",kind:"refund"},mismatchedRefundData,refundTransactions),[]);
const invalidRefundBreakdown=tripBudgetBreakdown("refund-trip",normalizeTravelData({...mismatchedRefundData,financeLinks:[...mismatchedRefundData.financeLinks,{id:"wrong-refund-link",tripId:"refund-trip",sourceType:"booking",sourceId:"booking-b",financeTransactionId:"wrong-booking-refund",kind:"refund"}]}),refundTransactions,"EGP");
assert.equal(invalidRefundBreakdown.refundsBase,0);
assert.equal(invalidRefundBreakdown.invalidRefundLinks,1);
const cancelledTx={id:"cancelled-tx",base_amount:70,status:"Cancelled",pnl_effect:"Expense"};
const reversalOriginal={id:"reversed-tx",base_amount:80,status:"Posted",pnl_effect:"Expense"};
const reversalTx={id:"reversal-entry",base_amount:-80,status:"Posted",pnl_effect:"Income",reversal_of_id:"reversed-tx"};
const stateRows=[cancelledTx,reversalOriginal,reversalTx];
assert.equal(financeTransactionState(cancelledTx,stateRows),"cancelled");
assert.equal(financeTransactionState(reversalOriginal,stateRows),"reversed");
assert.equal(financeTransactionState(reversalTx,stateRows),"reversal");
assert.match(financeTransactionStateLabel(reversalOriginal,stateRows),/معكوسة/);
const excludedData=normalizeTravelData({
 trips:[{id:"excluded-trip",name:"Excluded",destination:"Cairo",budget:1000,currency:"EGP"}],
 financeLinks:[
  {id:"cancelled-link",tripId:"excluded-trip",sourceType:"trip",sourceId:"",financeTransactionId:"cancelled-tx",kind:"expense"},
  {id:"reversed-link",tripId:"excluded-trip",sourceType:"trip",sourceId:"",financeTransactionId:"reversed-tx",kind:"expense"},
  {id:"reversal-link",tripId:"excluded-trip",sourceType:"trip",sourceId:"",financeTransactionId:"reversal-entry",kind:"expense"}
 ]
});
const excludedBreakdown=tripBudgetBreakdown("excluded-trip",excludedData,stateRows,"EGP");
assert.equal(excludedBreakdown.actualExpensesBase,0);
assert.equal(excludedBreakdown.excludedLinks,3);
assert.ok(validateFinanceLink({tripId:"excluded-trip",sourceType:"trip",sourceId:"",financeTransactionId:"reversed-tx",kind:"expense"},excludedData,stateRows).some(e=>e.includes("معكوسة")));
console.log("Travel OS partial payment, refund matching, and reversal tests passed");



const stopData=normalizeTravelData({trips:[{id:"multi-stop",name:"Multi-stop",destination:"Egypt"}],stops:[
 {id:"stop-2",tripId:"multi-stop",name:"Luxor",order:2,arrivalDate:"2026-12-03",departureDate:"2026-12-05",timeZone:"Africa/Cairo"},
 {id:"stop-1",tripId:"multi-stop",name:"Aswan",order:1,arrivalDate:"2026-12-01",departureDate:"2026-12-03",timeZone:"Africa/Cairo"}
]});
assert.deepEqual(sortTripStops(stopData.stops,"multi-stop").map(x=>x.id),["stop-1","stop-2"]);
assert.ok(validateStop({name:"Bad stop",order:0,arrivalDate:"2026-12-05",departureDate:"2026-12-04",timeZone:"Not/AZone"}).length>=3);
assert.equal(validateStop({name:"Aswan",order:1,arrivalDate:"2026-12-01",departureDate:"2026-12-02",timeZone:"Africa/Cairo"}).length,0);
const timeConflicts=findItineraryConflicts([
 {id:"a",tripId:"multi-stop",date:"2026-12-01",startTime:"09:00",endTime:"10:30",title:"Museum"},
 {id:"b",tripId:"multi-stop",date:"2026-12-01",startTime:"10:00",endTime:"11:00",title:"Tour"},
 {id:"c",tripId:"other-trip",date:"2026-12-01",startTime:"09:30",endTime:"10:30",title:"Different trip"},
 {id:"overnight",tripId:"multi-stop",date:"2026-12-01",startTime:"23:00",endTime:"02:00",title:"Night train"},
 {id:"next-night",tripId:"multi-stop",date:"2026-12-02",startTime:"01:30",endTime:"03:00",title:"Early transfer"}
]);
assert.equal(timeConflicts.length,2);
assert.ok(timeConflicts.some(x=>x.firstId==="a"&&x.secondId==="b"));
assert.ok(timeConflicts.some(x=>x.firstId==="overnight"&&x.secondId==="next-night"));
assert.equal(validateTravelImport({...importable,stops:[{id:"bad-stop",tripId:"missing"}]}).valid,false);
console.log("Travel OS stops and itinerary conflict tests passed");


const alertData=normalizeTravelData({
 trips:[{id:"alert-trip",name:"Alert trip",destination:"Cairo"}],
 bookings:[{id:"cancel-soon",tripId:"alert-trip",title:"Hotel",status:"confirmed",cancellationDeadline:"2026-11-03"},{id:"cancelled-booking",tripId:"alert-trip",title:"Cancelled",status:"cancelled",cancellationDeadline:"2026-11-02"}],
 documents:[{id:"passport",tripId:"alert-trip",title:"Passport",expiryDate:"2026-11-20"},{id:"expired-visa",tripId:"alert-trip",title:"Visa",expiryDate:"2026-10-30"}]
});
const alerts=getUpcomingTravelAlerts(alertData,"2026-11-01");
assert.equal(alerts.length,3);
assert.equal(alerts[0].id,"document:expired-visa");
assert.equal(alerts[0].level,"urgent");
assert.ok(alerts.some(a=>a.id==="booking:cancel-soon"&&a.daysUntil===2));
assert.ok(!alerts.some(a=>a.id==="booking:cancelled-booking"));
console.log("Travel OS deadline alert tests passed");


assert.equal(travelDeletionBlocker("trip",{id:"multi-stop"},stopData),"لا يمكن حذف رحلة لها سجلات مرتبطة؛ غيّر حالتها إلى ملغاة للاحتفاظ بالتاريخ دون ترك سجلات يتيمة.");
const linkedPlaceData=normalizeTravelData({destinations:[{id:"dest"}],places:[{id:"place",destinationId:"dest"}],experiences:[{id:"exp",placeId:"place"}]});
assert.ok(travelDeletionBlocker("destination",{id:"dest"},linkedPlaceData).includes("وجهة مرتبطة"));
assert.ok(travelDeletionBlocker("place",{id:"place"},linkedPlaceData).includes("تجارب فعلية"));
assert.equal(travelDeletionBlocker("place",{id:"unlinked"},linkedPlaceData),"");
console.log("Travel OS deletion integrity tests passed");


assert.deepEqual(normalizeTravelData({}).stops,[]);
assert.deepEqual(normalizeTravelData({}).experiences,[]);
assert.deepEqual(normalizeTravelData({}).packingTemplates,[]);
const safeStopsExport=buildTravelExport({schemaVersion:1,trips:[{id:"export-trip",name:"Export"}],stops:[{id:"export-stop",tripId:"export-trip",name:"Aswan",order:1,timeZone:"Africa/Cairo"}],experiences:[{id:"export-experience",tripId:"export-trip",title:"Walk"}],packingTemplates:[{id:"export-template",name:"Light",items:[{item:"Shoes"}]}]});
assert.equal(validateTravelImport(safeStopsExport.exported).valid,true);
assert.equal(safeStopsExport.exported.stops[0].name,"Aswan");
assert.equal(safeStopsExport.exported.experiences[0].title,"Walk");
console.log("Travel OS new collections import/export tests passed");


const multiStopSchedule=[
 {id:"city-a-1",tripId:"multi-stop",stopId:"stop-1",date:"2026-12-01",startTime:"09:00",endTime:"10:00",title:"City A"},
 {id:"city-b-1",tripId:"multi-stop",stopId:"stop-2",date:"2026-12-01",startTime:"09:30",endTime:"10:30",title:"City B"}
];
assert.equal(findItineraryConflicts(multiStopSchedule).length,0);
const badStopAssignment=normalizeTravelData({...stopData,itinerary:[{id:"wrong-stop",tripId:"other-trip",stopId:"stop-1",title:"Wrong trip"}],trips:[...stopData.trips,{id:"other-trip",name:"Other",destination:"Elsewhere"}]});
assert.ok(validateRelatedRecord("itinerary",badStopAssignment.itinerary[0],badStopAssignment).some(e=>e.includes("محطة البرنامج")));
assert.equal(validateTravelImport({...importable,trips:[{id:"t1",name:"Trip 1"},{id:"t2",name:"Trip 2"}],stops:[{id:"s1",tripId:"t1",name:"A",order:1}],itinerary:[{id:"i1",tripId:"t2",stopId:"s1",title:"Wrong"}]}).valid,false);
console.log("Travel OS itinerary-to-stop relationship tests passed");
