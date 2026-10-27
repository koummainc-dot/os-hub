CREATE OR REPLACE FUNCTION public.fin_post_transaction_with_splits(p jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
 ws uuid := nullif(p->>'workspace_id','')::uuid;
 tx public.finance_transactions;
 s jsonb;
 total numeric := 0;
 split_count integer := 0;
 cat_kind text;
 res jsonb;
BEGIN
 PERFORM public.fin__need(ws, 'ledger', 'edit');
 IF jsonb_typeof(p->'splits') IS DISTINCT FROM 'array' OR jsonb_array_length(p->'splits') = 0 THEN
   RETURN public.fin_post_transaction(p - 'splits');
 END IF;
 IF nullif(p->>'client_generated_id','') IS NULL THEN
   PERFORM public.fin__err('IDEMPOTENCY_KEY_REQUIRED','client_generated_id is required for split transactions');
 END IF;
 IF coalesce(p->>'type','') NOT IN ('Expense','Income') THEN
   PERFORM public.fin__err('SPLITS_TYPE_INVALID','Splits are supported for income and expense transactions only');
 END IF;
 FOR s IN SELECT value FROM jsonb_array_elements(p->'splits') LOOP
   IF nullif(s->>'category_id','') IS NULL OR public.fin__num(s,'amount') IS NULL OR public.fin__num(s,'amount') <= 0 THEN
     PERFORM public.fin__err('SPLIT_INVALID','Each split requires a category and positive amount');
   END IF;
   SELECT kind INTO cat_kind FROM public.finance_categories
    WHERE id=(s->>'category_id')::uuid AND workspace_id=ws AND archived=false;
   IF cat_kind IS NULL THEN PERFORM public.fin__err('CATEGORY_NOT_FOUND','Split category is not available in this workspace'); END IF;
   IF p->>'type'='Expense' AND cat_kind NOT IN ('Expense','Both') THEN
     PERFORM public.fin__err('CATEGORY_KIND_INVALID','Expense splits require expense categories');
   END IF;
   IF p->>'type'='Income' AND cat_kind NOT IN ('Income','Both') THEN
     PERFORM public.fin__err('CATEGORY_KIND_INVALID','Income splits require income categories');
   END IF;
   total := total + public.fin__num(s,'amount');
   split_count := split_count + 1;
 END LOOP;
 IF abs(total - public.fin__num(p,'amount')) > 0.0001 THEN
   PERFORM public.fin__err('SPLIT_TOTAL_MISMATCH','Split amounts must equal the transaction amount');
 END IF;
 res := public.fin_post_transaction((p - 'category_id') || jsonb_build_object('category_id',null));
 SELECT * INTO tx FROM public.finance_transactions
  WHERE workspace_id=ws AND client_generated_id=p->>'client_generated_id'
  ORDER BY created_at DESC LIMIT 1;
 IF tx.id IS NULL THEN
   PERFORM public.fin__err('TRANSACTION_NOT_FOUND','Could not resolve the posted transaction for its splits');
 END IF;
 IF EXISTS (SELECT 1 FROM public.finance_transaction_splits WHERE transaction_id=tx.id) THEN
   RETURN res || jsonb_build_object('splits_saved',true,'split_count',split_count,'replayed',true);
 END IF;
 FOR s IN SELECT value FROM jsonb_array_elements(p->'splits') LOOP
   INSERT INTO public.finance_transaction_splits(workspace_id,transaction_id,category_id,amount,currency,base_amount)
   VALUES (ws, tx.id, (s->>'category_id')::uuid, public.fin__num(s,'amount'),
     coalesce(nullif(p->>'currency',''),tx.currency),
     CASE WHEN tx.base_amount IS NULL OR tx.amount IS NULL THEN NULL
       ELSE round(tx.base_amount * public.fin__num(s,'amount') / tx.amount, 4) END);
 END LOOP;
 RETURN res || jsonb_build_object('splits_saved',true,'split_count',split_count);
END $function$;
REVOKE ALL ON FUNCTION public.fin_post_transaction_with_splits(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fin_post_transaction_with_splits(jsonb) TO authenticated;