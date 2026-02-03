-- Drop the existing SELECT policy that's missing biller_cashier role
DROP POLICY IF EXISTS "Staff can read clients based on role" ON public.clients;

-- Create new SELECT policy that includes biller_cashier role
CREATE POLICY "Staff can read clients based on role"
ON public.clients
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'biller'::app_role) OR 
  has_role(auth.uid(), 'cashier'::app_role) OR
  has_role(auth.uid(), 'biller_cashier'::app_role)
);