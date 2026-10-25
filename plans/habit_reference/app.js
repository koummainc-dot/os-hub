import { addLocalDays, localDateTimeToUtc, localISODate, uid } from "./src/data.js?v=20261004-1849";
import { loadState, persistState, resetState, downloadJson, downloadCsv } from "./src/storage.js?v=20261004-1849";
import { achievementValue, completedCountInCurrentPeriod, endOfWeek, quantityStatus, startOfWeek } from "./src/domain.js?v=20261004-1849";
import { escapeHTML, modalContent, renderApp } from "./src/views.js?v=20261004-1849";

const app = document.querySelector("#app");
const dialog = document.querySelector("#app-dialog");
const toastRegion = document.querySelector("#toast-region");
let state = loadState();
let page = location.hash.replace(/^#\/?/, "") || "dashboard";
let query = "";
let habitFilter = "all";
const knownPages = new Set(["dashboard", "habits", "logs", "relapses", "journal", "books", "focus", "achievements", "settings"]);
if (!knownPages.has(page)) page = "dashboard";

function refresh({ save = false } = {}) {
  if (save) persistState(state);
  app.innerHTML = renderApp(state, page, query, habitFilter);
  app.querySelectorAll(".habit-card-compact").forEach((card) => {
    const title = card.querySelector("h3")?.textContent;
    const habit = state.habits.find((item) => item.name === title);
    if (!habit) return;
    const actions = document.createElement("div");
    actions.className = "card-actions habit-card-actions";
    if (habit.type === "bad") {
      const actionButton = document.createElement("button");
      actionButton.type = "button";
      actionButton.className = "btn btn-sm btn-soft-danger";
      actionButton.dataset.action = "add-relapse";
      actionButton.dataset.habit = habit.id;
      actionButton.textContent = "تسجيل انتكاسة";
      actions.append(actionButton);
    } else {
      for (const [status, label, cls] of [["done", "تم", "btn-primary"], ["partial", "جزئي", "btn-outline"], ["skipped", "تخطي", "btn-quiet"], ["vacation", "إجازة", "btn-quiet"]]) {
        const actionButton = document.createElement("button");
        actionButton.type = "button";
        actionButton.className = `btn btn-sm ${cls}`;
        actionButton.dataset.action = "quick-log";
        actionButton.dataset.id = habit.id;
        actionButton.dataset.status = status;
        actionButton.textContent = label;
        actions.append(actionButton);
      }
    }
    card.append(actions);
  });
  app.querySelectorAll(".book-card").forEach((card) => {
    const title = card.querySelector(".book-info h3")?.textContent;
    const book = state.books.find((item) => item.name === title);
    const source = book?.id === "book-deep-work" ? "/public/deep-work.jpg" : book?.id === "book-atomic" ? "/public/atomic-habits.jpg" : "";
    if (!source) return;
    const cover = card.querySelector(".book-cover");
    const image = new Image();
    image.src = source;
    image.alt = `غلاف كتاب ${book.name}`;
    image.loading = "lazy";
    cover?.classList.add("has-cover");
    cover?.replaceChildren(image);
  });
  app.querySelectorAll(".library-row").forEach((row) => {
    const editButton = row.querySelector('[data-action="edit-habit"]');
    const habit = state.habits.find((item) => item.id === editButton?.dataset.id);
    if (!habit || habit.status === "archived") return;
    const control = document.createElement("button");
    control.type = "button";
    control.className = "btn btn-quiet btn-sm";
    control.dataset.action = habit.status === "paused" ? "resume-habit" : "pause-habit";
    control.dataset.id = habit.id;
    control.textContent = habit.status === "paused" ? "استئناف" : "إيقاف مؤقت";
    const archiveButton = row.querySelector('[data-action="archive-habit"], [data-action="restore-habit"]');
    archiveButton?.parentElement?.insertBefore(control, archiveButton);
    if (habit.status === "paused") {
      const badge = document.createElement("span");
      badge.className = "pill pill-neutral";
      badge.textContent = "متوقفة مؤقتًا";
      row.insertBefore(badge, row.querySelector(".library-progress"));
    }
  });
  document.documentElement.lang = "ar";
  document.documentElement.dir = "rtl";
}

function toast(message, type = "success") {
  const node = document.createElement("div");
  node.className = `toast toast-${type}`;
  node.textContent = message;
  toastRegion.append(node);
  setTimeout(() => node.remove(), 3300);
}

function navigate(nextPage) {
  if (!knownPages.has(nextPage)) return;
  page = nextPage;
  query = "";
  if (location.hash !== `#${nextPage}`) history.replaceState(null, "", `#${nextPage}`);
  document.body.classList.remove("menu-open");
  refresh();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setupHabitModal(item) {
  const form = dialog.querySelector('form[data-form="habit"]');
  if (!form) return;
  const grid = form.querySelector(".form-grid");
  const monthDayField = form.elements.namedItem("monthDay")?.closest(".field");
  const rule = item?.scheduleRule || {};
  const makeSelectField = (name, label, options, selected) => {
    const wrapper = document.createElement("label");
    wrapper.className = "field";
    const caption = document.createElement("span");
    caption.textContent = label;
    const select = document.createElement("select");
    select.name = name;
    for (const [value, text] of options) {
      const option = document.createElement("option");
      option.value = String(value);
      option.textContent = text;
      option.selected = String(value) === String(selected);
      select.append(option);
    }
    wrapper.append(caption, select);
    return wrapper;
  };
  const weekdays = [[1, "الاثنين"], [2, "الثلاثاء"], [3, "الأربعاء"], [4, "الخميس"], [5, "الجمعة"], [6, "السبت"], [7, "الأحد"]];
  const nthField = makeSelectField("monthlyNth", "رقم الأسبوع", [[1,"الأول"],[2,"الثاني"],[3,"الثالث"],[4,"الرابع"],[-1,"الأخير"]], rule.nth || 1);
  const weekdayField = makeSelectField("monthlyWeekday", "اليوم داخل الشهر", weekdays, rule.weekday || 1);
  if (monthDayField) {
    monthDayField.insertAdjacentElement("afterend", nthField);
    nthField.insertAdjacentElement("afterend", weekdayField);
  } else grid.append(nthField, weekdayField);
  state.habitRelations ||= [];
  const linkedHabitIds = new Set(state.habitRelations.filter((link) => link.sourceHabitId === item?.id).map((link) => link.targetHabitId));
  const relatedHabits = state.habits.filter((habit) => habit.id !== item?.id && !habit.deletedAt);
  if (relatedHabits.length) {
    const relationField = document.createElement("fieldset");
    relationField.className = "field field-wide check-field";
    const legend = document.createElement("legend");
    legend.textContent = "عادات مرتبطة";
    const list = document.createElement("div");
    list.className = "check-list";
    for (const habit of relatedHabits) {
      const label = document.createElement("label");
      label.className = "check-option";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.name = "relatedHabitIds";
      checkbox.value = habit.id;
      checkbox.checked = linkedHabitIds.has(habit.id);
      const text = document.createElement("span");
      text.textContent = `${habit.name}${habit.status === "archived" ? " · مؤرشفة" : ""}`;
      label.append(checkbox, text);
      list.append(label);
    }
    relationField.append(legend, list);
    grid.append(relationField);
  }
  const scheduleType = form.elements.namedItem("scheduleType");
  const monthlyKind = form.elements.namedItem("monthlyKind");
  const trackingType = form.elements.namedItem("trackingType");
  const showField = (name, visible) => {
    const element = form.elements.namedItem(name);
    const wrapper = element?.closest(".field");
    if (wrapper) wrapper.style.display = visible ? "" : "none";
  };
  const sync = () => {
    const schedule = scheduleType.value;
    const metric = trackingType.value;
    const monthKind = monthlyKind.value;
    showField("days", schedule === "weekdays");
    showField("targetCount", schedule === "times_per_period");
    showField("period", schedule === "times_per_period");
    showField("everyN", schedule === "daily" || schedule === "interval");
    showField("intervalUnit", schedule === "interval");
    showField("monthlyKind", schedule === "monthly");
    showField("monthDay", schedule === "monthly" && monthKind === "day_of_month");
    nthField.style.display = schedule === "monthly" && monthKind === "nth_weekday" ? "" : "none";
    weekdayField.style.display = schedule === "monthly" && monthKind === "nth_weekday" ? "" : "none";
    const quantitative = metric === "quantity" || metric === "duration";
    showField("goal", quantitative);
    showField("minimum", quantitative);
    showField("unit", quantitative || metric === "avoidance");
  };
  form.addEventListener("change", sync);
  sync();
}

function openModal(kind, item = null, context = "") {
  if (kind === "habit" && item) {
    item = { ...item, bookIds: state.habitBooks.filter((link) => link.habitId === item.id).map((link) => link.bookId) };
  }
  if (kind === "log") {
    const targetHabit = item?.habitId ? logHabit(item.habitId) : state.habits.find((habit) => habit.type !== "bad" && habit.status === "active");
    const date = item?.localDate || localISODate();
    const sessionsToday = state.logs.filter((log) => log.habitId === targetHabit?.id && log.localDate === date && !log.deletedAt).length;
    const key = item?.occurrenceKey || `${date}:${targetHabit?.scheduleType === "times_per_period" ? `session-${sessionsToday + 1}` : "main"}`;
    item = { ...(item || {}), occurrenceKey: key };
  }
  const content = modalContent(kind, state, item, context);
  dialog.innerHTML = content.html;
  dialog.setAttribute("aria-label", content.title);
  if (kind === "reading") {
    const select = dialog.querySelector('select[name="bookId"]');
    if (select && item && !item.bookId) {
      const detached = document.createElement("option");
      detached.value = "";
      detached.textContent = item.bookTitleSnapshot ? `غير مرتبط · ${item.bookTitleSnapshot}` : "جلسة مستقلة / كتاب محذوف";
      select.insertBefore(detached, select.firstChild);
      select.value = "";
    } else if (select && item?.bookId && !Array.from(select.options).some((option) => option.value === item.bookId)) {
      const linkedBook = state.books.find((book) => book.id === item.bookId);
      if (linkedBook) {
        const option = document.createElement("option");
        option.value = linkedBook.id;
        option.textContent = `${linkedBook.name} · في السلة`;
        select.append(option);
        select.value = linkedBook.id;
      }
    }
  }
  if (kind === "log") {
    const select = dialog.querySelector('select[name="bookId"]');
    if (select && item && !item.bookId) {
      const detached = document.createElement("option");
      detached.value = "";
      detached.textContent = item.bookTitleSnapshot ? `غير مرتبط · ${item.bookTitleSnapshot}` : "بدون كتاب";
      select.insertBefore(detached, select.firstChild);
      select.value = "";
    } else if (select && item?.bookId && !Array.from(select.options).some((option) => option.value === item.bookId)) {
      const linkedBook = state.books.find((book) => book.id === item.bookId);
      if (linkedBook) {
        const option = document.createElement("option");
        option.value = linkedBook.id;
        option.textContent = `${linkedBook.name} · في السلة`;
        select.append(option);
        select.value = linkedBook.id;
      }
    }
  }
  if (kind === "journal") {
    const form = dialog.querySelector('form[data-form="journal"]');
    const dateField = form?.querySelector('input[name="date"]')?.closest(".field");
    if (form && dateField) {
      const label = document.createElement("label");
      label.className = "field";
      const caption = document.createElement("span"); caption.textContent = "وقت التدوينة (اختياري)";
      const input = document.createElement("input"); input.type = "time"; input.name = "entryTime"; input.value = item?.entryTime || "";
      label.append(caption, input); dateField.after(label);
    }
  }
  if (kind === "book") {
    const form = dialog.querySelector('form[data-form="book"]');
    const urlField = form?.querySelector('input[name="url"]')?.closest(".field");
    if (form && urlField) {
      const label = document.createElement("label"); label.className = "field";
      const caption = document.createElement("span"); caption.textContent = "رابط غلاف الكتاب (HTTPS اختياري)";
      const input = document.createElement("input"); input.type = "url"; input.name = "cover"; input.maxLength = 2048;
      input.placeholder = "https://…"; input.value = item?.cover || "";
      const hint = document.createElement("small"); hint.textContent = "تحميل صورة خارجية يرسل طلبًا لمضيفها؛ لا تضع رابطًا خاصًا.";
      label.append(caption, input, hint); urlField.before(label);
    }
  }
  if (kind === "relapse") {
    const form = dialog.querySelector('form[data-form="relapse"]');
    const habitField = form?.querySelector('select[name="habitId"]')?.closest(".field");
    if (form && habitField) {
      const label = document.createElement("label"); label.className = "field";
      const caption = document.createElement("span"); caption.textContent = "عادة مرتبطة (اختياري)";
      const select = document.createElement("select"); select.name = "relatedHabitId";
      const blank = document.createElement("option"); blank.value = ""; blank.textContent = "بدون"; select.append(blank);
      for (const habit of state.habits.filter((entry) => !entry.deletedAt && entry.id !== item?.habitId)) {
        const option = document.createElement("option"); option.value = habit.id; option.textContent = habit.name;
        if (habit.id === item?.relatedHabitId) option.selected = true;
        select.append(option);
      }
      label.append(caption, select); habitField.after(label);
    }
  }
  if (kind === "habit") {
    setupHabitModal(item);
    const form = dialog.querySelector('form[data-form="habit"]');
    const startDateField = form?.querySelector('input[name="startDate"]')?.closest(".field");
    if (form && startDateField) {
      const label = document.createElement("label"); label.className = "field";
      const caption = document.createElement("span"); caption.textContent = "تسري الإعدادات من تاريخ";
      const input = document.createElement("input"); input.type = "date"; input.name = "effectiveFrom"; input.required = true;
      const startInput = form.querySelector('input[name="startDate"]');
      input.value = item ? (item.startDate > localISODate() ? item.startDate : localISODate()) : (startInput?.value || localISODate());
      if (!item && startInput) startInput.addEventListener("change", () => { input.value = startInput.value; });
      label.append(caption, input); startDateField.after(label);
      const hint = document.createElement("small"); hint.textContent = "يُحفظ الجدول/الهدف بنسخة مؤرخة؛ السجلات السابقة لا تتغير."; label.append(hint);
    }
  }
  if (kind === "log") {
    const occurrence = document.createElement("input");
    occurrence.type = "hidden";
    occurrence.name = "occurrenceKey";
    occurrence.value = item?.occurrenceKey || "";
    dialog.querySelector('form[data-form="log"]')?.append(occurrence);
  }
  if (!dialog.open) dialog.showModal();
  const first = dialog.querySelector("input:not([type=hidden]), select, textarea");
  first?.focus({ preventScroll: true });
}

function closeModal() {
  if (dialog.open) dialog.close();
  dialog.innerHTML = "";
}

function byId(collection, id) { return collection.find((item) => item.id === id); }
function setItem(collection, id, values) {
  const existing = byId(collection, id);
  if (existing) Object.assign(existing, values, { updatedAt: new Date().toISOString() });
  else collection.unshift({ id: id || uid(), ...values });
  return existing || collection[0];
}
function getAll(formData, key) { return formData.getAll(key).map(String); }
function valueOrEmpty(formData, key) { return String(formData.get(key) ?? "").trim(); }
function numberOrNull(value) { return value === "" || value == null ? null : Number(value); }
function logHabit(id) { return state.habits.find((habit) => habit.id === id); }
function syncHabitBooks(habitId, bookIds) {
  state.habitBooks = state.habitBooks.filter((link) => link.habitId !== habitId);
  for (const bookId of bookIds) state.habitBooks.push({ habitId, bookId, linkType: "related" });
}
function syncHabitRelations(habitId, targetIds) {
  state.habitRelations ||= [];
  const previous = state.habitRelations.filter((link) => link.sourceHabitId === habitId);
  state.habitRelations = state.habitRelations.filter((link) => link.sourceHabitId !== habitId);
  for (const targetHabitId of targetIds) {
    const existing = previous.find((link) => link.targetHabitId === targetHabitId);
    state.habitRelations.push(existing || { id: uid("relation"), userId: state.userId, sourceHabitId: habitId, targetHabitId, relationType: "related", isDirected: true });
  }
}
function recordAudit(entityType, entityId, action, changedFields = []) {
  state.auditEvents.unshift({ id: uid("audit"), userId: state.userId, entityType, entityId, action, changedFields, at: new Date().toISOString() });
  state.auditEvents = state.auditEvents.slice(0, 500);
}
function saveAndRefresh(message) {
  persistState(state);
  closeModal();
  refresh();
  if (message) toast(message);
}

function scheduleRuleFromForm(formData) {
  const scheduleType = valueOrEmpty(formData, "scheduleType");
  const days = valueOrEmpty(formData, "days").split(/[ ,،]+/).map(Number).filter((day) => day >= 1 && day <= 7);
  const everyN = Math.max(1, Number(valueOrEmpty(formData, "everyN") || 1));
  if (scheduleType === "daily") return { scheduleType, scheduleRule: { everyNDays: everyN } };
  if (scheduleType === "weekdays") return { scheduleType, scheduleRule: { days: [...new Set(days)].sort((a, b) => a - b) } };
  if (scheduleType === "times_per_period") return { scheduleType, scheduleRule: { period: valueOrEmpty(formData, "period") || "week", targetCount: Math.max(1, Number(valueOrEmpty(formData, "targetCount") || 1)), weekStartsOn: Number(state.preferences.weekStartsOn ?? 1) } };
  if (scheduleType === "interval") return { scheduleType, scheduleRule: { unit: valueOrEmpty(formData, "intervalUnit") || "day", everyN, anchorDate: valueOrEmpty(formData, "startDate") || localISODate() } };
  if (scheduleType === "monthly") {
    const kind = valueOrEmpty(formData, "monthlyKind") || "day_of_month";
    if (kind === "last_day") return { scheduleType, scheduleRule: { kind } };
    if (kind === "nth_weekday") return { scheduleType, scheduleRule: { kind, nth: Number(valueOrEmpty(formData, "monthlyNth") || 1), weekday: Number(valueOrEmpty(formData, "monthlyWeekday") || 1) } };
    return { scheduleType, scheduleRule: { kind, day: Number(valueOrEmpty(formData, "monthDay") || 1), missingDay: "skip" } };
  }
  return { scheduleType: "daily", scheduleRule: { everyNDays: 1 } };
}

function addHabitVersion(habit, effectiveFrom) {
  const version = {
    id: uid("version"), effectiveFrom,
    trackingType: habit.trackingType, scheduleType: habit.scheduleType, scheduleRule: structuredClone(habit.scheduleRule),
    startDate: habit.startDate, endDate: habit.endDate || "", goal: numberOrNull(habit.goal), minimum: numberOrNull(habit.minimum), unit: habit.unit,
    weight: Number(habit.weight || 1), priority: habit.priority || null, preferredTime: habit.preferredTime || null, timezone: state.preferences.timezone,
  };
  habit.versions ||= [];
  const sameDate = habit.versions.find((entry) => entry.effectiveFrom === effectiveFrom);
  if (sameDate) Object.assign(sameDate, version, { id: sameDate.id });
  else habit.versions.push(version);
  habit.versions.sort((left, right) => left.effectiveFrom.localeCompare(right.effectiveFrom));
  habit.versions.forEach((entry, index) => { entry.effectiveTo = habit.versions[index + 1]?.effectiveFrom || null; });
}

function saveHabit(formData) {
  const id = valueOrEmpty(formData, "id") || uid("habit");
  const current = byId(state.habits, id);
  const type = valueOrEmpty(formData, "type") || "good";
  let trackingType = valueOrEmpty(formData, "trackingType") || "check";
  if (type === "bad") trackingType = "avoidance";
  if (type === "good" && trackingType === "avoidance") trackingType = "check";
  const schedule = scheduleRuleFromForm(formData);
  const startDate = valueOrEmpty(formData, "startDate");
  const endDate = valueOrEmpty(formData, "endDate");
  const effectiveFrom = valueOrEmpty(formData, "effectiveFrom") || (current ? localISODate() : startDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom) || (startDate && effectiveFrom < startDate)) return toast("تاريخ سريان الإعدادات يجب أن يكون صحيحًا ولا يسبق بداية العادة.", "error");
  if (endDate && endDate < startDate) return toast("تاريخ النهاية لا يمكن أن يسبق البداية.", "error");
  if (schedule.scheduleType === "weekdays" && !schedule.scheduleRule.days.length) return toast("اختر يومًا واحدًا على الأقل للجدول الأسبوعي.", "error");
  const goal = trackingType === "quantity" || trackingType === "duration" ? numberOrNull(valueOrEmpty(formData, "goal")) : null;
  const minimum = trackingType === "quantity" || trackingType === "duration" ? numberOrNull(valueOrEmpty(formData, "minimum")) : null;
  if ((trackingType === "quantity" || trackingType === "duration") && (!goal || goal <= 0)) return toast("أدخل هدفًا أكبر من صفر للكمية أو المدة.", "error");
  if (minimum != null && (minimum < 0 || minimum > goal)) return toast("الحد الأدنى يجب أن يكون بين صفر والهدف.", "error");
  const values = {
    userId: state.userId, name: valueOrEmpty(formData, "name"), type, level: valueOrEmpty(formData, "level"),
    status: current?.status || "active", categoryId: valueOrEmpty(formData, "categoryId"), trackingType,
    ...schedule, startDate, endDate, goal: goal ?? "", minimum: minimum ?? "", unit: valueOrEmpty(formData, "unit"),
    weight: Number(valueOrEmpty(formData, "weight") || 1), priority: valueOrEmpty(formData, "priority") || "normal",
    preferredTime: valueOrEmpty(formData, "preferredTime"), why: valueOrEmpty(formData, "why"), reward: valueOrEmpty(formData, "reward"),
    usualTriggers: valueOrEmpty(formData, "usualTriggers"), quitReason: valueOrEmpty(formData, "quitReason"),
    recoveryPlan: valueOrEmpty(formData, "recoveryPlan"), archivedAt: current?.archivedAt || "", deletedAt: current?.deletedAt || "",
  };
  if (!values.name) return toast("اسم العادة مطلوب.", "error");
  if (current && current.type !== type && (state.logs.some((log) => log.habitId === id) || state.relapses.some((relapse) => relapse.habitId === id))) {
    return toast("لا يمكن تغيير نوع عادة لها تاريخ؛ أنشئ عادة جديدة حتى لا يتغير معنى سجلاتها القديمة.", "error");
  }
  if (current) {
    const scheduleChanged = JSON.stringify(current.scheduleRule) !== JSON.stringify(values.scheduleRule) || current.scheduleType !== values.scheduleType || current.trackingType !== values.trackingType || Number(current.goal || 0) !== Number(values.goal || 0) || Number(current.minimum || 0) !== Number(values.minimum || 0) || current.unit !== values.unit || current.startDate !== values.startDate || current.endDate !== values.endDate;
    if (scheduleChanged && !current.versions?.length) addHabitVersion(current, current.startDate);
    Object.assign(current, values);
    if (scheduleChanged) addHabitVersion(current, effectiveFrom);
  } else {
    Object.assign(values, { id, versions: [] });
    state.habits.unshift(values);
    addHabitVersion(values, startDate);
  }
  syncHabitBooks(id, getAll(formData, "bookIds"));
  syncHabitRelations(id, getAll(formData, "relatedHabitIds"));
  recordAudit("habit", id, current ? "updated" : "created", Object.keys(values));
  saveAndRefresh(current ? "تم تحديث العادة." : "تمت إضافة العادة.");
}

function saveLog(formData) {
  const id = valueOrEmpty(formData, "id");
  const habitId = valueOrEmpty(formData, "habitId");
  const habit = logHabit(habitId);
  if (!habit) return toast("اختر عادة موجودة.", "error");
  if (habit.type === "bad") return toast("العادة التي تريد تقليلها تُسجّل عبر التعافي والانتكاسات، لا كسجل إنجاز يومي.", "error");
  const localDate = valueOrEmpty(formData, "localDate") || localISODate();
  const habitVersion = (habit.versions || []).filter((version) => version.effectiveFrom <= localDate && (!version.effectiveTo || localDate < version.effectiveTo)).sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom)).at(-1) || habit;
  const rawActual = numberOrNull(valueOrEmpty(formData, "actual"));
  if (rawActual != null && (!Number.isFinite(rawActual) || rawActual < 0)) return toast("الكمية الفعلية يجب أن تكون صفرًا أو أكثر.", "error");
  let status = valueOrEmpty(formData, "status") || "done";
  let actual = rawActual;
  if (["quantity", "duration"].includes(habitVersion.trackingType)) {
    const goal = Number(habitVersion.goal || 0);
    const minimum = Number(habitVersion.minimum || 0);
    if (actual == null && status === "done") actual = goal;
    if (actual != null) {
      status = quantityStatus(actual, goal, minimum);
    }
  }
  const selectedKey = valueOrEmpty(formData, "occurrenceKey");
  const previousSuffix = selectedKey.includes(":") ? selectedKey.split(":").slice(1).join(":") : "main";
  const occurrenceKey = `${localDate}:${previousSuffix || "main"}`;
  const existing = id ? byId(state.logs, id) : state.logs.find((log) => log.habitId === habitId && log.occurrenceKey === occurrenceKey && !log.deletedAt);
  const selectedBookId = valueOrEmpty(formData, "bookId");
  const selectedBook = selectedBookId ? byId(state.books, selectedBookId) : null;
  if (selectedBookId && !selectedBook) return toast("الكتاب المرتبط غير موجود.", "error");
  const values = {
    userId: state.userId, habitId, localDate, timezoneSnapshot: existing?.timezoneSnapshot || state.preferences.timezone, occurrenceKey, status, actual,
    goalSnapshot: Number(habitVersion.goal || 0) || null, minimumSnapshot: numberOrNull(habitVersion.minimum), unitSnapshot: habitVersion.unit,
    weightSnapshot: Number(habitVersion.weight || 1), note: valueOrEmpty(formData, "note"), trigger: valueOrEmpty(formData, "trigger"),
    bookId: selectedBook?.id || null, bookTitleSnapshot: selectedBook?.name || existing?.bookTitleSnapshot || "", deletedAt: "",
  };
  if (existing) Object.assign(existing, values);
  else state.logs.unshift({ id: uid("log"), ...values });
  recordAudit("daily_log", existing?.id || state.logs[0].id, existing ? "updated" : "created", ["status", "actual", "note"]);
  saveAndRefresh(existing ? "تم تحديث السجل وإعادة احتساب التقدم." : "تم التسجيل وتحديث التقدم.");
}

