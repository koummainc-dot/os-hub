import assert from "node:assert/strict";
import {
  inventoryToday, inventoryDateOffset, prepareInventoryItem,
  prepareInventoryCategory, prepareInventoryPlace, archiveInventoryReference,
  prepareRelatedInventoryRecord, returnInventoryLoan
} from "../src/systems/inventory/services.js";

const today = inventoryToday("Africa/Cairo");
assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
assert.match(inventoryDateOffset(30, "Africa/Cairo"), /^\d{4}-\d{2}-\d{2}$/);
assert.ok(inventoryDateOffset(30, "Africa/Cairo") > today);

const uid = (() => { let n = 0; return () => "test-" + (++n); })();
const blank = () => ({
  items: [], categories: [], places: [], warranties: [], loans: [],
  replacements: [], services: [], events: [], settings: { currency: "EGP" }
});

let data = blank();
const category = prepareInventoryCategory({ name: "أجهزة" }, data, today, uid);
assert.equal(category.error, undefined);
data = category.data;
assert.equal(prepareInventoryCategory({ name: " أجهزة " }, data, today, uid).error !== undefined, true);

const home = prepareInventoryPlace({ name: "المنزل", parentId: "" }, data, today, uid);
data = home.data;
const room = prepareInventoryPlace({ name: "غرفة", parentId: home.row.id }, data, today, uid);
data = room.data;
assert.ok(prepareInventoryPlace({ ...home.row, parentId: room.row.id }, data, today, uid).error);

const created = prepareInventoryItem({
  name: "حاسوب", categoryId: category.row.id, placeId: home.row.id,
  status: "Owned", quantity: "1", purchasePrice: "", estimatedValue: "",
  currency: "EGP", sensitivity: "Normal"
}, data, today, uid);
assert.equal(created.errors.length, 0);
data = created.data;
const item = created.item;
assert.ok(data.events.some(event => event.itemId === item.id && event.type === "Acquired"));

const moved = prepareInventoryItem({
  ...item, placeId: room.row.id, status: "Loaned"
}, data, today, uid);
assert.equal(moved.errors.length, 0);
assert.ok(moved.data.events.some(event => event.itemId === item.id && event.type === "Moved"));
assert.ok(moved.data.events.some(event => event.itemId === item.id && event.type === "Loaned"));
data = moved.data;

const warrantyInvalid = prepareRelatedInventoryRecord("warranty", {
  itemId: item.id, startDate: "2026-05-02", endDate: "2026-05-01"
}, data, today, uid);
assert.ok(warrantyInvalid.error);

data = {
  ...data,
  loans: [{ id: "loan-test", itemId: item.id, person: "شخص", loanedAt: today, dueDate: "", returnedAt: "" }]
};
const returned = returnInventoryLoan(data, "loan-test", today, uid);
assert.equal(returned.error, undefined);
assert.equal(returned.data.loans[0].returnedAt, today);
assert.ok(returned.data.events.some(event => event.type === "LoanReturned"));
assert.equal(returned.data.items.find(x => x.id === item.id).status, "Owned");

const createdLoan = prepareRelatedInventoryRecord("loan", {
  itemId: item.id, person: "شخص آخر", direction: "Lent", loanedAt: today, dueDate: ""
}, returned.data, today, uid);
assert.equal(createdLoan.error, undefined);
assert.equal(createdLoan.data.items.find(x => x.id === item.id).status, "Loaned");
const duplicateLoan = prepareRelatedInventoryRecord("loan", {
  itemId: item.id, person: "شخص ثالث", direction: "Lent", loanedAt: today, dueDate: ""
}, createdLoan.data, today, uid);
assert.ok(duplicateLoan.error);

// Returning a lent item restores ownership; borrowing an item from someone
// else must never mutate this user's ownership status.
const returnedLentLoan = returnInventoryLoan(createdLoan.data, createdLoan.row.id, today, uid);
assert.equal(returnedLentLoan.error, undefined);
assert.equal(returnedLentLoan.data.items.find(x => x.id === item.id).status, "Owned");
const borrowedLoan = prepareRelatedInventoryRecord("loan", {
  itemId: item.id, person: "صاحب العنصر", direction: "Borrowed", loanedAt: today, dueDate: ""
}, returnedLentLoan.data, today, uid);
assert.equal(borrowedLoan.error, undefined);
assert.equal(borrowedLoan.data.items.find(x => x.id === item.id).status, "Owned");
const returnedBorrowedLoan = returnInventoryLoan(borrowedLoan.data, borrowedLoan.row.id, today, uid);
assert.equal(returnedBorrowedLoan.error, undefined);
assert.equal(returnedBorrowedLoan.data.items.find(x => x.id === item.id).status, "Owned");

const invalidLoanDates = prepareRelatedInventoryRecord("loan", {
  itemId: item.id, person: "شخص", direction: "Borrowed", loanedAt: "2026-05-02", dueDate: "2026-05-01"
}, returnedBorrowedLoan.data, today, uid);
assert.ok(invalidLoanDates.error);

const archiveUsedPlace = archiveInventoryReference(data, "place", room.row.id, today, uid);
assert.ok(archiveUsedPlace.error);

const badAmount = prepareInventoryItem({
  name: "عنصر غير صالح", quantity: "1", purchasePrice: "-3", estimatedValue: ""
}, data, today, uid);
assert.ok(badAmount.errors.length > 0);

console.log("Inventory domain service tests passed.");
