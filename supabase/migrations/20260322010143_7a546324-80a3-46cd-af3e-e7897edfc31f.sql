-- Ad account cache table for FB API data
CREATE TABLE public.ad_account_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id text NOT NULL UNIQUE,
  spend_cap numeric DEFAULT 0,
  amount_spent numeric DEFAULT 0,
  last_fetched_at timestamptz DEFAULT now()
);

ALTER TABLE public.ad_account_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read cache" ON public.ad_account_cache
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage cache" ON public.ad_account_cache
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_ad_accounts_user_id ON public.ad_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);