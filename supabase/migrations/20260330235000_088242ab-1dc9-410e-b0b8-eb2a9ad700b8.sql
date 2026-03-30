
-- Add Facebook email to account_requests
ALTER TABLE account_requests ADD COLUMN IF NOT EXISTS facebook_email TEXT;

-- Add facebook_email to ad_accounts
ALTER TABLE ad_accounts ADD COLUMN IF NOT EXISTS facebook_email TEXT;

-- Add custom metrics table for user-defined metrics
CREATE TABLE IF NOT EXISTS user_custom_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  formula TEXT NOT NULL,
  threshold NUMERIC,
  alert_enabled BOOLEAN DEFAULT FALSE,
  alert_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_custom_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own custom metrics"
  ON user_custom_metrics FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all custom metrics"
  ON user_custom_metrics FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Add daily report settings to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_report_settings JSONB DEFAULT '{"enabled": false, "hour": 9, "minute": 0}'::jsonb;
