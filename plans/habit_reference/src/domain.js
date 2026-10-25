import { addLocalDays, localISODate } from "./data.js";

export function parseDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

export function dayDifference(from, to) {
  return Math.round((parseDate(to) - parseDate(from)) / 86400000);
}

export function weekdayNumber(dateString) {
  const day = parseDate(dateString).getDay();
  return day === 0 ? 7 : day; // Monday=1 ... Sunday=7
}

export function startOfWeek(dateString, weekStartsOn = 1) {
  const date = parseDate(dateString);
  const start = weekStartsOn % 7;
  const offset = (date.getDay() - start + 7) % 7;
  return addLocalDays(dateString, -offset);
}

export function endOfWeek(dateString, weekStartsOn = 1) {
  return addLocalDays(startOfWeek(dateString, weekStartsOn), 6);
}

function habitConfigAt(habit, dateString) {
  const version = (habit.versions || [])
    .filter((item) => item.effectiveFrom <= dateString && (!item.effectiveTo || dateString < item.effectiveTo))
    .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))
    .at(-1);
  return version ? { ...habit, ...version, scheduleRule: version.scheduleRule || habit.scheduleRule } : habit;
}

export function formatDate(value, options = { day: "numeric", month: "short" }) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ar-EG", options).format(parseDate(value));
}

export function formatNumber(value, digits = 0) {
  return new Intl.NumberFormat("ar-EG", { maximumFractionDigits: digits }).format(Number(value) || 0);
}