function saveRelapse(formData) {
  const id = valueOrEmpty(formData, "id");
  const habitId = valueOrEmpty(formData, "habitId");
  const habit = logHabit(habitId);
  if (!habit || habit.type !== "bad") return toast("الانتكاسة ترتبط بعادة من نوع «أريد تقليلها» فقط.", "error");
  const at = valueOrEmpty(formData, "at") || localISODate();
  const time = valueOrEmpty(formData, "time") || "12:00";
  const timezoneSnapshot = (id ? byId(state.relapses, id)?.timezoneSnapshot : "") || state.preferences.timezone || "UTC";
  let eventAtUtc;
  try { eventAtUtc = localDateTimeToUtc(at, time, timezoneSnapshot); }
  catch { return toast("تعذر تحويل التاريخ والوقت إلى UTC. تحقق من المنطقة الزمنية والوقت المحلي.", "error"); }
  const severity = Number(valueOrEmpty(formData, "severity") || 1);
  if (!Number.isInteger(severity) || severity < 1 || severity > 5) return toast("شدة الحدث يجب أن تكون من 1 إلى 5.", "error");
  const relatedHabitId = valueOrEmpty(formData, "relatedHabitId");
  if (relatedHabitId && (relatedHabitId === habitId || !state.habits.some((item) => item.id === relatedHabitId && !item.deletedAt))) return toast("اختر عادة مرتبطة مختلفة وموجودة.", "error");
  const values = { userId: state.userId, habitId, at, localDate: at, time, eventAtUtc, timezoneSnapshot,
    relatedHabitId: relatedHabitId || null, trigger: valueOrEmpty(formData, "trigger"), severity,
    whatHappened: valueOrEmpty(formData, "whatHappened"), plan24h: valueOrEmpty(formData, "plan24h"), outcome: valueOrEmpty(formData, "outcome"), deletedAt: "" };
  const existing = id ? byId(state.relapses, id) : null;
  if (existing) Object.assign(existing, values);
  else state.relapses.unshift({ id: uid("relapse"), ...values });
  recordAudit("relapse", existing?.id || state.relapses[0].id, existing ? "updated" : "created", ["at", "trigger", "severity", "plan24h"]);
  saveAndRefresh("تم حفظ الحدث وإعادة حساب أيام النظافة.");
}

