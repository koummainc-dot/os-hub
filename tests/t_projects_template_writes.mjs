import assert from "node:assert/strict";
import { persistTemplateBundle } from "../src/systems/projects/templateWrites.js";
import { prepareTemplateSave, restoreTemplateVersion, TEMPLATE_VERSION_HISTORY_LIMIT } from "../src/systems/projects/templateVersions.js";

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
{
  const first = prepareTemplateSave(null, {
    id: "template_1", name: "Koumma — قالب", task_tree: [{ title: "الاكتشاف" }],
    prd_templates: [{ title: "Architecture", requirements: [{ title: "ERD" }] }],
  }, "2026-11-01T00:00:00.000Z");
  assert.equal(first.version, 1);
  assert.deepEqual(first.version_history, []);
  const second = prepareTemplateSave(first, {
    id: "template_1", name: "Koumma — قالب v2", task_tree: [{ title: "الاكتشاف" }, { title: "التصميم" }],
  }, "2026-11-02T00:00:00.000Z");
  assert.equal(second.version, 2);
  assert.equal(second.version_history.length, 1);
  assert.equal(second.version_history[0].version, 1);
  assert.equal(second.version_history[0].name, "Koumma — قالب");
  second.version_history[0].task_tree[0].title = "corrupted snapshot";
  assert.equal(first.task_tree[0].title, "الاكتشاف", "version snapshots are deep copies");
  const cleanSecond = prepareTemplateSave(first, { id: "template_1", name: "Koumma — قالب v2", task_tree: [{ title: "الاكتشاف" }, { title: "التصميم" }] }, "2026-11-02T00:00:00.000Z");
  const third = prepareTemplateSave(cleanSecond, { id: "template_1", name: "Koumma — قالب v3", task_tree: [{ title: "التخطيط" }] }, "2026-11-03T00:00:00.000Z");
  const restored = restoreTemplateVersion(third, third.version_history[0], "2026-11-04T00:00:00.000Z");
  assert.equal(restored.id, "template_1");
  assert.equal(restored.version, 4, "restoring an old snapshot creates a new forward version");
  assert.equal(restored.name, "Koumma — قالب");
  assert.equal(restored.task_tree[0].title, "الاكتشاف");
  assert.equal(restored.version_history.at(-1).version, 3, "the pre-restore current version is preserved in history");
  assert.throws(() => restoreTemplateVersion(restored, { version: 99, name: "foreign" }), /غير موجود/);
  assert.throws(() => prepareTemplateSave({ id: "builtin", builtin: true }, { id: "builtin", name: "edited" }), /القوالب المدمجة/);
  let versioned = first;
  for (let i = 0; i < TEMPLATE_VERSION_HISTORY_LIMIT + 5; i++) {
    versioned = prepareTemplateSave(versioned, { id: versioned.id, name: "Version " + (versioned.version + 1), task_tree: [] }, "2026-11-05T00:00:00.000Z");
  }
  assert.equal(versioned.version_history.length, TEMPLATE_VERSION_HISTORY_LIMIT, "history retains the configured rolling window");
}
console.log("PASS template bundle failure safety");
