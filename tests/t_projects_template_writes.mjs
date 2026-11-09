import assert from "node:assert/strict";
import { persistTemplateBundle } from "../src/systems/projects/templateWrites.js";

const bundle = () => ({
  project: { id: "p1" },
  tasks: [{ id: "t1" }, { id: "t2" }],
  risks: [{ id: "r1" }],
});
const stamp = (record) => ({ ...record, stamped: true });

{
  const writes = [];
  const result = await persistTemplateBundle({
    ...bundle(), stamp, actorId: "u1",
    put: async (c, r) => { writes.push([c, r.id]); return r; },
    softDelete: async () => ({ deleted: true }),
  });
  assert.equal(result.id, "p1");
  assert.deepEqual(writes, [["projects", "p1"], ["tasks", "t1"], ["tasks", "t2"], ["risks", "r1"]]);
}

{
  const writes = [], deleted = [];
  await assert.rejects(() => persistTemplateBundle({
    ...bundle(), stamp, actorId: "u1",
    put: async (c, r) => {
      writes.push([c, r.id]);
      if (c === "tasks" && r.id === "t2") return null;
      return r;
    },
    softDelete: async (c, id) => { deleted.push([c, id]); return { deleted: true }; },
  }), /لم يكتمل إنشاء المشروع/);
  assert.deepEqual(writes, [["projects", "p1"], ["tasks", "t1"], ["tasks", "t2"]]);
  assert.deepEqual(deleted, [["tasks", "t1"], ["projects", "p1"]]);
}

{
  const deleted = [];
  await assert.rejects(() => persistTemplateBundle({
    ...bundle(), stamp, actorId: "u1",
    put: async (c, r) => c === "risks" ? null : r,
    softDelete: async (c, id) => { deleted.push([c, id]); return c === "projects" ? null : { deleted: true }; },
  }), /تعذّر تأكيد تنظيف بعض السجلات الجزئية/);
  assert.deepEqual(deleted, [["tasks", "t2"], ["tasks", "t1"], ["projects", "p1"]]);
}

{
  const batches = [], fallbackWrites = [];
  const result = await persistTemplateBundle({
    ...bundle(), stamp, atomic: true, actorId: "u1",
    putAtomic: async (ops) => { batches.push(ops); return ops.map(({ coll, rec }) => ({ coll, id: rec.id })); },
    put: async (coll, rec) => { fallbackWrites.push([coll, rec.id]); return rec; },
    softDelete: async () => ({ deleted: true }),
  });
  assert.equal(result.id, "p1");
  assert.equal(batches.length, 1, "online template bundle must use one atomic batch");
  assert.deepEqual(batches[0].map((op) => [op.coll, op.rec.id]), [["projects", "p1"], ["tasks", "t1"], ["tasks", "t2"], ["risks", "r1"]]);
  assert.deepEqual(fallbackWrites, [], "atomic online path must not issue sequential fallback writes");
}
{
  const batches = [];
  const result = await persistTemplateBundle({
    project: { id: "p2" },
    tasks: [{ id: "t3" }],
    prds: [{ id: "prd1" }],
    outputs: [{ id: "o1", task_id: "t3", prd_id: "prd1" }],
    risks: [{ id: "r2" }],
    stamp, atomic: true,
    putAtomic: async (ops) => { batches.push(ops); return ops.map((op) => op.rec); },
    put: async () => { throw new Error("fallback must not run"); },
    softDelete: async () => ({ deleted: true }),
  });
  assert.equal(result.id, "p2");
  assert.deepEqual(batches[0].map((op) => [op.coll, op.rec.id]), [
    ["projects", "p2"], ["tasks", "t3"], ["prds", "prd1"], ["outputs", "o1"], ["risks", "r2"]
  ], "complete template bundle must persist project, tasks, specs, planned outputs and risks in one transaction");
}
{
  const deleted = [];
  await assert.rejects(() => persistTemplateBundle({
    project: { id: "p3" }, tasks: [{ id: "t4" }], prds: [{ id: "prd2" }],
    outputs: [{ id: "o2" }], risks: [], stamp, actorId: "u1",
    put: async (coll, rec) => coll === "outputs" ? null : rec,
    softDelete: async (coll, id) => { deleted.push([coll, id]); return { deleted: true }; },
  }), /لم يكتمل إنشاء المشروع/);
  assert.deepEqual(deleted, [["prds", "prd2"], ["tasks", "t4"], ["projects", "p3"]], "offline compensation must roll back every created collection in reverse order");
}
console.log("PASS template bundle failure safety");
