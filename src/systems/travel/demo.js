import {emptyTravelData} from "./domain.js";
export function buildTravelSeed(){
 const day=(n)=>{const d=new Date();d.setDate(d.getDate()+n);return d.toISOString().slice(0,10);};
 return {...emptyTravelData(),
  trips:[
   {id:"trip-demo-cairo",name:"إجازة قصيرة في القاهرة",destination:"القاهرة، مصر",startDate:day(14),endDate:day(17),status:"planning",travelers:1,budget:6500,currency:"EGP",purpose:"ثقافة وتجارب",notes:"بيانات تجريبية للتوضيح فقط."},
   {id:"trip-demo-aswan",name:"رحلة أسوان",destination:"أسوان، مصر",startDate:day(-2),endDate:day(2),status:"active",travelers:2,budget:9000,currency:"EGP",purpose:"استكشاف",notes:"رحلة تجريبية."}
  ],
  destinations:[{id:"dest-demo",name:"أسوان، مصر",country:"مصر",region:"جنوب مصر",bestSeason:"الشتاء",visaRequired:false,notes:"مثال تجريبي."}],
  places:[{id:"place-demo",name:"متحف النوبة",destinationId:"dest-demo",type:"متحف",rating:5,visited:false,notes:"مكان مقترح ضمن البيانات التجريبية."}],
  itinerary:[{id:"it-demo",tripId:"trip-demo-aswan",date:day(-1),startTime:"10:00",endTime:"12:00",title:"زيارة مكان ثقافي",type:"activity",location:"أسوان",estimatedCost:300,status:"planned",notes:"عنصر تجريبي."}],
  bookings:[{id:"book-demo",tripId:"trip-demo-aswan",type:"hotel",title:"إقامة تجريبية",provider:"مثال فقط",reference:"",startDate:day(-2),endDate:day(2),cost:2200,currency:"EGP",status:"confirmed",notes:"لا يمثل حجزًا حقيقيًا."}],
  packing:[{id:"pack-demo",tripId:"trip-demo-aswan",item:"شاحن الهاتف",category:"إلكترونيات",quantity:1,packed:false,essential:true,notes:"عنصر تجريبي."},{id:"pack-demo-2",tripId:"trip-demo-aswan",item:"الأدوية الشخصية",category:"صحة",quantity:1,packed:true,essential:true,notes:"عنصر تجريبي."}],
  memories:[{id:"memory-demo",tripId:"trip-demo-aswan",date:day(-1),title:"بداية الرحلة",kind:"note",body:"مكان مخصص لتسجيل الذكريات بعد التجربة.",mediaPath:""}],
  reviews:[{id:"review-demo",tripId:"trip-demo-aswan",target:"مكان تجريبي",rating:4,category:"place",date:day(-1),notes:"تقييم توضيحي."}]
 };
}
