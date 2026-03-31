
-- Add admin daily report settings
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS daily_report_settings JSONB DEFAULT '{"enabled": false, "hour": 9, "minute": 0, "include_new_users": true, "include_new_account_requests": true, "include_new_topup_requests": true, "include_low_balance": true, "include_total_stats": true}'::jsonb;

-- Create admin custom metrics table
CREATE TABLE IF NOT EXISTS admin_custom_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  formula TEXT NOT NULL,
  threshold NUMERIC,
  alert_enabled BOOLEAN DEFAULT FALSE,
  alert_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE admin_custom_metrics ENABLE ROW LEVEL SECURITY;

-- Only admins can manage admin custom metrics
CREATE POLICY "Admins can manage admin custom metrics" ON admin_custom_metrics
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
