const DAY_MS = 86400000;
const asNumber = value => Math.max(0, Number(value) || 0);
export const dateInZone = (date = new Date(), timeZone = "Africa/Cairo") =>
  new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
export const shiftDate = (date, days) => {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const indexLearningTree = data => {
  const units = new Map((data.units || []).map(x => [x.id, x]));
  const courses = new Map((data.courses || []).map(x => [x.id, x]));
  const lessons = new Map((data.lessons || []).map(x => [x.id, x]));
  const areas = new Map((data.areas || []).map(x => [x.id, x]));
  const lessonArea = lessonId => {
    const lesson = lessons.get(lessonId);
    const unit = units.get(lesson?.unitId);
    const course = courses.get(unit?.courseId);
    return areas.get(course?.areaId) || null;
  };
  return { units, courses, lessons, areas, lessonArea };
};
export function lessonMetrics(lesson, sessions = []) {
  const relevant = sessions.filter(s => s.lessonId === lesson.id && !s.deletedAt);
  const sessionMinutes = relevant.reduce((n, s) => n + asNumber(s.minutes), 0);
  const duration = asNumber(lesson.totalDurationMinutes);
  const watched = asNumber(lesson.watchedMinutes);
  const observed = Math.max(watched, sessionMinutes);
  const completed = duration > 0 ? Math.min(observed, duration) : 0;
  const manualComplete = !!lesson.manualCompletedAt;
  const state = lesson.status === "Skipped" ? "Skipped" :
    (duration > 0 && observed >= duration) || manualComplete ? "Completed" :
    observed > 0 ? "In Progress" : "Not Started";
  return {
    duration, watched, sessionMinutes, observed, completed,
    progress: duration > 0 ? completed / duration : null,
    remaining: Math.max(0, duration - completed),
    minutesOver: Math.max(0, observed - duration),
    state, measurable: duration > 0 && lesson.status !== "Skipped",
  };
}
export function subtreeMetrics(items, lessons, sessions, childrenFor, childrenOf) {
  const lessonIds = new Set();
  const walk = item => {
    if (item.kind === "lesson") { lessonIds.add(item.id); return; }
    for (const child of childrenFor(item)) walk(child);
  };
  walk({ ...items, kind: items.kind });
  const rows = [...lessonIds].map(id => lessons.find(x => x.id === id)).filter(Boolean)
    .filter(l => l.status !== "Skipped").map(l => lessonMetrics(l, sessions)).filter(m => m.measurable);
  const total = rows.reduce((n, m) => n + m.duration, 0);
  const completed = rows.reduce((n, m) => n + m.completed, 0);
  return { total, completed, remaining: Math.max(0, total - completed), progress: total ? completed / total : null };
}
export function getLearningStats(data, options = {}) {
  const timeZone = options.timeZone || data.preferences?.timezone || "Africa/Cairo";
  const date = options.date || dateInZone(new Date(), timeZone);
  const tree = indexLearningTree(data);
  const minimum = Math.max(1, Number(data.preferences?.dailyMinimumMinutes) || 10);
  const dailyGoal = Math.max(minimum, Number(data.preferences?.dailyGoalMinutes) || 30);
  const weeklyGoal = Math.max(1, Number(data.preferences?.weeklyGoalMinutes) || 720);
  const validSessions = (data.sessions || []).filter(s => !s.deletedAt && s.kind !== "adjustment" && s.sessionType !== "تسوية إكمال" && s.sessionDate);
  const countsForStreak = s => {
    const area = tree.lessonArea(s.lessonId);
    return area ? area.countsTowardStreak !== false : s.countsTowardStreak !== false;
  };
  const totalsByDate = new Map();
  for (const s of validSessions) if (countsForStreak(s)) totalsByDate.set(s.sessionDate, (totalsByDate.get(s.sessionDate) || 0) + asNumber(s.minutes));
  const minutesForDate = d => totalsByDate.get(d) || 0;
  const todayMinutes = minutesForDate(date);
  const last7Start = shiftDate(date, -6);
  const last7Minutes = validSessions.filter(s => s.sessionDate >= last7Start && s.sessionDate <= date).reduce((n, s) => n + (countsForStreak(s) ? asNumber(s.minutes) : 0), 0);
  const weekStartDay = Number(data.preferences?.weekStartDay ?? 6);
  const day = new Date(date + "T12:00:00Z").getUTCDay();
  const daysSinceWeekStart = (day - weekStartDay + 7) % 7;
  const calendarWeekStart = shiftDate(date, -daysSinceWeekStart);
  const calendarWeekMinutes = validSessions.filter(s => s.sessionDate >= calendarWeekStart && s.sessionDate <= date).reduce((n, s) => n + (countsForStreak(s) ? asNumber(s.minutes) : 0), 0);
  let streak = 0;
  let cursor = todayMinutes >= minimum ? date : shiftDate(date, -1);
  for (let i = 0; i < 36600; i++) {
    if (minutesForDate(cursor) < minimum) break;
    streak++;
    cursor = shiftDate(cursor, -1);
  }
  const dayState = todayMinutes >= dailyGoal ? "goal-reached" : todayMinutes >= minimum ? "minimum-met" : "not-met";
  const lessonRows = (data.lessons || []).map(l => ({ lesson: l, ...lessonMetrics(l, data.sessions || []) }));
  return {
    todayMinutes, dailyGoal, minimum, minutesToMinimum: Math.max(0, minimum - todayMinutes),
    dailyPct: Math.min(100, Math.round(todayMinutes / dailyGoal * 100)), dayState,
    last7Minutes, weeklyGoal, weeklyPct: Math.min(100, Math.round(last7Minutes / weeklyGoal * 100)),
    calendarWeekStart, calendarWeekMinutes, streak,
    longestStreak: Math.max(streak, Number(data.preferences?.longestStreak) || 0),
    lessonRows,
    completedLessons: lessonRows.filter(x => x.state === "Completed" && x.lesson.status !== "Skipped").length,
    measurableLessons: lessonRows.filter(x => x.measurable).length,
  };
}
export function computeCourseMetrics(course, data) {
  const units = (data.units || []).filter(u => u.courseId === course.id && u.status !== "Archived");
  const lessons = units.flatMap(u => (data.lessons || []).filter(l => l.unitId === u.id && l.status !== "Archived"));
  const metrics = lessons.map(l => lessonMetrics(l, data.sessions || [])).filter(m => m.measurable);
  const total = metrics.reduce((n, m) => n + m.duration, 0);
  const completed = metrics.reduce((n, m) => n + m.completed, 0);
  const states = lessons.map(l => lessonMetrics(l, data.sessions || []).state);
  const manuallyCompleted = !!course.manualCompletedAt;
  const state = course.status === "Archived" ? "Archived" : manuallyCompleted || (lessons.length > 0 && lessons.every((l, i) => l.status === "Skipped" || states[i] === "Completed")) ? "Completed" : states.some(s => s === "In Progress" || s === "Completed") ? "In Progress" : "Not Started";
  return { total, completed, remaining: Math.max(0, total - completed), progress: total ? completed / total : null, lessonsTotal: lessons.filter(l => l.status !== "Skipped").length, lessonsCompleted: lessons.filter(l => lessonMetrics(l, data.sessions || []).state === "Completed" && l.status !== "Skipped").length, unitsTotal: units.length, unitsCompleted: units.filter(u => { const ls = (data.lessons || []).filter(l => l.unitId === u.id && l.status !== "Skipped" && l.status !== "Archived"); return ls.length > 0 && ls.every(l => lessonMetrics(l, data.sessions || []).state === "Completed"); }).length, state };
}
export function computeAreaMetrics(area, data) {
  const courses = (data.courses || []).filter(c => c.areaId === area.id && c.status !== "Archived");
  const metrics = courses.map(c => computeCourseMetrics(c, data));
  const total = metrics.reduce((n, m) => n + m.total, 0);
  const completed = metrics.reduce((n, m) => n + m.completed, 0);
  const tree = indexLearningTree(data), today = dateInZone(new Date(), data.preferences?.timezone || "Africa/Cairo"), start = shiftDate(today, -6);
  const lessonIds = new Set((data.lessons || []).filter(l => { const unit=tree.units.get(l.unitId), course=tree.courses.get(unit?.courseId); return course?.areaId===area.id && l.status!=="Skipped" && l.status!=="Archived"; }).map(l=>l.id));
  const minutesLast7Days = (data.sessions || []).filter(s => lessonIds.has(s.lessonId) && !s.deletedAt && s.kind!=="adjustment" && s.sessionDate>=start && s.sessionDate<=today).reduce((n,s)=>n+asNumber(s.minutes),0);
  return { total, completed, remaining: Math.max(0, total - completed), progress: total ? completed / total : null, coursesTotal: courses.length, coursesCompleted: metrics.filter(m => m.state === "Completed").length, minutesLast7Days };
}
