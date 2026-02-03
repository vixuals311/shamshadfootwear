-- Fix recoveries INSERT policy to include biller_cashier
DROP POLICY IF EXISTS "Cashiers, billers, and admins can create recoveries" ON public.recoveries;
CREATE POLICY "Cashiers, billers, and admins can create recoveries"
ON public.recoveries
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'biller'::app_role) OR 
  has_role(auth.uid(), 'cashier'::app_role) OR
  has_role(auth.uid(), 'biller_cashier'::app_role)
);

-- Fix recovery_client_amounts INSERT policy to include biller_cashier
DROP POLICY IF EXISTS "Cashiers, billers, and admins can create recovery amounts" ON public.recovery_client_amounts;
CREATE POLICY "Cashiers, billers, and admins can create recovery amounts"
ON public.recovery_client_amounts
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'biller'::app_role) OR 
  has_role(auth.uid(), 'cashier'::app_role) OR
  has_role(auth.uid(), 'biller_cashier'::app_role)
);

-- Fix invoices INSERT policy to include biller_cashier
DROP POLICY IF EXISTS "Billers and admins can create invoices" ON public.invoices;
CREATE POLICY "Billers and admins can create invoices"
ON public.invoices
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'biller'::app_role) OR
  has_role(auth.uid(), 'biller_cashier'::app_role)
);

-- Fix invoice_items INSERT policy to include biller_cashier
DROP POLICY IF EXISTS "Billers and admins can create invoice items" ON public.invoice_items;
CREATE POLICY "Billers and admins can create invoice items"
ON public.invoice_items
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'biller'::app_role) OR
  has_role(auth.uid(), 'biller_cashier'::app_role)
);