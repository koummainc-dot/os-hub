import React, { useMemo, useState } from "react";
import { buildSkinDashboardData } from "./domain.js";

const C = { ink: "#182230", muted: "#64748B", line: "#E2E8F0", white: "#FFFFFF", accent: "#A855F7", soft: "#FAF5FF" };
const panel = { background: C.white, border: "1px solid " + C.line, borderRadius: 14, padding: 15, marginBottom: 12 };
const dateLabel = value => new Date(value + "T12:00:00Z").toLocaleDateString("ar-EG", { day: "numeric", month: "short" });
const metric = { background: C.white, border: "1px solid " + C.line, borderRadius: 12, padding: 13, minWidth: 0 };
const AREAS = ["الجبهة", "الخد الأيسر", "الخد الأيمن", "الأنف", "الذقن", "الفك"];

function Metric({ label, value, note }) {
  return <div style={metric}><div style={{ color: C.muted, fontSize: 11 }}>{label}</div><b style={{ display: "block", fontSize: 23, marginTop: 4 }}>{value}</b>{note && <small style={{ color: C.muted, fontSize: 10 }}>{note}</small>}</div>;
}

function RatingTimeline({ timeline }) {
  const width = 760, height = 190, left = 34, right = 14, top = 16, bottom = 30;
  const x = index => left + index * (width - left - right) / Math.max(1, timeline.length - 1);
  const y = value => top + (5 - value) * (height - top - bottom) / 5;
  const segments = [];
  let current = [];
  timeline.forEach((item, index) => {
    if (item.recorded) current.push({ x: x(index), y: y(item.rating), ...item });
    else if (current.length) { segments.push(current); current = []; }
  });
  if (current.length) segments.push(current);
  const points = timeline.map((item, index) => item.recorded ? { ...item, x: x(index), y: y(item.rating) } : null).filter(Boolean);
  return <div style={{ overflowX: "auto" }}>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="التقييم اليومي للبشرة مع إظهار الأيام غير المسجلة كفجوات" style={{ width: "100%", minWidth: 320, display: "block" }}>
      {[0,1,2,3,4,5].map(value => <g key={value}><line x1={left} x2={width-right} y1={y(value)} y2={y(value)} stroke={C.line} strokeDasharray="3 4" /><text x={left-9} y={y(value)+4} textAnchor="end" fontSize="10" fill={C.muted}>{value}</text></g>)}
      {segments.map((segment, index) => segment.length > 1 && <polyline key={index} fill="none" stroke={C.accent} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" points={segment.map(point => `${point.x},${point.y}`).join(" ")} />)}
      {points.map(point => <g key={point.date}><circle cx={point.x} cy={point.y} r="4" fill={C.accent} /><title>{dateLabel(point.date)}: {point.rating}</title></g>)}
      <text x={left} y={height-7} fontSize="10" fill={C.muted}>{dateLabel(timeline[0].date)}</text>
      <text x={width-right} y={height-7} fontSize="10" fill={C.muted} textAnchor="end">{dateLabel(timeline[timeline.length-1].date)}</text>
    </svg>
    <div style={{ color: C.muted, fontSize: 11, lineHeight: 1.8 }}>كل نقطة تمثل تقييمًا مسجلًا. الخط لا يعبر الأيام المفقودة؛ الفجوات تعني عدم وجود تقييم وليست صفرًا.</div>
  </div>;
}

export default function SkinDashboard({ endDate, diaryEntries, trials, reactions, photos, routines, routineLogs }) {
  const [days, setDays] = useState(30);
  const data = useMemo(() => buildSkinDashboardData({ entries: diaryEntries, trials, reactions, photos, routines, routineLogs, endDate, days }), [diaryEntries, trials, reactions, photos, routines, routineLogs, endDate, days]);
  const factorNames = { sleepHours: "ساعات النوم", sleepQuality: "جودة النوم", mood: "المزاج", exerciseMinutes: "النشاط", waterGlasses: "أكواب المياه" };
  const coefficient = value => value === null ? "—" : (value > 0 ? "+" : "") + value.toFixed(2);
  return <div>
    <section style={{ ...panel, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
      <div><b style={{ fontSize: 16 }}>لوحة صحة البشرة</b><div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>من {dateLabel(data.startDate)} إلى {dateLabel(data.endDate)}</div></div>
      <div style={{ display: "flex", gap: 6 }} aria-label="الفترة الزمنية">
        {[30,90,180].map(value => <button key={value} type="button" onClick={() => setDays(value)} aria-pressed={days === value} style={{ border: "1px solid " + (days === value ? C.accent : C.line), background: days === value ? C.soft : C.white, color: C.ink, borderRadius: 9, padding: "8px 11px", cursor: "pointer", fontWeight: 700 }}>{value} يوم</button>)}
      </div>
    </section>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 9, marginBottom: 12 }}>
      <Metric label="أيام بها تقييم" value={data.daysWithRating} note={`من أصل ${data.days} يومًا`} />
      <Metric label="أيام بلا تقييم" value={data.daysWithoutRating} note="لا تُحسب كصفر" />
      <Metric label="متوسط التقييم" value={data.averageRating ?? "—"} note="مقياس شخصي؛ لا يحدد وحده اتجاه التحسن" />
      <Metric label="تفاعلات مفتوحة" value={data.openReactionCount} />
      <Metric label="تجارب جارية" value={data.runningTrialCount} note={`ومتوقفة مؤقتًا: ${data.pausedTrialCount}`} />
      <Metric label="صور خلال الفترة" value={data.photoCount} />
    </div>
    <section style={panel}><b>تطور التقييم اليومي</b><p style={{ color: C.muted, fontSize: 11, margin: "5px 0 10px" }}>القيم المسجلة فقط، على مقياس 0–5.</p><RatingTimeline timeline={data.timeline} /></section>
    <section style={panel}><b>متوسط تقييم مناطق الوجه</b><p style={{ color: C.muted, fontSize: 11, margin: "5px 0 12px" }}>كل منطقة تُحسب من القياسات المتاحة لها فقط.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 9 }}>
        {data.areas.map(area => <div key={area.key} style={{ border: "1px solid " + C.line, borderRadius: 10, padding: 11 }}>
          <div style={{ fontSize: 12, fontWeight: 700 }}>{area.label}</div><b style={{ fontSize: 21 }}>{area.average ?? "—"}</b><div style={{ color: C.muted, fontSize: 10 }}>{area.count} قياس مسجل</div>
        </div>)}
      </div>
    </section>
    <section style={panel}><b>العوامل اليومية المصاحبة</b><p style={{ color: C.muted, fontSize: 11, margin: "5px 0 10px" }}>تحليل وصفي للفترة المختارة، وليس دليلًا على علاقة سببية.</p>
      {data.factorAnalysis.correlations.map(item => <div key={item.key} style={{ display: "flex", justifyContent: "space-between", gap: 8, borderBottom: "1px solid " + C.line, padding: "8px 0", fontSize: 12 }}>
        <span>{factorNames[item.key] || item.label}</span><b>{item.status === "computed" ? `r = ${coefficient(item.coefficient)}` : item.status === "no-variation" ? "لا يوجد تباين" : "بيانات غير كافية"} <small style={{ color: C.muted, fontWeight: 400 }}>({item.count} يوم)</small></b>
      </div>)}
      <div style={{ color: C.muted, fontSize: 10, lineHeight: 1.7, marginTop: 8 }}>{data.factorAnalysis.interpretation}</div>
    </section>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 10 }}>
      <section style={panel}><b>التفاعلات خلال الفترة</b><div style={{ fontSize: 24, fontWeight: 800, marginTop: 8 }}>{data.rangeReactionCount}</div><div style={{ color: C.muted, fontSize: 11 }}>منها {data.severeReactionCount} بتصنيف شدة «شديد»</div></section>
      <section style={panel}><b>التجارب ضمن النطاق</b><div style={{ fontSize: 24, fontWeight: 800, marginTop: 8 }}>{data.rangeTrialCount}</div><div style={{ color: C.muted, fontSize: 11 }}>جارية الآن: {data.runningTrialCount}</div></section>
      <section style={panel}><b>سجلات الروتين</b><div style={{ fontSize: 24, fontWeight: 800, marginTop: 8 }}>{data.routineLogCount}</div><div style={{ color: C.muted, fontSize: 11 }}>تم: {data.routineDoneCount} · تخطي: {data.routineSkippedCount}</div><div style={{ color: C.muted, fontSize: 10, marginTop: 4 }}>نسبة «تم» من السجلات المسجلة فقط: {data.routineCompletionAmongLogged === null ? "—" : data.routineCompletionAmongLogged + "%"}</div></section>
    </div>
    <p style={{ color: C.muted, fontSize: 10, lineHeight: 1.8, padding: "0 4px" }}>هذه اللوحة لتنظيم السجلات الشخصية وليست أداة تشخيص أو علاج. التقييم ذاتي، والبيانات المفقودة لا تعني عدم وجود مشكلة. لا تثبت الارتباطات أو التزامن أن عاملًا أو منتجًا تسبب في تغير البشرة.</p>
  </div>;
}
