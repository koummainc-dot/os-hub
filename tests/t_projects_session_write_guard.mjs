import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const store = await readFile(new URL("../src/systems/projects/store.jsx", import.meta.url), "utf8");
const start = store.indexOf("async startTimer(taskId)");
const end = store.indexOf("async addSession(v)", start);
assert.ok(start >= 0 && end > start, "timer/session actions must remain available");
const actions = store.slice(start, end);
const manualSessionStart = store.indexOf("async addSession(v)");
const manualSessionEnd = store.indexOf("async voidSession(s, reason)", manualSessionStart);
assert.ok(manualSessionStart >= 0 && manualSessionEnd > manualSessionStart, "manual session action must remain available");
const manualSession = store.slice(manualSessionStart, manualSessionEnd);

assert.match(actions, /const task = idx\.byId\[taskId\]/, "timer start must resolve the task from the current task index");
assert.match(actions, /!idx\.isLeaf\(taskId\)/, "timer start must reject parent or missing tasks");
assert.match(actions, /can\("session\.write", projectsById\[task\.project_id\]\)/, "timer start must check project-level session permission");
assert.match(actions, /const task = idx\.byId\[cur\.task_id\]/, "timer stop must revalidate its linked task");
assert.match(actions, /!idx\.isLeaf\(cur\.task_id\)/, "timer stop must not record a session for a missing/non-leaf task");
assert.match(manualSession, /const task = idx\.byId\[v\?\.task_id\]/, "manual session must validate its task reference");
assert.match(manualSession, /const s = \{ \.\.\.v, member_id: me, source: v\.source \|\| "manual"/, "session ownership must be server-context actor, not caller-supplied member_id");
assert.match(manualSession, /D\.validateSession\(s\)/, "session domain validation must still run");
console.log("Projects session write guard contract tests passed.");
