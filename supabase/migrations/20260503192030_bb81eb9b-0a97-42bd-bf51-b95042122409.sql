
ALTER TABLE public.loans
  ADD COLUMN principal_amount numeric,
  ADD COLUMN start_date date,
  ADD COLUMN interest_rate numeric,
  ADD COLUMN tenure_months integer;

ALTER TABLE public.credit_cards
  ADD COLUMN credit_limit numeric,
  ADD COLUMN interest_rate numeric;

ALTER TABLE public.insurance
  ADD COLUMN sum_assured numeric,
  ADD COLUMN policy_start_date date,
  ADD COLUMN policy_term_years integer;
