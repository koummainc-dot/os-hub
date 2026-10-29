import React, { useState, useMemo } from "react";
import { A, S } from "../../core/ui.jsx";
import { C, Btn, Chip, Head, Stat, Empty, Progress, Seg, Board, SearchBar, Tabs, FormModal } from "../../core/kit.jsx";
import { fmt, fmtShort, fmtMinutes, addDays, diffDays, dayName, monthDays, MONTH_NAMES, dow } from "../../core/dates.js";
import { uid } from "../../core/records.jsx";
import { useP, GENERAL_ID } from "./store.jsx";
import * as D from "./domain.js";
import { L, opts } from "./lookups.js";
import { HealthBadge, StatusChip, PriorityChip, Who, DueChip, ProjectName, TaskForm, mOpts, projOpts } from "./parts.jsx";

const Section = ({ title, count, color, children, action }) => (
  <div style={{ ...S.card, marginBottom: 12 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}><span style={{ fontSize: 13, fontWeight: 700, color: color || C.text }}>{title}</span>{count != null && <Chip color={color}>{count}</Chip>}<span style={{ flex: 1 }} />{action}</div>
    {children}
  </div>
);
function TaskLine({ t, showProject = true }) {
  const { openTask, A: act, can, projectsById, today, idx } = useP(); const project = projectsById[t.project_id]; const done = D.cat(t.status) === "done";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: `1px solid ${C.line}` }}>
      <input type="checkbox" aria-label="إكمال" checked={done} disabled={!can("task.write", project)} onChange={(e) => act.setTaskStatus(t, e.target.checked ? "Completed" : "Not Started")} />
      <span onClick={() => openTask(t.id)} style={{ flex: 1, cursor: "pointer", fontSize: 13, textDecoration: done ? "line-through" : "none", color: done ? C.muted : C.text }}>{t.title}{t.blocked && <Chip color={C.bad} style={{ marginInlineStart: 6 }}>⛔</Chip>}</span>
      {showProject && <ProjectName id={t.project_id} />}<PriorityChip p={t.priority === "Medium" ? null : t.priority} /><DueChip date={t.due_date} status={t.status} today={today} />
    </div>
  );
}

