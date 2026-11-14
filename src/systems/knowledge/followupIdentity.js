function normalizeText(value) {
  return String(value ?? "").normalize("NFKC").replace(/\s+/g, " ").trim();
}
export function normalizeKnowledgeFollowup(value) {
  if (value && typeof value === "object") {
    const title = normalizeText(value.title ?? value.text ?? value.description ?? value.label ?? "");
    const explicitId = normalizeText(value.followup_id ?? value.followupId ?? value.id ?? value.uuid ?? "");
    return { title, explicitId };
  }
  return { title: normalizeText(value), explicitId: "" };
}
function hashText(value) {
  let first = 2166136261;
  let second = 2246822519;
  let index = 0;
  for (const point of value) {
    const code = point.codePointAt(0);
    first = Math.imul(first ^ code, 16777619);
    second = Math.imul(second ^ (code + index), 3266489917);
    index += 1;
  }
  return (first >>> 0).toString(36) + "-" + (second >>> 0).toString(36);
}
export function stableKnowledgeFollowupId(meetingId, value) {
  const meeting = normalizeText(meetingId);
  const { title, explicitId } = normalizeKnowledgeFollowup(value);
  if (!meeting || (!title && !explicitId)) return "";
  return explicitId ? meeting + ":id:" + encodeURIComponent(explicitId) : meeting + ":text:" + hashText(title);
}
export function findKnowledgeFollowupTask(tasks, meetingId, value, legacyIndex) {
  const meeting = String(meetingId ?? "");
  const identity = stableKnowledgeFollowupId(meeting, value);
  const { title } = normalizeKnowledgeFollowup(value);
  const rows = Array.isArray(tasks) ? tasks : [];
  return rows.find((task) => String(task.source_meeting_id ?? "") === meeting
      && identity && String(task.source_followup_id ?? "") === identity)
    || rows.find((task) => String(task.source_meeting_id ?? "") === meeting
      && task.source_followup_id == null
      && title && normalizeText(task.source_followup_title ?? task.title) === title)
    || rows.find((task) => String(task.source_meeting_id ?? "") === meeting
      && legacyIndex != null && task.source_followup_id == null
      && Number(task.source_followup_index) === Number(legacyIndex))
    || null;
}
