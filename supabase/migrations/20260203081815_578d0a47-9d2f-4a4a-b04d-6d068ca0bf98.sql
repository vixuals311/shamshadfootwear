-- Add display_order to default_size_ranges for ordering
ALTER TABLE public.default_size_ranges ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;

-- Create index for ordering
CREATE INDEX IF NOT EXISTS idx_default_size_ranges_order ON public.default_size_ranges(category, display_order);

-- Create product_categories table for dynamic category management
CREATE TABLE IF NOT EXISTS public.product_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    display_order integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on product_categories
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_categories
CREATE POLICY "Admins can manage product categories"
ON public.product_categories
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can read product categories"
ON public.product_categories
FOR SELECT
USING (true);

-- Insert default categories
INSERT INTO public.product_categories (name, display_order) VALUES
    ('men', 1),
    ('women', 2),
    ('children', 3),
    ('unisex', 4)
ON CONFLICT (name) DO NOTHING;

-- Create index for ordering
CREATE INDEX IF NOT EXISTS idx_product_categories_order ON public.product_categories(display_order);