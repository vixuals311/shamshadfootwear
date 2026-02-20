
-- Add quantity column to product_size_bundles to track stock per bundle
ALTER TABLE public.product_size_bundles ADD COLUMN quantity integer NOT NULL DEFAULT 0;

-- Update RLS: Allow biller_cashier to manage products
DROP POLICY IF EXISTS "Admins and billers can manage products" ON public.products;
CREATE POLICY "Admins billers and biller_cashiers can manage products"
ON public.products FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'biller'::app_role) OR has_role(auth.uid(), 'biller_cashier'::app_role));

-- Update RLS: Allow biller_cashier to manage brands
DROP POLICY IF EXISTS "Admins and billers can manage brands" ON public.brands;
CREATE POLICY "Admins billers and biller_cashiers can manage brands"
ON public.brands FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'biller'::app_role) OR has_role(auth.uid(), 'biller_cashier'::app_role));

-- Update RLS: Allow biller_cashier to manage size bundles
DROP POLICY IF EXISTS "Admins and billers can manage size bundles" ON public.product_size_bundles;
CREATE POLICY "Admins billers and biller_cashiers can manage size bundles"
ON public.product_size_bundles FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'biller'::app_role) OR has_role(auth.uid(), 'biller_cashier'::app_role));

-- Update RLS: Allow biller_cashier to manage default size ranges
DROP POLICY IF EXISTS "Admins can manage size ranges" ON public.default_size_ranges;
CREATE POLICY "Admins and biller_cashiers can manage size ranges"
ON public.default_size_ranges FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'biller_cashier'::app_role));

-- Update RLS: Allow biller_cashier to manage product categories
DROP POLICY IF EXISTS "Admins can manage product categories" ON public.product_categories;
CREATE POLICY "Admins and biller_cashiers can manage product categories"
ON public.product_categories FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'biller_cashier'::app_role));
