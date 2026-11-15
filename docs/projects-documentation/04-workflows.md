# 04 — الفلوهات

## 1. إنشاء سجل من Project Header
Project → action → openQuickCreate → canonical page/form → project prefill → existing save path. لا توجد نسخة تخزين ثانية.

## 2. Project Overview drill-down
Metric → setView/openProject → tab + filter → exact project-scoped records.

## 3. Task hierarchy
Task parent → child creation → parent_task_id → tree render → Task Sheet.

## 4. PRD traceability
PRD → Requirement → Task/Output/Risk → فتح السجل المرتبط من Project/PRD/Output.

## 5. Knowledge follow-up → Task
Knowledge يرسل create_meeting_tasks → Projects يتحقق من project visibility/write permission → يقرأ source_followup_id → يمنع duplicate request → ينشئ Task → يعيد result event.

## 6. Output upload recovery
Canonical Output record يحفظ upload intent قبل/حول Storage. إذا نجح Storage وفشل metadata write، يبقى intent بعد reload. إعادة اختيار نفس الملف تستخدم ID/path السابق؛ retry يستعيد metadata ويمسح intent.

## 7. Offline conflict
تعديل مهمة موجودة فقط يمكن أن يبقى في queue. عند التعارض لا يتم overwrite تلقائيًا؛ يمكن دمج الحقول غير المتعارضة أو تجاهل المحلي.

## 8. Governance
Risk/Issue/Decision مرتبطة بالمشروع، ويمكن إنشاء mitigation/repair task من السجل عند توفر الصلاحية.

## 9. Failure semantics
الأخطاء التي تمنع الحفظ يجب أن تبقى ظاهرة؛ عناصر pending لا تُعتبر مكتملة. أي فلو لا يملك دليلًا من الكود/اختبار يُصنف needs-verification.
