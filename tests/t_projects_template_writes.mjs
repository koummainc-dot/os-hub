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
console.log("PASS template bundle failure safety");
