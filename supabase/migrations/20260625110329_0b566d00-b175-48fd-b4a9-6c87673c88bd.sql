
CREATE TABLE public.loan_foreclosures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  outstanding_principal NUMERIC NOT NULL DEFAULT 0,
  charge_pct NUMERIC NOT NULL DEFAULT 0,
  fixed_fee NUMERIC NOT NULL DEFAULT 0,
  gst_pct NUMERIC NOT NULL DEFAULT 0,
  pct_charges NUMERIC NOT NULL DEFAULT 0,
  gst_amount NUMERIC NOT NULL DEFAULT 0,
  total_charges NUMERIC NOT NULL DEFAULT 0,
  total_payable NUMERIC NOT NULL DEFAULT 0,
  interest_saved NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.loan_foreclosures TO authenticated;
GRANT ALL ON public.loan_foreclosures TO service_role;

ALTER TABLE public.loan_foreclosures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own foreclosures"
  ON public.loan_foreclosures FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own foreclosures"
  ON public.loan_foreclosures FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own foreclosures"
  ON public.loan_foreclosures FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own foreclosures"
  ON public.loan_foreclosures FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX loan_foreclosures_loan_id_idx ON public.loan_foreclosures(loan_id);
CREATE INDEX loan_foreclosures_user_id_idx ON public.loan_foreclosures(user_id);

CREATE TRIGGER update_loan_foreclosures_updated_at
  BEFORE UPDATE ON public.loan_foreclosures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
