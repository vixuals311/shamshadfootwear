
-- Function to create notifications for all admin users
CREATE OR REPLACE FUNCTION public.notify_admins(
  _title text,
  _message text,
  _type text DEFAULT 'info'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type)
  SELECT ur.user_id, _title, _message, _type
  FROM public.user_roles ur
  WHERE ur.role = 'admin';
END;
$$;

-- Trigger function for invoice creation notifications
CREATE OR REPLACE FUNCTION public.notify_on_invoice_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _client_name text;
  _creator_name text;
BEGIN
  -- Only notify for non-draft invoices
  IF NEW.status = 'draft' THEN
    RETURN NEW;
  END IF;

  SELECT name INTO _client_name FROM public.clients WHERE id = NEW.client_id;
  SELECT name INTO _creator_name FROM public.profiles WHERE user_id = NEW.created_by;

  PERFORM public.notify_admins(
    'New Invoice Created',
    'Invoice ' || NEW.invoice_number || ' for ' || COALESCE(_client_name, 'Unknown') || 
    ' — Rs ' || NEW.total || ' (by ' || COALESCE(_creator_name, 'System') || ')',
    'invoice'
  );
  RETURN NEW;
END;
$$;

-- Trigger function for recovery notifications
CREATE OR REPLACE FUNCTION public.notify_on_recovery_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _client_name text;
  _recorder_name text;
BEGIN
  IF NEW.client_id IS NOT NULL THEN
    SELECT name INTO _client_name FROM public.clients WHERE id = NEW.client_id;
  END IF;
  SELECT name INTO _recorder_name FROM public.profiles WHERE user_id = NEW.recorded_by;

  PERFORM public.notify_admins(
    'Recovery Recorded',
    CASE 
      WHEN NEW.type = 'city' THEN 'City recovery (' || COALESCE(NEW.city, 'Unknown') || ')'
      ELSE 'Recovery from ' || COALESCE(_client_name, 'Unknown')
    END || ' — Rs ' || NEW.amount || ' (by ' || COALESCE(_recorder_name, 'System') || ')',
    'recovery'
  );
  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER trg_notify_invoice_created
  AFTER INSERT ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_invoice_created();

CREATE TRIGGER trg_notify_recovery_created
  AFTER INSERT ON public.recoveries
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_recovery_created();
