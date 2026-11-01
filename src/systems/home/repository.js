import { normalizeHomeData } from "./domain.js";

const MISSING_HOME_RPC_CODES = new Set(["PGRST202", "42883"]);

function isMissingHomeRpc(error) {
  return !!error && (
    MISSING_HOME_RPC_CODES.has(error.code) ||
    /function .*home_(load|save)_snapshot.*(not found|does not exist)|could not find the function/i.test(error.message || "")
  );
}

export function createHomeRepository(api) {
  if (!api || typeof api.load !== "function" || typeof api.save !== "function") {
    throw new Error("Home repository requires load/save API methods.");
  }

  return Object.freeze({
    async load() {
      if (typeof api.loadNormalizedHome === "function") {
        const normalized = await api.loadNormalizedHome();
        if (normalized?.available && !normalized.error) {
          return {
            data: normalizeHomeData(normalized.data),
            source: "normalized",
            updatedAt: normalized.updatedAt || null,
            error: null
          };
        }

        // A missing RPC may use the legacy store for a read-only compatibility
        // path while the migration is being tested. Writes never use this path.
        if (normalized?.available && normalized.error && !isMissingHomeRpc(normalized.error)) {
          throw normalized.error;
        }
      }

      const result = await api.load();
      if (!result || typeof result !== "object") return result;
      return result.data && typeof result.data === "object"
        ? { ...result, data: normalizeHomeData(result.data) }
        : result;
    },

    async save(value) {
      const aggregate = normalizeHomeData(value);
      for (const key of ["properties", "rooms", "items", "movements"]) {
        if (!Array.isArray(aggregate[key])) {
          throw new Error(`Invalid Home data: ${key} must be an array.`);
        }
      }
      if (!aggregate.settings || typeof aggregate.settings !== "object") {
        throw new Error("Invalid Home data: settings must be an object.");
      }

      const propertyIds = new Set(aggregate.properties.map(x => x.id));
      for (const room of aggregate.rooms.filter(x => !x.deletedAt)) {
        if (!propertyIds.has(room.propertyId)) throw new Error("HOME_ROOM_PROPERTY_MISSING");
      }
      const itemIds = new Set(aggregate.items.map(x => x.id));
      for (const movement of aggregate.movements) {
        if (!itemIds.has(movement.itemId)) throw new Error("HOME_MOVEMENT_ITEM_MISSING");
      }

      if (typeof api.saveNormalizedHome === "function") {
        const normalized = await api.saveNormalizedHome(aggregate);
        if (normalized?.available) {
          if (!normalized.ok) throw normalized.error || new Error("HOME_SAVE_FAILED");
          return { ok: true, updatedAt: normalized.updatedAt || null };
        }

        // Fail closed: once the production API exposes the normalized write
        // method, never silently write the same aggregate to workspace_data or
        // localStorage when the normalized RPC/migration is unavailable.
        const error = normalized?.error;
        if (error) {
          const wrapped = new Error(
            isMissingHomeRpc(error)
              ? "HOME_NORMALIZED_STORAGE_REQUIRED: طبقة التخزين العلائقية غير متاحة. لم يتم حفظ البيانات في المسار القديم."
              : (error.message || "HOME_NORMALIZED_STORAGE_REQUIRED")
          );
          wrapped.code = error.code || "HOME_NORMALIZED_STORAGE_REQUIRED";
          wrapped.cause = error;
          throw wrapped;
        }
        throw new Error("HOME_NORMALIZED_STORAGE_REQUIRED: لم يؤكد الخادم توفر مسار الحفظ العلائقي.");
      }

      // A minimal API without normalized methods is only supported for isolated
      // domain tests and explicit demo adapters. Production API exposes the
      // normalized methods above and therefore cannot silently fall through.
      return api.save(aggregate);
    }
  });
}
