
ALTER TABLE public.user_roles ADD COLUMN session_timeout_minutes integer NOT NULL DEFAULT 480;

-- Insert default client portal session timeout (10 minutes)
INSERT INTO public.application_settings (setting_key, setting_value)
VALUES ('client_portal_session_timeout', '10')
ON CONFLICT DO NOTHING;
