# 01 — التنقل والشاشات

## نقطة الدخول
Projects OS يسجل شاشاته في `SCREENS` ويستخدم `useP().setPage` داخل Router. تم الحفاظ على آلية section/page state بدل إضافة React Router.

## الشاشات المثبتة
dashboard، today، week، myWork، portfolio، projects، tasks، issues، discovery، prds، okrs، outputs، risks، decisions، meetings، updates، wins، reviews، contacts، team، templates، settings، مع GovernancePage كوجهة موحدة للمخاطر/المشاكل/القرارات.

## Project Workspace
تبويبات المشروع المثبتة في routeContext هي: overview، tasks، milestones، prds، outputs، risks، issues، decisions، discovery، meetings، finance، timeline. توجد داخل التفاصيل أيضًا Work وPeople وOKR وActivity حسب محتوى ProjectDetail.

## Task Sheet
Task Sheet هو side sheet وليس route مستقلًا؛ يفتح من المهمة ويعرض Details/Time/Outputs/Links/Activity.

## Deep Links
Router يقرأ projectId/taskId/recordId/tab/recordKind من routeContext. IDs التاريخية وrelated deep link يجب ألا تُعاد تسميتها.

## حالات غير مثبتة
أي view مذكورة في مواصفة v5 ولا تظهر في `SCREENS` أو ProjectDetail لا تُعتبر شاشة منفذة.