// ═════ Dashboard ═════
export function Dashboard() {
  const { data, metrics, idx, today, settings, projectProgress, openProject, setPage, setView, people, nameOf, weekStartStr, alerts } = useP();
  const real = data.projects.filter((p) => !p.is_system && !p.archived_at);
  const running = real.filter((p) => ["Planned", "In Progress", "On Hold"].includes(p.status));
  const rank = { Red: 0, Orange: 1, Yellow: 2, Green: 3, OnHold: 4, Completed: 5, NotEvaluated: 6 };
  const sorted = [...running].sort((a, b) => (rank[metrics[a.id]?.health] ?? 9) - (rank[metrics[b.id]?.health] ?? 9));
  const overdue = idx.list.filter((t) => idx.isLeaf(t.id) && D.isOverdueLeaf(t, idx, today) && real.some((p) => p.id === t.project_id));
  const critical = data.issues.filter((i) => D.isOpenIssue(i) && i.severity === "Critical");
  const highRisks = data.risks.filter((r) => D.isOpenRisk(r) && D.riskScore(r) >= settings.riskHigh);
  const soon = running.filter((p) => p.target_date && diffDays(p.target_date, today) >= 0 && diffDays(p.target_date, today) <= 14).sort((a, b) => a.target_date.localeCompare(b.target_date));
  const objectives = data.objectives.filter((o) => o.status === "Active");
  const inbox = data.discovery.filter((d) => d.status === "Inbox");
  const workload = people.map((m) => ({ m, w: D.memberWorkload(m.id, weekStartStr, { idx }) })).filter((x) => x.w.tasks.length);
  const max = Math.max(1, ...workload.map((x) => x.w.minutes));
  return (
    <div>
      <Head title="لوحة المشاريع" sub={`${running.length} مشروع جارٍ · أسبوع يبدأ ${fmtShort(weekStartStr)}`} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginBottom: 14 }}>
        <Stat label="مشاريع جارية" value={running.length} color={C.info} onClick={() => setPage("projects")} />
        <Stat label="مهام متأخرة" value={overdue.length} color={overdue.length ? C.bad : C.ok} onClick={() => setPage("tasks")} />
        <Stat label="مشاكل حرجة" value={critical.length} color={critical.length ? C.bad : C.ok} onClick={() => { setView((v) => ({ ...v, issueSeverityFilter: "Critical", issueStatusFilter: "open" })); setPage("issues"); }} />
        <Stat label="مخاطر عالية" value={highRisks.length} color={highRisks.length ? C.orange : C.ok} onClick={() => setPage("risks")} />
        <Stat label="صندوق الاكتشاف" value={inbox.length} sub="بانتظار الفرز" color={C.violet} onClick={() => setPage("discovery")} />
      </div>
      <Section title="صحة المشاريع" count={running.length}>
        {!running.length && <Empty icon="📁" title="لا توجد مشاريع جارية" sub="أنشئ مشروعاً من قسم «المشاريع»." />}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {sorted.map((p) => { const m = metrics[p.id]; return (
            <div key={p.id} onClick={() => openProject(p.id)} style={{ display: "grid", gridTemplateColumns: "minmax(140px,1.4fr) 90px minmax(100px,1fr) 80px 90px", gap: 10, alignItems: "center", padding: "9px 4px", borderBottom: `1px solid ${C.line}`, cursor: "pointer" }}>
              <div><div style={{ fontSize: 13, fontWeight: 700 }}>{p.name}</div><div style={{ fontSize: 10.5, color: C.muted }}>{(m.healthReasons || []).map((r) => D.REASON_LABEL[r.code]).join(" · ") || "—"}</div></div>
              <HealthBadge m={m} /><Progress value={m.progress} /><span style={{ fontSize: 11, color: C.dim }}>{m.daysRemaining == null ? "—" : m.daysRemaining < 0 ? `تأخر ${-m.daysRemaining}ي` : `${m.daysRemaining} يوم`}</span><Who id={p.lead_id} size={18} />
            </div>); })}
        </div>
      </Section>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 12 }}>
        <Section title="مواعيد خلال 14 يوماً" count={soon.length} color={C.warn}>
          {!soon.length ? <span style={{ fontSize: 12, color: C.muted }}>لا مواعيد قريبة</span> : soon.map((p) => <div key={p.id} style={{ display: "flex", gap: 8, padding: "5px 0", fontSize: 13 }}><ProjectName id={p.id} /><span style={{ flex: 1 }} /><span style={{ color: C.dim }}>{fmtShort(p.target_date)} ({diffDays(p.target_date, today)}ي)</span><HealthBadge m={metrics[p.id]} compact /></div>)}
        </Section>
        <Section title="مشاكل حرجة مفتوحة" count={critical.length} color={C.bad}>
          {!critical.length ? <span style={{ fontSize: 12, color: C.muted }}>لا شيء 🎉</span> : critical.map((i) => <div key={i.id} style={{ padding: "5px 0", fontSize: 13 }}>🔥 {i.title} <ProjectName id={i.project_id} /> <Who id={i.owner_id} size={16} /></div>)}
        </Section>
        <Section title="مخاطر عالية مفتوحة" count={highRisks.length} color={C.orange}>
          {!highRisks.length ? <span style={{ fontSize: 12, color: C.muted }}>لا شيء</span> : highRisks.map((r) => <div key={r.id} style={{ padding: "5px 0", fontSize: 13 }}>⚠️ {r.title} <Chip color={C.orange}>{D.riskScore(r)}</Chip> <ProjectName id={r.project_id} /></div>)}
        </Section>
        <Section title="الأهداف (OKR) — الإيقاع" count={objectives.length} color={C.violet} action={<Btn small onClick={() => setPage("okrs")}>عرض</Btn>}>
          {!objectives.length ? <span style={{ fontSize: 12, color: C.muted }}>لا أهداف نشطة</span> : objectives.map((o) => { const pr = D.objectiveProgress(o, data.krs, projectProgress); const pc = D.pace(pr, o.period_start, o.period_end, o.status, today, settings); const pm = D.PACE_META[pc]; return <div key={o.id} style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px", gap: 8, padding: "5px 0", alignItems: "center", fontSize: 13 }}><span>{o.name}</span><Progress value={pr} /><Chip color={pm.color}>{pm.label}</Chip></div>; })}
        </Section>
      </div>
      <Section title="حِمل الفريق هذا الأسبوع" count={workload.length}>
        {!workload.length ? <span style={{ fontSize: 12, color: C.muted }}>لا مهام مخطَّطة للأسبوع</span> : workload.map(({ m, w }) => <div key={m.id} style={{ display: "grid", gridTemplateColumns: "130px 1fr 110px", gap: 8, alignItems: "center", padding: "4px 0", fontSize: 12.5 }}><Who id={m.id} size={18} /><span style={{ height: 8, background: "rgba(0,0,0,0.06)", borderRadius: 4, overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: (w.minutes / max) * 100 + "%", background: w.minutes > 2400 ? C.bad : A }} /></span><span style={{ color: C.dim }}>{w.tasks.length} مهمة · {fmtMinutes(w.minutes)}</span></div>)}
      </Section>
    </div>
  );
}

// ═════ Today ═════
export function Today() {
  const { me, data, idx, today, settings, A: act, can, alerts, people, nameOf, openTask, openProject, runningTimer, projectsById, toast, setPage } = useP();
  const feed = D.todayFeed(me, { idx, issues: data.issues, projects: data.projects, contacts: data.contacts, today, settings });
  const [title, setTitle] = useState(""); const [form, setForm] = useState(false);
  const total = feed.overdue.length + feed.dueToday.length + feed.thisWeek.length;
  const dateLabel = `${dayName(today)} ${fmt(today)}`;
  async function quickAdd() {
    if (!title.trim()) return;
    const saved = await act.saveTask({ title: title.trim(), project_id: GENERAL_ID, assignee_id: me, planning_bucket: "This Week", due_date: today }, true);
    if (saved) { setTitle(""); toast("✅ أُضيفت إلى «عام» وإلى هذا الأسبوع"); }
  }
  const lvl = { bad: C.bad, warn: C.warn, info: C.info };
  return (
    <div style={{ maxWidth: 900 }}>
      <Head title="اليوم" sub={`${dateLabel} · ${total ? total + " مهمة تنتظرك" : "لا مهام معلّقة — يوم هادئ 🌿"}`} right={can("task.write", projectsById[GENERAL_ID]) && <Btn kind="primary" onClick={() => setForm(true)}>➕ مهمة</Btn>} />
      {can("task.write", projectsById[GENERAL_ID]) && <div style={{ display: "flex", gap: 8, marginBottom: 12 }}><input style={S.inp} placeholder="أضف مهمة سريعة لهذا الأسبوع… (Enter)" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && quickAdd()} /><Btn kind="primary" onClick={quickAdd}>إضافة</Btn></div>}
      {alerts.length > 0 && <Section title="تنبيهات" count={alerts.length} color={C.warn}>{alerts.map((a) => <div key={a.key} style={{ display: "flex", gap: 8, alignItems: "center", padding: "5px 0", fontSize: 12.5, color: lvl[a.level] || C.dim }}><span>●</span><span style={{ flex: 1 }}>{a.text}</span>{a.project && <Btn small onClick={() => openProject(a.project)}>فتح</Btn>}</div>)}</Section>}
      {feed.overdue.length > 0 && <Section title="متأخرة" count={feed.overdue.length} color={C.bad}>{feed.overdue.map((t) => <TaskLine key={t.id} t={t} />)}</Section>}
      <Section title="مستحقة اليوم" count={feed.dueToday.length} color={C.warn}>{!feed.dueToday.length ? <span style={{ fontSize: 12, color: C.muted }}>لا شيء مستحق اليوم</span> : feed.dueToday.map((t) => <TaskLine key={t.id} t={t} />)}</Section>
      <Section title="هذا الأسبوع" count={feed.thisWeek.length} color={C.info}>{!feed.thisWeek.length ? <span style={{ fontSize: 12, color: C.muted }}>لا مهام مخطَّطة. حرّك مهام من الوارد في «هذا الأسبوع».</span> : feed.thisWeek.map((t) => <TaskLine key={t.id} t={t} />)}</Section>
      {feed.criticalIssues.length > 0 && <Section title="مشاكل حرجة عندك" count={feed.criticalIssues.length} color={C.bad}>{feed.criticalIssues.map((i) => <div key={i.id} style={{ padding: "5px 0", fontSize: 13 }}>🔥 {i.title} <ProjectName id={i.project_id} /></div>)}</Section>}
      {feed.ledSoon.length > 0 && <Section title="مشاريع تقودها يقترب موعدها (7 أيام)" count={feed.ledSoon.length} color={C.warn}>{feed.ledSoon.map((p) => <div key={p.id} style={{ padding: "5px 0", fontSize: 13 }}><ProjectName id={p.id} /> — {fmt(p.target_date)}</div>)}</Section>}
      {feed.followUps.length > 0 && <Section title="متابعات جهات الاتصال" count={feed.followUps.length} color={C.violet} action={<Btn small onClick={() => setPage("contacts")}>عرض</Btn>}>{feed.followUps.map((c) => <div key={c.id} style={{ padding: "5px 0", fontSize: 13 }}>📇 {c.name} — {fmt(c.follow_up_date)}</div>)}</Section>}
      {form && <TaskForm projectId={GENERAL_ID} initial={{ assignee_id: me, planning_bucket: "This Week", due_date: today }} onClose={() => setForm(false)} />}
    </div>
  );
}

