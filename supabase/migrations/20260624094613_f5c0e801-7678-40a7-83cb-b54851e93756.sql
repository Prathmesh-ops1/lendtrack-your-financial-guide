ALTER TABLE public.loan_prepayments
  ADD COLUMN IF NOT EXISTS part_payment_charge_pct numeric,
  ADD COLUMN IF NOT EXISTS gst_pct numeric;