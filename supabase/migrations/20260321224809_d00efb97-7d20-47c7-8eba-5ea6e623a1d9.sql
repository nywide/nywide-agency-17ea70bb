ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS commission numeric DEFAULT 0;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS ad_account_id text;