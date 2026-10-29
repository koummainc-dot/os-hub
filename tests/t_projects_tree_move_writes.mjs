import assert from "node:assert/strict";
import { persistTaskTreeMove } from "../src/systems/projects/taskTreeMoveWrites.js";

let pass = 0, fail = 0;
const test = async (name, fn) => { try { await fn(); pass++; console.log("  ✓", name); } catch (e) { fail++; console.log("  ✗", name, e.message); } };
const rec = (id, project_id, extra = {}) => ({ id, project_id, ...extra });
const change = (before, after) => ({ before, after });

await test("all task and output writes succeed", async () => {
  const writes = [];
  await persistTaskTreeMove({
    taskPatches: [change(rec("a", "p1"), rec("a", "p2")), change(rec("b", "p1", { parent_task_id: "a" }), rec("b", "p2", { parent_task_id: "a" }))],
    outputPatches: [change(rec("o1", "p1", { task_id: "b" }), rec("o1", "p2", { task_id: "b" }))],
    put: async (c, r) => { writes.push([c, r.id, r.project_id]); return r; },
  });
  assert.equal(writes.length, 3);
  assert.ok(writes.every((x) => x[2] === "p2"));
});

await test("failed task write rolls back previously written tasks", async () => {
  const state = new Map([["tasks/a", rec("a", "p1")], ["tasks/b", rec("b", "p1", { parent_task_id: "a" })]]);
  let failOnce = true;
  await assert.rejects(() => persistTaskTreeMove({
    taskPatches: [change(rec("a", "p1"), rec("a", "p2")), change(rec("b", "p1", { parent_task_id: "a" }), rec("b", "p2", { parent_task_id: "a" }))], outputPatches: [],
    put: async (c, r) => {
      if (r.id === "b" && r.project_id === "p2" && failOnce) { failOnce = false; return null; }
      state.set(c + "/" + r.id, { ...r }); return r;
    },
  }));
  assert.equal(state.get("tasks/a").project_id, "p1");
  assert.equal(state.get("tasks/b").project_id, "p1");
});

await test("failed output write rolls back task and earlier output writes", async () => {
  const state = new Map([["tasks/a", rec("a", "p1")], ["outputs/o1", rec("o1", "p1")]]);
  let failOutput = true;
  await assert.rejects(() => persistTaskTreeMove({
    taskPatches: [change(rec("a", "p1"), rec("a", "p2"))], outputPatches: [change(rec("o1", "p1"), rec("o1", "p2")), change(rec("o2", "p1"), rec("o2", "p2"))],
    put: async (c, r) => {
      if (r.id === "o2" && failOutput) { failOutput = false; return null; }
      state.set(c + "/" + r.id, { ...r }); return r;
    },
  }));
  assert.equal(state.get("tasks/a").project_id, "p1");
  assert.equal(state.get("outputs/o1").project_id, "p1");
});

await test("rollback failure is surfaced instead of claiming success", async () => {
  let moved = false;
  await assert.rejects(() => persistTaskTreeMove({
    taskPatches: [change(rec("a", "p1"), rec("a", "p2")), change(rec("b", "p1"), rec("b", "p2"))], outputPatches: [],
    put: async (c, r) => {
      if (r.id === "b" && r.project_id === "p2") return null;
      if (r.id === "a" && r.project_id === "p1") return null;
      if (r.id === "a" && r.project_id === "p2") moved = true;
      return r;
    },
  }), /تعذّر استرجاع/);
  assert.equal(moved, true);
});

console.log(`\nPASS ${pass} · FAIL ${fail}`);
process.exit(fail ? 1 : 0);
