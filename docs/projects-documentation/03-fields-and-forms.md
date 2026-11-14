# 03 — الحقول والنماذج

## قاعدة
هذا الإصدار يوثق فقط الحقول التي أمكن تتبعها في Form/Editor أو domain/store. عندما لا يمكن إثبات قاعدة validation أو DB mapping من المصدر، تكون الحالة Needs verification.

## ProjectForm
المصدر: `src/systems/projects/parts.jsx`. نموذج المشروع هو المصدر الحالي لحقول المشروع، وتتم قراءة خياراته من store/domain. لا تُستنتج قواعد إضافية من تسمية الحقل.

## TaskForm
المصدر: `src/systems/projects/parts.jsx`. يدعم parentId، title/description، priority، due_date، assignee_id، planning_bucket وغيرها بحسب form implementation. Offline queue توثق فقط الحقول الأساسية التي يسمح بها الكود.

## PRD / Requirement
المصدر: `src/systems/projects/entities.jsx`. توجد متطلبات، إصدارات ومراجعات وربط Tasks/Outputs/Risks.

## Output
المصدر: `entities.jsx` و`parts.jsx`. حفظ metadata للملف يشمل file_id/object_path/name/type/size/last-modified/timestamp ضمن upload intent عند الحاجة.

## الحقول المحسوبة
مؤشرات progress، days remaining، overdue، risk/issue counts وtime ratio مشتقة من records ولا تُعامل كحقول إدخال.

## Needs verification
لا يوجد في هذا الملف ادعاء بقيم min/max أو رسائل خطأ لم يمكن إثباتها من المصدر الحالي.
