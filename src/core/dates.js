// Date helpers — all dates are "YYYY-MM-DD" strings in the workspace timezone (no UTC drift).
export function todayStr(tz) {
  try { return new Intl.DateTimeFormat("en-CA", { timeZone: tz || "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
  catch (e) { return new Date().toISOString().slice(0, 10); }
}
export function dateOf(iso, tz) {
  try { return new Intl.DateTimeFormat("en-CA", { timeZone: tz || "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso)); }
  catch (e) { return String(iso).slice(0, 10); }
}
const toUTC = (s) => { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d); };
export function addDays(s, n) { const t = new Date(toUTC(s) + n * 86400000); return t.toISOString().slice(0, 10); }
export function diffDays(a, b) { return Math.round((toUTC(a) - toUTC(b)) / 86400000); } // a - b
export function dow(s) { return new Date(toUTC(s)).getUTCDay(); } // 0=Sun
// last `startDay` (0=Sun..6=Sat) on or before date
export function weekStart(s, startDay) { const sd = startDay == null ? 6 : startDay; const d = dow(s); return addDays(s, -((d - sd + 7) % 7)); }
export function weekEnd(ws) { return addDays(ws, 6); }
export function quarterLabel(s) { if (!s) return ""; const [y, m] = s.split("-").map(Number); return "Q" + (Math.floor((m - 1) / 3) + 1) + " " + y; }
export function inRange(d, a, b) { return d && d >= a && d <= b; }
const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
export function fmt(s) { if (!s) return "—"; const [y, m, d] = s.slice(0, 10).split("-").map(Number); return d + " " + MONTHS[m - 1] + " " + y; }
export function fmtShort(s) { if (!s) return "—"; const [, m, d] = s.slice(0, 10).split("-").map(Number); return d + " " + MONTHS[m - 1]; }
export function dayName(s) { return DAYS[dow(s)]; }
export function fmtMinutes(min) { if (min == null) return "—"; const h = Math.floor(min / 60), m = Math.round(min % 60); return h ? h + "س " + (m ? m + "د" : "") : m + "د"; }
export function monthDays(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); } // m: 1..12
export const MONTH_NAMES = MONTHS;
