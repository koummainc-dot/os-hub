-- Finance OS: attach one typed context tag to each transaction.
CREATE TABLE IF NOT EXISTS public.finance_transaction_context_tags (
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  transaction_id uuid NOT NULL REFERENCES public.finance_transactions(id) ON DELETE CASCADE,
  context_type text NOT NULL CHECK (context_type IN ('Personal','Project','Family')),
  finance_project_id uuid REFERENCES public.finance_projects(id) ON DELETE RESTRICT,
  family_member_id uuid REFERENCES public.finance_family_members(id) ON DELETE RESTRICT,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, transaction_id),
  CHECK (
    (context_type = 'Personal' AND finance_project_id IS NULL AND family_member_id IS NULL)
    OR (context_type = 'Project' AND finance_project_id IS NOT NULL AND family_member_id IS NULL)
    OR (context_type = 'Family' AND family_member_id IS NOT NULL AND finance_project_id IS NULL)
  )
);
ALTER TABLE public.finance_transaction_context_tags ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.finance_transaction_context_tags FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.fin_transaction_context_set(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ws uuid := (p->>'workspace_id')::uuid;
  txid uuid := (p->>'transaction_id')::uuid;
  kind text := coalesce(nullif(p->>'context_type',''),'Personal');
  project_id uuid := nullif(p->>'finance_project_id','')::uuid;
  member_id uuid := nullif(p->>'family_member_id','')::uuid;
BEGIN
  PERFORM public.fin__need(ws, 'ledger', 'edit');
  IF NOT EXISTS (SELECT 1 FROM public.finance_transactions t WHERE t.workspace_id=ws AND t.id=txid) THEN
    PERFORM public.fin__err('OWNERSHIP_MISMATCH','transaction');
  END IF;
  IF kind NOT IN ('Personal','Project','Family') THEN
    PERFORM public.fin__err('VALIDATION_FAILED','context_type');
  END IF;
  IF kind='Project' AND NOT EXISTS (SELECT 1 FROM public.finance_projects p WHERE p.workspace_id=ws AND p.id=project_id AND p.status <> 'Archived') THEN
    PERFORM public.fin__err('OWNERSHIP_MISMATCH','project');
  END IF;
  IF kind='Family' AND NOT EXISTS (SELECT 1 FROM public.finance_family_members m WHERE m.workspace_id=ws AND m.id=member_id AND m.status='Active') THEN
    PERFORM public.fin__err('OWNERSHIP_MISMATCH','family_member');
  END IF;
  INSERT INTO public.finance_transaction_context_tags(workspace_id,transaction_id,context_type,finance_project_id,family_member_id,created_by,updated_at)
  VALUES (ws,txid,kind,CASE WHEN kind='Project' THEN project_id END,CASE WHEN kind='Family' THEN member_id END,auth.uid(),now())
  ON CONFLICT (workspace_id,transaction_id) DO UPDATE
    SET context_type=EXCLUDED.context_type, finance_project_id=EXCLUDED.finance_project_id,
        family_member_id=EXCLUDED.family_member_id, updated_at=now();
  PERFORM public.fin__audit(ws,auth.uid(),'transaction_context',txid::text,'set',null,null,
    jsonb_build_object('context_type',kind,'finance_project_id',project_id,'family_member_id',member_id));
  RETURN jsonb_build_object('saved',true,'transaction_id',txid,'context_type',kind);
END
$$;

CREATE OR REPLACE FUNCTION public.fin_transaction_context_get(p_ws uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE out jsonb;
BEGIN
  PERFORM public.fin__need(p_ws, 'ledger', 'view');
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'transaction_id',c.transaction_id,
    'context_type',c.context_type,
    'finance_project_id',c.finance_project_id,
    'project_name',pr.name,
    'family_member_id',c.family_member_id,
    'family_member_name',fm.display_name
  ) ORDER BY c.updated_at DESC),'[]'::jsonb)
  INTO out
  FROM public.finance_transaction_context_tags c
  LEFT JOIN public.finance_projects pr ON pr.id=c.finance_project_id AND pr.workspace_id=c.workspace_id
  LEFT JOIN public.finance_family_members fm ON fm.id=c.family_member_id AND fm.workspace_id=c.workspace_id
  WHERE c.workspace_id=p_ws;
  RETURN out;
END
$$;
