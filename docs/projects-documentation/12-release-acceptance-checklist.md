# 12 — Release Acceptance Checklist

هذا الملف يحول التوثيق من شرح نظري إلى قائمة قبول قابلة للتنفيذ.

## A. Documentation

- [x] Navigation documented
- [x] Project Workspace documented
- [x] Core forms documented
- [x] Relationships documented
- [x] Governance documented
- [x] Integrations documented
- [x] Field/form dictionary added
- [x] Complete operating manual added
- [x] Documentation center indexes the new guides
- [x] Documentation test covers the new guides

## B. Database / relationship gates

آخر GitHub smoke run 840 نجح في:

- [x] Projects schema bootstrap
- [x] Record-level visibility policies
- [x] Atomic Discovery writes
- [x] Discovery permissions and rollback
- [x] PRD/Requirement/Task/Output lifecycle guards
- [x] Task issue traceability
- [x] Entity relationship integrity
- [x] Objective/KR reconciliation
- [x] PRD verified evidence guard
- [x] Forward-only live guard reconciliation
- [x] Project/Task/PRD/Output boundaries
- [x] Private Outputs Storage bucket/RLS contract
- [x] Storage path parser SECURITY INVOKER
- [x] Two-account privacy
- [x] Create → Reload → Edit → Archive/Restore

## C. What this proves

هذا يثبت نجاح الاختبارات الآلية المعزولة التي نفذها workflow. لا يثبت وحده:

- production deployment
- browser acceptance على Preview حي
- mobile/tablet acceptance
- RTL/accessibility acceptance
- performance acceptance
- real user acceptance
- Vercel deployment acceptance

## D. Remaining release gates

1. Run documentation/unit contract test after the latest documentation commit.
2. Run the broader Projects test suite where CI exposes it.
3. Re-run browser acceptance على Preview الصحيح بعد عودة Vercel quota.
4. Execute real two-account browser acceptance.
5. Execute real Create → Reload → Edit → Reload → Archive → Restore → Reload.
6. Execute the six core relationship cycles end-to-end.
7. Validate mobile/tablet/RTL/accessibility.
8. Reconcile migration inventory and record backup/rollback evidence.
9. Only then mark Projects v5 Release Accepted.

## E. Six required relationship cycles

### 1. Objective → KR → Project → Task

Create each record, reload, verify IDs and navigation.

### 2. PRD → Requirement → Task → Output

Verify same-project and same-PRD boundaries and final evidence.

### 3. Risk → Mitigation → Task → Output

Verify risk score, mitigation task and completion evidence.

### 4. Discovery → Decision → Task

Verify source traceability and no duplicate conversion.

### 5. Issue → Repair Task → Output

Verify repair relation and resolution evidence.

### 6. Meeting → Follow-up → Task

Verify Knowledge source identity and idempotent project task creation.

## F. Final rule

لا نستخدم كلمة "مكتمل" لمجرد نجاح build أو ظهور الشاشة.

Release Accepted =

~~~
Code
+
Contract Tests
+
Database Gates
+
Live Data Cycle
+
Relationship Acceptance
+
Permissions Acceptance
+
Responsive/Accessibility
+
Production Verification
~~~
