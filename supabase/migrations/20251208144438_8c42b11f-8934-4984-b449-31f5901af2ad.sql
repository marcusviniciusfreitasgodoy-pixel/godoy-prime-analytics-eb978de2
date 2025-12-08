-- Allow anonymous users to update leads (for incrementing evaluation count)
CREATE POLICY "Permitir atualização pública de leads"
ON public.leads
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);