import assert from "node:assert/strict";
import { parseSkinProductsCsv, serializeSkinProductsCsv } from "../src/systems/skincare/domain.js";

const source = [
  "name,brand,category,status,suitability,ingredients,notes",
  '"غسول صباحي","Brand, One",cleanser,active,suitable,"Aqua, Glycerin","ملاحظة فيها, فاصلة"',
  '"سيروم ""فيتامين سي""",Brand Two,serum,paused,review,"Aqua, Ascorbic Acid","سطر ثان"',
].join("\r\n");
const parsed = parseSkinProductsCsv(source);
assert.equal(parsed.ok, true);
assert.equal(parsed.rows.length, 2);
assert.equal(parsed.rows[0].brand, "Brand, One");
assert.equal(parsed.rows[0].notes, "ملاحظة فيها, فاصلة");
assert.equal(parsed.rows[1].name, 'سيروم "فيتامين سي"');
assert.equal(parsed.rows[1].status, "paused");

const deletedProduct = { name: "منتج قديم", brand: "Old", category: "serum", status: "finished", deleted_at: "2026-11-03" };
const serialized = serializeSkinProductsCsv(parsed.rows, [deletedProduct]);
assert.ok(serialized.startsWith("\uFEFF"), "CSV must use a real UTF-8 BOM");
assert.ok(serialized.includes("\r\n"), "CSV must use standard CRLF rows");
const formulaCsv = serializeSkinProductsCsv([{ name: "=SUM(A1:A2)" }]);
assert.ok(formulaCsv.includes("'=SUM(A1:A2)"), "formula-like values must be neutralized");
assert.ok(serialized.includes("'=SUM(A1:A2)"), "formula-like values must be neutralized");
const roundTrip = parseSkinProductsCsv(serialized);
assert.equal(roundTrip.ok, true);
assert.equal(roundTrip.rows.length, 3);
assert.equal(roundTrip.rows[2].name, "منتج قديم");
assert.equal(roundTrip.rows[2].deleted_at, "2026-11-03", "soft-deleted product state is preserved on export");
for (const key of ["name", "brand", "category", "status", "suitability", "ingredients", "notes"]) {
  assert.equal(roundTrip.rows[0][key], parsed.rows[0][key]);
  assert.equal(roundTrip.rows[1][key], parsed.rows[1][key]);
}

assert.equal(parseSkinProductsCsv("\uFEFFname,category\r\nمنتج,serum").ok, true, "parser accepts standard UTF-8 BOM");
assert.equal(parseSkinProductsCsv("brand,category\r\nAcme,serum").ok, false);
assert.equal(parseSkinProductsCsv('name,notes\r\n"منتج,مفتوح').ok, false);
assert.equal(parseSkinProductsCsv("name,category\r\n,serum").ok, false);
assert.equal(parseSkinProductsCsv("name,category\r\nمنتج,serum,extra").ok, true);
assert.equal(parseSkinProductsCsv("name,category\r\n=SUM(A1:A2),serum").rows[0].name, "=SUM(A1:A2)");
console.log("Skincare product CSV import/export tests passed.");
