// Pure guards and helpers for replaying a locally queued record write.
// Projects only queues edits to existing Tasks and only for an allowlist of
// scalar fields. Replay never overwrites a newer server version implicitly.
const PROJECTS_OFFLINE_TASK_FIELDS = Object.freeze([
  "title", "description", "priority", "due_date", "assignee_id", "planning_bucket"
]);

export function canReplayQueuedWrite(currentServerTs, queuedBaseTs) {
  return (currentServerTs || null) === (queuedBaseTs || null);
}

export function rebaseQueuedTaskEdit({ baseRecord, localRecord, serverRecord, allowedFields = PROJECTS_OFFLINE_TASK_FIELDS }) {
  if (!baseRecord || !localRecord || !serverRecord || localRecord.id !== serverRecord.id || baseRecord.id !== serverRecord.id) {
    return { ok: false, reason: "missing-version", conflictingFields: [] };
  }
  const changedFields = allowedFields.filter((field) =>
    JSON.stringify(localRecord[field]) !== JSON.stringify(baseRecord[field])
  );
  const conflictingFields = changedFields.filter((field) =>
    JSON.stringify(serverRecord[field]) !== JSON.stringify(baseRecord[field]) &&
    JSON.stringify(serverRecord[field]) !== JSON.stringify(localRecord[field])
  );
  if (conflictingFields.length) {
    return { ok: false, reason: "overlapping-edits", changedFields, conflictingFields };
  }
  const mergedRecord = { ...serverRecord };
  for (const field of changedFields) mergedRecord[field] = localRecord[field];
  return {
    ok: true,
    changedFields,
    conflictingFields: [],
    record: mergedRecord
  };
}
