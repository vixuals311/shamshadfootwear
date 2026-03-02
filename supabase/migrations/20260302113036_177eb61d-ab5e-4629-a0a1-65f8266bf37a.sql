
-- Create storage bucket for automated backups
INSERT INTO storage.buckets (id, name, public)
VALUES ('backups', 'backups', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: Only admins and managers can read backup files
CREATE POLICY "Admins and managers can read backups"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'backups' AND (
    public.has_role(auth.uid(), 'admin'::public.app_role) OR
    public.has_role(auth.uid(), 'manager'::public.app_role)
  )
);

-- RLS: Only service role (edge function) inserts - allow authenticated admins/managers to download
CREATE POLICY "Service role can insert backups"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'backups' AND (
    public.has_role(auth.uid(), 'admin'::public.app_role) OR
    public.has_role(auth.uid(), 'manager'::public.app_role)
  )
);

-- RLS: Only admins can delete old backups
CREATE POLICY "Admins can delete backups"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'backups' AND
  public.has_role(auth.uid(), 'admin'::public.app_role)
);
