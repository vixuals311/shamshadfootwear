
CREATE TABLE public.cheques (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cheque_number TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  cheque_date DATE NOT NULL,
  given_to TEXT NOT NULL,
  bank_name TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cheques ENABLE ROW LEVEL SECURITY;

-- All authenticated staff can read cheques
CREATE POLICY "Staff can read cheques" ON public.cheques
  FOR SELECT TO authenticated USING (true);

-- Admins, managers, billers, cashiers can create cheques
CREATE POLICY "Staff can create cheques" ON public.cheques
  FOR INSERT TO public
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role) OR
    has_role(auth.uid(), 'biller'::app_role) OR
    has_role(auth.uid(), 'cashier'::app_role)
  );

-- Admins and managers can update cheques (status changes)
CREATE POLICY "Admins managers can update cheques" ON public.cheques
  FOR UPDATE TO public
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Admins can delete cheques
CREATE POLICY "Admins can delete cheques" ON public.cheques
  FOR DELETE TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.cheques;
