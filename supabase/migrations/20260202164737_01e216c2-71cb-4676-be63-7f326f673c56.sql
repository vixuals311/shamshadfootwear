-- Add the new biller_cashier role to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'biller_cashier';