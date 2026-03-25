-- Reset test data for production
TRUNCATE TABLE ad_account_transactions CASCADE;
TRUNCATE TABLE spend_history CASCADE;
TRUNCATE TABLE notifications CASCADE;
TRUNCATE TABLE invoices CASCADE;
TRUNCATE TABLE transactions CASCADE;
TRUNCATE TABLE topup_requests CASCADE;
TRUNCATE TABLE account_requests CASCADE;
TRUNCATE TABLE ad_account_cache CASCADE;

-- Reset ad accounts: unassign all, zero balances
UPDATE ad_accounts SET spend_limit = 0, current_spend = 0, amount_spent = 0, assigned_at = NULL, user_id = NULL, display_name = NULL;

-- Reset all profiles wallet_balance to 0
UPDATE profiles SET wallet_balance = 0;

-- Add disable columns to ad_accounts
ALTER TABLE ad_accounts ADD COLUMN IF NOT EXISTS is_disabled BOOLEAN DEFAULT FALSE;
ALTER TABLE ad_accounts ADD COLUMN IF NOT EXISTS disabled_reason TEXT;