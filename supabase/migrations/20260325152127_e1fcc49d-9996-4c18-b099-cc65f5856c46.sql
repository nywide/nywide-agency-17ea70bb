
-- notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  recipient_type TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (
    (user_id = auth.uid() AND recipient_type = 'user')
    OR (recipient_type = 'admin' AND public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (
    (user_id = auth.uid() AND recipient_type = 'user')
    OR (recipient_type = 'admin' AND public.has_role(auth.uid(), 'admin'))
  )
  WITH CHECK (
    (user_id = auth.uid() AND recipient_type = 'user')
    OR (recipient_type = 'admin' AND public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Admins can manage all notifications" ON public.notifications
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can insert notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ad_account_transactions table
CREATE TABLE IF NOT EXISTS public.ad_account_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_account_id TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  amount NUMERIC DEFAULT 0,
  old_spend_limit NUMERIC DEFAULT 0,
  new_spend_limit NUMERIC DEFAULT 0,
  old_amount_spent NUMERIC DEFAULT 0,
  new_amount_spent NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ad_account_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own ad account transactions" ON public.ad_account_transactions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage ad account transactions" ON public.ad_account_transactions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- spend_history table
CREATE TABLE IF NOT EXISTS public.spend_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  amount_spent NUMERIC DEFAULT 0,
  commission_earned NUMERIC DEFAULT 0,
  period_start DATE,
  period_end DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.spend_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage spend history" ON public.spend_history
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can read own spend history" ON public.spend_history
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Add status column to invoices if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'status') THEN
    ALTER TABLE public.invoices ADD COLUMN status TEXT DEFAULT 'pending';
  END IF;
END $$;

-- Add display_name to ad_accounts for user-provided name
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ad_accounts' AND column_name = 'display_name') THEN
    ALTER TABLE public.ad_accounts ADD COLUMN display_name TEXT;
  END IF;
END $$;

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
