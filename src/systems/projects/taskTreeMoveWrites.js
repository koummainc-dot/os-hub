// Multi-record task-tree move with compensating rollback on a failed write.
// The record API may queue offline writes; queued records are returned as truthy values.
export async function persistTaskTreeMove({ taskPatches, outputPatches, put }) {
  const changes = [
    ...(taskPatches || []).map(({ before, after }) => ({ collection: "tasks", before, after })),
    ...(outputPatches || []).map(({ before, after }) => ({ collection: "outputs", before, after })),
  ];
  const written = [];
  try {
    for (const change of changes) {
      const saved = await put(change.collection, change.after);
      if (!saved) throw new Error(`تعذّر حفظ ${change.collection}/${change.after.id}`);
      written.push(change);
    }
    return true;
  } catch (error) {
    const rollbackErrors = [];
    for (const change of written.reverse()) {
      try {
        const restored = await put(change.collection, change.before);
        if (!restored) throw new Error("rollback write failed");
      } catch {
        rollbackErrors.push(`${change.collection}/${change.after.id}`);
      }
    }
    if (rollbackErrors.length) {
      throw new Error(`فشل نقل الشجرة، وتعذّر استرجاع بعض السجلات: ${rollbackErrors.join(", ")}. راجع المهام والمخرجات في المشروعين قبل إعادة المحاولة.`, { cause: error });
    }
    throw new Error(`لم يكتمل نقل الشجرة؛ أُعيدت السجلات التي سبق تحديثها. ${error?.message || ""}`, { cause: error });
  }
}
