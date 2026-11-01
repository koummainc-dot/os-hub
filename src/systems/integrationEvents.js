import { supabase } from "../core/supabase.js";

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


/**
 * Persist an integration event through the authenticated server RPC.
 * The browser event is emitted only after the server confirms the durable write.
 */
export async function publishDurableOSEvent(event, workspaceId, sourceSystem, idempotencyKey) {
  if (!event?.type || !workspaceId || !sourceSystem || !idempotencyKey) {
    return { ok: false, reason: "invalid-event" };
  }
  try {
    const { data, error } = await supabase.rpc("os_integration_event_publish", {
      p_workspace_id: String(workspaceId),
      p_source_system: String(sourceSystem),
      p_event_type: String(event.type),
      p_entity_type: String(event.entityType || "record"),
      p_entity_id: String(event.entityId || ""),
      p_idempotency_key: String(idempotencyKey),
      p_occurred_at: event.occurredAt || new Date().toISOString(),
      p_payload: event.payload && typeof event.payload === "object" ? event.payload : {},
    });
    if (error) throw error;
    const durable = data && typeof data === "object" ? data : null;
    if (!durable?.id) return { ok: false, reason: "invalid-server-response" };
    const local = publishOSEvent({ ...event, idempotencyKey: durable.idempotencyKey }, workspaceId, sourceSystem);
    return { ok: true, event: { ...durable, ...local, id: durable.id, idempotencyKey: durable.idempotencyKey }, source: "server" };
  } catch (error) {
    return { ok: false, reason: "server-write-failed", error };
  }
}

/** Load durable integration events; the RPC checks both Projects and source-system read access. */
export async function loadDurableOSEvents(workspaceId, sourceSystem = "hobbies", limit = 20) {
  if (!workspaceId) return { ok: false, events: [], reason: "workspace-required" };
  try {
    const { data, error } = await supabase.rpc("os_integration_events_load", {
      p_workspace_id: String(workspaceId),
      p_source_system: String(sourceSystem),
      p_limit: Math.max(1, Math.min(100, Number(limit) || 20)),
    });
    if (error) throw error;
    return { ok: true, events: Array.isArray(data) ? data : [] };
  } catch (error) {
    return { ok: false, events: [], reason: "server-read-failed", error };
  }
}
