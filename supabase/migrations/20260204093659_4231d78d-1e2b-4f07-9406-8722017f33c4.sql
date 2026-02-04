-- Create user_sessions table for single device login enforcement
CREATE TABLE public.user_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token text NOT NULL UNIQUE,
    device_info text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    last_active_at timestamp with time zone NOT NULL DEFAULT now(),
    expires_at timestamp with time zone NOT NULL,
    is_active boolean NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own sessions
CREATE POLICY "Users can view their own sessions"
ON public.user_sessions
FOR SELECT
USING (auth.uid() = user_id);

-- Users can delete their own sessions (logout from device)
CREATE POLICY "Users can delete their own sessions"
ON public.user_sessions
FOR DELETE
USING (auth.uid() = user_id);

-- Service role or admin can manage all sessions
CREATE POLICY "Admins can manage all sessions"
ON public.user_sessions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create admin_security_settings table for extra PIN and session limits
CREATE TABLE public.admin_security_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    admin_pin_hash text,
    session_timeout_minutes integer NOT NULL DEFAULT 480,
    require_pin_on_login boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_security_settings ENABLE ROW LEVEL SECURITY;

-- Admins can view and manage their own security settings
CREATE POLICY "Admins can manage own security settings"
ON public.admin_security_settings
FOR ALL
USING (auth.uid() = user_id AND has_role(auth.uid(), 'admin'::app_role));

-- Create application_settings table for global settings
CREATE TABLE public.application_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key text NOT NULL UNIQUE,
    setting_value jsonb NOT NULL DEFAULT '{}',
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.application_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings
CREATE POLICY "Everyone can read settings"
ON public.application_settings
FOR SELECT
USING (true);

-- Only admins can manage settings
CREATE POLICY "Admins can manage settings"
ON public.application_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add enforce_single_session column to user_roles (non-admins only)
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS enforce_single_session boolean NOT NULL DEFAULT false;