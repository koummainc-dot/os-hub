# Platform Inbox — Shared Notification Contract (Architecture Decision)

**Status:** Architecture specified; implementation and migration intentionally not applied.
**Owner:** Platform (not Projects, Knowledge, or any source OS)
**Scope:** A single recipient-aware inbox that can surface cross-OS notifications and review/action signals without copying source records.
**Constraints:** Free/disposable test infrastructure only; no Production migration, no paid Supabase branch, no external push/email dependency.

## 1. Decision

Implement one Platform-owned inbox contract. Source systems publish notification intents/references; Platform owns recipient delivery, read state, retention, permission filtering, and the unified UI. Projects Inbox is a consumer/view of this contract, not a separate database or parallel copy.

Do not treat any of the following as the shared inbox:
- `Knowledge.inbox` / Knowledge notifications (source-owned records).
- Platform workspace invitations (membership workflow with its own accept/decline lifecycle).
- `createPlatformIntegrationServices().notifications` (currently a workspace-scoped reminder/calendar adapter keyed by sourceKey; not recipient-specific inbox delivery or read state).
- `integrationEvents.js` localStorage events (best-effort browser transport; not cross-device authoritative inbox storage).

## 2. Ownership boundaries

| Concern | Owner | Rule |
|---|---|---|
| Domain fact / source record | Source OS | Remains in its canonical collection; never duplicate the full record into inbox |
| Notification intent | Source OS | Supplies event type, source record identity, recipient(s), concise display metadata and deep link |
| Delivery row | Platform | One row per recipient; idempotent by source event + recipient |
| Read / dismissed state | Platform | Recipient-specific, never shared across workspace members |
| Authorization | Platform + database RLS | Recipient must be a current workspace member and allowed to view the referenced source |
| Invitation lifecycle | Platform invitations | Keep accept/decline workflow separate; optionally emit a notification reference, not a duplicate invitation |
| Retention | Platform | Expire or archive delivery rows without deleting source records |
| Navigation | Shell | Validate workspace + allowed OS route before navigating |

## 3. Proposed durable model

Preferred table: `platform_notifications` (recipient-scoped rows; no separate read-state table needed).

Required columns:
- `id uuid primary key`
- `workspace_id uuid not null`
- `recipient_user_id uuid not null`
- `source_system text not null` — allow-listed OS id
- `source_collection text null`
- `source_record_id text not null`
- `source_event_id text not null` — stable idempotency key from source
- `notification_type text not null` — namespaced, versioned event type
- `title text not null`, `body text null`
- `deep_link jsonb not null` — structured `{system, section, recordId}`; do not accept arbitrary URLs
- `payload jsonb not null default '{}'` — allow-listed display-only fields; no secrets or full source record
- `created_at timestamptz not null default now()`
- `read_at timestamptz null`
- `dismissed_at timestamptz null`
- `expires_at timestamptz null`

Constraints/indexes:
- Unique `(workspace_id, recipient_user_id, source_system, source_event_id)` for idempotent fan-out.
- Index `(workspace_id, recipient_user_id, created_at desc)` for inbox pagination.
- Partial unread index on `(workspace_id, recipient_user_id, created_at desc) where read_at is null and dismissed_at is null`.
- Check non-empty source/type/title and valid deep-link shape.
- Do not cascade-delete source records through notification rows; retain a safe tombstone/“record unavailable” behavior.

The recipient-scoped row means read/dismiss state is naturally private to each recipient. If later product needs multiple independent inbox views per recipient, move state to a separate `platform_notification_states` table keyed by notification + user; do not pre-emptively add that complexity.

## 4. API contract

Platform service exposed to shell and OS modules:
- `publishNotification(intent)` — server-authorized source publish; validates workspace, source system, event type, recipient membership and deep link; idempotent; returns accepted/duplicate.
- `listNotifications({workspaceId, cursor, limit, unreadOnly})` — current authenticated recipient only; stable cursor pagination; returns minimal DTOs.
- `markNotificationRead({id})` — only the recipient; idempotent.
- `dismissNotification({id})` — only the recipient; idempotent.
- `markAllNotificationsRead({before})` — bounded batch for current recipient.
- `getUnreadCount({workspaceId})` — server-derived count for current recipient.

All methods must derive the recipient from `auth.uid()`; never accept a caller-supplied recipient identity as authority. A source publisher must be authorized to write the relevant source record in the same workspace. The database must independently enforce membership and source permission; client-side checks are not sufficient.

