-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'biller', 'cashier');

-- Create enum for gender/category
CREATE TYPE public.product_category AS ENUM ('men', 'women', 'children', 'unisex');

-- Create user_roles table (CRITICAL: roles stored separately for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'biller',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create brands table
CREATE TABLE public.brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create default_size_ranges table
CREATE TABLE public.default_size_ranges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category product_category NOT NULL,
    size_range TEXT NOT NULL,
    pairs_per_bundle INTEGER NOT NULL DEFAULT 6,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create products table
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    article_number TEXT NOT NULL UNIQUE,
    brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
    category TEXT NOT NULL DEFAULT 'General',
    gender product_category NOT NULL DEFAULT 'unisex',
    stock_dozens NUMERIC NOT NULL DEFAULT 0,
    pairs_per_dozen INTEGER NOT NULL DEFAULT 12,
    supplier TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create product_size_bundles table
CREATE TABLE public.product_size_bundles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    size_range TEXT NOT NULL,
    price_per_pair NUMERIC NOT NULL,
    pairs_per_bundle INTEGER NOT NULL DEFAULT 6,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(product_id, size_range)
);

-- Create clients table
CREATE TABLE public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    address TEXT,
    city TEXT,
    opening_balance NUMERIC NOT NULL DEFAULT 0,
    current_balance NUMERIC NOT NULL DEFAULT 0,
    total_spent NUMERIC NOT NULL DEFAULT 0,
    invoice_count INTEGER NOT NULL DEFAULT 0,
    portal_pin TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(name, phone)
);

-- Create payment_accounts table
CREATE TABLE public.payment_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create invoices table
CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT NOT NULL UNIQUE,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    subtotal NUMERIC NOT NULL DEFAULT 0,
    total_discount NUMERIC NOT NULL DEFAULT 0,
    tax NUMERIC NOT NULL DEFAULT 0,
    total NUMERIC NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL DEFAULT 'cash',
    account_id UUID REFERENCES public.payment_accounts(id) ON DELETE SET NULL,
    amount_received NUMERIC NOT NULL DEFAULT 0,
    balance_due NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create invoice_items table
CREATE TABLE public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    article_number TEXT NOT NULL,
    brand_name TEXT,
    size_range TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    total_pairs INTEGER NOT NULL,
    price_per_pair NUMERIC NOT NULL,
    discount_per_pair NUMERIC NOT NULL DEFAULT 0,
    total NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create recoveries table
CREATE TABLE public.recoveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    city TEXT,
    amount NUMERIC NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    type TEXT NOT NULL DEFAULT 'client',
    recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create recovery_client_amounts for city-wise recoveries
CREATE TABLE public.recovery_client_amounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recovery_id UUID REFERENCES public.recoveries(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    amount NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create audit_logs table
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_name TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notifications table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.default_size_ranges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_size_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recoveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_client_amounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role
    FROM public.user_roles
    WHERE user_id = _user_id
    LIMIT 1
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own role" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" ON public.user_roles
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles" ON public.user_roles
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all profiles" ON public.profiles
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for brands (all authenticated users can read)
CREATE POLICY "Authenticated users can read brands" ON public.brands
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and billers can manage brands" ON public.brands
    FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'biller'));

-- RLS Policies for default_size_ranges
CREATE POLICY "Authenticated users can read size ranges" ON public.default_size_ranges
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage size ranges" ON public.default_size_ranges
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for products
CREATE POLICY "Authenticated users can read products" ON public.products
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and billers can manage products" ON public.products
    FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'biller'));

-- RLS Policies for product_size_bundles
CREATE POLICY "Authenticated users can read size bundles" ON public.product_size_bundles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and billers can manage size bundles" ON public.product_size_bundles
    FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'biller'));

-- RLS Policies for clients
CREATE POLICY "Authenticated users can read clients" ON public.clients
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and billers can manage clients" ON public.clients
    FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'biller'));

-- RLS Policies for payment_accounts
CREATE POLICY "Authenticated users can read payment accounts" ON public.payment_accounts
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage payment accounts" ON public.payment_accounts
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for invoices
CREATE POLICY "Authenticated users can read invoices" ON public.invoices
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Billers and admins can create invoices" ON public.invoices
    FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'biller'));

CREATE POLICY "Admins can manage all invoices" ON public.invoices
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for invoice_items
CREATE POLICY "Authenticated users can read invoice items" ON public.invoice_items
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Billers and admins can create invoice items" ON public.invoice_items
    FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'biller'));

CREATE POLICY "Admins can manage all invoice items" ON public.invoice_items
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for recoveries
CREATE POLICY "Authenticated users can read recoveries" ON public.recoveries
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Cashiers, billers, and admins can create recoveries" ON public.recoveries
    FOR INSERT WITH CHECK (
        public.has_role(auth.uid(), 'admin') 
        OR public.has_role(auth.uid(), 'biller') 
        OR public.has_role(auth.uid(), 'cashier')
    );

CREATE POLICY "Admins can manage all recoveries" ON public.recoveries
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for recovery_client_amounts
CREATE POLICY "Authenticated users can read recovery amounts" ON public.recovery_client_amounts
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Cashiers, billers, and admins can create recovery amounts" ON public.recovery_client_amounts
    FOR INSERT WITH CHECK (
        public.has_role(auth.uid(), 'admin') 
        OR public.has_role(auth.uid(), 'biller') 
        OR public.has_role(auth.uid(), 'cashier')
    );

-- RLS Policies for audit_logs
CREATE POLICY "Admins can read all audit logs" ON public.audit_logs
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can create audit logs" ON public.audit_logs
    FOR INSERT TO authenticated WITH CHECK (true);

-- RLS Policies for notifications
CREATE POLICY "Users can read their own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON public.notifications
    FOR INSERT TO authenticated WITH CHECK (true);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Create profile
    INSERT INTO public.profiles (user_id, name, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
        NEW.email
    );
    
    -- Assign default biller role (first user gets admin)
    IF NOT EXISTS (SELECT 1 FROM public.user_roles LIMIT 1) THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'admin');
    ELSE
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'biller');
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON public.clients
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default size ranges
INSERT INTO public.default_size_ranges (category, size_range, pairs_per_bundle) VALUES
    ('men', '7-10', 6),
    ('men', '6-9', 6),
    ('men', '8-11', 6),
    ('women', '4-7', 6),
    ('women', '3-6', 6),
    ('women', '5-8', 6),
    ('children', '1-3', 6),
    ('children', '4-6', 6),
    ('children', '11-13', 6);

-- Insert default payment accounts
INSERT INTO public.payment_accounts (name) VALUES
    ('HBL - Main Account'),
    ('MCB - Business Account'),
    ('JazzCash Business'),
    ('Easypaisa Business');

-- Insert default brands
INSERT INTO public.brands (name) VALUES
    ('Bata'),
    ('Service'),
    ('Servis'),
    ('Metro'),
    ('Urban Sole');