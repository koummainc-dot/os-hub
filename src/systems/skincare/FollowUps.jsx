import React, { useMemo, useState } from "react";
import { buildSkinFollowUps } from "./domain.js";

const C = { ink: "#182230", muted: "#64748B", line: "#E2E8F0", white: "#FFFFFF", accent: "#A855F7", soft: "#FAF5FF", danger: "#B91C1C", warn: "#B45309" };
const panel = { background: C.white, border: "1px solid " + C.line, borderRadius: 14, padding: 15, marginBottom: 12 };
const btn = (primary = false) => ({ border: "1px solid " + (primary ? C.accent : C.line), background: primary ? C.accent : C.white, color: primary ? C.white : C.ink, borderRadius: 9, padding: "8px 11px", font: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer" });
const dateLabel = value => new Date(value + "T12:00:00Z").toLocaleDateString("ar-EG", { day: "numeric", month: "short", year: "numeric" });
const labels = { "product-expiry": "انتهاء منتج", "unit-expiry": "انتهاء عبوة", "routine-reminder": "تذكير روتين", "trial-start": "بدء تجربة", "trial-review": "مراجعة تجربة", "reaction-followup": "متابعة تفاعل" };

export default function SkinFollowUps({ today, timezone = "Africa/Cairo", weekStartDay = 0, expiryWindowDays = 30, products, units, routines, routineLogs, trials, reactions, setPage }) {
  const [filter, setFilter] = useState("all");
  const items = useMemo(() => buildSkinFollowUps({ today, timezone, weekStartDay, expiryWindowDays, products, units, routines, routineLogs, trials, reactions }), [today, timezone, weekStartDay, expiryWindowDays, products, units, routines, routineLogs, trials, reactions]);
  const visible = filter === "all" ? items : items.filter(item => item.type === filter);
  const highCount = items.filter(item => item.priority === "high").length;
  const filters = [["all", "الكل"], ["product-expiry", "المنتجات"], ["unit-expiry", "العبوات"], ["routine-reminder", "الروتين"], ["trial-start", "التجارب"], ["trial-review", "مراجعة التجارب"], ["reaction-followup", "التفاعلات"]];
  return <div>
    <section style={{ ...panel, background: "linear-gradient(135deg,#FAF5FF,#FFFFFF)" }}>
      <b style={{ fontSize: 16 }}>المتابعة والتنبيهات</b>
      <p style={{ color: C.muted, fontSize: 11, margin: "5px 0 10px" }}>متابعة مستخرجة من بيانات العناية بالبشرة حتى {dateLabel(today)}.</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <div style={{ border: "1px solid " + C.line, borderRadius: 10, padding: 10, minWidth: 90 }}><b style={{ fontSize: 22 }}>{items.length}</b><div style={{ color: C.muted, fontSize: 10 }}>كل المتابعات</div></div>
        <div style={{ border: "1px solid " + C.line, borderRadius: 10, padding: 10, minWidth: 90 }}><b style={{ color: C.danger, fontSize: 22 }}>{highCount}</b><div style={{ color: C.muted, fontSize: 10 }}>تحتاج مراجعة</div></div>
      </div>
    </section>
    <section style={panel}>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        {filters.map(([key, label]) => <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)} style={{ ...btn(filter === key), padding: "7px 9px" }}>{label}</button>)}
      </div>
    </section>
    {!visible.length && <section style={{ ...panel, textAlign: "center", color: C.muted, fontSize: 13 }}>لا توجد متابعات في هذا التصنيف حاليًا.</section>}
    {visible.map(item => <article key={item.id} style={{ ...panel, borderInlineStart: "4px solid " + (item.priority === "high" ? C.danger : C.accent) }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <b style={{ fontSize: 13 }}>{item.title}</b>
        <span style={{ background: item.priority === "high" ? "#FEF2F2" : C.soft, color: item.priority === "high" ? C.danger : C.accent, borderRadius: 20, padding: "4px 8px", fontSize: 10 }}>{labels[item.type]}</span>
      </div>
      <p style={{ color: C.muted, fontSize: 12, lineHeight: 1.7, margin: "7px 0" }}>{item.description}</p>
      {item.productName && <div style={{ color: C.muted, fontSize: 10 }}>المنتج: {item.productName}</div>}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 9, flexWrap: "wrap" }}>
        <small style={{ color: C.muted }}>{item.dueDate ? dateLabel(item.dueDate) : ""}{item.reminderTime ? " · " + item.reminderTime : ""}</small>
        <button type="button" style={btn(true)} onClick={() => setPage(item.page)}>{item.action}</button>
      </div>
    </article>)}
    <p style={{ color: C.muted, fontSize: 10, lineHeight: 1.8, padding: "0 4px" }}>هذه قائمة متابعة داخل التطبيق وليست خدمة إشعارات تعمل في الخلفية. لا ترسل تنبيهات إلى الهاتف أو البريد عند إغلاق التطبيق. راجع البيانات الأصلية قبل اتخاذ قرار بشأن منتج أو تفاعل.</p>
  </div>;
}
