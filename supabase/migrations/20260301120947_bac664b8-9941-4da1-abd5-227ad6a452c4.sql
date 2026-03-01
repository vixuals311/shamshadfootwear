
-- Create user_page_permissions table
CREATE TABLE public.user_page_permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    page_key text NOT NULL,
    has_access boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(user_id, page_key)
);

ALTER TABLE public.user_page_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage page permissions"
ON public.user_page_permissions FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can read own page permissions"
ON public.user_page_permissions FOR SELECT
USING (auth.uid() = user_id);

-- Migrate biller_cashier users: give them cashier page overrides then change to biller
INSERT INTO public.user_page_permissions (user_id, page_key, has_access)
SELECT ur.user_id, page.key, true
FROM public.user_roles ur
CROSS JOIN (VALUES ('payments'), ('recovery')) AS page(key)
WHERE ur.role = 'biller_cashier'
ON CONFLICT (user_id, page_key) DO NOTHING;

UPDATE public.user_roles SET role = 'biller' WHERE role = 'biller_cashier';

-- Function to get merged page access
CREATE OR REPLACE FUNCTION public.get_user_page_access(_user_id uuid)
RETURNS TABLE(page_key text, has_access boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE _role app_role;
BEGIN
    SELECT role INTO _role FROM public.user_roles WHERE user_id = _user_id LIMIT 1;
    IF _role IS NULL THEN RETURN; END IF;
    
    IF _role = 'admin' THEN
        RETURN QUERY SELECT p.key, true FROM (VALUES 
            ('dashboard'),('inventory'),('clients'),('invoices'),
            ('payments'),('recovery'),('returns'),('reports'),
            ('users'),('audit_logs'),('settings')
        ) AS p(key);
        RETURN;
    END IF;
    
    RETURN QUERY
    WITH role_defaults AS (
        SELECT p.key, 
            CASE _role
                WHEN 'manager' THEN p.key IN ('dashboard','inventory','clients','invoices','payments','recovery','returns','reports','audit_logs','settings')
                WHEN 'biller' THEN p.key IN ('dashboard','inventory','clients','invoices','returns')
                WHEN 'cashier' THEN p.key IN ('dashboard','payments','recovery')
                ELSE false
            END AS default_access
        FROM (VALUES 
            ('dashboard'),('inventory'),('clients'),('invoices'),
            ('payments'),('recovery'),('returns'),('reports'),
            ('audit_logs'),('settings')
        ) AS p(key)
    ),
    overrides AS (
        SELECT upp.page_key, upp.has_access FROM public.user_page_permissions upp WHERE upp.user_id = _user_id
    )
    SELECT rd.key, COALESCE(o.has_access, rd.default_access) FROM role_defaults rd LEFT JOIN overrides o ON o.page_key = rd.key;
END;
$$;

-- Update handle_new_user (no functional change, just ensuring no biller_cashier reference)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, name, email)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), NEW.email);
    IF NOT EXISTS (SELECT 1 FROM public.user_roles LIMIT 1) THEN
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
    ELSE
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'biller');
    END IF;
    RETURN NEW;
END;
$$;

-- Update RLS policies: replace biller_cashier references, add manager
DROP POLICY IF EXISTS "Admins billers and biller_cashiers can manage brands" ON public.brands;
CREATE POLICY "Admins managers and billers can manage brands" ON public.brands FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'biller'));

DROP POLICY IF EXISTS "Admins billers and biller_cashiers can manage products" ON public.products;
CREATE POLICY "Admins managers and billers can manage products" ON public.products FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'biller'));

DROP POLICY IF EXISTS "Admins billers and biller_cashiers can manage size bundles" ON public.product_size_bundles;
CREATE POLICY "Admins managers and billers can manage size bundles" ON public.product_size_bundles FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'biller'));

DROP POLICY IF EXISTS "Admins and billers can insert clients" ON public.clients;
CREATE POLICY "Admins managers and billers can insert clients" ON public.clients FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'biller'));

DROP POLICY IF EXISTS "Admins and billers can update clients" ON public.clients;
CREATE POLICY "Admins managers and billers can update clients" ON public.clients FOR UPDATE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'biller'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'biller'));

DROP POLICY IF EXISTS "Staff can read clients based on role" ON public.clients;
CREATE POLICY "Staff can read clients" ON public.clients FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'biller') OR has_role(auth.uid(), 'cashier'));

DROP POLICY IF EXISTS "Billers and admins can create invoice items" ON public.invoice_items;
CREATE POLICY "Admins managers and billers can create invoice items" ON public.invoice_items FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'biller'));

DROP POLICY IF EXISTS "Billers and admins can create invoices" ON public.invoices;
CREATE POLICY "Admins managers and billers can create invoices" ON public.invoices FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'biller'));

DROP POLICY IF EXISTS "Cashiers, billers, and admins can create recoveries" ON public.recoveries;
CREATE POLICY "Staff can create recoveries" ON public.recoveries FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'biller') OR has_role(auth.uid(), 'cashier'));

DROP POLICY IF EXISTS "Cashiers, billers, and admins can create recovery amounts" ON public.recovery_client_amounts;
CREATE POLICY "Staff can create recovery amounts" ON public.recovery_client_amounts FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'biller') OR has_role(auth.uid(), 'cashier'));

DROP POLICY IF EXISTS "Admins and billers can create returns" ON public.returns;
CREATE POLICY "Admins managers and billers can create returns" ON public.returns FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'biller'));

DROP POLICY IF EXISTS "Admins and billers can create return items" ON public.return_items;
CREATE POLICY "Admins managers and billers can create return items" ON public.return_items FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'biller'));

DROP POLICY IF EXISTS "Admins and biller_cashiers can manage size ranges" ON public.default_size_ranges;
CREATE POLICY "Admins and managers can manage size ranges" ON public.default_size_ranges FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

DROP POLICY IF EXISTS "Admins and biller_cashiers can manage product categories" ON public.product_categories;
CREATE POLICY "Admins and managers can manage product categories" ON public.product_categories FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

DROP POLICY IF EXISTS "Admins can manage settings" ON public.application_settings;
CREATE POLICY "Admins and managers can manage settings" ON public.application_settings FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

DROP POLICY IF EXISTS "Admins can read all audit logs" ON public.audit_logs;
CREATE POLICY "Admins and managers can read audit logs" ON public.audit_logs FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

DROP POLICY IF EXISTS "Admins can manage all invoices" ON public.invoices;
CREATE POLICY "Admins and managers can manage all invoices" ON public.invoices FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

DROP POLICY IF EXISTS "Admins can manage all recoveries" ON public.recoveries;
CREATE POLICY "Admins and managers can manage all recoveries" ON public.recoveries FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

DROP POLICY IF EXISTS "Admins can manage all returns" ON public.returns;
CREATE POLICY "Admins and managers can manage all returns" ON public.returns FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

DROP POLICY IF EXISTS "Admins can manage all return items" ON public.return_items;
CREATE POLICY "Admins and managers can manage all return items" ON public.return_items FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

DROP POLICY IF EXISTS "Admins can manage all invoice items" ON public.invoice_items;
CREATE POLICY "Admins and managers can manage all invoice items" ON public.invoice_items FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
