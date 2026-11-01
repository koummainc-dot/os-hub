// Travel-owned compatibility adapters. These describe optional contracts only;
// they never access another OS's storage or create duplicate calendar/reminder records.
export const TRAVEL_INTEGRATION_CONTRACT_VERSION = 1;

const idPart = value => encodeURIComponent(String(value ?? "").trim());

export function travelSourceKey(workspaceId, kind, recordId, dueAt = "") {
  if (!workspaceId || !kind || !recordId) return null;
  return ["travel", workspaceId, kind, recordId, dueAt].map(idPart).join(":");
}

export function buildTravelReminderReference(workspaceId, alert) {
  if (!alert?.id || !alert?.date || !alert?.type) return null;
  const kind = alert.type === "cancellation" ? "booking-cancellation" : "document-expiry";
  const recordId = String(alert.id).replace(/^(booking|document):/, "");
  return {
    sourceKey: travelSourceKey(workspaceId, kind, recordId, alert.date),
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