function saveJournal(formData) {
  const id = valueOrEmpty(formData, "id");
  const existing = id ? byId(state.journalEntries, id) : null;
  const values = { userId: state.userId, date: valueOrEmpty(formData, "date") || localISODate(), entryTime: valueOrEmpty(formData, "entryTime"), timezoneSnapshot: existing?.timezoneSnapshot || state.preferences.timezone || "UTC", title: valueOrEmpty(formData, "title"),
    intention: valueOrEmpty(formData, "intention"), top3: valueOrEmpty(formData, "top3"), mood: numberOrNull(valueOrEmpty(formData, "mood")),
    energy: numberOrNull(valueOrEmpty(formData, "energy")), gratitude: valueOrEmpty(formData, "gratitude"), win: valueOrEmpty(formData, "win"),
    learning: valueOrEmpty(formData, "learning"), worries: valueOrEmpty(formData, "worries"), tomorrowPlan: valueOrEmpty(formData, "tomorrowPlan"),
    body: valueOrEmpty(formData, "body"), tagIds: getAll(formData, "tagIds"), habitIds: getAll(formData, "habitIds"), deletedAt: "" };
  if (!values.title) return toast("اكتب عنوانًا للتدوينة.", "error");
  if ([values.mood, values.energy].some((value) => value != null && (!Number.isInteger(value) || value < 1 || value > 5))) return toast("المزاج والطاقة يجب أن يكونا من 1 إلى 5.", "error");
  if (existing) Object.assign(existing, values);
  else state.journalEntries.unshift({ id: uid("journal"), ...values });
  recordAudit("journal", existing?.id || state.journalEntries[0].id, existing ? "updated" : "created", ["title", "date", "tags", "habits"]);
  saveAndRefresh(existing ? "تم تحديث التدوينة." : "تم حفظ التدوينة.");
}

