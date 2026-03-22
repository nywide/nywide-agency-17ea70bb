
-- Create topup_requests table
CREATE TABLE public.topup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_method TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.topup_requests ENABLE ROW LEVEL SECURITY;

-- Users can insert own requests
CREATE POLICY "Users can insert own topup requests" ON public.topup_requests
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Users can read own requests
CREATE POLICY "Users can read own topup requests" ON public.topup_requests
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Admins can manage all
CREATE POLICY "Admins can manage topup requests" ON public.topup_requests
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add account_name, currency, timezone columns to account_requests if missing
ALTER TABLE public.account_requests ADD COLUMN IF NOT EXISTS account_name TEXT;
ALTER TABLE public.account_requests ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
ALTER TABLE public.account_requests ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York';
