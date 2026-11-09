// Coordinates a complete project template bundle. Online writes must stay atomic;
// offline fallback compensates every collection it has already created.
export async function persistTemplateBundle({ project, tasks, risks, prds, outputs, put, putAtomic, atomic = false, softDelete, stamp, actorId }) {
  const collections = [
    ["tasks", tasks || []],
    ["prds", prds || []],
    ["outputs", outputs || []],
    ["risks", risks || []],
  ];
  if (atomic && typeof putAtomic === "function") {
    const ops = [
      { coll: "projects", rec: stamp(project) },
      ...collections.flatMap(([coll, records]) => records.map((record) => ({ coll, rec: stamp(record) }))),
    ];
    const saved = await putAtomic(ops);
    if (!Array.isArray(saved) || saved.length !== ops.length) throw new Error("لم يؤكد الخادم حفظ حزمة القالب بالكامل.");
    return project;
  }

  const written = [];
  const write = async (collection, record) => {
    const saved = await put(collection, stamp(record));
    if (!saved) throw new Error(`تعذّر حفظ سجل ضمن إنشاء المشروع (${collection}).`);
    written.push([collection, record.id]);
    return saved;
  };
  try {
    await write("projects", project);
    for (const [collection, records] of collections) {
      for (const record of records) await write(collection, record);
    }
    return project;
  } catch (error) {
    const cleanupErrors = [];
    for (const [collection, id] of [...written].reverse()) {
      try {
        const result = await softDelete(collection, id, actorId);
        if (!result) throw new Error(`تعذّر تأكيد تنظيف ${collection}/${id}`);
      } catch (e) { cleanupErrors.push({ collection, id, error: e }); }
    }
    if (cleanupErrors.length) {
      const detail = cleanupErrors.map((x) => `${x.collection}/${x.id}`).join(", ");
      throw new Error(`فشل إنشاء المشروع من القالب، وتعذّر تأكيد تنظيف بعض السجلات الجزئية: ${detail}. راجع سلة Projects OS قبل إعادة المحاولة.`, { cause: error });
    }
    throw new Error(`لم يكتمل إنشاء المشروع من القالب؛ أُلغي ما أمكن من السجلات الجزئية. ${error?.message || "حاول مرة أخرى."}`, { cause: error });
  }
}
