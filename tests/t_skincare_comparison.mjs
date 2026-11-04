import assert from "node:assert/strict";
import { buildSkinComparisonMatrix, serializeSkinComparisonCsv, summarizeSkinProductUnits } from "../src/systems/skincare/domain.js";

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
