# 02 — الأزرار والإجراءات

## منهج التوثيق
النص الظاهر على الزر ليس دليلًا كافيًا. السجل يجب أن يرتبط بالـhandler أو navigation call أو store/domain effect.

## Project Header
الإجراءات السبعة المثبتة: Task، Output، PRD، Risk، Issue، Decision، Resource. كلها تستخدم `openQuickCreate` وتوجه إلى الشاشة canonical مع المشروع الحالي.

## Project Overview
المؤشرات تفتح Tasks أو Timeline أو Work أو Risks أو Issues أو قائمة المهام غير المرتبطة، مع filters محددة.

## Portfolio
أسماء المشاريع، أعداد Tasks/Issues/Risks والأحداث في Timeline/Calendar تعمل كنقاط drill-down.

## Task
الشجرة تدعم فتح المهمة، إضافة مهمة فرعية، قائمة سياقية، تحميل المزيد، وتوسيع/طي الأبناء. Task Sheet يحتوي روابط للسجلات المرتبطة.

## Outputs
فتح/تنزيل الملفات، حفظ Output، وإدارة pending upload intents موجودة في التنفيذ.

## Governance
المخاطر تدعم تغيير الحالة وإنشاء mitigation task؛ المشاكل تدعم repair task؛ القرارات تُعرض مع روابطها.

## ملاحظة
لا تُوثق إجراءات غير موجودة في handler أو الاختبار على أنها مكتملة.
