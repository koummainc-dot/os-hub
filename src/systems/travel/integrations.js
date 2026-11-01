// Travel-owned compatibility adapters. These describe optional contracts only;
// they never access another OS's storage or create duplicate calendar/reminder records.
export const TRAVEL_INTEGRATION_CONTRACT_VERSION = 1;

const idPart = value => encodeURIComponent(String(value ?? "").trim());

export function travelSourceKey(workspaceId, kind, recordId, dueAt = "") {
  if (!workspaceId || !kind || !recordId) return null;
  return ["travel", workspaceId, kind, recordId, dueAt].map(idPart).join(":");
}

export function buildTravelReminderReference(workspaceId, alert) {
  if (!workspaceId || !alert?.id || !alert?.date || !["cancellation", "document"].includes(alert?.type)) return null;
  const kind = alert.type === "cancellation" ? "booking-cancellation" : "document-expiry";
  const recordId = String(alert.id).replace(/^(booking|document):/, "");
  return {
    sourceKey: travelSourceKey(workspaceId, kind, recordId, alert.date),
    workspaceId: String(workspaceId),
    sourceSystem: "travel",
    sourceRecordId: recordId,
    kind,
    dueAt: alert.date,
    title: String(alert.title || (kind === "booking-cancellation" ? "موعد إلغاء حجز" : "انتهاء مستند سفر")),
    // The reminder service must enforce workspace membership and idempotent upsert.
    deliveryOwner: "notifications",
  };
}

export function buildTravelCalendarReference(workspaceId, itineraryItem, stop = null) {
  if (!workspaceId || !itineraryItem?.id || !itineraryItem?.date) return null;
  return {
    sourceKey: travelSourceKey(workspaceId, "itinerary", itineraryItem.id),
    sourceSystem: "travel",
    sourceRecordId: String(itineraryItem.id),
    workspaceId: String(workspaceId),
    title: String(itineraryItem.title || "نشاط في برنامج الرحلة"),
    date: itineraryItem.date,
    startTime: itineraryItem.startTime || null,
    endTime: itineraryItem.endTime || null,
    location: itineraryItem.location || null,
    timeZone: stop?.timeZone || null,
    // Calendar owns the event; this object is a source reference, not an event write.
    writeMode: "reference-only",
  };
}

export function getTravelIntegrationStatus(api) {
  const integrations = api?.integrations || {};
  const has = (name, methods) => !!integrations[name] && methods.every(method => typeof integrations[name][method] === "function");
  return [
    { id: "files", label: "الملفات (Core Files)", available: has("files", ["upload", "getUrl", "remove"]), mode: "secure-file-service" },
    { id: "notifications", label: "التذكيرات المشتركة", available: has("notifications", ["upsert", "cancel"]), mode: "idempotent-reminders" },
    { id: "calendar", label: "التقويم وToday", available: has("calendar", ["upsert", "remove"]), mode: "idempotent-calendar-events" },
  ];
}

const unavailable = integration => ({ ok: false, reason: "integration-unavailable", integration });
const invalid = reason => ({ ok: false, reason: "invalid-reference", detail: reason });

/**
 * Build a narrow Travel-side bridge around explicitly injected shared services.
 * Missing or partial services fail closed. The bridge never writes directly to
 * another OS's tables/storage, and all writes carry a stable source key.
 */
export function createTravelIntegrationBridge(api, workspaceId) {
  const integrations = api?.integrations || {};
  const status = Object.fromEntries(getTravelIntegrationStatus(api).map(item => [item.id, item.available]));
  const invoke = async (integration, method, payload) => {
    try {
      const result = await integrations[integration][method](payload);
      return result && typeof result === "object" ? result : { ok: true, data: result ?? null };
    } catch (error) {
      return { ok: false, reason: "integration-error", integration, error };
    }
  };
  return Object.freeze({
    status: Object.freeze(status),
    async uploadFile({ recordType, recordId, file, metadata = {} } = {}) {
      if (!status.files) return unavailable("files");
      if (!workspaceId || !recordType || !recordId || !file) return invalid("workspace, recordType, recordId and file are required");
      return invoke("files", "upload", { workspaceId: String(workspaceId), sourceSystem: "travel", sourceRecordId: String(recordId), recordType: String(recordType), file, metadata });
    },
    async getFileUrl(fileRef) {
      if (!status.files) return unavailable("files");
      if (!workspaceId || !fileRef || typeof fileRef !== "object" || !fileRef.id) return invalid("workspace and a file reference with id are required");
      return invoke("files", "getUrl", { workspaceId: String(workspaceId), sourceSystem: "travel", fileRef });
    },
    async removeFile(fileRef) {
      if (!status.files) return unavailable("files");
      if (!workspaceId || !fileRef || typeof fileRef !== "object" || !fileRef.id) return invalid("workspace and a file reference with id are required");
      return invoke("files", "remove", { workspaceId: String(workspaceId), sourceSystem: "travel", fileRef });
    },
    async upsertReminder(reminder) {
      if (!status.notifications) return unavailable("notifications");
      if (!workspaceId || !reminder?.sourceKey || reminder.sourceSystem !== "travel" || String(reminder.workspaceId) !== String(workspaceId) || !reminder.sourceRecordId || !reminder.dueAt) return invalid("a workspace-matched Travel reminder reference is required");
      return invoke("notifications", "upsert", { ...reminder, workspaceId: String(workspaceId), sourceSystem: "travel" });
    },
    async cancelReminder(reminderRef) {
      if (!status.notifications) return unavailable("notifications");
      if (!workspaceId || !reminderRef?.sourceKey || reminderRef.sourceSystem !== "travel" || String(reminderRef.workspaceId) !== String(workspaceId)) return invalid("a workspace-matched Travel reminder reference is required");
      return invoke("notifications", "cancel", { sourceKey: reminderRef.sourceKey, workspaceId: String(workspaceId), sourceSystem: "travel" });
    },
    async upsertCalendarEvent(eventRef) {
      if (!status.calendar) return unavailable("calendar");
      if (!workspaceId || !eventRef?.sourceKey || eventRef.sourceSystem !== "travel" || String(eventRef.workspaceId) !== String(workspaceId) || !eventRef.sourceRecordId || !eventRef.date) return invalid("a workspace-matched Travel calendar reference is required");
      return invoke("calendar", "upsert", { ...eventRef, workspaceId: String(workspaceId), sourceSystem: "travel" });
    },
    async removeCalendarEvent(eventRef) {
      if (!status.calendar) return unavailable("calendar");
      if (!workspaceId || !eventRef?.sourceKey || eventRef.sourceSystem !== "travel" || String(eventRef.workspaceId) !== String(workspaceId)) return invalid("a workspace-matched Travel calendar reference is required");
      return invoke("calendar", "remove", { sourceKey: eventRef.sourceKey, workspaceId: String(workspaceId), sourceSystem: "travel" });
    },
  });
}
