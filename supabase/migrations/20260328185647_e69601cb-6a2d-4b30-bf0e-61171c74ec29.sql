-- Fix notification INSERT policy to allow any authenticated user to create admin notifications
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  (user_id = auth.uid())
  OR (recipient_type = 'admin')
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Ensure admin_settings has at least one row
INSERT INTO admin_settings (id, notification_settings, timezone)
SELECT gen_random_uuid(), '{"telegram": false, "telegram_chat_id": null, "notify_new_user": true, "notify_new_account_request": true, "notify_new_topup_request": true, "notify_low_balance": true, "notify_account_disabled": true}'::jsonb, 'UTC'
WHERE NOT EXISTS (SELECT 1 FROM admin_settings LIMIT 1);