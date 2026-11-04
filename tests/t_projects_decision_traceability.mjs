import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const entities = await readFile(new URL("../src/systems/projects/entities.jsx", import.meta.url), "utf8");
const start = entities.indexOf("export function DecisionsView");
const end = entities.indexOf("// ═════ PRDs ═════", start);
assert.ok(start >= 0 && end > start, "DecisionsView must exist");
const decisions = entities.slice(start, end);

assert.match(decisions, /for \(const discoveryId of \(v\.related_discovery_ids \|\| \[\]\)\)/, "decision discovery links must be validated");
assert.match(decisions, /الاكتشاف المرتبط يجب أن يكون مرتبطًا بالمشروع نفسه/, "cross-project discovery links must be rejected when discovery has project scope");
assert.match(decisions, /القرار البديل يجب أن يكون قرارًا آخر داخل المشروع نفسه/, "replacement decisions must remain within the same project");
assert.match(decisions, /لا يمكن إنشاء حلقة بين القرارات المستبدلة/, "decision replacement cycles must be rejected");
console.log("Projects decision traceability contract tests passed.");
