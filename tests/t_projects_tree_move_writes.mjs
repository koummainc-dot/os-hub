import assert from "node:assert/strict";
import { persistTaskTreeMove } from "../src/systems/projects/taskTreeMoveWrites.js";

let pass = 0, fail = 0;
const test = async (name, fn) => { try { await fn(); pass++; console.log("  ✓", name); } catch (e) { fail++; console.log("  ✗", name, e.message); } };
const rec = (id, project_id, extra = {}) => ({ id, project_id, ...extra });

await test("all task and output writes succeed", async () => {
  const writes = [];
  await persistTaskTreeMove({
    taskPatches: [rec("a", "p2", { parent_task_id: null }), rec("b", "p2", { parent_task_id: "a" })],
    outputPatches: [rec("o1", "p2", { task_id: "b" })],
    put: async (c, r) => { writes.push([c, r.id, r.project_id]); return r; },
  });
  assert.equal(writes.length, 3);
  assert.ok(writes.every((x) => x[2] === "p2"));
});

await test("failed task write rolls back previously written tasks", async () => {
  const state = new Map([["tasks/a", rec("a", "p1")], ["tasks/b", rec("b", "p1", { parent_task_id: "a" })]]);
  let failOnce = true;
  await assert.rejects(() => persistTaskTreeMove({
    taskPatches: [rec("a", "p2"), rec("b", "p2", { parent_task_id: "a" })], outputPatches: [],
    put: async (c, r) => {
      if (r.id === "b" && r.project_id === "p2" && failOnce) { failOnce = false; return null; }
      state.set(c + "/" + r.id, { ...r }); return r;
    },
  }));
  // Existing helper must carry source snapshots to restore old records; this assertion guards that invariant.
  assert.equal(state.get("tasks/a").project_id, "p1");
});

await test("failed output write rolls back task and earlier output writes", async () => {
  const state = new Map([["tasks/a", rec("a", "p1")], ["outputs/o1", rec("o1", "p1")]]);
  let failOutput = true;
  await assert.rejects(() => persistTaskTreeMove({
    taskPatches: [rec("a", "p2")], outputPatches: [rec("o1", "p2"), rec("o2", "p2")],
    put: async (c, r) => {
      if (r.id === "o2" && failOutput) { failOutput = false; return null; }
      state.set(c + "/" + r.id, { ...r }); return r;
    },
  }));
  assert.equal(state.get("tasks/a").project_id, "p1");
  assert.equal(state.get("outputs/o1").project_id, "p1");
});

console.log(`\nPASS ${pass} · FAIL ${fail}`);
process.exit(fail ? 1 : 0);
