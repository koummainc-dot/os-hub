import React from "react";

const HOTSPOTS = {
  front: [
    ["head","الرأس",120,35],["neck","الرقبة",120,72],["shoulder_right","الكتف الأيمن",83,94],["shoulder_left","الكتف الأيسر",157,94],
    ["chest","الصدر",120,124],["abdomen","البطن",120,174],["pelvis","الحوض",120,222],
    ["upper_arm_right","العضد الأيمن",60,132],["upper_arm_left","العضد الأيسر",180,132],
    ["elbow_right","المرفق الأيمن",48,174],["elbow_left","المرفق الأيسر",192,174],
    ["forearm_right","الساعد الأيمن",39,211],["forearm_left","الساعد الأيسر",201,211],
    ["wrist_right","الرسغ الأيمن",32,246],["wrist_left","الرسغ الأيسر",208,246],
    ["hand_right","اليد اليمنى",25,270],["hand_left","اليد اليسرى",215,270],
    ["hip_right","الورك الأيمن",91,236],["hip_left","الورك الأيسر",149,236],
    ["thigh_right","الفخذ الأيمن",91,279],["thigh_left","الفخذ الأيسر",149,279],
    ["knee_right","الركبة اليمنى",91,322],["knee_left","الركبة اليسرى",149,322],
    ["lower_leg_right","الساق اليمنى",91,356],["lower_leg_left","الساق اليسرى",149,356],
    ["ankle_right","الكاحل الأيمن",91,383],["ankle_left","الكاحل الأيسر",149,383],
    ["foot_right","القدم اليمنى",76,394],["foot_left","القدم اليسرى",164,394]
  ],
  back: [
    ["head","الرأس",120,35],["neck","الرقبة",120,72],["shoulder_right","الكتف الأيمن",83,94],["shoulder_left","الكتف الأيسر",157,94],
    ["upper_back","أعلى الظهر",120,132],["lower_back","أسفل الظهر",120,185],["hip_right","الورك الأيمن",91,236],["hip_left","الورك الأيسر",149,236],
    ["upper_arm_right","العضد الأيمن",60,132],["upper_arm_left","العضد الأيسر",180,132],
    ["elbow_right","المرفق الأيمن",48,174],["elbow_left","المرفق الأيسر",192,174],
    ["forearm_right","الساعد الأيمن",39,211],["forearm_left","الساعد الأيسر",201,211],
    ["wrist_right","الرسغ الأيمن",32,246],["wrist_left","الرسغ الأيسر",208,246],
    ["hand_right","اليد اليمنى",25,270],["hand_left","اليد اليسرى",215,270],
    ["thigh_right","الفخذ الأيمن",91,279],["thigh_left","الفخذ الأيسر",149,279],
    ["knee_right","الركبة اليمنى",91,322],["knee_left","الركبة اليسرى",149,322],
    ["lower_leg_right","الساق اليمنى",91,356],["lower_leg_left","الساق اليسرى",149,356],
    ["ankle_right","الكاحل الأيمن",91,383],["ankle_left","الكاحل الأيسر",149,383],
    ["foot_right","القدم اليمنى",76,394],["foot_left","القدم اليسرى",164,394]
  ]
};

export const BODY_REGION_LABELS = Object.fromEntries(Object.values(HOTSPOTS).flat().map(([code,label])=>[code,label]));
BODY_REGION_LABELS.custom_point = "موضع محدد يدويًا";

