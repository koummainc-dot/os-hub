import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const parts = await readFile(new URL("../src/systems/projects/parts.jsx", import.meta.url), "utf8");

assert.ok(parts.includes("const PROJECTS_TASK_RENDER_PAGE_SIZE = 80"),
  "Task Tree must use a bounded page size for each expanded branch");
assert.ok(parts.includes("const [rootLimit, setRootLimit] = useState(PROJECTS_TASK_RENDER_PAGE_SIZE)"),
  "large projects must not render every root Task initially");
assert.ok(parts.includes("const [childLimits, setChildLimits] = useState({})") &&
  parts.includes("const pagedKids = visibleKids.slice(0, childLimit)"),
  "expanded Task branches must render children progressively");
assert.ok(parts.includes("const pagedRoots = visibleRoots.slice(0, rootLimit)") &&
  parts.includes("عرض {Math.min(PROJECTS_TASK_RENDER_PAGE_SIZE, visibleKids.length - pagedKids.length)} مهمة فرعية أخرى"),
  "the list tree must expose an explicit next page for roots and child branches");
assert.ok(parts.includes("const flatTasks = projectTasks.slice(0, flatLimit)") &&
  parts.includes("تحميل المزيد من المهام"),
  "Board/Table/Timeline must render a bounded page and expose the remaining rows");
assert.ok(parts.includes("setFlatLimit((current) => current + PROJECTS_TASK_RENDER_PAGE_SIZE * 2)"),
  "flat task views must increase their page size only after an explicit user action");
assert.ok(parts.includes("const projectTasks = idx.list.filter") &&
  parts.includes("const visibilityCache = new Map()"),
  "pagination must not truncate the canonical task set used for calculations and filters");
assert.ok(parts.includes("setChildLimits({})") && parts.includes("setOpen({})"),
  "changing project or filter context must reset expanded-page state");

console.log("✓ Projects 5,000-Task progressive rendering and complete-data contracts passed");
