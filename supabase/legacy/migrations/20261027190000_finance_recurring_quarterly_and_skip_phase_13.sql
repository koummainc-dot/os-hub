-- Phase 13: support quarterly recurring schedules and record skipped due dates.
ALTER TABLE public.finance_recurring_items
  DROP CONSTRAINT IF EXISTS finance_recurring_items_frequency_check;
ALTER TABLE public.finance_recurring_items
  ADD CONSTRAINT finance_recurring_items_frequency_check
  CHECK (frequency = ANY (ARRAY['Weekly'::text, 'Monthly'::text, 'Quarterly'::text, 'Yearly'::text]));

-- See the matching production RPC definitions applied in migration
-- finance_recurring_quarterly_and_skip_phase_13.
