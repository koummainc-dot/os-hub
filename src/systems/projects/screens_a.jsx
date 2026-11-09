import React, { useState, useMemo, useEffect } from "react";
import { A, S } from "../../core/ui.jsx";
import { C, Btn, Chip, Head, Stat, Empty, Progress, Seg, Board, SearchBar, Tabs, FormModal } from "../../core/kit.jsx";
import { fmt, fmtShort, fmtMinutes, addDays, diffDays, dayName, monthDays, MONTH_NAMES, dow } from "../../core/dates.js";
import { uid } from "../../core/records.jsx";
import { useP, GENERAL_ID } from "./store.jsx";
import * as D from "./domain.js";
import { readOSEvents, subscribeOSEvents, subscribeToStoredOSEvents } from "../integrationEvents.js";
import { listKnowledgeMeetings } from "../knowledge/repository.js";
import { L, opts, SEV_COLOR } from "./lookups.js";
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
  const { ws, me, data, idx, today, settings, A: act, can, alerts, people, nameOf, openTask, openProject, runningTimer, projectsById, toast, setPage } = useP();
  const feed = D.todayFeed(me, { idx, issues: data.issues, projects: data.projects, contacts: data.contacts, today, settings });
  const [homeCompletions, setHomeCompletions] = useState([]);
  const [todayMeetings, setTodayMeetings] = useState([]);
  const [meetingsState, setMeetingsState] = useState("loading");
  useEffect(() => {
    let alive = true;
    if (!ws?.id) {
      setTodayMeetings([]);
      setMeetingsState("empty");
      return () => { alive = false; };
    }
    setMeetingsState("loading");
    listKnowledgeMeetings(ws.id).then(result => {
      if (!alive) return;
      if (!result?.ok) {
        setTodayMeetings([]);
        setMeetingsState("error");
        return;
      }
      const rows = (result.meetings || [])
        .filter(meeting => !meeting.archived && !meeting.deleted_at && meeting.status !== "archived")
        .filter(meeting => String(meeting.date || "").slice(0, 10) === String(today).slice(0, 10))
        .sort((a, b) => String(a.startTime || a.start_time || a.time || "").localeCompare(String(b.startTime || b.start_time || b.time || "")));
      setTodayMeetings(rows);
      setMeetingsState(rows.length ? "ready" : "empty");
    }).catch(() => {
      if (alive) {
        setTodayMeetings([]);
        setMeetingsState("error");
      }
    });
    return () => { alive = false; };
  }, [ws?.id, today]);
  useEffect(() => {
    if (!ws?.id) { setHomeCompletions([]); return; }
    const options = { workspaceId: ws.id, source: "home", types: ["home.task.completed"], limit: 30 };
    const sync = events => setHomeCompletions(events.filter(e => e.payload?.outcome === "done").slice(-30).reverse());
    sync(readOSEvents(options));
    const offEvent = subscribeOSEvents(() => sync(readOSEvents(options)), options);
    const offStorage = subscribeToStoredOSEvents(sync, options);
    return () => { offEvent(); offStorage(); };
  }, [ws?.id]);
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
      <Section title="اجتماعات اليوم" count={todayMeetings.length} color={C.violet} action={<Btn small onClick={() => setPage("meetings")}>كل الاجتماعات</Btn>}>{meetingsState === "loading" ? <span style={{ fontSize: 12, color: C.muted }}>جارٍ تحميل الاجتماعات…</span> : meetingsState === "error" ? <span style={{ fontSize: 12, color: C.muted }}>تعذر تحميل اجتماعات المعرفة الآن. يمكنك إعادة المحاولة بفتح قسم الاجتماعات.</span> : !todayMeetings.length ? <span style={{ fontSize: 12, color: C.muted }}>لا توجد اجتماعات مسجلة لهذا اليوم.</span> : todayMeetings.map(meeting => <div key={meeting.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${C.line}` }}><span>🗓️</span><span style={{ flex: 1, fontSize: 12.5, minWidth: 0 }}>{meeting.title}</span><span style={{ color: C.muted, fontSize: 11, whiteSpace: "nowrap" }}>{meeting.startTime || meeting.start_time || meeting.time || "طوال اليوم"}</span><Btn small onClick={() => setPage("meetings")}>فتح</Btn></div>)}</Section>}\n      {homeCompletions.length > 0 && <Section title="إنجازات المنزل" count={homeCompletions.length} color={C.ok}>{homeCompletions.slice(0, 8).map(event => <div key={event.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "5px 0", fontSize: 12.5 }}><span>🏠 {event.payload?.taskTitle || "مهمة منزلية"}</span><span style={{ color: C.muted, whiteSpace: "nowrap" }}>{fmt(event.occurredAt?.slice(0, 10) || today)}</span></div>)}</Section>}
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
  const { me, data, idx, people, projectsById, today, A: act, R, can, openTask, setPage } = useP();
  const [mode, setMode] = useState("list"); const [who, setWho] = useState("all"); const [q, setQ] = useState(""); const [proj, setProj] = useState(""); const [st, setSt] = useState("open"); const [blocked, setBlocked] = useState(false); const [form, setForm] = useState(false); const [quickAdd, setQuickAdd] = useState(false); const [month, setMonth] = useState(today.slice(0, 7)); const [selected, setSelected] = useState(() => new Set()); const [inlineId, setInlineId] = useState(null);
  const list = idx.list.filter((t) => idx.isLeaf(t.id) && !projectsById[t.project_id]?.archived_at).filter((t) => (who === "all" ? true : who === "none" ? !t.assignee_id : t.assignee_id === who)).filter((t) => !proj || t.project_id === proj).filter((t) => (st === "all" ? true : st === "open" ? ["todo", "active"].includes(D.cat(t.status)) : D.cat(t.status) === st)).filter((t) => !blocked || t.blocked).filter((t) => !q || t.title.toLowerCase().includes(q.toLowerCase()));
  const sorted = [...list].sort((a, b) => (a.due_date || "9999").localeCompare(b.due_date || "9999"));
  const selectedVisible = sorted.filter((t) => selected.has(t.id));
  const toggleSelected = (id) => setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const clearSelection = () => setSelected(new Set());
  const bulkStatus = async (status) => { const items = selectedVisible.filter((t) => can("task.write", projectsById[t.project_id])); if (!items.length) return; if (!window.confirm(`تحديث ${items.length} مهمة إلى «${L.taskStatus[status] || status}»؟`)) return; try { await R.putAtomic(items.map((t) => ({ coll: "tasks", rec: { ...t, status, completed_at: status === "Completed" ? new Date().toISOString() : null, completed_by: status === "Completed" ? me : null } }))); clearSelection(); } catch (e) { alert(e?.message || "تعذّر تنفيذ العملية الجماعية"); } };
  const cols = ["Inbox", "Soon", "This Week", "Icebox"].map((b) => ({ id: b, label: L.bucket[b], items: list.filter((t) => (t.planning_bucket || "Inbox") === b) }));
  const card = (t) => <div onClick={() => openTask(t.id)} style={{ ...S.card, padding: "8px 10px", cursor: "pointer" }}><div style={{ fontSize: 12.5, fontWeight: 600 }}>{t.title}</div><div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}><ProjectName id={t.project_id} /><DueChip date={t.due_date} status={t.status} today={today} /></div></div>;
  const [y, m] = month.split("-").map(Number); const first = `${month}-01`; const lead = dow(first); const days = monthDays(y, m);
  return (
    <div>
      <Head title="المهام" sub={`${list.length} مهمة ورقية`} right={<><Seg value={mode} onChange={setMode} options={[{ v: "list", l: "قائمة" }, { v: "board", l: "لوحة" }, { v: "table", l: "جدول" }, { v: "calendar", l: "تقويم" }, { v: "timeline", l: "خط زمني" }]} />{data.projects.some((p) => can("task.write", p)) && <><Btn onClick={() => setQuickAdd(true)}>⚡ إضافة سريعة</Btn><Btn kind="primary" onClick={() => setForm(true)}>➕ مهمة</Btn></>}</>} />
      <SearchBar value={q} onChange={setQ} placeholder="بحث في المهام…">
        <select style={{ ...S.sel, width: 150 }} value={who} onChange={(e) => setWho(e.target.value)}><option value="all">الكل</option><option value="none">غير مسندة</option>{people.map((p) => <option key={p.id} value={p.id}>{p.id === me ? "مهامي" : p.name}</option>)}</select>
        <select style={{ ...S.sel, width: 150 }} value={proj} onChange={(e) => setProj(e.target.value)}><option value="">كل المشاريع</option>{projOpts(data.projects).map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select>
        <select style={{ ...S.sel, width: 120 }} value={st} onChange={(e) => setSt(e.target.value)}><option value="open">مفتوحة</option><option value="done">مكتملة</option><option value="cancelled">ملغاة</option><option value="all">الكل</option></select>
        <label style={{ fontSize: 12, display: "flex", gap: 5, alignItems: "center" }}><input type="checkbox" checked={blocked} onChange={(e) => setBlocked(e.target.checked)} />المتعطّلة فقط</label>
        {(q || who !== me || proj || st !== "open" || blocked) && <Btn small onClick={() => { setQ(""); setWho(me); setProj(""); setSt("open"); setBlocked(false); }}>مسح الفلاتر</Btn>}
      </SearchBar>
      {selectedVisible.length > 0 && <div style={{ ...S.card, padding: "8px 10px", marginBottom: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", position: "sticky", top: 4, zIndex: 5 }}>
        <b style={{ fontSize: 12 }}>تم تحديد {selectedVisible.length}</b>
        <Btn small onClick={() => bulkStatus("Completed")}>✔ إكمال</Btn>
        <Btn small onClick={() => bulkStatus("In Progress")}>▶ بدء</Btn>
        <Btn small onClick={() => bulkStatus("On Hold")}>⏸ تعليق</Btn>
        <Btn small onClick={clearSelection}>إلغاء التحديد</Btn>
      </div>}
      {mode === "list" && (!sorted.length ? <Empty icon="🔎" title="لا توجد مهام مطابقة" sub="جرّب تغيير البحث أو الفلاتر؛ يمكنك مسحها لإظهار القائمة كاملة." /> : <div style={{ ...S.card, padding: "6px 14px" }}>{sorted.map((t) => <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" aria-label={"تحديد " + t.title} checked={selected.has(t.id)} onChange={() => toggleSelected(t.id)} /><div style={{ flex: 1 }}><TaskLine t={t} /></div></div>)}</div>)}
      {mode === "table" && (!sorted.length ? <Empty icon="🔎" title="لا توجد مهام مطابقة" /> : <div style={{ ...S.card, padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", minWidth: 900, borderCollapse: "collapse", fontSize: 12 }}>
          <thead><tr style={{ background: "rgba(0,0,0,0.03)" }}>
            <th style={{ padding: 8, width: 36 }}><input type="checkbox" aria-label="تحديد الكل" checked={sorted.length > 0 && selectedVisible.length === sorted.length} onChange={() => setSelected(selectedVisible.length === sorted.length ? new Set() : new Set(sorted.map((t) => t.id)))} /></th>
            {["المهمة","المشروع","الحالة","الأولوية","الموعد","المسؤول","التخصيص"].map((h) => <th key={h} style={{ padding: "8px 10px", textAlign: "right", color: C.muted, fontSize: 10.5 }}>{h}</th>)}
            <th style={{ padding: 8 }} />
          </tr></thead>
          <tbody>{sorted.map((t) => {
            const editing = inlineId === t.id; const project = projectsById[t.project_id];
            return <tr key={t.id} style={{ borderTop: "1px solid " + C.line }}>
              <td style={{ padding: 8 }}><input type="checkbox" aria-label={"تحديد " + t.title} checked={selected.has(t.id)} onChange={() => toggleSelected(t.id)} /></td>
              <td style={{ padding: "7px 10px", minWidth: 240 }}>{editing ? <input autoFocus style={S.inp} defaultValue={t.title} onBlur={async (e) => { const v=e.target.value.trim(); if(v && v!==t.title) await act.put("tasks",{...t,title:v}); setInlineId(null); }} onKeyDown={(e)=>{ if(e.key==="Enter") e.currentTarget.blur(); if(e.key==="Escape") setInlineId(null); }} /> : <span onDoubleClick={() => can("task.write", project) && setInlineId(t.id)} onClick={() => openTask(t.id)} style={{ cursor: "pointer", fontWeight: 600 }}>{t.title}</span>}</td>
              <td style={{ padding: "7px 10px" }}><ProjectName id={t.project_id} /></td>
              <td style={{ padding: "7px 10px" }}>{can("task.write", project) ? <select style={{ ...S.sel, width: 125 }} value={t.status} onChange={(e)=>act.setTaskStatus(t,e.target.value)}><option value="Not Started">لم تبدأ</option><option value="In Progress">قيد التنفيذ</option><option value="On Hold">متوقفة</option><option value="Completed">مكتملة</option><option value="Cancelled">ملغاة</option></select> : <StatusChip s={t.status} map={L.taskStatus} />}</td>
              <td style={{ padding: "7px 10px" }}>{can("task.write", project) ? <select style={{ ...S.sel, width: 100 }} value={t.priority || "Medium"} onChange={(e)=>act.put("tasks",{...t,priority:e.target.value})}><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select> : <PriorityChip p={t.priority} />}</td>
              <td style={{ padding: "7px 10px" }}>{can("task.write", project) ? <input type="date" style={{ ...S.inp, width: 135 }} value={t.due_date || ""} onChange={(e)=>act.put("tasks",{...t,due_date:e.target.value||null})} /> : <DueChip date={t.due_date} status={t.status} today={today} />}</td>
              <td style={{ padding: "7px 10px" }}>{t.assignee_id ? <Who id={t.assignee_id} size={17} /> : "—"}</td>
              <td style={{ padding: "7px 10px", color: C.dim, fontSize: 11 }}>{t.custom_fields?.label || "—"}</td>
              <td style={{ padding: 8 }}><Btn small onClick={() => setInlineId(editing ? null : t.id)}>{editing ? "تم" : "✎"}</Btn></td>
            </tr>;
          })}</tbody>
        </table>
      </div>)}
      {mode === "board" && <Board columns={cols} onMove={(id, to) => { const t = idx.byId[id]; if (t && can("task.write", projectsById[t.project_id])) act.moveBucket(t, to); }} renderCard={card} />}
      {mode === "timeline" && (
        <div style={S.card}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div><b style={{fontSize:13}}>الخط الزمني للمهام</b><div style={{fontSize:10.5,color:C.muted}}>ترتيب زمني حسب تاريخ البدء/الاستحقاق، مع إبراز حالة كل مهمة.</div></div>
            <span style={{fontSize:10.5,color:C.muted}}>{sorted.filter(t=>t.due_date||t.start_date).length} مهمة مؤرخة</span>
          </div>
          {!sorted.some(t=>t.due_date||t.start_date) ? <Empty icon="🗓️" title="لا توجد مهام مؤرخة" sub="أضف موعدًا أو تاريخ بدء من جدول المهام لظهورها هنا." /> :
          <div style={{overflowX:"auto"}}>
            {sorted.filter(t=>t.due_date||t.start_date).map((t)=>{
              const start=t.start_date||t.due_date, end=t.due_date||t.start_date;
              const duration=Math.max(1,Math.round((new Date(end+"T00:00:00")-new Date(start+"T00:00:00"))/86400000)+1);
              return <div key={t.id} style={{display:"grid",gridTemplateColumns:"minmax(220px,32%) minmax(420px,1fr)",gap:12,alignItems:"center",padding:"8px 0",borderTop:"1px solid "+C.line}}>
                <div onClick={()=>openTask(t.id)} style={{cursor:"pointer",minWidth:0}}>
                  <div style={{fontSize:12.5,fontWeight:650,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t.title}</div>
                  <div style={{display:"flex",gap:6,alignItems:"center",marginTop:3}}><ProjectName id={t.project_id}/><DueChip date={t.due_date} status={t.status} today={today}/></div>
                </div>
                <div style={{position:"relative",height:34,minWidth:420,background:"linear-gradient(to right, transparent 0, transparent 49.8%, rgba(0,0,0,.04) 50%, transparent 50.2%)",borderRadius:8}}>
                  <div title={start+" → "+end} style={{position:"absolute",insetInlineStart:Math.min(86,Math.max(0,(duration-1)*7))+"%",top:7,width:Math.min(70,Math.max(14,duration*7))+"%",height:20,borderRadius:6,background:t.status==="Completed"?"rgba(34,197,94,.22)":t.status==="On Hold"?"rgba(245,158,11,.22)":"rgba(59,130,246,.20)",border:"1px solid rgba(59,130,246,.28)",cursor:"pointer"}} onClick={()=>openTask(t.id)}/>
                  <div style={{position:"absolute",top:25,fontSize:9.5,color:C.muted,whiteSpace:"nowrap"}}>{start}{end!==start?" → "+end:""}</div>
                </div>
              </div>;
            })}
          </div>}
        </div>
      )}
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
      {quickAdd && <FormModal title="⚡ إضافة مهمة سريعة" initial={{ project_id: "", title: "", priority: "Medium", status: "Not Started", planning_bucket: "Inbox", assignee_id: who !== "all" && who !== "none" ? who : me }} onClose={() => setQuickAdd(false)} fields={[
        { key: "project_id", label: "المشروع", type: "select", required: true, allowEmpty: false, options: projOpts(data.projects) },
        { key: "title", label: "عنوان المهمة", required: true, span: 2 },
        { key: "priority", label: "الأولوية", type: "select", options: opts(L.priority), allowEmpty: false },
        { key: "due_date", label: "الموعد", type: "date" },
        { key: "assignee_id", label: "المسؤول", type: "select", options: mOpts(people), emptyLabel: "— غير مسند —" },
        { key: "planning_bucket", label: "التخطيط", type: "select", options: opts(L.bucket), allowEmpty: false }
      ]} onSubmit={async (v) => { if (!v.project_id) throw new Error("اختر المشروع أولاً"); const saved = await act.saveTask(v, true); if (!saved) return false; setQuickAdd(false); }} />}
      {form && <TaskForm initial={{ assignee_id: who !== "all" && who !== "none" ? who : me, project_id: proj || "" }} projectId={proj || undefined} onClose={() => setForm(false)} />}
    </div>
  );
}


// ═════ Portfolio ═════
// Cross-project portfolio view; derived only from existing workspace records.
export function Portfolio() {
  const { data, metrics, idx, today, settings, projectProgress, openProject, setPage, setView, projectsById } = useP();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("active");
  const [tab, setTab] = useState("overview");
  const projects = data.projects.filter((p) => !p.is_system && !p.deleted_at);
  const openProjects = projects.filter((p) => !p.archived_at && !["Completed", "Cancelled"].includes(p.status));
  const completed = projects.filter((p) => p.status === "Completed" && !p.archived_at);
  const delayed = openProjects.filter((p) => metrics[p.id]?.daysRemaining < 0);
  const criticalIssues = data.issues.filter((i) => D.isOpenIssue(i) && i.severity === "Critical");
  const highRisks = data.risks.filter((r) => D.isOpenRisk(r) && D.riskScore(r) >= settings.riskHigh);
  const objectives = data.objectives.filter((o) => o.status === "Active" && !o.deleted_at);
  const visible = projects
    .filter((p) => status === "all" || (status === "active" ? openProjects.includes(p) : status === "completed" ? completed.includes(p) : !!p.archived_at))
    .filter((p) => !query || [p.name, p.description, p.final_goal].some((v) => String(v || "").toLocaleLowerCase().includes(query.toLocaleLowerCase())))
    .sort((a, b) => {
      const rank = { Red: 0, Orange: 1, Yellow: 2, Green: 3, OnHold: 4, NotEvaluated: 5 };
      return (rank[metrics[a.id]?.health] ?? 9) - (rank[metrics[b.id]?.health] ?? 9) || String(a.target_date || "9999").localeCompare(String(b.target_date || "9999"));
    });
  const taskCount = idx.list.filter((t) => idx.isLeaf(t.id) && openProjects.some((p) => p.id === t.project_id) && ["todo", "active"].includes(D.cat(t.status))).length;
  const leafTasks = idx.list.filter((task) => idx.isLeaf(task.id));
  const outputs = data.outputs.filter((output) => !output.deleted_at && !output.archived_at && !!projectsById[output.project_id]);
  const prds = data.prds.filter((prd) => !prd.deleted_at && !!projectsById[prd.project_id]);
  const risks = data.risks.filter((risk) => D.isOpenRisk(risk) && !!projectsById[risk.project_id]).sort((a,b) => D.riskScore(b)-D.riskScore(a));
  const issues = data.issues.filter((issue) => D.isOpenIssue(issue) && !!projectsById[issue.project_id]).sort((a,b) => ["Critical","High","Medium","Low"].indexOf(a.severity)-["Critical","High","Medium","Low"].indexOf(b.severity));
  const openRisk = (risk) => { setView((v) => ({ ...v, focusRecord: { kind: "risk", id: risk.id } })); setPage("risks"); };
  const openIssue = (issue) => { setView((v) => ({ ...v, focusRecord: { kind: "issue", id: issue.id }, issueStatusFilter: "all" })); setPage("issues"); };
  return (
    <div>
      <Head title="محفظة المشاريع" sub="لوحة متابعة موحّدة للمشاريع والأهداف والحوكمة والتسليم عبر مساحة العمل." />
      <Tabs value={tab} onChange={setTab} tabs={[
        { id: "overview", label: "نظرة عامة" }, { id: "goals", label: "الأهداف", count: objectives.length },
        { id: "governance", label: "المخاطر والمشاكل", count: risks.length + issues.length },
        { id: "outputs", label: "المخرجات", count: outputs.length }, { id: "specs", label: "المواصفات", count: prds.length }
      ]} />
      {tab === "overview" && <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 10, margin: "12px 0" }}>
          <Stat label="مشاريع نشطة" value={openProjects.length} color={C.info} onClick={() => setStatus("active")} />
          <Stat label="مشاريع مكتملة" value={completed.length} color={C.ok} onClick={() => setStatus("completed")} />
          <Stat label="مشاريع متأخرة" value={delayed.length} color={delayed.length ? C.bad : C.ok} onClick={() => setStatus("active")} />
          <Stat label="مهام مفتوحة" value={taskCount} color={C.violet} onClick={() => setPage("tasks")} />
          <Stat label="مشاكل حرجة" value={criticalIssues.length} color={criticalIssues.length ? C.bad : C.ok} onClick={() => setTab("governance")} />
          <Stat label="مخاطر عالية" value={highRisks.length} color={highRisks.length ? C.orange : C.ok} onClick={() => setTab("governance")} />
        </div>
        <div style={{ ...S.card, marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input aria-label="بحث في المشاريع" style={{ ...S.inp, flex: "1 1 220px" }} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث باسم المشروع أو وصفه أو هدفه…" />
            <select aria-label="تصفية المشاريع" style={{ ...S.sel, minWidth: 150 }} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="active">النشطة</option><option value="completed">المكتملة</option><option value="archived">المؤرشفة</option><option value="all">كل المشاريع</option>
            </select>
            <span style={{ color: C.muted, fontSize: 11 }}>{visible.length} مشروع</span>
          </div>
        </div>
        {!visible.length ? <Empty icon="🗂️" title="لا توجد مشاريع مطابقة" sub="غيّر الفلتر أو عبارة البحث لعرض مشاريع أخرى." /> :
          <div style={{ ...S.card, padding: 0, overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 890, borderCollapse: "collapse", fontSize: 12 }}>
              <thead><tr style={{ background: "rgba(0,0,0,.03)" }}>{["المشروع","الحالة والصحة","التقدم","القائد","الموعد المستهدف","المهام المفتوحة","متأخرة","المخاطر / المشاكل"].map((label) => <th key={label} style={{ padding: "10px 9px", color: C.muted, fontSize: 10.5, fontWeight: 700, textAlign: "start" }}>{label}</th>)}</tr></thead>
              <tbody>{visible.map((project) => {
                const metric = metrics[project.id] || {};
                const tasks = leafTasks.filter((task) => task.project_id === project.id);
                const open = tasks.filter((task) => ["todo", "active"].includes(D.cat(task.status))).length;
                const overdue = tasks.filter((t) => D.isOverdueLeaf(t, idx, today)).length;
                const riskCount = risks.filter((risk) => risk.project_id === project.id).length;
                const issueCount = issues.filter((issue) => issue.project_id === project.id).length;
                return <tr key={project.id} style={{ borderTop: "1px solid " + C.line }}>
                  <td style={{ padding: "10px 9px" }}><button type="button" onClick={() => openProject(project.id)} style={{ border: 0, padding: 0, background: "none", color: C.info, fontWeight: 700, cursor: "pointer", font: "inherit", textAlign: "start" }}>{project.name} ↗</button><div style={{ fontSize: 10.5, color: C.muted }}>{project.type || "مشروع"}</div></td>
                  <td style={{ padding: "10px 9px" }}><StatusChip s={project.status} /><div style={{ marginTop: 5 }}><HealthBadge m={metric} compact /></div></td>
                  <td style={{ padding: "10px 9px", minWidth: 115 }}><div style={{ display: "flex", gap: 6, alignItems: "center" }}><span style={{ flex: 1 }}><Progress value={metric.progress == null ? null : metric.progress} height={6} /></span><b>{Math.round(metric.progress || 0)}%</b></div></td>
                  <td style={{ padding: "10px 9px" }}><Who id={project.lead_id} size={18} /></td>
                  <td style={{ padding: "10px 9px", whiteSpace: "nowrap" }}>{project.target_date ? fmtShort(project.target_date) : "غير محدد"}</td>
                  <td style={{ padding: "10px 9px" }}>{open}</td><td style={{ padding: "10px 9px", color: overdue ? C.bad : C.text }}>{overdue}</td><td style={{ padding: "10px 9px" }}>{riskCount} / {issueCount}</td>
                </tr>;
              })}</tbody>
            </table>
          </div>}
      </>}
      {tab === "goals" && <div style={{ display: "grid", gap: 9, marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}><Btn small onClick={() => setPage("okrs")}>إدارة الأهداف والنتائج الرئيسية</Btn></div>
        {!objectives.length ? <Empty icon="🎯" title="لا توجد أهداف نشطة" sub="أضف أهدافًا واربط نتائجها الرئيسية بالمشاريع لتظهر مساهمة كل مشروع هنا." /> : objectives.map((objective) => {
          const krs = data.krs.filter((kr) => kr.objective_id === objective.id && !kr.deleted_at && !kr.archived_at);
          const projectIds = [...new Set(krs.flatMap((kr) => kr.project_ids || []))];
          const progress = D.objectiveProgress(objective, data.krs, projectProgress);
          const pace = D.PACE_META[D.pace(progress, objective.period_start, objective.period_end, objective.status, today, settings)];
          return <div key={objective.id} style={{ ...S.card, padding: 12 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><b style={{ flex: 1 }}>{objective.name}</b><Chip color={pace?.color}>{pace?.label || "—"}</Chip><b>{Math.round(progress || 0)}%</b></div>
            <Progress value={progress} height={7} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8, alignItems: "center" }}><span style={{ color: C.muted, fontSize: 10.5 }}>المشاريع:</span>{projectIds.length ? projectIds.map((id) => projectsById[id]).filter(Boolean).map((project) => <Btn key={project.id} small onClick={() => openProject(project.id, "okr")}>{project.name}</Btn>) : <span style={{ color: C.muted, fontSize: 11 }}>لا مشاريع مرتبطة بنتائجها الرئيسية</span>}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>{krs.map((kr) => <span key={kr.id} style={{ fontSize: 11, color: C.dim }}>• {kr.name} · {D.krProgressValue(kr, projectProgress) == null ? "غير قابل للقياس" : Math.round(D.krProgressValue(kr, projectProgress)) + "%"}</span>)}</div>
          </div>;
        })}
      </div>}
      {tab === "governance" && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 10, marginTop: 12 }}>
        <section style={S.card}><div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}><b style={{ flex: 1 }}>المخاطر المفتوحة</b><Chip>{risks.length}</Chip><Btn small onClick={() => setPage("risks")}>كل المخاطر</Btn></div>{!risks.length ? <Empty icon="⚠️" title="لا مخاطر مفتوحة" /> : risks.slice(0, 12).map((risk) => <div key={risk.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "7px 0", borderTop: "1px solid " + C.line }}><b style={{ minWidth: 0, flex: 1, fontSize: 11.5 }}>{risk.title}</b><Chip color={D.riskLevel(risk, settings) === "High" ? C.bad : D.riskLevel(risk, settings) === "Medium" ? C.warn : C.ok}>{risk.probability}×{risk.impact}</Chip><Btn small onClick={() => openRisk(risk)}>فتح</Btn></div>)}</section>
        <section style={S.card}><div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}><b style={{ flex: 1 }}>المشاكل المفتوحة</b><Chip>{issues.length}</Chip><Btn small onClick={() => setPage("issues")}>كل المشاكل</Btn></div>{!issues.length ? <Empty icon="⚠️" title="لا مشاكل مفتوحة" /> : issues.slice(0, 12).map((issue) => <div key={issue.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "7px 0", borderTop: "1px solid " + C.line }}><b style={{ minWidth: 0, flex: 1, fontSize: 11.5 }}>{issue.title}</b><Chip color={SEV_COLOR[issue.severity]}>{L.severity[issue.severity]}</Chip><Btn small onClick={() => openIssue(issue)}>فتح</Btn></div>)}</section>
      </div>}
      {tab === "outputs" && <div style={{ ...S.card, marginTop: 12, padding: 0, overflowX: "auto" }}>
        {!outputs.length ? <Empty icon="📦" title="لا توجد مخرجات" sub="عندما تُربط المخرجات بالمشاريع والمهام ستظهر في هذه المحفظة." /> : <table style={{ width: "100%", minWidth: 650, borderCollapse: "collapse", fontSize: 12 }}><thead><tr>{["المخرج","المشروع","النوع","الاعتماد","المصدر"].map((heading) => <th key={heading} style={{ padding: 9, textAlign: "start", color: C.muted, fontSize: 10.5 }}>{heading}</th>)}</tr></thead><tbody>{outputs.map((output) => <tr key={output.id} style={{ borderTop: "1px solid " + C.line }}><td style={{ padding: 9, fontWeight: 700 }}>{output.name}</td><td style={{ padding: 9 }}><Btn small onClick={() => openProject(output.project_id, "outputs", { kind: "output", id: output.id })}>{projectsById[output.project_id]?.name || "المشروع"}</Btn></td><td style={{ padding: 9 }}>{output.type || "—"}</td><td style={{ padding: 9 }}><Chip color={output.approval === "Final" ? C.ok : output.approval === "Review" ? C.warn : C.muted}>{output.approval || "Draft"}</Chip></td><td style={{ padding: 9 }}>{output.task_id && idx.byId[output.task_id] ? <Btn small onClick={() => openProject(output.project_id, "tasks")}>{idx.byId[output.task_id].title}</Btn> : "—"}</td></tr>)}</tbody></table>}
      </div>}
      {tab === "specs" && <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
        {!prds.length ? <Empty icon="📝" title="لا مواصفات" /> : prds.map((prd) => {
          const tasks = leafTasks.filter((task) => task.prd_id === prd.id);
          const requirements = (prd.requirements || []).filter((req) => req.status !== "Deprecated");
          const covered = requirements.filter((req) => tasks.some((task) => task.prd_requirement_id === req.id)).length;
          return <div key={prd.id} style={{ ...S.card, padding: 11 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><b style={{ flex: 1, minWidth: 140 }}>{prd.title}</b><Chip color={prd.status === "Approved" ? C.ok : prd.status === "Ready for Review" ? C.warn : C.info}>{L.prdStatus[prd.status] || prd.status}</Chip><Btn small onClick={() => openProject(prd.project_id, "prds", { kind: "prd", id: prd.id })}>{projectsById[prd.project_id]?.name || "فتح المشروع"}</Btn></div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 5 }}>v{prd.version || 1} · {tasks.length} مهمة · {covered}/{requirements.length} متطلب له مهمة تنفيذ</div>
            <Progress value={requirements.length ? covered / requirements.length : null} height={5} />
          </div>;
        })}
      </div>}
      <div style={{ marginTop: 12, color: C.muted, fontSize: 10.5 }}>جميع مؤشرات المحفظة مشتقة من سجلات المشاريع الحالية؛ لا تنشئ هذه الشاشة مصدر بيانات منفصلًا.</div>
    </div>
  );
}

// ═════ My Work ═════
// A dedicated personal work hub reusing the existing Today, Week and Tasks views.
export function MyWork() {
  const { idx } = useP();
  const [tab, setTab] = useState("tasks");
  const preview = (idx?.list || []).slice(0, 8);
  return (
    <div>
      <Head title="عملي" sub="مساحة واحدة لمتابعة ما عليك اليوم وخلال الأسبوع وكل مهامك." />
      {preview.length > 0 && <Section title="المهام الحالية" count={preview.length}>{preview.map((t) => <TaskLine key={t.id} t={t} />)}</Section>}
      <Tabs value={tab} onChange={setTab} tabs={[
        { id: "today", label: "اليوم" },
        { id: "week", label: "هذا الأسبوع" },
        { id: "tasks", label: "كل المهام" }
      ]} />
      {tab === "today" && <Today />}
      {tab === "week" && <Week />}
      {tab === "tasks" && <Tasks />}
    </div>
  );
}
