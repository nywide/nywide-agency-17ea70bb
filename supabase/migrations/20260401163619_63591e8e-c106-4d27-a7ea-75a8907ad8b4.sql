
CREATE TABLE IF NOT EXISTS public.ad_account_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_account_id UUID NOT NULL REFERENCES public.ad_accounts(id) ON DELETE CASCADE,
  last4 TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_ad_account_cards_account_id ON public.ad_account_cards(ad_account_id);

ALTER TABLE public.ad_account_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ad account cards"
  ON public.ad_account_cards
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can read cards for their accounts"
  ON public.ad_account_cards
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ad_accounts
      WHERE ad_accounts.id = ad_account_cards.ad_account_id
      AND ad_accounts.user_id = auth.uid()
    )
  );
