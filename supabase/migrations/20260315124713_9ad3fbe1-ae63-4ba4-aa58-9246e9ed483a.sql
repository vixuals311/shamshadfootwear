CREATE OR REPLACE FUNCTION public.get_user_page_access(_user_id uuid)
 RETURNS TABLE(page_key text, has_access boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _role app_role;
BEGIN
    SELECT role INTO _role FROM public.user_roles WHERE user_id = _user_id LIMIT 1;
    IF _role IS NULL THEN RETURN; END IF;
    
    IF _role = 'admin' THEN
        RETURN QUERY SELECT p.key, true FROM (VALUES 
            ('dashboard'),('inventory'),('price_check'),('clients'),('invoices'),
            ('payments'),('cheques'),('recovery'),('returns'),('reports'),
            ('users'),('audit_logs'),('settings')
        ) AS p(key);
        RETURN;
    END IF;
    
    RETURN QUERY
    WITH role_defaults AS (
        SELECT p.key, 
            CASE _role
                WHEN 'manager' THEN p.key IN ('dashboard','inventory','price_check','clients','invoices','payments','cheques','recovery','returns','reports','audit_logs','settings')
                WHEN 'biller' THEN p.key IN ('dashboard','inventory','price_check','clients','invoices','returns')
                WHEN 'cashier' THEN p.key IN ('dashboard','payments','cheques','recovery')
                WHEN 'biller_cashier' THEN p.key IN ('dashboard','inventory','price_check','clients','invoices','payments','cheques','recovery','returns')
                ELSE false
            END AS default_access
        FROM (VALUES 
            ('dashboard'),('inventory'),('price_check'),('clients'),('invoices'),
            ('payments'),('cheques'),('recovery'),('returns'),('reports'),
            ('audit_logs'),('settings')
        ) AS p(key)
    ),
    overrides AS (
        SELECT upp.page_key, upp.has_access FROM public.user_page_permissions upp WHERE upp.user_id = _user_id
    )
    SELECT rd.key, COALESCE(o.has_access, rd.default_access) FROM role_defaults rd LEFT JOIN overrides o ON o.page_key = rd.key;
END;
$function$;