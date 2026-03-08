
-- Add max_devices column to user_roles
ALTER TABLE public.user_roles ADD COLUMN max_devices integer NOT NULL DEFAULT 3;

-- Add ip_address column to user_sessions
ALTER TABLE public.user_sessions ADD COLUMN ip_address text;

-- Allow users to insert their own sessions
CREATE POLICY "Users can insert their own sessions"
ON public.user_sessions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own sessions
CREATE POLICY "Users can update their own sessions"
ON public.user_sessions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
