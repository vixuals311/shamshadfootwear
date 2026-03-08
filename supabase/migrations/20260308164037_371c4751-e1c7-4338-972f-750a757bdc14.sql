-- Allow managers to read all sessions (for User Management page)
CREATE POLICY "Managers can view all sessions"
ON public.user_sessions
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role));

-- Allow managers to update sessions (to terminate them)
CREATE POLICY "Managers can update all sessions"
ON public.user_sessions
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'manager'::app_role));