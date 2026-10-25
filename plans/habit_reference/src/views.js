import {
  actualBookProgress, achievementValue, bestCleanStreak, bookProgress, cleanDays,
  currentStreak, dueToday, endOfWeek, formatDate, formatNumber, habitLogForDate,
  logsForHabit, startOfWeek,
} from "./domain.js?v=20261004-1849";
import { addLocalDays, localISODate } from "./data.js?v=20261004-1849";

export const PAGE_META = {
  dashboard: ["نظرة اليوم", "خطوة صغيرة محسوبة."],
  habits: ["مكتبة العادات", "تابع كل ما يهمك، واختر القليل لليوم."],
  logs: ["السجل اليومي", "تاريخ واضح لكل خطوة — من غير إدخالات تلقائية."],
  relapses: ["التعافي", "التعثر معلومة، والخطوة التالية ما زالت في يدك."],
  journal: ["الجورنال", "مساحة خاصة للتأمل وتسجيل ما تريد تذكره."],
  books: ["مكتبة القراءة", "كل جلسة قراءة تضيف صفحة جديدة إلى الرحلة."],
  focus: ["التركيز الأسبوعي", "اختر بوعي، وراجع ما نجح من غير لوم."],
  achievements: ["الإنجازات", "التقدم يُحسب من سجلاتك، لا من إدخال يدوي."],
  settings: ["الإعدادات والخصوصية", "بيانات النموذج محفوظة على هذا المتصفح فقط."],
};

const NAV_GROUPS = [
  { title: "يومي", items: [["dashboard", "اليوم", "◷"], ["habits", "العادات", "◌"], ["logs", "السجل اليومي", "▤"]] },
  { title: "مساحاتك", items: [["relapses", "التعافي", "↗"], ["journal", "الجورنال", "✎"], ["books", "الكتب والقراءة", "▧"]] },
  { title: "مراجعة", items: [["focus", "التركيز الأسبوعي", "▦"], ["achievements", "الإنجازات", "✳"], ["settings", "الإعدادات", "⚙"]] },
];