export function dueToday(habit, state, dateString = localISODate()) {
  if (habit.deletedAt || habit.status === "archived" || habit.status === "paused") return false;
  const config = habitConfigAt(habit, dateString);
  const startDate = config.startDate || habit.startDate;
  const endDate = config.endDate ?? habit.endDate;
  if (dateString < startDate || (endDate && dateString > endDate)) return false;
  if (state.pausePeriods?.some((pause) => pause.habitId === habit.id && pause.startDate <= dateString && (!pause.endDate || dateString <= pause.endDate))) return false;
  if (state.focus?.some((week) => week.deletedAt === "" && week.habitIds?.includes(habit.id)) === false) {
    // Focus membership is not a schedule rule; intentionally do not exclude a habit from due calculations.
  }
  const rule = config.scheduleRule ?? {};
  const weekday = weekdayNumber(dateString);
  if (config.scheduleType === "daily") {
    const every = Math.max(1, Number(rule.everyNDays ?? 1));
    return dayDifference(habit.startDate, dateString) % every === 0;
  }
  if (config.scheduleType === "weekdays") return Array.isArray(rule.days) && rule.days.includes(weekday);
  if (config.scheduleType === "interval") {
    const anchor = rule.anchorDate || habit.startDate;
    if (dateString < anchor) return false;
    const every = Math.max(1, Number(rule.everyN ?? 1));
    if (rule.unit === "week") return Math.floor(dayDifference(anchor, dateString) / 7) % every === 0 && weekday === weekdayNumber(anchor);
    if (rule.unit === "month") {
      const a = parseDate(anchor);
      const b = parseDate(dateString);
      const months = (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth();
      return months >= 0 && months % every === 0 && b.getDate() === a.getDate();
    }
    return dayDifference(anchor, dateString) % every === 0;
  }
  if (config.scheduleType === "monthly") {
    const d = parseDate(dateString);
    if (rule.kind === "last_day") return d.getDate() === new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    if (rule.kind === "day_of_month") return d.getDate() === Number(rule.day);
    if (rule.kind === "nth_weekday") {
      if (weekday !== Number(rule.weekday)) return false;
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      return Number(rule.nth) === -1 ? d.getDate() + 7 > lastDay : Math.ceil(d.getDate() / 7) === Number(rule.nth);
    }
  }
  if (config.scheduleType === "times_per_period") return completedCountInCurrentPeriod(habit, state, dateString) < Number(rule.targetCount ?? 1);
  return true;
}

function isNeutral(status) {
  return status === "vacation" || status === "skipped";
}

export function logsForHabit(state, habitId) {
  return state.logs.filter((log) => log.habitId === habitId && !log.deletedAt);
}

export function quantityStatus(actual, goal, minimum = 0) {
  const value = Number(actual);
  const target = Number(goal);
  const threshold = Number(minimum || 0);
  if (!Number.isFinite(value) || value < 0 || !Number.isFinite(target) || target <= 0) return "missed";
  if (value >= target) return "done";
  if (value > 0 && (threshold === 0 || value >= threshold)) return "partial";
  return "missed";
}

export function completedCountInCurrentPeriod(habit, state, dateString = localISODate()) {
  const config = habitConfigAt(habit, dateString);
  const rule = config.scheduleRule ?? {};
  const period = rule.period ?? "week";
  const completed = logsForHabit(state, habit.id).filter((log) => log.status === "done");
  if (period === "month") return completed.filter((log) => log.localDate.slice(0, 7) === dateString.slice(0, 7)).length;
  const weekStart = startOfWeek(dateString, Number(rule.weekStartsOn ?? state.preferences.weekStartsOn ?? 1));
  const weekEnd = addLocalDays(weekStart, 6);
  return completed.filter((log) => log.localDate >= weekStart && log.localDate <= weekEnd).length;
}

export function currentStreak(habit, state, today = localISODate()) {
  if (habit.type === "bad" || habit.trackingType === "avoidance") return cleanDays(habit, state, today);
  const currentConfig = habitConfigAt(habit, today);
  if (currentConfig.scheduleType === "times_per_period") {
    const rule = currentConfig.scheduleRule ?? {};
    const period = rule.period ?? "week";
    let cursor = period === "month" ? `${today.slice(0, 7)}-01` : startOfWeek(today, Number(rule.weekStartsOn ?? state.preferences.weekStartsOn ?? 1));
    const currentIsComplete = period === "month" ? today === addLocalDays(`${today.slice(0, 7)}-${String(new Date(parseDate(today).getFullYear(), parseDate(today).getMonth() + 1, 0).getDate()).padStart(2, "0")}`, 0) : today === addLocalDays(cursor, 6);
    let count = 0;
    if (!currentIsComplete && completedInPeriod(habit, state, cursor, period) < Number(rule.targetCount ?? 1)) {
      cursor = period === "month" ? addMonths(cursor, -1) : addLocalDays(cursor, -7);
    }
    for (let i = 0; i < 120; i += 1) {
      const periodConfig = habitConfigAt(habit, cursor);
      const periodRule = periodConfig.scheduleRule ?? {};
      if (periodConfig.scheduleType !== "times_per_period" || (periodRule.period ?? "week") !== period) break;
      const amount = completedInPeriod(habit, state, cursor, period);
      if (amount < Number(periodRule.targetCount ?? rule.targetCount ?? 1)) break;
      count += 1;
      cursor = period === "month" ? addMonths(cursor, -1) : addLocalDays(cursor, -7);
    }
    return count;
  }
  const byDate = new Map(logsForHabit(state, habit.id).map((log) => [log.localDate, log]));
  let count = 0;
  let cursor = today;
  for (let i = 0; i < 400; i += 1) {
    if (cursor < habit.startDate || (habit.endDate && cursor > habit.endDate)) break;
    const paused = state.pausePeriods?.some((pause) => pause.habitId === habit.id && pause.startDate <= cursor && (!pause.endDate || cursor <= pause.endDate));
    if (paused || !dueToday(habit, { ...state, focus: [] }, cursor)) {
      cursor = addLocalDays(cursor, -1);
      continue;
    }
    const log = byDate.get(cursor);
    if (cursor === today && !log) {
      cursor = addLocalDays(cursor, -1); // today's due item is still in progress
      continue;
    }
    if (log && isNeutral(log.status)) {
      cursor = addLocalDays(cursor, -1);
      continue;
    }
    if (log?.status === "done") {
      count += 1;
      cursor = addLocalDays(cursor, -1);
      continue;
    }
    break;
  }
  return count;
}

function addMonths(dateString, amount) {
  const date = parseDate(dateString);
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + amount);
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, last));
  return localISODate(date);
}