export default function HealthBodyMap({ view="front", onViewChange, selectedRegionCode="", selectedPoint=null, onSelect, disabled=false }) {
  const spots = HOTSPOTS[view] || HOTSPOTS.front;
  function choosePoint(event) {
    if(disabled || !onSelect) return;
    const rect=event.currentTarget.getBoundingClientRect();
    const x=Math.max(0,Math.min(100,((event.clientX-rect.left)/rect.width)*100));
    const y=Math.max(0,Math.min(100,((event.clientY-rect.top)/rect.height)*100));
    onSelect({body_region_code:"custom_point",body_view:view,body_x:Number(x.toFixed(2)),body_y:Number(y.toFixed(2)),body_location:"موضع محدد يدويًا"});
  }
  return <section style={{border:"1px solid #E2E8F0",borderRadius:14,padding:14,background:"#F8FAFC"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:10}}>
      <strong style={{fontSize:14}}>حدد موضع العرض على الجسم</strong>
      <div style={{display:"flex",gap:6}}>
        {["front","back"].map(v=><button key={v} type="button" disabled={disabled} onClick={()=>onViewChange?.(v)} style={{border:"1px solid "+(view===v?"#0EA5E9":"#CBD5E1"),borderRadius:9,padding:"7px 12px",background:view===v?"#E0F2FE":"#fff",fontWeight:700,cursor:"pointer"}}>{v==="front"?"الأمام":"الخلف"}</button>)}
      </div>
    </div>
    <p style={{fontSize:12,color:"#64748B",margin:"0 0 10px"}}>اختر دائرة لتحديد منطقة، أو اضغط على أي موضع آخر داخل الرسم لتحديد نقطة مخصصة. الاتجاه يمين/يسار هو يمين ويسار الشخص نفسه.</p>
    <div onClick={choosePoint} style={{position:"relative",width:"min(100%,300px)",aspectRatio:"240 / 410",margin:"0 auto",cursor:disabled?"default":"crosshair",touchAction:"manipulation"}}>
      <svg viewBox="0 0 240 410" role="img" aria-label={view==="front"?"مخطط أمامي للجسم":"مخطط خلفي للجسم"} style={{width:"100%",height:"100%",display:"block"}}>
        <g fill="#E2E8F0" stroke="#94A3B8" strokeWidth="2" strokeLinejoin="round">
          <circle cx="120" cy="35" r="23"/>
          <path d="M103 61 L137 61 L141 82 Q164 83 178 99 L194 166 L208 238 L195 244 L174 181 L169 142 L166 217 Q159 238 151 247 L164 273 L175 384 L155 389 L135 282 L125 255 L115 255 L105 282 L85 389 L65 384 L76 273 L89 247 Q81 238 74 217 L69 142 L66 181 L45 244 L32 238 L46 166 L62 99 Q76 83 99 82 Z"/>
          <path d="M91 246 Q120 260 149 246 L143 267 Q120 279 97 267 Z"/>
        </g>
        {spots.map(([code,label,x,y])=>{
          const active=selectedRegionCode===code;
          return <g key={code} onClick={e=>{e.stopPropagation();if(!disabled)onSelect?.({body_region_code:code,body_view:view,body_x:Number((x/240*100).toFixed(2)),body_y:Number((y/410*100).toFixed(2)),body_location:label});}} style={{cursor:disabled?"default":"pointer"}}>
            <circle cx={x} cy={y} r="10" fill={active?"#0284C7":"#fff"} stroke={active?"#075985":"#64748B"} strokeWidth="2.5"/>
            <circle cx={x} cy={y} r="3" fill={active?"#fff":"#64748B"}/>
            <title>{label}</title>
          </g>;
        })}
        {selectedRegionCode==="custom_point"&&selectedPoint&&selectedPoint.body_view===view&&<circle cx={Number(selectedPoint.body_x)*2.4} cy={Number(selectedPoint.body_y)*4.1} r="8" fill="#DC2626" stroke="#fff" strokeWidth="3" pointerEvents="none"/>}
      </svg>
    </div>
    <div style={{textAlign:"center",fontSize:13,fontWeight:800,color:"#0F172A",marginTop:7}}>{selectedRegionCode?BODY_REGION_LABELS[selectedRegionCode]||"موضع محدد":"لم يتم تحديد موضع"}</div>
    {selectedRegionCode&&<div style={{textAlign:"center",marginTop:7}}><button type="button" disabled={disabled} onClick={()=>onSelect?.({body_region_code:null,body_view:null,body_x:null,body_y:null,body_location:""})} style={{border:0,background:"transparent",color:"#B91C1C",fontWeight:700,cursor:"pointer"}}>مسح تحديد الموقع</button></div>}
  </section>;
}
