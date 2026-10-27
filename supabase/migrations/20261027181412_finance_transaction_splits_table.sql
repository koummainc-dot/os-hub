CREATE TABLE public.finance_transaction_splits (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
 transaction_id uuid NOT NULL REFERENCES public.finance_transactions(id) ON DELETE CASCADE,
 category_id uuid NOT NULL REFERENCES public.finance_categories(id) ON DELETE RESTRICT,
 amount numeric(20,4) NOT NULL CHECK (amount > 0),
 currency text NOT NULL,
 base_amount numeric(20,4),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (transaction_id, category_id),
 UNIQUE (transaction_id, id)
);
CREATE INDEX finance_transaction_splits_ws_category_idx ON public.finance_transaction_splits(workspace_id, category_id, transaction_id);
ALTER TABLE public.finance_transaction_splits ENABLE ROW LEVEL SECURITY;