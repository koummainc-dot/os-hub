# 06 — التكاملات

## Knowledge
Projects يستقبل أحداث Knowledge لإنشاء مهام من متابعات الاجتماعات. يتم تفضيل Knowledge IDs الصريحة، مع توافق مع الهوية legacy عند الحاجة. Knowledge يظل مالك الاجتماعات.

## Finance
Project Finance tab يفتح المسار الفعلي في Finance. Projects لا ينشئ Finance profile أو transaction نيابة عن Finance.

## OS integration events
Projects يستخدم durable OS events وsource-write result handling للتكاملات. فشل التكامل يجب أن يبقى قابلًا للرصد بدل تحويله إلى نجاح صامت.

## Storage
Outputs وTask Sheet attachments يستخدمان boundary `projects-outputs` ومساعد recovery مشترك. real Storage/RLS acceptance غير مثبت هنا.

## Automations
عقود الاختبار تغطي notifications/automations الخاصة باستحقاقات المهام والمشاريع، PRD/Output review، weekly review، contacts، health/risk/integration failures وغيرها. حالة العقد لا تعني قبول الإنتاج الحي.

## خارج النطاق
لا يضيف مركز التوثيق أي migration أو table أو dependency جديدة.
