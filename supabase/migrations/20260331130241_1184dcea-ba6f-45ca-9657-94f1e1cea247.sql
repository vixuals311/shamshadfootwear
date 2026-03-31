
-- Delete all business data in correct order (child tables first)
DELETE FROM public.notifications;
DELETE FROM public.recovery_client_amounts;
DELETE FROM public.return_items;
DELETE FROM public.invoice_items;
DELETE FROM public.manual_bills;
DELETE FROM public.cheques;
DELETE FROM public.recoveries;
DELETE FROM public.returns;
DELETE FROM public.invoices;
DELETE FROM public.product_size_bundles;
DELETE FROM public.products;
DELETE FROM public.clients;
DELETE FROM public.brands;
DELETE FROM public.product_categories;
DELETE FROM public.default_size_ranges;
DELETE FROM public.payment_accounts;
DELETE FROM public.audit_logs;
DELETE FROM public.application_settings;
