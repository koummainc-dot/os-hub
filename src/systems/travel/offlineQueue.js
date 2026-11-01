const prefix = "travel-sync-queue:v1:";

export function travelSyncQueueKey(workspaceId) {
  return workspaceId ? prefix + encodeURIComponent(String(workspaceId)) : null;
}

export function readTravelSyncQueue(storage, workspaceId) {
  const key = travelSyncQueueKey(workspaceId);
  if (!key || !storage) return null;
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const item = JSON.parse(raw);
    if (!item || item.version !== 1 || !item.data || typeof item.data !== "object" || !("baseUpdatedAt" in item)) return null;
    return item;
  } catch {
    return null;
  }
}

export function writeTravelSyncQueue(storage, workspaceId, data, baseUpdatedAt, queuedAt = new Date().toISOString()) {
  const key = travelSyncQueueKey(workspaceId);
  if (!key || !storage || !data || typeof data !== "object") return false;
  const item = { version: 1, workspaceId: String(workspaceId), baseUpdatedAt: baseUpdatedAt || null, queuedAt, data };
  try { storage.setItem(key, JSON.stringify(item)); return true; } catch { return false; }
}

export function clearTravelSyncQueue(storage, workspaceId) {
  const key = travelSyncQueueKey(workspaceId);
  if (!key || !storage) return false;
  try { storage.removeItem(key); return true; } catch { return false; }
}

export function assessTravelSyncQueue(item, serverUpdatedAt, serverAvailable) {
  if (!item) return { state: "none", canReplay: false };
  if (!serverAvailable) return { state: "waiting-for-server", canReplay: false };
  if ((item.baseUpdatedAt || null) !== (serverUpdatedAt || null)) {
    return { state: "conflict", canReplay: false };
  }
  return { state: "ready", canReplay: true };
}
