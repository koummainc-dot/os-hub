// Coordinates a template-created project bundle and compensates for partial writes.
// A falsy result from the record API is a failed write (network-queued writes return a record).
export async function persistTemplateBundle({ project, tasks, risks, put, putAtomic, atomic = false, softDelete, stamp, actorId }) {
  if (atomic && typeof putAtomic === "function") {
    const ops = [
      { coll: "projects", rec: stamp(project) },
      ...(tasks || []).map((record) => ({ coll: "tasks", rec: stamp(record) })),
      ...(risks || []).map((record) => ({ coll: "risks", rec: stamp(record) })),
    ];
    const saved = await putAtomic(ops);
    if (!Array.isArray(saved) || saved.length !== ops.length) throw new Error("لم يؤكد الخادم حفظ حزمة القالب بالكامل.");
    return project;
  }
  const written = { project: false, tasks: [], risks: [] };
  const write = async (collection, record) => {
    const saved = await put(collection, stamp(record));
    if (!saved) throw new Error(`تعذّر حفظ سجل ضمن إنشاء المشروع (${collection}).`);
    return saved;
  };
  try {
    await write("projects", project);
    written.project = true;
    for (const task of tasks || []) {
      await write("tasks", task);
      written.tasks.push(task.id);
    }
    for (const risk of risks || []) {
      await write("risks", risk);
      written.risks.push(risk.id);
    }
    return project;
  } catch (error) {
    const cleanupErrors = [];
    const cleanup = async (collection, id) => {
      try {
        const result = await softDelete(collection, id, actorId);
        if (!result) throw new Error(`تعذّر تأكيد تنظيف ${collection}/${id}`);
      } catch (e) { cleanupErrors.push({ collection, id, error: e }); }
    };
    for (const id of [...written.risks].reverse()) await cleanup("risks", id);
    for (const id of [...written.tasks].reverse()) await cleanup("tasks", id);
    if (written.project) await cleanup("projects", project.id);
    if (cleanupErrors.length) {
      const detail = cleanupErrors.map((x) => `${x.collection}/${x.id}`).join(", ");
      throw new Error(`فشل إنشاء المشروع من القالب، وتعذّر تأكيد تنظيف بعض السجلات الجزئية: ${detail}. راجع سلة Projects OS قبل إعادة المحاولة.`, { cause: error });
    }
    throw new Error(`لم يكتمل إنشاء المشروع من القالب؛ أُلغي ما أمكن من السجلات الجزئية. ${error?.message || "حاول مرة أخرى."}`, { cause: error });
  }
}
