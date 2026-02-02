-- Fix security issue: Restrict client data access to staff roles only
-- Drop the overly permissive policy that allowed all authenticated users to read clients
DROP POLICY IF EXISTS "Authenticated users can read clients" ON public.clients;

-- Create new policy that restricts access to admin, biller, and cashier roles
CREATE POLICY "Staff can read clients based on role"
ON public.clients FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'biller'::app_role) OR 
  has_role(auth.uid(), 'cashier'::app_role)
);