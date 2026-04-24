
-- Loans table
CREATE TABLE public.loans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  bank_name TEXT NOT NULL,
  emi_amount NUMERIC(12,2) NOT NULL CHECK (emi_amount >= 0),
  due_day INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.credit_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  bank_name TEXT NOT NULL,
  outstanding_amount NUMERIC(12,2) NOT NULL CHECK (outstanding_amount >= 0),
  due_day INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.insurance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  insurance_type TEXT NOT NULL,
  premium_amount NUMERIC(12,2) NOT NULL CHECK (premium_amount >= 0),
  due_day INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.balances (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balances ENABLE ROW LEVEL SECURITY;

-- Loans policies
CREATE POLICY "users_select_own_loans" ON public.loans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_loans" ON public.loans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_own_loans" ON public.loans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users_delete_own_loans" ON public.loans FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "users_select_own_cards" ON public.credit_cards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_cards" ON public.credit_cards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_own_cards" ON public.credit_cards FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users_delete_own_cards" ON public.credit_cards FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "users_select_own_insurance" ON public.insurance FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_insurance" ON public.insurance FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_own_insurance" ON public.insurance FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users_delete_own_insurance" ON public.insurance FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "users_select_own_balance" ON public.balances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_balance" ON public.balances FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_own_balance" ON public.balances FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users_delete_own_balance" ON public.balances FOR DELETE USING (auth.uid() = user_id);
