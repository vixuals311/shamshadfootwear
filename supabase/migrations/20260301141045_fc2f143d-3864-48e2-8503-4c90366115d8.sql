
-- Create manual_bills table
CREATE TABLE public.manual_bills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  bill_number TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('paid', 'unpaid')),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.manual_bills ENABLE ROW LEVEL SECURITY;

-- RLS: Staff can read manual bills
CREATE POLICY "Staff can read manual bills"
  ON public.manual_bills FOR SELECT
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'manager') OR 
    has_role(auth.uid(), 'biller') OR 
    has_role(auth.uid(), 'cashier')
  );

-- RLS: Admins, managers, and billers can create
CREATE POLICY "Staff can create manual bills"
  ON public.manual_bills FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'manager') OR 
    has_role(auth.uid(), 'biller')
  );

-- RLS: Admins and managers can update
CREATE POLICY "Admins managers can update manual bills"
  ON public.manual_bills FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'manager')
  );

-- RLS: Admins can delete
CREATE POLICY "Admins can delete manual bills"
  ON public.manual_bills FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Updated at trigger
CREATE TRIGGER update_manual_bills_updated_at
  BEFORE UPDATE ON public.manual_bills
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
