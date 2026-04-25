-- Profiles table
CREATE TABLE public.profiles (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT,
  mobile TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_own_profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users_delete_own_profile" ON public.profiles
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger function to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add paid tracking to liability tables
ALTER TABLE public.loans
  ADD COLUMN last_paid_date DATE,
  ADD COLUMN last_paid_for_month DATE;

ALTER TABLE public.credit_cards
  ADD COLUMN last_paid_date DATE,
  ADD COLUMN last_paid_for_month DATE;

ALTER TABLE public.insurance
  ADD COLUMN last_paid_date DATE,
  ADD COLUMN last_paid_for_month DATE;

-- Payment history table
CREATE TABLE public.payment_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  liability_kind TEXT NOT NULL CHECK (liability_kind IN ('loan','credit_card','insurance')),
  liability_id UUID NOT NULL,
  label TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  paid_date DATE NOT NULL DEFAULT CURRENT_DATE,
  for_month DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_history" ON public.payment_history
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_history" ON public.payment_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_delete_own_history" ON public.payment_history
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_payment_history_user ON public.payment_history(user_id, paid_date DESC);