export function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function safeCoverUrl(value) {
  const url = String(value || "").trim();
  return /^https:\/\/[^\s"'<>]+$/i.test(url) ? url : "";
}

function activeHabits(state) {
  return state.habits.filter((habit) => !habit.deletedAt && habit.status !== "archived" && habit.status !== "paused");
}
function visibleRecords(records) { return records.filter((record) => !record.deletedAt); }
function statusLabel(status) {
  return ({ done: "تمت", partial: "جزئية", missed: "فائتة", vacation: "إجازة", skipped: "تخطي" })[status] || "غير مسجلة";
}
function statusClass(status) { return `status-${status || "empty"}`; }
function habitName(state, id) { return state.habits.find((habit) => habit.id === id)?.name || "عادة محذوفة"; }
function categoryName(state, id) { return state.categories.find((category) => category.id === id)?.name || "بدون تصنيف"; }
function levelName(level) { return ({ growth: "نمو", maintenance: "صيانة", automatic: "تلقائية", deferred: "مؤجلة" })[level] || level; }
function typeName(type) { return type === "bad" ? "عادة أعمل على تقليلها" : "عادة إيجابية"; }
function optionList(values, selected, labelFn = (x) => x[1]) {
  return values.map((item) => `<option value="${escapeHTML(item[0])}" ${String(item[0]) === String(selected) ? "selected" : ""}>${escapeHTML(labelFn(item))}</option>`).join("");
}
function btn(label, action, attrs = "", cls = "btn btn-quiet") {
  return `<button type="button" class="${cls}" data-action="${action}" ${attrs}>${label}</button>`;
}
function emptyState(title, text, actionLabel = "", action = "", attrs = "") {
  return `<div class="empty-state"><span class="empty-mark">○</span><h3>${escapeHTML(title)}</h3><p>${escapeHTML(text)}</p>${actionLabel ? btn(escapeHTML(actionLabel), action, attrs, "btn btn-primary") : ""}</div>`;
}
function meter(value, max = 1, label = "") {
  const ratio = max > 0 ? Math.max(0, Math.min(Number(value) / Number(max), 1)) : 0;
  return `<div class="meter" role="progressbar" aria-valuenow="${Math.round(ratio * 100)}" aria-valuemin="0" aria-valuemax="100" aria-label="${escapeHTML(label)}"><span style="width:${ratio * 100}%"></span></div>`;
}
function habitScheduleLabel(habit, state) {
  const rule = habit.scheduleRule || {};
  if (habit.scheduleType === "daily") return Number(rule.everyNDays || 1) === 1 ? "كل يوم" : `كل ${formatNumber(rule.everyNDays)} أيام`;
  if (habit.scheduleType === "weekdays") return (rule.days || []).map((n) => ["", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"][n]).filter(Boolean).join("، ") || "أيام محددة";
  if (habit.scheduleType === "times_per_period") return `${formatNumber(rule.targetCount || 1)} مرات / ${rule.period === "month" ? "الشهر" : "الأسبوع"}`;
  if (habit.scheduleType === "interval") return `كل ${formatNumber(rule.everyN || 1)} ${rule.unit === "week" ? "أسبوع" : rule.unit === "month" ? "شهر" : "يوم"}`;
  if (habit.scheduleType === "monthly") {
    if (rule.kind === "last_day") return "آخر يوم من الشهر";
    if (rule.kind === "nth_weekday") {
      const weekdays = ["", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"];
      const nth = Number(rule.nth) === -1 ? "الأخير" : `الأسبوع ${formatNumber(rule.nth || 1)}`;
      return `${nth} من ${weekdays[Number(rule.weekday)] || "الأسبوع"}`;
    }
    return `يوم ${formatNumber(rule.day || "—")} من الشهر`;
  }
  return "جدول مخصص";
}
function logStatusButtons(habit, todayLog) {
  if (habit.type === "bad" || habit.trackingType === "avoidance") return btn("تسجيل انتكاسة", "add-relapse", `data-habit="${habit.id}"`, "btn btn-soft-danger btn-sm");
  const choices = [["done", todayLog?.status === "done" ? "تم ✓" : "تم", "btn btn-primary btn-sm"], ["partial", "جزئي", "btn btn-outline btn-sm"], ["skipped", "تخطي", "btn btn-quiet btn-sm"], ["vacation", "إجازة", "btn btn-quiet btn-sm"]];
  return choices.map(([status, label, cls]) => btn(label, "quick-log", `data-id="${habit.id}" data-status="${status}"`, cls)).join("");
}
function habitCard(habit, state, compact = false) {
  const today = localISODate();
  const todayLog = habitLogForDate(state, habit.id, today);
  const streak = currentStreak(habit, state, today);
  const isBad = habit.type === "bad" || habit.trackingType === "avoidance";
  const ringRatio = isBad ? Math.min(cleanDays(habit, state, today) / 14, 1) : (todayLog ? (habit.trackingType === "check" ? (todayLog.status === "done" ? 1 : 0) : Number(todayLog.actual || 0) / Number(todayLog.goalSnapshot || habit.goal || 1)) : 0);
  const mainValue = isBad ? `${formatNumber(cleanDays(habit, state, today))} يوم` : `${formatNumber(streak)} ${habit.scheduleType === "times_per_period" ? "فترة" : "موعد"}`;
  return `<article class="habit-card ${isBad ? "habit-card-bad" : ""} ${compact ? "habit-card-compact" : ""}">
    <div class="habit-card-top"><div><span class="eyebrow">${escapeHTML(categoryName(state, habit.categoryId))}</span><h3>${escapeHTML(habit.name)}</h3></div><span class="progress-ring" style="--progress:${Math.max(0, Math.min(ringRatio, 1)) * 100}%" aria-label="التقدم"></span></div>
    <div class="habit-card-meta"><span>${escapeHTML(habitScheduleLabel(habit, state))}</span><span class="pill ${isBad ? "pill-rose" : "pill-mint"}">${isBad ? `أفضل نظافة ${formatNumber(bestCleanStreak(habit, state, today))} يوم` : `السلسلة ${mainValue}`}</span></div>
    ${!compact && !isBad && habit.trackingType !== "check" ? `${meter(todayLog?.actual || 0, todayLog?.goalSnapshot || habit.goal || 1, "تقدم اليوم")}<div class="meter-caption">${formatNumber(todayLog?.actual || 0, 1)} / ${formatNumber(habit.goal, 1)} ${escapeHTML(habit.unit || "")}</div>` : ""}
    ${compact ? "" : `<div class="habit-card-actions">${logStatusButtons(habit, todayLog)} ${btn("تعديل", "edit-habit", `data-id="${habit.id}"`)} ${btn("المزيد", "archive-habit", `data-id="${habit.id}"`)}</div>`}
  </article>`;
}

function renderDashboard(state) {
  const today = localISODate();
  const focus = state.focus.find((item) => !item.deletedAt && (!item.startDate || item.startDate <= today) && (!item.endDate || item.endDate >= today));
  const focused = (focus?.habitIds || []).map((id) => state.habits.find((habit) => habit.id === id)).filter((habit) => habit && !habit.deletedAt && habit.status !== "archived" && habit.status !== "paused");
  const goodFocused = focused.filter((habit) => habit.type !== "bad");
  const badFocused = focused.filter((habit) => habit.type === "bad");
  const todayLogs = state.logs.filter((log) => log.localDate === today && !log.deletedAt);
  const todayDone = todayLogs.filter((log) => log.status === "done").length;
  const active = activeHabits(state).length;
  const weekStart = startOfWeek(today, Number(state.preferences.weekStartsOn ?? 1));
  const weekDates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(`${weekStart}T12:00:00`); date.setDate(date.getDate() + index);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  });
  const weeklyDone = weekDates.reduce((count, date) => count + (state.logs.some((log) => log.localDate === date && log.status === "done" && !log.deletedAt) ? 1 : 0), 0);
  const pageCount = state.readingSessions.filter((session) => session.readOn >= weekStart && session.readOn <= endOfWeek(today, Number(state.preferences.weekStartsOn ?? 1)) && !session.deletedAt).reduce((sum, session) => sum + Number(session.pagesRead || 0), 0);
  return `<section class="welcome-strip"><div><span class="eyebrow">مساحة اليوم · ${escapeHTML(formatDate(today, { weekday: "long", day: "numeric", month: "long" }))}</span><h2>على مهلك، المهم إنك بدأت.</h2><p>كل تقدم له إيقاعه. الأيام غير المجدولة لا تخصم من رصيدك.</p></div><div class="welcome-mark" aria-hidden="true"><span>هـ</span><i></i></div></section>
  <section class="stat-row" aria-label="ملخص اليوم">
    <article class="stat-card"><span>إنجازات اليوم</span><strong>${formatNumber(todayDone)}<small> ${formatNumber(goodFocused.length)} عادة تركيز</small></strong><div class="stat-line"><i style="width:${goodFocused.length ? Math.min(100, todayDone / goodFocused.length * 100) : 0}%"></i></div></article>
    <article class="stat-card"><span>عادات نشطة</span><strong>${formatNumber(active)}<small> عادة في مكتبتك</small></strong><div class="stat-accent accent-teal">كلها في مكان واحد</div></article>
    <article class="stat-card"><span>صفحات هذا الأسبوع</span><strong>${formatNumber(pageCount)}<small> صفحة مقروءة</small></strong><div class="stat-accent accent-gold">من جلسات القراءة</div></article>
    <article class="stat-card"><span>تركيز هذا الأسبوع</span><strong>${formatNumber(weeklyDone)}<small> تسجيلات مكتملة</small></strong><div class="stat-accent accent-violet">${formatNumber(focus?.rating || 0)} / 5 تقييم الأسبوع</div></article>
  </section>
  <div class="section-heading"><div><span class="eyebrow">مساحتك اليومية</span><h2>تركيز اليوم</h2><p>ثلاث إلى خمس عادات تكفي لبداية جيدة.</p></div><div class="heading-actions">${btn("إضافة عادة", "add-habit", "", "btn btn-outline")}${btn("سجل يومي", "add-log", "", "btn btn-primary")}</div></div>
  ${focused.length ? `<div class="habit-grid">${goodFocused.map((habit) => habitCard(habit, state, true)).join("")}</div>` : emptyState("اختر عادات تركيزك", "أضف 3–5 عادات للأسبوع حتى تظهر هنا.", "اختيار التركيز", "go-focus")}
  ${badFocused.length ? `<section class="clean-panel"><div class="clean-orbit">${formatNumber(Math.max(...badFocused.map((habit) => cleanDays(habit, state, today))))}<small>يوم نظيف</small></div><div class="clean-copy"><span class="eyebrow">التعافي من غير لوم</span><h3>${escapeHTML(badFocused[0].name)}</h3><p>أيام النظافة تُحسب من سجل الانتكاس، وليس كسلسلة نجاح عادية.</p><div class="clean-actions">${btn("تسجيل انتكاسة", "add-relapse", `data-habit="${badFocused[0].id}"`, "btn btn-soft-danger")}${btn("عرض سجل التعافي", "go-relapses", "", "btn btn-outline")}</div></div><div class="clean-side">أفضل فترة<br><strong>${formatNumber(bestCleanStreak(badFocused[0], state, today))} يوم</strong></div></section>` : ""}
  <section class="bottom-grid"><article class="panel week-panel"><div class="panel-head"><div><span class="eyebrow">نظرة أسبوعية</span><h3>إيقاع الأسبوع</h3></div>${btn("مراجعة الأسبوع", "go-focus", "", "btn btn-outline btn-sm")}</div><div class="week-bars">${weekDates.map((date) => { const num = new Date(`${date}T12:00:00`).getDay(); const label = ["ح","ن","ث","ر","خ","ج","س"][num]; const done = state.logs.filter((log) => log.localDate === date && log.status === "done" && !log.deletedAt).length; return `<div class="week-day ${date === today ? "is-today" : ""}"><span>${label}</span><i style="height:${Math.max(8, Math.min(56, done * 17 + 8))}px"></i><small>${formatDate(date, { day: "numeric" })}</small></div>`; }).join("")}</div><p class="panel-note">السجل يعرض ما أدخلته فعلًا؛ لا ننشئ أيامًا فائتة تلقائيًا.</p></article><article class="panel quote-panel"><span class="quote-mark">“</span><span class="eyebrow">ملاحظة لنفسك</span><h3>مش لازم كل يوم يكون مثالي عشان يكون له قيمة.</h3><p>الاستمرار المرن أحسن من محاولة سلسلة لا تنقطع أبدًا.</p>${btn("اكتب في الجورنال", "add-journal", "", "btn btn-outline")}</article></section>`;
}

function renderHabits(state, query = "", filter = "all") {
  const filters = [["all", "الكل"], ["growth", "نمو"], ["maintenance", "صيانة"], ["automatic", "تلقائية"], ["deferred", "مؤجلة"], ["archived", "مؤرشفة"]];
  const source = state.habits.filter((habit) => !habit.deletedAt && (filter === "archived" ? habit.status === "archived" : habit.status !== "archived"));
  const filtered = source.filter((habit) => (filter === "all" || filter === "archived" || habit.level === filter) && `${habit.name} ${categoryName(state, habit.categoryId)}`.toLowerCase().includes(query.toLowerCase()));
  return `<div class="page-toolbar"><div class="filter-tabs">${filters.map(([key, label]) => `<button class="filter-tab ${filter === key ? "active" : ""}" data-action="habit-filter" data-filter="${key}">${label}<span>${formatNumber(state.habits.filter((h) => !h.deletedAt && (key === "archived" ? h.status === "archived" : (key === "all" ? h.status !== "archived" : h.status !== "archived" && h.level === key))).length)}</span></button>`).join("")}</div>${btn("＋ عادة جديدة", "add-habit", "", "btn btn-primary")}</div>
  <div class="library-summary"><span>مكتبتك فيها <strong>${formatNumber(source.length)}</strong> عادة</span><span>التركيز الحالي <strong>${formatNumber(state.focus.find((f) => !f.deletedAt)?.habitIds?.length || 0)}</strong> / 5</span></div>
  ${filtered.length ? `<div class="habit-list">${filtered.map((habit) => `<article class="library-row"><div class="library-icon ${habit.type === "bad" ? "icon-rose" : "icon-teal"}">${habit.type === "bad" ? "↘" : "○"}</div><div class="library-main"><h3>${escapeHTML(habit.name)}</h3><p>${escapeHTML(categoryName(state, habit.categoryId))} · ${escapeHTML(habitScheduleLabel(habit, state))} · ${escapeHTML(typeName(habit.type))}</p></div><span class="pill pill-neutral">${escapeHTML(levelName(habit.level))}</span><div class="library-progress">${habit.type === "bad" ? `<strong>${formatNumber(cleanDays(habit, state))}</strong><small>يوم نظيف</small>` : `<strong>${formatNumber(currentStreak(habit, state))}</strong><small>${habit.scheduleType === "times_per_period" ? "فترة متتالية" : "موعد متتالٍ"}</small>`}</div><div class="row-actions">${btn("تعديل", "edit-habit", `data-id="${habit.id}"`, "btn btn-quiet btn-sm")}${habit.status === "archived" ? btn("استعادة", "restore-habit", `data-id="${habit.id}"`, "btn btn-outline btn-sm") : btn("أرشفة", "archive-habit", `data-id="${habit.id}"`, "btn btn-quiet btn-sm")}${btn("حذف", "delete-record", `data-kind="habit" data-id="${habit.id}"`, "btn btn-danger-quiet btn-sm")}</div></article>`).join("")}</div>` : emptyState("لا توجد عادات هنا", "جرّب تغيير المرشح أو أضف عادة جديدة.", "إضافة عادة", "add-habit")}`;
}

function renderLogs(state, query = "") {
  const rows = visibleRecords(state.logs).filter((log) => `${habitName(state, log.habitId)} ${log.localDate} ${statusLabel(log.status)} ${log.bookTitleSnapshot || state.books.find((book) => book.id === log.bookId)?.name || ""}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => b.localDate.localeCompare(a.localDate));
  return `<div class="section-heading compact-heading"><div><span class="eyebrow">ما أدخلته فعلًا</span><h2>السجل اليومي</h2><p>المواعيد غير المسجلة لا تتحول تلقائيًا إلى صفوف فائتة.</p></div>${btn("＋ إضافة سجل", "add-log", "", "btn btn-primary")}</div>
  ${rows.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>التاريخ</th><th>العادة</th><th>الحالة</th><th>الكتاب</th><th>الكمية / الملاحظة</th><th></th></tr></thead><tbody>${rows.map((log) => `<tr><td>${escapeHTML(formatDate(log.localDate, { day: "numeric", month: "short", year: "numeric" }))}</td><td>${escapeHTML(habitName(state, log.habitId))}</td><td><span class="status-pill ${statusClass(log.status)}">${escapeHTML(statusLabel(log.status))}</span></td><td>${escapeHTML(log.bookTitleSnapshot || state.books.find((book) => book.id === log.bookId)?.name || "—")}</td><td>${log.actual != null ? `${formatNumber(log.actual, 1)} ${escapeHTML(state.habits.find((h) => h.id === log.habitId)?.unit || "")}` : "—"}${log.note ? `<small class="subline">${escapeHTML(log.note)}</small>` : ""}</td><td class="row-actions">${btn("تعديل", "edit-log", `data-id="${log.id}"`, "btn btn-quiet btn-sm")}${btn("حذف", "delete-record", `data-kind="log" data-id="${log.id}"`, "btn btn-danger-quiet btn-sm")}</td></tr>`).join("")}</tbody></table></div>` : emptyState("سجلك ما زال هادئًا", "عند تسجيل عادة ستظهر هنا مع تاريخها وحالتها.", "تسجيل عادة", "add-log")}`;
}

function renderRelapses(state, query = "") {
  const badHabits = state.habits.filter((habit) => habit.type === "bad" && !habit.deletedAt);
  const events = visibleRecords(state.relapses).filter((event) => `${habitName(state, event.habitId)} ${event.trigger} ${event.at}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => b.at.localeCompare(a.at));
  return `<div class="section-heading compact-heading"><div><span class="eyebrow">الأيام النظيفة من سجل الأحداث</span><h2>التعافي</h2><p>الحدث لا يمحو تاريخك؛ نستخدمه لفهم المحفز والخطوة التالية.</p></div>${btn("＋ تسجيل انتكاسة", "add-relapse", "", "btn btn-soft-danger")}</div>
  ${badHabits.length ? `<div class="recovery-grid">${badHabits.map((habit) => `<article class="recovery-card"><div class="recovery-card-head"><div class="recovery-symbol">↗</div><span class="pill pill-rose">عادة سيئة</span></div><h3>${escapeHTML(habit.name)}</h3><div class="recovery-number">${formatNumber(cleanDays(habit, state))}<small>يوم نظيف حالي</small></div><div class="recovery-stats"><span>أفضل فترة<strong>${formatNumber(bestCleanStreak(habit, state))} يوم</strong></span><span>عدد الأحداث<strong>${formatNumber(visibleRecords(state.relapses).filter((r) => r.habitId === habit.id).length)}</strong></span></div><div class="card-actions">${btn("تسجيل حدث", "add-relapse", `data-habit="${habit.id}"`, "btn btn-soft-danger")}${btn("تعديل العادة", "edit-habit", `data-id="${habit.id}"`, "btn btn-outline")}</div></article>`).join("")}</div>` : emptyState("أضف عادة تريد تقليلها", "سجل التعافي يعمل مع العادات التي نوعها «سيئة»." , "إضافة عادة", "add-habit")}
  <div class="section-heading compact-heading"><div><span class="eyebrow">التاريخ</span><h2>أحداث الانتكاس</h2></div></div>
  ${events.length ? `<div class="timeline">${events.map((event) => `<article class="timeline-item"><div class="timeline-dot"></div><div class="timeline-content"><div class="timeline-head"><div><strong>${escapeHTML(habitName(state, event.habitId))}</strong><span>${escapeHTML(formatDate(event.at, { day: "numeric", month: "long", year: "numeric" }))} · ${escapeHTML(event.time || "")}</span></div><span class="pill pill-neutral">الشدة ${formatNumber(event.severity || 1)} / 5</span></div><p>${escapeHTML(event.whatHappened || event.trigger || "لا توجد ملاحظة إضافية")}</p>${event.plan24h ? `<small>خطوة الـ24 ساعة: ${escapeHTML(event.plan24h)}</small>` : ""}<div class="row-actions">${btn("تعديل", "edit-relapse", `data-id="${event.id}"`, "btn btn-quiet btn-sm")}${btn("حذف", "delete-record", `data-kind="relapse" data-id="${event.id}"`, "btn btn-danger-quiet btn-sm")}</div></div></article>`).join("")}</div>` : emptyState("لا توجد أحداث مسجلة", "لو حدث تعثر، سجله بلطف حتى تتضح المحفزات والخطة.")}`;
}

function renderJournal(state, query = "") {
  const entries = visibleRecords(state.journalEntries).filter((entry) => `${entry.title} ${entry.body} ${entry.intention} ${entry.date} ${(entry.tagIds || []).map((id) => state.journalTags.find((tag) => tag.id === id)?.name).join(" ")}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => b.date.localeCompare(a.date));
  const tags = state.journalTags;
  return `<div class="section-heading compact-heading"><div><span class="eyebrow">صفحاتك الخاصة</span><h2>الجورنال</h2><p>يمكنك كتابة أكثر من تدوينة في اليوم وربطها بعدة عادات.</p></div>${btn("＋ تدوينة جديدة", "add-journal", "", "btn btn-primary")}</div>
  <div class="tag-filter">${tags.map((tag) => `<button class="tag-chip" data-action="journal-tag-filter" data-tag="${tag.id}"># ${escapeHTML(tag.name)}</button>`).join("")}<span class="privacy-hint">محتوى النموذج محفوظ على هذا المتصفح فقط</span></div>
  ${entries.length ? `<div class="journal-grid">${entries.map((entry) => `<article class="journal-card"><div class="journal-date"><span>${escapeHTML(formatDate(entry.date, { weekday: "short" }))}</span><strong>${escapeHTML(formatDate(entry.date, { day: "numeric", month: "short" }))}</strong></div><div class="journal-card-main"><div class="journal-title-row"><h3>${escapeHTML(entry.title)}</h3><span class="mood-indicator" title="المزاج ${escapeHTML(entry.mood || "—")}">${entry.mood ? "●".repeat(Number(entry.mood)) : "○"}</span></div>${entry.intention ? `<p class="journal-intention">${escapeHTML(entry.intention)}</p>` : ""}${entry.body ? `<p>${escapeHTML(entry.body)}</p>` : entry.learning ? `<p>${escapeHTML(entry.learning)}</p>` : ""}<div class="journal-meta">${(entry.tagIds || []).map((id) => state.journalTags.find((tag) => tag.id === id)).filter(Boolean).map((tag) => `<span class="tag-chip"># ${escapeHTML(tag.name)}</span>`).join("")}<span>${(entry.habitIds || []).map((id) => escapeHTML(habitName(state, id))).join(" · ")}</span></div><div class="row-actions">${btn("تعديل", "edit-journal", `data-id="${entry.id}"`, "btn btn-quiet btn-sm")}${btn("حذف", "delete-record", `data-kind="journal" data-id="${entry.id}"`, "btn btn-danger-quiet btn-sm")}</div></div></article>`).join("")}</div>` : emptyState("ابدأ صفحة جديدة", "اكتب نية اليوم أو سجّل فوزًا صغيرًا أو فكرة تريد الرجوع إليها.", "إنشاء تدوينة", "add-journal")}`;
}

function renderBooks(state, query = "") {
  const books = visibleRecords(state.books).filter((book) => `${book.name} ${book.author} ${book.status} ${book.category}`.toLowerCase().includes(query.toLowerCase()));
  const sessions = visibleRecords(state.readingSessions).sort((a, b) => b.readOn.localeCompare(a.readOn));
  const statusLabels = { want_to_read: "أريد قراءته", reading: "أقرأ الآن", on_hold: "متوقف مؤقتًا", completed: "مكتمل", abandoned: "لم أكمله" };
  return `<div class="section-heading compact-heading"><div><span class="eyebrow">القراءة في مكانها</span><h2>الكتب وجلسات القراءة</h2><p>التقدم مشتق من الجلسات المسجلة، وليس من رقم قابل للتعديل وحده.</p></div>${btn("＋ كتاب", "add-book", "", "btn btn-primary")}</div>
  ${books.length ? `<div class="book-grid">${books.map((book) => { const progress = bookProgress(book, state); const links = state.habitBooks.filter((link) => link.bookId === book.id).map((link) => habitName(state, link.habitId)); const cover = safeCoverUrl(book.cover); return `<article class="book-card"><div class="book-cover ${cover ? "has-cover" : ""}">${cover ? `<img class="book-cover-image" src="${escapeHTML(cover)}" alt="غلاف ${escapeHTML(book.name)}" loading="lazy" referrerpolicy="no-referrer">` : ""}<span class="book-cover-mark">⌁</span><small>${escapeHTML(book.format || "كتاب")}</small></div><div class="book-info"><div class="book-status-row"><span class="pill pill-mint">${escapeHTML(statusLabels[book.status] || book.status)}</span><span class="eyebrow">${escapeHTML(book.category || "قراءة")}</span></div><h3>${escapeHTML(book.name)}</h3><p class="book-author">${escapeHTML(book.author || "مؤلف غير مضاف")}</p><div class="book-progress-line"><span>${formatNumber(progress.current)} ${progress.total ? `/ ${formatNumber(progress.total)} صفحة` : "صفحة مسجلة"}</span><strong>${progress.remaining == null ? "—" : `${formatNumber(progress.remaining)} متبقية`}</strong></div>${progress.ratio == null ? `<div class="meter"><span style="width:18%"></span></div><small class="subline">أضف إجمالي الصفحات لإظهار نسبة التقدم.</small>` : meter(progress.ratio, 1, "تقدم الكتاب")}<div class="book-linked">${links.length ? `مرتبط بـ ${escapeHTML(links.join("، "))}` : "غير مرتبط بعادة"}</div><div class="card-actions">${btn("جلسة قراءة", "add-reading", `data-book="${book.id}"`, "btn btn-primary btn-sm")}${btn("تعديل", "edit-book", `data-id="${book.id}"`, "btn btn-quiet btn-sm")}${btn("حذف", "delete-record", `data-kind="book" data-id="${book.id}"`, "btn btn-danger-quiet btn-sm")}</div></div></article>`; }).join("")}</div>` : emptyState("رفّك بانتظار كتاب", "أضف كتابًا ثم سجّل جلسات القراءة ليُحسب التقدم تلقائيًا.", "إضافة كتاب", "add-book")}
  <div class="section-heading compact-heading"><div><span class="eyebrow">الأحدث</span><h2>جلسات القراءة</h2></div>${btn("＋ جلسة", "add-reading", "", "btn btn-outline")}</div>
  ${sessions.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>التاريخ</th><th>الكتاب</th><th>الصفحات</th><th>المدة</th><th></th></tr></thead><tbody>${sessions.map((session) => `<tr><td>${escapeHTML(formatDate(session.readOn, { day: "numeric", month: "short" }))}</td><td>${escapeHTML(state.books.find((book) => book.id === session.bookId)?.name || session.bookTitleSnapshot || "كتاب محذوف")}</td><td>${formatNumber(session.pagesRead)} صفحة</td><td>${session.durationMinutes ? `${formatNumber(session.durationMinutes)} د` : "—"}</td><td class="row-actions">${btn("تعديل", "edit-reading", `data-id="${session.id}"`, "btn btn-quiet btn-sm")}${btn("حذف", "delete-record", `data-kind="reading" data-id="${session.id}"`, "btn btn-danger-quiet btn-sm")}</td></tr>`).join("")}</tbody></table></div>` : `<p class="panel-note">لم تسجل جلسات قراءة بعد.</p>`}`;
}

function renderFocus(state) {
  const today = localISODate();
  const weeks = visibleRecords(state.focus).sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));
  const current = weeks.find((week) => !week.startDate || (week.startDate <= today && (!week.endDate || week.endDate >= today))) || weeks[0];
  const progressStart = current?.startDate || startOfWeek(today, state.preferences.weekStartsOn);
  const progressEnd = current?.endDate || endOfWeek(today, state.preferences.weekStartsOn);
  const selected = current?.habitIds || [];
  const habits = activeHabits(state).filter((habit) => habit.type !== "bad");
  return `<div class="section-heading compact-heading"><div><span class="eyebrow">خطة قصيرة، مراجعة صادقة</span><h2>التركيز الأسبوعي</h2><p>3–5 عادات مفضلة؛ يظهر تحذير فقط إذا تجاوز الاختيار خمسة.</p></div>${btn("＋ أسبوع جديد", "add-focus", "", "btn btn-primary")}</div>
  ${current ? `<article class="focus-feature"><div class="focus-feature-head"><div><span class="eyebrow">الأسبوع الحالي</span><h3>${current.startDate ? `${escapeHTML(formatDate(current.startDate, { day: "numeric", month: "short" }))} — ${escapeHTML(formatDate(current.endDate, { day: "numeric", month: "short" }))}` : "مراجعة الأسبوع"}</h3></div><span class="rating-chip">${formatNumber(current.rating || 0)} / 5</span></div><div class="focus-habit-chips">${selected.map((id) => `<span class="focus-habit-chip">○ ${escapeHTML(habitName(state, id))}</span>`).join("") || "لم تُحدد عادات لهذا الأسبوع"}</div><div class="review-columns"><div><span class="eyebrow">ما نجح</span><p>${escapeHTML(current.worked || "لم تسجل بعد")}</p></div><div><span class="eyebrow">ما كان صعبًا</span><p>${escapeHTML(current.failed || "لم تسجل بعد")}</p></div><div><span class="eyebrow">تعديل الأسبوع القادم</span><p>${escapeHTML(current.adjustment || "لم تسجل بعد")}</p></div></div><div class="card-actions">${btn("تعديل المراجعة", "edit-focus", `data-id="${current.id}"`, "btn btn-outline")}${btn("حذف المراجعة", "delete-record", `data-kind="focus" data-id="${current.id}"`, "btn btn-danger-quiet")}</div></article>` : emptyState("اختر بوصلة الأسبوع", "حدد العادات التي تريد أن تمنحها اهتمامًا هذا الأسبوع.", "إنشاء تركيز أسبوعي", "add-focus")}
  <div class="section-heading compact-heading"><div><span class="eyebrow">تقدم العادات</span><h2>كيف سار الأسبوع؟</h2></div></div><div class="focus-progress-list">${selected.map((id) => {
    const habit = state.habits.find((item) => item.id === id);
    if (!habit) return "";
    const logs = logsForHabit(state, id).filter((log) => log.status === "done");
    let count = 0;
    let target = 0;
    let label = "هذا الأسبوع";
    if (habit.scheduleType === "times_per_period") {
      const period = habit.scheduleRule?.period || "week";
      target = Number(habit.scheduleRule?.targetCount || 1);
      if (period === "month") {
        const date = new Date(`${progressStart}T12:00:00`);
        const monthStart = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
        const monthEnd = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()).padStart(2, "0")}`;
        count = logs.filter((log) => log.localDate >= monthStart && log.localDate <= monthEnd).length;
        label = "هدف الشهر";
      } else {
        count = logs.filter((log) => log.localDate >= progressStart && log.localDate <= progressEnd).length;
        label = "هدف الأسبوع";
      }
    } else {
      for (let day = progressStart; day <= progressEnd; day = addLocalDays(day, 1)) if (dueToday(habit, state, day)) target += 1;
      count = logs.filter((log) => log.localDate >= progressStart && log.localDate <= progressEnd && dueToday(habit, state, log.localDate)).length;
    }
    const progress = target > 0 ? meter(count, target, habit.name) : `<span class="panel-note">لا يوجد موعد مجدول هذا الأسبوع</span>`;
    return `<div class="focus-progress-row"><span>${escapeHTML(habit.name)}<small>${escapeHTML(label)}</small></span>${progress}<strong>${formatNumber(count)} / ${formatNumber(target)}</strong></div>`;
  }).join("")}</div>
  ${weeks.length > 1 ? `<div class="section-heading compact-heading"><div><span class="eyebrow">السجل</span><h2>مراجعات سابقة</h2></div></div><div class="archive-list">${weeks.slice(1).map((week) => `<div class="archive-row"><span>${week.startDate ? escapeHTML(formatDate(week.startDate, { day: "numeric", month: "long", year: "numeric" })) : "أسبوع سابق"}</span><span>${(week.habitIds || []).length} عادات</span>${btn("تعديل", "edit-focus", `data-id="${week.id}"`, "btn btn-quiet btn-sm")}</div>`).join("")}</div>` : ""}`;
}

function renderAchievements(state) {
  const achievements = visibleRecords(state.achievements);
  return `<div class="section-heading compact-heading"><div><span class="eyebrow">تتحدث من بياناتك</span><h2>الإنجازات</h2><p>القيمة الحالية والحالة تُحسبان ولا تُعدّلان يدويًا.</p></div>${btn("＋ إنجاز", "add-achievement", "", "btn btn-primary")}</div>
  ${achievements.length ? `<div class="achievement-grid">${achievements.map((achievement) => { const value = achievementValue(achievement, state); const goal = Number(achievement.conditionValue || 1); const achieved = value >= goal; const type = ({ clean_days: "أيام نظيفة", total_quantity: "كمية إجمالية", completed_days: "أيام مكتملة" })[achievement.conditionType] || achievement.conditionType; return `<article class="achievement-card ${achieved ? "is-achieved" : ""} ${achievement.enabled ? "" : "is-disabled"}"><div class="achievement-medal">${achieved ? "✦" : "◇"}</div><div class="achievement-top"><span class="eyebrow">${escapeHTML(type)}</span><span class="pill ${!achievement.enabled ? "pill-neutral" : achieved ? "pill-mint" : "pill-neutral"}">${!achievement.enabled ? "متوقف" : achieved ? "مكتمل" : "قيد التقدم"}</span></div><h3>${escapeHTML(achievement.name)}</h3><p>${escapeHTML(achievement.habitId ? habitName(state, achievement.habitId) : "كل العادات")}</p><div class="achievement-progress">${meter(value, goal, achievement.name)}<strong>${formatNumber(value)} / ${formatNumber(goal)}</strong></div>${achievement.achievedAt && achieved ? `<small>تحقق في ${escapeHTML(formatDate(achievement.achievedAt, { day: "numeric", month: "short", year: "numeric" }))}</small>` : ""}<div class="card-actions">${btn("تعديل الشرط", "edit-achievement", `data-id="${achievement.id}"`, "btn btn-quiet btn-sm")}${btn(achievement.enabled ? "تعطيل" : "تفعيل", "toggle-achievement", `data-id="${achievement.id}"`, "btn btn-outline btn-sm")}${btn("أرشفة", "archive-achievement", `data-id="${achievement.id}"`, "btn btn-danger-quiet btn-sm")}</div></article>`; }).join("")}</div>` : emptyState("كل إنجاز يبدأ بهدف", "أضف شرطًا وسنحسب تقدمه من السجلات الفعلية.", "إنشاء إنجاز", "add-achievement")}`;
}

function renderTrash(state) {
  const types = [["habit", "عادة", state.habits], ["log", "سجل يومي", state.logs], ["relapse", "انتكاس", state.relapses], ["journal", "تدوينة", state.journalEntries], ["book", "كتاب", state.books], ["reading", "جلسة قراءة", state.readingSessions], ["focus", "مراجعة", state.focus], ["achievement", "إنجاز", state.achievements]];
  const rows = types.flatMap(([kind, label, records]) => records.filter((record) => record.deletedAt).map((record) => ({ kind, label, record })));
  if (!rows.length) return `<div class="trash-empty"><span>⌑</span><div><strong>سلة المحذوفات فارغة</strong><small>العناصر المحذوفة تظهر هنا ويمكن استعادتها من هذا المتصفح.</small></div></div>`;
  return `<div class="trash-list">${rows.map(({ kind, label, record }) => `<div class="archive-row"><span>${escapeHTML(label)} · ${escapeHTML(record.name || record.title || record.localDate || record.date || record.readOn || record.startDate || "عنصر")}</span><span>${record.deletedAt ? escapeHTML(formatDate(String(record.deletedAt).slice(0, 10))) : ""}</span><div>${btn("استعادة", "restore-record", `data-kind="${kind}" data-id="${record.id}"`, "btn btn-outline btn-sm")}${btn("حذف نهائي", "purge-record", `data-kind="${kind}" data-id="${record.id}"`, "btn btn-danger-quiet btn-sm")}</div></div>`).join("")}</div>`;
}

function renderSettings(state) {
  const categories = state.categories || [];
  const tags = state.journalTags || [];
  const reminders = state.reminders || [];
  const days = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  return `<div class="settings-grid"><section class="panel settings-card"><div class="panel-head"><div><span class="eyebrow">كيف يُفهم يومك؟</span><h3>إعدادات الوقت</h3></div><span class="settings-icon">◷</span></div><form data-form="preferences" class="form-grid"><label class="field"><span>المنطقة الزمنية</span><select name="timezone">${optionList([["Africa/Cairo", "القاهرة"], ["Asia/Riyadh", "الرياض"], ["Asia/Dubai", "دبي"], ["Europe/London", "لندن"], ["UTC", "UTC"]], state.preferences.timezone)}</select></label><label class="field"><span>بداية الأسبوع</span><select name="weekStartsOn">${optionList([[1, "الاثنين"], [0, "الأحد"], [6, "السبت"]], state.preferences.weekStartsOn)}</select></label><label class="field"><span>التذكيرات داخل التطبيق</span><select name="remindersEnabled">${optionList([["false", "متوقفة"], ["true", "مفعّلة"]], String(Boolean(state.preferences.remindersEnabled)))}</select><small>يُحفظ الجدول محليًا؛ لا توجد إشعارات نظام في النموذج.</small></label><div class="form-actions"><button class="btn btn-primary" type="submit">حفظ الإعدادات</button></div></form></section>
  <section class="panel settings-card categories-card"><div class="panel-head"><div><span class="eyebrow">التصنيفات</span><h3>مجالات العادات</h3></div>${btn("＋ تصنيف", "add-category", "", "btn btn-outline btn-sm")}</div><div class="managed-list">${categories.length ? categories.map((category) => { const used = state.habits.some((habit) => habit.categoryId === category.id); return `<div class="managed-row"><div><strong>${escapeHTML(category.name)}</strong><small>${category.isActive ? (used ? "مرتبط بعادات" : "نشط") : "معطّل"}</small></div><div>${btn("تعديل", "edit-category", `data-id="${escapeHTML(category.id)}"`, "btn btn-quiet btn-sm")}${btn(category.isActive ? "تعطيل" : "تفعيل", "toggle-category", `data-id="${escapeHTML(category.id)}"`, "btn btn-outline btn-sm")}${!used ? btn("حذف", "delete-category", `data-id="${escapeHTML(category.id)}"`, "btn btn-danger-quiet btn-sm") : ""}</div></div>`; }).join("") : `<small>لا توجد تصنيفات.</small>`}</div></section>
  <section class="panel settings-card"><div class="panel-head"><div><span class="eyebrow">وسوم الجورنال</span><h3>تنظيم اليوميات</h3></div>${btn("＋ وسم", "add-tag", "", "btn btn-outline btn-sm")}</div><div class="managed-list">${tags.length ? tags.map((tag) => `<div class="managed-row"><div><strong># ${escapeHTML(tag.name)}</strong><small>${formatNumber(state.journalEntries.filter((entry) => (entry.tagIds || []).includes(tag.id)).length)} تدوينة</small></div><div>${btn("تعديل", "edit-tag", `data-id="${escapeHTML(tag.id)}"`, "btn btn-quiet btn-sm")}${btn("حذف", "delete-tag", `data-id="${escapeHTML(tag.id)}"`, "btn btn-danger-quiet btn-sm")}</div></div>`).join("") : `<small>لم تُضف وسوم بعد.</small>`}</div><small class="subline">حذف الوسم يفك رابطه من التدوينات ولا يحذف التدوينات.</small></section>
  <section class="panel settings-card"><div class="panel-head"><div><span class="eyebrow">مواعيد اختيارية</span><h3>تذكيرات العادات</h3></div>${btn("＋ تذكير", "add-reminder", "", "btn btn-outline btn-sm")}</div><div class="managed-list">${reminders.length ? reminders.map((reminder) => { const reminderDays = reminder.daysOfWeek?.length ? reminder.daysOfWeek.map((day) => days[Number(day)]).join("، ") : "أيام جدول العادة"; const status = !reminder.enabled ? "متوقف" : state.preferences.remindersEnabled ? "مفعّل" : "موقوف من إعدادات الحساب"; return `<div class="managed-row"><div><strong>${escapeHTML(habitName(state, reminder.habitId))} · ${escapeHTML(reminder.localTime || "—")}</strong><small>${escapeHTML(reminderDays)} · ${status}</small></div><div>${btn("تعديل", "edit-reminder", `data-id="${escapeHTML(reminder.id)}"`, "btn btn-quiet btn-sm")}${btn(reminder.enabled ? "إيقاف" : "تشغيل", "toggle-reminder", `data-id="${escapeHTML(reminder.id)}"`, "btn btn-outline btn-sm")}${btn("حذف", "delete-reminder", `data-id="${escapeHTML(reminder.id)}"`, "btn btn-danger-quiet btn-sm")}</div></div>`; }).join("") : `<small>لم تُضف تذكيرات بعد.</small>`}</div><small class="subline">هذه إعدادات وقت فقط؛ لا تُرسل إشعارات حتى يُنفّذ تكامل الإشعارات.</small></section>
  <section class="panel settings-card"><div class="panel-head"><div><span class="eyebrow">بياناتك في هذه النسخة</span><h3>التصدير والخصوصية</h3></div><span class="settings-icon">◇</span></div><p>لا يوجد حساب أو مزامنة أو قاعدة إنتاجية. البيانات تبقى في تخزين المتصفح الذي تستخدمه.</p><div class="settings-actions">${btn("تنزيل نسخة JSON", "export-json", "", "btn btn-outline")}${btn("تنزيل السجلات CSV", "export-csv", "", "btn btn-outline")}</div><div class="privacy-callout"><strong>لا تدخل بيانات حساسة.</strong><span>مسح بيانات المتصفح قد يحذف نسخة النموذج المحلي.</span></div></section>
  <section class="panel settings-card"><div class="panel-head"><div><span class="eyebrow">تجربة العرض</span><h3>استعادة بيانات المثال</h3></div></div><p>يعيد ذلك البيانات الأولية ويستبدل التعديلات المحلية في هذا المتصفح.</p>${btn("إعادة بيانات العرض", "reset-demo", "", "btn btn-soft-danger")}</section></div>
  <section class="panel trash-panel"><div class="panel-head"><div><span class="eyebrow">استعادة عند الحاجة</span><h3>سلة المحذوفات</h3></div><span class="pill pill-neutral">${formatNumber(state.habits.concat(state.logs, state.relapses, state.journalEntries, state.books, state.readingSessions, state.focus, state.achievements).filter((record) => record.deletedAt).length)} عنصر</span></div>${renderTrash(state)}</section>`;
}

export function renderApp(state, page = "dashboard", query = "", habitFilter = "all") {
  const [title, subtitle] = PAGE_META[page] || PAGE_META.dashboard;
  const today = localISODate();
  const nav = NAV_GROUPS.map((group) => `<div class="nav-group"><span class="nav-label">${group.title}</span>${group.items.map(([key, label, icon]) => `<button class="nav-item ${page === key ? "active" : ""}" data-action="navigate" data-page="${key}" ${page === key ? 'aria-current="page"' : ""}><span class="nav-icon">${icon}</span><span>${label}</span>${key === "habits" ? `<small>${formatNumber(activeHabits(state).length)}</small>` : ""}</button>`).join("")}</div>`).join("");
  let content = "";
  if (page === "dashboard") content = renderDashboard(state);
  else if (page === "habits") content = renderHabits(state, query, habitFilter);
  else if (page === "logs") content = renderLogs(state, query);
  else if (page === "relapses") content = renderRelapses(state, query);
  else if (page === "journal") content = renderJournal(state, query);
  else if (page === "books") content = renderBooks(state, query);
  else if (page === "focus") content = renderFocus(state);
  else if (page === "achievements") content = renderAchievements(state);
  else if (page === "settings") content = renderSettings(state);
  return `<aside class="sidebar"><div class="brand"><div class="brand-mark"><span>ه</span><i></i></div><div><strong>Habit OS</strong><small>مساحة العادات</small></div><button class="mobile-menu-close" data-action="close-menu" aria-label="إغلاق القائمة">×</button></div><div class="profile-mini"><div class="avatar">م</div><div><strong>مساحتي</strong><small>تجربة شخصية محلية</small></div><span class="online-dot"></span></div><nav aria-label="التنقل الرئيسي">${nav}</nav><div class="sidebar-note"><span>✧</span><p>لا تحتاج يومًا مثاليًا، فقط خطوة تناسبك.</p></div><div class="sidebar-footer"><span class="storage-dot"></span><span>حفظ محلي تجريبي</span></div></aside>
  <main class="main-area"><header class="topbar"><button class="mobile-menu-open" data-action="open-menu" aria-label="فتح القائمة">☰</button><div class="topbar-heading"><span class="eyebrow">${escapeHTML(formatDate(today, { weekday: "long", day: "numeric", month: "long" }))}</span><h1>${escapeHTML(title)}</h1><p>${escapeHTML(subtitle)}</p></div><div class="topbar-actions"><label class="search-box"><span aria-hidden="true">⌕</span><input id="global-search" type="search" value="${escapeHTML(query)}" placeholder="ابحث في هذا القسم…" aria-label="البحث في القسم" /></label>${btn("＋ تسجيل سريع", "add-log", "", "btn btn-primary top-quick")}</div></header><div class="content-area" id="page-content">${content}</div><footer class="app-footer"><span>Habit OS <i>•</i> نموذج واجهة تجريبي</span><span>بياناتك لا تغادر هذا المتصفح</span></footer></main>`;
}

function field(label, name, value = "", type = "text", attrs = "", hint = "") {
  return `<label class="field"><span>${escapeHTML(label)}</span><input type="${type}" name="${name}" value="${escapeHTML(value)}" ${attrs}/>${hint ? `<small>${escapeHTML(hint)}</small>` : ""}</label>`;
}
function selectField(label, name, values, selected, hint = "") {
  return `<label class="field"><span>${escapeHTML(label)}</span><select name="${name}">${optionList(values, selected)}</select>${hint ? `<small>${escapeHTML(hint)}</small>` : ""}</label>`;
}
function textareaField(label, name, value = "", hint = "") {
  return `<label class="field field-wide"><span>${escapeHTML(label)}</span><textarea name="${name}" rows="3">${escapeHTML(value)}</textarea>${hint ? `<small>${escapeHTML(hint)}</small>` : ""}</label>`;
}
function relationChecks(label, name, items, selectedIds = [], nameFor = (item) => item.name) {
  if (!items.length) return "";
  const selected = selectedIds.map(String);
  return `<fieldset class="field field-wide check-field"><legend>${escapeHTML(label)}</legend><div class="check-list">${items.map((item) => `<label class="check-option"><input type="checkbox" name="${name}" value="${escapeHTML(item.id)}" ${selected.includes(String(item.id)) ? "checked" : ""}/><span>${escapeHTML(nameFor(item))}</span></label>`).join("")}</div></fieldset>`;
}
function formShell(kind, title, body, submit = "حفظ") {
  return `<div class="dialog-header"><div><span class="eyebrow">Habit OS</span><h2 id="dialog-title">${escapeHTML(title)}</h2></div><button type="button" class="dialog-close" data-action="close-dialog" aria-label="إغلاق">×</button></div><form data-form="${kind}" class="dialog-form"><div class="form-grid">${body}</div><div class="form-actions"><button type="button" class="btn btn-outline" data-action="close-dialog">إلغاء</button><button type="submit" class="btn btn-primary">${escapeHTML(submit)}</button></div></form>`;
}

export function modalContent(kind, state, item = null, context = "") {
  const active = state.habits.filter((habit) => !habit.deletedAt && habit.status !== "archived");
  const good = active.filter((habit) => habit.type !== "bad");
  const bad = active.filter((habit) => habit.type === "bad");
  const categories = state.categories.map((category) => [category.id, `${category.name}${category.isActive ? "" : " · معطّل"}`]);
  if (kind === "habit") {
    const h = item || { type: "good", level: "growth", categoryId: "cat-learning", trackingType: "quantity", scheduleType: "daily", scheduleRule: { everyNDays: 1 }, startDate: localISODate(), endDate: "", goal: 20, minimum: 10, unit: "صفحة", weight: 2, priority: "normal", preferredTime: "", name: "", why: "", reward: "", usualTriggers: "", quitReason: "", recoveryPlan: "", bookIds: [] };
    const rule = h.scheduleRule || {};
    return { title: item ? "تعديل العادة" : "عادة جديدة", html: formShell("habit", item ? "تعديل العادة" : "إنشاء عادة", `<input type="hidden" name="id" value="${escapeHTML(h.id || "")}"/>${field("اسم العادة", "name", h.name, "text", "required maxlength=160 placeholder=مثال:\u0020قراءة\u0020١٠\u0020صفحات")} ${selectField("نوع العادة", "type", [["good", "عادة إيجابية"], ["bad", "عادة أعمل على تقليلها"]], h.type)}${selectField("المستوى", "level", [["growth", "نمو"], ["maintenance", "صيانة"], ["automatic", "تلقائية"], ["deferred", "مؤجلة"]], h.level)}${selectField("التصنيف", "categoryId", categories, h.categoryId)}${selectField("طريقة القياس", "trackingType", [["check", "إنجاز / نعم أو لا"], ["quantity", "كمية"], ["duration", "مدة"], ["avoidance", "عادة أريد تجنبها"]], h.trackingType)}${selectField("التكرار", "scheduleType", [["daily", "يومي / كل N أيام"], ["weekdays", "أيام أسبوع محددة"], ["times_per_period", "عدد مرات في أسبوع أو شهر"], ["interval", "كل N يوم/أسبوع/شهر"], ["monthly", "موعد شهري محدد"]], h.scheduleType)}${field("أيام الأسبوع (1=اثنين، 7=أحد)", "days", (rule.days || []).join(","), "text", "placeholder=1,3,5", "يستخدم مع جدول أيام محددة.")}${field("عدد المرات المطلوبة في الفترة", "targetCount", rule.targetCount || 3, "number", "min=1 max=31", "يستخدم مع هدف أسبوعي أو شهري.")}${selectField("فترة الهدف", "period", [["week", "الأسبوع"], ["month", "الشهر"]], rule.period || "week")}${field("التكرار كل N", "everyN", rule.everyN || rule.everyNDays || 1, "number", "min=1 max=365")}${selectField("وحدة الفاصل", "intervalUnit", [["day", "يوم"], ["week", "أسبوع"], ["month", "شهر"]], rule.unit || "day")}${selectField("قاعدة الشهر", "monthlyKind", [["day_of_month", "يوم من الشهر"], ["last_day", "آخر يوم من الشهر"], ["nth_weekday", "رقم أسبوع ويوم محدد"]], rule.kind || "day_of_month")}${field("رقم اليوم الشهري", "monthDay", rule.day || 1, "number", "min=1 max=31")}${field("بداية العادة", "startDate", h.startDate || localISODate(), "date", "required")}${field("نهاية العادة (اختياري)", "endDate", h.endDate || "", "date", "", "اتركها فارغة إذا كانت العادة مستمرة.")}${field("الهدف", "goal", h.goal, "number", "min=0 step=0.1", "مطلوب للكمية/المدة فقط.")}${field("الحد الأدنى الجزئي", "minimum", h.minimum, "number", "min=0 step=0.1")}${field("الوحدة", "unit", h.unit, "text", "maxlength=32 placeholder=صفحة، دقيقة، مرة")}${selectField("الوزن", "weight", [[1, "1 · خفيف"], [2, "2 · متوسط"], [3, "3 · مهم"]], h.weight || 1)}${field("الوقت المفضل", "preferredTime", h.preferredTime, "time")}${textareaField("لماذا هذه العادة؟", "why", h.why)}${textareaField("المحفزات المعتادة", "usualTriggers", h.usualTriggers)}${h.type === "bad" ? `${textareaField("سبب التقليل/الإيقاف", "quitReason", h.quitReason)}${textareaField("خطة التعافي", "recoveryPlan", h.recoveryPlan)}` : textareaField("مكافأة صغيرة", "reward", h.reward)}${relationChecks("كتب مرتبطة (اختياري)", "bookIds", visibleRecords(state.books), h.bookIds || [], (book) => book.name)}`)};
  }
  if (kind === "log") {
    const log = item || { habitId: context || good[0]?.id || "", localDate: localISODate(), status: "done", actual: "", note: "", trigger: "", bookId: "" };
    const habit = state.habits.find((h) => h.id === log.habitId) || good[0];
    return { title: item ? "تعديل سجل" : "تسجيل عادة", html: formShell("log", item ? "تعديل السجل اليومي" : "تسجيل سريع", `<input type="hidden" name="id" value="${escapeHTML(log.id || "")}"/>${selectField("العادة", "habitId", good.map((h) => [h.id, h.name]), log.habitId || habit?.id)}${field("التاريخ", "localDate", log.localDate || localISODate(), "date", "required")}${selectField("الحالة", "status", [["done", "تمت"], ["partial", "جزئية"], ["missed", "فائتة"], ["vacation", "إجازة / استثناء"], ["skipped", "تخطي محايد"]], log.status || "done")}${field(`الكمية الفعلية${habit?.unit ? ` (${habit.unit})` : ""}`, "actual", log.actual ?? "", "number", "min=0 step=0.1")}${selectField("كتاب كسياق اختياري", "bookId", [["", "بدون"] , ...visibleRecords(state.books).map((book) => [book.id, book.name])], log.bookId || "")}${textareaField("ملاحظة", "note", log.note)}${field("محفز (اختياري)", "trigger", log.trigger, "text")}`, "حفظ السجل")};
  }
  if (kind === "relapse") {
    const event = item || { habitId: context || bad[0]?.id || "", at: localISODate(), time: "22:00", trigger: "", severity: 2, whatHappened: "", plan24h: "", outcome: "" };
    return { title: item ? "تعديل حدث التعافي" : "تسجيل انتكاسة", html: formShell("relapse", item ? "تعديل حدث" : "تسجيل انتكاسة", `<input type="hidden" name="id" value="${escapeHTML(event.id || "")}"/>${selectField("العادة السيئة", "habitId", bad.map((h) => [h.id, h.name]), event.habitId)}${field("التاريخ", "at", event.at || localISODate(), "date", "required")}${field("الوقت", "time", event.time || "22:00", "time", "required")}${field("المحفز", "trigger", event.trigger, "text", "maxlength=500")}${selectField("الشدة (اختياري)", "severity", [[1,"1 · خفيفة"],[2,"2"],[3,"3 · متوسطة"],[4,"4"],[5,"5 · قوية"]], event.severity || 2)}${textareaField("ماذا حدث؟", "whatHappened", event.whatHappened)}${textareaField("خطوة الـ24 ساعة القادمة", "plan24h", event.plan24h)}${textareaField("النتيجة / ما تعلمته", "outcome", event.outcome)}`, "حفظ الحدث")};
  }
  if (kind === "journal") {
    const entry = item || { date: localISODate(), title: "", intention: "", top3: "", mood: 3, energy: 3, gratitude: "", win: "", learning: "", worries: "", tomorrowPlan: "", body: "", tagIds: [], habitIds: [] };
    const tagChecks = relationChecks("وسوم", "tagIds", state.journalTags, entry.tagIds || [], (tag) => `# ${tag.name}`);
    return { title: item ? "تعديل تدوينة" : "تدوينة جديدة", html: formShell("journal", item ? "تعديل التدوينة" : "صفحة جديدة", `<input type="hidden" name="id" value="${escapeHTML(entry.id || "")}"/>${field("عنوان التدوينة", "title", entry.title, "text", "required maxlength=200")}${field("التاريخ", "date", entry.date || localISODate(), "date", "required")}${selectField("المزاج (اختياري)", "mood", [["", "بدون"] ,[1,"1"],[2,"2"],[3,"3"],[4,"4"],[5,"5"]], entry.mood ?? "")}${selectField("الطاقة (اختياري)", "energy", [["", "بدون"],[1,"1"],[2,"2"],[3,"3"],[4,"4"],[5,"5"]], entry.energy ?? "")}${textareaField("نية اليوم", "intention", entry.intention)}${textareaField("أهم 3 أشياء (كل واحدة في سطر)", "top3", entry.top3)}${textareaField("امتنان", "gratitude", entry.gratitude)}${textareaField("فوز صغير", "win", entry.win)}${textareaField("ما تعلمته", "learning", entry.learning)}${textareaField("ما يقلقني", "worries", entry.worries)}${textareaField("خطة الغد", "tomorrowPlan", entry.tomorrowPlan)}${textareaField("ملاحظات حرة", "body", entry.body)}${tagChecks}${relationChecks("عادات مرتبطة (يمكن اختيار أكثر من واحدة)", "habitIds", active, entry.habitIds || [])}`, "حفظ التدوينة")};
  }
  if (kind === "book") {
    const book = item || { name: "", author: "", status: "want_to_read", category: "", format: "", language: "", totalPages: "", pagesBeforeTracking: 0, startDate: "", endDate: "", rating: "", priority: "normal", keyIdea: "", notesQuotes: "", url: "", habitIds: [] };
    const linkedHabits = state.habitBooks.filter((link) => link.bookId === book.id).map((link) => link.habitId);
    const habitIds = item ? linkedHabits : book.habitIds || [];
    return { title: item ? "تعديل كتاب" : "إضافة كتاب", html: formShell("book", item ? "تعديل بيانات الكتاب" : "كتاب جديد", `<input type="hidden" name="id" value="${escapeHTML(book.id || "")}"/>${field("اسم الكتاب", "name", book.name, "text", "required maxlength=240")}${field("المؤلف", "author", book.author)}${selectField("الحالة", "status", [["want_to_read","أريد قراءته"],["reading","أقرأ الآن"],["on_hold","متوقف مؤقتًا"],["completed","مكتمل"],["abandoned","لم أكمله"]], book.status)}${field("التصنيف", "category", book.category)}${field("الصيغة", "format", book.format)}${field("اللغة", "language", book.language)}${field("إجمالي الصفحات", "totalPages", book.totalPages, "number", "min=0 step=1")}${field("صفحات قبل بدء التتبع", "pagesBeforeTracking", book.pagesBeforeTracking, "number", "min=0 step=1")}${field("تاريخ البدء", "startDate", book.startDate, "date")}${field("تاريخ الانتهاء", "endDate", book.endDate, "date")}${selectField("التقييم", "rating", [["","بدون"],[1,"1 نجمة"],[2,"2 نجمتان"],[3,"3 نجوم"],[4,"4 نجوم"],[5,"5 نجوم"]], book.rating || "")}${field("رابط خارجي", "url", book.url, "url")}${textareaField("الفكرة الأساسية", "keyIdea", book.keyIdea)}${textareaField("ملاحظات واقتباسات", "notesQuotes", book.notesQuotes)}${relationChecks("عادات مرتبطة", "habitIds", active, habitIds)}`, "حفظ الكتاب")};
  }
  if (kind === "reading") {
    const session = item || { bookId: context || visibleRecords(state.books)[0]?.id || "", readOn: localISODate(), pagesRead: "", pageStart: "", pageEnd: "", durationMinutes: "", note: "" };
    return { title: item ? "تعديل جلسة" : "جلسة قراءة", html: formShell("reading", item ? "تعديل جلسة القراءة" : "سجل جلسة جديدة", `<input type="hidden" name="id" value="${escapeHTML(session.id || "")}"/>${selectField("الكتاب", "bookId", visibleRecords(state.books).map((book) => [book.id, book.name]), session.bookId)}${field("التاريخ", "readOn", session.readOn || localISODate(), "date", "required")}${field("عدد الصفحات", "pagesRead", session.pagesRead, "number", "min=0 step=1")}${field("من صفحة", "pageStart", session.pageStart, "number", "min=1 step=1")}${field("إلى صفحة", "pageEnd", session.pageEnd, "number", "min=1 step=1")}${field("مدة القراءة بالدقائق", "durationMinutes", session.durationMinutes, "number", "min=0 step=1")}${textareaField("ملاحظة", "note", session.note, "أدخل صفحات أو مدة قراءة على الأقل.")}`, "حفظ الجلسة")};
  }
  if (kind === "focus") {
    const week = item || { startDate: startOfWeek(localISODate(), Number(state.preferences.weekStartsOn || 1)), endDate: endOfWeek(localISODate(), Number(state.preferences.weekStartsOn || 1)), habitIds: [], rating: 3, worked: "", failed: "", adjustment: "" };
    return { title: item ? "تعديل مراجعة" : "تركيز أسبوعي", html: formShell("focus", item ? "تعديل الأسبوع" : "مراجعة أسبوع جديد", `<input type="hidden" name="id" value="${escapeHTML(week.id || "")}"/>${field("بداية الأسبوع", "startDate", week.startDate, "date", "required")}${field("نهاية الأسبوع", "endDate", week.endDate, "date", "required")}${selectField("التقييم", "rating", [[1,"1 / 5"],[2,"2 / 5"],[3,"3 / 5"],[4,"4 / 5"],[5,"5 / 5"]], week.rating || 3)}${relationChecks("اختر عادات التركيز (أكثر من 5 يظهر تحذيرًا)", "habitIds", good, week.habitIds || [])}${textareaField("ما الذي نجح؟", "worked", week.worked)}${textareaField("ما الذي كان صعبًا؟", "failed", week.failed)}${textareaField("ما التعديل للأسبوع القادم؟", "adjustment", week.adjustment)}`, "حفظ المراجعة")};
  }
  if (kind === "achievement") {
    const achievement = item || { name: "", habitId: "", conditionType: "completed_days", conditionValue: 7, enabled: true };
    return { title: item ? "تعديل إنجاز" : "إنجاز جديد", html: formShell("achievement", item ? "تعديل شرط الإنجاز" : "تعريف إنجاز", `<input type="hidden" name="id" value="${escapeHTML(achievement.id || "")}"/>${field("اسم الإنجاز", "name", achievement.name, "text", "required maxlength=160")}${selectField("العادة (فارغ = كل العادات)", "habitId", [["", "كل العادات"], ...active.map((habit) => [habit.id, habit.name])], achievement.habitId || "")}${selectField("نوع الشرط", "conditionType", [["clean_days","أيام نظيفة"],["total_quantity","كمية إجمالية"],["completed_days","أيام مكتملة"]], achievement.conditionType)}${field("الهدف المطلوب", "conditionValue", achievement.conditionValue || 7, "number", "min=1 step=0.1 required")}`, "حفظ الشرط")};
  }
  if (kind === "category") {
    const category = item || { name: "", slug: "", sortOrder: state.categories.length, isActive: true };
    return { title: item ? "تعديل تصنيف" : "تصنيف جديد", html: formShell("category", item ? "تعديل مجال العادات" : "إضافة مجال للعادات", `<input type="hidden" name="id" value="${escapeHTML(category.id || "")}"/>${field("اسم التصنيف", "name", category.name, "text", "required maxlength=120")}${field("الترتيب", "sortOrder", category.sortOrder ?? 0, "number", "min=0 max=65535 step=1")}`, "حفظ التصنيف") };
  }
  if (kind === "tag") {
    const tag = item || { name: "", color: "teal" };
    return { title: item ? "تعديل وسم" : "وسم جديد", html: formShell("tag", item ? "تعديل وسم اليوميات" : "إضافة وسم", `<input type="hidden" name="id" value="${escapeHTML(tag.id || "")}"/>${field("اسم الوسم", "name", tag.name, "text", "required maxlength=80")}${selectField("اللون", "color", [["teal","فيروزي"],["gold","ذهبي"],["violet","بنفسجي"],["rose","وردي"],["blue","أزرق"]], tag.color || "teal")}`, "حفظ الوسم") };
  }
  if (kind === "reminder") {
    const reminder = item || { habitId: active[0]?.id || "", localTime: "20:00", timezoneOverride: "", daysOfWeek: [], enabled: true, snoozeMinutes: 10, quietHoursRespected: true };
    const days = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"].map((name, id) => ({ id, name }));
    return { title: item ? "تعديل تذكير" : "تذكير جديد", html: formShell("reminder", item ? "تعديل تذكير العادة" : "إضافة تذكير للعادة", `<input type="hidden" name="id" value="${escapeHTML(reminder.id || "")}"/>${selectField("العادة", "habitId", active.map((habit) => [habit.id, habit.name]), reminder.habitId)}${field("الوقت المحلي", "localTime", reminder.localTime || "20:00", "time", "required")}${selectField("المنطقة الزمنية", "timezoneOverride", [["", "منطقة الحساب"],["Africa/Cairo","القاهرة"],["Asia/Riyadh","الرياض"],["Asia/Dubai","دبي"],["Europe/London","لندن"],["UTC","UTC"]], reminder.timezoneOverride || "")}${relationChecks("أيام محددة (اتركها فارغة لاستخدام جدول العادة)", "daysOfWeek", days, reminder.daysOfWeek || [])}${field("مدة التأجيل بالدقائق", "snoozeMinutes", reminder.snoozeMinutes ?? 10, "number", "min=0 max=1440 step=1")}${selectField("احترام ساعات الهدوء", "quietHoursRespected", [["true","نعم"],["false","لا"]], String(reminder.quietHoursRespected !== false))}${selectField("الحالة", "enabled", [["true","مفعّل"],["false","متوقف"]], String(reminder.enabled !== false))}`, "حفظ التذكير") };
  }
  return { title: "غير متاح", html: formShell("none", "غير متاح", "") };
}
