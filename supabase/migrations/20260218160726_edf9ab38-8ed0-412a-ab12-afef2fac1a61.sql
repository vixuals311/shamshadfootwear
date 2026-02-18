
-- Create returns table
CREATE TABLE public.returns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  return_number TEXT NOT NULL,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id),
  client_id UUID REFERENCES public.clients(id),
  total_amount NUMERIC NOT NULL DEFAULT 0,
  adjustment_type TEXT NOT NULL DEFAULT 'reduce_balance' CHECK (adjustment_type IN ('reduce_balance', 'credit_note')),
  restock BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create return items table
CREATE TABLE public.return_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  return_id UUID NOT NULL REFERENCES public.returns(id) ON DELETE CASCADE,
  invoice_item_id UUID REFERENCES public.invoice_items(id),
  product_id UUID REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  article_number TEXT NOT NULL,
  brand_name TEXT,
  size_range TEXT NOT NULL,
  pairs_returned INTEGER NOT NULL,
  price_per_pair NUMERIC NOT NULL,
  total NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for returns
CREATE POLICY "Authenticated users can read returns" ON public.returns FOR SELECT USING (true);
CREATE POLICY "Admins and billers can create returns" ON public.returns FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'biller'::app_role) OR has_role(auth.uid(), 'biller_cashier'::app_role)
);
CREATE POLICY "Admins can manage all returns" ON public.returns FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for return_items
CREATE POLICY "Authenticated users can read return items" ON public.return_items FOR SELECT USING (true);
CREATE POLICY "Admins and billers can create return items" ON public.return_items FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'biller'::app_role) OR has_role(auth.uid(), 'biller_cashier'::app_role)
);
CREATE POLICY "Admins can manage all return items" ON public.return_items FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
