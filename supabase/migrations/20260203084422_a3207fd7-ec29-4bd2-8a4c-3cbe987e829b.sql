-- Drop the existing ALL policy that doesn't work properly for INSERT
DROP POLICY IF EXISTS "Admins and billers can manage clients" ON public.clients;

-- Create separate policies with proper clauses for each operation

-- SELECT policy (already exists as "Staff can read clients based on role", keeping it)

-- INSERT policy with WITH CHECK
CREATE POLICY "Admins and billers can insert clients"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'biller'::app_role) OR
    has_role(auth.uid(), 'biller_cashier'::app_role)
);

-- UPDATE policy with both USING and WITH CHECK
CREATE POLICY "Admins and billers can update clients"
ON public.clients
FOR UPDATE
TO authenticated
USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'biller'::app_role) OR
    has_role(auth.uid(), 'biller_cashier'::app_role)
)
WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'biller'::app_role) OR
    has_role(auth.uid(), 'biller_cashier'::app_role)
);

-- DELETE policy with USING
CREATE POLICY "Admins can delete clients"
ON public.clients
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));