function completedInPeriod(habit, state, periodStart, period) {
  const end = period === "month" ? localISODate(new Date(parseDate(periodStart).getFullYear(), parseDate(periodStart).getMonth() + 1, 0, 12)) : addLocalDays(periodStart, 6);
  return logsForHabit(state, habit.id).filter((log) => log.localDate >= periodStart && log.localDate <= end && log.status === "done").length;
}

export function cleanDays(habit, state, today = localISODate()) {
  const events = state.relapses.filter((event) => event.habitId === habit.id && !event.deletedAt).map((event) => event.at).sort();
  const anchor = events.at(-1) || habit.startDate;
  return Math.max(0, dayDifference(anchor, today));
}

export function bestCleanStreak(habit, state, today = localISODate()) {
  const events = state.relapses.filter((event) => event.habitId === habit.id && !event.deletedAt).map((event) => event.at).sort();
  const points = [habit.startDate, ...events, today];
  let best = 0;
  for (let i = 1; i < points.length; i += 1) {
    const gap = dayDifference(points[i - 1], points[i]) - (i < points.length - 1 ? 1 : 0);
    best = Math.max(best, gap);
  }
  return Math.max(0, best);
}

export function completionRatio(habit, log) {
  if (habit.trackingType === "check") return log?.status === "done" ? 1 : 0;
  const goal = Number(log?.goalSnapshot ?? habit.goal ?? 0);
  if (!goal) return 0;
  return Math.max(0, Math.min(Number(log?.actual ?? 0) / goal, 1));
}

export function actualBookProgress(book, state) {
  const sessions = state.readingSessions.filter((session) => session.bookId === book.id && !session.deletedAt);
  return Number(book.pagesBeforeTracking || 0) + sessions.reduce((sum, session) => sum + Number(session.pagesRead || 0), 0);
}

export function bookProgress(book, state) {
  const current = actualBookProgress(book, state);
  const total = Number(book.totalPages || 0);
  return { current, total, remaining: total > 0 ? Math.max(total - current, 0) : null, ratio: total > 0 ? Math.min(current / total, 1) : null };
}

export function weeklyCompleted(habit, state, dateString = localISODate()) {
  const config = habitConfigAt(habit, dateString);
  if (config.scheduleType !== "times_per_period" || config.scheduleRule?.period !== "week") return null;
  const start = startOfWeek(dateString, Number(config.scheduleRule.weekStartsOn ?? state.preferences.weekStartsOn ?? 1));
  return completedInPeriod(habit, state, start, "week");
}

export function habitLogForDate(state, habitId, dateString) {
  return state.logs.find((log) => log.habitId === habitId && log.localDate === dateString && !log.deletedAt);
}

export function achievementValue(achievement, state, today = localISODate()) {
  const targetHabits = achievement.habitId ? [achievement.habitId] : state.habits.filter((habit) => habit.type === "good").map((habit) => habit.id);
  if (achievement.conditionType === "clean_days") {
    return targetHabits.reduce((max, id) => Math.max(max, cleanDays(state.habits.find((h) => h.id === id) || { startDate: today }, state, today)), 0);
  }
  const relevantLogs = state.logs.filter((log) => targetHabits.includes(log.habitId) && !log.deletedAt && log.status === "done");
  if (achievement.conditionType === "completed_days") return new Set(relevantLogs.map((log) => log.localDate)).size;
  return relevantLogs.reduce((sum, log) => sum + Number(log.actual || 0), 0);
}
