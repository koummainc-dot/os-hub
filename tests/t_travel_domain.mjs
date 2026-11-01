import assert from "node:assert/strict";
import {emptyTravelData,normalizeTravelData,validateTrip,tripSpend,packingProgress,getActiveTrip,upcomingTrips,validateRelatedRecord} from "../src/systems/travel/domain.js";
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
