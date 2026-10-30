const EVENT_KEY = "os-hub:integration-events:v1";
const EVENT_NAME = "os-hub:integration-event";
const MAX_EVENTS = 500;

const safeParse = value => {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.filter(x => x && typeof x === "object") : [];
  } catch {
    return [];
  }
};

const makeId = () =>
  globalThis.crypto?.randomUUID?.() ||
  "evt-" + Date.now() + "-" + Math.random().toString(36).slice(2);

function getStoredEvents() {
  if (typeof localStorage === "undefined") return [];
  try {
    return safeParse(localStorage.getItem(EVENT_KEY));
  } catch {
    return [];
  }
}

/**
 * Publish a versioned, workspace-scoped domain event.
 * This browser/localStorage transport is intentionally best-effort; it is not
 * a replacement for a durable server-side event bus.
 */
export function publishOSEvent(event, workspaceId = "default", source = "learning") {
  if (!event || typeof event.type !== "string" || !event.type.trim()) {
    throw new TypeError("publishOSEvent requires a non-empty event.type");
  }

  const item = {
    id: makeId(),
    workspaceId: String(workspaceId || "default"),
    source: String(source || "unknown"),
    type: event.type.trim(),
    entityType: event.entityType || null,
    entityId: event.entityId == null ? null : String(event.entityId),
    occurredAt: event.occurredAt || new Date().toISOString(),
    payload: event.payload && typeof event.payload === "object" ? event.payload : {},
    version: 1,
  };

  try {
    const old = getStoredEvents();
    localStorage.setItem(EVENT_KEY, JSON.stringify([...old, item].slice(-MAX_EVENTS)));
  } catch {
    // Events should never break the originating OS if storage is unavailable.
  }

  if (typeof window !== "undefined" && typeof CustomEvent !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: item }));
    } catch {
      // The in-memory notification is best effort.
    }
  }
  return item;
}

export function readOSEvents({ workspaceId = "default", after = null, limit = 100, source = null, types = null } = {}) {
  const max = Math.max(1, Math.min(MAX_EVENTS, Number(limit) || 100));
  const allowedTypes = Array.isArray(types) && types.length ? new Set(types) : null;
  return getStoredEvents()
    .filter(item => String(item.workspaceId) === String(workspaceId || "default"))
    .filter(item => !after || String(item.occurredAt) > String(after))
    .filter(item => !source || item.source === source)
    .filter(item => !allowedTypes || allowedTypes.has(item.type))
    .slice(-max);
}

/**
 * Subscribe to events from this browser tab. Callers must unsubscribe on
 * unmount. For cross-tab changes, use subscribeToStoredOSEvents as well.
 */
export function subscribeOSEvents(handler, { workspaceId = null, source = null, types = null } = {}) {
  if (typeof window === "undefined" || typeof handler !== "function") return () => {};
  const allowedTypes = Array.isArray(types) && types.length ? new Set(types) : null;
  const listener = e => {
    const item = e?.detail;
    if (!item || typeof item !== "object") return;
    if (workspaceId != null && String(item.workspaceId) !== String(workspaceId)) return;
    if (source && item.source !== source) return;
    if (allowedTypes && !allowedTypes.has(item.type)) return;
    handler(item);
  };
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}

/** Subscribe to storage changes from other tabs in the same browser profile. */
export function subscribeToStoredOSEvents(handler, options = {}) {
  if (typeof window === "undefined" || typeof handler !== "function") return () => {};
  const listener = e => {
    if (e.key !== EVENT_KEY) return;
    handler(readOSEvents(options));
  };
  window.addEventListener("storage", listener);
  return () => window.removeEventListener("storage", listener);
}

export const OS_INTEGRATION_EVENT_NAME = EVENT_NAME;
