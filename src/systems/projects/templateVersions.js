const CONTENT_FIELDS = [
  "name",
  "description",
  "final_goal",
  "project_type",
  "duration_days",
  "task_tree",
  "objective_templates",
  "risks",
  "prd_templates",
  "output_templates",
  "decision_prompts",
  "team_roles",
  "checklist",
];
const MAX_HISTORY = 20;
const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));

export function snapshotTemplateVersion(template) {
  if (!template || typeof template !== "object") throw new Error("القالب غير صالح لإنشاء نسخة.");
  const snapshot = {
    version: Math.max(1, Number(template.version) || 1),
    updated_at: template.updated_at || template.created_at || null,
  };
  for (const field of CONTENT_FIELDS) snapshot[field] = clone(template[field] ?? (["task_tree", "objective_templates", "risks", "prd_templates", "output_templates", "decision_prompts", "team_roles", "checklist"].includes(field) ? [] : ""));
  return snapshot;
}

export function prepareTemplateSave(previous, draft, now = new Date().toISOString()) {
  if (!draft || typeof draft !== "object") throw new Error("بيانات القالب غير صالحة.");
  if (!previous) {
    return {
      ...clone(draft),
      version: 1,
      version_history: [],
      created_at: draft.created_at || now,
      updated_at: now,
      builtin: false,
    };
  }
  if (previous.builtin) throw new Error("القوالب المدمجة لا تُعدّل؛ انسخ القالب أولًا.");
  const previousSnapshot = snapshotTemplateVersion(previous);
  const history = Array.isArray(previous.version_history) ? previous.version_history.map(clone) : [];
  return {
    ...clone(draft),
    id: previous.id,
    version: previousSnapshot.version + 1,
    version_history: [...history, previousSnapshot].slice(-MAX_HISTORY),
    created_at: previous.created_at || now,
    updated_at: now,
    builtin: false,
  };
}

export function restoreTemplateVersion(current, selectedVersion, now = new Date().toISOString()) {
  if (!current?.id || !selectedVersion || !Number.isFinite(Number(selectedVersion.version))) {
    throw new Error("تعذّر تحديد إصدار القالب المطلوب استعادته.");
  }
  if (current.builtin) throw new Error("لا يمكن استعادة إصدار لقالب مدمج.");
  const history = Array.isArray(current.version_history) ? current.version_history : [];
  const found = history.some((version) =>
    Number(version.version) === Number(selectedVersion.version) &&
    JSON.stringify(version) === JSON.stringify(selectedVersion)
  );
  if (!found) throw new Error("الإصدار المطلوب غير موجود في سجل هذا القالب.");
  const currentSnapshot = snapshotTemplateVersion(current);
  const restored = snapshotTemplateVersion(selectedVersion);
  return {
    ...clone(current),
    ...restored,
    id: current.id,
    version: currentSnapshot.version + 1,
    version_history: [...history.map(clone), currentSnapshot].slice(-MAX_HISTORY),
    created_at: current.created_at || now,
    updated_at: now,
    builtin: false,
  };
}

export const TEMPLATE_VERSION_HISTORY_LIMIT = MAX_HISTORY;
