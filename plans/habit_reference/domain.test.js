import test from "node:test";
import assert from "node:assert/strict";
import { bookProgress, cleanDays, completedCountInCurrentPeriod, currentStreak, dueToday, quantityStatus } from "./src/domain.js";
import { createSeedData, localDateTimeToUtc, uid } from "./src/data.js";
import { modalContent, renderApp } from "./src/views.js";

const habit = (overrides = {}) => ({
  id: "h1", type: "good", status: "active", trackingType: "check", scheduleType: "daily",
  scheduleRule: { everyNDays: 1 }, startDate: "2026-10-01", endDate: "", deletedAt: "", versions: [], ...overrides,
});
const state = (overrides = {}) => ({
  preferences: { weekStartsOn: 1 }, focus: [], pausePeriods: [], logs: [], relapses: [], readingSessions: [], ...overrides,
});

test("daily every-N schedule is anchored to habit start and end date is inclusive", () => {
  const h = habit({ scheduleRule: { everyNDays: 2 }, endDate: "2026-10-03" });
  assert.equal(dueToday(h, state(), "2026-10-01"), true);
  assert.equal(dueToday(h, state(), "2026-10-02"), false);
  assert.equal(dueToday(h, state(), "2026-10-03"), true);
  assert.equal(dueToday(h, state(), "2026-10-04"), false);
});

test("weekday schedule checks only its selected weekdays", () => {
  const h = habit({ scheduleType: "weekdays", scheduleRule: { days: [1, 3, 5] } });
  assert.equal(dueToday(h, state(), "2026-10-05"), true); // Monday
  assert.equal(dueToday(h, state(), "2026-10-06"), false); // Tuesday
  assert.equal(dueToday(h, state(), "2026-10-07"), true); // Wednesday
});

test("monthly last weekday supports the final occurrence in a month", () => {
  const h = habit({ scheduleType: "monthly", scheduleRule: { kind: "nth_weekday", nth: -1, weekday: 5 } });
  assert.equal(dueToday(h, state(), "2026-10-30"), true); // last Friday in October 2026
  assert.equal(dueToday(h, state(), "2026-10-23"), false);
});

test("pause periods make scheduled days neutral and a resumed day eligible", () => {
  const h = habit();
  const s = state({ pausePeriods: [{ habitId: "h1", startDate: "2026-10-02", endDate: "2026-10-04" }] });
  assert.equal(dueToday(h, s, "2026-10-03"), false);
  assert.equal(dueToday(h, s, "2026-10-05"), true);
});

test("date-effective habit versions preserve the prior schedule", () => {
  const h = habit({
    scheduleType: "weekdays", scheduleRule: { days: [3] },
    versions: [
      { effectiveFrom: "2026-10-01", effectiveTo: "2026-10-07", scheduleType: "weekdays", scheduleRule: { days: [1] }, startDate: "2026-10-01", endDate: "" },
      { effectiveFrom: "2026-10-07", effectiveTo: null, scheduleType: "weekdays", scheduleRule: { days: [3] }, startDate: "2026-10-01", endDate: "" },
    ],
  });
  assert.equal(dueToday(h, state(), "2026-10-05"), true); // old Monday schedule
  assert.equal(dueToday(h, state(), "2026-10-06"), false);
  assert.equal(dueToday(h, state(), "2026-10-07"), true); // new Wednesday schedule
});

test("weekly target counts Done only, not Partial", () => {
  const h = habit({ scheduleType: "times_per_period", scheduleRule: { period: "week", targetCount: 2, weekStartsOn: 1 } });
  const s = state({ logs: [
    { habitId: "h1", localDate: "2026-10-05", status: "done", deletedAt: "" },
    { habitId: "h1", localDate: "2026-10-06", status: "partial", deletedAt: "" },
  ] });
  assert.equal(completedCountInCurrentPeriod(h, s, "2026-10-07"), 1);
  assert.equal(dueToday(h, s, "2026-10-07"), true);
  s.logs.push({ habitId: "h1", localDate: "2026-10-07", status: "done", deletedAt: "" });
  assert.equal(dueToday(h, s, "2026-10-08"), false);
  s.logs.push({ habitId: "h1", localDate: "2026-10-07", occurrenceKey: "2026-10-07:session-2", status: "done", deletedAt: "" });
  assert.equal(completedCountInCurrentPeriod(h, s, "2026-10-08"), 3);
});

