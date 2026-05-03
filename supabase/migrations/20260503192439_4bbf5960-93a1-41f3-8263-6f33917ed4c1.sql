
CREATE TABLE public.loan_prepayments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  loan_id uuid NOT NULL,
  amount numeric NOT NULL,
  paid_date date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.loan_prepayments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_prepayments" ON public.loan_prepayments
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_prepayments" ON public.loan_prepayments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_own_prepayments" ON public.loan_prepayments
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users_delete_own_prepayments" ON public.loan_prepayments
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_loan_prepayments_loan ON public.loan_prepayments(loan_id);
