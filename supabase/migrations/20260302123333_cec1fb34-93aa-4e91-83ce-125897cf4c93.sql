
-- Create trigger function to sync invoice_count and total_spent on clients
CREATE OR REPLACE FUNCTION public.sync_client_invoice_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _client_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _client_id := OLD.client_id;
  ELSE
    _client_id := NEW.client_id;
  END IF;

  IF _client_id IS NOT NULL THEN
    UPDATE public.clients SET
      invoice_count = (SELECT COUNT(*) FROM public.invoices WHERE client_id = _client_id),
      total_spent = (SELECT COALESCE(SUM(total), 0) FROM public.invoices WHERE client_id = _client_id)
    WHERE id = _client_id;
  END IF;

  -- Handle client_id change (UPDATE where client changed)
  IF TG_OP = 'UPDATE' AND OLD.client_id IS DISTINCT FROM NEW.client_id AND OLD.client_id IS NOT NULL THEN
    UPDATE public.clients SET
      invoice_count = (SELECT COUNT(*) FROM public.invoices WHERE client_id = OLD.client_id),
      total_spent = (SELECT COALESCE(SUM(total), 0) FROM public.invoices WHERE client_id = OLD.client_id)
    WHERE id = OLD.client_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger
CREATE TRIGGER sync_client_invoice_stats_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.sync_client_invoice_stats();

-- Backfill existing data
UPDATE public.clients c SET
  invoice_count = sub.cnt,
  total_spent = sub.spent
FROM (
  SELECT client_id, COUNT(*) as cnt, COALESCE(SUM(total), 0) as spent
  FROM public.invoices
  WHERE client_id IS NOT NULL
  GROUP BY client_id
) sub
WHERE c.id = sub.client_id;