// ═════ This Week ═════
export function Week() {
  const { me, data, idx, people, weekStartStr, today, A: act, can, projectsById, openTask, settings, setPage } = useP();
  const [who, setWho] = useState(me);
  const mine = idx.list.filter((t) => idx.isLeaf(t.id) && (who === "all" || t.assignee_id === who) && ["todo", "active"].includes(D.cat(t.status)) && !projectsById[t.project_id]?.archived_at);
  const cols = ["Inbox", "Soon", "This Week", "Icebox"].map((b) => ({ id: b, label: L.bucket[b], color: { Inbox: "#94A3B8", Soon: "#3B82F6", "This Week": "#F59E0B", Icebox: "#64748B" }[b], items: mine.filter((t) => (t.planning_bucket || "Inbox") === b) }));
  const wk = D.memberWorkload(who === "all" ? me : who, weekStartStr, { idx });
  const pio = data.discovery.filter((d) => d.status === "Working On" && (who === "all" || d.owner_id === who));
  const weekEnd = addDays(weekStartStr, 6);
  const wins = data.wins.filter((w) => w.achieved_on >= weekStartStr && w.achieved_on <= weekEnd && (who === "all" || w.member_id === who));
  const doneWeek = idx.list.filter((t) => idx.isLeaf(t.id) && D.cat(t.status) === "done" && t.completed_at && t.completed_at.slice(0, 10) >= weekStartStr && (who === "all" || t.assignee_id === who));
  return (
    <div>
      <Head title="هذا الأسبوع" sub={`${fmtShort(weekStartStr)} → ${fmtShort(weekEnd)} · مخطَّط: ${wk.tasks.length} مهمة (${fmtMinutes(wk.minutes)}) · أُنجز: ${doneWeek.length}`} right={<select style={{ ...S.sel, width: 180 }} value={who} onChange={(e) => setWho(e.target.value)}><option value="all">كل الفريق</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}{p.id === me ? " (أنا)" : ""}</option>)}</select>} />
      <Board columns={cols} onMove={(id, to) => { const t = idx.byId[id]; if (t && can("task.write", projectsById[t.project_id])) act.moveBucket(t, to); }} renderCard={(t) => (
        <div onClick={() => openTask(t.id)} style={{ ...S.card, padding: "8px 10px", cursor: "pointer" }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>{t.title}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}><ProjectName id={t.project_id} /><DueChip date={t.due_date} status={t.status} today={today} />{t.estimated_minutes ? <span style={{ fontSize: 10.5, color: C.muted }}>⏱ {fmtMinutes(t.estimated_minutes)}</span> : null}{who === "all" && <Who id={t.assignee_id} size={16} />}</div>
        </div>)} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12, marginTop: 14 }}>
        <Section title="اكتشافات قيد العمل" count={pio.length} color={C.violet} action={<Btn small onClick={() => setPage("discovery")}>الاكتشاف</Btn>}>{!pio.length ? <span style={{ fontSize: 12, color: C.muted }}>لا شيء قيد العمل</span> : pio.map((d) => <div key={d.id} style={{ padding: "4px 0", fontSize: 13 }}>💡 {d.title} <Who id={d.owner_id} size={16} /></div>)}</Section>
        <Section title="إنجازات الأسبوع" count={wins.length + doneWeek.length} color={C.ok} action={<Btn small onClick={() => setPage("wins")}>الإنجازات</Btn>}>
          {wins.map((w) => <div key={w.id} style={{ padding: "4px 0", fontSize: 13 }}>🏆 {w.title}</div>)}
          {doneWeek.slice(0, 8).map((t) => <div key={t.id} style={{ padding: "3px 0", fontSize: 12, color: C.dim }}>✔ {t.title}</div>)}
          {!wins.length && !doneWeek.length && <span style={{ fontSize: 12, color: C.muted }}>لا شيء بعد هذا الأسبوع</span>}
        </Section>
      </div>
    </div>
  );
}

