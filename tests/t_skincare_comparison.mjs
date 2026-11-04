import assert from "node:assert/strict";
import { buildSkinComparisonMatrix, serializeSkinComparisonCsv, summarizeSkinProductUnits, buildSkinDashboardExportMatrix } from "../src/systems/skincare/domain.js";

const products = [
  { id: "p1", name: "غسول, صباحي", brand: "Brand A", ingredients: "Aqua, Glycerin, Unknown INCI", url: "https://example.com/product" },
  { id: "p2", name: "=SUM(A1:A2)", brand: "Brand B", ingredients: "Aqua; Niacinamide" },
  { id: "deleted", name: "محذوف", deleted_at: "2026-11-01" },
];
const units = [
  { id: "u1", productId: "p1", price: 100, currency: "EGP", startedUseDate: "2026-11-01" },
  { id: "u2", productId: "p1", price: 10, currency: "USD", startedUseDate: "2026-11-02" },
  { id: "u3", productId: "p1", price: 20, currency: "EGP", deleted_at: "2026-11-03" },
  { id: "u4", productId: "p2", price: 60, currency: "EGP", startedUseDate: "2026-11-10" },
  { id: "u5", productId: "p2", price: 30, currency: "EGP", startedUseDate: "2026-11-12", finishedDate: "2026-11-10" },
];
const ingredients = [{ inciName: "Aqua", aliases: ["Water"] }, { inciName: "Niacinamide", aliases: [] }];

const summary = summarizeSkinProductUnits("p1", units, "2026-11-04");
assert.equal(summary.count, 2, "soft-deleted units are excluded");
assert.equal(summary.mixedCurrencies, true);
assert.deepEqual(summary.totalsByCurrency, { EGP: 100, USD: 10 });
assert.equal(summary.costPerDay, null, "more than one valid cost period must not be collapsed into one figure");
assert.equal(summary.dailyCostAmbiguous, true);

const invalidDates = summarizeSkinProductUnits("p2", units, "2026-11-04");
assert.equal(invalidDates.costPerDay, null, "future start / end-before-start periods are excluded");
assert.equal(invalidDates.dailyCostAmbiguous, false);

const matrix = buildSkinComparisonMatrix(products, units, ingredients, "2026-11-04");
assert.equal(matrix[0].length, 3);
assert.equal(matrix[0][1], "غسول, صباحي");
assert.equal(matrix[0][2], "=SUM(A1:A2)");
assert.equal(matrix.find(row => row[0] === "مطابقة مكتبتك")[1], 1);
assert.equal(matrix.find(row => row[0] === "مكونات غير معروفة")[1], 2);
assert.match(matrix.find(row => row[0] === "إجمالي أسعار العبوات")[1], /100\.00 EGP \/ 10\.00 USD/);

const csv = serializeSkinComparisonCsv(matrix);
assert.ok(csv.startsWith("\uFEFF"));
assert.ok(csv.includes("\r\n"));
assert.ok(csv.includes('"غسول, صباحي"'));
assert.ok(csv.includes('"'=SUM(A1:A2)"'), "spreadsheet formulas are neutralized");
console.log("Skincare comparison and CSV export tests passed.");

const strictDateUnits = [
  { id: "valid", productId: "p3", price: 90, currency: "EGP", startedUseDate: "2026-11-01" },
  { id: "invalid-calendar", productId: "p3", price: 20, currency: "EGP", startedUseDate: "2026-02-30" },
  { id: "future", productId: "p3", price: 40, currency: "EGP", startedUseDate: "2026-11-10" },
  { id: "deleted", productId: "p3", price: 80, currency: "EGP", startedUseDate: "2026-11-01", deleted_at: "2026-11-02" },
];
const strictSummary = summarizeSkinProductUnits("p3", strictDateUnits, "2026-11-04");
assert.equal(strictSummary.count, 3, "deleted units are not counted");
assert.equal(strictSummary.costPerDay.value, 22.5, "only the valid use period contributes to daily cost");
assert.equal(strictSummary.dailyCostAmbiguous, false, "only valid cost periods count toward ambiguity");
assert.equal(strictSummary.totalsByCurrency.EGP, 150, "historical prices remain grouped by currency");

const dashboardRows = buildSkinDashboardExportMatrix({
  data: {
    startDate: "2026-10-01", endDate: "2026-10-30",
    productSummary: { activeCount: 1, inactiveCount: 2, deletedCount: 1, savedCount: 3 },
    runningTrialCount: 1, pausedTrialCount: 0, rangeTrialCount: 3,
    rangeReactionCount: 2, routineLogCount: 5, routineDoneCount: 4, routineSkippedCount: 1,
    averageRating: 3.5,
  },
  products: [{ id: "active", name: "Active product", status: "active" }],
  deletedProducts: [{ id: "deleted", name: "Deleted product", deleted_at: "2026-10-20" }],
  trials: [{ id: "trial-old", productId: "deleted", status: "completed", startDate: "2026-10-02", productNameSnapshot: "Historic serum" }],
  reactions: [{ id: "reaction-old", productId: "deleted", status: "closed", dateStarted: "2026-10-03", productNameSnapshot: "Historic serum", severity: "moderate" }],
  routineLogs: [{ id: "log-old", productIdSnapshot: "deleted", status: "done", date: "2026-10-04", productNameSnapshot: "Historic serum", routineNameSnapshot: "Evening", stepCategorySnapshot: "serum" }],
});
assert.equal(dashboardRows.find(row => row[1] === "product.active")[3], 1);
assert.equal(dashboardRows.find(row => row[1] === "product.inactive")[3], 2);
assert.equal(dashboardRows.find(row => row[1] === "product.deleted")[3], 1);
assert.equal(dashboardRows.find(row => row[1] === "trial.history")[3], 3);
assert.ok(dashboardRows.some(row => row[0] === "تجربة تاريخية" && row[2] === "Historic serum"), "historical trial export uses saved product name");
assert.ok(dashboardRows.some(row => row[0] === "تفاعل تاريخي" && row[2] === "Historic serum"), "historical reaction export uses saved product name");
assert.ok(dashboardRows.some(row => row[0] === "سجل روتين تاريخي" && row[2] === "Historic serum" && row[6].includes("Evening")), "routine log export preserves historical product and routine names");
