-- Finance OS: repair month validation, introduce two-level category seeds,
-- and add structured debt dates/interest/repayment fields.
ALTER TABLE public.finance_budgets DROP CONSTRAINT IF EXISTS finance_budgets_period_check;
ALTER TABLE public.finance_budgets ADD CONSTRAINT finance_budgets_period_check CHECK (period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');

ALTER TABLE public.finance_debts
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS due_day smallint,
  ADD COLUMN IF NOT EXISTS repayment_type text NOT NULL DEFAULT 'Installments',
  ADD COLUMN IF NOT EXISTS interest_rate numeric(9,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS interest_calculation text NOT NULL DEFAULT 'Simple',
  ADD COLUMN IF NOT EXISTS interest_period text NOT NULL DEFAULT 'Annual',
  ADD COLUMN IF NOT EXISTS lender_name text,
  ADD COLUMN IF NOT EXISTS borrower_name text;
ALTER TABLE public.finance_debts DROP CONSTRAINT IF EXISTS finance_debts_interest_method_check;
ALTER TABLE public.finance_debts ADD CONSTRAINT finance_debts_interest_method_check CHECK (interest_method IN ('None','Fixed','Declining'));
ALTER TABLE public.finance_debts ADD CONSTRAINT finance_debts_repayment_type_check CHECK (repayment_type IN ('OneTime','Installments','MonthlyDay'));
ALTER TABLE public.finance_debts ADD CONSTRAINT finance_debts_interest_calculation_check CHECK (interest_calculation IN ('Simple','Compound'));
ALTER TABLE public.finance_debts ADD CONSTRAINT finance_debts_interest_period_check CHECK (interest_period IN ('Monthly','Annual'));
ALTER TABLE public.finance_debts ADD CONSTRAINT finance_debts_interest_rate_check CHECK (interest_rate >= 0);
ALTER TABLE public.finance_debts ADD CONSTRAINT finance_debts_due_day_check CHECK (due_day IS NULL OR due_day BETWEEN 1 AND 31);
ALTER TABLE public.finance_debts ADD CONSTRAINT finance_debts_dates_check CHECK (end_date IS NULL OR end_date >= start_date);

CREATE OR REPLACE FUNCTION public.fin_debt_create(p jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
  ws uuid := nullif(p->>'workspace_id','')::uuid;
  r jsonb; did uuid := gen_random_uuid();
  amt numeric := public.fin__num(p, 'principal');
  dir text := p->>'direction'; ccy text := upper(p->>'currency');
  la uuid := nullif(p->>'liability_account_id', '')::uuid;
  acc public.finance_accounts; it jsonb; n int := 0; prev date; sum_p numeric := 0;
  sd date := nullif(p->>'start_date','')::date; ed date := nullif(p->>'end_date','')::date;
  dd date := nullif(p->>'due_date','')::date; dday smallint := nullif(p->>'due_day','')::smallint;
  im text := coalesce(nullif(p->>'interest_method',''),'None');
  ir numeric := coalesce(public.fin__num(p,'interest_rate'),0);
  ic text := coalesce(nullif(p->>'interest_calculation',''),'Simple');
  ip text := coalesce(nullif(p->>'interest_period',''),'Annual');
  rt text := coalesce(nullif(p->>'repayment_type',''),'Installments');
  da uuid := nullif(p->>'disbursement_account_id', '')::uuid; dis jsonb;
BEGIN
  PERFORM public.fin__need(ws, 'debts', 'edit');
  r := public.fin__idem_begin(ws, p->>'idempotency_key', p);
  IF r IS NOT NULL THEN RETURN r; END IF;
  IF amt IS NULL OR amt <= 0 OR dir NOT IN ('IOwe','OwedToMe') OR ccy !~ '^[A-Z]{3}$' OR sd IS NULL
     OR im NOT IN ('None','Fixed','Declining') OR ir < 0 OR ic NOT IN ('Simple','Compound')
     OR ip NOT IN ('Monthly','Annual') OR rt NOT IN ('OneTime','Installments','MonthlyDay')
     OR (ed IS NOT NULL AND ed < sd) OR (dday IS NOT NULL AND dday NOT BETWEEN 1 AND 31)
     OR (im = 'None' AND ir <> 0) OR (rt = 'OneTime' AND (dd IS NULL OR dd < sd)) THEN
    PERFORM public.fin__err('VALIDATION_FAILED', 'check debt dates, repayment type and interest settings');
  END IF;
  IF la IS NOT NULL THEN
    SELECT * INTO acc FROM public.finance_accounts x WHERE x.workspace_id = ws AND x.id = la;
    IF acc.id IS NULL THEN PERFORM public.fin__err('OWNERSHIP_MISMATCH', 'liability account'); END IF;
    IF acc.nature <> 'LIABILITY' OR acc.currency <> ccy OR dir <> 'IOwe' THEN PERFORM public.fin__err('LIABILITY_ACCOUNT_INVALID'); END IF;
  END IF;
  BEGIN
    INSERT INTO public.finance_debts(id,workspace_id,name,direction,counterparty,currency,principal_amount,start_date,interest_method,liability_account_id,end_date,due_date,due_day,repayment_type,interest_rate,interest_calculation,interest_period,lender_name,borrower_name)
    VALUES (did,ws,coalesce(nullif(btrim(p->>'name'), ''),'دين'),dir,nullif(p->>'counterparty',''),ccy,amt,sd,im,la,ed,dd,dday,rt,ir,ic,ip,nullif(btrim(p->>'lender_name'),''),nullif(btrim(p->>'borrower_name'),''));
  EXCEPTION WHEN unique_violation THEN
    PERFORM public.fin__err('LIABILITY_DOUBLE_COUNT', 'this liability account already backs another active debt');
  END;
  FOR it IN SELECT * FROM jsonb_array_elements(coalesce(p->'installments','[]'::jsonb)) LOOP
    n := n + 1;
    IF prev IS NOT NULL AND (it->>'due_date')::date < prev THEN PERFORM public.fin__err('VALIDATION_FAILED','installment dates must ascend'); END IF;
    prev := (it->>'due_date')::date;
    sum_p := sum_p + coalesce(public.fin__num(it,'principal'),0);
    INSERT INTO public.finance_debt_installments(workspace_id,debt_id,seq,due_date,principal_due,interest_due,fees_due)
    VALUES(ws,did,n,prev,coalesce(public.fin__num(it,'principal'),0),coalesce(public.fin__num(it,'interest'),0),coalesce(public.fin__num(it,'fees'),0));
  END LOOP;
  IF sum_p > amt THEN PERFORM public.fin__err('VALIDATION_FAILED','installment principal exceeds debt principal'); END IF;
  IF rt = 'OneTime' AND n <> 1 THEN PERFORM public.fin__err('VALIDATION_FAILED','one-time debt requires exactly one due installment'); END IF;
  IF da IS NOT NULL THEN
    dis := public.fin__core_post(ws,jsonb_build_object('purpose','DebtDisbursement','debt_id',did::text,'amount',amt::text,'currency',ccy,'local_date',sd::text,'name','صرف دين: '||coalesce(p->>'name',''),'type',CASE WHEN la IS NOT NULL THEN 'Transfer' WHEN dir='IOwe' THEN 'Income' ELSE 'Expense' END,'from_account_id',CASE WHEN la IS NOT NULL THEN la::text WHEN dir='OwedToMe' THEN da::text END,'to_account_id',CASE WHEN la IS NOT NULL OR dir='IOwe' THEN da::text END,'source_system','finance','source_type','debt_disbursement','source_id',did::text),auth.uid());
  END IF;
  PERFORM public.fin__audit(ws,auth.uid(),'debt',did::text,'create',NULL,NULL,jsonb_build_object('principal',amt::text,'direction',dir,'repayment_type',rt,'interest_method',im));
  RETURN public.fin__idem_end(ws,p->>'idempotency_key',jsonb_build_object('debt_id',did,'disbursement',dis));
END $function$;

INSERT INTO public.finance_categories(workspace_id,name,kind,parent_id)
SELECT w.id,x.name,x.kind,NULL FROM public.workspaces w CROSS JOIN (VALUES
('راتب','Income'),('عمل حر','Income'),('مكافآت','Income'),('تجارة/مشروع','Income'),('استثمار','Income'),('إيجار','Income'),('معاش/تأمين','Income'),('إعانات','Income'),('هدايا/دعم أسري','Income'),('استرداد/كاش باك','Income'),
('سكن','Expense'),('مرافق','Expense'),('طعام','Expense'),('مواصلات','Expense'),('صحة','Expense'),('تعليم','Expense'),('عناية شخصية','Expense'),('ملابس','Expense'),('ترفيه','Expense'),('اشتراكات','Expense'),('سفر','Expense'),('أسرة وأطفال','Expense'),('حيوانات أليفة','Expense'),('تأمينات','Expense'),('فوائد ورسوم مالية','Expense'),('ضرائب ورسوم','Expense'),('صدقات وهدايا','Expense'),('طوارئ','Expense'),('متنوع','Expense')
) x(name,kind)
WHERE NOT EXISTS(SELECT 1 FROM public.finance_categories c WHERE c.workspace_id=w.id AND c.name=x.name AND c.kind=x.kind AND c.parent_id IS NULL);

INSERT INTO public.finance_categories(workspace_id,name,kind,parent_id)
SELECT w.id,x.child_name,x.kind,p.id FROM public.workspaces w CROSS JOIN (VALUES
('Income','راتب','الراتب الشهري'),('Income','عمل حر','Freelance'),('Income','عمل حر','مشاريع مؤقتة'),('Income','مكافآت','بونص'),('Income','مكافآت','عمولات'),('Income','مكافآت','حوافز'),('Income','تجارة/مشروع','أرباح مشروع صغير'),('Income','استثمار','توزيعات أرباح'),('Income','استثمار','عوائد استثمار'),('Income','إيجار','إيجار عقار'),('Income','إيجار','إيجار سيارة/أصل'),('Income','معاش/تأمين','معاش تقاعدي'),('Income','معاش/تأمين','تعويضات'),('Income','إعانات','دعم حكومي'),('Income','إعانات','مساعدات'),('Income','هدايا/دعم أسري','هدايا نقدية'),('Income','هدايا/دعم أسري','مساعدة من الأهل'),('Income','استرداد/كاش باك','استرداد مبلغ'),('Income','استرداد/كاش باك','Cashback'),
('Expense','سكن','إيجار'),('Expense','سكن','قسط سكن'),('Expense','سكن','صيانة سكن'),('Expense','سكن','تأمين سكن'),('Expense','مرافق','كهرباء'),('Expense','مرافق','ماء'),('Expense','مرافق','غاز'),('Expense','مرافق','إنترنت'),('Expense','مرافق','موبايل'),
('Expense','طعام','بقالة'),('Expense','طعام','سوبرماركت'),('Expense','طعام','خضار'),('Expense','طعام','مطاعم'),('Expense','طعام','كافيهات'),('Expense','طعام','توصيل'),('Expense','مواصلات','بنزين'),('Expense','مواصلات','مواصلات عامة'),('Expense','مواصلات','أوبر/تاكسي'),('Expense','مواصلات','صيانة سيارة'),('Expense','مواصلات','تأمين سيارة'),('Expense','مواصلات','مخالفات'),
('Expense','صحة','علاج'),('Expense','صحة','أدوية'),('Expense','صحة','تحاليل'),('Expense','صحة','أسنان'),('Expense','صحة','تأمين صحي'),('Expense','تعليم','مصاريف دراسية'),('Expense','تعليم','كتب'),('Expense','تعليم','كورسات'),('Expense','تعليم','تدريب'),('Expense','عناية شخصية','حلاقة'),('Expense','عناية شخصية','منتجات عناية'),('Expense','عناية شخصية','صالة رياضية'),
('Expense','ملابس','ملابس'),('Expense','ملابس','أحذية'),('Expense','ملابس','إكسسوارات'),('Expense','ترفيه','سينما'),('Expense','ترفيه','خروجات'),('Expense','ترفيه','ألعاب'),('Expense','ترفيه','هوايات'),('Expense','اشتراكات','Netflix'),('Expense','اشتراكات','Spotify'),('Expense','اشتراكات','تطبيقات'),('Expense','اشتراكات','Cloud'),('Expense','اشتراكات','عضويات'),('Expense','سفر','تذاكر'),('Expense','سفر','إقامة'),('Expense','سفر','مصاريف سفر'),('Expense','أسرة وأطفال','مصروف أطفال'),('Expense','أسرة وأطفال','مدارس'),('Expense','أسرة وأطفال','رعاية'),('Expense','أسرة وأطفال','دعم عائلة'),('Expense','حيوانات أليفة','طعام حيوانات'),('Expense','حيوانات أليفة','رعاية بيطرية'),('Expense','تأمينات','تأمين حياة'),('Expense','تأمينات','تأمين سيارة'),('Expense','تأمينات','تأمين سكن'),('Expense','فوائد ورسوم مالية','فوائد قروض'),('Expense','فوائد ورسوم مالية','رسوم بطاقات'),('Expense','فوائد ورسوم مالية','غرامات تأخير'),('Expense','ضرائب ورسوم','ضرائب'),('Expense','ضرائب ورسوم','رسوم حكومية'),('Expense','ضرائب ورسوم','رسوم بنكية'),('Expense','صدقات وهدايا','صدقة'),('Expense','صدقات وهدايا','هدايا'),('Expense','صدقات وهدايا','مناسبات'),('Expense','طوارئ','مصاريف غير متوقعة'),('Expense','متنوع','غير مصنف')
) x(kind,parent_name,child_name)
JOIN public.finance_categories p ON p.workspace_id=w.id AND p.name=x.parent_name AND p.kind=x.kind AND p.parent_id IS NULL
WHERE NOT EXISTS(SELECT 1 FROM public.finance_categories c WHERE c.workspace_id=w.id AND c.name=x.child_name AND c.kind=x.kind AND c.parent_id=p.id);
