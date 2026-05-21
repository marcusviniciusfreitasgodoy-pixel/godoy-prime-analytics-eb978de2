ALTER TABLE public.itbi_transactions_backup_pre_dedupe ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Apenas admins veem backup ITBI"
ON public.itbi_transactions_backup_pre_dedupe
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));