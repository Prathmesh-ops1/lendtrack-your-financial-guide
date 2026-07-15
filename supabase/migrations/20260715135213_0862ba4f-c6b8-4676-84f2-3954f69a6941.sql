
ALTER TABLE public.credit_cards
  ADD COLUMN IF NOT EXISTS card_name text,
  ADD COLUMN IF NOT EXISTS statement_day integer,
  ADD COLUMN IF NOT EXISTS min_amount_due numeric,
  ADD COLUMN IF NOT EXISTS auto_pay_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.credit_cards
  ADD CONSTRAINT credit_cards_statement_day_range CHECK (statement_day IS NULL OR (statement_day BETWEEN 1 AND 31));
