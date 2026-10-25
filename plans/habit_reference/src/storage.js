import { createSeedData, STORE_KEY } from "./data.js?v=20261004-1849";

export function loadState() {
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (!saved) return createSeedData();
    const state = JSON.parse(saved);
    if (!state || state.schemaVersion !== 1 || !Array.isArray(state.habits)) throw new Error("نسخة بيانات غير مدعومة");
    return state;
  } catch (error) {
    console.warn("تعذر تحميل البيانات المحلية؛ سيُستخدم نموذج العرض الافتراضي.", error);
    return createSeedData();
  }
}

export function persistState(state) {
  state.updatedAt = new Date().toISOString();
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
  return state;
}

export function resetState() {
  const state = createSeedData();
  persistState(state);
  return state;
}

export function downloadJson(state, filename = "habit-os-export.json") {
  downloadFile(JSON.stringify(state, null, 2), filename, "application/json;charset=utf-8");
}

export function downloadCsv(rows, filename = "habit-os-export.csv") {
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const csvCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const contents = [columns.map(csvCell).join(","), ...rows.map((row) => columns.map((key) => csvCell(row[key])).join(","))].join("\r\n");
  downloadFile(`\uFEFF${contents}`, filename, "text/csv;charset=utf-8");
}

function downloadFile(contents, filename, type) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
}