function syncBookHabits(bookId, habitIds) {
  state.habitBooks = state.habitBooks.filter((link) => link.bookId !== bookId);
  for (const habitId of habitIds) state.habitBooks.push({ habitId, bookId, linkType: "related" });
}
function saveBook(formData) {
  const id = valueOrEmpty(formData, "id") || uid("book");
  const existing = byId(state.books, id);
  const values = { userId: state.userId, name: valueOrEmpty(formData, "name"), author: valueOrEmpty(formData, "author"),
    status: valueOrEmpty(formData, "status") || "want_to_read", category: valueOrEmpty(formData, "category"), format: valueOrEmpty(formData, "format"),
    language: valueOrEmpty(formData, "language"), cover: valueOrEmpty(formData, "cover").trim(), totalPages: numberOrNull(valueOrEmpty(formData, "totalPages")),
    pagesBeforeTracking: Number(valueOrEmpty(formData, "pagesBeforeTracking") || 0), startDate: valueOrEmpty(formData, "startDate"),
    endDate: valueOrEmpty(formData, "endDate"), rating: numberOrNull(valueOrEmpty(formData, "rating")), priority: "normal",
    keyIdea: valueOrEmpty(formData, "keyIdea"), notesQuotes: valueOrEmpty(formData, "notesQuotes"), url: valueOrEmpty(formData, "url"), deletedAt: "" };
  if (!values.name) return toast("اسم الكتاب مطلوب.", "error");
  if (values.cover && (!/^https:\/\/[^\s"'<>]+$/i.test(values.cover) || values.cover.length > 2048)) return toast("رابط الغلاف يجب أن يكون HTTPS صحيحًا وألا يتجاوز 2048 حرفًا.", "error");
  if (values.totalPages != null && (!Number.isInteger(values.totalPages) || values.totalPages < 0)) return toast("إجمالي الصفحات يجب أن يكون عددًا صحيحًا غير سالب.", "error");
  if (!Number.isInteger(values.pagesBeforeTracking) || values.pagesBeforeTracking < 0) return toast("الصفحات السابقة يجب أن تكون عددًا صحيحًا غير سالب.", "error");
  if (values.rating != null && (!Number.isInteger(values.rating) || values.rating < 1 || values.rating > 5)) return toast("تقييم الكتاب يجب أن يكون من 1 إلى 5.", "error");
  if (values.startDate && values.endDate && values.endDate < values.startDate) return toast("تاريخ الانتهاء لا يمكن أن يسبق تاريخ البدء.", "error");
  if (existing) Object.assign(existing, values);
  else state.books.unshift({ id, ...values });
  syncBookHabits(id, getAll(formData, "habitIds"));
  recordAudit("book", id, existing ? "updated" : "created", ["name", "status", "pages"]);
  saveAndRefresh(existing ? "تم تحديث الكتاب." : "تمت إضافة الكتاب.");
}

function saveReading(formData) {
  const id = valueOrEmpty(formData, "id");
  const bookId = valueOrEmpty(formData, "bookId");
  const existing = id ? byId(state.readingSessions, id) : null;
  const book = bookId ? byId(state.books, bookId) : null;
  if (bookId && !book) return toast("اختر كتابًا موجودًا أو اترك الجلسة بلا ارتباط إذا كان الكتاب محذوفًا.", "error");
  if (!book && !existing) return toast("اختر كتابًا لجلسة القراءة الجديدة.", "error");
  const pageStart = numberOrNull(valueOrEmpty(formData, "pageStart"));
  const pageEnd = numberOrNull(valueOrEmpty(formData, "pageEnd"));
  let pagesRead = Number(valueOrEmpty(formData, "pagesRead") || 0);
  const durationMinutes = Number(valueOrEmpty(formData, "durationMinutes") || 0);
  if (![pagesRead, durationMinutes].every(Number.isInteger) || (pageStart != null && !Number.isInteger(pageStart)) || (pageEnd != null && !Number.isInteger(pageEnd))) return toast("الصفحات والدقائق يجب أن تكون أعدادًا صحيحة.", "error");
  if (pagesRead < 0 || durationMinutes < 0 || (pageStart != null && pageStart < 1) || (pageEnd != null && pageEnd < 1)) return toast("القيم السالبة أو رقم الصفحة الأقل من 1 غير مسموح بها.", "error");
  if (pagesRead === 0 && pageStart != null && pageEnd != null) pagesRead = Math.max(0, pageEnd - pageStart + 1);
  if (pageStart != null && pageEnd != null && pageEnd < pageStart) return toast("صفحة النهاية يجب ألا تسبق صفحة البداية.", "error");
  if (pagesRead <= 0 && durationMinutes <= 0) return toast("أدخل عدد الصفحات أو مدة القراءة.", "error");
  const values = { userId: state.userId, bookId: book?.id || null, readOn: valueOrEmpty(formData, "readOn") || localISODate(), timezoneSnapshot: existing?.timezoneSnapshot || state.preferences.timezone || "UTC", pagesRead,
    pageStart, pageEnd, durationMinutes, note: valueOrEmpty(formData, "note"), bookTitleSnapshot: book?.name || existing?.bookTitleSnapshot || "كتاب محذوف", deletedAt: "" };
  if (existing) Object.assign(existing, values);
  else state.readingSessions.unshift({ id: uid("reading"), ...values });
  recordAudit("reading_session", existing?.id || state.readingSessions[0].id, existing ? "updated" : "created", ["pagesRead", "durationMinutes"]);
  saveAndRefresh("تم حفظ جلسة القراءة وتحديث التقدم.");
}

function saveFocus(formData) {
  const id = valueOrEmpty(formData, "id");
  const startDate = valueOrEmpty(formData, "startDate");
  const endDate = valueOrEmpty(formData, "endDate");
  if (endDate < startDate) return toast("نهاية الأسبوع يجب أن تكون بعد بدايته.", "error");
  const rating = Number(valueOrEmpty(formData, "rating") || 3);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return toast("التقييم يجب أن يكون من 1 إلى 5.", "error");
  const habitIds = getAll(formData, "habitIds");
  if (habitIds.length > 5 && !window.confirm("اخترت أكثر من 5 عادات. المواصفة توصي بـ3–5؛ هل تريد الاحتفاظ بالاختيار كما هو؟")) return;
  const duplicate = state.focus.find((week) => week.startDate === startDate && !week.deletedAt && week.id !== id);
  if (duplicate && !window.confirm("يوجد سجل تركيز لهذا الأسبوع. هل تريد تحديثه بدل إنشاء أسبوع مكرر؟")) return;
  const target = duplicate || (id ? byId(state.focus, id) : null);
  const values = { userId: state.userId, startDate, endDate, habitIds, rating,
    worked: valueOrEmpty(formData, "worked"), failed: valueOrEmpty(formData, "failed"), adjustment: valueOrEmpty(formData, "adjustment"), deletedAt: "" };
  if (target) Object.assign(target, values);
  else state.focus.unshift({ id: uid("focus"), ...values });
  recordAudit("weekly_focus", target?.id || state.focus[0].id, target ? "updated" : "created", ["habits", "review"]);
  saveAndRefresh("تم حفظ مراجعة الأسبوع.");
}

function saveAchievement(formData) {
  const id = valueOrEmpty(formData, "id") || uid("achievement");
  const existing = byId(state.achievements, id);
  const name = valueOrEmpty(formData, "name");
  const conditionValue = Number(valueOrEmpty(formData, "conditionValue"));
  if (!name || conditionValue <= 0) return toast("أدخل اسم الإنجاز وهدفًا أكبر من صفر.", "error");
  const values = { userId: state.userId, name, habitId: valueOrEmpty(formData, "habitId"), conditionType: valueOrEmpty(formData, "conditionType"), conditionValue, enabled: existing?.enabled ?? true, archivedAt: existing?.archivedAt || "", deletedAt: "" };
  if (existing) Object.assign(existing, values);
  else state.achievements.unshift({ id, ...values, currentValue: 0, achieved: false, achievedAt: "" });
  const item = byId(state.achievements, id);
  item.currentValue = achievementValue(item, state);
  item.achieved = item.currentValue >= Number(item.conditionValue);
  if (item.achieved && !item.achievedAt) item.achievedAt = new Date().toISOString().slice(0, 10);
  recordAudit("achievement", id, existing ? "updated" : "created", ["name", "conditionType", "conditionValue"]);
  saveAndRefresh(existing ? "تم تحديث شرط الإنجاز." : "تم إنشاء الإنجاز.");
}

function savePreferences(formData) {
  state.preferences.timezone = valueOrEmpty(formData, "timezone");
  state.preferences.weekStartsOn = Number(valueOrEmpty(formData, "weekStartsOn"));
  state.preferences.remindersEnabled = valueOrEmpty(formData, "remindersEnabled") === "true";
  recordAudit("preferences", state.userId, "updated", ["timezone", "weekStartsOn", "remindersEnabled"]);
  saveAndRefresh("تم حفظ الإعدادات.");
}

function saveCategory(formData) {
  const id = valueOrEmpty(formData, "id");
  const existing = id ? byId(state.categories, id) : null;
  const name = valueOrEmpty(formData, "name").normalize("NFKC").trim();
  const normalized = name.toLocaleLowerCase("ar");
  if (!name) return toast("اسم التصنيف مطلوب.", "error");
  if (state.categories.some((category) => category.id !== id && category.name.normalize("NFKC").trim().toLocaleLowerCase("ar") === normalized)) return toast("يوجد تصنيف بهذا الاسم بالفعل.", "error");
  const slug = name.toLocaleLowerCase("ar").replace(/\s+/g, "-").replace(/[^\p{L}\p{N}-]/gu, "").slice(0, 80) || `category-${uid().slice(0, 8)}`;
  if (state.categories.some((category) => category.id !== id && category.slug === slug)) return toast("اسم التصنيف ينتج معرّفًا مكررًا؛ غيّر الاسم قليلًا.", "error");
  const sortOrder = Number(valueOrEmpty(formData, "sortOrder") || 0);
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 65535) return toast("الترتيب يجب أن يكون عددًا صحيحًا بين 0 و65535.", "error");
  if (existing) Object.assign(existing, { name, slug, sortOrder });
  else state.categories.push({ id: uid(), userId: state.userId, name, slug, sortOrder, isActive: true });
  recordAudit("habit_category", existing?.id || state.categories.at(-1).id, existing ? "updated" : "created", ["name", "sortOrder"]);
  saveAndRefresh(existing ? "تم تحديث التصنيف." : "تم إنشاء التصنيف.");
}

function saveTag(formData) {
  const id = valueOrEmpty(formData, "id");
  const existing = id ? byId(state.journalTags, id) : null;
  const name = valueOrEmpty(formData, "name").normalize("NFKC").trim();
  const normalizedName = name.toLocaleLowerCase("ar");
  if (!name) return toast("اسم الوسم مطلوب.", "error");
  if (state.journalTags.some((tag) => tag.id !== id && (tag.normalizedName || tag.name.normalize("NFKC").trim().toLocaleLowerCase("ar")) === normalizedName)) return toast("يوجد وسم بهذا الاسم بالفعل.", "error");
  const values = { userId: state.userId, name, normalizedName, color: valueOrEmpty(formData, "color") || "teal" };
  if (existing) Object.assign(existing, values);
  else state.journalTags.unshift({ id: uid(), ...values });
  recordAudit("journal_tag", existing?.id || state.journalTags[0].id, existing ? "updated" : "created", ["name", "color"]);
  saveAndRefresh(existing ? "تم تحديث الوسم." : "تم إنشاء الوسم.");
}

function saveReminder(formData) {
  const id = valueOrEmpty(formData, "id");
  const existing = id ? byId(state.reminders, id) : null;
  const habitId = valueOrEmpty(formData, "habitId");
  const habit = state.habits.find((item) => item.id === habitId && !item.deletedAt);
  const localTime = valueOrEmpty(formData, "localTime");
  const snoozeMinutes = Number(valueOrEmpty(formData, "snoozeMinutes") || 0);
  const daysOfWeek = getAll(formData, "daysOfWeek").map(Number);
  if (!habit) return toast("اختر عادة موجودة للتذكير.", "error");
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(localTime)) return toast("أدخل وقتًا محليًا صحيحًا.", "error");
  if (!Number.isInteger(snoozeMinutes) || snoozeMinutes < 0 || snoozeMinutes > 1440) return toast("مدة التأجيل يجب أن تكون عددًا صحيحًا بين 0 و1440 دقيقة.", "error");
  if (daysOfWeek.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) return toast("قائمة الأيام غير صالحة.", "error");
  const values = { userId: state.userId, habitId, localTime, timezoneOverride: valueOrEmpty(formData, "timezoneOverride"), daysOfWeek: daysOfWeek.length ? daysOfWeek : null,
    enabled: valueOrEmpty(formData, "enabled") === "true", snoozeMinutes, quietHoursRespected: valueOrEmpty(formData, "quietHoursRespected") === "true" };
  if (existing) Object.assign(existing, values);
  else state.reminders.unshift({ id: uid(), ...values });
  recordAudit("habit_reminder", existing?.id || state.reminders[0].id, existing ? "updated" : "created", ["habitId", "localTime", "daysOfWeek", "enabled"]);
  saveAndRefresh(existing ? "تم تحديث التذكير." : "تم إنشاء التذكير.");
}

const formHandlers = {
  habit: saveHabit, log: saveLog, relapse: saveRelapse, journal: saveJournal,
  book: saveBook, reading: saveReading, focus: saveFocus, achievement: saveAchievement,
  category: saveCategory, tag: saveTag, reminder: saveReminder,
  preferences: savePreferences,
};

document.addEventListener("submit", (event) => {
  const form = event.target.closest("form[data-form]");
  if (!form) return;
  event.preventDefault();
  const handler = formHandlers[form.dataset.form];
  if (handler) handler(new FormData(form));
});

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  const id = button.dataset.id;
  const kind = button.dataset.kind;
  if (action === "navigate") return navigate(button.dataset.page);
  if (action === "go-focus") return navigate("focus");
  if (action === "go-relapses") return navigate("relapses");
  if (action === "open-menu") return document.body.classList.add("menu-open");
  if (action === "close-menu") return document.body.classList.remove("menu-open");
  if (action === "close-dialog") return closeModal();
  if (action === "add-category") return openModal("category");
  if (action === "edit-category") return openModal("category", byId(state.categories, id));
  if (action === "toggle-category") {
    const category = byId(state.categories, id); if (!category) return;
    category.isActive = !category.isActive;
    recordAudit("habit_category", id, "updated", ["isActive"]);
    persistState(state); refresh(); return toast(category.isActive ? "تم تفعيل التصنيف." : "تم تعطيل التصنيف مع الإبقاء على روابط عاداته.");
  }
  if (action === "delete-category") {
    const category = byId(state.categories, id); if (!category) return;
    if (state.habits.some((habit) => habit.categoryId === id)) return toast("لا يمكن حذف تصنيف مرتبط بعادة؛ عطّله بدلًا من ذلك.", "error");
    if (!window.confirm(`حذف التصنيف «${category.name}» نهائيًا؟`)) return;
    state.categories = state.categories.filter((item) => item.id !== id);
    recordAudit("habit_category", id, "purged", []); persistState(state); refresh(); return toast("تم حذف التصنيف.");
  }
  if (action === "add-tag") return openModal("tag");
  if (action === "edit-tag") return openModal("tag", byId(state.journalTags, id));
  if (action === "delete-tag") {
    const tag = byId(state.journalTags, id); if (!tag) return;
    if (!window.confirm(`حذف الوسم «${tag.name}»؟ ستبقى التدوينات وتُفك علاقة هذا الوسم فقط.`)) return;
    state.journalEntries.forEach((entry) => { entry.tagIds = (entry.tagIds || []).filter((tagId) => tagId !== id); });
    state.journalTags = state.journalTags.filter((item) => item.id !== id);
    recordAudit("journal_tag", id, "purged", []); persistState(state); refresh(); return toast("حُذف الوسم وبقيت التدوينات.");
  }
  if (action === "add-reminder") return openModal("reminder");
  if (action === "edit-reminder") return openModal("reminder", byId(state.reminders, id));
  if (action === "toggle-reminder") {
    const reminder = byId(state.reminders, id); if (!reminder) return;
    reminder.enabled = !reminder.enabled;
    recordAudit("habit_reminder", id, "updated", ["enabled"]);
    persistState(state); refresh(); return toast(reminder.enabled ? "تم تفعيل التذكير." : "تم إيقاف التذكير.");
  }
  if (action === "delete-reminder") {
    const reminder = byId(state.reminders, id); if (!reminder) return;
    if (!window.confirm("حذف التذكير نهائيًا؟ لن تُحذف العادة نفسها.")) return;
    state.reminders = state.reminders.filter((item) => item.id !== id);
    recordAudit("habit_reminder", id, "purged", []); persistState(state); refresh(); return toast("تم حذف التذكير.");
  }
  if (action === "add-habit") return openModal("habit");
  if (action === "edit-habit") return openModal("habit", byId(state.habits, id));
  if (action === "add-log") return openModal("log");
  if (action === "quick-log") {
    const existing = state.logs.find((log) => log.habitId === id && log.localDate === localISODate() && !log.deletedAt);
    const habit = logHabit(id);
    const requestedStatus = button.dataset.status || "done";
    const count = habit?.scheduleType === "times_per_period" ? completedCountInCurrentPeriod(habit, state) : 0;
    const target = Number(habit?.scheduleRule?.targetCount || 1);
    const selected = existing ? { ...existing, status: requestedStatus, actual: ["skipped", "vacation"].includes(requestedStatus) ? "" : existing.actual } : { habitId: id, localDate: localISODate(), status: requestedStatus, actual: "", note: "", trigger: "", bookId: "" };
    if (habit?.scheduleType === "times_per_period" && count >= target && !existing && requestedStatus === "done") {
      toast("اكتمل هدف هذه الفترة. يمكنك تعديل سجل سابق من صفحة السجل اليومي.", "error");
      return;
    }
    return openModal("log", selected);
  }
  if (action === "edit-log") return openModal("log", byId(state.logs, id));
  if (action === "add-relapse") return openModal("relapse", null, button.dataset.habit || "");
  if (action === "edit-relapse") return openModal("relapse", byId(state.relapses, id));
  if (action === "add-journal") return openModal("journal");
  if (action === "edit-journal") return openModal("journal", byId(state.journalEntries, id));
  if (action === "add-book") return openModal("book");
  if (action === "edit-book") return openModal("book", byId(state.books, id));
  if (action === "add-reading") return openModal("reading", null, button.dataset.book || "");
  if (action === "edit-reading") return openModal("reading", byId(state.readingSessions, id));
  if (action === "add-focus") return openModal("focus");
  if (action === "edit-focus") return openModal("focus", byId(state.focus, id));
  if (action === "add-achievement") return openModal("achievement");
  if (action === "edit-achievement") return openModal("achievement", byId(state.achievements, id));
  if (action === "toggle-achievement") {
    const achievement = byId(state.achievements, id); if (!achievement) return;
    achievement.enabled = !achievement.enabled;
    recordAudit("achievement", id, "updated", ["enabled"]);
    persistState(state); refresh(); return toast(achievement.enabled ? "تم تفعيل الإنجاز." : "تم تعطيل الإنجاز دون حذفه.");
  }
  if (action === "habit-filter") { habitFilter = button.dataset.filter; query = ""; return refresh(); }
  if (action === "journal-tag-filter") {
    const tag = byId(state.journalTags, button.dataset.tag);
    query = tag?.name || "";
    document.querySelector("#global-search") && (document.querySelector("#global-search").value = query);
    return refresh();
  }
  if (action === "archive-habit") {
    const habit = byId(state.habits, id);
    if (!habit) return;
    if (!window.confirm(`أرشفة «${habit.name}»؟ ستختفي من التركيز النشط وسيبقى تاريخها.`)) return;
    habit.status = "archived"; habit.archivedAt = new Date().toISOString();
    recordAudit("habit", id, "archived", ["status"]); persistState(state); refresh(); return toast("تمت أرشفة العادة مع الاحتفاظ بتاريخها.");
  }
  if (action === "pause-habit") {
    const habit = byId(state.habits, id); if (!habit) return;
    habit.status = "paused";
    state.pausePeriods ||= [];
    if (!state.pausePeriods.some((period) => period.habitId === id && !period.endDate)) {
      state.pausePeriods.push({ id: uid("pause"), userId: state.userId, habitId: id, startDate: localISODate(), endDate: "", reason: "إيقاف مؤقت من مكتبة العادات" });
    }
    recordAudit("habit", id, "updated", ["status", "pause_period"]); persistState(state); refresh(); return toast("توقفت العادة مؤقتًا؛ لن تُحسب أيام الإيقاف إخفاقًا.");
  }
  if (action === "resume-habit") {
    const habit = byId(state.habits, id); if (!habit) return;
    habit.status = "active";
    const openPeriod = (state.pausePeriods || []).filter((period) => period.habitId === id && !period.endDate).at(-1);
    if (openPeriod) {
      const today = localISODate();
      if (openPeriod.startDate >= today) state.pausePeriods = state.pausePeriods.filter((period) => period.id !== openPeriod.id);
      else openPeriod.endDate = addLocalDays(today, -1);
    }
    recordAudit("habit", id, "updated", ["status", "pause_period"]); persistState(state); refresh(); return toast("استؤنفت العادة من اليوم، مع حفظ فترة الإيقاف السابقة.");
  }
  if (action === "restore-habit") {
    const habit = byId(state.habits, id); if (!habit) return;
    habit.status = "active"; habit.archivedAt = ""; persistState(state); refresh(); return toast("عادت العادة إلى المكتبة النشطة.");
  }
  if (action === "archive-achievement") {
    const achievement = byId(state.achievements, id); if (!achievement) return;
    const now = new Date().toISOString();
    achievement.archivedAt = now; achievement.enabled = false; achievement.deletedAt = now;
    achievement.purgeAfter = new Date(Date.now() + 30 * 86400000).toISOString();
    recordAudit("achievement", id, "archived", []); persistState(state); refresh(); return toast("أُرشف الإنجاز ونُقل إلى السلة؛ يمكنك استعادته.");
  }
  if (action === "delete-record") return softDelete(kind, id);
  if (action === "restore-record") return restoreRecord(kind, id);
  if (action === "purge-record") return purgeRecord(kind, id);
  if (action === "export-json") { downloadJson(state); return toast("بدأ تنزيل نسخة JSON."); }
  if (action === "export-csv") { downloadCsv(state.logs.filter((record) => !record.deletedAt).map((log) => ({ ...log, habit: logHabit(log.habitId)?.name || "" }))); return toast("بدأ تنزيل سجلات CSV."); }
  if (action === "reset-demo") {
    if (!window.confirm("سيتم استبدال كل التعديلات المحلية ببيانات المثال. هل تريد المتابعة؟")) return;
    state = resetState(); query = ""; page = "dashboard"; location.hash = "#dashboard"; refresh(); return toast("تمت استعادة بيانات العرض.");
  }
});

