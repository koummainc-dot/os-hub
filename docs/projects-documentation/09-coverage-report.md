# 09 — Coverage Report

> هذه الأرقام تخص Inventory التوثيق الموجود في هذا الإصدار، وليست ادعاءً بأن كل عنصر JSX صغير صار سجلًا مستقلًا.

| الفئة | مكتشف/موثق | الحالة |
|---|---:|---|
| Screens | 20+ | موثق |
| Project Workspace / nested tabs | 12+ | موثق |
| Components | 7 core files | موثق |
| Buttons / actions | 30+ مسار رئيسي | موثق |
| Fields / forms | Project/Task/PRD/Output/Session ومسارات الحوكمة | جزئي |
| Flows | 9 | موثق |
| Relations | 10+ | موثق |
| Integrations | Knowledge/Finance/OS events/Storage/Automations | موثق مع حالات partial |
| Permissions | access/role/can | موثق |
| Events | durable OS + source-write | موثق |
| Error/Empty/Loading/Offline | أساسي | موثق |
| Tests | عقود Projects المدرجة في package.json | موثق |
| APIs/RPC | حسب ما يظهر في store/tests | جزئي |
| Database entities/columns | لا تُخمن من UI | يحتاج تحقق عند غياب دليل مباشر |

## طريقة الحساب
النسبة لا تُحسب من عدد عناصر الفهرس الأولي؛ العناصر هنا هي inventory موثق على مستوى الشاشة/المسار/العلاقة. العناصر التي لا يوجد لها دليل مباشر لا تدخل verified.

## الفجوات
Real Storage/RLS، الحسابات المتعددة، acceptance الحي، migration reconciliation/no-loss/rollback، responsive/RTL/accessibility، offline/conflict/performance، وproduction approval تبقى منفصلة عن توثيق الكود.
