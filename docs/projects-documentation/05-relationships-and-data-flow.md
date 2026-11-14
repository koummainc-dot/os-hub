# 05 — العلاقات وتدفق البيانات

## Source of Truth
Projects domain/store هو المصدر التشغيلي لبيانات Projects. Knowledge يملك Meetings، وFinance يملك Finance Profiles/Transactions.

## العلاقات المثبتة
- Project ↔ Task عبر project_id.
- Task hierarchy عبر parent_task_id.
- Task ↔ Objective عبر objective_id في المسار الحالي.
- KR → tasks عبر task_ids وحساب progress الجماعي.
- PRD → Task عبر prd_id وoptional prd_requirement_id.
- Output ↔ Task/PRD/Requirement بحسب السجلات الموجودة.
- Risk/Issue/Decision ↔ Project، مع روابط إضافية حسب entity.
- Discovery ↔ Project، ويمكن أن يرتبط Issue/Task.
- Knowledge meeting → follow-up Task عبر stable source_followup_id.
- Finance Project profile lookup عبر project_ref في Finance-owned path.

## Cardinality
لا تُستنتج cardinality رقمية من UI. عندما لا يكون constraint/database evidence واضحًا، تُكتب Needs verification.

## Archive / Delete
التنفيذ الحالي يميز السجلات المؤرشفة/المحذوفة وسلة المحذوفات في store. الإجراء النهائي يجب أن يطابق domain/RPC وليس مجرد إخفاء السجل من UI.

## Unlink
الربط وفك الربط يجب أن يمر عبر المسار canonical الخاص بالسجل؛ لا تُنشئ نسخة relation محلية داخل مركز التوثيق.
