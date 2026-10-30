-- Seed the Finance OS default category tree for every newly created workspace.
-- Idempotent: existing category IDs and historical references are preserved.

CREATE OR REPLACE FUNCTION public.fin_seed_default_categories(p_workspace_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF p_workspace_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.finance_categories(workspace_id, name, kind, parent_id)
  SELECT p_workspace_id, x.name, x.kind, NULL
  FROM (VALUES
    ('راتب','Income'),('عمل حر','Income'),('مكافآت','Income'),('تجارة/مشروع','Income'),('استثمار','Income'),('إيجار','Income'),('معاش/تأمين','Income'),('إعانات','Income'),('هدايا/دعم أسري','Income'),('استرداد/كاش باك','Income'),
    ('سكن','Expense'),('مرافق','Expense'),('طعام','Expense'),('مواصلات','Expense'),('صحة','Expense'),('تعليم','Expense'),('عناية شخصية','Expense'),('ملابس','Expense'),('ترفيه','Expense'),('اشتراكات','Expense'),('سفر','Expense'),('أسرة وأطفال','Expense'),('حيوانات أليفة','Expense'),('تأمينات','Expense'),('فوائد ورسوم مالية','Expense'),('ضرائب ورسوم','Expense'),('صدقات وهدايا','Expense'),('طوارئ','Expense'),('متنوع','Expense')
  ) AS x(name, kind)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.finance_categories c
    WHERE c.workspace_id = p_workspace_id
      AND c.name = x.name AND c.kind = x.kind AND c.parent_id IS NULL
  );

  INSERT INTO public.finance_categories(workspace_id, name, kind, parent_id)
  SELECT p_workspace_id, x.child_name, x.kind, parent.id
  FROM (VALUES
    ('Income','راتب','الراتب الشهري'),('Income','عمل حر','Freelance'),('Income','عمل حر','مشاريع مؤقتة'),('Income','مكافآت','بونص'),('Income','مكافآت','عمولات'),('Income','مكافآت','حوافز'),('Income','تجارة/مشروع','أرباح مشروع صغير'),('Income','استثمار','توزيعات أرباح'),('Income','استثمار','عوائد استثمار'),('Income','استثمار','فوائد بنكية'),('Income','إيجار','إيجار عقار'),('Income','إيجار','إيجار سيارة/أصل'),('Income','معاش/تأمين','معاش تقاعدي'),('Income','معاش/تأمين','تعويضات'),('Income','إعانات','دعم حكومي'),('Income','إعانات','مساعدات'),('Income','هدايا/دعم أسري','هدايا نقدية'),('Income','هدايا/دعم أسري','مساعدة من الأهل'),('Income','استرداد/كاش باك','استرداد مبلغ'),('Income','استرداد/كاش باك','Cashback'),
    ('Expense','سكن','إيجار'),('Expense','سكن','قسط سكن'),('Expense','سكن','صيانة سكن'),('Expense','سكن','تأمين سكن'),('Expense','مرافق','كهرباء'),('Expense','مرافق','ماء'),('Expense','مرافق','غاز'),('Expense','مرافق','إنترنت'),('Expense','مرافق','موبايل'),
    ('Expense','طعام','بقالة'),('Expense','طعام','سوبرماركت'),('Expense','طعام','خضار'),('Expense','طعام','مطاعم'),('Expense','طعام','كافيهات'),('Expense','طعام','توصيل'),('Expense','مواصلات','بنزين'),('Expense','مواصلات','مواصلات عامة'),('Expense','مواصلات','أوبر/تاكسي'),('Expense','مواصلات','صيانة سيارة'),('Expense','مواصلات','تأمين سيارة'),('Expense','مواصلات','مخالفات'),
    ('Expense','صحة','علاج'),('Expense','صحة','أدوية'),('Expense','صحة','تحاليل'),('Expense','صحة','أسنان'),('Expense','صحة','تأمين صحي'),('Expense','تعليم','مصاريف دراسية'),('Expense','تعليم','كتب'),('Expense','تعليم','كورسات'),('Expense','تعليم','تدريب'),('Expense','عناية شخصية','حلاقة'),('Expense','عناية شخصية','منتجات عناية'),('Expense','عناية شخصية','صالة رياضية'),
    ('Expense','ملابس','ملابس'),('Expense','ملابس','أحذية'),('Expense','ملابس','إكسسوارات'),('Expense','ترفيه','سينما'),('Expense','ترفيه','خروجات'),('Expense','ترفيه','ألعاب'),('Expense','ترفيه','هوايات'),('Expense','اشتراكات','Netflix'),('Expense','اشتراكات','Spotify'),('Expense','اشتراكات','تطبيقات'),('Expense','اشتراكات','Cloud'),('Expense','اشتراكات','عضويات'),('Expense','سفر','تذاكر'),('Expense','سفر','إقامة'),('Expense','سفر','مصاريف سفر'),('Expense','أسرة وأطفال','مصروف أطفال'),('Expense','أسرة وأطفال','مدارس'),('Expense','أسرة وأطفال','رعاية'),('Expense','أسرة وأطفال','دعم عائلة'),('Expense','حيوانات أليفة','طعام حيوانات'),('Expense','حيوانات أليفة','رعاية بيطرية'),('Expense','تأمينات','تأمين حياة'),('Expense','تأمينات','تأمين سيارة'),('Expense','تأمينات','تأمين سكن'),('Expense','فوائد ورسوم مالية','فوائد قروض'),('Expense','فوائد ورسوم مالية','رسوم بطاقات'),('Expense','فوائد ورسوم مالية','غرامات تأخير'),('Expense','ضرائب ورسوم','ضرائب'),('Expense','ضرائب ورسوم','رسوم حكومية'),('Expense','ضرائب ورسوم','رسوم بنكية'),('Expense','صدقات وهدايا','صدقة'),('Expense','صدقات وهدايا','هدايا'),('Expense','صدقات وهدايا','مناسبات'),('Expense','طوارئ','مصاريف غير متوقعة'),('Expense','متنوع','غير مصنف')
  ) AS x(kind, parent_name, child_name)
  JOIN public.finance_categories parent
    ON parent.workspace_id = p_workspace_id
   AND parent.name = x.parent_name
   AND parent.kind = x.kind
   AND parent.parent_id IS NULL
  WHERE NOT EXISTS (
    SELECT 1 FROM public.finance_categories c
    WHERE c.workspace_id = p_workspace_id
      AND c.name = x.child_name
      AND c.kind = x.kind
      AND c.parent_id = parent.id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.fin_seed_categories_after_workspace_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  PERFORM public.fin_seed_default_categories(NEW.id);
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS workspaces_seed_finance_categories ON public.workspaces;
CREATE TRIGGER workspaces_seed_finance_categories
AFTER INSERT ON public.workspaces
FOR EACH ROW
EXECUTE FUNCTION public.fin_seed_categories_after_workspace_insert();

-- Backfill idempotently so existing workspaces also receive any missing defaults.
DO $block$
DECLARE
  workspace_row record;
BEGIN
  FOR workspace_row IN SELECT id FROM public.workspaces LOOP
    PERFORM public.fin_seed_default_categories(workspace_row.id);
  END LOOP;
END;
$block$;

REVOKE ALL ON FUNCTION public.fin_seed_default_categories(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fin_seed_categories_after_workspace_insert() FROM PUBLIC, anon, authenticated;
