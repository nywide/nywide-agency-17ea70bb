
CREATE OR REPLACE FUNCTION public.admin_reset_stats()
RETURNS VOID AS $$
BEGIN
  TRUNCATE TABLE public.transactions RESTART IDENTITY CASCADE;
  TRUNCATE TABLE public.ad_account_transactions RESTART IDENTITY CASCADE;
  TRUNCATE TABLE public.notifications RESTART IDENTITY CASCADE;
  TRUNCATE TABLE public.topup_requests RESTART IDENTITY CASCADE;
  TRUNCATE TABLE public.account_requests RESTART IDENTITY CASCADE;
  TRUNCATE TABLE public.invoices RESTART IDENTITY CASCADE;
  TRUNCATE TABLE public.spend_history RESTART IDENTITY CASCADE;
  TRUNCATE TABLE public.ad_account_cache RESTART IDENTITY CASCADE;
  
  UPDATE public.profiles SET wallet_balance = 0;
  UPDATE public.ad_accounts SET spend_limit = 0, amount_spent = 0, current_spend = 0, user_id = NULL, assigned_at = NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
