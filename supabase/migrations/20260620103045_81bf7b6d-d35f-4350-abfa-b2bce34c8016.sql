ALTER TABLE public.loans
  ADD COLUMN IF NOT EXISTS disbursement_date date,
  ADD COLUMN IF NOT EXISTS broken_period_days integer,
  ADD COLUMN IF NOT EXISTS broken_period_interest numeric,
  ADD COLUMN IF NOT EXISTS bpi_treatment text,
  ADD COLUMN IF NOT EXISTS adjusted_first_emi numeric,
  ADD COLUMN IF NOT EXISTS net_disbursed_amount numeric;