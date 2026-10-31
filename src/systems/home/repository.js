import { normalizeHomeData } from "./domain.js";

export function createHomeRepository(api) {
  if (!api || typeof api.load !== "function" || typeof api.save !== "function") {
    throw new Error("Home repository requires load/save API methods.");
  }
  return Object.freeze({
    async load() {
      const result = await api.load();
      if (!result || typeof result !== "object") return result;
      return result.data && typeof result.data === "object" ? { ...result, data: normalizeHomeData(result.data) } : result;
    },
    async save(value) {
      const aggregate = normalizeHomeData(value);
      for (const key of ["properties", "rooms", "items", "movements"]) {
        if (!Array.isArray(aggregate[key])) throw new Error(`Invalid Home data: ${key} must be an array.`);
      }
      if (!aggregate.settings || typeof aggregate.settings !== "object") throw new Error("Invalid Home data: settings must be an object.");
      const propertyIds = new Set(aggregate.properties.filter(x => !x.deletedAt).map(x => x.id));
      for (const room of aggregate.rooms.filter(x => !x.deletedAt)) {
        if (!propertyIds.has(room.propertyId)) throw new Error("HOME_ROOM_PROPERTY_MISSING");
      }
      const itemIds = new Set(aggregate.items.filter(x => !x.deletedAt).map(x => x.id));
      for (const movement of aggregate.movements) {
        if (!itemIds.has(movement.itemId)) throw new Error("HOME_MOVEMENT_ITEM_MISSING");
      }
      return api.save(aggregate);
    }
  });
}