function collectionFor(kind) {
  return ({ habit: state.habits, log: state.logs, relapse: state.relapses, journal: state.journalEntries,
    book: state.books, reading: state.readingSessions, focus: state.focus, achievement: state.achievements })[kind];
}
function softDelete(kind, id) {
  const record = byId(collectionFor(kind) || [], id);
  if (!record) return;
  const label = record.name || record.title || record.localDate || record.readOn || "هذا العنصر";
  const impact = kind === "habit" ? "سيظل التاريخ محفوظًا في السلة؛ لن تُحذف سجلاته الآن." : kind === "book" ? "ستبقى جلسات القراءة وسجلات العادة محفوظة." : "يمكن استعادته من سلة المحذوفات.";
  if (!window.confirm(`نقل «${label}» إلى سلة المحذوفات؟ ${impact}`)) return;
  record.deletedAt = new Date().toISOString();
  record.purgeAfter = new Date(Date.now() + 30 * 86400000).toISOString();
  recordAudit(kind, id, "soft_deleted", []);
  persistState(state); refresh(); toast("نُقل العنصر إلى سلة المحذوفات.");
}
function restoreRecord(kind, id) {
  const record = byId(collectionFor(kind) || [], id);
  if (!record) return;
  record.deletedAt = ""; record.purgeAfter = "";
  if (kind === "habit" && record.status === "archived") record.status = "active";
  if (kind === "habit") record.archivedAt = "";
  if (kind === "achievement") record.archivedAt = "";
  recordAudit(kind, id, "restored", []);
  persistState(state); refresh(); toast("تمت استعادة العنصر.");
}
function purgeRecord(kind, id) {
  const record = byId(collectionFor(kind) || [], id);
  if (!record) return;
  const label = record.name || record.title || record.localDate || "العنصر";
  let warning = `حذف «${label}» نهائيًا؟ لا يمكن التراجع عن ذلك.`;
  if (kind === "habit") warning = `حذف «${label}» نهائيًا؟ سيتم حذف سجلاتها اليومية والانتكاسات وروابطها وإنجازاتها المرتبطة. هذا غير قابل للاسترجاع.`;
  if (kind === "book") warning = `حذف «${label}» نهائيًا؟ ستبقى جلسات القراءة وسجلات اليوم، لكن سيُفك ارتباطها بالكتاب.`;
  if (!window.confirm(warning)) return;
  if (kind === "habit") {
    state.logs = state.logs.filter((item) => item.habitId !== id);
    state.relapses = state.relapses.filter((item) => item.habitId !== id);
    state.relapses.forEach((item) => { if (item.relatedHabitId === id) item.relatedHabitId = null; });
    state.pausePeriods = (state.pausePeriods || []).filter((period) => period.habitId !== id);
    state.habitBooks = state.habitBooks.filter((link) => link.habitId !== id);
    state.habitRelations = state.habitRelations.filter((link) => link.sourceHabitId !== id && link.targetHabitId !== id);
    state.reminders = state.reminders.filter((item) => item.habitId !== id);
    state.achievementLinks = (state.achievementLinks || []).filter((link) => link.habitId !== id);
    state.focus.forEach((week) => { week.habitIds = (week.habitIds || []).filter((habitId) => habitId !== id); });
    state.journalEntries.forEach((entry) => { entry.habitIds = (entry.habitIds || []).filter((habitId) => habitId !== id); });
    state.achievements.forEach((achievement) => { if (achievement.habitId === id) achievement.habitId = ""; });
    state.habits = state.habits.filter((item) => item.id !== id);
    recordAudit("habit", id, "purged", ["name"]);
  } else if (kind === "book") {
    state.readingSessions.forEach((session) => { if (session.bookId === id) { session.bookTitleSnapshot = record.name; session.bookId = null; } });
    state.logs.forEach((log) => { if (log.bookId === id) { log.bookTitleSnapshot = record.name; log.bookId = null; } });
    state.habitBooks = state.habitBooks.filter((link) => link.bookId !== id);
    state.books = state.books.filter((item) => item.id !== id);
    recordAudit("book", id, "purged", []);
  } else {
    const collection = collectionFor(kind);
    const index = collection.findIndex((item) => item.id === id);
    if (index >= 0) collection.splice(index, 1);
    recordAudit(kind === "reading" ? "reading_session" : kind === "log" ? "daily_log" : kind, id, "purged", []);
  }
  persistState(state); refresh(); toast("تم الحذف النهائي.");
}

app.addEventListener("input", (event) => {
  if (event.target.id !== "global-search") return;
  query = event.target.value;
  const start = event.target.selectionStart;
  const end = event.target.selectionEnd;
  refresh();
  const input = document.querySelector("#global-search");
  input?.focus({ preventScroll: true });
  if (input && start != null) input.setSelectionRange(start, end);
});

window.addEventListener("hashchange", () => {
  const next = location.hash.replace(/^#\/?/, "");
  if (knownPages.has(next) && next !== page) { page = next; refresh(); }
});

dialog.addEventListener("click", (event) => {
  if (event.target === dialog) closeModal();
});
dialog.addEventListener("cancel", () => { dialog.innerHTML = ""; });

refresh();
