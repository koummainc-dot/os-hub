# مركز توثيق Projects OS

هذا المجلد هو المصدر الكتابي لمركز التوثيق داخل Projects OS.

## قاعدة المصدر
الحالة الحالية لأي شاشة أو زر أو حقل تُثبت من الكود والاختبارات الحالية، وليس من مواصفة v5 وحدها. العناصر غير المثبتة تُصنف `needs-verification` أو `planned`.

## بنية التوثيق
- `01-navigation-and-screens.md`: خريطة التنقل والشاشات والـWorkspace.
- `02-buttons-and-actions.md`: الإجراءات والأزرار والتنقلات.
- `03-fields-and-forms.md`: الحقول والنماذج التي أمكن إثباتها.
- `04-workflows.md`: الفلوهات من الحدث حتى الحفظ/التأثير.
- `05-relationships-and-data-flow.md`: العلاقات وSource of Truth.
- `06-integrations.md`: Knowledge/Finance/OS events/Storage.
- `07-states-permissions-and-errors.md`: الصلاحيات والحالات والأخطاء.
- `08-technical-reference.md`: الملفات والمكونات والـdomain/store والاختبارات.
- `09-coverage-report.md`: أعداد Inventory الفعلية وحالة تغطيتها.
- `traceability-index.json`: فهرس قابل للربط بين السجل والملف/المكون/الاختبار.

## حدود الإصدار
هذا المركز قراءة فقط. لا ينشئ جداول أو migrations أو API جديدًا ولا يغير business logic الخاص بـProjects.
