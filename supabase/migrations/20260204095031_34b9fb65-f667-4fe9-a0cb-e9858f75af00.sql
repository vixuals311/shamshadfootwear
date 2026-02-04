-- Drop the existing broad ALL policy
DROP POLICY IF EXISTS "Admins can manage own security settings" ON public.admin_security_settings;

-- SELECT: Admins can only read their own security settings
CREATE POLICY "Admins can view own security settings"
ON public.admin_security_settings FOR SELECT
USING (auth.uid() = user_id AND has_role(auth.uid(), 'admin'::app_role));

-- INSERT: Admins can only create their own security settings row
CREATE POLICY "Admins can create own security settings"
ON public.admin_security_settings FOR INSERT
WITH CHECK (auth.uid() = user_id AND has_role(auth.uid(), 'admin'::app_role));

-- UPDATE: Admins can only update their own row (both USING and WITH CHECK prevent changing user_id)
CREATE POLICY "Admins can update own security settings"
ON public.admin_security_settings FOR UPDATE
USING (auth.uid() = user_id AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() = user_id AND has_role(auth.uid(), 'admin'::app_role));

-- DELETE: Admins can only delete their own row
CREATE POLICY "Admins can delete own security settings"
ON public.admin_security_settings FOR DELETE
USING (auth.uid() = user_id AND has_role(auth.uid(), 'admin'::app_role));