## 5. Event and deep-link contract

Example intent (illustrative only):
```js
{
  workspaceId,
  sourceSystem: "projects",
  sourceCollection: "tasks",
  sourceRecordId: "task_123",
  sourceEventId: "projects:task_123:assigned:v1",
  notificationType: "projects.task.assigned.v1",
  recipientUserIds: [assigneeUserId],
  title: "تم إسناد مهمة إليك",
  body: "راجع تفاصيل المهمة وموعدها",
  deepLink: { system: "projects", section: "tasks", recordId: "task_123" },
  payload: { taskTitle: "..." },
  expiresAt: null
}
```

- Source event IDs must be deterministic for retried delivery; duplicate publish must not create duplicate inbox rows.
- Deep links are structured route descriptors, not arbitrary URLs or executable payloads.
- Shell checks that the recipient still has workspace access and source-section access before navigating.
- If the record is deleted, inaccessible, archived, or moved, show a safe unavailable state and do not leak its title/body/payload to unauthorized users.
- Keep notification payload small and display-only. Fetch authoritative source record after navigation.

## 6. RLS / security requirements before migration

The migration must not be applied until the exact workspace membership and access helper contracts are inspected and tested. Required policy behavior:
1. SELECT only when `recipient_user_id = auth.uid()` and the user remains a member of `workspace_id`.
2. UPDATE only recipient's own row, and only `read_at` / `dismissed_at` state columns; do not allow recipients to rewrite source, title, payload or deep link.
3. INSERT only through a validated RPC (or equivalent narrowly scoped security-definer function) that checks publisher permission and every recipient's membership/access.
4. No client-side direct INSERT or unrestricted UPDATE.
5. No workspace-wide read policy: another member must never see a recipient's unread/read state or notification contents unless explicitly addressed.
6. Test owner/admin/lead/contributor/viewer plus two unrelated workspace members and cross-workspace spoof attempts.

Prefer RPCs with fixed `search_path`, explicit authorization, strict input allow-lists, and minimal returned columns. Do not trust JSON payloads from source OS modules.

## 7. Source integration rollout

Initial source adapters should be added one at a time after the Platform API and tests exist:
- Projects: task assigned, due/overdue (if enabled), review requested, risk/issue assigned.
- Knowledge: meeting follow-up assigned and selected review requests; keep the meeting/follow-up canonical in Knowledge.
- Learning / Habits / Nutrition / Home: only high-value user actions with explicit recipient semantics.
- Invitations remain invitations; do not create duplicate invitation rows in inbox.

The existing `platform-integrations` workspace record adapter may continue to serve reminder/calendar scheduling during migration. It must not be silently repurposed as the authoritative inbox.

## 8. UI requirements

- One shell-level bell/inbox entry, available from Today and system navigation.
- Inbox filters: All / Unread; optional source filter only after baseline UX works.
- Each row: source icon/name, concise title/body, relative time, unread indicator, read/dismiss actions.
- Empty, loading, offline/error, expired, deleted-source, and access-revoked states.
- Keyboard and screen-reader labels; RTL; 360px, 390px and tablet layouts.
- Clicking a row navigates through validated shell routing, then loads the authoritative source record.
- Projects' “الوارد” screen should be a filtered view over the same Platform service, not a second inbox.

## 9. Free test and release plan

1. Unit/contract tests for DTO validation, idempotency key, route allow-list, expiry and pagination.
2. Disposable PostgreSQL migration smoke for RLS, two-recipient isolation, cross-workspace denial, role matrix and update-column restrictions.
3. Browser tests with seeded fixture users for unread count, read/dismiss, refresh hydration, deep-link navigation and mobile overflow.
4. No production data and no Production migration during implementation.
5. Real authenticated workspace acceptance and Production migration remain explicit release gates.

## 10. Deferred / unresolved

- Exact membership table/helper names and whether role permissions are OS-section-specific: inspect current schema before writing SQL.
- Whether a single event can target multiple recipients: initial RPC can fan out recipient rows atomically.
- Retention duration: choose a conservative default only after product agreement; never delete canonical source records.
- Push/email delivery: explicitly out of scope; in-app inbox works without paid services or background delivery.
- Knowledge inbox reconciliation: no automatic destructive migration; map existing Knowledge records only if there is a user-approved, auditable conversion plan.

**Current state:** this document defines the architecture decision only. No table, RPC, RLS policy, UI, or Production resource has been changed by this decision.
