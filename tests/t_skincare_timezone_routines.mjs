import assert from "node:assert/strict";
import { isRoutineDue, buildSkinFollowUps } from "../src/systems/skincare/domain.js";

const selected = { id: "selected", status: "active", frequency: "selected_days", days: [6] };
assert.equal(isRoutineDue(selected, "2026-11-07", [], "Africa/Cairo", 6), true);
assert.equal(isRoutineDue(selected, "2026-11-08", [], "Africa/Cairo", 6), false);

const weekly = { id: "weekly", status: "active", frequency: "times_per_week", timesPerWeek: 3 };
const logs = [
  { routineId: "weekly", date: "2026-11-07", status: "done" },
  { routineId: "weekly", date: "2026-11-08", status: "done" },
];
assert.equal(isRoutineDue(weekly, "2026-11-10", logs, "Africa/Cairo", 6), true);
assert.equal(isRoutineDue({ ...weekly, timesPerWeek: 2 }, "2026-11-10", logs, "Africa/Cairo", 6), false);

const followups = buildSkinFollowUps({
  today: "2026-03-01", timezone: "Africa/Cairo", weekStartDay: 6,
  units: [{ id: "u1", name: "Opened bottle", openedOn: "2026-01-01", paoMonths: 1 }],
});
assert.equal(followups.some(item => item.type === "unit-expiry" && item.dueDate === "2026-02-01" && item.priority === "high"), true);

console.log("Skincare timezone and routine due tests passed.");
