-- Fix permissive RLS policies for audit_logs
DROP POLICY IF EXISTS "Authenticated users can create audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can create audit logs" ON public.audit_logs
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Fix permissive RLS policies for notifications
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "Users can create their own notifications" ON public.notifications
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Add policy for admins to create notifications for any user
CREATE POLICY "Admins can create notifications for any user" ON public.notifications
    FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));