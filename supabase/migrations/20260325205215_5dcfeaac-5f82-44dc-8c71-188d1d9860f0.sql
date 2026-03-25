
-- Add notification_settings column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{"email": true, "telegram": false, "telegram_chat_id": null, "low_balance_threshold": 10}'::jsonb;

-- Create admin_settings table
CREATE TABLE IF NOT EXISTS admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_settings JSONB DEFAULT '{"email": true, "telegram": false, "telegram_chat_id": null, "low_balance_threshold": 10, "new_user": true, "new_account_request": true, "new_topup_request": true}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- RLS: only admins can manage
CREATE POLICY "Admins can manage admin_settings" ON admin_settings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default row
INSERT INTO admin_settings (notification_settings) VALUES ('{"email": true, "telegram": false, "telegram_chat_id": null, "low_balance_threshold": 10, "new_user": true, "new_account_request": true, "new_topup_request": true}'::jsonb);
