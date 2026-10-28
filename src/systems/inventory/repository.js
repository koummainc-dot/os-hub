// Inventory aggregate repository.
// Keeps the UI independent from the persistence adapter: today it delegates to
// the existing workspace_data API; a normalized-table repository can replace it
// later without changing the screens.
export function createInventoryRepository(api, normalize) {
  if (!api || typeof api.load !== "function" || typeof api.save !== "function") {
    throw new Error("Inventory repository requires load/save API methods.");
  }
  if (typeof normalize !== "function") {
    throw new Error("Inventory repository requires the aggregate normalizer.");
  }

  return Object.freeze({
    async load() {
      const result = await api.load();
      if (!result || typeof result !== "object") return result;
      if (result.data && typeof result.data === "object") {
        return { ...result, data: normalize(result.data) };
      }
      return result;
    },
    async save(value) {
      const aggregate = normalize(value);
      const requiredArrays = [
        "items", "categories", "places", "warranties", "loans",
        "replacements", "events", "services"
      ];
      for (const key of requiredArrays) {
        if (!Array.isArray(aggregate[key])) {
          throw new Error(`Invalid Inventory data: ${key} must be an array.`);
        }
      }
      if (!aggregate.settings || typeof aggregate.settings !== "object") {
        throw new Error("Invalid Inventory data: settings must be an object.");
      }
      return api.save(aggregate);
    }
  });
}
