CREATE POLICY "Users can update own ad accounts"
ON public.ad_accounts
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());