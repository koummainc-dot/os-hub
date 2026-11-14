import React, { useState, useMemo, useEffect, useRef } from "react";
import { A, S } from "../../core/ui.jsx";
import { C, Btn, Chip, Head, Stat, Empty, Progress, Seg, Board, SearchBar, Tabs, FormModal } from "../../core/kit.jsx";
import { fmt, fmtShort, fmtMinutes, addDays, diffDays, dayName, monthDays, MONTH_NAMES, dow } from "../../core/dates.js";
import { uid } from "../../core/records.jsx";
import { useP, GENERAL_ID } from "./store.jsx";
import * as D from "./domain.js";
import { readOSEvents, subscribeOSEvents, subscribeToStoredOSEvents } from "../integrationEvents.js";
import { listKnowledgeMeetings } from "../knowledge/repository.js";
import { supabase } from "../../core/supabase.js";
import { listCoreSavedViews, saveCoreSavedView, deleteCoreSavedView } from "../../core/savedViews.js";
import { listCoreNotifications, markCoreNotificationRead } from "../../core/notifications.js";
import { L, opts, STATUS_COLOR } from "./lookups.js";
import { HealthBadge, StatusChip, PriorityChip, Who, DueChip, ProjectName, ProjectForm, TaskForm, mOpts, projOpts } from "./parts.jsx";

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
        <Stat label="مخاطر عالية" value={highRisks.length} color={highRisks.length ? C.orange : C.ok} onClick={() => { setView((current) => ({ ...current, riskStatusFilter: "open", riskHighOnly: true })); setPage("risks"); }} />
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
  const { ws, me, data, idx, today, settings, A: act, can, alerts, people, nameOf, openTask, openProject, runningTimer, projectsById, toast, setPage, shell, online, queueItems = [], discardQueuedWrite, confirm } = useP();
  const [coreNotifications, setCoreNotifications] = useState([]);
  const [coreInboxState, setCoreInboxState] = useState("loading");
  const [showAllInbox, setShowAllInbox] = useState(false);
  useEffect(() => {
    let active = true;
    if (!ws?.id) { setCoreNotifications([]); setCoreInboxState("idle"); return () => { active = false; }; }
    listCoreNotifications(ws.id, 100).then((result) => {
      if (!active) return;
      if (result.ok) { setCoreNotifications(result.rows); setCoreInboxState("ready"); }
      else { setCoreNotifications([]); setCoreInboxState("unavailable"); }
    });
    return () => { active = false; };
  }, [ws?.id, me]);
  const openCoreNotification = async (notification) => {
    await markCoreNotificationRead(notification.id);
    setCoreNotifications((rows) => rows.map((row) => row.id === notification.id ? { ...row, read_at: row.read_at || new Date().toISOString() } : row));
    const link = notification.deep_link || {};
    if (notification.source_system === "projects") {
      if (link.taskId || (link.recordKind === "task" && link.recordId)) return openTask(link.taskId || link.recordId);
      if (link.projectId) return openProject(link.projectId, link.tab || "overview", link.recordId ? { kind: link.recordKind, id: link.recordId } : null);
    }
    if (link.system || notification.source_system !== "projects") shell?.go?.("system", link.system || notification.source_system, link.tab || "home", link);
  };
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
      {coreInboxState === "unavailable" && <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>الوارد الموحد غير متاح حتى تطبيق Migration الخاصة بـCore Notifications.</div>}
      {(coreNotifications.length > 0 || coreInboxState === "ready") && <Section title="الوارد الموحد" count={coreNotifications.filter((item) => !item.read_at).length} color={coreNotifications.some((item) => !item.read_at) ? C.info : C.muted}>
        {!coreNotifications.length ? <div style={{ fontSize: 12, color: C.muted }}>لا توجد إشعارات جديدة.</div> : coreNotifications.slice(0, 8).map((notification) => <button key={notification.id} type="button" onClick={() => openCoreNotification(notification)} style={{ display: "flex", width: "100%", gap: 8, alignItems: "start", textAlign: "start", padding: "8px 0", border: 0, borderTop: "1px solid " + C.line, background: "transparent", cursor: "pointer", color: C.text, font: "inherit" }}>
          <span style={{ width: 7, height: 7, borderRadius: 8, background: notification.read_at ? C.line : C.info, marginTop: 6, flexShrink: 0 }} />
          <span style={{ flex: 1 }}><b style={{ fontSize: 12 }}>{notification.title}</b>{notification.body && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{notification.body}</div>}<div style={{ fontSize: 10, color: C.dim, marginTop: 3 }}>{fmtShort(notification.created_at?.slice(0,10))} · {notification.source_system}</div></span>
          <span style={{ fontSize: 10, color: C.info }}>فتح ↗</span>
        </button>)}
        {coreNotifications.length > 8 && <Btn small onClick={() => setShowAllInbox(true)}>عرض كل الإشعارات ({coreNotifications.length})</Btn>}
      </Section>}
      {showAllInbox && <Modal title="الوارد الموحد" wide onClose={() => setShowAllInbox(false)} footer={<><Btn onClick={async () => { await Promise.all(coreNotifications.filter((item) => !item.read_at).map((item) => markCoreNotificationRead(item.id))); setCoreNotifications((rows) => rows.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() }))); }}>تحديد الكل كمقروء</Btn><Btn onClick={() => setShowAllInbox(false)}>إغلاق</Btn></>}>
        <div style={{ display: "grid", gap: 4 }}>{coreNotifications.map((notification) => <button key={notification.id} type="button" onClick={() => { setShowAllInbox(false); openCoreNotification(notification); }} style={{ display: "flex", gap: 8, alignItems: "start", textAlign: "start", padding: 9, border: "1px solid " + C.line, borderRadius: 8, background: notification.read_at ? "transparent" : "rgba(59,130,246,.05)", cursor: "pointer", color: C.text, font: "inherit" }}><span style={{ flex: 1 }}><b style={{ fontSize: 12 }}>{notification.title}</b><div style={{ fontSize: 11, color: C.muted }}>{notification.body}</div><div style={{ fontSize: 10, color: C.dim }}>{fmtShort(notification.created_at?.slice(0,10))} · {notification.source_system}</div></span><span style={{ color: C.info, fontSize: 11 }}>فتح ↗</span></button>)}</div>
      </Modal>}
      {(!online || queueItems.length > 0) && <Section title="حالة العمل دون اتصال" count={queueItems.length} color={queueItems.some((item) => item.conflict) ? C.bad : C.warn}>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 7 }}>{online ? "الاتصال متاح؛ تتم مزامنة التعديلات الآمنة تلقائيًا." : "أنت دون اتصال. يمكن تعديل حقول المهمة الأساسية فقط؛ الإنشاءات والعلاقات والعمليات الذرية والملفات تحتاج اتصالًا."}</div>
        {queueItems.filter((item) => !item.conflict).length > 0 && <div style={{ fontSize: 12, marginBottom: 6 }}>تعديلات محفوظة محليًا بانتظار المزامنة: {queueItems.filter((item) => !item.conflict).length}</div>}
        {queueItems.filter((item) => item.conflict).map((item) => <div key={item.coll + "/" + item.rec.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 0", borderTop: "1px solid " + C.line, fontSize: 12 }}>
          <span style={{ flex: 1 }}>تعارض في «{item.rec.title || item.rec.id}» — نسخة أحدث موجودة على الخادم. لم نستبدلها.</span>
          <Btn small danger onClick={async () => { if (!(await confirm("إلغاء النسخة المحلية غير المتزامنة؟ ستبقى نسخة الخادم كما هي."))) return; discardQueuedWrite(item.coll, item.rec.id); toast("تم إلغاء التعديل المحلي المتعارض."); }}>إلغاء المحلي</Btn>
        </div>)}
      </Section>}
      {can("task.write", projectsById[GENERAL_ID]) && <div style={{ display: "flex", gap: 8, marginBottom: 12 }}><input style={S.inp} placeholder="أضف مهمة سريعة لهذا الأسبوع… (Enter)" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && quickAdd()} /><Btn kind="primary" onClick={quickAdd}>إضافة</Btn></div>}
      {alerts.length > 0 && <Section title="تنبيهات" count={alerts.length} color={C.warn}>{alerts.map((a) => <div key={a.key} style={{ display: "flex", gap: 8, alignItems: "center", padding: "5px 0", fontSize: 12.5, color: lvl[a.level] || C.dim }}><span>●</span><span style={{ flex: 1 }}>{a.text}</span>{a.project && <Btn small onClick={() => openProject(a.project, a.record?.kind === "prd" ? "prds" : a.record?.kind === "output" ? "outputs" : a.record?.kind === "risk" ? "risks" : a.kind === "issue" ? "issues" : "overview", a.record || null)}>فتح</Btn>}</div>)}</Section>}
      <Section title="اجتماعات اليوم" count={todayMeetings.length} color={C.violet} action={<Btn small onClick={() => setPage("meetings")}>كل الاجتماعات</Btn>}>{meetingsState === "loading" ? <span style={{ fontSize: 12, color: C.muted }}>جارٍ تحميل الاجتماعات…</span> : meetingsState === "error" ? <span style={{ fontSize: 12, color: C.muted }}>تعذر تحميل اجتماعات المعرفة الآن. يمكنك إعادة المحاولة بفتح قسم الاجتماعات.</span> : !todayMeetings.length ? <span style={{ fontSize: 12, color: C.muted }}>لا توجد اجتماعات مسجلة لهذا اليوم.</span> : todayMeetings.map(meeting => <div key={meeting.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${C.line}` }}><span>🗓️</span><span style={{ flex: 1, fontSize: 12.5, minWidth: 0 }}>{meeting.title}</span><span style={{ color: C.muted, fontSize: 11, whiteSpace: "nowrap" }}>{meeting.startTime || meeting.start_time || meeting.time || "طوال اليوم"}</span><Btn small onClick={() => shell?.go?.("system", "knowledge", "meetings", { focusItemId: meeting.id, focusItemKind: "meeting" })}>فتح الاجتماع ↗</Btn></div>)}</Section>
      {homeCompletions.length > 0 && <Section title="إنجازات المنزل" count={homeCompletions.length} color={C.ok}>{homeCompletions.slice(0, 8).map(event => <div key={event.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "5px 0", fontSize: 12.5 }}><span>🏠 {event.payload?.taskTitle || "مهمة منزلية"}</span><span style={{ color: C.muted, whiteSpace: "nowrap" }}>{fmt(event.occurredAt?.slice(0, 10) || today)}</span></div>)}</Section>}
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
  const { me, data, idx, people, projectsById, today, A: act, R, can, openTask, setPage, view, setView } = useP();
  const activeProjectsOnly = view.activeProjectsOnly === true;
  const [mode, setMode] = useState("list"); const [who, setWho] = useState("all"); const [q, setQ] = useState(""); const [proj, setProj] = useState(""); const [st, setSt] = useState("open"); const [blocked, setBlocked] = useState(false); const [form, setForm] = useState(false); const [quickAdd, setQuickAdd] = useState(false); const [month, setMonth] = useState(today.slice(0, 7)); const [selected, setSelected] = useState(() => new Set()); const [inlineId, setInlineId] = useState(null);
  const list = idx.list.filter((t) => idx.isLeaf(t.id) && !projectsById[t.project_id]?.archived_at)
    .filter((t) => !activeProjectsOnly || (!!projectsById[t.project_id] && !projectsById[t.project_id].is_system && !["Completed", "Cancelled"].includes(projectsById[t.project_id].status)))
    .filter((t) => (who === "all" ? true : who === "none" ? !t.assignee_id : t.assignee_id === who)).filter((t) => !proj || t.project_id === proj).filter((t) => (st === "all" ? true : st === "open" ? ["todo", "active"].includes(D.cat(t.status)) : D.cat(t.status) === st)).filter((t) => !blocked || t.blocked).filter((t) => !q || t.title.toLowerCase().includes(q.toLowerCase()));
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
        {activeProjectsOnly && <span style={{ fontSize: 11, color: C.muted }}>مهام المشاريع النشطة فقط</span>}
        {(q || who !== "all" || proj || st !== "open" || blocked || activeProjectsOnly) && <Btn small onClick={() => { setQ(""); setWho("all"); setProj(""); setSt("open"); setBlocked(false); setView((current) => ({ ...current, activeProjectsOnly: false })); }}>مسح الفلاتر</Btn>}
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
  const { data, metrics, idx, today, settings, projectProgress, openProject, openTask, setPage, setView, people, can, view, A: act, ws, shell, me } = useP();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("active");
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [mode, setMode] = useState("cards");
  const [delayedOnly, setDelayedOnly] = useState(false);
  const [typeFilter, setTypeFilter] = useState("");
  const [healthFilter, setHealthFilter] = useState("");
  const [leadFilter, setLeadFilter] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [highRiskOnly, setHighRiskOnly] = useState(false);
  const [financeLinkFilter, setFinanceLinkFilter] = useState("");
  const [financeProfiles, setFinanceProfiles] = useState([]);
  const [financePrimaryProfiles, setFinancePrimaryProfiles] = useState([]);
  const [financeSyncMeta, setFinanceSyncMeta] = useState(null);
  const lastGoodFinanceSync = useRef(null);
  const [financeLinkState, setFinanceLinkState] = useState("idle");
  const [savedViews, setSavedViews] = useState([]);
  const [savedViewsState, setSavedViewsState] = useState("idle");
  const [activeSavedViewId, setActiveSavedViewId] = useState("");
  const portfolioColumnKeys = ["project","status","health","progress","target","remaining","lead","team","priority","finance","issues","risks"];
  const [visibleColumns, setVisibleColumns] = useState(portfolioColumnKeys);
  const [columnOrder, setColumnOrder] = useState(portfolioColumnKeys);
  const [calendarMonth, setCalendarMonth] = useState(today.slice(0, 7));
  const [calendarMeetings, setCalendarMeetings] = useState([]);
  const [calendarMeetingsState, setCalendarMeetingsState] = useState("idle");
  const projects = data.projects.filter((p) => !p.is_system && !p.deleted_at);
  const financeByProjectRef = useMemo(() => {
    const map = new Map();
    for (const profile of financeProfiles) {
      const ref = String(profile.project_ref || "");
      if (!ref) continue;
      const current = map.get(ref) || [];
      current.push(profile);
      map.set(ref, current);
    }
    return map;
  }, [financeProfiles]);
  const financeStatusFor = (project) => {
    const allProfiles = financeByProjectRef.get(String(project.id)) || [];
    const primary = financePrimaryProfiles.find((row) => String(row.project_ref) === String(project.id));
    const profiles = primary ? allProfiles.filter((profile) => String(profile.id) === String(primary.finance_project_id)) : allProfiles;
    if (financeLinkState === "permission") return { key: "permission", label: "Finance: لا توجد صلاحية", color: C.bad };
    if (financeLinkState === "error") return { key: "error", label: "Finance: خطأ", color: C.bad };
    if (financeLinkState === "stale") return { key: "stale", label: "Finance: بيانات قديمة", color: C.warn, profile: profiles[0] || null };
    if (primary && !profiles.length) return { key: "primary-invalid", label: "Finance: الملف الأساسي غير موجود", color: C.bad };
    if (!profiles.length) return { key: "not-linked", label: "Finance: غير مرتبط", color: C.warn };
    if (profiles.length > 1) return { key: "multiple", label: "Finance: أكثر من ملف", color: C.warn };
    const profile = profiles[0];
    const projectCurrency = String(project.budget_currency || project.currency || "").toUpperCase();
    const financeCurrency = String(profile.currency || profile.base_currency || "").toUpperCase();
    if (projectCurrency && financeCurrency && projectCurrency !== financeCurrency) return { key: "currency-mismatch", label: `Finance: اختلاف عملة ${financeCurrency}/${projectCurrency}`, color: C.bad, profile };
    return { key: "linked", label: "Finance: مرتبط", color: C.ok, profile };
  };
  useEffect(() => {
    let active = true;
    if (!ws?.id || !me) { setSavedViews([]); setSavedViewsState("idle"); return () => { active = false; }; }
    setSavedViewsState("loading");
    listCoreSavedViews(ws.id, "projects").then((result) => {
      if (!active) return;
      if (result.ok) { setSavedViews(result.rows); setSavedViewsState("ready"); }
      else { setSavedViews([]); setSavedViewsState("unavailable"); }
    });
    return () => { active = false; };
  }, [ws?.id, me]);
  useEffect(() => {
    let active = true;
    if (!ws?.id || !supabase?.rpc) { setFinanceProfiles([]); setFinancePrimaryProfiles([]); setFinanceSyncMeta(null); lastGoodFinanceSync.current = null; setFinanceLinkState("idle"); return () => { active = false; }; }
    setFinanceLinkState("loading");
    Promise.all([
      supabase.rpc("fin_projects_sync_get", { p_ws: ws.id }),
      supabase.rpc("fin_project_primary_list", { p_ws: ws.id }),
    ]).then(([profilesResult, primaryResult]) => {
      if (!active) return;
      if (profilesResult.error) {
        const message = String(profilesResult.error.message || profilesResult.error.details || profilesResult.error.code || "");
        const permissionDenied = profilesResult.error.code === "P0001" && /FORBIDDEN|UNAUTHENTICATED/i.test(message);
        if (permissionDenied) {
          setFinanceProfiles([]); setFinancePrimaryProfiles([]); setFinanceSyncMeta(null); setLastGoodFinanceSync(null);
          setFinanceLinkState("permission");
        } else if (lastGoodFinanceSync.current) {
          setFinanceSyncMeta(lastGoodFinanceSync.current);
          setFinanceLinkState("stale");
        } else {
          setFinanceProfiles([]); setFinancePrimaryProfiles([]); setFinanceLinkState("error");
        }
        return;
      }
      const payload = profilesResult.data || {};
      const rows = Array.isArray(payload.projects) ? payload.projects : [];
      const meta = { as_of: payload.as_of || null, last_synced_at: payload.last_synced_at || null, sync_status: payload.sync_status || "fresh" };
      lastGoodFinanceSync.current = meta;
      setFinanceSyncMeta(meta);
      setFinanceProfiles(rows);
      setFinancePrimaryProfiles(primaryResult.error ? financePrimaryProfiles : (Array.isArray(primaryResult.data) ? primaryResult.data : []));
      setFinanceLinkState("ready");
    }).catch(() => {
      if (!active) return;
      if (lastGoodFinanceSync.current) { setFinanceSyncMeta(lastGoodFinanceSync.current); setFinanceLinkState("stale"); }
      else { setFinanceProfiles([]); setFinancePrimaryProfiles([]); setFinanceLinkState("error"); }
    });
    return () => { active = false; };
  }, [ws?.id]);
  const openProjects = projects.filter((p) => !p.archived_at && !["Completed", "Cancelled"].includes(p.status));
  const completed = projects.filter((p) => p.status === "Completed" && !p.archived_at);
  const delayed = openProjects.filter((p) => metrics[p.id]?.daysRemaining < 0);
  const criticalIssues = data.issues.filter((i) => D.isOpenIssue(i) && i.severity === "Critical");
  const highRisks = data.risks.filter((r) => D.isOpenRisk(r) && D.riskScore(r) >= settings.riskHigh);
  const objectives = data.objectives.filter((o) => o.status === "Active");
  const visible = projects
    .filter((p) => status === "all" || (status === "active" ? openProjects.includes(p) : status === "completed" ? completed.includes(p) : !!p.archived_at))
    .filter((p) => !query || [p.id, p.name, p.description, p.final_goal].some((v) => String(v || "").toLocaleLowerCase().includes(query.toLocaleLowerCase())))
    .filter((p) => !delayedOnly || delayed.includes(p))
    .filter((p) => !typeFilter || String(p.type || "") === typeFilter)
    .filter((p) => !healthFilter || metrics[p.id]?.health === healthFilter)
    .filter((p) => !leadFilter || String(p.lead_id || "") === leadFilter)
    .filter((p) => !teamFilter || (p.members || []).some((member) => String(member.member_id || member.user_id || member.id || "") === teamFilter))
    .filter((p) => !priorityFilter || String(p.priority || "Medium") === priorityFilter)
    .filter((p) => !visibilityFilter || String(p.visibility || "workspace") === visibilityFilter)
    .filter((p) => !dateFrom || (!!p.target_date && p.target_date >= dateFrom))
    .filter((p) => !dateTo || (!!p.target_date && p.target_date <= dateTo))
    .filter((p) => !highRiskOnly || data.risks.some((risk) => risk.project_id === p.id && D.isOpenRisk(risk) && D.riskScore(risk) >= settings.riskHigh))
    .filter((p) => !financeLinkFilter || financeStatusFor(p).key === financeLinkFilter)
    .sort((a, b) => {
      const rank = { Red: 0, Orange: 1, Yellow: 2, Green: 3, OnHold: 4, NotEvaluated: 5 };
      return (rank[metrics[a.id]?.health] ?? 9) - (rank[metrics[b.id]?.health] ?? 9) || String(a.target_date || "9999").localeCompare(String(b.target_date || "9999"));
    });
  const taskCount = idx.list.filter((t) => idx.isLeaf(t.id) && openProjects.some((p) => p.id === t.project_id) && ["todo", "active"].includes(D.cat(t.status))).length;
  const typeOptions = [...new Set(projects.map((p) => String(p.type || "")).filter(Boolean))].sort();
  const priorityOptions = [...new Set(projects.map((p) => String(p.priority || "Medium")))].sort();
  const visibilityOptions = [...new Set(projects.map((p) => String(p.visibility || "workspace")))].sort();
  const healthOptions = [...new Set(projects.map((p) => metrics[p.id]?.health).filter(Boolean))].sort();
  const filtersActive = status !== "active" || !!(query || typeFilter || healthFilter || leadFilter || teamFilter || priorityFilter || visibilityFilter || dateFrom || dateTo || highRiskOnly || delayedOnly || financeLinkFilter);
  const clearFilters = () => {
    setQuery(""); setStatus("active"); setDelayedOnly(false); setTypeFilter(""); setHealthFilter("");
    setLeadFilter(""); setTeamFilter(""); setPriorityFilter(""); setVisibilityFilter("");
    setDateFrom(""); setDateTo(""); setHighRiskOnly(false); setFinanceLinkFilter("");
  };
  const applySavedView = (id) => {
    const saved = savedViews.find((row) => row.id === id);
    if (!saved) { setActiveSavedViewId(""); return; }
    const d = saved.definition || {};
    setQuery(typeof d.query === "string" ? d.query : "");
    setStatus(["active","completed","archived","all"].includes(d.status) ? d.status : "active");
    setMode(["cards","table","board","timeline","calendar"].includes(d.mode) ? d.mode : "cards");
    setDelayedOnly(!!d.delayedOnly); setTypeFilter(d.typeFilter || ""); setHealthFilter(d.healthFilter || "");
    setLeadFilter(d.leadFilter || ""); setTeamFilter(d.teamFilter || ""); setPriorityFilter(d.priorityFilter || "");
    setVisibilityFilter(d.visibilityFilter || ""); setDateFrom(d.dateFrom || ""); setDateTo(d.dateTo || "");
    setHighRiskOnly(!!d.highRiskOnly); setFinanceLinkFilter(d.financeLinkFilter || "");
    const selectedColumns = Array.isArray(d.visibleColumns) ? d.visibleColumns.filter((key) => portfolioColumnKeys.includes(key)) : portfolioColumnKeys;
    const columns = [...new Set(["project", ...selectedColumns])];
    const order = Array.isArray(d.columnOrder) ? d.columnOrder.filter((key) => portfolioColumnKeys.includes(key)) : portfolioColumnKeys;
    setVisibleColumns(columns);
    setColumnOrder([...order.filter((key) => columns.includes(key)), ...columns.filter((key) => !order.includes(key))]);
    setActiveSavedViewId(id);
  };
  const saveCurrentView = async () => {
    const name = window.prompt("اسم طريقة العرض المحفوظة (حتى 80 حرفًا):");
    if (!name?.trim()) return;
    const scope = window.confirm("مشاركة طريقة العرض مع أعضاء مساحة العمل؟\nموافق = مشاركة، إلغاء = شخصية") ? "workspace" : "personal";
    const definition = { version: 1, query, status, mode, delayedOnly, typeFilter, healthFilter, leadFilter, teamFilter, priorityFilter, visibilityFilter, dateFrom, dateTo, highRiskOnly, financeLinkFilter, visibleColumns, columnOrder };
    const result = await saveCoreSavedView({ workspaceId: ws.id, systemId: "projects", ownerId: me, name, scope, definition });
    if (!result.ok) { setSavedViewsState("unavailable"); shell?.toast?.("تعذّر حفظ العرض في Core: " + (result.error?.message || "الخدمة غير متاحة")); return; }
    setSavedViews((rows) => [result.row, ...rows.filter((row) => row.id !== result.row.id)]);
    setActiveSavedViewId(result.row.id);
    shell?.toast?.("تم حفظ طريقة العرض في Core.");
  };
  const deleteActiveSavedView = async () => {
    const row = savedViews.find((item) => item.id === activeSavedViewId);
    if (!row || row.owner_id !== me) return;
    if (!window.confirm("حذف طريقة العرض المحفوظة؟")) return;
    const result = await deleteCoreSavedView(row.id, me);
    if (!result.ok || !result.deleted) { shell?.toast?.("تعذّر حذف طريقة العرض."); return; }
    setSavedViews((rows) => rows.filter((item) => item.id !== row.id));
    setActiveSavedViewId("");
    shell?.toast?.("تم حذف طريقة العرض.");
  };
  const moveColumn = (key, delta) => setColumnOrder((order) => {
    const next = [...order]; const index = next.indexOf(key); const target = index + delta;
    if (index < 0 || target < 0 || target >= next.length) return order;
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });
  const [calendarYear, calendarMonthNumber] = calendarMonth.split("-").map(Number);
  const calendarLead = dow(calendarMonth + "-01");
  const calendarDays = monthDays(calendarYear, calendarMonthNumber);
  const calendarDates = Array.from({ length: calendarDays }, (_, index) => calendarMonth + "-" + String(index + 1).padStart(2, "0"));
  const calendarProjectIds = visible.map((project) => project.id);
  const calendarProjectKey = calendarProjectIds.join("|");
  useEffect(() => {
    let active = true;
    if (mode !== "calendar" || !ws?.id || !calendarProjectIds.length) {
      setCalendarMeetings([]);
      setCalendarMeetingsState("idle");
      return () => { active = false; };
    }
    setCalendarMeetingsState("loading");
    Promise.all(visible.map(async (project) => {
      try {
        const result = await listKnowledgeMeetings(ws.id, project.id);
        return result.ok
          ? (result.meetings || []).map((meeting) => ({ ...meeting, project_id: project.id }))
          : { __queryError: true };
      } catch {
        return { __queryError: true };
      }
    })).then((results) => {
      if (!active) return;
      const failed = results.some((result) => !Array.isArray(result));
      setCalendarMeetings(results.flatMap((result) => Array.isArray(result) ? result : []));
      setCalendarMeetingsState(failed ? "partial" : "ready");
    }).catch(() => {
      if (active) { setCalendarMeetings([]); setCalendarMeetingsState("error"); }
    });
    return () => { active = false; };
  }, [mode, ws?.id, calendarProjectKey]);
  const calendarVisibleIds = new Set(calendarProjectIds);
  const calendarEvents = [
    ...visible.filter((project) => project.start_date).map((project) => ({ id: project.id + ":start", date: project.start_date, project, kind: "start", title: project.name })),
    ...visible.filter((project) => project.target_date).map((project) => ({ id: project.id + ":target", date: project.target_date, project, kind: "target", title: project.name })),
    ...data.milestones.filter((milestone) => milestone.due_date && !milestone.archived_at && calendarVisibleIds.has(milestone.project_id)).map((milestone) => ({ id: milestone.id + ":milestone", date: milestone.due_date, project: projects.find((project) => project.id === milestone.project_id), kind: "milestone", record: milestone, title: milestone.title })),
    ...idx.list.filter((task) => task.due_date && calendarVisibleIds.has(task.project_id)).map((task) => ({ id: task.id + ":due", date: task.due_date, project: projects.find((project) => project.id === task.project_id), kind: "task", record: task, title: task.title })),
    ...data.prds.filter((prd) => prd.target_ship_date && calendarVisibleIds.has(prd.project_id)).map((prd) => ({ id: prd.id + ":ship", date: prd.target_ship_date, project: projects.find((project) => project.id === prd.project_id), kind: "prd", record: prd, title: prd.title || "موعد إطلاق المواصفة" })),
    ...data.outputs.filter((output) => output.approval === "Final" && output.approved_at && calendarVisibleIds.has(output.project_id)).map((output) => ({ id: output.id + ":approved", date: String(output.approved_at).slice(0, 10), project: projects.find((project) => project.id === output.project_id), kind: "output", record: output, title: output.name })),
    ...data.risks.filter((risk) => risk.review_date && calendarVisibleIds.has(risk.project_id)).map((risk) => ({ id: risk.id + ":review", date: risk.review_date, project: projects.find((project) => project.id === risk.project_id), kind: "risk-review", record: risk, title: risk.title })),
    ...data.issues.filter((issue) => issue.discovered_at && calendarVisibleIds.has(issue.project_id)).map((issue) => ({ id: issue.id + ":discovered", date: String(issue.discovered_at).slice(0, 10), project: projects.find((project) => project.id === issue.project_id), kind: "issue", record: issue, title: issue.title })),
    ...data.decisions.filter((decision) => decision.decided_at && calendarVisibleIds.has(decision.project_id)).map((decision) => ({ id: decision.id + ":decision", date: String(decision.decided_at).slice(0, 10), project: projects.find((project) => project.id === decision.project_id), kind: "decision", record: decision, title: decision.title })),
    ...data.wins.filter((win) => win.achieved_on && calendarVisibleIds.has(win.project_id)).map((win) => ({ id: win.id + ":win", date: String(win.achieved_on).slice(0, 10), project: projects.find((project) => project.id === win.project_id), kind: "win", record: win, title: win.title })),
    ...calendarMeetings.filter((meeting) => meeting.date && calendarVisibleIds.has(meeting.project_id)).map((meeting) => ({ id: meeting.id + ":meeting", date: String(meeting.date).slice(0, 10), project: projects.find((project) => project.id === meeting.project_id), kind: "meeting", record: meeting, title: meeting.title })),
  ];
  const openCalendarEvent = (event) => {
    if (event.kind === "task") return openTask(event.record.id);
    if (event.kind === "milestone") return openProject(event.project.id, "milestones");
    if (event.kind === "meeting") return shell?.go?.("system", "knowledge", "meetings", { focusItemId: event.record.id, focusItemKind: "meeting" });
    if (event.kind === "prd") return openProject(event.project.id, "prds", { kind: "prd", id: event.record.id });
    if (event.kind === "output") return openProject(event.project.id, "outputs", { kind: "output", id: event.record.id });
    if (event.kind === "risk-review") return openProject(event.project.id, "risks", { kind: "risk", id: event.record.id });
    if (event.kind === "issue") return openProject(event.project.id, "issues", { kind: "issue", id: event.record.id });
    if (event.kind === "decision") return openProject(event.project.id, "decisions", { kind: "decision", id: event.record.id });
    if (event.kind === "win") return setPage("wins");
    return openProject(event.project.id, "overview");
  };
  const calendarEventLabel = (event) => ({
    start: "▶ " + event.title,
    target: "🏁 " + event.title,
    milestone: "◆ " + event.title,
    task: "☑ " + event.title,
    prd: "🚀 " + event.title,
    output: "📦 " + event.title,
    meeting: "🗓 " + event.title,
    "risk-review": "⚠️ مراجعة " + event.title,
    issue: "🔥 " + event.title,
    decision: "⚖️ " + event.title,
    win: "🏆 " + event.title,
  }[event.kind] || event.title);
  const calendarEventColor = (kind) => kind === "start" ? "rgba(16,185,129,.12)" : kind === "target" ? "rgba(239,159,39,.12)" : kind === "milestone" ? "rgba(124,58,237,.12)" : kind === "meeting" ? "rgba(124,58,237,.12)" : kind === "risk-review" ? "rgba(239,68,68,.12)" : kind === "issue" ? "rgba(220,38,38,.12)" : kind === "decision" ? "rgba(124,58,237,.12)" : kind === "win" ? "rgba(16,185,129,.12)" : kind === "task" ? "rgba(59,130,246,.12)" : kind === "prd" ? "rgba(2,132,199,.12)" : "rgba(14,116,144,.12)";
  const timelineDates = visible.flatMap((p) => [p.start_date || p.target_date, p.target_date || p.start_date]).filter(Boolean).sort();
  const timelineMin = timelineDates[0] || "";
  const timelineMax = timelineDates[timelineDates.length - 1] || "";
  const timelineSpan = timelineMin ? Math.max(1, diffDays(timelineMax, timelineMin) + 1) : 1;
  const timelinePosition = (date) => Math.max(0, Math.min(100, diffDays(date, timelineMin) / timelineSpan * 100));
  const boardStatuses = ["Idea", "Planned", "In Progress", "On Hold", "Completed", "Cancelled"];
  const portfolioColumnDefs = {
    project: { label: "المشروع", render: (p) => <><button type="button" onClick={() => openProject(p.id)} style={{ border: 0, background: "transparent", padding: 0, color: C.info, cursor: "pointer", font: "inherit", fontWeight: 700, textAlign: "start" }}>{p.name}</button><div style={{ color: C.muted, fontSize: 10.5 }}>{p.type || "—"}</div></> },
    status: { label: "الحالة", render: (p) => L.projectStatus[p.status] || p.status || "—" },
    health: { label: "الصحة", render: (p,m) => <HealthBadge m={m} compact /> },
    progress: { label: "التقدم", render: (p,m) => <div style={{ minWidth: 110 }}><Progress value={m.progress == null ? null : m.progress} /><div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>{m.progress == null ? "غير قابل للقياس" : Math.round(m.progress) + "%"}</div></div> },
    target: { label: "الموعد", render: (p) => p.target_date ? fmtShort(p.target_date) : "—" },
    remaining: { label: "الأيام المتبقية", render: (p,m) => m.daysRemaining == null ? "—" : m.daysRemaining < 0 ? "متأخر " + -m.daysRemaining + " يوم" : "باقٍ " + m.daysRemaining + " يوم" },
    lead: { label: "القائد", render: (p) => people.find((person) => person.id === p.lead_id)?.name || "—" },
    team: { label: "الفريق", render: (p) => (p.members || []).length ? <span>{p.members.slice(0,2).map((member) => people.find((person) => person.id === member.member_id)?.name || "عضو").join("، ")}{p.members.length > 2 ? " +" + (p.members.length - 2) : ""}</span> : "—" },
    priority: { label: "الأولوية", render: (p) => L.priority[p.priority] || p.priority || "—" },
    finance: { label: "Finance", render: (p) => <Chip color={financeStatusFor(p).color}>{financeStatusFor(p).label}</Chip> },
    issues: { label: "المشاكل", render: (p) => { const count = data.issues.filter((issue) => issue.project_id === p.id && D.isOpenIssue(issue)).length; return <button type="button" onClick={() => setView({ ...view, projectId: p.id, tab: "issues", issueStatusFilter: "open", issueSeverityFilter: "", focusRecord: null })} style={{ border: 0, background: "transparent", padding: 0, color: count ? C.info : C.muted, cursor: "pointer", textDecoration: count ? "underline" : "none", font: "inherit" }}>{count}</button>; } },
    risks: { label: "المخاطر", render: (p) => { const count = data.risks.filter((risk) => risk.project_id === p.id && D.isOpenRisk(risk)).length; return <button type="button" onClick={() => setView({ ...view, projectId: p.id, tab: "risks", riskStatusFilter: "open", riskHighOnly: false, focusRecord: null })} style={{ border: 0, background: "transparent", padding: 0, color: count ? C.info : C.muted, cursor: "pointer", textDecoration: count ? "underline" : "none", font: "inherit" }}>{count}</button>; } },
  };
  const activePortfolioColumns = columnOrder.filter((key) => visibleColumns.includes(key) && portfolioColumnDefs[key]);

  return (
    <div>
      <Head title="محفظة المشاريع" sub="هذه ليست محفظة مالية؛ هي مركز Portfolio لمتابعة جميع المشاريع وحالتها وتقدمها ومخاطرها ومواعيدها وروابط Finance." right={can("project.create") && <Btn kind="primary" onClick={() => setNewProjectOpen(true)}>＋ مشروع جديد</Btn>} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 10, marginBottom: 14 }}>
        <Stat label="مشاريع نشطة" value={openProjects.length} color={C.info} onClick={() => setStatus("active")} />
        <Stat label="مشاريع مكتملة" value={completed.length} color={C.ok} onClick={() => setStatus("completed")} />
        <Stat label="مشاريع متأخرة" value={delayed.length} color={delayed.length ? C.bad : C.ok} onClick={() => { setStatus("active"); setDelayedOnly(true); }} />
        <Stat label="مهام مفتوحة" value={taskCount} color={C.violet} onClick={() => { setView((current) => ({ ...current, activeProjectsOnly: true })); setPage("tasks"); }} />
        <Stat label="مشاكل حرجة" value={criticalIssues.length} color={criticalIssues.length ? C.bad : C.ok} onClick={() => { setView((v) => ({ ...v, issueSeverityFilter: "Critical", issueStatusFilter: "open" })); setPage("issues"); }} />
        <Stat label="مخاطر عالية" value={highRisks.length} color={highRisks.length ? C.orange : C.ok} onClick={() => { setView((current) => ({ ...current, riskStatusFilter: "open", riskHighOnly: true })); setPage("risks"); }} />
      </div>
      {objectives.length > 0 && <div style={{ ...S.card, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}><b style={{ fontSize: 13 }}>الأهداف النشطة (OKR)</b><span style={{ flex: 1 }} /><Btn small onClick={() => setPage("okrs")}>إدارة الأهداف</Btn></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
          {objectives.map((o) => { const progress = D.objectiveProgress(o, data.krs, projectProgress); const pace = D.PACE_META[D.pace(progress, o.period_start, o.period_end, o.status, today, settings)]; return <div key={o.id} style={{ minWidth: 0 }}><div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12 }}><span style={{ flex: 1, fontWeight: 600, overflowWrap: "anywhere" }}>{o.name}</span><Chip color={pace?.color}>{pace?.label || "—"}</Chip></div><div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 5 }}><Progress value={progress} /><span style={{ fontSize: 10.5, color: C.muted }}>{Math.round(progress)}%</span></div></div>; })}
        </div>
      </div>}
      <div style={{ ...S.card, marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input aria-label="بحث في المشاريع" style={{ ...S.inp, flex: "1 1 220px" }} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث باسم المشروع أو وصفه أو هدفه…" />
          <select aria-label="تصفية المشاريع" style={{ ...S.sel, minWidth: 150 }} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="active">النشطة</option><option value="completed">المكتملة</option><option value="archived">المؤرشفة</option><option value="all">كل المشاريع</option>
          </select>
          <Seg small value={mode} onChange={setMode} options={[{ v: "cards", l: "بطاقات" }, { v: "table", l: "جدول" }, { v: "board", l: "لوحة" }, { v: "timeline", l: "خط زمني" }, { v: "calendar", l: "تقويم" }]} />
          <select aria-label="طرق العرض المحفوظة" style={{ ...S.sel, minWidth: 175 }} value={activeSavedViewId} onChange={(e) => applySavedView(e.target.value)}>
            <option value="">طرق العرض المحفوظة</option>
            {savedViews.map((row) => <option key={row.id} value={row.id}>{row.name}{row.scope === "workspace" ? " · مشتركة" : " · شخصية"}</option>)}
          </select>
          <Btn small onClick={saveCurrentView} disabled={savedViewsState === "unavailable" || savedViewsState === "loading"}>حفظ العرض الحالي</Btn>
          {savedViews.find((row) => row.id === activeSavedViewId)?.owner_id === me && <Btn small danger onClick={deleteActiveSavedView}>حذف العرض</Btn>}
          <span style={{ color: C.muted, fontSize: 11 }}>{visible.length} مشروع</span>
          {filtersActive && <Btn small onClick={clearFilters}>مسح الفلاتر</Btn>}
        </div>
        <details style={{ marginTop: 9 }}>
          <summary style={{ cursor: "pointer", fontSize: 12, color: C.dim }}>فلاتر مركبة {filtersActive ? "· مفعّلة" : ""}</summary>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 8, marginTop: 9 }}>
            <label style={{ fontSize: 11, color: C.muted }}>النوع<select aria-label="نوع المشروع" style={{ ...S.sel, width: "100%", marginTop: 3 }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}><option value="">كل الأنواع</option>{typeOptions.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
            <label style={{ fontSize: 11, color: C.muted }}>الصحة<select aria-label="صحة المشروع" style={{ ...S.sel, width: "100%", marginTop: 3 }} value={healthFilter} onChange={(e) => setHealthFilter(e.target.value)}><option value="">كل الحالات الصحية</option>{healthOptions.map((value) => <option key={value} value={value}>{D.HEALTH_META[value]?.label || value}</option>)}</select></label>
            <label style={{ fontSize: 11, color: C.muted }}>القائد<select aria-label="قائد المشروع" style={{ ...S.sel, width: "100%", marginTop: 3 }} value={leadFilter} onChange={(e) => setLeadFilter(e.target.value)}><option value="">كل القادة</option>{people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
            <label style={{ fontSize: 11, color: C.muted }}>عضو الفريق<select aria-label="عضو الفريق" style={{ ...S.sel, width: "100%", marginTop: 3 }} value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)}><option value="">كل الفرق</option>{people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
            <label style={{ fontSize: 11, color: C.muted }}>الأولوية<select aria-label="أولوية المشروع" style={{ ...S.sel, width: "100%", marginTop: 3 }} value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}><option value="">كل الأولويات</option>{priorityOptions.map((value) => <option key={value} value={value}>{L.priority[value] || value}</option>)}</select></label>
            <label style={{ fontSize: 11, color: C.muted }}>الرؤية<select aria-label="رؤية المشروع" style={{ ...S.sel, width: "100%", marginTop: 3 }} value={visibilityFilter} onChange={(e) => setVisibilityFilter(e.target.value)}><option value="">كل مستويات الرؤية</option>{visibilityOptions.map((value) => <option key={value} value={value}>{value === "private" ? "خاص" : value === "workspace" ? "مساحة العمل" : value}</option>)}</select></label>
            <label style={{ fontSize: 11, color: C.muted }}>حالة Finance<select aria-label="حالة ربط Finance" style={{ ...S.sel, width: "100%", marginTop: 3 }} value={financeLinkFilter} onChange={(e) => setFinanceLinkFilter(e.target.value)}><option value="">كل حالات Finance</option><option value="linked">مرتبط</option><option value="not-linked">غير مرتبط</option><option value="multiple">أكثر من ملف بلا أساسي</option><option value="primary-invalid">ملف أساسي غير صالح</option><option value="currency-mismatch">اختلاف عملة</option><option value="permission">لا توجد صلاحية</option><option value="error">خطأ</option></select></label>
            <label style={{ fontSize: 11, color: C.muted }}>الموعد من<input aria-label="الموعد من" type="date" style={{ ...S.inp, width: "100%", marginTop: 3 }} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></label>
            <label style={{ fontSize: 11, color: C.muted }}>الموعد إلى<input aria-label="الموعد إلى" type="date" style={{ ...S.inp, width: "100%", marginTop: 3 }} value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} /></label>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
            <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 11.5 }}><input type="checkbox" checked={highRiskOnly} onChange={(e) => setHighRiskOnly(e.target.checked)} />مشاريع بها مخاطر عالية مفتوحة</label>
            {delayedOnly && <span style={{ fontSize: 11, color: C.warn }}>فلتر المشاريع المتأخرة مفعّل</span>}
          </div>
        </details>
        <div style={{ marginTop: 10, paddingTop: 9, borderTop: "1px solid " + C.line }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 7 }}>أعمدة جدول المحفظة وترتيبها</div>
          <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>{[["project","المشروع"],["status","الحالة"],["health","الصحة"],["progress","التقدم"],["target","الموعد"],["remaining","الأيام المتبقية"],["lead","القائد"],["team","الفريق"],["priority","الأولوية"],["finance","Finance"],["issues","المشاكل"],["risks","المخاطر"]].map(([key,label]) => <label key={key} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11 }}><input type="checkbox" checked={visibleColumns.includes(key)} onChange={(e) => { if (key === "project" && !e.target.checked) return; setVisibleColumns((old) => e.target.checked ? [...old,key] : old.filter((x) => x !== key)); }} />{label}</label>)}</div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 7 }}>{columnOrder.filter((key) => visibleColumns.includes(key)).map((key) => <span key={key} style={{ display: "inline-flex", alignItems: "center", gap: 3, border: "1px solid " + C.line, borderRadius: 6, padding: "3px 5px", fontSize: 10.5 }}>{({project:"المشروع",status:"الحالة",health:"الصحة",progress:"التقدم",target:"الموعد",remaining:"الأيام المتبقية",lead:"القائد",team:"الفريق",priority:"الأولوية",finance:"Finance",issues:"المشاكل",risks:"المخاطر"})[key]}<button type="button" aria-label="تحريك العمود لليسار" onClick={() => moveColumn(key,-1)} style={{ border: 0, background: "transparent", cursor: "pointer" }}>←</button><button type="button" aria-label="تحريك العمود لليمين" onClick={() => moveColumn(key,1)} style={{ border: 0, background: "transparent", cursor: "pointer" }}>→</button></span>)}</div>
        </div>
        <div style={{ fontSize: 10.5, color: C.muted, marginTop: 6 }}>طرق العرض تحفظ الفلاتر ونمط العرض والأعمدة وترتيبها في Core. المشاركة اختيارية وتخضع لصلاحيات مساحة العمل.</div>
      </div>
      {!visible.length ? <Empty icon="🗂️" title="لا توجد مشاريع مطابقة" sub="غيّر الفلتر أو عبارة البحث لعرض مشاريع أخرى." />
      : mode === "table" ? <div style={{ ...S.card, padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", minWidth: Math.max(680, activePortfolioColumns.length * 112), borderCollapse: "collapse", fontSize: 12 }}>
          <thead><tr style={{ background: "rgba(0,0,0,0.03)" }}>{activePortfolioColumns.map((key) => <th key={key} style={{ padding: 9, textAlign: "start", color: C.muted, fontSize: 10.5, whiteSpace: "nowrap" }}>{portfolioColumnDefs[key].label}</th>)}</tr></thead>
          <tbody>{visible.map((p) => { const m = metrics[p.id] || {}; return <tr key={p.id} style={{ borderTop: "1px solid " + C.line }}>{activePortfolioColumns.map((key) => <td key={key} style={{ padding: 9, whiteSpace: ["status","target","remaining","finance"].includes(key) ? "nowrap" : "normal" }}>{portfolioColumnDefs[key].render(p,m)}</td>)}</tr>; })}</tbody>
        </table>
      </div>
      : mode === "board" ? <div>
        <Board
          columns={boardStatuses.map((projectStatus) => ({
            id: projectStatus,
            label: L.projectStatus[projectStatus] || projectStatus,
            color: STATUS_COLOR?.[projectStatus],
            items: visible.filter((p) => !p.archived_at && p.status === projectStatus)
          }))}
          onMove={async (id, to) => {
            const project = data.projects.find((p) => p.id === id);
            if (!project || project.archived_at || !can("project.edit", project)) return;
            if (project.status === to) return;
            await act.setProjectStatus(project, to);
          }}
          renderCard={(p) => <div onClick={() => openProject(p.id)} style={{ ...S.card, padding: "9px 11px", cursor: "pointer" }}>
            <div style={{ display: "flex", gap: 7, alignItems: "center" }}><b style={{ flex: 1, fontSize: 12 }}>{p.name}</b><HealthBadge m={metrics[p.id] || {}} compact /></div>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginTop: 5 }}><PriorityChip p={p.priority} /><Chip color={financeStatusFor(p).color}>{financeStatusFor(p).label}</Chip><span style={{ fontSize: 10.5, color: C.muted }}>{p.target_date ? "الموعد " + fmtShort(p.target_date) : "بلا موعد"}</span></div>
            <div style={{ marginTop: 6 }}><Progress value={metrics[p.id]?.progress == null ? null : metrics[p.id].progress} /></div>
          </div>}
        />
        {visible.some((p) => p.archived_at) && <section style={{ ...S.card, marginTop: 10, padding: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>المشاريع المؤرشفة · للعرض فقط</div>
          {visible.filter((p) => p.archived_at).map((p) => <button key={p.id} type="button" onClick={() => openProject(p.id)} style={{ display: "block", width: "100%", textAlign: "start", border: 0, borderTop: "1px solid " + C.line, background: "transparent", padding: "8px 2px", color: C.info, cursor: "pointer", font: "inherit" }}>{p.name}</button>)}
        </section>}
      </div>
      : mode === "timeline" ? <div style={{ ...S.card, overflowX: "auto" }}>
        {!timelineDates.length ? <Empty icon="🗓️" title="لا توجد مشاريع مؤرخة" sub="أضف تاريخ بداية أو موعدًا مستهدفًا للمشروع." /> : <div style={{ minWidth: 760 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: C.muted, marginBottom: 9 }}><span>{fmtShort(timelineMin)}</span><span>{fmtShort(timelineMax)}</span></div>
          {visible.filter((p) => p.start_date || p.target_date).map((p) => {
            const start = p.start_date || p.target_date, finish = p.target_date || p.start_date;
            const left = timelinePosition(start), width = Math.max(1.5, timelinePosition(finish) - left);
            return <div key={p.id} style={{ display: "grid", gridTemplateColumns: "190px 1fr", gap: 10, alignItems: "center", marginBottom: 9 }}>
              <button type="button" onClick={() => openProject(p.id)} style={{ border: 0, background: "transparent", padding: 0, font: "inherit", textAlign: "start", color: C.info, cursor: "pointer", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</button>
              <div style={{ position: "relative", height: 25, borderRadius: 6, background: "rgba(0,0,0,.04)" }}><div title={fmtShort(start) + " → " + fmtShort(finish)} style={{ position: "absolute", insetInlineStart: left + "%", width: width + "%", top: 3, height: 19, borderRadius: 5, background: metrics[p.id]?.health === "Red" ? "rgba(239,68,68,.2)" : metrics[p.id]?.health === "Orange" ? "rgba(239,159,39,.22)" : "rgba(16,185,129,.18)", border: "1px solid " + (metrics[p.id]?.health === "Red" ? C.bad : metrics[p.id]?.health === "Orange" ? C.orange : C.ok) }} />{today >= timelineMin && today <= timelineMax && <div title="اليوم" style={{ position: "absolute", insetInlineStart: timelinePosition(today) + "%", top: 0, bottom: 0, width: 2, background: A, zIndex: 2 }} />}</div>
            </div>;
          })}
        </div>}
      </div>
      : mode === "calendar" ? <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}><Btn small onClick={() => { const next = new Date(Date.UTC(calendarYear, calendarMonthNumber - 2, 1)); setCalendarMonth(next.toISOString().slice(0, 7)); }}>→</Btn><b>{MONTH_NAMES[calendarMonthNumber - 1]} {calendarYear}</b><Btn small onClick={() => { const next = new Date(Date.UTC(calendarYear, calendarMonthNumber, 1)); setCalendarMonth(next.toISOString().slice(0, 7)); }}>←</Btn></div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", fontSize: 10.5, color: C.muted, marginBottom: 8 }}>
          <span>▶ بداية / 🏁 نهاية</span><span>☑ موعد مهمة</span><span>🚀 إطلاق PRD</span><span>📦 مخرج معتمد</span><span>⚠️ مراجعة خطر</span><span>🔥 اكتشاف مشكلة</span><span>⚖️ قرار</span><span>🏆 إنجاز</span><span>🗓 اجتماع Knowledge</span>
          {calendarMeetingsState === "loading" && <span>· جارٍ تحميل اجتماعات المشاريع…</span>}
          {calendarMeetingsState === "partial" && <span>· بعض اجتماعات Knowledge لم تُحمّل؛ بقية المواعيد متاحة.</span>}
          {calendarMeetingsState === "error" && <span>· تعذّر تحميل اجتماعات Knowledge.</span>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: 4 }}>
          {["أحد","اثنين","ثلاثاء","أربعاء","خميس","جمعة","سبت"].map((day) => <div key={day} style={{ fontSize: 10.5, color: C.muted, textAlign: "center" }}>{day}</div>)}
          {Array.from({ length: calendarLead }, (_, index) => <div key={"blank-" + index} />)}
          {calendarDates.map((date) => {
            const dayEvents = calendarEvents.filter((event) => event.date === date);
            return <div key={date} style={{ minHeight: 84, minWidth: 0, border: "1px solid " + (date === today ? A : C.line), borderRadius: 6, padding: 4, background: date === today ? "rgba(239,159,39,.06)" : "transparent" }}>
              <div style={{ fontSize: 10, color: C.muted }}>{Number(date.slice(-2))}</div>
              {dayEvents.slice(0, 4).map((event) => <button key={event.id} type="button" onClick={() => openCalendarEvent(event)} title={(event.project?.name ? event.project.name + " · " : "") + calendarEventLabel(event)} style={{ display: "block", width: "100%", marginTop: 3, border: 0, borderRadius: 4, padding: "2px 4px", background: calendarEventColor(event.kind), color: C.text, fontSize: 10, textAlign: "start", cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{calendarEventLabel(event)}</button>)}
              {dayEvents.length > 4 && <div style={{ fontSize: 9, color: C.muted }}>+{dayEvents.length - 4} أحداث أخرى</div>}
            </div>;
          })}
        </div>
      </div>
      : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,320px),1fr))", gap: 10 }}>
          {visible.map((p) => {
            const m = metrics[p.id] || {};
            const tasks = idx.list.filter((t) => idx.isLeaf(t.id) && t.project_id === p.id);
            const open = tasks.filter((t) => ["todo", "active"].includes(D.cat(t.status))).length;
            const overdue = tasks.filter((t) => D.isOverdueLeaf(t, idx, today)).length;
            const issueCount = data.issues.filter((i) => i.project_id === p.id && D.isOpenIssue(i)).length;
            const riskCount = data.risks.filter((r) => r.project_id === p.id && D.isOpenRisk(r)).length;
            return <div key={p.id} role="button" tabIndex={0} onClick={() => openProject(p.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openProject(p.id); } }} style={{ ...S.card, padding: 13, cursor: "pointer", minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 700, fontSize: 14, overflowWrap: "anywhere" }}>{p.name}</div><div style={{ color: C.muted, fontSize: 11, marginTop: 3 }}>{L.projectStatus[p.status] || p.status || "—"}{p.target_date ? " · الموعد " + fmtShort(p.target_date) : ""}</div></div>
                <HealthBadge m={m} compact />
              </div>
              {p.description && <div style={{ color: C.dim, fontSize: 11.5, marginTop: 8, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.description}</div>}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}><Progress value={m.progress == null ? null : m.progress} /><b style={{ fontSize: 11, minWidth: 36, textAlign: "end" }}>{m.progress == null ? "غير قابل للقياس" : Math.round(m.progress) + "%"}</b></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginTop: 11, paddingTop: 9, borderTop: "1px solid " + C.line }}>
                <div><button type="button" onClick={(e) => { e.stopPropagation(); setView({ ...view, projectId: p.id, tab: "tasks", taskFilter: null, taskFilterIds: [], focusRecord: null }); }} style={{ border: 0, background: "transparent", padding: 0, color: C.info, cursor: "pointer", fontSize: 15, fontWeight: 700 }}>{open}</button><div style={{ color: C.muted, fontSize: 10 }}>مهام مفتوحة</div></div>
                <div><button type="button" onClick={(e) => { e.stopPropagation(); setView({ ...view, projectId: p.id, tab: "tasks", taskFilter: "overdue", focusRecord: null }); }} style={{ border: 0, background: "transparent", padding: 0, color: overdue ? C.bad : C.text, cursor: "pointer", fontSize: 15, fontWeight: 700 }}>{overdue}</button><div style={{ color: C.muted, fontSize: 10 }}>متأخرة</div></div>
                <div><button type="button" onClick={(e) => { e.stopPropagation(); setView({ ...view, projectId: p.id, tab: "issues", issueStatusFilter: "open", issueSeverityFilter: "", focusRecord: null }); }} style={{ border: 0, background: "transparent", padding: 0, color: issueCount ? C.info : C.text, cursor: "pointer", fontSize: 15, fontWeight: 700 }}>{issueCount}</button><div style={{ color: C.muted, fontSize: 10 }}>مشاكل</div></div>
                <div><button type="button" onClick={(e) => { e.stopPropagation(); setView({ ...view, projectId: p.id, tab: "risks", riskStatusFilter: "open", riskHighOnly: false, focusRecord: null }); }} style={{ border: 0, background: "transparent", padding: 0, color: riskCount ? C.info : C.text, cursor: "pointer", fontSize: 15, fontWeight: 700 }}>{riskCount}</button><div style={{ color: C.muted, fontSize: 10 }}>مخاطر</div></div>
              </div>
            </div>;
          })}
        </div>}
      <div style={{ marginTop: 12, color: C.muted, fontSize: 10.5 }}>المؤشرات محسوبة من سجلات المشاريع والمهام والمخاطر والمشاكل الحالية؛ لا تُنشأ بيانات أو علاقات جديدة في هذه الشاشة. الربط المالي لا يعرض حالة أو أرقامًا هنا قبل اكتمال Finance read model.</div>
      {newProjectOpen && <ProjectForm initial={{}} onClose={() => setNewProjectOpen(false)} />}
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