test("quantity results honor the minimum threshold", () => {
  assert.equal(quantityStatus(20, 20, 10), "done");
  assert.equal(quantityStatus(12, 20, 10), "partial");
  assert.equal(quantityStatus(5, 20, 10), "missed");
  assert.equal(quantityStatus(0, 20, 0), "missed");
  assert.equal(quantityStatus(5, 20, 0), "partial");
});

test("local datetime conversion stores UTC instants and UUID-sized IDs", () => {
  assert.equal(localDateTimeToUtc("2026-10-02", "12:30", "Africa/Cairo"), "2026-10-02T09:30:00.000Z");
  assert.equal(localDateTimeToUtc("2026-10-02", "12:30", "UTC"), "2026-10-02T12:30:00.000Z");
  assert.equal(uid().length, 36);
});

test("current streak skips unscheduled days but breaks on a missed scheduled day", () => {
  const h = habit({ scheduleType: "weekdays", scheduleRule: { days: [1, 3, 5] } });
  const s = state({ logs: [{ habitId: "h1", localDate: "2026-10-05", status: "done", deletedAt: "" }] });
  assert.equal(currentStreak(h, s, "2026-10-06"), 1); // Tuesday is not scheduled
  h.scheduleType = "daily";
  h.scheduleRule = { everyNDays: 1 };
  s.logs.push({ habitId: "h1", localDate: "2026-10-06", status: "missed", deletedAt: "" });
  assert.equal(currentStreak(h, s, "2026-10-07"), 0);
});

test("clean days derive from the latest relapse; book pages derive from sessions", () => {
  const h = habit({ type: "bad", trackingType: "avoidance" });
  const s = state({ relapses: [{ habitId: "h1", at: "2026-10-01", deletedAt: "" }] });
  assert.equal(cleanDays(h, s, "2026-10-03"), 2);
  const progress = bookProgress({ id: "b1", totalPages: 100, pagesBeforeTracking: 10 }, state({
    readingSessions: [{ bookId: "b1", pagesRead: 25, deletedAt: "" }, { bookId: "b1", pagesRead: 12, deletedAt: "" }],
  }));
  assert.deepEqual(progress, { current: 47, total: 100, remaining: 53, ratio: 0.47 });
});

test("every primary app section renders from the shared model", () => {
  const demo = createSeedData();
  for (const page of ["dashboard", "habits", "logs", "relapses", "journal", "books", "focus", "achievements", "settings"]) {
    const html = renderApp(demo, page);
    assert.ok(html.length > 100, `${page} should render meaningful HTML`);
    assert.match(html, /dir="rtl"|Habit OS/);
  }
  assert.match(renderApp(demo, "settings"), /تذكيرات العادات/);
  assert.match(renderApp(demo, "settings"), /وسوم الجورنال/);
});

test("all primary entity forms have a registered form contract", () => {
  const demo = createSeedData();
  for (const kind of ["habit", "log", "relapse", "journal", "book", "reading", "focus", "achievement", "category", "tag", "reminder"]) {
    const modal = modalContent(kind, demo);
    assert.match(modal.html, new RegExp(`data-form="${kind}"`), `${kind} should have a save form`);
  }
});

test("book covers accept HTTPS only and escape HTML attributes", () => {
  const demo = createSeedData();
  demo.books[0].cover = "javascript:alert(1)";
  assert.doesNotMatch(renderApp(demo, "books"), /javascript:alert/);
  demo.books[0].cover = "https://covers.example/book.jpg?x=1&y=2";
  const html = renderApp(demo, "books");
  assert.match(html, /src="https:\/\/covers\.example\/book\.jpg\?x=1&amp;y=2"/);
});
