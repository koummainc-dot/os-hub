import React from "react";

const GREEN = "#059669";
const MUTED = "#718078";
const LINE = "#E4EBE6";

export default function FinanceChart({ title, rows = [], empty = "لا توجد بيانات كافية لعرض الرسم", valueLabel = value => String(value), note }) {
  const clean = rows.filter(row => Number.isFinite(Number(row.value)));
  const max = Math.max(1, ...clean.map(row => Math.abs(Number(row.value))));
  return <section style={{ background:"#fff", border:"1px solid "+LINE, borderRadius:14, padding:15, minWidth:0 }}>
    <div style={{ display:"flex", justifyContent:"space-between", gap:10, alignItems:"center", flexWrap:"wrap", marginBottom:12 }}>
      <h3 style={{ margin:0, fontSize:14, color:"#17211D" }}>{title}</h3>
      {note && <span style={{ fontSize:10, color:MUTED }}>{note}</span>}
    </div>
    {clean.length ? <div style={{ display:"grid", gap:10 }}>
      {clean.slice(0,12).map((row,index) => <div key={row.id||row.label||index}>
        <div style={{ display:"flex", justifyContent:"space-between", gap:8, fontSize:11, marginBottom:5 }}>
          <span style={{ color:"#34433B", minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{row.label}</span>
          <b style={{ color:"#17211D", whiteSpace:"nowrap" }}>{valueLabel(Number(row.value),row)}</b>
        </div>
        <div role="img" aria-label={row.label+": "+valueLabel(Number(row.value),row)} style={{ height:8, background:"#EEF2EF", borderRadius:99, overflow:"hidden" }}>
          <div style={{ height:"100%", width:(Math.abs(Number(row.value))/max*100)+"%", background:row.color||GREEN, borderRadius:99 }}/>
        </div>
      </div>)}
    </div> : <div style={{ padding:"16px 8px", textAlign:"center", color:MUTED, fontSize:12 }}>{empty}</div>}
  </section>;
}