// ═════ My Tasks ═════
export function Tasks() {
  const { me, data, idx, people, projectsById, today, A: act, can, openTask, setPage } = useP();
  const [mode, setMode] = useState("list"); const [who, setWho] = useState(me); const [q, setQ] = useState(""); const [proj, setProj] = useState(""); const [st, setSt] = useState("open"); const [blocked, setBlocked] = useState(false); const [form, setForm] = useState(false); const [month, setMonth] = useState(today.slice(0, 7));
  const list = idx.list.filter((t) => idx.isLeaf(t.id) && !projectsById[t.project_id]?.archived_at).filter((t) => (who === "all" ? true : who === "none" ? !t.assignee_id : t.assignee_id === who)).filter((t) => !proj || t.project_id === proj).filter((t) => (st === "all" ? true : st === "open" ? ["todo", "active"].includes(D.cat(t.status)) : D.cat(t.status) === st)).filter((t) => !blocked || t.blocked).filter((t) => !q || t.title.toLowerCase().includes(q.toLowerCase()));
  const sorted = [...list].sort((a, b) => (a.due_date || "9999").localeCompare(b.due_date || "9999"));
  const cols = ["Inbox", "Soon", "This Week", "Icebox"].map((b) => ({ id: b, label: L.bucket[b], items: list.filter((t) => (t.planning_bucket || "Inbox") === b) }));
  const card = (t) => <div onClick={() => openTask(t.id)} style={{ ...S.card, padding: "8px 10px", cursor: "pointer" }}><div style={{ fontSize: 12.5, fontWeight: 600 }}>{t.title}</div><div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}><ProjectName id={t.project_id} /><DueChip date={t.due_date} status={t.status} today={today} /></div></div>;
  const [y, m] = month.split("-").map(Number); const first = `${month}-01`; const lead = dow(first); const days = monthDays(y, m);
  return (
    <div>
      <Head title="المهام" sub={`${list.length} مهمة ورقية`} right={<><Seg value={mode} onChange={setMode} options={[{ v: "list", l: "قائمة" }, { v: "board", l: "لوحة" }, { v: "calendar", l: "تقويم" }]} />{data.projects.some((p) => can("task.write", p)) && <Btn kind="primary" onClick={() => setForm(true)}>➕ مهمة</Btn>}</>} />
      <SearchBar value={q} onChange={setQ} placeholder="بحث في المهام…">
        <select style={{ ...S.sel, width: 150 }} value={who} onChange={(e) => setWho(e.target.value)}><option value="all">الكل</option><option value="none">غير مسندة</option>{people.map((p) => <option key={p.id} value={p.id}>{p.id === me ? "مهامي" : p.name}</option>)}</select>
        <select style={{ ...S.sel, width: 150 }} value={proj} onChange={(e) => setProj(e.target.value)}><option value="">كل المشاريع</option>{projOpts(data.projects).map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select>
        <select style={{ ...S.sel, width: 120 }} value={st} onChange={(e) => setSt(e.target.value)}><option value="open">مفتوحة</option><option value="done">مكتملة</option><option value="cancelled">ملغاة</option><option value="all">الكل</option></select>
        <label style={{ fontSize: 12, display: "flex", gap: 5, alignItems: "center" }}><input type="checkbox" checked={blocked} onChange={(e) => setBlocked(e.target.checked)} />المتعطّلة فقط</label>
      </SearchBar>
      {mode === "list" && (!sorted.length ? <Empty icon="✅" title="لا مهام مطابقة" /> : <div style={{ ...S.card, padding: "6px 14px" }}>{sorted.map((t) => <TaskLine key={t.id} t={t} />)}</div>)}
      {mode === "board" && <Board columns={cols} onMove={(id, to) => { const t = idx.byId[id]; if (t && can("task.write", projectsById[t.project_id])) act.moveBucket(t, to); }} renderCard={card} />}
      {mode === "calendar" && (
        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}><Btn small onClick={() => { const d = new Date(Date.UTC(y, m - 2, 1)); setMonth(d.toISOString().slice(0, 7)); }}>→</Btn><b>{MONTH_NAMES[m - 1]} {y}</b><Btn small onClick={() => { const d = new Date(Date.UTC(y, m, 1)); setMonth(d.toISOString().slice(0, 7)); }}>←</Btn></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
            {["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"].map((d) => <div key={d} style={{ fontSize: 10.5, color: C.muted, textAlign: "center" }}>{d}</div>)}
            {Array.from({ length: lead }).map((_, i) => <div key={"e" + i} />)}
            {Array.from({ length: days }).map((_, i) => { const ds = `${month}-${String(i + 1).padStart(2, "0")}`; const ts = list.filter((t) => t.due_date === ds); return <div key={ds} style={{ minHeight: 64, border: `1px solid ${ds === today ? A : C.line}`, borderRadius: 6, padding: 3, background: ds === today ? "rgba(239,159,39,0.07)" : "transparent" }}><div style={{ fontSize: 10.5, color: C.muted }}>{i + 1}</div>{ts.slice(0, 3).map((t) => <div key={t.id} onClick={() => openTask(t.id)} style={{ fontSize: 10, background: "rgba(59,130,246,0.12)", borderRadius: 4, padding: "1px 4px", marginTop: 2, cursor: "pointer", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</div>)}{ts.length > 3 && <div style={{ fontSize: 9.5, color: C.muted }}>+{ts.length - 3}</div>}</div>; })}
          </div>
        </div>
      )}
      {form && <TaskForm initial={{ assignee_id: who !== "all" && who !== "none" ? who : me, project_id: proj || GENERAL_ID }} projectId={proj || GENERAL_ID} onClose={() => setForm(false)} />}
    </div>
  );
}
